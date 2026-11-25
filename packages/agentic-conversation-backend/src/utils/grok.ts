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

import { grokDriver } from '@openthrottle/openthrottle-drivers';

import type {
  ConversationBackend,
  ConversationBackendRun,
  ConversationStreamChunk,
} from '../types/conversation-backend.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types/conversation-backend.ts';
import { createGrokEventMapper } from './createGrokEventMapper.ts';
import {
  resolveAgentTimeouts,
  terminateChild,
} from './cursor-agent-teardown.ts';
import { describeExit } from './describeExit.ts';
import { withFileMentions } from './file-mentions.ts';
import { buildGrokArgv, GROK_BIN_ENV, GROK_DEFAULT_BIN } from './grok-argv.ts';
import { pickChatHostEnv } from './host-env.ts';
import { withKeepalive } from './keepalive.ts';
import { NdjsonBuffer } from './NdjsonBuffer.ts';

/** The stderr line grok prints for each tool a headless run could not approve. */
const PERMISSION_REQUIRED_PREFIX = 'permission required:';

/**
 * Add grok's own `permission required: …` stderr lines (which name the exact
 * command, not just the tool) to a terminal error, so the user sees what was
 * blocked. Anything without such a line is returned unchanged.
 */
function withPermissionDetail(
  chunk: ConversationStreamChunk,
  stderr: string,
): ConversationStreamChunk {
  if (!chunk.done || chunk.error === undefined || chunk.error === null) {
    return chunk;
  }

  const detail = stderr
    .split('\n')
    .map((line) => {
      return line.trim();
    })
    .filter((line) => {
      return line.startsWith(PERMISSION_REQUIRED_PREFIX);
    });

  if (detail.length === 0) {
    return chunk;
  }

  return {
    ...chunk,
    error: `${chunk.error}\n\ngrok: ${detail.join('\ngrok: ')}`,
  };
}

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
  return pickChatHostEnv(env, grokDriver.hostEnv, extra);
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

/**
 * Child env layered on top of the run's `mcpEnv`: the discovered local
 * endpoint (when `run.baseUrl` is set) plus a placeholder xAI key.
 */
function resolveExtraEnv(
  run: ConversationBackendRun,
): Record<string, string> | undefined {
  const hasEndpoint = run.baseUrl !== undefined && run.baseUrl !== '';

  if (run.mcpEnv === undefined && !hasEndpoint) {
    return undefined;
  }

  if (!hasEndpoint) {
    return { ...run.mcpEnv };
  }

  return {
    ...run.mcpEnv,
    GROK_MODELS_BASE_URL: run.baseUrl,
    XAI_API_KEY: 'local',
  };
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
  const extraEnv = resolveExtraEnv(run);

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

  const buffer = new NdjsonBuffer();
  const mapper = createGrokEventMapper();
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
      for (const chunk of mapper.map(parsed)) {
        if (chunk.done) {
          sawTerminal = true;
        }
        yield withPermissionDetail(chunk, stderr);
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
        terminationReason ?? describeExit('grok', { code, error, stderr });
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
