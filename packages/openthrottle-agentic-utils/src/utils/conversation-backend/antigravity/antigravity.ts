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

import { isRecord } from '@openthrottle/nodejs-utils';

import { AsyncQueue } from '../acp/AsyncQueue.ts';
import { NdjsonBuffer } from '../cursor-agent/ndjson.ts';
import {
  resolveAgentTimeouts,
  terminateChild,
} from '../cursor-agent/teardown.ts';
import { describeExit } from '../describeExit.ts';
import { withFileMentions } from '../file-mentions.ts';
import { CONVERSATION_KEEPALIVE_CHUNK, withKeepalive } from '../keepalive.ts';
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

/**
 * Env override: how long agy may stay silent before it starts replying, in ms.
 *
 * @public
 */
export const ANTIGRAVITY_STARTUP_TIMEOUT_MS_ENV = `OPENTHROTTLE_ANTIGRAVITY_STARTUP_TIMEOUT_MS`;

/**
 * @description agy writes `init` within ~3s, then nothing until its workspace-plugin MCP servers
 * have connected and the first model call returns. That gap measured 8–16s on an idle machine and
 * 37–63s under load (2026-11-20, agy 1.5.13), and passed 120s in conversation 54a41391, so it gets
 * its own allowance instead of the 120s idle timeout. Five minutes leaves the 15-minute wall clock
 * as the outer bound.
 */
const DEFAULT_STARTUP_TIMEOUT_MS = 300_000;

/**
 * @description Upper bound on the keepalive spacing while agy starts up. It must stay well inside the
 * chat orchestrator's idle backstop (agent idle + 30s, 150s by default), which otherwise sees a
 * silent startup as a stalled turn.
 */
const MAX_STARTUP_KEEPALIVE_MS = 30_000;

/** Termination reason for the per-turn idle timer once agy is replying. */
const IDLE_TIMEOUT_REASON = 'idle timeout';

/** Termination reason for the startup allowance running out before agy replied. */
const STARTUP_TIMEOUT_REASON = 'startup timeout';

/** Read the startup allowance: a positive integer from the env, else the default. */
function resolveStartupTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(
    env[ANTIGRAVITY_STARTUP_TIMEOUT_MS_ENV] ?? '',
    10,
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_STARTUP_TIMEOUT_MS;
}

/**
 * @description The terminal error for a turn this adapter stopped itself, or `null` when it did not
 * stop it. A startup stop names its usual cause: agy holds the first model call until its
 * workspace-plugin MCP servers connect and writes nothing meanwhile. Every other reason
 * (`cancelled`, `wall-clock timeout`) passes through unchanged.
 */
function describeTermination(
  reason: string | null,
  limits: { readonly idleMs: number; readonly startupMs: number },
): string | null {
  if (reason === STARTUP_TIMEOUT_REASON) {
    const seconds = Math.round(limits.startupMs / 1000);
    return `agy did not start replying within ${seconds}s and was stopped. agy waits for its MCP servers to connect before it replies, so a slow-starting MCP server is the usual cause.`;
  }

  if (reason === IDLE_TIMEOUT_REASON) {
    const seconds = Math.round(limits.idleMs / 1000);
    return `agy produced no output for ${seconds}s and was stopped.`;
  }

  return reason;
}

/** One item on the adapter's read queue: a stdout read, or a startup keepalive tick. */
type AntigravityRead =
  { readonly data: Buffer; readonly kind: 'data' } | { readonly kind: 'tick' };

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
  // Never stricter than the idle timeout, so a raised idle timeout still covers a slow startup.
  const startupMs = Math.max(resolveStartupTimeoutMs(), timeouts.idleMs);
  const limits = { idleMs: timeouts.idleMs, startupMs };
  let terminationReason: string | null = null;
  const terminate = (reason: string): void => {
    if (terminationReason === null) {
      terminationReason = reason;
    }
    terminateChild(child, timeouts.graceMs);
  };

  // Two phases. Starting: from spawn until agy's first event after `init`, bounded once by
  // `startupMs` while keepalive ticks hold the orchestrator backstop off. Replying: the usual idle
  // timer, reset by every stdout read.
  const reads = new AsyncQueue<AntigravityRead>();
  let started = false;
  const startupTimer = setTimeout(() => {
    terminate(STARTUP_TIMEOUT_REASON);
  }, startupMs);
  startupTimer.unref();
  const keepaliveMs = Math.min(
    MAX_STARTUP_KEEPALIVE_MS,
    Math.max(1, Math.floor(timeouts.idleMs / 2)),
  );
  const startupTicker = setInterval(() => {
    reads.push({ kind: 'tick' });
  }, keepaliveMs);
  startupTicker.unref();

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
  const markStarted = (): void => {
    if (started) {
      return;
    }
    started = true;
    clearTimeout(startupTimer);
    clearInterval(startupTicker);
    resetIdle();
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
      // `init` arrives before agy's MCP wait; anything after it means agy is replying.
      if (isRecord(parsed) && parsed.event !== 'init') {
        markStarted();
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
        const stopError = describeTermination(terminationReason, limits);
        yield stopError === null ? chunk : { ...chunk, error: stopError };
      }
    }
  };

  try {
    if (child.stdout === null) {
      reads.end();
    } else {
      child.stdout.on('data', (data: Buffer) => {
        reads.push({ data, kind: 'data' });
      });
      child.stdout.on('close', () => {
        reads.end();
      });
    }

    for await (const read of reads) {
      if (read.kind === 'tick') {
        if (!started) {
          yield CONVERSATION_KEEPALIVE_CHUNK;
        }
        continue;
      }

      if (started) {
        resetIdle();
      }
      // A stdout read that maps to no chunk still counts as activity; surface it as a keepalive
      // so the server backstop stays in step.
      yield* withKeepalive(emit(buffer.push(read.data)));
    }

    yield* emit(buffer.flush());

    const { code, error } = await closed;
    if (!sawTerminal) {
      const failed =
        terminationReason !== null ||
        error !== null ||
        (code !== null && code !== 0);
      const message =
        describeTermination(terminationReason, limits) ??
        describeExit('agy', { code, error, stderr });
      yield {
        delta: '',
        done: true,
        error: failed ? message : null,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
      };
    }
  } finally {
    clearTimeout(startupTimer);
    clearInterval(startupTicker);
    reads.end();
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
