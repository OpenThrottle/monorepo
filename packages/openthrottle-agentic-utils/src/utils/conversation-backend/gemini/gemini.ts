/**
 * The gemini (Google Gemini CLI) backend: spawns `gemini --output-format
 * stream-json …` (arg array, never a shell), writes the prompt to the child's
 * stdin (gemini's headless entry reads a non-TTY stdin to EOF as the one-shot
 * input — the same fact that makes an unclosed stdin hang it), parses its
 * NDJSON stdout into {@link ConversationStreamChunk}s, and terminates on the
 * `result` event or process exit. Cancellation + timeouts are managed
 * explicitly with a SIGTERM→SIGKILL escalation (shared teardown). The child
 * receives a scrubbed environment — its host Gemini auth (GEMINI_API_KEY /
 * Vertex vars / OAuth under HOME) but none of the server's secrets.
 *
 * Multi-turn context is FLATTENED into the prompt: gemini 0.25.2's `--resume`
 * is index-based ("latest" or a per-project list index), not id-based, and
 * racy whenever two runs share a checkout — so the adapter never emits a
 * `session` chunk and ignores `resumeSession`/`sessionId`, replaying prior
 * turns as a transcript preamble instead. Persona is likewise a prompt prefix
 * (no `--system` flag; `GEMINI_SYSTEM_MD` replaces rather than appends and is
 * file-based, so it is rejected). MCP injection is not wired for v1 — gemini
 * reads only `.gemini/settings.json`, never `.mcp.json`; `mcpServers` is
 * ignored and `mcpEnv` merged harmlessly.
 * See docs/openthrottle/gemini-stream-json-schema.md.
 */

import { spawn } from 'node:child_process';

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationStreamChunk,
} from '../types.ts';
import { GEMINI_BIN_ENV, GEMINI_DEFAULT_BIN, buildGeminiArgv } from './argv.ts';
import { withFileMentions } from '../file-mentions.ts';
import { withKeepalive } from '../keepalive.ts';
import { createGeminiEventMapper } from './events.ts';
import { NdjsonBuffer } from '../cursor-agent/ndjson.ts';
import {
  resolveAgentTimeouts,
  terminateChild,
} from '../cursor-agent/teardown.ts';

/** Env vars the child is allowed to inherit (host Gemini auth + locale), nothing else. */
const ALLOWED_ENV_KEYS = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_LOCATION',
  'GOOGLE_CLOUD_PROJECT',
  'GOOGLE_GENAI_USE_GCA',
  'GOOGLE_GENAI_USE_VERTEXAI',
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
 * Resolve the binary: explicit env override, else `gemini` off PATH.
 */
function resolveGeminiBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[GEMINI_BIN_ENV]?.trim();
  return override !== undefined && override !== ''
    ? override
    : GEMINI_DEFAULT_BIN;
}

/**
 * Build a minimal allowlisted environment for the spawned child. `extra` (the
 * run's `mcpEnv`) is merged on top: the host env stays allowlisted, and only
 * the explicit server-provided keys are admitted.
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
 * Flatten the run into one prompt: persona (no `--system` flag exists), then
 * prior turns as a transcript (gemini has no id-based resume), then the latest
 * user message with its file mentions injected.
 */
export function buildGeminiPrompt(run: ConversationBackendRun): string {
  let lastUserIndex = -1;
  for (let index = 0; index < run.messages.length; index += 1) {
    if (run.messages[index]?.role === 'user') {
      lastUserIndex = index;
    }
  }
  const latest = lastUserIndex >= 0 ? run.messages[lastUserIndex].content : '';

  const history: string[] = [];
  for (let index = 0; index < lastUserIndex; index += 1) {
    const message = run.messages[index];
    if (message?.role === 'user') {
      history.push(`User: ${message.content}`);
    } else if (message?.role === 'assistant') {
      history.push(`Assistant: ${message.content}`);
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

async function* streamGemini(
  run: ConversationBackendRun,
): AsyncGenerator<ConversationStreamChunk> {
  if (run.cwd === undefined || run.cwd === '') {
    throw new Error('The gemini backend requires a cwd.');
  }

  // The prompt travels via stdin (see argv.ts); abort + timeouts are managed
  // explicitly (not via the spawn `signal` option) so teardown escalates
  // SIGTERM→SIGKILL rather than a single signal.
  const child = spawn(
    resolveGeminiBin(),
    buildGeminiArgv({
      model: run.model,
      permissionMode: run.permissionMode,
    }),
    {
      cwd: run.cwd,
      env: buildScrubbedEnv(process.env, run.mcpEnv),
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );

  // Write the prompt and close stdin — gemini reads it to EOF before running,
  // and an open pipe would hang the child forever.
  child.stdin?.end(buildGeminiPrompt(run));

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

  const mapEvent = createGeminiEventMapper();
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
            : `gemini exited with code ${code}`);
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
 * Backend for the gemini (Google Gemini) CLI.
 *
 * @public
 */
export const geminiConversationBackend: ConversationBackend = {
  stream: streamGemini,
};
