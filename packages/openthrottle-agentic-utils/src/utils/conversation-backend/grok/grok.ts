/**
 * The grok (xAI Grok CLI) backend: spawns `grok --single=… --output-format
 * streaming-json` (arg array, never a shell), parses its JSONL stdout into
 * {@link ConversationStreamChunk}s, and terminates on the `end` event or process
 * exit. Cancellation + timeouts are managed explicitly with a SIGTERM→SIGKILL
 * escalation (shared teardown). The child receives a scrubbed environment — its
 * host grok login (under HOME / ~/.grok) but none of the server's secrets.
 *
 * Multi-turn context is owned by grok: one OT conversation ↔ one session id.
 * Like opencode/codex (and unlike claude's minted UUID), grok mints the id on
 * the first run and echoes it in the terminal `end.sessionId`; the adapter
 * surfaces it via a `kind:'session'` chunk (emitted BEFORE the terminal usage
 * chunk) and later turns resume it with `-r <id>`. We send only the latest user
 * message, never replayed history. Persona is a first-class
 * `--system-prompt-override`, so nothing is prefixed into the prompt. MCP
 * injection is not wired for v1 (grok has no inline flag); `mcpServers` is
 * ignored and `mcpEnv` merged harmlessly.
 * See docs/openthrottle/grok-stream-json-schema.md.
 */

import { spawn } from 'node:child_process';

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationStreamChunk,
} from '../types.ts';
import { GROK_BIN_ENV, GROK_DEFAULT_BIN, buildGrokArgv } from './argv.ts';
import { withFileMentions } from '../file-mentions.ts';
import { mapGrokEvent } from './events.ts';
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
  'XAI_API_KEY',
] as const;

/**
 * Resolve the binary: explicit env override, else `grok` off PATH.
 */
function resolveGrokBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[GROK_BIN_ENV]?.trim();
  return override !== undefined && override !== ''
    ? override
    : GROK_DEFAULT_BIN;
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
 * The latest user message in the run. Persona is injected via
 * `--system-prompt-override` (argv), not the prompt, so no prefixing here.
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

async function* streamGrok(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.cwd === undefined || run.cwd === '') {
    throw new Error('The grok backend requires a cwd.');
  }

  // A discovered local endpoint (run.baseUrl) is targeted by pointing grok's
  // model endpoint at it via GROK_MODELS_BASE_URL; XAI_API_KEY is a placeholder
  // (local servers ignore it — we never forward the host's real xAI key). Merged
  // on top of the run's mcpEnv into the scrubbed child env; `--model` (run.model)
  // selects the discovered id.
  const endpointEnv =
    run.baseUrl !== undefined && run.baseUrl !== ''
      ? { GROK_MODELS_BASE_URL: run.baseUrl, XAI_API_KEY: 'local' }
      : undefined;
  const extraEnv =
    run.mcpEnv !== undefined || endpointEnv !== undefined
      ? { ...(run.mcpEnv ?? {}), ...(endpointEnv ?? {}) }
      : undefined;

  // Abort + timeouts are managed explicitly (not via the spawn `signal` option)
  // so teardown escalates SIGTERM→SIGKILL rather than a single signal. stdin is
  // ignored: the run is fully driven by argv (the prompt is `--single=…`).
  const child = spawn(
    resolveGrokBin(),
    buildGrokArgv({
      cwd: run.cwd,
      model: run.model,
      permissionMode: run.permissionMode,
      prompt: withFileMentions(latestUserMessage(run), run.fileMentions),
      reasoning: run.reasoning,
      resume: run.resumeSession === true,
      sessionId: run.sessionId,
      systemPrompt: run.systemPrompt,
    }),
    {
      cwd: run.cwd,
      env: buildScrubbedEnv(process.env, extraEnv),
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
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      for (const chunk of mapGrokEvent(parsed)) {
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
            : `grok exited with code ${code}`);
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
 * Backend for the grok (xAI Grok) CLI.
 *
 * @public
 */
export const grokConversationBackend: ConversationBackend = {
  stream: streamGrok,
};
