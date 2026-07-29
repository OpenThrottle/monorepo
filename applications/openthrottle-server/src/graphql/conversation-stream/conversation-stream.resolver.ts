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
  buildManagedMcpServers,
} from '@openthrottle/nestjs-repositories';
import {
  AGENT_CLI_ALLOWLIST,
  type ChatCompletionMessage,
  type ConversationPermissionMode,
  createCursorAgentSession,
  toContainerPath,
  toConversationPermissionMode,
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
 * Supported backends. `openai` is the HTTP path; every CLI backend comes from
 * the shared discovery allowlist, restricted to the drivers with a wired
 * streaming chat adapter (`chatCapable` — claude, cursor, opencode, codex, grok).
 * Any remaining plan-run-only driver is discoverable but has no chat adapter, so
 * the stream resolver rejects it rather than routing to a backend that doesn't
 * exist. The allowlist derives from `chatStreaming`, which the drift guard keeps
 * in lockstep with the `CONVERSATION_CLI_BACKENDS` routing registry.
 */
const OPENAI_BACKEND = 'openai';
const CURSOR_BACKEND = 'cursor';
const CLAUDE_BACKEND = 'claude';
const CLI_BACKENDS = new Set<string>(
  AGENT_CLI_ALLOWLIST.filter((descriptor) => descriptor.chatCapable).map(
    (descriptor) => descriptor.backend,
  ),
);

/** Conversation-metadata key holding a backend's persisted session id. */
const sessionMetadataKey = (backend: string): string => `${backend}SessionId`;
/** Conversation-metadata key holding a backend's persisted repository id. */
const repositoryMetadataKey = (backend: string): string =>
  `${backend}RepositoryId`;

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
  /** Extra env the CLI child must pass through (OT MCP token + API URLs); null when no MCP is configured. */
  readonly mcpEnv: Readonly<Record<string, string>> | null;
  /** Managed MCP servers (canonical `.mcp.json` schema); null when none apply to this checkout. */
  readonly mcpServers: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  > | null;
  readonly model: string;
  /** Composer permission posture forwarded to CLI backends; null when unset. */
  readonly permissionMode: ConversationPermissionMode | null;
  readonly provider: string | null;
  /** True when the CLI backend should resume `sessionId` rather than create it (claude). */
  readonly resumeSession: boolean;
  readonly sessionId: string | null;
  readonly systemPrompt: string | null;
}

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * The base URL a spawned MCP server uses to reach this OpenThrottle server.
 * Mirrors `applyWorkspaceEditorConfiguration`'s apiBaseUrl resolution so the
 * chat and editor paths agree.
 */
const resolveApiBaseUrl = (): string => {
  const internal = process.env.API_URL_INTERNAL?.trim();
  if (internal !== undefined && internal !== '') {
    return internal;
  }
  const port = process.env.PORT?.trim();
  return `http://localhost:${port !== undefined && port !== '' ? port : '6021'}`;
};

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
    if (backend !== OPENAI_BACKEND && !CLI_BACKENDS.has(backend)) {
      return failed(`Unsupported backend: ${backend}.`);
    }

    // `permissionMode` IS now honored: it is threaded onto the resolved run and
    // resolved to concrete CLI permission flags inside each backend's argv/config
    // builder (see resolveBackendRun below). The remaining T3 composer controls
    // (reasoning effort, service tier) and the structured `fileMentions` list are
    // still nullable + additive and NOT yet honored — enforcing them stays with
    // the broader plan cacb864e (owned by the agent driver registry, dde67342).
    // The @-mentioned paths already reach a CLI agent as inline `@path` tokens in
    // `input.message`; `fileMentions` is for richer driver-side injection later.
    const fileMentionCount = input.fileMentions?.length ?? 0;
    if (
      input.reasoning != null ||
      input.serviceTier != null ||
      fileMentionCount > 0
    ) {
      this.logger.debug(
        `startConversationStream: control selections (not yet honored — see cacb864e/dde67342) reasoning=${
          input.reasoning ?? '∅'
        } serviceTier=${input.serviceTier ?? '∅'} fileMentions=${fileMentionCount}`,
        ConversationStreamResolver.name,
      );
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
      mcpEnv: resolved.mcpEnv,
      mcpServers: resolved.mcpServers,
      messages,
      model: resolved.model,
      permissionMode: resolved.permissionMode,
      provider: resolved.provider,
      resumeSession: resolved.resumeSession,
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
        mcpEnv: null,
        mcpServers: null,
        model: input.modelId,
        permissionMode: null,
        provider: endpoint.provider,
        resumeSession: false,
        sessionId: null,
        systemPrompt: null,
      };
    }

    // CLI backend (cursor | claude | opencode): resolve a scoped cwd from a
    // registered repository, or — only in development, behind an env flag — a
    // configured dev directory. Same gate for every CLI backend.
    let cwd: string | null = null;
    if (input.repositoryId != null && input.repositoryId !== '') {
      const repository = await this.repositories.findByIdForUser(
        input.repositoryId,
        userId,
      );

      if (!repository) {
        return 'Repository not found.';
      }
      // The DB filesystemPath is host-truthful. Under a containerized server with
      // the workspace bridge active, translate to the in-container mount so the
      // spawn cwd (and the relative run-openthrottle-mcp.sh) resolve to a path
      // that exists. Identity (no-op) on host-run flows. Mirrors the editor path
      // (workspace-editor-config.service).
      cwd = toContainerPath(repository.filesystemPath);
    } else if (!isProduction()) {
      const devCwd = process.env[DEV_CWD_ENV]?.trim();
      cwd = devCwd === undefined || devCwd === '' ? null : devCwd;
    }

    if (cwd == null) {
      return isProduction()
        ? 'A repository is required to run an agent CLI.'
        : `A repository is required to run an agent CLI (or set ${DEV_CWD_ENV} for local development).`;
    }

    const session = await this.resolveCliSession(
      backend,
      userId,
      conversationId,
      cwd,
      input.repositoryId ?? null,
    );

    if (typeof session === 'string') {
      return session;
    }

    const systemPrompt = await this.resolvePersonaSystemPrompt(
      input.personaId ?? null,
    );

    // Build the managed MCP config for this checkout (currently just the OT MCP
    // server, and only when scripts/run-openthrottle-mcp.sh exists — i.e. the OT
    // monorepo). Reuses the same builder the editor-config path uses so the two
    // agree. `mcpEnv` threads the token + API URLs the OT MCP needs; the server
    // sources the token from its own env (the run script self-sources from .env
    // as a fallback). Populated only when MCP applies, so a non-OT checkout adds
    // no config or env. Per-backend injection (argv/env) happens in the adapters.
    const apiBaseUrl = resolveApiBaseUrl();
    const managedMcp = buildManagedMcpServers({
      apiBaseUrl,
      repositoryRoot: cwd,
    });
    const hasMcp = Object.keys(managedMcp).length > 0;
    const mcpToken = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN?.trim();
    const mcpEnv: Record<string, string> | null = hasMcp
      ? {
          API_URL: apiBaseUrl,
          API_URL_INTERNAL: apiBaseUrl,
          ...(mcpToken !== undefined && mcpToken !== ''
            ? { OPENTHROTTLE_MCP_AUTH_TOKEN: mcpToken }
            : {}),
        }
      : null;

    return {
      baseUrl: null,
      cwd,
      mcpEnv,
      mcpServers: hasMcp ? managedMcp : null,
      model: input.modelId ?? '',
      // Narrow the untrusted UI string to a known mode here (transport guard);
      // the CLI adapters map it to concrete permission flags.
      permissionMode:
        toConversationPermissionMode(input.permissionMode) ?? null,
      provider: backend,
      resumeSession: session.resumeSession,
      sessionId: session.sessionId,
      systemPrompt,
    };
  }

  /**
   * Resolve the CLI session id + resume flag for a conversation, minting or
   * persisting as each backend requires. One OT conversation ↔ one CLI session,
   * keyed in `conversation.metadata` by backend:
   *
   * - **cursor**: pre-minted via `create-chat`; persisted and always resumed.
   * - **claude**: a UUID we mint up front; persisted, created with `--session-id`
   *   on the first turn (`resumeSession:false`) then resumed thereafter.
   * - **opencode**: minted by opencode on the first run (no id yet →
   *   `sessionId:null`); the `ConversationStreamService` persists the id it
   *   surfaces, and later turns resume it.
   *
   * Returns an error message string on failure (e.g. cursor session start).
   */
  private async resolveCliSession(
    backend: string,
    userId: string,
    conversationId: string,
    cwd: string,
    repositoryId: string | null,
  ): Promise<{ resumeSession: boolean; sessionId: string | null } | string> {
    const conversation = await this.conversations.getConversationForUser(
      userId,
      conversationId,
    );

    const persisted = conversation.metadata?.[sessionMetadataKey(backend)];
    const existingSessionId =
      typeof persisted === 'string' && persisted !== '' ? persisted : null;

    if (existingSessionId != null) {
      // Every backend resumes an already-known session id.
      return { resumeSession: true, sessionId: existingSessionId };
    }

    if (backend === CURSOR_BACKEND) {
      let sessionId: string;
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
        [repositoryMetadataKey(backend)]: repositoryId,
        [sessionMetadataKey(backend)]: sessionId,
      });

      return { resumeSession: true, sessionId };
    }

    if (backend === CLAUDE_BACKEND) {
      // claude sets the id itself on turn one; we mint + persist the UUID.
      const sessionId = randomUUID();
      await this.conversations.updateMetadata(conversationId, {
        [repositoryMetadataKey(backend)]: repositoryId,
        [sessionMetadataKey(backend)]: sessionId,
      });

      return { resumeSession: false, sessionId };
    }

    // opencode: no pre-mint. Run without a session id; the service persists the
    // id opencode surfaces in the stream so later turns can resume it.
    await this.conversations.updateMetadata(conversationId, {
      [repositoryMetadataKey(backend)]: repositoryId,
    });

    return { resumeSession: false, sessionId: null };
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
