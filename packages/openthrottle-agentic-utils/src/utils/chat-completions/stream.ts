/**
 * Streaming OpenAI-compatible chat completions.
 *
 * Every endpoint {@link discoverModels} can return (Ollama, LM Studio, vLLM,
 * llama.cpp, SGLang) speaks the OpenAI `/v1/chat/completions` protocol, so a
 * single `openai` SDK client — pointed at the discovered endpoint `baseUrl` —
 * covers all of them with no provider-specific code. We let the SDK own SSE
 * parsing, error surfacing, and `AbortSignal` cancellation; this module only
 * maps the SDK's stream onto a tiny `{ delta, done }` shape so SDK types never
 * leak across the package boundary.
 */
import OpenAI from 'openai';
import { resolveAgentTimeouts } from '../conversation-backend/cursor-agent/teardown.ts';

/** A chat message role the local model understands. */
export type ChatRole = 'assistant' | 'system' | 'user';

/**
 * A single chat message handed to {@link streamChatCompletion}.
 *
 * @public
 */
export interface ChatCompletionMessage {
  /** Plain-text message body. */
  readonly content: string;
  /** Who authored the message. */
  readonly role: ChatRole;
}

/**
 * Options for {@link streamChatCompletion}.
 *
 * @public
 */
export interface StreamChatCompletionOptions {
  /** OpenAI-compatible base URL of the discovered endpoint, e.g. `http://localhost:11434/v1`. */
  readonly baseUrl: string;
  /** Conversation so far, oldest first. */
  readonly messages: ReadonlyArray<ChatCompletionMessage>;
  /** Model id to complete with, as advertised by the endpoint. */
  readonly model: string;
  /**
   * Reasoning-effort hint for reasoning-capable models, sent as the OpenAI
   * `reasoning_effort` request param. Best-effort: only forwarded when set, so
   * endpoints/models that do not support it are unaffected. The caller maps the
   * composer level onto this `low`/`medium`/`high` triple.
   */
  readonly reasoningEffort?: 'high' | 'low' | 'medium';
  /** Optional abort signal; forwarded to the SDK to cancel the in-flight stream. */
  readonly signal?: AbortSignal;
}

/**
 * One emitted piece of a streamed completion.
 *
 * @public
 */
export interface ChatCompletionChunk {
  /** Incremental text for this chunk (empty on the terminal `done` chunk). */
  readonly delta: string;
  /** `true` exactly once, after the final delta, to mark the stream complete. */
  readonly done: boolean;
}

/** Narrow our public message to the SDK's discriminated param union without `as`. */
function toMessageParam(
  message: ChatCompletionMessage,
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  switch (message.role) {
    case 'assistant':
      return { content: message.content, role: 'assistant' };
    case 'system':
      return { content: message.content, role: 'system' };
    case 'user':
      return { content: message.content, role: 'user' };
  }
}

/**
 * Stream a chat completion from an OpenAI-compatible local endpoint, yielding
 * incremental text deltas followed by a single terminal `{ delta: '', done:
 * true }`. Errors from the SDK (including abort) propagate to the consumer.
 *
 * @public
 */
export async function* streamChatCompletion(
  options: StreamChatCompletionOptions,
): AsyncIterable<ChatCompletionChunk> {
  const client = new OpenAI({
    apiKey: process.env.LLM_API_KEY ?? 'not-needed',
    baseURL: options.baseUrl,
  });

  // Per-part idle timeout: unlike the CLI backends (whose subprocess wrapper
  // self-terminates on idle), the SDK stream is otherwise unbounded — a silent
  // endpoint mid-stream hangs the `for await` forever. Abort the SDK request
  // when no part arrives within `idleMs`, composed with any caller signal so
  // both the orchestrator abort and the idle abort tear the stream down. This
  // is defense-in-depth beneath the runStream() backstop: it frees the HTTP
  // socket promptly and surfaces a clear error close to the source.
  const { idleMs } = resolveAgentTimeouts();
  const idleController = new AbortController();
  const signal =
    options.signal !== undefined
      ? AbortSignal.any([options.signal, idleController.signal])
      : idleController.signal;

  let idleTimer: NodeJS.Timeout | undefined;
  let idleFired = false;
  const armIdle = (): void => {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => {
      idleFired = true;
      idleController.abort();
    }, idleMs);
    idleTimer.unref();
  };

  try {
    // Arm before `create()` so a stalled connect is bounded too, then reset on
    // every delivered part.
    armIdle();
    const stream = await client.chat.completions.create(
      {
        messages: options.messages.map(toMessageParam),
        model: options.model,
        // Only include when set so endpoints that reject unknown params (many
        // local, non-reasoning models) are untouched.
        ...(options.reasoningEffort !== undefined
          ? { reasoning_effort: options.reasoningEffort }
          : {}),
        stream: true,
      },
      { signal },
    );
    for await (const part of stream) {
      armIdle();
      const delta = part.choices[0]?.delta?.content ?? '';
      if (delta.length > 0) {
        yield { delta, done: false };
      }
    }
    yield { delta: '', done: true };
  } catch (error: unknown) {
    // Distinguish our idle abort from a caller abort / genuine SDK error, so the
    // upstream orchestrator publishes a clear timeout message.
    if (idleFired && !(options.signal?.aborted ?? false)) {
      throw new Error(
        `The model endpoint stalled: no response for ${Math.round(idleMs / 1000)}s.`,
      );
    }
    throw error;
  } finally {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
    }
  }
}
