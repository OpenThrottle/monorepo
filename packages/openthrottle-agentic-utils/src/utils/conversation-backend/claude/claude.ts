/**
 * The claude (Claude Code) CLI backend: spawns `claude` (arg array, never a
 * shell), parses its NDJSON stdout into {@link ConversationStreamChunk}s, and
 * terminates on the `result` event or process exit. Cancellation + timeouts are
 * managed explicitly with a SIGTERM→SIGKILL escalation (shared teardown). The
 * child receives a scrubbed environment — its host login but none of the
 * server's secrets.
 *
 * Multi-turn context is owned by claude: one OT conversation ↔ one session id
 * (a UUID we mint and persist), created with `--session-id` on the first turn
 * and resumed with `--resume` thereafter. We send only the latest user message,
 * never replayed history. Persona is a first-class `--append-system-prompt`, so
 * — unlike cursor — nothing is prefixed into the prompt or written to the
 * checkout. See docs/openthrottle/claude-stream-json-schema.md.
 */

import { spawn } from 'node:child_process';

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationStreamChunk,
} from '../types.ts';
import { CLAUDE_BIN_ENV, CLAUDE_DEFAULT_BIN, buildClaudeArgv } from './argv.ts';
import { mapClaudeEvent } from './events.ts';
import { NdjsonBuffer } from '../cursor-agent/ndjson.ts';
import {
  resolveAgentTimeouts,
  terminateChild,
} from '../cursor-agent/teardown.ts';

/** Env vars the child is allowed to inherit (host login + locale), nothing else. */
const ALLOWED_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
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
 * Resolve the binary: explicit env override, else `claude` off PATH.
 */
function resolveClaudeBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[CLAUDE_BIN_ENV]?.trim();
  return override !== undefined && override !== ''
    ? override
    : CLAUDE_DEFAULT_BIN;
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
 * The latest user message in the run. Persona is injected via
 * `--append-system-prompt` (argv), not the prompt, so no prefixing here.
 */
function latestUserMessage(run: ConversationBackendRun): string {
  let latest = '';
  for (const message of run.messages) {
    if (message.role === 'user') {
      latest = message.content;
    }
  }
  return latest;
}

/**
 * Parse one NDJSON line into a chunk, tolerating non-JSON lines (skipped).
 */
function lineToChunk(line: string): ConversationStreamChunk | null {
  try {
    return mapClaudeEvent(JSON.parse(line));
  } catch {
    return null;
  }
}

async function* streamClaude(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.cwd === undefined || run.cwd === '') {
    throw new Error('The claude backend requires a cwd.');
  }

  if (run.sessionId === undefined || run.sessionId === '') {
    throw new Error('The claude backend requires a sessionId.');
  }

  // Abort + timeouts are managed explicitly (not via the spawn `signal` option)
  // so teardown escalates SIGTERM→SIGKILL rather than a single signal. stdin is
  // ignored: claude otherwise waits on stdin and can error "Input must be
  // provided" when neither a prompt arg nor stdin is present.
  const child = spawn(
    resolveClaudeBin(),
    buildClaudeArgv({
      model: run.model,
      prompt: latestUserMessage(run),
      resume: run.resumeSession === true,
      sessionId: run.sessionId,
      systemPrompt: run.systemPrompt,
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
            : `claude exited with code ${code}`);
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
 * Backend for the claude (Claude Code) CLI.
 *
 * @public
 */
export const claudeConversationBackend: ConversationBackend = {
  stream: streamClaude,
};
