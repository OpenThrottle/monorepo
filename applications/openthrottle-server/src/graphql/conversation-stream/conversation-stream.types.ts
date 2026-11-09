import {
  type ChatCompletionMessage,
  type ConversationPermissionMode,
  type ConversationReasoningEffort,
  type ConversationServiceTier,
} from '@openthrottle/openthrottle-agentic-utils';
/**
 * @description Shared shapes for the conversation streaming feature. The publish
 * envelope key MUST equal the subscription resolver field name so @nestjs/graphql
 * can resolve conversationStreamChunkAdded (mirrors appendPlanOutput -> planOutputChunkAdded).
 */
import type { UsageLimit } from '@openthrottle/openthrottle-drivers';

/** A single streamed chunk published to `conversation:<conversationId>:stream`. */
export interface ConversationStreamChunkPayload {
  /** Conversation the chunk belongs to. */
  readonly conversationId: string;
  /** Incremental assistant text (empty on the terminal chunk). */
  readonly delta: string;
  /** True exactly once, on the terminal chunk. */
  readonly done: boolean;
  /** Error message when the stream failed; null otherwise. */
  readonly error: string | null;
  /** Unique id for this chunk (subscription dedupe / cursor). */
  readonly id: string;
  /** Event kind: text | thinking | tool_call | tool_result | usage | usage_limit | session. */
  readonly kind: string;
  /** Assistant message id the deltas accumulate into. */
  readonly messageId: string;
  /** JSON-encoded structured metadata for non-text kinds (tool args, usage, …); null otherwise. */
  readonly metadataJson: string | null;
  /** Monotonic index within the stream. */
  readonly sortOrder: number;
}

/**
 * Machine-readable marker carried on a terminal (`done: true`) chunk's
 * `metadataJson` when the orchestrator idle-timeout backstop fired, so the
 * client can distinguish "timed out — safe to retry" from a fatal error. A
 * healthy completion and a fatal failure both leave `metadataJson` null.
 */
export interface TerminalTimeoutMetadata {
  /** The client reads this to decide whether to auto-retry the turn. */
  readonly retryable: boolean;
  /** Provenance marker: the terminal chunk was synthesized by the idle timeout. */
  readonly timedOut: boolean;
}

/**
 * Machine-readable marker carried on a terminal (`done: true`) chunk's
 * `metadataJson` when the turn ended because the backend account hit a
 * subscription usage limit. `retryable` is always false: the client must not
 * auto-retry (it would hammer a limited account); `usageLimit.resetsAt` tells
 * it when the account is usable again (null when unknown).
 */
export interface TerminalUsageLimitMetadata {
  /** Always false — retrying a usage-limited account cannot succeed. */
  readonly retryable: false;
  /** Which limit was hit and when it resets. */
  readonly usageLimit: UsageLimit;
}

/**
 * PubSub publish envelope. The key MUST equal {@link CONVERSATION_STREAM_CHUNK_FIELD}
 * (the subscription field name) so @nestjs/graphql resolves the payload. Buffered
 * replay yields the same envelope shape as the live PubSub iterator.
 */
export interface ConversationStreamChunkEnvelope {
  readonly conversationStreamChunkAdded: ConversationStreamChunkPayload;
}
/** Everything needed to run one streamed assistant turn. */
export interface StartConversationStreamRun {
  /** Extra directories granted to a CLI beyond `cwd`; empty when none. */
  readonly additionalDirectories: readonly string[];
  /** Pre-allocated assistant message id (returned to the client by the mutation). */
  readonly assistantMessageId: string;
  /** Backend discriminator (`openai` | `cursor`). */
  readonly backend: string;
  /** OpenAI-compatible base URL of the discovered endpoint (openai backend). */
  readonly baseUrl: string | null;
  /** Conversation the turn belongs to. */
  readonly conversationId: string;
  /** Resolved working directory for a CLI backend. */
  readonly cwd: string | null;
  /** @-mentioned workspace-relative paths for structured context injection; empty when none. */
  readonly fileMentions: readonly string[];
  /** Extra env a CLI child passes through (OT MCP token + API URLs); null when no MCP is configured. */
  readonly mcpEnv: Readonly<Record<string, string>> | null;
  /** Managed MCP servers (canonical `.mcp.json` schema) for a CLI backend; null when none apply. */
  readonly mcpServers: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  > | null;
  /** Full prompt context (prior history + the new user message), oldest first. */
  readonly messages: ReadonlyArray<ChatCompletionMessage>;
  /** Model id to complete with (openai), or optional model override (cli). */
  readonly model: string;
  /**
   * Permission posture selected in the composer toolbar; forwarded to CLI
   * backends, which resolve it to concrete permission flags. Null when unset.
   */
  readonly permissionMode: ConversationPermissionMode | null;
  /**
   * When false (Private mode) the turn streams ephemerally: nothing is written
   * to the DB — no assistant message, no model snapshot, no CLI-minted session
   * id. The replay buffer + pubsub still run against the (synthetic) id. True
   * for every persisted turn.
   */
  readonly persist: boolean;
  /** Provider/backend label persisted on the conversation, or null. */
  readonly provider: string | null;
  /** Reasoning effort forwarded to backends that expose one; null when unset. */
  readonly reasoning: ConversationReasoningEffort | null;
  /** True when the CLI backend should resume `sessionId` rather than create it (claude). */
  readonly resumeSession: boolean;
  /** Service tier forwarded to tier-aware backends (cursor); null when unset. */
  readonly serviceTier: ConversationServiceTier | null;
  /** CLI session handle to resume (e.g. cursor chat id), or null when the CLI mints it (opencode first turn). */
  readonly sessionId: string | null;
  /** System prompt (persona) injected by CLI backends. */
  readonly systemPrompt: string | null;
  /** Owning user id (conversation ownership is enforced on persist). */
  readonly userId: string;
}
