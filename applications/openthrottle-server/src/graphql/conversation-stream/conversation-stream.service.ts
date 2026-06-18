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
  type ChatCompletionMessage,
  streamChatCompletion,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  CONVERSATION_STREAM_CHUNK_FIELD,
  type ConversationStreamChunkPayload,
} from './conversation-stream.types';

/** Everything needed to run one streamed assistant turn. */
export interface StartConversationStreamRun {
  /** Pre-allocated assistant message id (returned to the client by the mutation). */
  readonly assistantMessageId: string;
  /** OpenAI-compatible base URL of the discovered endpoint. */
  readonly baseUrl: string;
  /** Conversation the turn belongs to. */
  readonly conversationId: string;
  /** Full prompt context (prior history + the new user message), oldest first. */
  readonly messages: ReadonlyArray<ChatCompletionMessage>;
  /** Model id to complete with. */
  readonly model: string;
  /** Discovered provider label persisted on the conversation, or null. */
  readonly provider: string | null;
  /** Owning user id (conversation ownership is enforced on persist). */
  readonly userId: string;
}

@Injectable()
export class ConversationStreamService {
  private readonly controllers = new Map<string, AbortController>();

  constructor(
    private readonly conversations: AgentConversationsService,
    private readonly logger: LoggerService,
    @Inject(PUB_SUB) private readonly pubSub: PubSubEngine,
  ) {}

  /** Kick off a streaming completion. Fire-and-forget; errors are logged, never thrown. */
  start(run: StartConversationStreamRun): void {
    void this.runStream(run);
  }

  /** Abort an in-flight stream for a conversation. Returns whether one was aborted. */
  cancel(conversationId: string): boolean {
    const controller = this.controllers.get(conversationId);
    if (!controller) {
      return false;
    }
    controller.abort();
    return true;
  }

  /** Drive the stream to completion. Always resolves; failures surface as a terminal error chunk. */
  async runStream(run: StartConversationStreamRun): Promise<void> {
    const controller = new AbortController();
    this.controllers.set(run.conversationId, controller);
    let accumulated = '';
    let sortOrder = 0;

    try {
      for await (const chunk of streamChatCompletion({
        baseUrl: run.baseUrl,
        messages: run.messages,
        model: run.model,
        signal: controller.signal,
      })) {
        if (chunk.done) {
          break;
        }
        accumulated += chunk.delta;
        await this.publishChunk({
          conversationId: run.conversationId,
          delta: chunk.delta,
          done: false,
          error: null,
          id: randomUUID(),
          messageId: run.assistantMessageId,
          sortOrder: sortOrder,
        });
        sortOrder += 1;
      }

      await this.persistAssistant(run, accumulated);
      await this.publishChunk({
        conversationId: run.conversationId,
        delta: '',
        done: true,
        error: null,
        id: randomUUID(),
        messageId: run.assistantMessageId,
        sortOrder: sortOrder,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`conversation-stream failed: ${message}`);
      // Persist whatever streamed before the failure so the turn is not lost.
      if (accumulated.length > 0) {
        await this.persistAssistant(run, accumulated);
      }
      await this.publishChunk({
        conversationId: run.conversationId,
        delta: '',
        done: true,
        error: message,
        id: randomUUID(),
        messageId: run.assistantMessageId,
        sortOrder: sortOrder,
      });
    } finally {
      this.controllers.delete(run.conversationId);
    }
  }

  private async persistAssistant(
    run: StartConversationStreamRun,
    content: string,
  ): Promise<void> {
    try {
      await this.conversations.appendMessages(run.userId, run.conversationId, [
        { content, id: run.assistantMessageId, role: 'assistant' },
      ]);
      await this.conversations.updateModelSnapshot(run.conversationId, {
        modelName: run.model,
        modelProvider: run.provider,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`conversation-stream persist failed: ${message}`);
    }
  }

  private async publishChunk(
    chunk: ConversationStreamChunkPayload,
  ): Promise<void> {
    try {
      await this.pubSub.publish(conversationStreamTopic(chunk.conversationId), {
        [CONVERSATION_STREAM_CHUNK_FIELD]: chunk,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`conversation-stream publish failed: ${message}`);
    }
  }
}
