/**
 * The cursor-agent CLI backend: spawns `cursor-agent` (arg array, never a
 * shell), parses its NDJSON stdout into {@link ConversationStreamChunk}s, and
 * terminates on the `result` event or process exit. The child receives a
 * scrubbed environment — its host login and cursor's own configuration, but
 * none of the server's secrets.
 *
 * Multi-turn context is owned by cursor-agent: one OT conversation ↔ one chat
 * id (minted by {@link createCursorAgentSession}), resumed every turn. We send
 * only the latest user message, never replayed history.
 *
 * Two properties of cursor drive the shape of this adapter:
 *
 * 1. **`--resume` accepts any string.** An unrecognized id does not error —
 *    cursor silently starts a fresh, disconnected chat and echoes the junk back
 *    as its `session_id`. So the minted id is parsed and validated
 *    (`session-id.ts`) rather than taken verbatim; that is the only place a bad
 *    id is visible, since every downstream surface reports success.
 * 2. **cursor spawns a `worker-server` grandchild** that inherits our stdout
 *    pipe and outlives the run. Both spawns are therefore `detached: true` and
 *    torn down by process group (`terminateChild(..., { processGroup: true })`),
 *    otherwise every turn leaks a process and holds the pipe open against EOF.
 *
 * See docs/openthrottle/agentic-cli-chat-backends.md § cursor-agent cold start.
 */

import { spawn } from 'node:child_process';

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationStreamChunk,
} from '../types.ts';
import { warnUnsupportedAdditionalDirectories } from '../additional-directories.ts';
import {
  CURSOR_AGENT_BIN_ENV,
  CURSOR_AGENT_DEFAULT_BIN,
  buildCursorAgentArgv,
} from './argv.ts';
import { formatCursorMintFailure } from './diagnostics.ts';
import { withFileMentions } from '../file-mentions.ts';
import { withKeepalive } from '../keepalive.ts';
import { mapCursorEvent } from './events.ts';
import { NdjsonBuffer } from './ndjson.ts';
import { parseCursorChatId } from './session-id.ts';
import {
  resolveAgentTimeouts,
  resolveSessionCreateTimeoutMs,
  terminateChild,
} from './teardown.ts';

/**
 * Env vars the child inherits. The posture is unchanged — the child gets the
 * host login and cursor's own configuration, never the server's secrets — but
 * the list is now driven by what `cursor-agent` provably reads (verified
 * against the 2026.08.11 bundle and its launcher script), not by guesswork.
 *
 * Dropping a var cursor needs is not a no-op: it silently diverges our child
 * from the user's own terminal, which is exactly the class of bug this plan
 * chased.
 */
const ALLOWED_ENV_KEYS = [
  'CURSOR_AUTH_TOKEN', // Alternate credential source, read alongside CURSOR_API_KEY.
  'HOME', // Host login (unchanged).
  'LANG', // Host locale (unchanged).
  'LC_ALL',
  'LOGNAME',
  'PATH',
  'SHELL', // cursor shells out for tool calls.
  'TERM',
  'TMPDIR',
  'USER',

  /**
   * Selects keychain (`default`, macOS login keychain) vs `file` vs `memory`.
   * Dropping it forces the keychain even when the user configured otherwise.
   */
  'AGENT_CLI_CREDENTIAL_STORE',

  /**
   * Standard proxy trio. Dropping these leaves cursor with no route to the
   * network behind a corporate proxy; dropping NO_PROXY alone would force
   * proxying of hosts the user deliberately excluded.
   */
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',

  /**
   * cursor's config dir is `$XDG_CONFIG_HOME/cursor` when set, else `~/.cursor`
   * — so dropping this points our child at a DIFFERENT chat store than the
   * user's own shell, while HOME still resolves.
   */
  'XDG_CONFIG_HOME',

  /**
   * Used by the launcher script to site NODE_COMPILE_CACHE on non-darwin.
   */
  'XDG_CACHE_HOME',
] as const;

/**
 * Prefixes passed through wholesale. cursor adds `CURSOR_*` knobs between
 * releases (`CURSOR_API_KEY`, `CURSOR_DATA_DIR`, endpoint overrides, …), so
 * enumerating them guarantees we fall behind. Everything under this prefix is
 * cursor's own configuration by construction, never server state.
 */
const ALLOWED_ENV_PREFIXES = ['CURSOR_'] as const;

/**
 * Values forced on the child regardless of the host environment.
 *
 * `NO_COLOR` suppresses decorated output at the source — defense in depth for
 * the stdout parsing, since the cheapest ANSI escape to handle is one that was
 * never written.
 *
 * Deliberately NOT forced: `CI`. It reads as an output knob but also feeds
 * cursor's credential-store selection (`isCI` suppresses the SSH-session
 * keychain path), so setting it would quietly change how the child authenticates.
 */
const FORCED_ENV: Readonly<Record<string, string>> = {
  NO_COLOR: '1',
};

/**
 * Resolve the binary: explicit env override, else `cursor-agent` off PATH.
 */
function resolveCursorAgentBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[CURSOR_AGENT_BIN_ENV]?.trim();
  return override !== undefined && override !== ''
    ? override
    : CURSOR_AGENT_DEFAULT_BIN;
}

/**
 * Build a minimal allowlisted environment for the spawned child.
 */
function buildScrubbedEnv(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const scrubbed: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      continue;
    }

    const allowed =
      ALLOWED_ENV_KEYS.some((allowedKey) => allowedKey === key) ||
      ALLOWED_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));

    if (allowed) {
      scrubbed[key] = value;
    }
  }

  // Forced last so the host can never override them.
  return { ...scrubbed, ...FORCED_ENV };
}

/**
 * Latest user message in the run, persona-prefixed when a system prompt is set.
 */
function composePrompt(run: ConversationBackendRun): string {
  let latestUser = '';
  for (const message of run.messages) {
    if (message.role === 'user') {
      latestUser = message.content;
    }
  }

  const systemPrompt = run.systemPrompt?.trim();
  return systemPrompt !== undefined && systemPrompt !== ''
    ? `${systemPrompt}\n\n${latestUser}`
    : latestUser;
}

/**
 * Parse one NDJSON line into a chunk, tolerating non-JSON lines (skipped).
 */
function lineToChunk(line: string): ConversationStreamChunk | null {
  try {
    return mapCursorEvent(JSON.parse(line));
  } catch {
    return null;
  }
}

/**
 * Options for {@link createCursorAgentSession}.
 */
export interface CreateCursorAgentSessionOptions {
  /** Workspace directory to create the chat in. */
  readonly cwd: string;
  /** Optional abort signal. */
  readonly signal?: AbortSignal;
}

/**
 * Mint a new cursor-agent chat and return its id. Run this once per OT
 * conversation, persist the id, then resume it on every turn.
 *
 * The id is parsed and validated out of stdout (see {@link parseCursorChatId}),
 * not taken verbatim: `--resume` accepts any string, so an unvalidated id fails
 * silently by starting a disconnected chat rather than erroring.
 *
 * @public
 */
export async function createCursorAgentSession(
  options: CreateCursorAgentSessionOptions,
): Promise<string> {
  // Captured so every failure below can name the binary, the workspace, and how
  // long the spawn actually took — a mint failure is otherwise undiagnosable
  // from server logs alone.
  const bin = resolveCursorAgentBin();
  const startedAt = Date.now();
  const child = spawn(bin, ['create-chat'], {
    cwd: options.cwd,
    // Same process-group treatment as the streaming spawn (see below).
    detached: true,
    env: buildScrubbedEnv(),
    signal: options.signal,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  // Bound the mint: a blocked create-chat must never hang the caller (the start
  // mutation awaits this). On timeout, tear the child down (SIGTERM→SIGKILL).
  const timeoutMs = resolveSessionCreateTimeoutMs();
  const { graceMs } = resolveAgentTimeouts();
  let timedOut = false;

  // Settle on the FIRST of: a parseable id on stdout, process exit, or the
  // timeout. Waiting for exit is what broke the cold path — see below.
  let settle: (outcome: {
    code: number | null;
    id: string | null;
  }) => void = () => {};

  let fail: (error: Error) => void = () => {};
  const settled = new Promise<{ code: number | null; id: string | null }>(
    (resolve, reject) => {
      settle = resolve;
      fail = reject;
    },
  );

  child.stdout?.on('data', (data: Buffer) => {
    stdout += data.toString('utf8');

    // THE cold-start fix. cursor prints the id in ~2s but the process itself
    // can linger far past the 30s budget on a cold run — statsig init, MCP
    // init/OAuth discovery, plugin hooks, plus the `worker-server` grandchild
    // holding this very pipe open. Waiting for `close` meant timing out and
    // discarding an id we already had, which is exactly the reported
    // "first chat of a session fails" symptom (a warm run exits promptly, so
    // any earlier cursor invocation "fixes" it).
    //
    // Safe to stop here: cursor writes `agentId` to its store BEFORE printing,
    // and `--resume` works even for an id whose store row never existed.
    const parsed = parseCursorChatId(stdout);
    if (parsed !== null) {
      settle({ code: null, id: parsed });
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString('utf8');
  });

  const timer = setTimeout(() => {
    timedOut = true;
    terminateChild(child, graceMs, { processGroup: true });
  }, timeoutMs);
  timer.unref();

  child.on('error', fail);
  child.on('close', (code) => settle({ code, id: null }));

  let code: number | null;
  let earlyId: string | null;
  try {
    ({ code, id: earlyId } = await settled);
  } finally {
    clearTimeout(timer);
    // Whether we settled early or on exit, nothing about this child is wanted
    // any more — reap it and its `worker-server` grandchild. SIGTERM first, so
    // cursor still gets to finish its own store `dispose()`.
    terminateChild(child, graceMs, { processGroup: true });
  }

  if (earlyId !== null) {
    return earlyId;
  }

  const failure = (reason: string): Error =>
    new Error(
      formatCursorMintFailure({
        bin,
        cwd: options.cwd,
        elapsedMs: Date.now() - startedAt,
        reason,
        stderr,
        stdout,
      }),
    );

  if (timedOut) {
    throw failure(`timed out after ${timeoutMs}ms`);
  }

  if (code !== 0) {
    throw failure(`failed (exit ${code})`);
  }

  // Never trust stdout wholesale. `--resume` accepts any string, so a banner
  // byte that slipped onto stdout would silently start a fresh, disconnected
  // chat instead of failing — the conversation would lose every prior turn
  // while all surfaces still reported success. Rejecting here is the only
  // place that failure is visible.
  const sessionId = parseCursorChatId(stdout);
  if (sessionId === null) {
    throw failure('returned no recognizable session id');
  }

  return sessionId;
}

async function* streamCursorAgent(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.cwd === undefined || run.cwd === '') {
    throw new Error('The cursor-agent backend requires a cwd.');
  }

  warnUnsupportedAdditionalDirectories('cursor', run.additionalDirectories);

  if (run.sessionId === undefined || run.sessionId === '') {
    throw new Error('The cursor-agent backend requires a sessionId.');
  }

  // Abort + timeouts are managed explicitly (not via the spawn `signal` option)
  // so teardown escalates SIGTERM→SIGKILL rather than a single signal.
  const child = spawn(
    resolveCursorAgentBin(),
    buildCursorAgentArgv({
      cwd: run.cwd,
      model: run.model,
      permissionMode: run.permissionMode,
      prompt: withFileMentions(composePrompt(run), run.fileMentions),
      sessionId: run.sessionId,
    }),
    {
      cwd: run.cwd,
      // Own process group, so teardown can reap the `worker-server` grandchild
      // cursor spawns — it inherits this stdout pipe and otherwise outlives the
      // run, both leaking a process and holding the pipe open against EOF.
      detached: true,
      env: buildScrubbedEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const timeouts = resolveAgentTimeouts();
  let terminationReason: string | null = null;
  const terminate = (reason: string): void => {
    if (terminationReason === null) {
      terminationReason = reason;
    }
    terminateChild(child, timeouts.graceMs, { processGroup: true });
  };

  let idleTimer: NodeJS.Timeout | null = null;
  const resetIdle = (): void => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => terminate('idle timeout'), timeouts.idleMs);
    idleTimer.unref();
  };
  const wallTimer = setTimeout(
    () => terminate('wall-clock timeout'),
    timeouts.wallClockMs,
  );

  wallTimer.unref();
  const onAbort = (): void => terminate('cancelled');

  run.signal?.addEventListener('abort', onAbort, { once: true });
  if (run.signal?.aborted === true) {
    terminate('cancelled');
  }

  let stderr = '';
  child.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString('utf8');
  });
  const closed = new Promise<{ code: number | null; error: Error | null }>(
    (resolve) => {
      child.on('close', (code) => resolve({ code, error: null }));
      child.on('error', (error: Error) => resolve({ code: null, error }));
    },
  );

  const buffer = new NdjsonBuffer();
  let sawTerminal = false;
  const emit = function* (
    lines: readonly string[],
  ): Generator<ConversationStreamChunk> {
    for (const line of lines) {
      const chunk = lineToChunk(line);
      if (chunk !== null) {
        if (chunk.done) {
          sawTerminal = true;
        }
        yield chunk;
      }
    }
  };

  try {
    resetIdle();
    if (child.stdout !== null) {
      for await (const data of child.stdout) {
        resetIdle();
        // A stdout read that maps to no chunk still reset the child's idle timer
        // above; surface it as a keepalive so the server backstop stays in step.
        yield* withKeepalive(emit(buffer.push(data)));
      }

      yield* emit(buffer.flush());
    }

    const { code, error } = await closed;
    if (!sawTerminal) {
      const failed =
        terminationReason !== null ||
        error !== null ||
        (code !== null && code !== 0);
      const message =
        terminationReason ??
        (error !== null
          ? error.message
          : stderr.trim() !== ''
            ? stderr.trim()
            : `cursor-agent exited with code ${code}`);
      yield {
        delta: '',
        done: true,
        error: failed ? message : null,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
      };
    }
  } finally {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
    }
    clearTimeout(wallTimer);
    run.signal?.removeEventListener('abort', onAbort);
    terminateChild(child, timeouts.graceMs, { processGroup: true });
  }
}

/**
 * Backend for the cursor-agent CLI.
 *
 * @public
 */
export const cursorAgentConversationBackend: ConversationBackend = {
  stream: streamCursorAgent,
};
