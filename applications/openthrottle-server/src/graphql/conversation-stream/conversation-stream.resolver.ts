/**
 * @description Resolver for the conversation streaming surface. startConversationStream
 * validates the requested endpoint+model against discoverLocalModels (SSRF guard),
 * resolves-or-creates the conversation, persists the user message, allocates the
 * assistant message id, and kicks off the streaming service fire-and-forget.
 */

import { randomUUID } from 'node:crypto';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
  CurrentUser,
} from '@openthrottle/nestjs-auth';
import { NestjsModelDiscoveryService } from '@openthrottle/nestjs-model-discovery';
import {
  AGENT_CONVERSATION_MESSAGE_ROLES,
  type AgentConversationMessage,
  AgentConversationsService,
} from '@openthrottle/nestjs-repositories';
import type { ChatCompletionMessage } from '@openthrottle/openthrottle-agentic-utils';

import { StartConversationStreamInput } from './conversation-stream.input';
import { StartConversationStreamResult } from './conversation-stream.object';
import { ConversationStreamService } from './conversation-stream.service';

/** Roles the model accepts; persisted `tool` rows are excluded from the prompt. */
const PROMPT_ROLES = new Set<string>([
  AGENT_CONVERSATION_MESSAGE_ROLES.assistant,
  AGENT_CONVERSATION_MESSAGE_ROLES.system,
  AGENT_CONVERSATION_MESSAGE_ROLES.user,
]);

const toChatMessage = (
  message: AgentConversationMessage,
): ChatCompletionMessage => ({
  content: message.content,
  role:
    message.role === AGENT_CONVERSATION_MESSAGE_ROLES.assistant
      ? 'assistant'
      : message.role === AGENT_CONVERSATION_MESSAGE_ROLES.system
        ? 'system'
        : 'user',
});

const failed = (errorMessage: string): StartConversationStreamResult => {
  const result = new StartConversationStreamResult();
  result.assistantMessageId = null;
  result.conversationId = null;
  result.errorMessage = errorMessage;
  result.userMessageId = null;
  return result;
};

const resolveHumanUserId = (
  principal: AuthPrincipal | undefined,
): string | null =>
  principal?.kind === AUTH_PRINCIPAL_KIND_USER ? principal.sub : null;

// @authz-stance: authenticated-only (Path A — human JWT user)
@Resolver()
export class ConversationStreamResolver {
  constructor(
    private readonly conversations: AgentConversationsService,
    private readonly modelDiscovery: NestjsModelDiscoveryService,
    private readonly streamService: ConversationStreamService,
  ) {}

  @Mutation(() => StartConversationStreamResult, {
    description: `Start a streamed assistant turn against a discovered local model. Persists the user message, returns the assistant message id to correlate the in-flight stream, and emits token deltas over conversationStreamChunkAdded. Uses errorMessage for expected validation failures.`,
    name: 'startConversationStream',
  })
  async startConversationStream(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => StartConversationStreamInput })
    input: StartConversationStreamInput,
  ): Promise<StartConversationStreamResult> {
    const userId = resolveHumanUserId(principal);
    if (userId == null) {
      return failed('Human authentication required.');
    }

    const message = input.message?.trim() ?? '';
    if (!message) {
      return failed('Message is required.');
    }

    // SSRF guard: only stream to an endpoint+model the server actually discovered.
    const discovery = await this.modelDiscovery.discover();
    const endpoint = discovery.endpoints.find(
      (candidate) =>
        candidate.baseUrl === input.baseUrl &&
        candidate.models.includes(input.modelId),
    );
    if (!endpoint) {
      return failed(
        'Unknown model or endpoint. Pick a model from the discovered list.',
      );
    }

    const conversationId = await this.resolveConversationId(
      userId,
      input.conversationId,
      message,
    );
    if (conversationId == null) {
      return failed('Conversation not found.');
    }

    const [userMessage] = await this.conversations.appendMessages(
      userId,
      conversationId,
      [{ content: message, role: AGENT_CONVERSATION_MESSAGE_ROLES.user }],
    );

    const history = await this.conversations.listMessagesForConversation(
      userId,
      conversationId,
    );
    const messages = history
      .filter((row) => PROMPT_ROLES.has(row.role))
      .map(toChatMessage);

    const assistantMessageId = randomUUID();

    this.streamService.start({
      assistantMessageId,
      baseUrl: endpoint.baseUrl,
      conversationId,
      messages,
      model: input.modelId,
      provider: endpoint.provider,
      userId,
    });

    const result = new StartConversationStreamResult();
    result.assistantMessageId = assistantMessageId;
    result.conversationId = conversationId;
    result.errorMessage = null;
    result.userMessageId = userMessage?.id ?? null;
    return result;
  }

  @Mutation(() => Boolean, {
    description: `Abort an in-flight streamed turn for an owned conversation. Returns true when a stream was aborted.`,
    name: 'cancelConversationStream',
  })
  async cancelConversationStream(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('conversationId', { type: () => ID }) conversationId: string,
  ): Promise<boolean> {
    const userId = resolveHumanUserId(principal);
    if (userId == null) {
      return false;
    }

    try {
      await this.conversations.getConversationForUser(userId, conversationId);
    } catch {
      return false;
    }

    return this.streamService.cancel(conversationId);
  }

  /** Resolve an owned conversation id, or create a new one. Returns null when a given id is not owned. */
  private async resolveConversationId(
    userId: string,
    conversationId: string | null,
    message: string,
  ): Promise<string | null> {
    if (conversationId == null) {
      const created = await this.conversations.createConversation(userId, {
        title: message.slice(0, 80),
      });
      return created.id;
    }

    try {
      const existing = await this.conversations.getConversationForUser(
        userId,
        conversationId,
      );
      return existing.id;
    } catch {
      return null;
    }
  }
}
