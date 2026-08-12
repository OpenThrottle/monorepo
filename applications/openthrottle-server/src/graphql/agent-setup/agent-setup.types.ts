/**
 * @description Shared shapes for the agent-CLI install/update streaming feature. The publish
 * envelope key MUST equal the subscription resolver field name so @nestjs/graphql can resolve
 * agentSetupChunkAdded (mirrors conversationStreamChunkAdded).
 */

/** Subscription field name; used as the PubSub publish envelope key. */
export const AGENT_SETUP_CHUNK_FIELD = 'agentSetupChunkAdded' as const;

/** A single chunk published to `agent-setup:<runId>:stream`. */
export interface AgentSetupStreamChunkPayload {
  /** Incremental stdout/stderr text (empty on the terminal chunk). */
  readonly data: string;
  /** True exactly once, on the terminal chunk of the run. */
  readonly done: boolean;
  /** Failure classifier from the executor when the run failed; null otherwise. */
  readonly error: string | null;
  /** Child exit code on the terminal chunk (null while running / when killed). */
  readonly exitCode: number | null;
  /** Unique id for this chunk (subscription dedupe / cursor). */
  readonly id: string;
  /** The install/update run this chunk belongs to. */
  readonly runId: string;
  /** Monotonic index within the run. */
  readonly sortOrder: number;
  /** Which stream the text came from (`stdout` | `stderr`); `stdout` on the terminal chunk. */
  readonly stream: string;
}

/**
 * PubSub publish envelope. The key MUST equal {@link AGENT_SETUP_CHUNK_FIELD} (the subscription
 * field name) so @nestjs/graphql resolves the payload. Buffered replay yields the same envelope
 * shape as the live PubSub iterator.
 */
export interface AgentSetupStreamChunkEnvelope {
  readonly agentSetupChunkAdded: AgentSetupStreamChunkPayload;
}
