/**
 * The antigravity (Google Antigravity CLI) backend: spawns `agy -p <prompt> --output-format
 * stream-json …` (arg array, never a shell), parses its NDJSON stdout into
 * {@link ConversationStreamChunk}s, and terminates on the `result` event or process exit.
 * Cancellation + timeouts are managed explicitly with a SIGTERM→SIGKILL escalation (shared
 * teardown). The child receives a scrubbed environment — its host Google auth (API keys / ADC /
 * OAuth under HOME) but none of the server's secrets.
 *
 * Behavior verified against 1.1.21 (see
 * docs/openthrottle/antigravity-stream-json-schema.md):
 * - The prompt travels in ARGV as the value of `-p`, not through stdin. agy does not read stdin as
 *   its one-shot input, so stdin is closed immediately: leaving it open risks the CLI's
 *   OAuth-code prompt sitting on it when credentials are missing.
 * - Multi-turn uses REAL id-based resume (`--conversation <id>`) rather than a flattened
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

import { NdjsonBuffer } from '../cursor-agent/ndjson.ts';
import {
  resolveAgentTimeouts,
  terminateChild,
} from '../cursor-agent/teardown.ts';
import { describeExit } from '../describeExit.ts';
import { withFileMentions } from '../file-mentions.ts';
import { withKeepalive } from '../keepalive.ts';
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
import { buildAntigravityEnv } from './env.ts';
import { createAntigravityEventMapper } from './events.ts';

/** Resolve the binary: explicit env override, else `agy` off PATH. */
function resolveAntigravityBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[ANTIGRAVITY_BIN_ENV]?.trim();
  return override !== undefined && override !== ''
    ? override
    : ANTIGRAVITY_DEFAULT_BIN;
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
  const latest = run.messages[lastUserIndex]?.content ?? '';

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

/** Termination reason for the per-turn idle timer. */
const IDLE_TIMEOUT_REASON = 'idle timeout';

/**
 * The terminal error for a turn this adapter stopped itself, or `null` when it did not stop it.
 * An idle stop names its usual cause: agy holds the first model call until its workspace-plugin
 * MCP servers connect and writes nothing meanwhile, so one slow server start (an `npx` launch
 * fetching from the registry) runs straight into the idle timeout. Every other reason
 * (`cancelled`, `wall-clock timeout`) passes through unchanged.
 */
function describeTermination(
  reason: string | null,
  idleMs: number,
): string | null {
  if (reason !== IDLE_TIMEOUT_REASON) {
    return reason;
  }

  const seconds = Math.round(idleMs / 1000);
  return `agy produced no output for ${seconds}s and was stopped. agy waits for its MCP servers to connect before it replies, so a slow-starting MCP server is the usual cause.`;
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
      env: buildAntigravityEnv(process.env, run.mcpEnv),
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
    idleTimer = setTimeout(
      () => terminate(IDLE_TIMEOUT_REASON),
      timeouts.idleMs,
    );
    idleTimer.unref();
  };
  const wallTimer = setTimeout(
    () => terminate('wall-clock timeout'),
    timeouts.wallClockMs,
  );

  wallTimer.unref();
  const onAbort = (): void => {
    return terminate('cancelled');
  };

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
        if (!chunk.done) {
          yield chunk;
          continue;
        }

        sawTerminal = true;
        // A SIGTERMed agy still writes a `result` on its way out
        // (`status: ERROR, error: 'interrupted'`, all-zero usage). When this adapter did the
        // stopping, that result says nothing about why, so the reason it stopped for wins.
        const stopError = describeTermination(
          terminationReason,
          timeouts.idleMs,
        );
        yield stopError === null ? chunk : { ...chunk, error: stopError };
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
        describeTermination(terminationReason, timeouts.idleMs) ??
        describeExit('agy', { code, error, stderr });
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
