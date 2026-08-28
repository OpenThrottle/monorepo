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
  type AgentConversationMessageRole,
  AgentCliPreferencesService,
  AgentConversationsService,
  CustomPromptsService,
  WorkspaceLocalRepositoriesService,
  buildManagedMcpServers,
} from '@openthrottle/nestjs-repositories';
import {
  AGENT_CLI_ALLOWLIST,
  type ChatCompletionMessage,
  type ConversationPermissionMode,
  type ConversationReasoningEffort,
  type ConversationServiceTier,
  maxDirectoriesForBackend,
  toContainerPath,
  toConversationPermissionMode,
  toConversationReasoningEffort,
  toConversationServiceTier,
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
 *
 * A deliberate subset, declared as `Record<AgentConversationMessageRole, boolean>`
 * so every role gets an explicit yes or no. Adding a role fails typecheck here
 * until someone decides whether the model should see it.
 */
const IS_PROMPT_ROLE: Record<AgentConversationMessageRole, boolean> = {
  [AGENT_CONVERSATION_MESSAGE_ROLES.assistant]: true,
  [AGENT_CONVERSATION_MESSAGE_ROLES.system]: true,
  [AGENT_CONVERSATION_MESSAGE_ROLES.tool]: false,
  [AGENT_CONVERSATION_MESSAGE_ROLES.user]: true,
};

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

/**
 * CLI backends that can be pointed at a discovered local OpenAI-compatible
 * endpoint (`supportsCustomBaseUrl` — opencode, codex, grok). Only these accept a
 * `baseUrl` on a CLI request; the rest (claude, cursor) reject it.
 */
const BASE_URL_CAPABLE_BACKENDS = new Set<string>(
  AGENT_CLI_ALLOWLIST.filter(
    (descriptor) => descriptor.supportsCustomBaseUrl,
  ).map((descriptor) => descriptor.backend),
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
  /**
   * Extra directories granted to a CLI beyond `cwd`, absolute + already
   * container-translated. Context only — the agent still runs in `cwd`.
   */
  readonly additionalDirectories: readonly string[];
  readonly baseUrl: string | null;
  readonly cwd: string | null;
  /** @-mentioned workspace-relative paths for structured context injection; empty when none. */
  readonly fileMentions: readonly string[];
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
  /** Reasoning effort forwarded to backends that expose one; null when unset. */
  readonly reasoning: ConversationReasoningEffort | null;
  /** True when the CLI backend should resume `sessionId` rather than create it (claude). */
  readonly resumeSession: boolean;
  /** Service tier forwarded to tier-aware backends (cursor); null when unset. */
  readonly serviceTier: ConversationServiceTier | null;
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
    private readonly agentPreferences: AgentCliPreferencesService,
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

    // Ownership gate. A persisted conversation is verified against the DB. A
    // Private-mode (persist=false) stream has NO row, so that check throws; fall
    // back to the stream service's ephemeral-owner registry, which records the
    // synthetic id ↔ owning user for the life of the stream. The synthetic id is
    // an unguessable UUID handed only to its owner by the start mutation, so this
    // stays strictly user-scoped. Any other failure (a real id the caller does
    // not own) still rejects.
    try {
      await this.conversations.getConversationForUser(
        context.userId,
        conversationId,
      );
    } catch (error: unknown) {
      if (
        !this.streamService.isEphemeralOwner(context.userId, conversationId)
      ) {
        throw error;
      }
    }

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

    // Per-user gate: a CLI backend the user disabled on /settings/agents cannot be
    // started (the openai HTTP path is not an agent CLI, so it is never gated).
    if (backend !== OPENAI_BACKEND) {
      if (!(await this.agentPreferences.isEnabled(userId, backend))) {
        return failed(
          `The ${backend} agent is disabled. Re-enable it on Settings › Setup to use it.`,
        );
      }

      // Per-model gate: when the run targets a specific model of an enabled agent,
      // a model the user disabled on /settings/agents cannot be started. Only a
      // KNOWN-but-disabled model is blocked — an unlisted model (or a local-endpoint
      // model) is never in the disabled set, so it passes through untouched.
      const model = input.modelId?.trim() ?? '';
      if (
        model !== '' &&
        !(await this.agentPreferences.isModelEnabled(userId, backend, model))
      ) {
        return failed(
          `The ${model} model is disabled. Re-enable it on Settings › Setup to use it.`,
        );
      }
    }

    // All four composer controls are now honored end-to-end: `permissionMode`,
    // `reasoning`, and `serviceTier` are narrowed to their transport unions in
    // `resolveBackendRun` and mapped to concrete per-backend flags/params inside
    // each backend's argv/request builder; the structured `fileMentions` list is
    // injected as genuine turn context (beyond the inline `@path` tokens already
    // in `input.message`). A backend that cannot route a given control ignores
    // it, and the capability descriptors advertise only what each backend honors.

    // Private mode (persist=false): stream ephemerally against a synthetic
    // conversation id — no conversation row is created, no messages are written.
    // The synthetic id still drives the `conversation:<id>:stream` topic + cancel,
    // and the stream service registers it in an owner map so the subscription's
    // ownership gate can authorize it without a DB row. Omitting `persist`
    // preserves today's persisted behavior exactly.
    const persist = input.persist ?? true;

    const conversationId = persist
      ? await this.resolveConversationId(
          userId,
          input.conversationId ?? null,
          message,
        )
      : randomUUID();

    if (conversationId == null) {
      return failed('Conversation not found.');
    }

    const resolved = await this.resolveBackendRun(
      backend,
      userId,
      conversationId,
      input,
      persist,
    );

    if (typeof resolved === 'string') {
      return failed(resolved);
    }

    // Persist the user message + rebuild history from storage only when
    // persisting. In Private mode there is no row: the turn runs with just this
    // message as context (single-turn), and no user message id is returned.
    let userMessageId: string | null = null;
    let messages: ChatCompletionMessage[];
    if (persist) {
      const [userMessage] = await this.conversations.appendMessages(
        userId,
        conversationId,
        [{ content: message, role: AGENT_CONVERSATION_MESSAGE_ROLES.user }],
      );
      userMessageId = userMessage?.id ?? null;

      const history = await this.conversations.listMessagesForConversation(
        userId,
        conversationId,
      );

      messages = history
        .filter((row) => IS_PROMPT_ROLE[row.role])
        .map(toChatMessage);
    } else {
      messages = [{ content: message, role: 'user' }];
    }

    const assistantMessageId = randomUUID();

    this.streamService.start({
      additionalDirectories: resolved.additionalDirectories,
      assistantMessageId,
      backend,
      baseUrl: resolved.baseUrl,
      conversationId,
      cwd: resolved.cwd,
      fileMentions: resolved.fileMentions,
      mcpEnv: resolved.mcpEnv,
      mcpServers: resolved.mcpServers,
      messages,
      model: resolved.model,
      permissionMode: resolved.permissionMode,
      persist,
      provider: resolved.provider,
      reasoning: resolved.reasoning,
      resumeSession: resolved.resumeSession,
      serviceTier: resolved.serviceTier,
      sessionId: resolved.sessionId,
      systemPrompt: resolved.systemPrompt,
      userId,
    });

    const result = new StartConversationStreamResult();

    result.assistantMessageId = assistantMessageId;
    result.conversationId = conversationId;
    result.errorMessage = null;
    result.userMessageId = userMessageId;

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
    persist: boolean,
  ): Promise<ResolvedBackendRun | string> {
    // Narrow the untrusted UI strings to their transport unions here (transport
    // guard); the backend adapters map them to concrete flags/params. Same
    // pattern as `permissionMode`. `fileMentions` is a structured path list —
    // trusted only as strings, resolved to real context inside the adapters.
    const reasoning = toConversationReasoningEffort(input.reasoning) ?? null;
    const serviceTier = toConversationServiceTier(input.serviceTier) ?? null;
    const fileMentions = input.fileMentions ?? [];

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
        additionalDirectories: [],
        baseUrl: endpoint.baseUrl,
        cwd: null,
        // openai has no filesystem, but it still benefits from the referenced
        // paths as prompt context.
        fileMentions,
        mcpEnv: null,
        mcpServers: null,
        model: input.modelId,
        permissionMode: null,
        provider: endpoint.provider,
        // Local endpoints honor reasoning best-effort; tier is a cloud-only
        // concept, so it is never routed here.
        reasoning,
        resumeSession: false,
        serviceTier: null,
        sessionId: null,
        systemPrompt: null,
      };
    }

    // Optional driver×endpoint targeting: a base-URL-capable CLI backend may run
    // against a discovered local endpoint. Validated up front (before any session
    // minting) with the same SSRF guard as the openai backend — baseUrl+model must
    // come from discovery; rejected for non-capable backends (claude/cursor).
    let cliBaseUrl: string | null = null;
    if (input.baseUrl != null && input.baseUrl !== '') {
      if (!BASE_URL_CAPABLE_BACKENDS.has(backend)) {
        return `The ${backend} backend cannot target a custom local endpoint.`;
      }
      if (!input.modelId) {
        return 'modelId is required when targeting a local endpoint.';
      }
      const discovery = await this.modelDiscovery.discover();
      const endpoint = discovery.endpoints.find(
        (candidate) =>
          candidate.baseUrl === input.baseUrl &&
          candidate.models.includes(input.modelId ?? ''),
      );
      if (!endpoint) {
        return 'Unknown model or endpoint. Pick a model from the discovered list.';
      }
      cliBaseUrl = endpoint.baseUrl;
    }

    // CLI backend (cursor | claude | opencode): resolve a scoped cwd from a
    // registered repository, or — only in development, behind an env flag — a
    // configured dev directory. Same gate for every CLI backend.
    // PRIMARY FIRST: index 0 becomes the cwd, the rest are additional granted
    // context directories. `repositoryIds` supersedes the deprecated single
    // `repositoryId`, which is still honored as a one-element list. Capped
    // server-side per driver — the client's cap is UX, this one is the boundary.
    const requestedRepositoryIds = (
      input.repositoryIds != null && input.repositoryIds.length > 0
        ? input.repositoryIds
        : [input.repositoryId]
    )
      .filter((id): id is string => typeof id === 'string' && id !== '')
      .slice(0, maxDirectoriesForBackend(backend));

    const primaryRepositoryId = requestedRepositoryIds[0] ?? null;

    let cwd: string | null = null;
    const additionalDirectories: string[] = [];
    if (requestedRepositoryIds.length > 0) {
      // Every id is ownership-checked independently — the client's array is
      // untrusted, and a secondary is granted to the agent just as a primary is.
      const resolvedRepositories = await Promise.all(
        requestedRepositoryIds.map((repositoryId) =>
          this.repositories.findByIdForUser(repositoryId, userId),
        ),
      );

      if (resolvedRepositories.some((repository) => !repository)) {
        return 'Repository not found.';
      }

      // The DB filesystemPath is host-truthful. Under a containerized server
      // with the workspace bridge active, translate to the in-container mount so
      // the spawn cwd (and the relative run-openthrottle-mcp.sh) resolve to a
      // path that exists. Identity (no-op) on host-run flows. Mirrors the editor
      // path (workspace-editor-config.service).
      const [primary, ...secondaries] = resolvedRepositories.map((repository) =>
        toContainerPath(repository?.filesystemPath ?? ''),
      );
      cwd = primary;
      additionalDirectories.push(...secondaries);
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
      // The PRIMARY id alone keys the CLI session, so swapping secondaries
      // mid-conversation does not fork a resumed session.
      primaryRepositoryId,
      persist,
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
    // Primary-only by design: an OT MCP server per secondary checkout is a
    // larger change with unclear value in v1.
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
      additionalDirectories,
      baseUrl: cliBaseUrl,
      cwd,
      fileMentions,
      mcpEnv,
      mcpServers: hasMcp ? managedMcp : null,
      model: input.modelId ?? '',
      // Narrow the untrusted UI string to a known mode here (transport guard);
      // the CLI adapters map it to concrete permission flags.
      permissionMode:
        toConversationPermissionMode(input.permissionMode) ?? null,
      provider: backend,
      reasoning,
      resumeSession: session.resumeSession,
      serviceTier,
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
    repositoryId: string | null,
    persist: boolean,
  ): Promise<{ resumeSession: boolean; sessionId: string | null } | string> {
    // Private mode (persist=false) has no conversation row: there is no metadata
    // to read a prior session from, and nothing to persist a new one to. Every
    // backend therefore runs a fresh, non-resumed ephemeral session per turn.
    if (persist) {
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
    }

    if (backend === CURSOR_BACKEND) {
      // Do NOT mint the cursor session here. `createCursorAgentSession` spawns
      // `cursor-agent create-chat` (~2s, up to 30s), and this runs inside the
      // awaited start mutation — blocking it presents as a dead composer with no
      // stream activity and no recovery (the client stall watchdog only arms once
      // it has the assistant id from the mutation result). Defer the mint to the
      // fire-and-forget stream (`ConversationStreamService.runStream`), which
      // mints before the first cursor spawn and persists the id. Mirror
      // opencode's shape: record the repository up front, return no session id
      // yet (the stream fills it in).
      if (persist) {
        await this.conversations.updateMetadata(conversationId, {
          [repositoryMetadataKey(backend)]: repositoryId,
        });
      }

      return { resumeSession: true, sessionId: null };
    }

    if (backend === CLAUDE_BACKEND) {
      // claude sets the id itself on turn one; we mint (+ persist when saving) the UUID.
      const sessionId = randomUUID();
      if (persist) {
        await this.conversations.updateMetadata(conversationId, {
          [repositoryMetadataKey(backend)]: repositoryId,
          [sessionMetadataKey(backend)]: sessionId,
        });
      }

      return { resumeSession: false, sessionId };
    }

    // opencode: no pre-mint. Run without a session id; when persisting, the
    // service records the id opencode surfaces so later turns can resume it.
    if (persist) {
      await this.conversations.updateMetadata(conversationId, {
        [repositoryMetadataKey(backend)]: repositoryId,
      });
    }

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
