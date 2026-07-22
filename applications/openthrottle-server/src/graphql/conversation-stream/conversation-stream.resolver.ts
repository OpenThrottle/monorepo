/**
 * @description Resolver for the conversation streaming surface. startConversationStream
 * validates the requested endpoint+model against discoverLocalModels (SSRF guard),
 * resolves-or-creates the conversation, persists the user message, allocates the
 * assistant message id, and kicks off the streaming service fire-and-forget.
 */

import { randomUUID } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  Args,
  Context,
  ID,
  Mutation,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
  CurrentUser,
  Public,
} from '@openthrottle/nestjs-auth';
import { NestjsModelDiscoveryService } from '@openthrottle/nestjs-model-discovery';
import {
  AGENT_CONVERSATION_MESSAGE_ROLES,
  type AgentConversationMessage,
  AgentConversationsService,
  CustomPromptsService,
  WorkspaceLocalRepositoriesService,
} from '@openthrottle/nestjs-repositories';
import {
  type ChatCompletionMessage,
  createCursorAgentSession,
} from '@openthrottle/openthrottle-agentic-utils';
import { StartConversationStreamInput } from './conversation-stream.input';
import {
  ConversationStreamChunkObject,
  StartConversationStreamResult,
} from './conversation-stream.object';
import { ConversationStreamService } from './conversation-stream.service';
import { type ConversationStreamChunkEnvelope } from './conversation-stream.types';

/**
 * Roles the model accepts; persisted `tool` rows are excluded from the prompt.
 */
const PROMPT_ROLES = new Set<string>([
  AGENT_CONVERSATION_MESSAGE_ROLES.assistant,
  AGENT_CONVERSATION_MESSAGE_ROLES.system,
  AGENT_CONVERSATION_MESSAGE_ROLES.user,
]);

const toChatMessage = (
  message: AgentConversationMessage,
): ChatCompletionMessage => {
  const { assistant, system } = AGENT_CONVERSATION_MESSAGE_ROLES;
  const isAssistant = message.role === assistant;
  const isSystem = message.role === system;

  return {
    content: message.content,
    role: isAssistant ? 'assistant' : isSystem ? 'system' : 'user',
  };
};

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

/**
 * Supported backends. CLI runners beyond cursor are not wired in v1.
 */
const OPENAI_BACKEND = 'openai';
const CURSOR_BACKEND = 'cursor';

/**
 * Env var holding a dev-only working directory for CLI backends. Honored ONLY
 * when NODE_ENV !== 'production' — the escape hatch is hard-disabled in prod so
 * a CLI backend there always requires a registered repository.
 */
const DEV_CWD_ENV = 'OPENTHROTTLE_AGENT_DEV_CWD';

/**
 * RFC-4122 UUID matcher: registry persona ids are UUIDs; mock composer ids are not.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Fallback persona → system-prompt map for the mock composer ids (pre-registry).
 */
const PERSONA_SYSTEM_PROMPTS: Record<string, string> = {
  architect: `You are the Architect. Analyze the request and propose a clear, minimal plan before making changes; prefer design clarity over speed.`,
  builder: `You are the Builder. Implement the requested change directly and pragmatically, matching the surrounding code style.`,
  reviewer: `You are the Reviewer. Critically review for correctness, security, and edge cases; call out risks explicitly.`,
};

/** Backend-specific run parameters resolved before the stream starts. */
interface ResolvedBackendRun {
  readonly baseUrl: string | null;
  readonly cwd: string | null;
  readonly model: string;
  readonly provider: string | null;
  readonly sessionId: string | null;
  readonly systemPrompt: string | null;
}

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

// @authz-stance: authenticated-only (Path A — human JWT user)
@Resolver()
export class ConversationStreamResolver {
  constructor(
    private readonly conversations: AgentConversationsService,
    private readonly customPrompts: CustomPromptsService,
    private readonly logger: LoggerService,
    private readonly modelDiscovery: NestjsModelDiscoveryService,
    private readonly repositories: WorkspaceLocalRepositoriesService,
    private readonly streamService: ConversationStreamService,
  ) {}

  // 🔌 graphql-ws only: connection auth (onConnect) validated the token and
  // stashed userId on the context; authorize from the connection identity here.
  @Public()
  @Subscription(() => ConversationStreamChunkObject, {
    description: `Live token stream for a conversation (topic conversation:<id>:stream). Requires an authenticated connection that owns the conversation.`,
  })
  async conversationStreamChunkAdded(
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @Context() context: { userId?: string },
  ): Promise<AsyncIterator<ConversationStreamChunkEnvelope>> {
    if (!context.userId) {
      throw new ForbiddenException(
        'A subscription requires an authenticated connection',
      );
    }

    // Ownership gate: throws when the conversation is not owned by the caller.
    await this.conversations.getConversationForUser(
      context.userId,
      conversationId,
    );

    // Replays any buffered chunks of the current turn before live deltas, so a
    // subscriber attaching after the stream started (the home route only knows
    // the conversation id once the start mutation returns) misses nothing.
    return this.streamService.subscribe(conversationId);
  }

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

    const backend = (input.backend ?? OPENAI_BACKEND).trim() || OPENAI_BACKEND;
    if (backend !== OPENAI_BACKEND && backend !== CURSOR_BACKEND) {
      return failed(`Unsupported backend: ${backend}.`);
    }

    const conversationId = await this.resolveConversationId(
      userId,
      input.conversationId ?? null,
      message,
    );

    if (conversationId == null) {
      return failed('Conversation not found.');
    }

    const resolved = await this.resolveBackendRun(
      backend,
      userId,
      conversationId,
      input,
    );

    if (typeof resolved === 'string') {
      return failed(resolved);
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
      backend,
      baseUrl: resolved.baseUrl,
      conversationId,
      cwd: resolved.cwd,
      messages,
      model: resolved.model,
      provider: resolved.provider,
      sessionId: resolved.sessionId,
      systemPrompt: resolved.systemPrompt,
      userId,
    });

    const result = new StartConversationStreamResult();

    result.assistantMessageId = assistantMessageId;
    result.conversationId = conversationId;
    result.errorMessage = null;
    result.userMessageId = userMessage?.id ?? null;

    return result;
  }

  /**
   * Validate + resolve backend-specific run parameters, or return an error
   * message string. openai validates the endpoint+model (SSRF guard); cursor
   * resolves a scoped working directory and mints/reuses a chat session.
   */
  private async resolveBackendRun(
    backend: string,
    userId: string,
    conversationId: string,
    input: StartConversationStreamInput,
  ): Promise<ResolvedBackendRun | string> {
    if (backend === OPENAI_BACKEND) {
      if (!input.baseUrl || !input.modelId) {
        return 'baseUrl and modelId are required for the openai backend.';
      }

      // SSRF guard: only stream to an endpoint+model the server discovered.
      const discovery = await this.modelDiscovery.discover();
      const endpoint = discovery.endpoints.find(
        (candidate) =>
          candidate.baseUrl === input.baseUrl &&
          candidate.models.includes(input.modelId ?? ''),
      );

      if (!endpoint) {
        return 'Unknown model or endpoint. Pick a model from the discovered list.';
      }

      return {
        baseUrl: endpoint.baseUrl,
        cwd: null,
        model: input.modelId,
        provider: endpoint.provider,
        sessionId: null,
        systemPrompt: null,
      };
    }

    // CLI backend (cursor): resolve a scoped cwd from a registered repository,
    // or — only in development, behind an env flag — a configured dev directory.
    let cwd: string | null = null;
    if (input.repositoryId != null && input.repositoryId !== '') {
      const repository = await this.repositories.findByIdForUser(
        input.repositoryId,
        userId,
      );

      if (!repository) {
        return 'Repository not found.';
      }
      cwd = repository.filesystemPath;
    } else if (!isProduction()) {
      const devCwd = process.env[DEV_CWD_ENV]?.trim();
      cwd = devCwd === undefined || devCwd === '' ? null : devCwd;
    }

    if (cwd == null) {
      return isProduction()
        ? 'A repository is required to run an agent CLI.'
        : `A repository is required to run an agent CLI (or set ${DEV_CWD_ENV} for local development).`;
    }

    // One OT conversation ↔ one cursor chat: reuse the persisted id, else mint.
    const conversation = await this.conversations.getConversationForUser(
      userId,
      conversationId,
    );

    const existingSessionId = conversation.metadata?.['cursorSessionId'];
    let sessionId: string;

    if (typeof existingSessionId === 'string' && existingSessionId !== '') {
      sessionId = existingSessionId;
    } else {
      try {
        sessionId = await createCursorAgentSession({ cwd });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `startConversationStream: cursor session start failed (cwd=${cwd}): ${message}`,
          ConversationStreamResolver.name,
        );
        return `Failed to start a cursor-agent session: ${message}`;
      }

      await this.conversations.updateMetadata(conversationId, {
        cursorRepositoryId: input.repositoryId ?? null,
        cursorSessionId: sessionId,
      });
    }

    const systemPrompt = await this.resolvePersonaSystemPrompt(
      input.personaId ?? null,
    );

    return {
      baseUrl: null,
      cwd,
      model: input.modelId ?? '',
      provider: CURSOR_BACKEND,
      sessionId,
      systemPrompt,
    };
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
    } catch (error: unknown) {
      this.logger.debug(
        `cancelConversationStream: ownership check failed for conversation ${conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ConversationStreamResolver.name,
      );

      return false;
    }

    return this.streamService.cancel(conversationId);
  }

  /**
   * Resolve a persona's system prompt: a registry persona (custom_prompts,
   * promptType=personas) by UUID id, else the hardcoded fallback map for the
   * mock composer ids. Null when no persona is selected or resolvable.
   */
  private async resolvePersonaSystemPrompt(
    personaId: string | null,
  ): Promise<string | null> {
    if (personaId == null || personaId === '') {
      return null;
    }

    if (UUID_RE.test(personaId)) {
      const persona = await this.customPrompts.getRepository().findOne({
        where: { id: personaId, promptType: 'personas' },
      });

      if (persona) {
        return persona.content;
      }
    }

    return PERSONA_SYSTEM_PROMPTS[personaId] ?? null;
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
    } catch (error: unknown) {
      this.logger.debug(
        `resolveConversationId: conversation ${conversationId} not owned by user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ConversationStreamResolver.name,
      );

      return null;
    }
  }
}
