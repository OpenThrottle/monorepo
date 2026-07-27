/**
 * The opencode CLI backend: spawns `opencode run --format json` (arg array,
 * never a shell), parses its NDJSON stdout into {@link ConversationStreamChunk}s,
 * and terminates on **process exit** (opencode emits no discrete result event —
 * see docs/openthrottle/opencode-stream-json-schema.md §7). Cancellation +
 * timeouts are managed explicitly with a SIGTERM→SIGKILL escalation (shared
 * teardown). The child receives a scrubbed environment — its host opencode
 * credentials (under HOME) but none of the server's secrets.
 *
 * Multi-turn context is owned by opencode: one OT conversation ↔ one session id.
 * Unlike cursor (pre-minted) or claude (a UUID we mint), opencode mints the id
 * on the first `run` (no `-s`) and echoes it in the stream; the adapter surfaces
 * it via a `kind:'session'` chunk and the resume id is passed as `sessionId` on
 * later turns. We send only the latest user message, never replayed history.
 * Persona has no first-class flag, so it is injected as a prompt prefix.
 */

import { spawn } from 'node:child_process';

import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationStreamChunk,
} from '../types.ts';
import {
  OPENCODE_BIN_ENV,
  OPENCODE_DEFAULT_BIN,
  buildOpencodeArgv,
} from './argv.ts';
import { createOpencodeEventMapper } from './events.ts';
import {
  type OpencodeMcpConfigFile,
  writeOpencodeMcpConfig,
} from './mcp-config.ts';
import { NdjsonBuffer } from '../cursor-agent/ndjson.ts';
import {
  resolveAgentTimeouts,
  terminateChild,
} from '../cursor-agent/teardown.ts';

/** Env vars the child is allowed to inherit (host login + locale), nothing else. */
const ALLOWED_ENV_KEYS = [
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
 * Resolve the binary: explicit env override, else `opencode` off PATH.
 */
function resolveOpencodeBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[OPENCODE_BIN_ENV]?.trim();
  return override !== undefined && override !== ''
    ? override
    : OPENCODE_DEFAULT_BIN;
}

/**
 * Build a minimal allowlisted environment for the spawned child. `extra` (the
 * run's `mcpEnv` — OT MCP token + API URLs — plus `OPENCODE_CONFIG`) is merged
 * on top: the host env stays allowlisted, and only the explicit server-provided
 * keys are admitted.
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
 * (opencode has no `--system-prompt` flag).
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

async function* streamOpencode(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.cwd === undefined || run.cwd === '') {
    throw new Error('The opencode backend requires a cwd.');
  }

  // MCP (and the scoped permission slice) have no CLI flag on opencode: write a
  // temp config outside the checkout and point opencode at it via OPENCODE_CONFIG
  // (removed in `finally`). The writer returns null when there is nothing to
  // write (no servers AND no permission slice), so `supervised`/default with no
  // managed servers adds no config. `fullAccess` is carried by `--auto` below,
  // not the config. Merge the config path with the run's mcpEnv into the child env.
  const mcpConfigFile: OpencodeMcpConfigFile | null = writeOpencodeMcpConfig(
    run.mcpServers ?? {},
    run.permissionMode,
  );
  const childEnv =
    run.mcpEnv !== undefined || mcpConfigFile !== null
      ? {
          ...(run.mcpEnv ?? {}),
          ...(mcpConfigFile !== null
            ? { OPENCODE_CONFIG: mcpConfigFile.path }
            : {}),
        }
      : undefined;

  // Abort + timeouts are managed explicitly (not via the spawn `signal` option)
  // so teardown escalates SIGTERM→SIGKILL rather than a single signal. sessionId
  // is optional: absent → opencode mints a new session on this run.
  const child = spawn(
    resolveOpencodeBin(),
    buildOpencodeArgv({
      auto: run.permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess,
      cwd: run.cwd,
      model: run.model,
      prompt: composePrompt(run),
      sessionId: run.sessionId,
    }),
    {
      cwd: run.cwd,
      env: buildScrubbedEnv(process.env, childEnv),
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
  const mapper = createOpencodeEventMapper();
  const emit = function* (
    lines: readonly string[],
  ): Generator<ConversationStreamChunk> {
    for (const line of lines) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      yield* mapper.map(parsed);
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

    // opencode has no terminal `result` event — the turn ends when the process
    // exits. Emit the terminal chunk here, surfacing an error on a non-zero exit
    // (or teardown) and buffered stderr.
    const { code, error } = await closed;
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
          : `opencode exited with code ${code}`);
    yield {
      delta: '',
      done: true,
      error: failed ? message : null,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
    };
  } finally {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
    }
    clearTimeout(wallTimer);
    run.signal?.removeEventListener('abort', onAbort);
    terminateChild(child, timeouts.graceMs);
    mcpConfigFile?.cleanup();
  }
}

/**
 * Backend for the opencode CLI.
 *
 * @public
 */
export const opencodeConversationBackend: ConversationBackend = {
  stream: streamOpencode,
};
