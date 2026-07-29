/**
 * The cursor-agent CLI backend: spawns `cursor-agent` (arg array, never a
 * shell), parses its NDJSON stdout into {@link ConversationStreamChunk}s, and
 * terminates on the `result` event or process exit. Cancellation flows through
 * the spawn `signal` option (SIGTERM on abort). The child receives a scrubbed
 * environment — its host login but none of the server's secrets.
 *
 * Multi-turn context is owned by cursor-agent: one OT conversation ↔ one chat
 * id (minted by {@link createCursorAgentSession}), resumed every turn. We send
 * only the latest user message, never replayed history.
 */

import { spawn } from 'node:child_process';

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationStreamChunk,
} from '../types.ts';
import {
  CURSOR_AGENT_BIN_ENV,
  CURSOR_AGENT_DEFAULT_BIN,
  buildCursorAgentArgv,
} from './argv.ts';
import { withFileMentions } from '../file-mentions.ts';
import { mapCursorEvent } from './events.ts';
import { NdjsonBuffer } from './ndjson.ts';
import {
  resolveAgentTimeouts,
  resolveSessionCreateTimeoutMs,
  terminateChild,
} from './teardown.ts';

/** Env vars the child is allowed to inherit (host login + locale), nothing else. */
const ALLOWED_ENV_KEYS = [
  'CURSOR_API_KEY',
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
  for (const key of ALLOWED_ENV_KEYS) {
    const value = env[key];
    if (value !== undefined) {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
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
 * @public
 */
export async function createCursorAgentSession(
  options: CreateCursorAgentSessionOptions,
): Promise<string> {
  const child = spawn(resolveCursorAgentBin(), ['create-chat'], {
    cwd: options.cwd,
    env: buildScrubbedEnv(),
    signal: options.signal,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (data: Buffer) => {
    stdout += data.toString('utf8');
  });

  child.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString('utf8');
  });

  // Bound the mint: a blocked create-chat must never hang the caller (the start
  // mutation awaits this). On timeout, tear the child down (SIGTERM→SIGKILL).
  const timeoutMs = resolveSessionCreateTimeoutMs();
  const { graceMs } = resolveAgentTimeouts();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    terminateChild(child, graceMs);
  }, timeoutMs);
  timer.unref();

  let code: number | null;
  try {
    code = await new Promise<number | null>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });
  } finally {
    clearTimeout(timer);
  }

  if (timedOut) {
    throw new Error(`cursor-agent create-chat timed out after ${timeoutMs}ms.`);
  }

  if (code !== 0) {
    throw new Error(
      `cursor-agent create-chat failed (exit ${code}): ${stderr.trim()}`,
    );
  }

  const sessionId = stdout.trim();
  if (sessionId === '') {
    throw new Error('cursor-agent create-chat returned no session id.');
  }

  return sessionId;
}

async function* streamCursorAgent(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.cwd === undefined || run.cwd === '') {
    throw new Error('The cursor-agent backend requires a cwd.');
  }

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
    terminateChild(child, timeouts.graceMs);
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
