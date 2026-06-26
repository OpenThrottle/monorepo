/**
 * The streaming seam shared by every conversation backend.
 *
 * A backend — an OpenAI-compatible HTTP endpoint, or a spawned agentic CLI — is
 * just an async iterable of {@link ConversationStreamChunk}. Mapping a source's
 * native output onto this one shape is the whole integration surface: everything
 * downstream (PubSub publish, the `conversationStreamChunkAdded` subscription,
 * the client accumulator) stays identical regardless of which backend produced
 * the chunks. The chunk `kind` is defined here once so the server payload and
 * client renderer can derive from a single source.
 */

import type { ChatCompletionMessage } from '../chat-completions/index.ts';

/**
 * Event kinds a backend can emit. `text` is plain assistant output; the rest
 * describe richer agentic events (reasoning, tool use, token accounting, the
 * backend's session handle). Values are snake_case to match the wire payload.
 *
 * @publicApi
 */
export const CONVERSATION_STREAM_CHUNK_KINDS = {
  session: 'session',
  text: 'text',
  thinking: 'thinking',
  toolCall: 'tool_call',
  toolResult: 'tool_result',
  usage: 'usage',
} as const;

/**
 * One of the {@link CONVERSATION_STREAM_CHUNK_KINDS} values.
 *
 * @publicApi
 */
export type ConversationStreamChunkKind =
  (typeof CONVERSATION_STREAM_CHUNK_KINDS)[keyof typeof CONVERSATION_STREAM_CHUNK_KINDS];

/**
 * One emitted piece of a streamed turn. `delta` carries incremental text for
 * `kind: 'text'` (empty on the terminal chunk); non-text kinds use `metadata`
 * for their structured payload. `done` is true exactly once, on the terminal
 * chunk. `error` is set when the stream failed.
 *
 * @publicApi
 */
export interface ConversationStreamChunk {
  /** Incremental text for this chunk (empty for non-text kinds and the terminal chunk). */
  readonly delta: string;
  /** True exactly once, on the terminal chunk. */
  readonly done: boolean;
  /** Error message when the stream failed; null/undefined otherwise. */
  readonly error?: string | null;
  /** What this chunk represents. */
  readonly kind: ConversationStreamChunkKind;
  /** Structured payload for non-text kinds (tool args, usage, session id, …). */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Everything a backend needs to produce one streamed turn. OpenAI uses
 * `messages` + `baseUrl`; CLI backends (added later) extend this with their own
 * fields (working directory, session handle, system prompt). All backends honor
 * `signal` for cancellation.
 *
 * @publicApi
 */
export interface ConversationBackendRun {
  /** OpenAI-compatible base URL; required by the openai backend. */
  readonly baseUrl?: string;
  /** Working directory the CLI runs in; required by CLI backends. */
  readonly cwd?: string;
  /** Full prompt context (prior history + the new user message), oldest first. */
  readonly messages: ReadonlyArray<ChatCompletionMessage>;
  /** Model id to complete with. */
  readonly model: string;
  /**
   * CLI backend session handle to resume (e.g. a cursor-agent chat id). CLI
   * backends own multi-turn context themselves, so they read only the latest
   * user message from `messages` and rely on this id for history.
   */
  readonly sessionId?: string;
  /** Optional abort signal; cancels the in-flight stream. */
  readonly signal?: AbortSignal;
  /**
   * System prompt to steer the turn (e.g. a persona). CLI backends without a
   * native system-prompt flag inject it as a prompt prefix.
   */
  readonly systemPrompt?: string;
}

/**
 * A streaming conversation source. Implementations map their native output onto
 * {@link ConversationStreamChunk}; the consumer never sees backend specifics.
 *
 * @publicApi
 */
export interface ConversationBackend {
  stream(run: ConversationBackendRun): AsyncIterable<ConversationStreamChunk>;
}
