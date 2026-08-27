/**
 * The antigravity (Google Antigravity CLI) backend: spawns `agy -p <prompt> --output-format
 * stream-json …` (arg array, never a shell), parses its NDJSON stdout into
 * {@link ConversationStreamChunk}s, and terminates on the `result` event or process exit.
 * Cancellation + timeouts are managed explicitly with a SIGTERM→SIGKILL escalation (shared
 * teardown). The child receives a scrubbed environment — its host Google auth (API keys / ADC /
 * OAuth under HOME) but none of the server's secrets.
 *
 * Differences from the gemini adapter, all verified against 1.1.21 (see
 * docs/openthrottle/antigravity-stream-json-schema.md):
 * - The prompt travels in ARGV as the value of `-p`, not through stdin. agy does not read stdin as
 *   its one-shot input, so stdin is closed immediately: leaving it open risks the CLI's
 *   OAuth-code prompt sitting on it when credentials are missing.
 * - Multi-turn uses REAL id-based resume (`--conversation <id>`) rather than gemini's flattened
 *   transcript, so `sessionId`/`resumeSession` are honored and the mapper emits a `session` chunk
 *   from `init`. History is only flattened as a fallback on a first turn that has prior messages.
 * - `--add-dir <cwd>` is mandatory: without it agy reports no active workspace and writes into
 *   `~/.gemini/antigravity-cli/scratch/<name>/` instead of the run's cwd.
 *
 * Persona is a prompt prefix (there is no `--system` flag). MCP injection is not wired for v1: agy
 * resolves servers from `~/.gemini/config/mcp_config.json`, never `.mcp.json`, so `mcpServers` is
 * ignored and `mcpEnv` merged harmlessly.
 */

import { spawn } from 'node:child_process';

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationStreamChunk,
} from '../types.ts';
import {
  ANTIGRAVITY_BIN_ENV,
  ANTIGRAVITY_DEFAULT_BIN,
  buildAntigravityArgv,
} from './argv.ts';
import { withFileMentions } from '../file-mentions.ts';
import { withKeepalive } from '../keepalive.ts';
import { createAntigravityEventMapper } from './events.ts';
import { NdjsonBuffer } from '../cursor-agent/ndjson.ts';
import {
  resolveAgentTimeouts,
  terminateChild,
} from '../cursor-agent/teardown.ts';

/** Env vars the child is allowed to inherit (host Google auth + locale), nothing else. */
const ALLOWED_ENV_KEYS = [
  'AGY_ADC_AUTH',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_LOCATION',
  'GOOGLE_CLOUD_PROJECT',
  'HOME',
  'LANG',
  'LC_ALL',
  'LOGNAME',
  'PATH',
  'TERM',
  'TMPDIR',
  'USER',
] as const;

/** Resolve the binary: explicit env override, else `agy` off PATH. */
function resolveAntigravityBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[ANTIGRAVITY_BIN_ENV]?.trim();
  return override !== undefined && override !== ''
    ? override
    : ANTIGRAVITY_DEFAULT_BIN;
}

/**
 * Build a minimal allowlisted environment for the spawned child. `extra` (the run's `mcpEnv`) is
 * merged on top: the host env stays allowlisted, and only the explicit server-provided keys are
 * admitted.
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
 * Assemble the prompt for one turn: persona (no `--system` flag exists), then the latest user
 * message with its file mentions injected. Prior turns are replayed as a transcript ONLY when we
 * are not resuming a conversation — with `--conversation` the CLI already holds the history, so
 * replaying it would duplicate context.
 *
 * @public
 */
export function buildAntigravityPrompt(run: ConversationBackendRun): string {
  let lastUserIndex = -1;
  for (let index = 0; index < run.messages.length; index += 1) {
    if (run.messages[index]?.role === 'user') {
      lastUserIndex = index;
    }
  }
  const latest = lastUserIndex >= 0 ? run.messages[lastUserIndex].content : '';

  const resuming =
    run.resumeSession === true &&
    run.sessionId !== undefined &&
    run.sessionId !== '';

  const history: string[] = [];
  if (!resuming) {
    for (let index = 0; index < lastUserIndex; index += 1) {
      const message = run.messages[index];
      if (message?.role === 'user') {
        history.push(`User: ${message.content}`);
      } else if (message?.role === 'assistant') {
        history.push(`Assistant: ${message.content}`);
      }
    }
  }

  const sections: string[] = [];
  const systemPrompt = run.systemPrompt?.trim();
  if (systemPrompt !== undefined && systemPrompt !== '') {
    sections.push(systemPrompt);
  }
  if (history.length > 0) {
    sections.push(
      `Previous conversation (for context):\n${history.join('\n\n')}`,
    );
  }
  sections.push(withFileMentions(latest, run.fileMentions));

  return sections.join('\n\n');
}

async function* streamAntigravity(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.cwd === undefined || run.cwd === '') {
    throw new Error('The antigravity backend requires a cwd.');
  }

  const resumeConversationId =
    run.resumeSession === true ? run.sessionId : undefined;

  // Abort + timeouts are managed explicitly (not via the spawn `signal` option) so teardown
  // escalates SIGTERM→SIGKILL rather than a single signal.
  const child = spawn(
    resolveAntigravityBin(),
    buildAntigravityArgv({
      additionalDirectories: run.additionalDirectories,
      cwd: run.cwd,
      model: run.model,
      permissionMode: run.permissionMode,
      prompt: buildAntigravityPrompt(run),
      resumeConversationId,
    }),
    {
      cwd: run.cwd,
      env: buildScrubbedEnv(process.env, run.mcpEnv),
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );

  // agy takes the prompt from argv, so nothing is written here. Close stdin immediately: an open
  // pipe lets the CLI's missing-credential path sit waiting for a pasted OAuth code.
  child.stdin?.end();

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

  const mapEvent = createAntigravityEventMapper();
  const buffer = new NdjsonBuffer();
  let sawTerminal = false;
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
      for (const chunk of mapEvent(parsed)) {
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
        // A stdout read that maps to no chunk still reset the child's idle timer above; surface it
        // as a keepalive so the server backstop stays in step.
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
            : `agy exited with code ${code}`);
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
 * Backend for the antigravity (Google Antigravity) CLI.
 *
 * @public
 */
export const antigravityConversationBackend: ConversationBackend = {
  stream: streamAntigravity,
};
