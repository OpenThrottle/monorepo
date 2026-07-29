/**
 * The codex (OpenAI Codex CLI) backend: spawns `codex exec --json` (arg array,
 * never a shell), parses its JSONL stdout into {@link ConversationStreamChunk}s,
 * and terminates on the `turn.completed`/`turn.failed`/`error` event or process
 * exit. Cancellation + timeouts are managed explicitly with a SIGTERM→SIGKILL
 * escalation (shared teardown). The child receives a scrubbed environment — its
 * host codex login (under HOME / CODEX_HOME) but none of the server's secrets.
 *
 * Multi-turn context is owned by codex: one OT conversation ↔ one thread id.
 * Like opencode (and unlike claude's minted UUID), codex mints the id on the
 * first `exec` and echoes it as `thread.started.thread_id`; the adapter surfaces
 * it via a `kind:'session'` chunk and later turns resume it with
 * `exec resume <id>`. We send only the latest user message, never replayed
 * history. codex exec has no system-prompt flag, so persona is prefixed onto the
 * prompt. MCP injection is not wired for v1 (see the schema doc); `mcpServers`
 * is ignored and `mcpEnv` is merged harmlessly.
 * See docs/openthrottle/codex-stream-json-schema.md.
 */

import { spawn } from 'node:child_process';

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationStreamChunk,
} from '../types.ts';
import { CODEX_BIN_ENV, CODEX_DEFAULT_BIN, buildCodexArgv } from './argv.ts';
import { mapCodexEvent } from './events.ts';
import { NdjsonBuffer } from '../cursor-agent/ndjson.ts';
import {
  resolveAgentTimeouts,
  terminateChild,
} from '../cursor-agent/teardown.ts';

/** Env vars the child is allowed to inherit (host login + locale), nothing else. */
const ALLOWED_ENV_KEYS = [
  'CODEX_HOME',
  'HOME',
  'LANG',
  'LC_ALL',
  'LOGNAME',
  'PATH',
  'TERM',
  'TMPDIR',
  'USER',
] as const;

/**
 * Resolve the binary: explicit env override, else `codex` off PATH.
 */
function resolveCodexBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[CODEX_BIN_ENV]?.trim();
  return override !== undefined && override !== ''
    ? override
    : CODEX_DEFAULT_BIN;
}

/**
 * Build a minimal allowlisted environment for the spawned child. `extra` (the
 * run's `mcpEnv`) is merged on top: the host env stays allowlisted, and only the
 * explicit server-provided keys are admitted.
 */
function buildScrubbedEnv(
  env: NodeJS.ProcessEnv = process.env,
  extra?: Readonly<Record<string, string>>,
): NodeJS.ProcessEnv {
  const scrubbed: NodeJS.ProcessEnv = {};
  for (const key of ALLOWED_ENV_KEYS) {
    const value = env[key];
    if (value !== undefined) {
      scrubbed[key] = value;
    }
  }
  if (extra !== undefined) {
    for (const [key, value] of Object.entries(extra)) {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

/**
 * Latest user message in the run, persona-prefixed when a system prompt is set
 * (codex exec has no `--system-prompt` flag).
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
 * Parse one JSONL line into a chunk, tolerating non-JSON lines (skipped).
 */
function lineToChunk(line: string): ConversationStreamChunk | null {
  try {
    return mapCodexEvent(JSON.parse(line));
  } catch {
    return null;
  }
}

async function* streamCodex(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.cwd === undefined || run.cwd === '') {
    throw new Error('The codex backend requires a cwd.');
  }

  // Abort + timeouts are managed explicitly (not via the spawn `signal` option)
  // so teardown escalates SIGTERM→SIGKILL rather than a single signal. stdin is
  // ignored: with the prompt supplied as an arg, closing stdin makes codex read
  // EOF and proceed instead of waiting on stdin.
  const child = spawn(
    resolveCodexBin(),
    buildCodexArgv({
      model: run.model,
      permissionMode: run.permissionMode,
      prompt: composePrompt(run),
      reasoning: run.reasoning,
      resume: run.resumeSession === true,
      sessionId: run.sessionId,
    }),
    {
      cwd: run.cwd,
      env: buildScrubbedEnv(process.env, run.mcpEnv),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const timeouts = resolveAgentTimeouts();
  let terminationReason: string | null = null;
  const terminate = (reason: string): void => {
    if (terminationReason === null) {
      terminationReason = reason;
    }
    terminateChild(child, timeouts.graceMs);
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
        yield* emit(buffer.push(data));
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
            : `codex exited with code ${code}`);
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
    terminateChild(child, timeouts.graceMs);
  }
}

/**
 * Backend for the codex (OpenAI Codex) CLI.
 *
 * @public
 */
export const codexConversationBackend: ConversationBackend = {
  stream: streamCodex,
};
