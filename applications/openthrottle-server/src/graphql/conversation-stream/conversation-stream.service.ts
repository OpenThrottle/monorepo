/**
 * @description Streams an OpenAI-compatible chat completion from a discovered
 * local endpoint, publishing each token delta to the per-conversation PubSub
 * topic and persisting the accumulated assistant message on completion. Runs
 * fire-and-forget: a publish/persist failure is logged, never thrown, so it can
 * never crash the request that started it.
 */

import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  PUB_SUB,
  conversationStreamTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { AgentConversationsService } from '@openthrottle/nestjs-repositories';
import {
  CONVERSATION_CLI_BACKENDS,
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ChatCompletionMessage,
  type ConversationBackend,
  type ConversationBackendRun,
  type ConversationPermissionMode,
  type ConversationReasoningEffort,
  type ConversationServiceTier,
  openAiConversationBackend,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  CONVERSATION_STREAM_CHUNK_FIELD,
  type ConversationStreamChunkEnvelope,
  type ConversationStreamChunkPayload,
} from './conversation-stream.types';

/**
 * CLI backends (spawned agent adapters) keyed by the driver-id discriminator,
 * derived from the single `CONVERSATION_CLI_BACKENDS` registry so a new driver's
 * backend is wired in one place (agentic-utils) with no edit here. openai is the
 * default HTTP path when a backend is not in this map.
 */
const CLI_BACKENDS: Readonly<Record<string, ConversationBackend>> =
  CONVERSATION_CLI_BACKENDS;

/** Conversation-metadata key holding a backend's persisted session id. */
const sessionMetadataKey = (backend: string): string => `${backend}SessionId`;

/**
 * How long a finished turn's chunk buffer is retained after its terminal chunk,
 * so a subscriber that attaches slightly late (the home route only subscribes
 * once the start mutation has returned the conversation id) — or a turn that
 * completed entirely before the client subscribed — still replays in full.
 */
const BUFFER_GRACE_MS = 30_000;

/**
 * Hard cap on buffered chunks per conversation. A turn larger than this drops
 * its oldest chunks from replay (the live stream is unaffected); bounds memory.
 */
const BUFFER_MAX_CHUNKS = 5_000;

/** Everything needed to run one streamed assistant turn. */
export interface StartConversationStreamRun {
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

@Injectable()
export class ConversationStreamService {
  private readonly controllers = new Map<string, AbortController>();

  // Per-conversation replay buffer of the current/most-recent turn's chunks, so
  // a late subscriber does not miss chunks published before it attached. Evicted
  // BUFFER_GRACE_MS after the turn's terminal chunk. Single-process only (mirrors
  // the in-process PubSub); a multi-process deployment would need shared storage.
  private readonly buffers = new Map<
    string,
    ConversationStreamChunkPayload[]
  >();
  private readonly evictionTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly conversations: AgentConversationsService,
    private readonly logger: LoggerService,
    @Inject(PUB_SUB) private readonly pubSub: PubSubEngine,
  ) {}

  /**
   * Subscribe to a conversation's stream, replaying any buffered chunks of the
   * current/most-recent turn before switching to live deltas. The live iterator
   * is attached BEFORE the buffer is snapshotted so no chunk slips through the
   * gap; the client dedupes the (small) overlap by `messageId:sortOrder`.
   */
  subscribe(
    conversationId: string,
  ): AsyncGenerator<ConversationStreamChunkEnvelope> {
    const live = this.pubSub.asyncIterator<ConversationStreamChunkEnvelope>(
      conversationStreamTopic(conversationId),
    );
    const buffered = [...(this.buffers.get(conversationId) ?? [])];

    return this.replayThenLive(buffered, live);
  }

  private async *replayThenLive(
    buffered: ReadonlyArray<ConversationStreamChunkPayload>,
    live: AsyncIterator<ConversationStreamChunkEnvelope>,
  ): AsyncGenerator<ConversationStreamChunkEnvelope> {
    for (const chunk of buffered) {
      yield { [CONVERSATION_STREAM_CHUNK_FIELD]: chunk };
    }

    // Delegate to the live PubSub iterator. `yield*` forwards a consumer
    // `.return()` (graphql-ws unsubscribe) to `live`, tearing down the
    // underlying PubSub subscription.
    const liveIterable: AsyncIterable<ConversationStreamChunkEnvelope> = {
      [Symbol.asyncIterator]: () => live,
    };
    yield* liveIterable;
  }

  /**
   * Abort an in-flight stream for a conversation. Returns whether one was aborted.
   */
  cancel(conversationId: string): boolean {
    const controller = this.controllers.get(conversationId);
    if (!controller) {
      return false;
    }
    controller.abort();
    return true;
  }

  /**
   * Kick off a streaming completion. Fire-and-forget; errors are logged, never thrown.
   */
  start(run: StartConversationStreamRun): void {
    void this.runStream(run);
  }

  /**
   * Drive the stream to completion. Always resolves; failures surface as a terminal error chunk.
   */
  async runStream(run: StartConversationStreamRun): Promise<void> {
    const controller = new AbortController();
    this.controllers.set(run.conversationId, controller);

    // A new turn starts a fresh replay buffer (and cancels any pending eviction
    // of the previous turn's buffer).
    this.resetBuffer(run.conversationId);

    let accumulated = '';
    let sortOrder = 0;
    let sessionPersisted = false;
    // Error the backend reported on its terminal chunk (claude gates this on
    // `is_error`); forwarded onto the published done chunk instead of dropped.
    let terminalError: string | null = null;

    // Non-text events (thinking/tool/usage/session) collected for persistence
    // into the assistant message's tool_metadata on completion.
    const toolEvents: Array<Record<string, unknown>> = [];

    const backend: ConversationBackend =
      CLI_BACKENDS[run.backend] ?? openAiConversationBackend;

    const backendRun: ConversationBackendRun = {
      baseUrl: run.baseUrl ?? undefined,
      cwd: run.cwd ?? undefined,
      fileMentions: run.fileMentions.length > 0 ? run.fileMentions : undefined,
      mcpEnv: run.mcpEnv ?? undefined,
      mcpServers: run.mcpServers ?? undefined,
      messages: run.messages,
      model: run.model,
      permissionMode: run.permissionMode ?? undefined,
      reasoning: run.reasoning ?? undefined,
      resumeSession: run.resumeSession,
      serviceTier: run.serviceTier ?? undefined,
      sessionId: run.sessionId ?? undefined,
      signal: controller.signal,
      systemPrompt: run.systemPrompt ?? undefined,
    };

    try {
      for await (const chunk of backend.stream(backendRun)) {
        if (chunk.done) {
          // A terminal chunk can still carry token accounting — claude and
          // cursor-agent ride their usage on the `done:true` chunk (kind
          // `usage`, metadata `{ usage, modelUsage, totalCostUsd, result }`).
          // Re-emit it as a discrete usage chunk that is buffered, published,
          // AND collected into `toolEvents` so both the live stream and the
          // persisted turn keep the counts (previously this metadata was
          // dropped when the loop broke). opencode reports usage mid-stream
          // (done:false) so it already flows through below — unaffected.
          if (chunk.metadata !== undefined) {
            toolEvents.push({
              delta: chunk.delta,
              kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
              metadata: chunk.metadata,
            });

            await this.publishChunk({
              conversationId: run.conversationId,
              delta: chunk.delta,
              done: false,
              error: null,
              id: randomUUID(),
              kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
              messageId: run.assistantMessageId,
              metadataJson: JSON.stringify(chunk.metadata),
              sortOrder,
            });

            sortOrder += 1;
          }

          terminalError = chunk.error ?? null;
          break;
        }

        // Assistant text accumulates into the persisted message body; non-text
        // events are collected and persisted into tool_metadata on completion.
        if (chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.text) {
          accumulated += chunk.delta;
        } else {
          toolEvents.push({
            delta: chunk.delta,
            kind: chunk.kind,
            metadata: chunk.metadata ?? null,
          });
        }

        // Persist a CLI-minted session id the first time the backend surfaces
        // one that differs from what we passed in (opencode mints it on the
        // first run). Cursor/claude echo the id we already hold → no-op.
        if (
          !sessionPersisted &&
          chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.session
        ) {
          sessionPersisted = true;
          await this.maybePersistMintedSession(run, chunk.metadata);
        }

        await this.publishChunk({
          conversationId: run.conversationId,
          delta: chunk.delta,
          done: false,
          error: null,
          id: randomUUID(),
          kind: chunk.kind,
          messageId: run.assistantMessageId,
          metadataJson:
            chunk.metadata === undefined
              ? null
              : JSON.stringify(chunk.metadata),
          sortOrder: sortOrder,
        });

        sortOrder += 1;
      }

      await this.persistAssistant(run, accumulated, toolEvents);
      await this.publishChunk({
        conversationId: run.conversationId,
        delta: '',
        done: true,
        error: terminalError,
        id: randomUUID(),
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
        messageId: run.assistantMessageId,
        metadataJson: null,
        sortOrder: sortOrder,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`conversation-stream failed: ${message}`);

      // Persist whatever streamed before the failure so the turn is not lost.
      if (accumulated.length > 0 || toolEvents.length > 0) {
        await this.persistAssistant(run, accumulated, toolEvents);
      }

      await this.publishChunk({
        conversationId: run.conversationId,
        delta: '',
        done: true,
        error: message,
        id: randomUUID(),
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
        messageId: run.assistantMessageId,
        metadataJson: null,
        sortOrder: sortOrder,
      });
    } finally {
      this.controllers.delete(run.conversationId);
    }
  }

  /**
   * Persist a session id the CLI minted mid-stream (opencode) into
   * `conversation.metadata[<backend>SessionId]`, so the next turn resumes it.
   * A no-op when the surfaced id matches the one we already passed in
   * (cursor/claude) or is absent. Failures are logged, never thrown — a
   * metadata write must not kill an in-flight stream.
   */
  private async maybePersistMintedSession(
    run: StartConversationStreamRun,
    metadata: Readonly<Record<string, unknown>> | undefined,
  ): Promise<void> {
    const minted = metadata?.['sessionId'];
    if (
      typeof minted !== 'string' ||
      minted === '' ||
      minted === run.sessionId
    ) {
      return;
    }

    try {
      await this.conversations.updateMetadata(run.conversationId, {
        [sessionMetadataKey(run.backend)]: minted,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `conversation-stream session persist failed: ${message}`,
      );
    }
  }

  private async persistAssistant(
    run: StartConversationStreamRun,
    content: string,
    toolEvents: ReadonlyArray<Record<string, unknown>>,
  ): Promise<void> {
    try {
      const isEmpty = toolEvents.length === 0;
      const toolMetadata = !isEmpty ? { events: [...toolEvents] } : null;

      await this.conversations.appendMessages(run.userId, run.conversationId, [
        {
          content,
          id: run.assistantMessageId,
          role: 'assistant',
          toolMetadata,
        },
      ]);

      await this.conversations.updateModelSnapshot(run.conversationId, {
        modelName: run.model,
        modelProvider: run.provider,
      });
    } catch (error: unknown) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      this.logger.error(`conversation-stream persist failed: ${message}`);
    }
  }

  private async publishChunk(
    chunk: ConversationStreamChunkPayload,
  ): Promise<void> {
    // Buffer before publishing so a subscriber attaching mid-publish still finds
    // the chunk in the replay snapshot.
    this.recordChunk(chunk);

    try {
      await this.pubSub.publish(conversationStreamTopic(chunk.conversationId), {
        [CONVERSATION_STREAM_CHUNK_FIELD]: chunk,
      });
    } catch (error: unknown) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      this.logger.error(`conversation-stream publish failed: ${message}`);
    }
  }

  /** Append a chunk to the conversation's replay buffer; evict after the terminal chunk. */
  private recordChunk(chunk: ConversationStreamChunkPayload): void {
    const buffer = this.buffers.get(chunk.conversationId) ?? [];
    buffer.push(chunk);
    // Drop oldest beyond the cap so a very long turn cannot grow unbounded.
    if (buffer.length > BUFFER_MAX_CHUNKS) {
      buffer.splice(0, buffer.length - BUFFER_MAX_CHUNKS);
    }
    this.buffers.set(chunk.conversationId, buffer);

    if (chunk.done) {
      this.scheduleEviction(chunk.conversationId);
    }
  }

  /** Reset the replay buffer for a new turn and cancel any pending eviction. */
  private resetBuffer(conversationId: string): void {
    const timer = this.evictionTimers.get(conversationId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.evictionTimers.delete(conversationId);
    }
    this.buffers.set(conversationId, []);
  }

  /** Evict a finished turn's buffer after a grace window for late subscribers. */
  private scheduleEviction(conversationId: string): void {
    const existing = this.evictionTimers.get(conversationId);
    if (existing !== undefined) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.buffers.delete(conversationId);
      this.evictionTimers.delete(conversationId);
    }, BUFFER_GRACE_MS);
    timer.unref();

    this.evictionTimers.set(conversationId, timer);
  }
}
