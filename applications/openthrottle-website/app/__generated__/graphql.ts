/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any };
};

export type ActivityByDateInput = {
  /** Single date (YYYY-MM-DD). Provide exactly one of date or daysBack. */
  date?: InputMaybe<Scalars['String']['input']>;
  /** Last N days (1-365). Provide exactly one of date or daysBack. */
  daysBack?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type ActivityByDateRangeInput = {
  /** End of range (ISO 8601). */
  endIso: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Start of range (ISO 8601). */
  startIso: Scalars['String']['input'];
};

export type ActivityByDateResultObject = {
  __typename?: 'ActivityByDateResultObject';
  commits: Array<ActivityCommitRowObject>;
  /** True when limit/offset pagination has more items after this page. */
  hasNext: Scalars['Boolean']['output'];
  outputChunks: Array<ActivityOutputChunkRowObject>;
  tasksUpdated: Array<ActivityTaskUpdatedRowObject>;
  /** Total number of activity items in the date range (before pagination). */
  totalCount: Scalars['Int']['output'];
};

export type ActivityCommitRowObject = {
  __typename?: 'ActivityCommitRowObject';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  /** Resolved plan entity when planId is set */
  plan?: Maybe<PlanObject>;
  planId: Scalars['String']['output'];
  planTitle: Scalars['String']['output'];
  repo: Scalars['String']['output'];
  sha: Scalars['String']['output'];
  /** Resolved task entity when taskId is set */
  task?: Maybe<TaskObject>;
  taskId?: Maybe<Scalars['String']['output']>;
  taskTitle?: Maybe<Scalars['String']['output']>;
};

export type ActivityOutputChunkRowObject = {
  __typename?: 'ActivityOutputChunkRowObject';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  iteration?: Maybe<Scalars['Int']['output']>;
  /** Resolved plan entity when planId is set */
  plan?: Maybe<PlanObject>;
  planId: Scalars['String']['output'];
  planTitle: Scalars['String']['output'];
  /** Task this chunk is attributed to; null for plan-scoped chunks and historical rows. */
  taskId?: Maybe<Scalars['String']['output']>;
};

export type ActivityTaskUpdatedRowObject = {
  __typename?: 'ActivityTaskUpdatedRowObject';
  id: Scalars['String']['output'];
  /** Resolved plan entity when planId is set */
  plan?: Maybe<PlanObject>;
  planId: Scalars['String']['output'];
  planTitle: Scalars['String']['output'];
  status: Scalars['String']['output'];
  /** Resolved task entity (id is the task id) */
  task?: Maybe<TaskObject>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type AddHookInput = {
  /** Anchor task the hook attaches to (task-level before/after). Omit or null for a plan-level hook (beforeAll/afterAll, or beforeEach/afterEach with scope 'each'). */
  anchorTaskId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional hook task description (template source). */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Plan the hook belongs to */
  planId: Scalars['ID']['input'];
  /** Hook role: 'before' or 'after'. */
  role: Scalars['String']['input'];
  /** Plan-level only: 'once' (beforeAll/afterAll) or 'each' (beforeEach/afterEach, expanded onto every task). Defaults to 'once'. Rejected for task-level hooks. */
  scope?: InputMaybe<Scalars['String']['input']>;
  /** Skill slug when source is 'skill'; required in that case. */
  skillSlug?: InputMaybe<Scalars['String']['input']>;
  /** Hook body source: 'template' (inline title/description) or 'skill' (runs skillSlug via the hooks runner). */
  source: Scalars['String']['input'];
  /** Optional hook task title (template source). Defaults to a generated label. */
  title?: InputMaybe<Scalars['String']['input']>;
};

export type AddPermissionToRoleInput = {
  /** Permission id to add */
  permissionId: Scalars['ID']['input'];
  /** Role id to add the permission to */
  roleId: Scalars['ID']['input'];
};

export type AddPlanTagInput = {
  /** Plan to tag. */
  planId: Scalars['ID']['input'];
  /** Kebab-case tag slug from the caller's skill-tag vocabulary. */
  tag: Scalars['String']['input'];
};

export type AddProjectSkillTagInput = {
  /** Project whose skill row to tag. Omit to target the dogfood monorepo project. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** Skill slug (project_skills.slug). */
  slug: Scalars['String']['input'];
  /** Kebab-case domain tag from the caller's skill-tag vocabulary. Phase tags are rejected. */
  tag: Scalars['String']['input'];
};

export type AddProjectTagInput = {
  /** Project to tag. */
  projectId: Scalars['ID']['input'];
  /** Kebab-case tag slug from the caller's skill-tag vocabulary. */
  tag: Scalars['String']['input'];
};

export type AddSkillTagInput = {
  /** Vocabulary axis for the tag: "domain" (default) or "phase". */
  dimension?: InputMaybe<Scalars['String']['input']>;
  /** Kebab-case tag slug to add (e.g. "pr-review"). */
  tag: Scalars['String']['input'];
};

export type AddTaskTagInput = {
  /** Kebab-case tag slug from the caller's skill-tag vocabulary. */
  tag: Scalars['String']['input'];
  /** Task to tag. */
  taskId: Scalars['ID']['input'];
};

/** Register a server-host folder as a workspace checkout. */
export type AddWorkspaceFolderInput = {
  /** Optional display name; defaults to the folder name. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Absolute path on the server host. */
  path: Scalars['String']['input'];
};

/** Result of the addWorkspaceFolder gesture: the resolved repository, the created or relinked checkout, and the linked project when one exists. */
export type AddWorkspaceFolderPayloadObject = {
  __typename?: 'AddWorkspaceFolderPayloadObject';
  checkout: RepositoryCheckoutObject;
  /** Project linked at the repository level, when present. */
  project?: Maybe<ProjectObject>;
  /** True when the project was auto-created by this call (new repository); false when an existing link was inherited. */
  projectCreated: Scalars['Boolean']['output'];
  reconciliation: WorkspaceFolderReconciliation;
  repository: RepositoryObject;
};

/** A ranked agent-asset match from semantic search over custom_prompt embeddings. */
export type AgentAssetChunk = {
  __typename?: 'AgentAssetChunk';
  /** Matched embedding chunk content. */
  content: Scalars['String']['output'];
  /** Parent custom_prompt UUID. */
  customPromptId: Scalars['String']['output'];
  /** Asset description / summary. */
  description?: Maybe<Scalars['String']['output']>;
  /** Repo-relative file path on disk (SSOT), if known. */
  filePath?: Maybe<Scalars['String']['output']>;
  /** Embedding chunk UUID (custom_prompt_embeddings id). */
  id: Scalars['String']['output'];
  /** Asset labels. */
  labels: Array<Scalars['String']['output']>;
  /** Owning project id, if scoped. */
  projectId?: Maybe<Scalars['String']['output']>;
  /** Prompt type (skills, rules, personas, …). */
  promptType: CustomPromptType;
  /** Cosine similarity (0–1, higher is more relevant). */
  similarity: Scalars['Float']['output'];
  /** Asset title. */
  title: Scalars['String']['output'];
};

/** Input for semantic search over agent-asset (custom_prompt) embeddings. */
export type AgentAssetSearchInput = {
  /** Max number of assets to return (default 20, max 50). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Filter by project id (multi-repo scoping). */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by prompt types (default: skills, rules, personas). Empty/null uses the default set. */
  promptTypes?: InputMaybe<Array<CustomPromptType>>;
  /** Text query to embed and search by vector similarity. */
  query: Scalars['String']['input'];
};

/** Result wrapper for agent-asset semantic search. */
export type AgentAssetSearchResult = {
  __typename?: 'AgentAssetSearchResult';
  /** Ranked agent-asset matches by similarity. */
  chunks: Array<AgentAssetChunk>;
};

export type AgentCliAuthStateObject = {
  __typename?: 'AgentCliAuthStateObject';
  /** Short explanation of the state (e.g. the account or the credential source), or null. No credential contents are read. */
  detail?: Maybe<Scalars['String']['output']>;
  /** "authenticated", "unauthenticated", or "unknown" (the backend is not probed). */
  status: Scalars['String']['output'];
};

export type AgentCliAuthStatusObject = {
  __typename?: 'AgentCliAuthStatusObject';
  /** Logged-in account email as reported by `claude auth status`, or null when unknown. No tokens or credential files are read. */
  accountEmail?: Maybe<Scalars['String']['output']>;
  /** The credential Claude runs will actually bill: "subscription" (claude.ai login), "apiKey" (ANTHROPIC_API_KEY or a configured key source — it always wins in -p mode), or "none". Derived from `claude auth status` plus the presence (never the value) of ANTHROPIC_API_KEY in the server env. */
  activeCredential: Scalars['String']['output'];
  /** True when an API key is active while a subscription login also exists, so runs bill the API key instead of the subscription. */
  apiKeyOverridesSubscription: Scalars['Boolean']['output'];
  /** Login method as reported by `claude auth status` (e.g. "claude.ai"), or null when unknown. */
  authMethod?: Maybe<Scalars['String']['output']>;
  /** True when `claude auth status` reports a logged-in account. */
  loggedIn: Scalars['Boolean']['output'];
  /** Organization name as reported by `claude auth status`, or null when unknown. */
  organizationName?: Maybe<Scalars['String']['output']>;
  /** Subscription plan (e.g. "pro", "max", "team") as reported by `claude auth status`, or null when unknown. */
  subscriptionType?: Maybe<Scalars['String']['output']>;
  /** A loud, specific sentence when the credential setup needs attention (API key overriding the subscription, or not logged in); null when everything is fine. */
  warning?: Maybe<Scalars['String']['output']>;
};

export type AgentCliModelOption = {
  __typename?: 'AgentCliModelOption';
  /** Effective per-user enablement of this model: false when the user disabled this model OR disabled the whole agent (an agent-level OFF hard-overrides every model). Disabled models are hidden from chat/model pickers and rejected when starting new runs. Defaults to true for an unauthenticated request. */
  enabled: Scalars['Boolean']['output'];
  /** Whether the current user has favorited this model. Favorites float to the top of / are highlighted in chat/model pickers and run selection; favoriting is orthogonal to enablement. Defaults to false for an unauthenticated request. */
  favorite: Scalars['Boolean']['output'];
  /** Opaque driver-supplied model id as returned by discoverAgentClis (e.g. "gpt-5.2"). */
  model: Scalars['String']['output'];
};

export type AgentCliOptionObject = {
  __typename?: 'AgentCliOptionObject';
  /** True when this CLI resolves the workspace's committed MCP config (.mcp.json / .cursor/mcp.json / opencode.json), so a run in this checkout can reach openthrottle-mcp. False for antigravity and codex, which read only their own config scope (antigravity: ~/.gemini/config/mcp_config.json; codex: user-scope config.toml; never .mcp.json) — for those, MCP reachability is a property of the host and cannot be verified from the workspace, so present it as unverifiable rather than as definitely missing. Distinct from emitting MCP flags: claude, grok, and opencode emit none yet attach fine. */
  attachesWorkspaceMcp: Scalars['Boolean']['output'];
  /** Logged-in account, subscription plan and active credential, reported by `claude auth status --json` (no OAuth tokens or credential files are read, and no Anthropic endpoint is called). Null for CLIs other than claude, or when the probe failed or timed out. */
  auth?: Maybe<AgentCliAuthStatusObject>;
  /** Generic login state for this backend: probed for claude and cursor (no credential contents are read); "unknown" for the rest. */
  authState: AgentCliAuthStateObject;
  /** Backend discriminator (e.g. "cursor") used in StartConversationStreamInput. */
  backend: Scalars['String']['output'];
  /** Behavioral capabilities of this backend's chat path (resume, approvals, steering, image input, MCP injection, full-history replay). Reflects OPENTHROTTLE_CHAT_ACP_BACKENDS. Read these instead of branching on the backend name. */
  capabilities: ChatBackendCapabilitiesObject;
  /** True when this driver has a wired streaming chat backend and can be offered as a chat composer backend (false for plan-run-only drivers like codex/grok). */
  chatCapable: Scalars['Boolean']['output'];
  /** Per-user enablement: true unless the current user has disabled this agent on /settings/agents. A disabled agent is hidden from chat/model pickers and rejected when starting new runs. Defaults to true for an unauthenticated request. */
  enabled: Scalars['Boolean']['output'];
  /** Human-readable label for the selector. */
  label: Scalars['String']['output'];
  /** Models this CLI can run, each with the current user's per-model enabled + favorite state overlaid. Empty when the CLI exposes no machine-listable models. Prefer this over the deprecated `models` list. */
  modelOptions: Array<AgentCliModelOption>;
  /**
   * Models this CLI can run (empty when the CLI exposes no machine-listable models or listing failed). Returns ALL discovered model ids, unfiltered by per-user preferences.
   * @deprecated Use modelOptions, which carries per-user enabled + favorite state per model.
   */
  models: Array<Scalars['String']['output']>;
  /** True when this driver can be pointed at a custom OpenAI-compatible base URL (a discovered local endpoint); gates driver×endpoint targeting in the composer. False for claude/cursor (own cloud wire protocol). */
  supportsCustomBaseUrl: Scalars['Boolean']['output'];
  /** Trimmed --version output, or null when unknown. */
  version?: Maybe<Scalars['String']['output']>;
};

export type AgentCliSetupConfigObject = {
  __typename?: 'AgentCliSetupConfigObject';
  /** True when the current user may run installs/updates (has the SETTINGS_WRITE permission). The UI disables the controls when false. */
  canManage: Scalars['Boolean']['output'];
  /** True when server-side install/update is enabled (OT_AGENT_CLI_INSTALL_ENABLED). Default-off; the UI explains disabled controls when false. */
  installEnabled: Scalars['Boolean']['output'];
};

export type AgentConversationMessageObject = {
  __typename?: 'AgentConversationMessageObject';
  content: Scalars['String']['output'];
  conversationId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  /** Message role: user, assistant, system, or tool */
  role: Scalars['String']['output'];
  /** Router confidence on assistant rows */
  routingConfidence?: Maybe<Scalars['Float']['output']>;
  /** Router model on assistant rows */
  routingModel?: Maybe<Scalars['String']['output']>;
  /** Router reason on assistant rows */
  routingReason?: Maybe<Scalars['String']['output']>;
  /** Router tier on assistant rows */
  routingTier?: Maybe<Scalars['String']['output']>;
  /** Monotonic order within the conversation (user+assistant consecutive per turn) */
  sortOrder: Scalars['Int']['output'];
  /** JSON string of tool metadata on assistant rows */
  toolMetadataJson?: Maybe<Scalars['String']['output']>;
};

export type AgentConversationObject = {
  __typename?: 'AgentConversationObject';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  /** JSON string of optional conversation metadata object */
  metadataJson?: Maybe<Scalars['String']['output']>;
  /** Last router LLM model name when heuristic-only routing was not used */
  modelName?: Maybe<Scalars['String']['output']>;
  /** Last router LLM provider when heuristic-only routing was not used */
  modelProvider?: Maybe<Scalars['String']['output']>;
  /** Optional linked plan UUID */
  planId?: Maybe<Scalars['String']['output']>;
  /** Optional linked project UUID */
  projectId?: Maybe<Scalars['String']['output']>;
  /** Conversation lifecycle: active or archived (no hard delete in v1) */
  status: Scalars['String']['output'];
  /** Display title; auto-set from first user message when omitted on create */
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
};

export type AgentSetupStreamChunkObject = {
  __typename?: 'AgentSetupStreamChunkObject';
  /** Incremental stdout/stderr text for this chunk (empty on the terminal chunk). */
  data: Scalars['String']['output'];
  /** True exactly once, on the terminal chunk of the run. */
  done: Scalars['Boolean']['output'];
  /** Executor failure classifier when the run failed; null otherwise. */
  error?: Maybe<Scalars['String']['output']>;
  /** Child exit code on the terminal chunk; null while running or when killed by signal. */
  exitCode?: Maybe<Scalars['Int']['output']>;
  /** Unique id for this chunk (subscription dedupe / cursor). */
  id: Scalars['String']['output'];
  /** The install/update run id these chunks belong to. */
  runId: Scalars['String']['output'];
  /** Monotonic index within the run. */
  sortOrder: Scalars['Int']['output'];
  /** Which stream the text came from: stdout | stderr. */
  stream: Scalars['String']['output'];
};

/** One ATIF trajectory recorded for a plan run: the structured record of what an agent did, plus summary columns derived from it. */
export type AgentTrajectory = {
  __typename?: 'AgentTrajectory';
  /** UTF-8 byte length of the stored trajectory JSON, after any server-side capping. */
  byteSize: Scalars['Int']['output'];
  /** Cached prompt tokens (included in inputTokens). Null when the run reported none. */
  cachedTokens?: Maybe<Scalars['Int']['output']>;
  /** Cost of the run in USD. Null when unpriceable, which is not the same as zero. */
  costUsd?: Maybe<Scalars['Float']['output']>;
  /** When the trajectory was recorded. */
  createdAt: Scalars['DateTime']['output'];
  /** Agent driver that produced the run, for example claude. */
  driver: Scalars['String']['output'];
  /** Wall-clock duration of the run in milliseconds. Null when unknown. */
  durationMs?: Maybe<Scalars['Int']['output']>;
  /** Process exit code of the run. Null when unknown. */
  exitCode?: Maybe<Scalars['Int']['output']>;
  /** Trajectory id. */
  id: Scalars['ID']['output'];
  /** Idempotency key the trajectory was recorded under. Null when recorded without one. */
  idempotencyKey?: Maybe<Scalars['String']['output']>;
  /** True when the run ended before it could finish, so the trajectory is partial. */
  incomplete: Scalars['Boolean']['output'];
  /** Prompt tokens consumed, including cached tokens. Null when the run reported none. */
  inputTokens?: Maybe<Scalars['Int']['output']>;
  /** Model that ran, when known. */
  model?: Maybe<Scalars['String']['output']>;
  /** Free-form result label for the run, for example completed. Null when unknown. */
  outcome?: Maybe<Scalars['String']['output']>;
  /** Completion tokens produced. Null when the run reported none. */
  outputTokens?: Maybe<Scalars['Int']['output']>;
  /** Plan run the trajectory belongs to. */
  planRunId: Scalars['ID']['output'];
  /** ATIF schema version of the stored document, for example ATIF-v1.8. */
  schemaVersion: Scalars['String']['output'];
  /** How the trajectory was captured: spawned by the OpenThrottle runner, or session_upload from an interactive session. */
  source: Scalars['String']['output'];
  /** Task the run worked on. Null for a run not scoped to one task. */
  taskId?: Maybe<Scalars['ID']['output']>;
  /** Number of tool calls across all steps. */
  toolCallCount: Scalars['Int']['output'];
  /** The stored ATIF document serialized with JSON.stringify. */
  trajectoryJson: Scalars['String']['output'];
  /** True when the server elided observation content to fit the size caps. */
  truncated: Scalars['Boolean']['output'];
};

/** One rater's verdict on one agent trajectory. Verdicts are the ground truth LLM judges are calibrated against; notes and failure types are error-analysis coding material. */
export type AgentTrajectoryLabel = {
  __typename?: 'AgentTrajectoryLabel';
  /** When the rater first labelled the trajectory. */
  createdAt: Scalars['DateTime']['output'];
  /** Free-text failure category. Null when not given. */
  failureType?: Maybe<Scalars['String']['output']>;
  /** Label id. */
  id: Scalars['ID']['output'];
  /** Free-text observation about the trajectory. Null when not given. */
  note?: Maybe<Scalars['String']['output']>;
  /** Who recorded the label: the GitHub username of the caller, stamped server-side. */
  rater: Scalars['String']['output'];
  /** Trajectory the label is about. */
  trajectoryId: Scalars['ID']['output'];
  /** When the rater last replaced their label. */
  updatedAt: Scalars['DateTime']['output'];
  /** The rater's judgement: pass or fail. */
  verdict: Scalars['String']['output'];
};

export type AgentsChatTurnResult = {
  __typename?: 'AgentsChatTurnResult';
  /** Assistant-visible reply text. Null when the turn failed (see errorMessage). */
  assistantText?: Maybe<Scalars['String']['output']>;
  /** Echo of the client conversation id from the request input when provided; null when omitted. */
  conversationId?: Maybe<Scalars['String']['output']>;
  /** Validation or business-rule error for this turn (no throw). Null when the turn succeeded. */
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** MCP developer tool name selected for this turn (e.g. semantic_search, health). Null when the turn failed before routing (e.g. empty message). */
  mcpTool?: Maybe<Scalars['String']['output']>;
  /** True when routed write tools are not permitted unless AGENTS_CHAT_ALLOW_MUTATIONS is enabled on the server (default read-only policy). */
  readOnlyAgentsChat: Scalars['Boolean']['output'];
  /** Router confidence in [0, 1] for the selected tool; null when the turn failed before routing. */
  routingConfidence?: Maybe<Scalars['Float']['output']>;
  /** Router reason label (e.g. heuristic name or llm_fallback:…); null when the turn failed before routing. */
  routingReason?: Maybe<Scalars['String']['output']>;
  /** JSON-encoded MCP structuredContent from the tool result when present on a successful tool call; null otherwise. */
  structuredPayloadJson?: Maybe<Scalars['String']['output']>;
  /** JSON-encoded tool envelope: tool name, arguments, optional confidence and routeReason, optional structuredContent, and isError when the MCP tool reported failure. */
  toolMetadataJson?: Maybe<Scalars['String']['output']>;
};

export type AgentsRunChatTurnInput = {
  /** Opaque client thread id echoed on AgentsChatTurnResult.conversationId for correlation; omit for stateless turns. */
  conversationId?: InputMaybe<Scalars['String']['input']>;
  /** User message text for this turn. */
  message: Scalars['String']['input'];
  /** When true, persist the turn for an authenticated human JWT user. Omitted or false keeps stateless echo behavior. */
  persist?: InputMaybe<Scalars['Boolean']['input']>;
};

export type AppendPlanOutputInput = {
  /** Content of the output chunk */
  content: Scalars['String']['input'];
  /** Optional iteration number for the output chunk */
  iteration?: InputMaybe<Scalars['Int']['input']>;
  /** Plan id to append output to */
  planId: Scalars['ID']['input'];
  /** Optional task id to attribute this output chunk to (task-scoped output). Omit for plan-scoped chunks. */
  taskId?: InputMaybe<Scalars['ID']['input']>;
};

/** Optional filter: apply only to these local repository ids. Omit to apply to all linked repos. */
export type ApplyWorkspaceEditorConfigurationInput = {
  /** When set, only these repositories receive editor configuration. */
  repositoryIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Aggregate result of applying workspace editor configuration. */
export type ApplyWorkspaceEditorConfigurationResultObject = {
  __typename?: 'ApplyWorkspaceEditorConfigurationResultObject';
  applications: Array<WorkspaceEditorConfigApplicationObject>;
};

export type ArchiveAgentConversationInput = {
  conversationId: Scalars['ID']['input'];
};

/** The archived post, or BlogPostNotFoundError. */
export type ArchiveBlogPostResult = BlogPostAdminObject | BlogPostNotFoundError;

export type AssignRoleToServiceAccountInput = {
  roleId: Scalars['ID']['input'];
  serviceAccountId: Scalars['ID']['input'];
};

export type AssignRoleToUserInput = {
  /** Role id to assign */
  roleId: Scalars['ID']['input'];
  /** User id to assign the role to */
  userId: Scalars['ID']['input'];
};

export type AttachWorkSessionSubjectInput = {
  /** Subject plan */
  planId: Scalars['ID']['input'];
  /** Session to attach the subject to */
  sessionId: Scalars['ID']['input'];
  /** Subject task (task-level subject); omit for plan-level */
  taskId?: InputMaybe<Scalars['ID']['input']>;
};

export type BlogAdminPostListResult = {
  __typename?: 'BlogAdminPostListResult';
  /** Opaque cursor of the last item; pass as `after` to fetch the next page. Null when the page is empty. */
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<BlogPostAdminObject>;
};

/** The post in any state, or BlogPostNotFoundError. */
export type BlogAdminPostResult = BlogPostAdminObject | BlogPostNotFoundError;

export type BlogAuthorObject = {
  __typename?: 'BlogAuthorObject';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  displayName: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type BlogCoverAltRequiredError = {
  __typename?: 'BlogCoverAltRequiredError';
  /** Human-readable explanation. */
  message: Scalars['String']['output'];
};

export type BlogPostAdminObject = {
  __typename?: 'BlogPostAdminObject';
  author?: Maybe<BlogAuthorObject>;
  bodyMarkdown: Scalars['String']['output'];
  coverImageAlt?: Maybe<Scalars['String']['output']>;
  coverImageUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  excerpt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Who made the most recent write: a user's name or a service account's name. Null for posts last written before this was recorded. */
  lastEditedBy?: Maybe<Scalars['String']['output']>;
  /** When the post goes (or went) live. Null for drafts. A PUBLISHED post with a value in the future is scheduled and not yet publicly visible. */
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  seoDescription?: Maybe<Scalars['String']['output']>;
  seoTitle?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  /** Derived lifecycle state (DRAFT, SCHEDULED, LIVE, ARCHIVED), computed when the response is built from status and publishedAt. */
  state: BlogPostState;
  status: BlogPostStatus;
  tags: Array<BlogTagObject>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type BlogPostListResult = {
  __typename?: 'BlogPostListResult';
  /** Opaque cursor of the last item; pass as `after` to fetch the next page. Null when the page is empty. */
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<BlogPostObject>;
};

export type BlogPostNotFoundError = {
  __typename?: 'BlogPostNotFoundError';
  /** Human-readable explanation. */
  message: Scalars['String']['output'];
};

export type BlogPostObject = {
  __typename?: 'BlogPostObject';
  author?: Maybe<BlogAuthorObject>;
  bodyMarkdown: Scalars['String']['output'];
  coverImageAlt?: Maybe<Scalars['String']['output']>;
  coverImageUrl?: Maybe<Scalars['String']['output']>;
  excerpt?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Estimated reading time in whole minutes (~200 words per minute, minimum 1) */
  readingTimeMinutes: Scalars['Int']['output'];
  seoDescription?: Maybe<Scalars['String']['output']>;
  seoTitle?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  tags: Array<BlogTagObject>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type BlogPostPublishPermissionRequiredError = {
  __typename?: 'BlogPostPublishPermissionRequiredError';
  /** Human-readable explanation. */
  message: Scalars['String']['output'];
};

export type BlogPostStaleWriteError = {
  __typename?: 'BlogPostStaleWriteError';
  /** The post's updatedAt now; the value to send as expectedUpdatedAt after reloading. */
  currentUpdatedAt: Scalars['DateTime']['output'];
  /** Human-readable explanation. */
  message: Scalars['String']['output'];
};

/** Derived lifecycle state of a blog post as the authoring surface shows it. LIVE is the only publicly visible state; SCHEDULED is PUBLISHED with a future publishedAt. */
export const BlogPostState = {
  Archived: 'ARCHIVED',
  Draft: 'DRAFT',
  Live: 'LIVE',
  Scheduled: 'SCHEDULED',
} as const;

export type BlogPostState = (typeof BlogPostState)[keyof typeof BlogPostState];
/** Lifecycle of a blog post. Only PUBLISHED posts whose publishedAt has passed are publicly visible; a PUBLISHED post with a future publishedAt is scheduled. */
export const BlogPostStatus = {
  Archived: 'ARCHIVED',
  Draft: 'DRAFT',
  Published: 'PUBLISHED',
} as const;

export type BlogPostStatus =
  (typeof BlogPostStatus)[keyof typeof BlogPostStatus];
/** The kind of record a blog write referenced by slug that does not exist. */
export const BlogReferenceEntity = {
  Author: 'AUTHOR',
  Tag: 'TAG',
} as const;

export type BlogReferenceEntity =
  (typeof BlogReferenceEntity)[keyof typeof BlogReferenceEntity];
export type BlogReferenceNotFoundError = {
  __typename?: 'BlogReferenceNotFoundError';
  /** Which kind of record was not found. */
  entity: BlogReferenceEntity;
  /** The slug that was not found. */
  key: Scalars['String']['output'];
  /** Human-readable explanation. */
  message: Scalars['String']['output'];
};

export type BlogSlugConflictError = {
  __typename?: 'BlogSlugConflictError';
  /** Human-readable explanation. */
  message: Scalars['String']['output'];
  /** The slug that is already taken. */
  slug: Scalars['String']['output'];
};

export type BlogTagObject = {
  __typename?: 'BlogTagObject';
  description?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

/** A subdirectory listed by browseDirectory (server-host path). */
export type BrowseDirectoryEntryObject = {
  __typename?: 'BrowseDirectoryEntryObject';
  /** True when this subdirectory is already registered as a checkout (matched by path or OT manifest checkout id). */
  alreadyRegistered: Scalars['Boolean']['output'];
  /** True when this subdirectory contains a .git entry (looks like a git repository). */
  isGitRepo: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** Absolute path on the server host. */
  path: Scalars['String']['output'];
};

export type CalibrateJudgeForRunInput = {
  /** Id of the judge grader to calibrate. */
  graderId: Scalars['String']['input'];
  /** Version of the judge grader to calibrate. */
  graderVersion: Scalars['String']['input'];
  /** True when calibrating the held-out judge. Defaults to false. */
  heldOut?: Scalars['Boolean']['input'];
  /** Run whose judge grades are calibrated. */
  runId: Scalars['ID']['input'];
  /** Only use trials whose case is in this split: dev or test. Omit for every trial. */
  split?: InputMaybe<Scalars['String']['input']>;
};

/** The recorded calibration of a judge over one run, with the trials that could not be paired. */
export type CalibrateJudgeForRunResult = {
  __typename?: 'CalibrateJudgeForRunResult';
  /** The calibration that was computed and recorded. */
  calibration: EvalJudgeCalibration;
  /** Graded trials left out because their human raters disagreed with each other. */
  nConflicted: Scalars['Int']['output'];
  /** Graded trials left out because they have no trajectory or no human label. */
  nUnlabeled: Scalars['Int']['output'];
};

export type CancelPlanRunInput = {
  /** Plan id whose in-queue run-plan (Ralph) job should be cancelled */
  planId: Scalars['ID']['input'];
  /** Optional plan_runs id of a SCHEDULED run of this plan. When set, cancels only that run: its delayed job is removed and its row settles CANCELLED, with no effect on any other active run or the tasks; a SCHEDULED plan returns to PENDING. Already-settled runs are a no-op; a run that is QUEUED or IN_PROGRESS is rejected (omit planRunId to stop a live run). When omitted, the whole plan is cancelled as before. */
  planRunId?: InputMaybe<Scalars['ID']['input']>;
};

export type CancelPlanRunResultObject = {
  __typename?: 'CancelPlanRunResultObject';
  /** BullMQ job ids that were active (locked by a worker) and could not be removed from the queue. When "signaledActiveRunToStop" is true, the worker was asked to terminate the Ralph child for this plan. */
  activeJobIdsCouldNotCancel: Array<Scalars['String']['output']>;
  /** True when a durable cancel marker was stamped on a live run (the cross-process/host/CLI guarantee). The run stops at its next iteration boundary even if the low-latency pub/sub signal was missed. */
  cancelRequested: Scalars['Boolean']['output'];
  /** True when no run-plan job for this plan existed in waiting, delayed, paused, active, or prioritized state. */
  noMatchingJob: Scalars['Boolean']['output'];
  /** Machine-readable primary outcome for UI messaging: RUN_CANCELLED (queued job removed), RUN_STOPPING (active run signaled to stop), CANCELLATION_REQUESTED (durable cancel requested; stops at next checkpoint), or NO_ACTIVE_RUN (nothing to cancel). */
  outcome: Scalars['String']['output'];
  /** Plan id from the request. */
  planId: Scalars['String']['output'];
  /** Plan status after cancel when a queued job was removed or an active run was signaled to stop (typically PENDING). Null when neither applied. */
  planStatusAfter?: Maybe<Scalars['String']['output']>;
  /** BullMQ job ids removed from the queue (waiting, delayed, paused, prioritized). */
  removedJobIds: Array<Scalars['String']['output']>;
  /** True when an in-flight plan run was signaled to stop (Ralph child receives SIGTERM, then SIGKILL if needed). The BullMQ job may still be active until the worker finishes. */
  signaledActiveRunToStop: Scalars['Boolean']['output'];
};

export type CaptureHealthRowObject = {
  __typename?: 'CaptureHealthRowObject';
  /** Server receipt time of the newest row for this (stream, source). */
  lastCapturedAt: Scalars['DateTime']['output'];
  /** Capturing tool, e.g. claude-code, cursor, codex; unknown when the row carries no source. */
  source: Scalars['String']['output'];
  /** Ingest stream: skill_events, skill_outcomes or token_usage. */
  stream: Scalars['String']['output'];
};

export type ChatBackendCapabilitiesObject = {
  __typename?: 'ChatBackendCapabilitiesObject';
  /** Tool-use approvals surface to the user in supervised mode (true only on the ACP path). */
  approvals: Scalars['Boolean']['output'];
  /** Supervised approvals cover file edits too. False where approvals exist but the agent applies edits unasked (cursor under ACP). */
  editApprovals: Scalars['Boolean']['output'];
  /** The backend accepts image input in a prompt. */
  imageInput: Scalars['Boolean']['output'];
  /** The chat adapter injects the run's MCP servers (OT MCP) per run. */
  mcpInjection: Scalars['Boolean']['output'];
  /** The backend is handed the full message history every turn, so a backend handoff would duplicate it. */
  replaysFullHistory: Scalars['Boolean']['output'];
  /** A conversation resumes by backend session id across turns. */
  resume: Scalars['Boolean']['output'];
  /** The user can steer a turn that is already running. */
  steering: Scalars['Boolean']['output'];
};

/** Drift detected by refreshCheckout, diffing the new scan against the previous snapshot. */
export type CheckoutDriftObject = {
  __typename?: 'CheckoutDriftObject';
  branchMoved: Scalars['Boolean']['output'];
  pathMissing: Scalars['Boolean']['output'];
  remoteChanged: Scalars['Boolean']['output'];
};

/** Aggregated CPU and memory metrics for a child process over its lifetime. */
export type ChildProcessMetrics = {
  __typename?: 'ChildProcessMetrics';
  /** Average CPU percentage across all samples. */
  avgCpuPercent: Scalars['Float']['output'];
  /** Average RSS in MB across all samples. */
  avgRssMb: Scalars['Float']['output'];
  /** Peak CPU percentage observed across all samples. */
  peakCpuPercent: Scalars['Float']['output'];
  /** Peak RSS in MB observed across all samples. */
  peakRssMb: Scalars['Float']['output'];
  /** Process ID of the child that was monitored. */
  pid: Scalars['Int']['output'];
  /** Polling interval in milliseconds. */
  pollIntervalMs: Scalars['Int']['output'];
  /** Number of samples taken. */
  sampleCount: Scalars['Int']['output'];
};

export type ClaimPlanMessagesInput = {
  /** Plan whose pending inbox to claim. */
  planId: Scalars['ID']['input'];
  /** The claiming run (plan_runs.id), stamped on each delivered message. Omit only when no run row exists. */
  planRunId?: InputMaybe<Scalars['ID']['input']>;
  /** The task the agent is about to start; delivered messages and the audit chunk are attributed to it. */
  taskId?: InputMaybe<Scalars['ID']['input']>;
};

/** The outcome of claimPlanMessages: the messages just delivered, in delivery order (STEERs first), and the audit chunk recorded on the plan output stream. */
export type ClaimPlanMessagesResultObject = {
  __typename?: 'ClaimPlanMessagesResultObject';
  /** The plan output stream chunk that records this delivery. Null when nothing was pending. */
  auditChunk?: Maybe<PlanOutputStreamChunkObject>;
  /** Messages delivered by this claim, STEERs first then QUEUEs, oldest first within each kind. Empty when nothing was pending. */
  messages: Array<PlanMessageObject>;
};

export type CleanQueueInput = {
  /** Must be true to confirm this destructive action. */
  confirm: Scalars['Boolean']['input'];
  /** Only remove jobs finished at least this many milliseconds ago (0 = any age). */
  graceMs?: InputMaybe<Scalars['Int']['input']>;
  /** Maximum number of jobs to remove (0 = no limit). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Queue name (e.g. plans). */
  queueName: Scalars['String']['input'];
  /** Which finished jobs to remove: "completed" or "failed" only. */
  state: Scalars['String']['input'];
};

export type CleanQueueResultObject = {
  __typename?: 'CleanQueueResultObject';
  /** Error message when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** Queue name when success is true. */
  queueName?: Maybe<Scalars['String']['output']>;
  /** Number of jobs removed (0 when success is false). */
  removedCount: Scalars['Int']['output'];
  /** Whether the clean was accepted. */
  success: Scalars['Boolean']['output'];
};

/** A copy of a live fragment on the same pinned schema version, optionally with a fresh copy of its live subtree. */
export type CloneCmsFragmentInput = {
  /** Also copy every live descendant, with new edges in the same order. Defaults to false (the fragment alone). */
  includeChildren?: InputMaybe<Scalars['Boolean']['input']>;
  /** Name of the copy. Defaults to the source name followed by " (copy)". */
  name?: InputMaybe<Scalars['String']['input']>;
  uuid: Scalars['String']['input'];
};

/** Clone a git repository into the managed checkout root and register it. */
export type CloneRepositoryInput = {
  /** Git clone URL (https or ssh). Cloned with ambient host credentials (SSH agent / gh); OT stores no secrets. */
  gitUrl: Scalars['String']['input'];
  /** Optional folder/display name; defaults to the repository name derived from the URL. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** One parent → child edge in the cms fragment tree. */
export type CmsFragmentChildObject = {
  __typename?: 'CmsFragmentChildObject';
  childUuid: Scalars['String']['output'];
  parentUuid: Scalars['String']['output'];
  /** Position among the parent's children. */
  sortOrder: Scalars['Int']['output'];
};

/** One page of live cms fragments, oldest first. */
export type CmsFragmentListResult = {
  __typename?: 'CmsFragmentListResult';
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<CmsFragmentObject>;
  totalCount: Scalars['Int']['output'];
};

/** One occurrence of a cms fragment in a layout tree. A fragment shared by two parents appears twice, with different keys. */
export type CmsFragmentNodeObject = {
  __typename?: 'CmsFragmentNodeObject';
  /** Keys of this occurrence's children, ordered by fragments_children.sort_order. Always a list; empty for a leaf. */
  childKeys: Array<Scalars['String']['output']>;
  /** 0 for the layout's root fragment. */
  depth: Scalars['Int']['output'];
  isSystem: Scalars['Boolean']['output'];
  /** Unique per occurrence: the uuid path from the root, joined by "/". */
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** Key of the parent occurrence; null for the root. */
  parentKey?: Maybe<Scalars['String']['output']>;
  /** sort_order of the edge from the parent; 0 for the root. */
  position: Scalars['Int']['output'];
  /** The fragment's properties as a JSON object string (repo convention: no JSON scalar). */
  propertiesJson: Scalars['String']['output'];
  /** The schema the properties validate against. */
  schemaUuid: Scalars['String']['output'];
  /** Content type; selects the component that renders the fragment. */
  typename: Scalars['String']['output'];
  /** The fragment's uuid. */
  uuid: Scalars['String']['output'];
};

/** A stored cms fragment: a named, typed piece of content whose properties conform to its pinned schema. */
export type CmsFragmentObject = {
  __typename?: 'CmsFragmentObject';
  /** The fragment's live children in sortOrder. One query per fragment: select it on a single fragment, not across a list (the layout tree is cmsLayout's job). */
  children: Array<CmsFragmentObject>;
  createdAt: Scalars['DateTime']['output'];
  isSystem: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** The fragment's properties as a JSON object string. */
  propertiesJson: Scalars['String']['output'];
  /** The schema version this fragment is pinned to, even when that version has since been soft-deleted; null only when the row is gone. One query per fragment: select it on a single fragment, not across a list. */
  schema?: Maybe<CmsSchemaObject>;
  /** The schema version the properties are validated against; fixed at creation. */
  schemaUuid: Scalars['String']['output'];
  typename: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  uuid: Scalars['String']['output'];
};

/** One page of live cms layouts, oldest first. */
export type CmsLayoutListResult = {
  __typename?: 'CmsLayoutListResult';
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<CmsLayoutSummaryObject>;
  totalCount: Scalars['Int']['output'];
};

/** A cms layout: a publishable page addressed by slug, with its fragment tree. */
export type CmsLayoutObject = {
  __typename?: 'CmsLayoutObject';
  createdAt: Scalars['DateTime']['output'];
  /** uuid of the root fragment. */
  fragmentUuid: Scalars['String']['output'];
  /** The live fragment tree in pre-order (root first, each node before its children). Cut below depth 10; soft-deleted fragments and their subtrees are left out. */
  fragments: Array<CmsFragmentNodeObject>;
  /** Layout metadata as a JSON object string. */
  metadataJson: Scalars['String']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  /** ACTIVE | DISABLED | DRAFT */
  status?: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  uuid: Scalars['String']['output'];
};

/** A cms layout without its fragment tree, for lists and write results. */
export type CmsLayoutSummaryObject = {
  __typename?: 'CmsLayoutSummaryObject';
  createdAt: Scalars['DateTime']['output'];
  /** uuid of the root fragment. */
  fragmentUuid: Scalars['String']['output'];
  /** Layout metadata as a JSON object string. */
  metadataJson: Scalars['String']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  /** ACTIVE | DISABLED | DRAFT */
  status?: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  uuid: Scalars['String']['output'];
};

/** One page of live cms library components, across every library, by typename. */
export type CmsLibraryComponentListResult = {
  __typename?: 'CmsLibraryComponentListResult';
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<CmsLibraryComponentObject>;
  totalCount: Scalars['Int']['output'];
};

/** The component that renders one fragment typename within a cms library. */
export type CmsLibraryComponentObject = {
  __typename?: 'CmsLibraryComponentObject';
  /** Component source code. */
  code: Scalars['String']['output'];
  libraryUuid: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** JSON Schema of the component's props, as a JSON object string. */
  propsSchemaJson: Scalars['String']['output'];
  /** ACTIVE | DISABLED | DRAFT */
  status?: Maybe<Scalars['String']['output']>;
  typename: Scalars['String']['output'];
  uuid: Scalars['String']['output'];
};

/** One page of live cms libraries, oldest first. */
export type CmsLibraryListResult = {
  __typename?: 'CmsLibraryListResult';
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<CmsLibraryObject>;
  totalCount: Scalars['Int']['output'];
};

/** A named set of renderable cms components. */
export type CmsLibraryObject = {
  __typename?: 'CmsLibraryObject';
  /** The library's live components, by typename. */
  components: Array<CmsLibraryComponentObject>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** ACTIVE | DISABLED | DRAFT */
  status?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  uuid: Scalars['String']['output'];
};

/** One page of live cms schemas, newest first, then by typename. */
export type CmsSchemaListResult = {
  __typename?: 'CmsSchemaListResult';
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<CmsSchemaObject>;
  totalCount: Scalars['Int']['output'];
};

/** One version of the JSON Schema for a cms fragment typename. */
export type CmsSchemaObject = {
  __typename?: 'CmsSchemaObject';
  createdAt: Scalars['DateTime']['output'];
  /** The JSON Schema as a JSON object string (repo convention: no JSON scalar). */
  jsonSchemaJson: Scalars['String']['output'];
  /** ACTIVE | DISABLED | DRAFT. At most one version per typename is meant to be ACTIVE. */
  status?: Maybe<Scalars['String']['output']>;
  typename: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  uuid: Scalars['String']['output'];
  /** Content-hash version of the schema (16 hex characters for generated schemas). */
  version: Scalars['String']['output'];
};

export type CodeIndexStatusObject = {
  __typename?: 'CodeIndexStatusObject';
  /** Number of indexed code chunks for the repository (0 when not indexed). */
  indexedChunks: Scalars['Int']['output'];
  /** Registered repository id. */
  repositoryId: Scalars['String']['output'];
  /** One of: unavailable, indexing, ready, notIndexed. */
  status: Scalars['String']['output'];
};

export type CodeSearchMatch = {
  __typename?: 'CodeSearchMatch';
  /** Raw source text of the matched chunk. */
  content: Scalars['String']['output'];
  /** 1-based inclusive last line of the match. */
  endLine: Scalars['Int']['output'];
  /** Workspace-relative POSIX path of the matched file. */
  path: Scalars['String']['output'];
  /** Similarity score (0–1, higher is more relevant). */
  score: Scalars['Float']['output'];
  /** 1-based first line of the match. */
  startLine: Scalars['Int']['output'];
};

export type CodeSemanticSearchInput = {
  /** Max number of matches to return (default 10). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Natural-language query to embed and search by vector similarity. */
  query: Scalars['String']['input'];
  /** Registered WorkspaceLocalRepository id to search within. */
  repositoryId: Scalars['ID']['input'];
};

export type CodeSemanticSearchResult = {
  __typename?: 'CodeSemanticSearchResult';
  /** False when no embeddings provider is configured; the UI renders its gated state. */
  available: Scalars['Boolean']['output'];
  /** Ranked code matches by similarity (empty when unavailable or no hits). */
  matches: Array<CodeSearchMatch>;
};

export type CommitsPerPrInput = {
  /** Max merged PRs to fetch commit count for (default 100); caps API calls. */
  maxPrs?: InputMaybe<Scalars['Int']['input']>;
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Bucket by week (YYYY-Www) or month (YYYY-MM); omit for no period. */
  period?: InputMaybe<Scalars['String']['input']>;
  /** Repository name */
  repo: Scalars['String']['input'];
};

export type CommitsPerPrRowObject = {
  __typename?: 'CommitsPerPrRowObject';
  /** Number of commits in the PR. */
  commits: Scalars['Int']['output'];
  /** ISO 8601 merged_at; null if not merged. */
  mergedAt?: Maybe<Scalars['String']['output']>;
  /** Period bucket (e.g. YYYY-MM or YYYY-Www in UTC); null if no period requested. */
  period?: Maybe<Scalars['String']['output']>;
  /** Pull request number. */
  prNumber: Scalars['Int']['output'];
};

export type ConnectMcpConnectorInput = {
  /** API token for api_token connectors; ignored for oauth. Never persisted raw — stored as a bcrypt hash + masked hint. */
  apiToken?: InputMaybe<Scalars['String']['input']>;
  /** Catalog key of the connector to connect. */
  connectorKey: Scalars['ID']['input'];
  /** Optional label for the credential. */
  label?: InputMaybe<Scalars['String']['input']>;
};

export type ConversationStreamChunkObject = {
  __typename?: 'ConversationStreamChunkObject';
  conversationId: Scalars['String']['output'];
  /** Incremental assistant text for this chunk (empty on the terminal chunk). */
  delta: Scalars['String']['output'];
  /** True exactly once, on the terminal chunk of the stream. */
  done: Scalars['Boolean']['output'];
  /** Error message when the stream failed; null otherwise. */
  error?: Maybe<Scalars['String']['output']>;
  /** Unique id for this chunk (subscription dedupe / cursor). */
  id: Scalars['String']['output'];
  /** Event kind: text (assistant output) | thinking | tool_call | tool_result | usage | usage_limit | session. */
  kind: Scalars['String']['output'];
  /** Assistant message id the deltas accumulate into. */
  messageId: Scalars['String']['output'];
  /** JSON-encoded structured metadata for non-text kinds (tool args, usage, session id); null otherwise. */
  metadataJson?: Maybe<Scalars['String']['output']>;
  /** Monotonic index within the stream. */
  sortOrder: Scalars['Int']['output'];
};

export type CreateAgentConversationInput = {
  /** JSON string of optional metadata object */
  metadataJson?: InputMaybe<Scalars['String']['input']>;
  /** Optional linked plan UUID */
  planId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional linked project UUID */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional title; may be set on first persist turn instead */
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateBlogPostInput = {
  /** Slug of an existing author (see upsertBlogAuthor). Omit for no byline. */
  authorSlug?: InputMaybe<Scalars['String']['input']>;
  bodyMarkdown: Scalars['String']['input'];
  coverImageAlt?: InputMaybe<Scalars['String']['input']>;
  coverImageUrl?: InputMaybe<Scalars['String']['input']>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  seoDescription?: InputMaybe<Scalars['String']['input']>;
  seoTitle?: InputMaybe<Scalars['String']['input']>;
  /** Lowercase letters, digits and single hyphens (^[a-z0-9]+(-[a-z0-9]+)*$), e.g. "my-first-post". */
  slug: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

/** The new DRAFT post, or why it was not created: the slug is taken, a cover image has no alt text, or the author slug is unknown. */
export type CreateBlogPostResult =
  | BlogCoverAltRequiredError
  | BlogPostAdminObject
  | BlogReferenceNotFoundError
  | BlogSlugConflictError;

/** A new fragment of a typename, on that typename's newest ACTIVE schema. */
export type CreateCmsFragmentInput = {
  name: Scalars['String']['input'];
  /** Properties as a JSON object string, merged over the schema's defaults. Omit to start from the defaults alone. */
  propertiesJson?: InputMaybe<Scalars['String']['input']>;
  typename: Scalars['String']['input'];
};

/** A new layout. Its root fragment is created with it, on the newest ACTIVE "Layout" schema. */
export type CreateCmsLayoutInput = {
  name: Scalars['String']['input'];
  /** Unique across every layout, deleted ones included. */
  slug: Scalars['String']['input'];
};

/** A new component in a live cms library. */
export type CreateCmsLibraryComponentInput = {
  /** Component source code. */
  code: Scalars['String']['input'];
  libraryUuid: Scalars['String']['input'];
  name: Scalars['String']['input'];
  /** JSON Schema of the component's props, as a JSON object string. Must compile under strict Ajv. Omit for an empty schema. */
  propsSchemaJson?: InputMaybe<Scalars['String']['input']>;
  /** ACTIVE | DISABLED | DRAFT (default DRAFT) */
  status?: InputMaybe<Scalars['String']['input']>;
  typename: Scalars['String']['input'];
};

/** Input for creating a new custom prompt */
export type CreateCustomPromptInput = {
  content: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  /** File path relative to workspace root for file system persistence */
  filePath?: InputMaybe<Scalars['String']['input']>;
  labels?: Array<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  promptType: CustomPromptType;
  title: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['ID']['input']>;
  /** Write content to the file system at filePath if provided */
  writeToFileSystem?: Scalars['Boolean']['input'];
};

export type CreateEvalDatasetFromTrajectoriesInput = {
  /** The cases, one per selected trajectory. At least one. */
  cases: Array<EvalCaseFromTrajectoryInput>;
  /** Free-text description of what the dataset covers. Blank is stored as null. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Dataset name. Re-using a name in the same repository creates the next version. */
  name: Scalars['String']['input'];
  /** Repository the dataset belongs to. */
  repositoryId: Scalars['ID']['input'];
  /** What the dataset evaluates: plan_task, skill or mcp_tool_selection. */
  target: Scalars['String']['input'];
};

export type CreateNoteInput = {
  author?: InputMaybe<Scalars['String']['input']>;
  content: Scalars['String']['input'];
};

export type CreatePlanInput = {
  assignee?: InputMaybe<Scalars['String']['input']>;
  author: Scalars['String']['input'];
  category: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  /** Optional. Project UUID (FK to projects table). Omit or pass null when plan is not linked to a project. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** JSON string of workflow-ralph run configuration (PlanRunConfigStorage v1). Omit to use defaults. */
  runConfigJson?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  /** Optional. Absolute path of the caller's workspace (typically the MCP client's cwd). Resolved SERVER-SIDE to one of the caller's own registered checkouts and recorded as the plan's default run workspace, so the Configuration tab opens pre-selected. Treated as a hint, never trusted: a path the caller does not own, an unregistered path or a relative path is ignored. Ignored entirely when runConfigJson already names a workspace, and never fails plan creation. */
  workspacePath?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePlansInput = {
  /** Plans to create atomically in one transaction. Each item carries its own author/category/title (same shape as createPlan). */
  plans: Array<CreatePlanInput>;
};

export type CreatePlansResultObject = {
  __typename?: 'CreatePlansResultObject';
  plans: Array<PlanObject>;
  totalCount: Scalars['Int']['output'];
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  /** NX project name (e.g. applications/openthrottle-server) */
  nxProjectName?: InputMaybe<Scalars['String']['input']>;
};

export type CreateQueueInput = {
  /** Name of the queue to create. */
  name: Scalars['String']['input'];
};

export type CreateQueueResultObject = {
  __typename?: 'CreateQueueResultObject';
  /** Error message when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** Queue name when success is true. */
  queueName?: Maybe<Scalars['String']['output']>;
  /** Whether the queue was created (or accepted for registration). */
  success: Scalars['Boolean']['output'];
};

export type CreateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  /** Role name (e.g. admin, user, viewer). Must be unique. */
  name: Scalars['String']['input'];
};

export type CreateRolloutFlagInput = {
  /** Description of what the flag gates. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Master switch. Defaults to off. */
  enabled?: Scalars['Boolean']['input'];
  /** Fallthrough allocation. Omit for boolean defaults (100% on true). Required for non-boolean kinds. */
  fallthrough?: InputMaybe<RolloutFallthroughInput>;
  /** Unique flag key (kebab/dotted string). Must be unique. */
  key: Scalars['String']['input'];
  /** Flag kind. Defaults to boolean with LD-like false/true variations. */
  kind?: InputMaybe<RolloutFlagKind>;
  /** Off / default variation index. Defaults to 0. */
  offVariation?: InputMaybe<Scalars['Int']['input']>;
  /** RBAC role names to target. Empty => enabled for everyone. */
  targetRoles?: Array<Scalars['String']['input']>;
  /** Variations. Omit for boolean defaults [{false},{true}]. Required (≥2) for non-boolean kinds. */
  variations?: InputMaybe<Array<RolloutFlagVariationInput>>;
};

export type CreateScheduledAgentJobInputType = {
  /** 5- or 6-field cron pattern (may not fire every minute or sub-minute). Required when scheduleKind is cron (the default); ignored otherwise. */
  cronPattern?: InputMaybe<Scalars['String']['input']>;
  /**
   * Legacy explicit process cwd for the agent CLI; omit for WORKSPACE_ROOT.
   * @deprecated Use repositoryCheckoutId to target a registered repository checkout; cwd is only consulted when no checkout is set.
   */
  cwd?: InputMaybe<Scalars['String']['input']>;
  /** Agent driver id (antigravity | claude | codex | cursor | grok | opencode). */
  driverId: Scalars['String']['input'];
  /** Whether the schedule starts enabled (default true). */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** For scheduleKind interval: ms from the end of one run to the start of the next; at least 60000. */
  intervalMs?: InputMaybe<Scalars['Int']['input']>;
  /** Misfire policy for late fires: skip (default) or catch_up_once. */
  misfirePolicy?: InputMaybe<Scalars['String']['input']>;
  /** How late (ms) a fire may start and still run; at least 60000. Omit for 10 minutes. */
  misfireThresholdMs?: InputMaybe<Scalars['Int']['input']>;
  /** Model preset; omit for the driver default. */
  model?: InputMaybe<Scalars['String']['input']>;
  /** Human-friendly schedule name. */
  name: Scalars['String']['input'];
  /** Prompt passed to the agent CLI. */
  prompt: Scalars['String']['input'];
  /** Registered repository checkout to run in; must belong to the caller. Takes precedence over cwd. Omit for the legacy cwd / WORKSPACE_ROOT fallback. */
  repositoryCheckoutId?: InputMaybe<Scalars['ID']['input']>;
  /** For scheduleKind once: when to run, as ISO 8601 with an offset (e.g. 2026-11-03T09:00:00-08:00 or ...Z); must be in the future. */
  runAt?: InputMaybe<Scalars['String']['input']>;
  /** How the schedule fires: cron (default), interval or once. */
  scheduleKind?: InputMaybe<Scalars['String']['input']>;
  /** JSON AgentPromptSettings ({ endpoint?, worktree? }); no endpoint.apiKey. Omit for none. */
  settingsJson?: InputMaybe<Scalars['String']['input']>;
  /** Per-run timeout override in ms; omit for the queue default. */
  timeoutMs?: InputMaybe<Scalars['Int']['input']>;
  /** IANA timezone; omit for UTC. */
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type CreateServiceAccountCredentialInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  serviceAccountId: Scalars['ID']['input'];
};

export type CreateServiceAccountCredentialResultObject = {
  __typename?: 'CreateServiceAccountCredentialResultObject';
  /** Saved credential metadata (secret hash is never returned). */
  credential: ServiceAccountCredentialObject;
  /** Plaintext ot_sa_<prefix>_<secret> token; store securely — not retrievable again. */
  token: Scalars['String']['output'];
};

export type CreateServiceAccountInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  /** Stable name (e.g. openthrottle-mcp). Must be unique. */
  name: Scalars['String']['input'];
};

export type CreateTaskInput = {
  assignee?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** Plan id the task belongs to */
  planId: Scalars['ID']['input'];
  project?: InputMaybe<Scalars['String']['input']>;
  /** Project UUID (FK to projects table). Omit or pass null when task is not linked to a project. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** JSON string of requirements array */
  requirements?: InputMaybe<Scalars['String']['input']>;
  /** Optional. Execution order within plan. When omitted, server auto-assigns MAX+1000. */
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  /** Optional. Coarse concurrency layer within the plan: tasks sharing a wave may be worked concurrently. Never 0; NULL (omitted) means unassigned and runs sequentially in sortOrder position. Not consumed for execution yet. */
  wave?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateTasksInput = {
  /** Plan id all tasks in this batch belong to */
  planId: Scalars['ID']['input'];
  /** Tasks to create atomically in one transaction. sortOrder is per-item optional; omitted items append MAX+1000, MAX+2000, … in array order. */
  tasks: Array<CreateTasksItemInput>;
};

export type CreateTasksItemInput = {
  assignee?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  /** Project UUID (FK to projects table). Omit or pass null when task is not linked to a project. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** JSON string of requirements array */
  requirements?: InputMaybe<Scalars['String']['input']>;
  /** Optional. Execution order within plan. When omitted, server auto-assigns MAX+1000 stepping in array order. */
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  /** Optional. Coarse concurrency layer within the plan: tasks sharing a wave may be worked concurrently. Never 0; NULL (omitted) means unassigned and runs sequentially in sortOrder position. Not consumed for execution yet. */
  wave?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateTasksResultObject = {
  __typename?: 'CreateTasksResultObject';
  tasks: Array<TaskObject>;
  totalCount: Scalars['Int']['output'];
};

export type CreateUserInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  /** GitHub user or Organization name (e.g. OpenThrottle) */
  githubUsername: Scalars['String']['input'];
};

export type CreateWorkspaceLocalRepositoryInput = {
  displayName: Scalars['String']['input'];
  /** Absolute path to an existing directory on the server host. */
  filesystemPath: Scalars['String']['input'];
  gitDefaultBranch?: InputMaybe<Scalars['String']['input']>;
  gitRemoteUrl?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

/** A custom prompt document for AI workflow customization */
export type CustomPromptObject = {
  __typename?: 'CustomPromptObject';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  filePath?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  labels: Array<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['String']['output']>;
  promptType: CustomPromptType;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId?: Maybe<Scalars['String']['output']>;
};

/** Type of custom prompt document */
export const CustomPromptType = {
  Agents: 'AGENTS',
  Commands: 'COMMANDS',
  Personas: 'PERSONAS',
  Prompts: 'PROMPTS',
  Rules: 'RULES',
  Skills: 'SKILLS',
} as const;

export type CustomPromptType =
  (typeof CustomPromptType)[keyof typeof CustomPromptType];
export type DailyStatsObject = {
  __typename?: 'DailyStatsObject';
  /** Row created_at. */
  createdAt: Scalars['DateTime']['output'];
  /** Stats date (YYYY-MM-DD). */
  date: Scalars['String']['output'];
  /** JSON object of plan status -> count for this date. */
  plansByStatusJson: Scalars['String']['output'];
  /** Plans completed on this date. */
  plansCompleted: Scalars['Int']['output'];
  /** Plans created on this date. */
  plansCreated: Scalars['Int']['output'];
  /** Plans updated on this date. */
  plansUpdated: Scalars['Int']['output'];
  /** JSON object of task status -> count for this date. */
  tasksByStatusJson: Scalars['String']['output'];
  /** Tasks completed on this date. */
  tasksCompleted: Scalars['Int']['output'];
  /** Tasks created on this date. */
  tasksCreated: Scalars['Int']['output'];
  /** Tasks updated on this date. */
  tasksUpdated: Scalars['Int']['output'];
};

export type DailyStatsRangeResultObject = {
  __typename?: 'DailyStatsRangeResultObject';
  /** Daily stats rows in the range, ordered by date ascending. */
  items: Array<DailyStatsObject>;
};

export type DebugNotification = NotificationEvent & {
  __typename?: 'DebugNotification';
  /** JSON-encoded debug data. */
  dataJson?: Maybe<Scalars['String']['output']>;
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

export type DeleteAgentConversationInput = {
  conversationId: Scalars['ID']['input'];
};

export type DeletePlanInput = {
  /** Plan id to delete */
  id: Scalars['ID']['input'];
};

export type DeletePlanOutputInput = {
  /** Delete a single chunk by id (must belong to planId). Omit to clear all chunks for planId instead. */
  chunkId?: InputMaybe<Scalars['ID']['input']>;
  /** Plan id to delete output chunks for */
  planId: Scalars['ID']['input'];
  /** When clearing (chunkId omitted), scope the clear to chunks attributed to this task id. */
  taskId?: InputMaybe<Scalars['ID']['input']>;
};

export type DeletePlanOutputResult = {
  __typename?: 'DeletePlanOutputResult';
  /** Number of plan output stream chunks deleted */
  deletedCount: Scalars['Int']['output'];
};

export type DeleteProjectInput = {
  /** Project id to delete */
  id: Scalars['ID']['input'];
};

export type DeleteTagActionRuleInput = {
  /** Rule to delete (ledger rows CASCADE). */
  id: Scalars['ID']['input'];
};

export type DeleteTaskInput = {
  /** Task id to delete */
  id: Scalars['ID']['input'];
};

/** The worktree path a teardown just removed. */
export type DeregisterWorktreeCheckoutInput = {
  /** Absolute filesystem path of the removed worktree. Matched as given and by its real path. */
  filesystemPath: Scalars['String']['input'];
};

/** Result of deregisterWorktreeCheckout for one removed worktree path. */
export type DeregisterWorktreeCheckoutPayloadObject = {
  __typename?: 'DeregisterWorktreeCheckoutPayloadObject';
  /** The checkout row at the path, or null when none is registered there for the caller. */
  checkoutId?: Maybe<Scalars['ID']['output']>;
  /** PRUNED when the row was deleted; NOT_FOUND when there was nothing to deregister (the normal case for a worktree OpenThrottle never registered). */
  outcome: PruneWorktreeCheckoutOutcome;
  /** The registered path when a row matched, else the path as given. */
  path: Scalars['String']['output'];
};

export type DetachHookInput = {
  /** Hook task id to detach (delete) */
  hookTaskId: Scalars['ID']['input'];
};

export type DiscoverAgentClisResult = {
  __typename?: 'DiscoverAgentClisResult';
  /** Allowlisted agent CLIs detected as available on the server host. */
  agents: Array<AgentCliOptionObject>;
  /** ISO-8601 timestamp of when this snapshot was scanned. */
  scannedAt: Scalars['String']['output'];
  /** Number of available agent CLIs. */
  totalCount: Scalars['Int']['output'];
};

export type DiscoverLocalModelsResult = {
  __typename?: 'DiscoverLocalModelsResult';
  /** De-duplicated reachable endpoints, stably sorted by (host, port). */
  endpoints: Array<ModelEndpointObject>;
  /** ISO-8601 timestamp of when this snapshot was scanned. */
  scannedAt: Scalars['String']['output'];
  /** Hosts probed during this scan, in resolution order. */
  scannedHosts: Array<Scalars['String']['output']>;
  /** Number of discovered endpoints. */
  totalCount: Scalars['Int']['output'];
};

/** A folder found under a configured workspace root (server-host path) that looks like a git repository. */
export type DiscoveredFolderObject = {
  __typename?: 'DiscoveredFolderObject';
  /** True when this folder is already registered (matched by OT manifest id or by path). */
  alreadyRegistered: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** Absolute path on the server host. */
  path: Scalars['String']['output'];
};

/** A linked git worktree that exists on disk right now (server-host path). */
export type DiscoveredWorktreeObject = {
  __typename?: 'DiscoveredWorktreeObject';
  /** RUNNING / DIRTY / IDLE. See WorktreeActivity for what does and does not count as running. */
  activity: WorktreeActivity;
  /** Checked-out branch, or null when the worktree is on a detached HEAD or the probe failed. */
  branch?: Maybe<Scalars['String']['output']>;
  /** The registered repository_checkouts row at this path, or null when the worktree is unregistered. */
  checkoutId?: Maybe<Scalars['ID']['output']>;
  /** Directory name, which is also the worktree's name and its branch suffix. */
  name: Scalars['String']['output'];
  /** Absolute, symlink-resolved path on the server host. */
  path: Scalars['String']['output'];
  /** The plan the live run belongs to; only set when activity is RUNNING. There is no plan-run detail route, so this is what the UI links to. */
  planId?: Maybe<Scalars['ID']['output']>;
  /** The live plan run executing here; only set when activity is RUNNING. */
  planRunId?: Maybe<Scalars['ID']['output']>;
  /** Owning repository, resolved from the registered checkout or from the worktree's git common dir. Null when the owning repository is not registered for this user. */
  repositoryId?: Maybe<Scalars['ID']['output']>;
  /** Whether the live run's liveness is VERIFIED rather than merely claimed. True when the run heartbeats on a timer, so RUNNING is a checked fact. False when it does not (an interactive /ot-loop run): the row says IN_PROGRESS and nothing confirms it, so this worktree may be held busy by an agent that died hours ago — surface that distinctly rather than showing it as healthily running. Null when nothing is running. */
  runMonitored?: Maybe<Scalars['Boolean']['output']>;
  /** True when this is a server-provisioned plan-run worktree that removePlanRunWorktree would remove as of the last scan: registered, clean, nothing unpushed, and no live run on it. Reused for as long as the scan is cached; removePlanRunWorktree re-checks every guard before removing anything. Always false for any other worktree. */
  safeToRemove: Scalars['Boolean']['output'];
  /** True when no repository_checkouts row exists at this path for this user. Orthogonal to activity — an unregistered worktree can be DIRTY. */
  unregistered: Scalars['Boolean']['output'];
};

/** Result of one on-disk worktree scan: what was found, where it was looked for, and anything that went wrong along the way. */
export type DiscoveredWorktreesObject = {
  __typename?: 'DiscoveredWorktreesObject';
  /** Worktrees found beyond the hard cap and therefore not listed. Always accompanied by a warning — discovery never truncates silently. */
  droppedCount: Scalars['Int']['output'];
  /** Registered worktree checkouts with no live worktree behind them, ordered by path — rows left behind when a worktree was removed outside OpenThrottle. Matched against every live worktree before the cap, so a capped scan never reports a live one here. */
  missingCheckouts: Array<MissingWorktreeCheckoutObject>;
  /** Classified non-fatal problems. Empty on a healthy machine — a repository with no worktrees yet reports nothing at all. */
  problems: Array<WorktreeDiscoveryProblemObject>;
  /** Which rung of the ladder produced worktreeRoot; null when no root could be resolved. */
  rootSource?: Maybe<WorktreeRootSource>;
  /** ISO timestamp of this scan. Discovery runs live on every request; there is no cached snapshot. */
  scannedAt: Scalars['String']['output'];
  /** Every root the scan looked in, each carrying the configured baseRoot it sits under and the rung that set it. */
  scannedRoots: Array<ScannedWorktreeRootObject>;
  /**
   * Non-fatal problems as flat sentences, one per entry in problems.
   * @deprecated Use problems — warnings is unclassified free text and cannot be presented per-kind.
   */
  warnings: Array<Scalars['String']['output']>;
  /**
   * The first resolved per-repository folder that was scanned; null when none could be resolved (no registered primary checkout).
   * @deprecated Use scannedRoots.baseRoot — worktreeRoot is the first primary's <root>/<org>/<repo> folder, not the configured root, and names only one of several.
   */
  worktreeRoot?: Maybe<Scalars['String']['output']>;
  worktrees: Array<DiscoveredWorktreeObject>;
};

export type DuplicateJobInput = {
  /** BullMQ job id to duplicate. */
  jobId: Scalars['ID']['input'];
  /** Queue name (e.g. plans). */
  queueName: Scalars['String']['input'];
};

export type DuplicateJobResultObject = {
  __typename?: 'DuplicateJobResultObject';
  /** Error message when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** New job id when success is true. */
  jobId?: Maybe<Scalars['String']['output']>;
  /** Whether the duplicate was accepted. */
  success: Scalars['Boolean']['output'];
};

export type EditorPresenceObject = {
  __typename?: 'EditorPresenceObject';
  /** The editor this presence result describes. */
  editor: WorkspaceEditorId;
  /** Probed presence. Advisory only: a NOT_FOUND editor can still be enabled and will still get a toolbar button, and UNKNOWN must render no hint at all. */
  presence: EditorPresenceState;
};

export type EditorPresenceResultObject = {
  __typename?: 'EditorPresenceResultObject';
  /** Every editor OpenThrottle can configure, with its probed presence. Always covers the full editor vocabulary — editors are never omitted, they report UNKNOWN. */
  editors: Array<EditorPresenceObject>;
  /** ISO-8601 timestamp of when this snapshot was scanned. Cached, so it may lag the current moment by up to the soft TTL. */
  scannedAt: Scalars['String']['output'];
  /** True when the probe ran against the user's own machine. False means every entry is UNKNOWN — typically a containerized server, which can only see its own filesystem and so must not claim anything about the user's editors. Clients can use this to suppress hinting wholesale. */
  trusted: Scalars['Boolean']['output'];
};

/** Whether an editor appears to be installed on the machine hosting the OpenThrottle server. Advisory only — never a gate on enabling an editor. Supported values: installed, not_found, unknown. */
export const EditorPresenceState = {
  /** The probe found the editor on the host. */
  Installed: 'INSTALLED',
  /** The probe ran on the user's own machine and did not find the editor. Safe to show as an advisory; still never a reason to disable the editor. */
  NotFound: 'NOT_FOUND',
  /** The probe could not be trusted, so nothing is claimed either way — the server is containerized (its filesystem is not the user's), the platform has no verified probe, or the probe failed. Clients must render no hint for this state. */
  Unknown: 'UNKNOWN',
} as const;

export type EditorPresenceState =
  (typeof EditorPresenceState)[keyof typeof EditorPresenceState];
export type EndWorkSessionInput = {
  /** Session to close */
  sessionId: Scalars['ID']['input'];
  /** Summary set at close (legibility for unpromoted sessions) */
  summary?: InputMaybe<Scalars['String']['input']>;
};

export type EnqueueAgenticTestResultObject = {
  __typename?: 'EnqueueAgenticTestResultObject';
  /** Error message when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** BullMQ job id when success is true. */
  jobId?: Maybe<Scalars['String']['output']>;
  /** Whether the job was enqueued. */
  success: Scalars['Boolean']['output'];
};

export type EnqueueAgenticWorkflowMockResultObject = {
  __typename?: 'EnqueueAgenticWorkflowMockResultObject';
  /** Error message when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** BullMQ job id when success is true. */
  jobId?: Maybe<Scalars['String']['output']>;
  /** BullMQ job name when success is true. */
  jobName?: Maybe<Scalars['String']['output']>;
  /** BullMQ queue name when success is true. */
  queueName?: Maybe<Scalars['String']['output']>;
  /** Whether the job was enqueued. */
  success: Scalars['Boolean']['output'];
};

export type EnqueueDocIngestionInput = {
  /** Paths relative to workspace root; each directory is expanded to all .md files (recursive). */
  directories?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Individual markdown file paths relative to workspace root. */
  files?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Source repo for metadata (e.g. owner/repo). */
  repo?: InputMaybe<Scalars['String']['input']>;
  /** Ingestion scope for prior-state (default: "default"). Use different scopes to keep state separate. */
  scope?: InputMaybe<Scalars['String']['input']>;
  /** Source commit SHA for metadata. */
  sha?: InputMaybe<Scalars['String']['input']>;
};

export type EnqueueDocIngestionResultObject = {
  __typename?: 'EnqueueDocIngestionResultObject';
  /** Error message when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** BullMQ job id when success is true. */
  jobId?: Maybe<Scalars['String']['output']>;
  /** Whether the job was enqueued. */
  success: Scalars['Boolean']['output'];
};

export type EnqueuePlanRalphOrchestratorInput = {
  /** REQUIRED git branch this run operates on. Captured on plan_runs.branch as run provenance (powers branch->PR mapping). Passed explicitly by callers (skills/UI may pre-fill a default from the worktree name / HEAD) and never inferred server-side; enqueue fails fast when missing or blank. */
  branch: Scalars['String']['input'];
  /** Set true to run a SCHEDULED plan now: its scheduled run is cancelled and this run is enqueued in its place, in one transaction. Without it, a plan with a scheduled run fails with extensions.code PLAN_ALREADY_SCHEDULED. */
  cancelScheduled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Optional registered checkout id (highest precedence). Resolved server-side to its filesystem path for this run; when set it overrides repositoryId and workingDirectory. */
  checkoutId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional dedupe key passed to BullMQ as jobId. Re-enqueue with the same key returns the existing job id. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** Optional JSON override for job-run lifecycle hooks for this enqueue only ({ hooks: [...] }). When omitted, hooks are copied from the plan. */
  jobRunHooksJson?: InputMaybe<Scalars['String']['input']>;
  /** Omit or "plan" for plan-scoped run; "task" requires taskId (task-centric). */
  mode?: InputMaybe<PlanRalphWorkflowMode>;
  /** Plan id to run the orchestrator for */
  planId: Scalars['ID']['input'];
  /** Job priority (lower = higher priority). Same as enqueuePlanRun. */
  priority?: InputMaybe<Scalars['Int']['input']>;
  /** Optional Ralph tuning for the in-process orchestrator (iterations, model, backend, etc.). */
  ralph?: InputMaybe<RalphPlanRunTuningInput>;
  /** Optional registered repository id. Resolved to the enqueuing user's single checkout of that repository (errors when there is no checkout, or when it is ambiguous). Used when checkoutId is omitted. */
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  /** Which runner executes the run: "ralph" (the default) or "ot-loop" (the per-task discipline of /ot-loop run as deterministic job code, with a fresh worker per task). Nullable + additive: omit to use the plan's stored runConfig runner, else Ralph. An unrecognized value is rejected. "ot-loop" is also rejected when the run has no worktree (disableWorktree) or when no validation command resolves (set otLoop.validationCommands on the plan, or commit .openthrottle/ot-loop.json). */
  runner?: InputMaybe<Scalars['String']['input']>;
  /** Required when mode is task; must belong to the plan. */
  taskId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional absolute path to a local project directory used as the working directory for this run. Escape hatch used only when checkoutId and repositoryId are omitted. When all three are omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side. */
  workingDirectory?: InputMaybe<Scalars['String']['input']>;
};

export type EnqueuePlanRunInput = {
  /** REQUIRED git branch this run operates on. Captured on plan_runs.branch as run provenance (powers branch->PR mapping). Passed explicitly by callers (skills/UI may pre-fill a default from the worktree name / HEAD) and never inferred server-side; enqueue fails fast when missing or blank. */
  branch: Scalars['String']['input'];
  /** Set true to run a SCHEDULED plan now: its scheduled run is cancelled and this run is enqueued in its place, in one transaction. Without it, enqueuing a plan that has a scheduled run fails with extensions.code PLAN_ALREADY_SCHEDULED (plus planRunId and scheduledFor). */
  cancelScheduled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Optional registered checkout id (highest precedence). Resolved server-side to its filesystem path for this run; when set it overrides repositoryId and workingDirectory. */
  checkoutId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional dedupe key passed to BullMQ as jobId. Re-enqueue with the same key returns the existing job id instead of creating a duplicate. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** Optional JSON override for job-run lifecycle hooks for this enqueue only ({ hooks: [...] }). When omitted, hooks are copied from the plan. Validated against repo paths when workingDirectory is set. */
  jobRunHooksJson?: InputMaybe<Scalars['String']['input']>;
  /** Plan id to enqueue a run for */
  planId: Scalars['ID']['input'];
  /** Job priority (lower = higher priority). 1=interactive/UI, 10=normal (default), 100=batch/scheduled. Omit to use normal priority. */
  priority?: InputMaybe<Scalars['Int']['input']>;
  /** Optional Ralph / workflow-ralph runtime tuning (iterations, model, backend, etc.). When set, queued workers pass these to nested workflow-ralph; when omitted, defaults come from env and .workflow-ralph.json in the worktree cwd. */
  ralph?: InputMaybe<RalphPlanRunTuningInput>;
  /** Optional registered repository id. Resolved to the enqueuing user's single checkout of that repository (errors when there is no checkout, or when it is ambiguous). Used when checkoutId is omitted. */
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  /** Which runner executes the run: "ralph" (the default) or "ot-loop" (the per-task discipline of /ot-loop run as deterministic job code, with a fresh worker per task). Nullable + additive: omit to use the plan's stored runConfig runner, else Ralph. An unrecognized value is rejected. "ot-loop" is also rejected when the run has no worktree (disableWorktree) or when no validation command resolves (set otLoop.validationCommands on the plan, or commit .openthrottle/ot-loop.json). */
  runner?: InputMaybe<Scalars['String']['input']>;
  /** Optional absolute path to a local project directory used as the working directory for this run. Escape hatch used only when checkoutId and repositoryId are omitted. When all three are omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side. */
  workingDirectory?: InputMaybe<Scalars['String']['input']>;
};

export type EnqueuePlanRunResultObject = {
  __typename?: 'EnqueuePlanRunResultObject';
  /** Execution backend selected once for the whole run: cursor or claude. */
  executionBackend: Scalars['String']['output'];
  /** BullMQ job id */
  jobId: Scalars['String']['output'];
  /** Plan id that was enqueued */
  planId: Scalars['String']['output'];
  /** Position of this job in the waiting queue (1-based). E.g., 1 means next to be processed. */
  queuePosition: Scalars['Int']['output'];
  /** Total number of jobs waiting in the queue (including this one). */
  queueTotal: Scalars['Int']['output'];
};

/** One input for the agent plus what a correct outcome looks like. */
export type EvalCase = {
  __typename?: 'EvalCase';
  /** When the case was added. */
  createdAt: Scalars['DateTime']['output'];
  /** Dataset the case belongs to. */
  datasetId: Scalars['ID']['output'];
  /** What a correct outcome looks like, serialized with JSON.stringify. */
  goldJson: Scalars['String']['output'];
  /** Case id. */
  id: Scalars['ID']['output'];
  /** What the agent is asked to do, serialized with JSON.stringify. */
  inputJson: Scalars['String']['output'];
  /** The trajectory (a real failure) the case was created from. Null for hand-written cases or a pruned trajectory. */
  sourceTrajectoryId?: Maybe<Scalars['ID']['output']>;
  /** Which side of the dataset the case sits on: dev or test. */
  split: Scalars['String']['output'];
};

export type EvalCaseFromTrajectoryInput = {
  /** What a correct outcome looks like, as a JSON string. */
  goldJson: Scalars['String']['input'];
  /** What the agent is asked to do, as a JSON string. Omit to derive an object from the trajectory (id, task id, plan run id, driver, model). */
  inputJson?: InputMaybe<Scalars['String']['input']>;
  /** Which side of the dataset the case sits on: dev or test. */
  split: Scalars['String']['input'];
  /** The recorded trajectory (a real failure) the case is created from. */
  trajectoryId: Scalars['ID']['input'];
};

/** A reason the two runs are not strictly comparable. */
export type EvalComparisonWarning = {
  __typename?: 'EvalComparisonWarning';
  /** dataset_differs, auth_mode_differs, k_differs or no_shared_cases. */
  code: Scalars['String']['output'];
  /** A sentence for a reader. */
  message: Scalars['String']['output'];
};

/** A versioned, per-repository set of eval cases. */
export type EvalDataset = {
  __typename?: 'EvalDataset';
  /** The dataset's cases, oldest first. */
  cases: Array<EvalCase>;
  /** When the dataset version was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Who created the dataset: the GitHub username of the caller, stamped server-side. */
  createdBy: Scalars['String']['output'];
  /** Free-text description of what the dataset covers. */
  description?: Maybe<Scalars['String']['output']>;
  /** Dataset id. */
  id: Scalars['ID']['output'];
  /** Dataset name, unique per repository together with version. */
  name: Scalars['String']['output'];
  /** Repository the dataset belongs to. */
  repositoryId: Scalars['ID']['output'];
  /** What the dataset evaluates: plan_task, skill or mcp_tool_selection. */
  target: Scalars['String']['output'];
  /** When the dataset row last changed. */
  updatedAt: Scalars['DateTime']['output'];
  /** Dataset version, starting at 1. Re-creating a name bumps it. */
  version: Scalars['Int']['output'];
};

/** One grader's verdict on one trial, with the grader and judge identity it was produced by. */
export type EvalGrade = {
  __typename?: 'EvalGrade';
  /** Judge-cache key. Null for graders that are not cached. */
  cacheKey?: Maybe<Scalars['String']['output']>;
  /** Cost of grading in USD. Null for code graders and unpriceable judges. */
  costUsd?: Maybe<Scalars['Float']['output']>;
  /** When the grade was recorded. */
  createdAt: Scalars['DateTime']['output'];
  /** Why the grader could not decide. Set exactly when the verdict is error. */
  errorReason?: Maybe<Scalars['String']['output']>;
  /** Evidence the grader quoted, serialized with JSON.stringify. Null for an error verdict. */
  evidenceJson?: Maybe<Scalars['String']['output']>;
  /** Stable id of the grader. */
  graderId: Scalars['String']['output'];
  /** What produced the grade: code, judge or human. */
  graderKind: Scalars['String']['output'];
  /** Grader version; it changes whenever the check changes. */
  graderVersion: Scalars['String']['output'];
  /** Grade id. */
  id: Scalars['ID']['output'];
  /** Driver that ran the judge. Null unless the grader is a judge. */
  judgeDriver?: Maybe<Scalars['String']['output']>;
  /** Model that ran the judge. Set for every judge grade. */
  judgeModel?: Maybe<Scalars['String']['output']>;
  /** Version or snapshot of the judge model when known. */
  judgeModelVersion?: Maybe<Scalars['String']['output']>;
  /** Trial that was graded. */
  trialId: Scalars['ID']['output'];
  /** pass, fail, or error (the grader itself could not decide; excluded from pass rates). */
  verdict: Scalars['String']['output'];
};

/** One measurement of a judge (or critic) against human labels: kappa with a bootstrap 95% interval, catch rate, false-fail rate and the resulting gating status. */
export type EvalJudgeCalibration = {
  __typename?: 'EvalJudgeCalibration';
  /** P(judge says fail | human says fail). Null when the humans never failed a trial. */
  catchRate?: Maybe<Scalars['Float']['output']>;
  /** When the calibration was recorded. */
  createdAt: Scalars['DateTime']['output'];
  /** Who recorded the calibration, stamped from the caller's identity. */
  createdBy: Scalars['String']['output'];
  /** Dataset whose cases were labelled. Null for an ad hoc calibration. */
  datasetId?: Maybe<Scalars['ID']['output']>;
  /** P(judge says fail | human says pass). Null when the humans never passed a trial. */
  falseFailRate?: Maybe<Scalars['Float']['output']>;
  /** Id of the grader that was calibrated. */
  graderId: Scalars['String']['output'];
  /** Version of the grader that was calibrated. */
  graderVersion: Scalars['String']['output'];
  /** True when this is the held-out judge that no loop, critic or prompt optimization sees. */
  heldOut: Scalars['Boolean']['output'];
  /** Calibration id. */
  id: Scalars['ID']['output'];
  /** Driver that ran the judge. */
  judgeDriver?: Maybe<Scalars['String']['output']>;
  /** Model that ran the judge. */
  judgeModel: Scalars['String']['output'];
  /** Version or snapshot of the judge model when known. */
  judgeModelVersion?: Maybe<Scalars['String']['output']>;
  /** Cohen's kappa. Null when undefined: no pairs, or a constant rater. */
  kappa?: Maybe<Scalars['Float']['output']>;
  /** Upper bound of the bootstrap 95% interval of kappa. */
  kappaCiHigh?: Maybe<Scalars['Float']['output']>;
  /** Lower bound of the bootstrap 95% interval of kappa. */
  kappaCiLow?: Maybe<Scalars['Float']['output']>;
  /** Pairs used for the statistics. Judge error verdicts are not counted. */
  n: Scalars['Int']['output'];
  /** Pairs left out because the judge returned an error verdict. */
  nExcluded: Scalars['Int']['output'];
  /** Eval run the judge grades were read from. Null when pairs were supplied directly. */
  runId?: Maybe<Scalars['ID']['output']>;
  /** Dataset split the labelled cases came from (dev or test). Null when not split-scoped. */
  split?: Maybe<Scalars['String']['output']>;
  /** unsupervised (kappa >= 0.8), gating (>= 0.6), non_gating (below) or insufficient (too few pairs). */
  status: Scalars['String']['output'];
};

/** McNemar's test on the cases where the two runs disagree. */
export type EvalMcNemar = {
  __typename?: 'EvalMcNemar';
  /** Cases that passed in the baseline and failed in the candidate: got worse. */
  b: Scalars['Int']['output'];
  /** Cases that failed in the baseline and passed in the candidate: got better. */
  c: Scalars['Int']['output'];
  /** exact or chi_square. */
  method: Scalars['String']['output'];
  /** Two-sided p-value. */
  pValue: Scalars['Float']['output'];
};

/** One case of the run: counted attempts, passes, and whether the case passed. */
export type EvalReportCase = {
  __typename?: 'EvalReportCase';
  /** Attempts that count. */
  attemptsCounted: Scalars['Int']['output'];
  /** Counted attempts that passed. */
  attemptsPassed: Scalars['Int']['output'];
  /** Case id. */
  caseId: Scalars['ID']['output'];
  /** True when every counted attempt passed. Null when no attempt counted. */
  passed?: Maybe<Scalars['Boolean']['output']>;
  /** dev or test. */
  split: Scalars['String']['output'];
};

/** How many trials were left out of the pass rate, by reason. */
export type EvalReportExclusions = {
  __typename?: 'EvalReportExclusions';
  /** Trials whose attempt errored. */
  errored: Scalars['Int']['output'];
  /** Trials where a counted grader returned an error verdict. */
  gradeError: Scalars['Int']['output'];
  /** Trials with no grade that counts (no code grade, no gating judge). */
  noCountedGrade: Scalars['Int']['output'];
  /** Trials paused by a usage limit. */
  usageLimited: Scalars['Int']['output'];
};

/** A grader that graded the run, with its calibration and whether its grades count toward the pass rate. */
export type EvalReportGrader = {
  __typename?: 'EvalReportGrader';
  /** Calibration status of this judge id and version. Null for code and human graders, and for an uncalibrated judge. */
  calibrationStatus?: Maybe<Scalars['String']['output']>;
  /** Whether this grader's grades count: code graders and judges calibrated gating or unsupervised. Human grades never count. */
  counts: Scalars['Boolean']['output'];
  /** Stable id of the grader. */
  graderId: Scalars['String']['output'];
  /** code, judge or human. */
  graderKind: Scalars['String']['output'];
  /** Grader version. */
  graderVersion: Scalars['String']['output'];
  /** Judge model. */
  judgeModel?: Maybe<Scalars['String']['output']>;
  /** Judge model version when known. */
  judgeModelVersion?: Maybe<Scalars['String']['output']>;
  /** Cohen's kappa of the latest calibration. */
  kappa?: Maybe<Scalars['Float']['output']>;
  /** Kappa interval upper bound. */
  kappaCiHigh?: Maybe<Scalars['Float']['output']>;
  /** Kappa interval lower bound. */
  kappaCiLow?: Maybe<Scalars['Float']['output']>;
};

/** A percentile bootstrap interval (10,000 resamples, fixed seed). */
export type EvalReportInterval = {
  __typename?: 'EvalReportInterval';
  /** Confidence level, for example 0.95. */
  confidence: Scalars['Float']['output'];
  /** Lower bound. */
  lower: Scalars['Float']['output'];
  /** Upper bound. */
  upper: Scalars['Float']['output'];
};

/** Agreement with humans (Cohen's kappa) of the weakest calibrated judge that graded the run. */
export type EvalReportJudgeAgreement = {
  __typename?: 'EvalReportJudgeAgreement';
  /** Grader id of that judge. */
  graderId: Scalars['String']['output'];
  /** Grader version of that judge. */
  graderVersion: Scalars['String']['output'];
  /** Cohen's kappa. */
  kappa: Scalars['Float']['output'];
  /** Upper bound of the bootstrap 95% interval. */
  kappaCiHigh?: Maybe<Scalars['Float']['output']>;
  /** Lower bound of the bootstrap 95% interval. */
  kappaCiLow?: Maybe<Scalars['Float']['output']>;
  /** Calibration status: unsupervised, gating, non_gating or insufficient. */
  status: Scalars['String']['output'];
};

/** The headline numbers of one run. Every number is over trials that count: see EvalReportGrader.counts. */
export type EvalReportNumbers = {
  __typename?: 'EvalReportNumbers';
  /** Cases with at least k counted attempts, the cases pass@k and pass^k average over. */
  casesAtK: Scalars['Int']['output'];
  /** Cases with at least one counted attempt. */
  casesCounted: Scalars['Int']['output'];
  /** Cost of the counted trials divided by their passes. Null when any counted trial is unpriced or nothing passed. */
  costPerSuccessUsd?: Maybe<Scalars['Float']['output']>;
  /** The smallest change in pass rate a paired comparison over this many cases can detect (alpha 0.05, power 0.8). Null when no case counted. */
  detectionFloor?: Maybe<Scalars['Float']['output']>;
  /** Why trials were left out. */
  excluded: EvalReportExclusions;
  /** Judge agreement with humans. Null when no judge with a kappa graded the run. */
  judgeAgreement?: Maybe<EvalReportJudgeAgreement>;
  /** pass@k: the chance at least one of k attempts passes, averaged over cases. */
  passAtK?: Maybe<Scalars['Float']['output']>;
  /** pass^k: the chance all k attempts pass, averaged over cases. */
  passHatK?: Maybe<Scalars['Float']['output']>;
  /** Passing trials over counted trials. Null when nothing counted. */
  passRate?: Maybe<Scalars['Float']['output']>;
  /** Bootstrap 95% interval of the pass rate. */
  passRateCi?: Maybe<EvalReportInterval>;
  /** Cost of every trial. Null when any trial is unpriced. */
  totalCostUsd?: Maybe<Scalars['Float']['output']>;
  /** Trials that count. */
  trialsCounted: Scalars['Int']['output'];
  /** Trials left out of the pass rate. */
  trialsExcluded: Scalars['Int']['output'];
  /** Counted trials that passed. */
  trialsPassed: Scalars['Int']['output'];
};

/** One configuration (driver, model, effort, prompt and skill SHAs, auth mode) executed over a dataset, k attempts per case. */
export type EvalRun = {
  __typename?: 'EvalRun';
  /** How the CLI was billed: api_key or subscription. */
  authMode: Scalars['String']['output'];
  /** Token budget for the whole run. Null means unlimited. */
  budgetTokens?: Maybe<Scalars['Int']['output']>;
  /** Dollar budget for the whole run. Null means unlimited. */
  budgetUsd?: Maybe<Scalars['Float']['output']>;
  /** When the run was recorded. */
  createdAt: Scalars['DateTime']['output'];
  /** Who started the run: the GitHub username of the caller, stamped server-side. */
  createdBy: Scalars['String']['output'];
  /** Dataset that was run. */
  datasetId: Scalars['ID']['output'];
  /** The dataset version the run executed. */
  datasetVersion: Scalars['Int']['output'];
  /** Agent driver under test. */
  driver: Scalars['String']['output'];
  /** Reasoning effort under test. Null when the driver default was used. */
  effort?: Maybe<Scalars['String']['output']>;
  /** When the run reached a terminal status. Null while unfinished. */
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Run id. */
  id: Scalars['ID']['output'];
  /** Attempts per case. */
  k: Scalars['Int']['output'];
  /** Model under test. Null when the driver default was used. */
  model?: Maybe<Scalars['String']['output']>;
  /** Content SHA of the prompt under test. */
  promptSha?: Maybe<Scalars['String']['output']>;
  /** Content SHA of the skill under test. */
  skillSha?: Maybe<Scalars['String']['output']>;
  /** When the run began executing. Null while pending. */
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Run lifecycle: pending, running, usage_limited (a resumable pause), completed, failed or cancelled. */
  status: Scalars['String']['output'];
  /** The run's trials ordered by attempt. */
  trials: Array<EvalTrial>;
};

/** A candidate run against a baseline run over the cases both have an outcome for. */
export type EvalRunComparison = {
  __typename?: 'EvalRunComparison';
  /** The baseline run's report. */
  base: EvalRunReport;
  /** The candidate run's report. */
  candidate: EvalRunReport;
  /** Cases that failed in the baseline and pass in the candidate. */
  improvedCaseIds: Array<Scalars['ID']['output']>;
  /** McNemar's test. Null when no case is shared. */
  mcnemar?: Maybe<EvalMcNemar>;
  /** Cases that passed in the baseline and fail in the candidate. */
  regressedCaseIds: Array<Scalars['ID']['output']>;
  /** Cases both runs have a counted outcome for. */
  sharedCases: Scalars['Int']['output'];
  /** Why the comparison may not mean what it appears to. */
  warnings: Array<EvalComparisonWarning>;
};

/** A run's report: the full config tuple, its graders, the headline numbers and a row per case. */
export type EvalRunReport = {
  __typename?: 'EvalRunReport';
  /** One row per case. */
  cases: Array<EvalReportCase>;
  /** Name of the dataset that was run. */
  datasetName: Scalars['String']['output'];
  /** Every grader that graded the run. */
  graders: Array<EvalReportGrader>;
  /** Headline numbers. */
  numbers: EvalReportNumbers;
  /** The run: driver, model, effort, prompt and skill SHAs, auth mode, dataset version, k, budgets and status. */
  run: EvalRun;
};

/** One attempt at one case within a run, linked to the trajectory that recorded it. */
export type EvalTrial = {
  __typename?: 'EvalTrial';
  /** Attempt number, starting at 1. */
  attempt: Scalars['Int']['output'];
  /** Case the trial attempted. */
  caseId: Scalars['ID']['output'];
  /** Cost of the attempt in USD. Null when unpriceable, which is not the same as zero. */
  costUsd?: Maybe<Scalars['Float']['output']>;
  /** When the trial was recorded. */
  createdAt: Scalars['DateTime']['output'];
  /** Wall-clock duration in milliseconds. Null when unknown. */
  durationMs?: Maybe<Scalars['Int']['output']>;
  /** Failure message for an errored trial. */
  error?: Maybe<Scalars['String']['output']>;
  /** Every grader's verdict on this trial, oldest first. */
  grades: Array<EvalGrade>;
  /** Trial id. */
  id: Scalars['ID']['output'];
  /** Human labels on the trial's trajectory, most recently updated first. Empty when the trial has no trajectory. */
  labels: Array<AgentTrajectoryLabel>;
  /** Run the trial belongs to. */
  runId: Scalars['ID']['output'];
  /** How the attempt ended: completed, errored, or usage_limited (a pause excluded from pass rates). */
  status: Scalars['String']['output'];
  /** The trajectory the attempt produced. Null when none was captured. */
  trajectoryId?: Maybe<Scalars['ID']['output']>;
};

export type EvaluatePlanRulesResultObject = {
  __typename?: 'EvaluatePlanRulesResultObject';
  /** True when a full plan-rules evaluation pass was enqueued. */
  enqueued: Scalars['Boolean']['output'];
  /** Plan id that was enqueued for evaluation. */
  planId: Scalars['String']['output'];
  /** Trigger kind recorded on the enqueued pass (always "manual" for this mutation). */
  triggerKind: Scalars['String']['output'];
};

/** Evaluated rollout flag for the current actor (kind + valueJson discriminator). */
export type FeatureFlagObject = {
  __typename?: 'FeatureFlagObject';
  /** Boolean flags: resolved variation value. Other kinds: true when reason is fallthrough. */
  enabled: Scalars['Boolean']['output'];
  /** Flag key. */
  key: Scalars['String']['output'];
  /** Flag value kind of the resolved variation. */
  kind: RolloutFlagKind;
  /** Why this variation was chosen. */
  reason: RolloutEvaluationReason;
  /** JSON-serialized resolved variation value (matches kind). */
  valueJson: Scalars['String']['output'];
  /** Index into the flag's variations array for the resolved value. */
  variationIndex: Scalars['Int']['output'];
};

export type ForceSettlePlanRunInput = {
  /** Plan-run row id to force-settle to STALE. Must be an IN_PROGRESS run that does not heartbeat; anything else is refused. */
  planRunId: Scalars['ID']['input'];
};

export type GeneratorDetailObject = {
  __typename?: 'GeneratorDetailObject';
  description: Scalars['String']['output'];
  name: Scalars['String']['output'];
  schemaJson?: Maybe<Scalars['String']['output']>;
};

export type GeneratorObject = {
  __typename?: 'GeneratorObject';
  description: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type GetAgentConversationMessagesInput = {
  conversationId: Scalars['ID']['input'];
  /** Page size (default 100, max 500) */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Offset for pagination */
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type GetGeneratorInput = {
  /** Generator name (e.g. from @tools/generators) */
  name: Scalars['String']['input'];
};

export type GetPlanEmbeddingInput = {
  /** Plan embedding id */
  id: Scalars['ID']['input'];
};

export type GetPlanOutputStreamChunkInput = {
  /** Chunk id */
  id: Scalars['ID']['input'];
};

export type GetPullInput = {
  /** Pull request number */
  number: Scalars['Int']['input'];
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Repository name */
  repo: Scalars['String']['input'];
};

export type GetTaskEmbeddingInput = {
  /** Task embedding id */
  id: Scalars['ID']['input'];
};

export type GitHubRepoInput = {
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Repository name */
  repo: Scalars['String']['input'];
  /** Filter by state: open, closed, or all */
  state: Scalars['String']['input'];
};

export type IndexCodeRepositoryResult = {
  __typename?: 'IndexCodeRepositoryResult';
  /** Registered repository id. */
  repositoryId: Scalars['String']['output'];
  /** Status after enqueue: indexing, or unavailable when no provider is configured. */
  status: Scalars['String']['output'];
};

export type JobObject = {
  __typename?: 'JobObject';
  /** JSON string of job data (e.g. { planId } for run-plan). */
  data?: Maybe<Scalars['String']['output']>;
  /** Execution backend selected once for this plan run. Present for plans queue jobs. */
  executionBackend?: Maybe<Scalars['String']['output']>;
  /** Error message if the job failed. */
  failedReason?: Maybe<Scalars['String']['output']>;
  /** Unix timestamp when the job finished. */
  finishedOn?: Maybe<Scalars['Float']['output']>;
  /** BullMQ job id. */
  id: Scalars['String']['output'];
  /** Job type name (e.g. run-plan). Future workflows may add more types; the queues schema is extensible per queue. */
  name?: Maybe<Scalars['String']['output']>;
  /** Unix timestamp when the job started processing. */
  processedOn?: Maybe<Scalars['Float']['output']>;
  /** Job progress (0-100 or custom). */
  progress?: Maybe<Scalars['Int']['output']>;
  /** Return value from the processor (if completed). */
  returnvalue?: Maybe<Scalars['String']['output']>;
  /** Job state: waiting, active, completed, failed, delayed. */
  state: Scalars['String']['output'];
  /** Task-run metrics (process memory/CPU at start and end). Present only for plans-queue jobs that completed with metrics. */
  taskRunMetrics?: Maybe<TaskRunMetrics>;
  /** Unix timestamp when the job was created. */
  timestamp?: Maybe<Scalars['Float']['output']>;
};

export type JobsResultObject = {
  __typename?: 'JobsResultObject';
  /** Whether more jobs exist after this page. */
  hasNext: Scalars['Boolean']['output'];
  /** Paginated list of jobs for the queue. */
  jobs: Array<JobObject>;
  /** Total jobs across the requested states (state-filtered), for accurate pagination. */
  total: Scalars['Int']['output'];
};

export type LabelAgentTrajectoryInput = {
  /** Free-text failure category, for example wrong-file. Blank is stored as null. */
  failureType?: InputMaybe<Scalars['String']['input']>;
  /** Free-text observation about the trajectory, at most 4000 characters. Blank is stored as null. */
  note?: InputMaybe<Scalars['String']['input']>;
  /** Trajectory being labelled. */
  trajectoryId: Scalars['ID']['input'];
  /** The verdict: pass or fail. Re-labelling replaces your own earlier label. */
  verdict: Scalars['String']['input'];
};

export type LastActivityCommitPartObject = {
  __typename?: 'LastActivityCommitPartObject';
  message?: Maybe<Scalars['String']['output']>;
  repo: Scalars['String']['output'];
  sha: Scalars['String']['output'];
};

export type LastActivityInput = {
  /** Plan ID (UUID). Returns the single most recent activity for this plan. */
  planId: Scalars['String']['input'];
  /** Optional task ID to scope the last activity to that task. */
  taskId?: InputMaybe<Scalars['String']['input']>;
};

export type LastActivityOutputChunkPartObject = {
  __typename?: 'LastActivityOutputChunkPartObject';
  content: Scalars['String']['output'];
  iteration?: Maybe<Scalars['Int']['output']>;
  /** Task this chunk is attributed to; null for plan-scoped chunks and historical rows. */
  taskId?: Maybe<Scalars['String']['output']>;
};

export type LastActivityResultObject = {
  __typename?: 'LastActivityResultObject';
  /** Timestamp of the activity. */
  at: Scalars['DateTime']['output'];
  commit?: Maybe<LastActivityCommitPartObject>;
  /** One of: commit, output_chunk, task_update. */
  kind: Scalars['String']['output'];
  outputChunk?: Maybe<LastActivityOutputChunkPartObject>;
  planId: Scalars['String']['output'];
  /** Human-readable summary for the answer. */
  summary: Scalars['String']['output'];
  taskId?: Maybe<Scalars['String']['output']>;
  taskUpdate?: Maybe<LastActivityTaskUpdatePartObject>;
};

export type LastActivityTaskUpdatePartObject = {
  __typename?: 'LastActivityTaskUpdatePartObject';
  status: Scalars['String']['output'];
  taskId: Scalars['String']['output'];
  taskTitle: Scalars['String']['output'];
};

export type LinesAddedDeletedInput = {
  /** Max merged PRs to fetch for diff stats (default 100); caps API calls. */
  maxPrs?: InputMaybe<Scalars['Int']['input']>;
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Bucket by week (YYYY-Www) or month (YYYY-MM); default month. */
  period?: InputMaybe<Scalars['String']['input']>;
  /** Repository name */
  repo: Scalars['String']['input'];
};

export type LinesAddedDeletedRowObject = {
  __typename?: 'LinesAddedDeletedRowObject';
  /** Total lines added across PRs in this bucket. */
  additions: Scalars['Int']['output'];
  /** GitHub author login. */
  author: Scalars['String']['output'];
  /** Total changed files across PRs in this bucket. */
  changedFiles: Scalars['Int']['output'];
  /** Total lines deleted across PRs in this bucket. */
  deletions: Scalars['Int']['output'];
  /** Period bucket (e.g. YYYY-MM or YYYY-Www in UTC). */
  period: Scalars['String']['output'];
  /** Number of merged PRs in this bucket. */
  prCount: Scalars['Int']['output'];
};

export type ListAgentConversationMessagesResultObject = {
  __typename?: 'ListAgentConversationMessagesResultObject';
  messages: Array<AgentConversationMessageObject>;
  totalCount: Scalars['Int']['output'];
};

export type ListAgentConversationsInput = {
  /** Page size (default 20, max 100) */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Offset for pagination */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Filter by status: active or archived (default active) */
  status?: InputMaybe<Scalars['String']['input']>;
};

export type ListAgentConversationsResultObject = {
  __typename?: 'ListAgentConversationsResultObject';
  conversations: Array<AgentConversationObject>;
  totalCount: Scalars['Int']['output'];
};

/** Input for listing custom prompts with optional filters */
export type ListCustomPromptsInput = {
  /** Include soft-deleted prompts */
  includeDeleted?: Scalars['Boolean']['input'];
  /** Filter by labels (matches any) */
  labels?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by project ID */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by prompt type */
  promptType?: InputMaybe<CustomPromptType>;
  /** Search by title (case-insensitive partial match) */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter by user ID */
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type ListPlanMessagesInput = {
  /** Return only these kinds. Omit for every kind. */
  kinds?: InputMaybe<Array<PlanMessageKind>>;
  /** Plan whose inbox to list. */
  planId: Scalars['ID']['input'];
  /** Return only these statuses. Omit for every status. */
  statuses?: InputMaybe<Array<PlanMessageStatus>>;
};

export type ListPlanOutputStreamChunksInput = {
  /** Max rows to return (default and hard cap: 1000). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Rows to skip (pagination offset). */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Plan id to list chunks for */
  planId: Scalars['ID']['input'];
  /** Return only chunks attributed to this task id. Omit for the whole plan stream (both tagged and untagged chunks). */
  taskId?: InputMaybe<Scalars['ID']['input']>;
};

export type ListPlanSourceObject = {
  __typename?: 'ListPlanSourceObject';
  /** Plan UUID. */
  id: Scalars['String']['output'];
  /** Plan title. */
  title: Scalars['String']['output'];
};

export type ListPlansByStatusInput = {
  /** Filter by author or assignee (any match). Empty means no assignee filter. */
  assignees?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** Sort by "created" or "updated" */
  sortBy?: InputMaybe<Scalars['String']['input']>;
  /** Sort order "asc" or "desc" */
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  /**
   * Filter by plan status. Empty or including "all" means no status filter. Values must be canonical PlanTaskStatus labels (uppercase, e.g. IN_PROGRESS).
   * @deprecated Use statusesEnum (typed PlanTaskStatus) for an introspectable, validated filter. String statuses are still accepted (case-insensitive) and merged with statusesEnum.
   */
  statuses?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  /** Filter by plan status using the typed PlanTaskStatus enum (preferred over statuses). Merged with any values passed in statuses. */
  statusesEnum?: InputMaybe<Array<InputMaybe<PlanTaskStatus>>>;
  /** Filter plans whose title contains this substring (case-insensitive) */
  titleSubstring?: InputMaybe<Scalars['String']['input']>;
};

export type ListPlansByStatusResultObject = {
  __typename?: 'ListPlansByStatusResultObject';
  plans: Array<PlanObject>;
  totalCount: Scalars['Int']['output'];
};

export type ListPullsInput = {
  /** Filter by base branch */
  base?: InputMaybe<Scalars['String']['input']>;
  /** Filter by merged (true/false); omit for no filter */
  merged?: InputMaybe<Scalars['Boolean']['input']>;
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Repository name */
  repo: Scalars['String']['input'];
  /** Filter by state: open, closed, or all */
  state?: InputMaybe<Scalars['String']['input']>;
};

export type ListSourceInfoObject = {
  __typename?: 'ListSourceInfoObject';
  /** Human-readable description. */
  description: Scalars['String']['output'];
  /** Source name (e.g. plan, task, documentation). */
  name: Scalars['String']['output'];
};

export type ListSourcesResultObject = {
  __typename?: 'ListSourcesResultObject';
  /** All plans (id, title) for discovery. */
  plans: Array<ListPlanSourceObject>;
  /** Knowledge-base source types and descriptions. */
  sources: Array<ListSourceInfoObject>;
};

/** System load average from os.loadavg(). */
export type LoadAverageMetrics = {
  __typename?: 'LoadAverageMetrics';
  /** Number of logical CPUs. */
  cpuCount: Scalars['Int']['output'];
  /** 1-minute load average. */
  load1m: Scalars['Float']['output'];
  /** 5-minute load average. */
  load5m: Scalars['Float']['output'];
  /** 15-minute load average. */
  load15m: Scalars['Float']['output'];
  /** Per-core load (load1m / cpuCount). > 1 means oversubscribed. */
  perCoreLoad1m: Scalars['Float']['output'];
};

export type LoginInput = {
  /** User email */
  email: Scalars['String']['input'];
  /** User password */
  password: Scalars['String']['input'];
};

export type LoginResultObject = {
  __typename?: 'LoginResultObject';
  /** JWT access token to send in Authorization header or cookie */
  accessToken: Scalars['String']['output'];
};

export type McpConnectorConnectionObject = {
  __typename?: 'McpConnectorConnectionObject';
  /** Auth mechanism recorded at connect time: api_token or oauth. */
  authType: Scalars['String']['output'];
  connectedAt: Scalars['DateTime']['output'];
  /** Catalog key this connection is for. */
  connectorKey: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  credentialLabel?: Maybe<Scalars['String']['output']>;
  /** Masked credential hint for display (api_token only); never the raw secret. */
  credentialPrefix?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export type McpConnectorConnectionResultObject = {
  __typename?: 'McpConnectorConnectionResultObject';
  /** The connection after the mutation (credential hash is never returned). */
  connection: McpConnectorConnectionObject;
};

export type McpConnectorObject = {
  __typename?: 'McpConnectorObject';
  /** Auth mechanism: api_token or oauth. */
  authType: Scalars['String']['output'];
  category: Scalars['String']['output'];
  description: Scalars['String']['output'];
  docsUrl: Scalars['String']['output'];
  /** Remote endpoint URL, or null for local-stdio / directory-brokered connectors. */
  endpointUrl?: Maybe<Scalars['String']['output']>;
  /** Icon hint slug for the UI to resolve. */
  iconHint: Scalars['String']['output'];
  /** Stable catalog key; referenced by a connection's connectorKey. */
  key: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Source registry/host: anthropic-directory, mcp-registry, or vendor-remote. */
  provider: Scalars['String']['output'];
  /** Transport: local-stdio, remote-http, or remote-sse. */
  transport: Scalars['String']['output'];
};

/** Metrics namespace: server snapshot and plan-run metrics. serverMetrics at root remains for backward compatibility. */
export type MetricsObject = {
  __typename?: 'MetricsObject';
  /** Last N completed plan runs with task-run metrics for the given plan. Ordered newest first. Use for plan-level metrics visualization. */
  recentPlanRunsMetrics: Array<PlanRunMetricsEntry>;
  /** Current process CPU and memory snapshot. Same data as root serverMetrics query. */
  serverSnapshot: ServerMetricsObject;
};

/** Metrics namespace: server snapshot and plan-run metrics. serverMetrics at root remains for backward compatibility. */
export type MetricsObjectRecentPlanRunsMetricsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  planId: Scalars['ID']['input'];
};

/** A registered repository_checkouts row of kind worktree that discovery could not match to a live worktree. Reported only — removing the row is the explicit pruneWorktreeCheckouts mutation. */
export type MissingWorktreeCheckoutObject = {
  __typename?: 'MissingWorktreeCheckoutObject';
  /** The orphaned repository_checkouts row. */
  checkoutId: Scalars['ID']['output'];
  /** The path as registered. It no longer resolves, so it is not symlink-resolved. */
  path: Scalars['String']['output'];
  /** Whether the path is gone or merely is not a worktree. */
  reason: MissingWorktreeCheckoutReason;
  /** The repository the row belongs to. */
  repositoryId: Scalars['ID']['output'];
};

/** Why a registered worktree checkout has no live worktree behind it. */
export const MissingWorktreeCheckoutReason = {
  /** Something exists at the path, but it is not a linked worktree — a husk directory with no .git, or a real clone. */
  NotAWorktree: 'NOT_A_WORKTREE',
  /** Nothing exists at the path any more. */
  PathGone: 'PATH_GONE',
} as const;

export type MissingWorktreeCheckoutReason =
  (typeof MissingWorktreeCheckoutReason)[keyof typeof MissingWorktreeCheckoutReason];
export type ModelEndpointObject = {
  __typename?: 'ModelEndpointObject';
  /** OpenAI-compatible /v1 base URL, e.g. http://localhost:11434/v1. Reflects the server's network vantage point. */
  baseUrl: Scalars['String']['output'];
  /** Host the endpoint was reached on, e.g. localhost or host.docker.internal. */
  host: Scalars['String']['output'];
  /** Sorted, de-duplicated model ids advertised by /v1/models (empty when the server is idle). */
  models: Array<Scalars['String']['output']>;
  /** Port the endpoint was reached on. */
  port: Scalars['Int']['output'];
  /** Best-effort provider label (ollama, lmstudio) or null when not fingerprinted. */
  provider?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Add a child under a parent fragment, at sortOrder or last. BAD_USER_INPUT for a cycle or a tree deeper than 10; CONFLICT if the edge exists. */
  addCmsFragmentChild: CmsFragmentChildObject;
  /** Attach a lifecycle hook to a plan (anchorTaskId omitted → beforeAll/afterAll, or beforeEach/afterEach with scope 'each') or to a task (anchorTaskId set → per-task before/after). The hook is materialized as a task row carrying hook_role/scope/source. */
  addHook: TaskObject;
  /** Add a permission to a role */
  addPermissionToRole: Scalars['Boolean']['output'];
  /** Attach a tag to a plan. The tag must be in the caller's skill-tag vocabulary; source is derived from the caller identity. At most one phase tag per plan (equal-or-lower provenance is replaced, higher rejects). */
  addPlanTag: PlanTagObject;
  /** Attach a domain tag to a project_skills row. The tag must be in the caller's skill-tag vocabulary; phase tags are rejected. Idempotent when the tag is already present. Omit projectId to target the dogfood monorepo project. */
  addProjectSkillTag: ProjectSkillObject;
  /** Attach a tag to a project. The tag must be in the caller's skill-tag vocabulary; source is derived from the caller identity. Multiple tags per project are allowed (no phase-tag limit). Re-runs plan-rules evaluation for every plan in the project. */
  addProjectTag: ProjectTagObject;
  /** Add a rule to a project's rule set (creating the rule set with the default "allow" posture if absent). Tag references are validated against the caller's skill-tag vocabulary. */
  addSkillAvailabilityRule: SkillAvailabilityRuleObject;
  /** Add a kebab-case tag to the authenticated user's skill-tag vocabulary. */
  addSkillTag: SkillTagObject;
  /** Attach a tag to a task. The tag must be in the caller's skill-tag vocabulary; source is derived from the caller identity. */
  addTaskTag: TaskTagObject;
  /** Register a server-host folder: validates and inspects the path, reconciles identity via the OT manifest or normalized git remote, creates or relinks the checkout, and returns the enriched graph. */
  addWorkspaceFolder: AddWorkspaceFolderPayloadObject;
  /** Agents namespace: run one chat turn against the server-side agents path (OpenThrottle / MCP developer). Returns assistant text, mcpTool, structuredPayloadJson, and toolMetadataJson; uses errorMessage instead of throws for expected validation failures. */
  agentsRunChatTurn: AgentsChatTurnResult;
  /** Append a chunk to a plan's output stream (e.g. agent iteration log). */
  appendPlanOutput: PlanOutputStreamChunkObject;
  /** Apply enabled editor configuration (MCP, skills paths, rules dirs) to linked local repositories. */
  applyWorkspaceEditorConfiguration: ApplyWorkspaceEditorConfigurationResultObject;
  /** Archive an owned agent conversation (no hard delete in v1). */
  archiveAgentConversation: AgentConversationObject;
  /** Archive a blog post. It stops being publicly visible; publishedAt is kept. Returns BlogPostNotFoundError for an unknown post. */
  archiveBlogPost: ArchiveBlogPostResult;
  /** Assign a role to a service account (admin, human only). */
  assignRoleToServiceAccount: Scalars['Boolean']['output'];
  /** Assign a role to a user */
  assignRoleToUser: Scalars['Boolean']['output'];
  attachWorkSessionSubject: WorkSessionSubjectObject;
  /** Calibrate a judge over one run in one call: pair its judge grades with human labels on the trials' trajectories, compute kappa (bootstrap 95% CI), catch rate, false-fail rate and gating status, and record the row. Judge error verdicts are excluded and counted separately. */
  calibrateJudgeForRun: CalibrateJudgeForRunResult;
  /** Abort an in-flight streamed turn for an owned conversation. Returns true when a stream was aborted. */
  cancelConversationStream: Scalars['Boolean']['output'];
  /** Cancel BullMQ plan-run jobs for a plan: removes waiting or delayed jobs, and signals the worker to stop the Ralph child when a job is active (cannot be removed from Redis without the lock token). Also cancels the plan's SCHEDULED runs (delayed job removed, run settled CANCELLED). With planRunId naming a SCHEDULED run of the plan, cancels ONLY that run (its delayed job and row), leaving any other active run, the plan status and the tasks alone; a planRunId that is already settled is a no-op, and one that is QUEUED or IN_PROGRESS is rejected (omit planRunId to stop a live run). Idempotent: once a scheduled run has fired or settled there is nothing left to cancel. */
  cancelPlanRun: CancelPlanRunResultObject;
  /** Request cancellation of an in-flight run (durable marker + best-effort in-process abort). */
  cancelScheduledAgentJobRun: ScheduledAgentJobRunObject;
  /** Claim every PENDING STEER/QUEUE message on a plan for delivery at a task boundary. Marks them DELIVERED (stamping the run and task) and records the delivery on the plan output stream in one transaction, so a message is delivered at most once and never unrecorded. Returns STEERs first. */
  claimPlanMessages: ClaimPlanMessagesResultObject;
  /** Remove finished jobs (completed or failed only) from a queue. Destructive: requires confirm=true. Optional graceMs/limit bound which jobs are removed. */
  cleanQueue: CleanQueueResultObject;
  /** Copy a live fragment on its pinned schema version, optionally with a fresh copy of its live subtree, in one transaction. The copy has no parent. BAD_USER_INPUT when the subtree is past the tree cap. */
  cloneCmsFragment: CmsFragmentObject;
  /** Clone a git repository into OPENTHROTTLE_CHECKOUT_ROOT using ambient host credentials, then register it as a managed checkout via the same pipeline as addWorkspaceFolder. A failed clone leaves no rows and no partial directory; OT stores no credentials. */
  cloneRepository: AddWorkspaceFolderPayloadObject;
  /** Connect (or re-connect) a catalog connector for the authenticated user. For api_token connectors the token is stored as a bcrypt hash + masked hint; the raw token is never persisted. */
  connectMcpConnector: McpConnectorConnectionResultObject;
  /** Create an agent conversation for the authenticated human user. */
  createAgentConversation: AgentConversationObject;
  /** Create a blog post as a DRAFT. Returns BlogSlugConflictError when the slug is taken, BlogCoverAltRequiredError when a cover image has no alt text, and BlogReferenceNotFoundError for an unknown authorSlug. */
  createBlogPost: CreateBlogPostResult;
  /** Create a fragment on its typename's newest ACTIVE schema, prefilled with that schema's defaults and validated against it. BAD_USER_INPUT (with extensions.issues) when invalid. */
  createCmsFragment: CmsFragmentObject;
  /** Create a layout and its root fragment in one transaction. CONFLICT for a slug in use. */
  createCmsLayout: CmsLayoutSummaryObject;
  /** Add a component to a live library. BAD_USER_INPUT when propsSchemaJson does not compile. */
  createCmsLibraryComponent: CmsLibraryComponentObject;
  /** Create a new custom prompt */
  createCustomPrompt: CustomPromptObject;
  /** Create an eval dataset from recorded trajectories: each selected trajectory (typically a real failure) becomes a case with its gold answer. Re-using a name in the repository creates the next version. The creator is taken from your identity, never from input. */
  createEvalDatasetFromTrajectories: EvalDataset;
  /** Create a note */
  createNote: NoteObject;
  /** Create a plan */
  createPlan: PlanObject;
  /** Create many plans atomically in a single transaction. Every input is validated up front (same rules as createPlan); a single invalid input or DB failure rolls back the whole batch. */
  createPlans: CreatePlansResultObject;
  /** Create a project */
  createProject: ProjectObject;
  /** Create a queue dynamically. The queue is registered so it appears in queues() and queue(name). Returns success with queueName or error. */
  createQueue: CreateQueueResultObject;
  /** Create a role */
  createRole: RoleObject;
  /** Create a rollout feature flag */
  createRolloutFlag: RolloutFlagObject;
  /** Create a scheduled agent job. Validates cron, driver id, model/endpoint capability, and settings. */
  createScheduledAgentJob: ScheduledAgentJobObject;
  /** Create a service account (admin, human only). */
  createServiceAccount: ServiceAccountObject;
  /** Create a credential; returns plaintext token once (admin, human only). */
  createServiceAccountCredential?: Maybe<CreateServiceAccountCredentialResultObject>;
  /** Create a task */
  createTask: TaskObject;
  /** Create many tasks for one plan atomically in a single transaction. Omitted sortOrders append MAX+1000 stepping in array order; explicit per-item sortOrder is respected. Any failure rolls back the whole batch. */
  createTasks: CreateTasksResultObject;
  /** Create a user */
  createUser: UserObject;
  /**
   * Register a local filesystem repository for the authenticated user.
   * @deprecated Replaced by addWorkspaceFolder (repository/checkout model with auto-detected git metadata).
   */
  createWorkspaceLocalRepository: WorkspaceLocalRepositoryObject;
  /** Soft-delete an owned agent conversation (status=deleted; row + messages retained, hidden from the default list, reversible). */
  deleteAgentConversation: AgentConversationObject;
  /** Soft delete a fragment. CONFLICT while a live parent or layout still references it. */
  deleteCmsFragment: CmsFragmentObject;
  /** Soft delete a layout and its root fragment together. */
  deleteCmsLayout: CmsLayoutSummaryObject;
  /** Soft delete a library component. */
  deleteCmsLibraryComponent: CmsLibraryComponentObject;
  /** Soft delete a custom prompt by ID */
  deleteCustomPrompt: Scalars['Boolean']['output'];
  /** Delete a note by ID */
  deleteNote: Scalars['Boolean']['output'];
  /** Delete a plan by ID */
  deletePlan: Scalars['Boolean']['output'];
  /** Delete a plan's output chunks. With chunkId, deletes that single chunk (must belong to planId). Without chunkId, clears all chunks for planId, optionally scoped to taskId. */
  deletePlanOutput: DeletePlanOutputResult;
  /** Delete a project by ID. Related plans and tasks remain; their project link is cleared (ON DELETE SET NULL). */
  deleteProject: Scalars['Boolean']['output'];
  /** Delete a role */
  deleteRole: Scalars['Boolean']['output'];
  /** Delete a rollout feature flag */
  deleteRolloutFlag: Scalars['Boolean']['output'];
  /** Delete a scheduled agent job and its scheduler (owner only). Returns whether a row was removed. */
  deleteScheduledAgentJob: Scalars['Boolean']['output'];
  /** Delete a project's rule set (cascading its rules). Returns false when the project had no rule set. */
  deleteSkillAvailabilityRuleSet: Scalars['Boolean']['output'];
  /** Delete a tag→action rule (its ledger rows CASCADE). Returns false when absent. */
  deleteTagActionRule: Scalars['Boolean']['output'];
  /** Delete a task by ID */
  deleteTask: Scalars['Boolean']['output'];
  /**
   * Remove a local repository owned by the authenticated user.
   * @deprecated Replaced by the repository/checkout model; checkout removal moves to the new surface.
   */
  deleteWorkspaceLocalRepository: Scalars['Boolean']['output'];
  /** The teardown half of registerPlanRunWorktreeCheckout: called right after a worktree is removed, it deletes the actor's repository_checkouts row at that path so the repositories page stops listing a worktree that no longer exists. Runs the same guards as pruneWorktreeCheckouts — the row is kept (and the outcome says why) while the path is still a live worktree, while an unsettled plan run points at it, or when it is a primary checkout. Never touches the filesystem. Resolves a service-account token through its acting user like registration does; an unresolvable actor reports NOT_FOUND rather than throwing, so a teardown can call this best-effort. */
  deregisterWorktreeCheckout: DeregisterWorktreeCheckoutPayloadObject;
  /** Detach (delete) a lifecycle hook task by id. Only rows that are hooks (hook_role set) are removable this way. */
  detachHook: Scalars['Boolean']['output'];
  /** Disable a service account (admin, human only). */
  disableServiceAccount?: Maybe<ServiceAccountObject>;
  /** Disable a user; they will not be able to log in. */
  disableUser?: Maybe<UserObject>;
  /** Disconnect the authenticated user's connection for a connector. Returns true when a connection was removed. */
  disconnectMcpConnector: Scalars['Boolean']['output'];
  /** Duplicate a job (add new job with same data). Works for plans queue and future queues. Returns new job id or error. */
  duplicateJob: DuplicateJobResultObject;
  /** Re-enable a disabled service account (admin, human only). */
  enableServiceAccount?: Maybe<ServiceAccountObject>;
  /** Re-enable a disabled user. */
  enableUser?: Maybe<UserObject>;
  endWorkSession?: Maybe<WorkSessionObject>;
  /** Enqueue an agentic-test smoke job. Echoes the current ISO timestamp once per second for ~30s, then completes. Returns job id or error. */
  enqueueAgenticTest: EnqueueAgenticTestResultObject;
  /** Enqueue a deterministic mock payload on the agentic-test queue (agentic-workflow smoke path). Returns job metadata or error. */
  enqueueAgenticWorkflowMock: EnqueueAgenticWorkflowMockResultObject;
  /**
   * Deprecated no-op. Doc ingestion has been removed; always returns success: false with an error.
   * @deprecated Doc ingestion has been removed; this mutation always returns success: false.
   */
  enqueueDocIngestion: EnqueueDocIngestionResultObject;
  /** Enqueue an in-process Ralph orchestrator job (GraphQL-backed pipeline, no nested workflow-ralph process). Same queue position and plan/task status updates as enqueuePlanRun. */
  enqueuePlanRalphOrchestrator: EnqueuePlanRunResultObject;
  /** Canonical mutation to enqueue a spawn plan-run job (nested workflow-ralph in the worker). Used by the Developer app "Run plan" action and external clients. Returns job id, plan id, and queue position. For in-process orchestrator runs use enqueuePlanRalphOrchestrator instead. */
  enqueuePlanRun: EnqueuePlanRunResultObject;
  /** Manually enqueue a full tag→action rules evaluation pass for a plan. Fire-and-forget: the pass runs async on the plan-rules:evaluate queue and results land in the rule_applications ledger (read via planRuleApplications). The ack only confirms the pass was enqueued. */
  evaluatePlanRules: EvaluatePlanRulesResultObject;
  /** Force-settle an UNSUPERVISED plan run to STALE — the human escape hatch for a run whose agent is gone. Kill does not help here: cancelling an interactive run only stamps the cancel marker and waits for the agent to poll it, so a dead agent leaves the row IN_PROGRESS forever, reading as live and holding its worktree busy. Refused for a run that heartbeats (it has a sweeper of its own and may be genuinely live) and for one already terminal. Always writes STALE — 'contact lost' is what a human clicking this actually knows. Never touches plan or task status. Returns null when the run did not match. */
  forceSettlePlanRun?: Maybe<PlanRunObject>;
  /** Permanently delete a custom prompt by ID */
  hardDeleteCustomPrompt: Scalars['Boolean']['output'];
  /** Enqueue a full re-index of a registered repository's code. Returns indexing, or unavailable when no embeddings provider is configured. */
  indexCodeRepository: IndexCodeRepositoryResult;
  /** Install an allowlisted agent CLI on the server host by driver id. Gated by SETTINGS_WRITE and the default-off OT_AGENT_CLI_INSTALL_ENABLED flag; returns a runId to stream via agentSetupChunkAdded. */
  installAgentCli: StartAgentSetupResult;
  /** Record your verdict (pass or fail), optional failure type and note on an agent trajectory. One label per rater per trajectory: re-labelling replaces your own. The rater is taken from your identity, never from input. */
  labelAgentTrajectory: AgentTrajectoryLabel;
  /** Sign in with email and password. Returns JWT access token for Authorization header or cookie. */
  login: LoginResultObject;
  /** Mint a short-lived token (scoped to the current user) for authenticating a graphql-ws subscription connection via connectionParams.authToken. */
  mintSubscriptionToken: Scalars['String']['output'];
  /** Pause a queue: workers stop picking up new jobs while in-flight jobs finish. Reversible via resumeQueue. */
  pauseQueue: QueueControlResultObject;
  /** Open the host OS folder dialog and return the chosen absolute server-host path, or null on user-cancel. Guarded by the same same-machine predicate as workspacePickerCapabilities (re-checked before spawning) and bounded by a kill timeout. Does not register anything — the client confirms and calls addWorkspaceFolder. */
  pickFolderNative: PickFolderNativePayloadObject;
  /** Post a human message to a plan's inbox. STEER and QUEUE start PENDING and are delivered to the plan's live (or next) run at its next task boundary; FEEDBACK is recorded and never delivered. */
  postPlanMessage: PlanMessageObject;
  /** Promote a task into a new, first-class plan. Validates the task is promotable (exists, not a lifecycle hook, not already promoted) then enqueues an async task-promotion job (enqueue-after-validate, idempotency key doubles as the BullMQ job id). The job creates the plan, carries the task's tags, seeds an initial task, closes out the source task (→ PROMOTED + `promoted` tag), and records provenance. Returns the accepted job id; the new plan surfaces via the task-status subscription once the job completes. */
  promoteTaskToPlan: PromoteTaskToPlanResultObject;
  /** Delete registered worktree checkout rows whose worktree is gone — the cleanup for discoveredWorktrees.missingCheckouts. Rows only: never touches the filesystem and never deletes a primary checkout. Each id is re-checked server-side and skipped, not failed, when its path is a live worktree or an unsettled plan run still points at it. */
  pruneWorktreeCheckouts: PruneWorktreeCheckoutsPayloadObject;
  /** Publish a blog post: sets status PUBLISHED and publishedAt. Without publishedAt the post goes live now; a future publishedAt schedules it. Returns BlogPostNotFoundError for an unknown post. */
  publishBlogPost: PublishBlogPostResult;
  /** Record an ATIF trajectory for a plan run. With an idempotencyKey a duplicate is a successful no-op that returns the stored row. The document is validated, capped at 4 MiB server-side (elided observations set truncated) and summarized into token, cost and tool-call columns. */
  recordAgentTrajectory: AgentTrajectory;
  /** Record one grader's verdict on a trial with the grader id and version and, for judges, the judge model. An error verdict needs errorReason; a judge needs judgeModel. Re-recording the same trial, grader id and version replaces the earlier row. */
  recordEvalGrade: EvalGrade;
  /** Record an eval run over a dataset. The dataset version is read from the dataset and the creator from your identity, never from input. */
  recordEvalRun: EvalRun;
  /** Record one attempt at one case. Re-recording the same run, case and attempt replaces the earlier row, so a resumed run can re-record a usage_limited trial. */
  recordEvalTrial: EvalTrial;
  /** Record a judge calibration whose statistics were computed elsewhere. History is append-only. The creator is read from your identity, never from input. */
  recordJudgeCalibration: EvalJudgeCalibration;
  /** Bump the liveness heartbeat on a detached-CLI run row (from registerCliPlanRun). The CLI calls this on a ~15s timer so a hard crash (SIGKILL/power-loss) leaves a stale heartbeat the reader/sweeper can detect. Keyed on the run id. Returns null when the row no longer exists. */
  recordPlanRunHeartbeat?: Maybe<PlanRunObject>;
  /** Record one harness-captured skill invocation. Args must already be privacy-processed by the client; the server stores them as-sent. The event is attributed to the human user the authenticated principal acts as, resolved server-side — a userId is never accepted from the client, and stays null when the principal resolves to no one. */
  recordSkillUsage: SkillUsageEventObject;
  /** Record one opt-in outcome/duration enrichment for a skill we author. Correlates to a harness start by sessionId + skillName. Additive to PreToolUse capture — never a replacement. Missing outcomes are a valid state. */
  recordSkillUsageOutcome: SkillUsageOutcomeObject;
  /** Batch-ingest hook-captured token usage rows (at most 500). Rows are attributed to the human user the authenticated principal acts as (human JWT, or a service account's acting user); a userId is never accepted from the client. Idempotent: rows whose (source, sessionId, requestId) already exist are skipped. created_at is the row's occurredAt, not ingest time. Any invalid row rejects the whole batch with BAD_REQUEST naming the row index. */
  recordTokenUsage: RecordTokenUsageResultObject;
  recordWorkArtifact: WorkArtifactObject;
  /** Re-run inspection on an owned checkout and surface drift (path missing, remote changed, branch moved). */
  refreshCheckout: RefreshCheckoutPayloadObject;
  /** Register a new user. Returns id, email, and JWT access token. */
  register: RegisterResultObject;
  /** Register a detached workflow-ralph CLI run as a first-class plan_runs row (bullmqJobId NULL, runKind 'orchestrator', status IN_PROGRESS) so cancelPlanRun has a row to stamp the durable cancel marker on. Creates NO BullMQ job. The CLI calls this on start, polls the marker each iteration boundary, and settles the row via settleCliPlanRun on exit. */
  registerCliPlanRun: PlanRunObject;
  /** Best-effort register of a linked git worktree as a repository_checkout for the run actor, then point plan_runs.checkout_id and branch at that worktree (overwrites a scheduling-time primary checkout). Soft-fails (returns the run unchanged) when the path is not a linked worktree, repository resolution fails, or upsert errors. The actor resolves through its acting user, so a service-account token (the MCP) works when the account is linked to one; an unlinked account resolves to null and soft-fails like any other unresolvable actor. Returns null when the plan-run row does not exist. */
  registerPlanRunWorktreeCheckout?: Maybe<PlanRunObject>;
  /** Remove your own label on an agent trajectory. Returns false when you had none; other raters' labels are never touched. */
  removeAgentTrajectoryLabel: Scalars['Boolean']['output'];
  /** Remove a child from a parent fragment. The child fragment itself is kept. */
  removeCmsFragmentChild: CmsFragmentChildObject;
  /** Remove a permission from a role */
  removePermissionFromRole: Scalars['Boolean']['output'];
  /** Remove one server-provisioned plan-run worktree from disk through the ot-worktree destroy action (destroy.sh, never a pnpm script, so it works in any repo): the repo's teardown hook runs, the directory and its checkout record go, and the branch is kept. Never forced — a primary checkout, a worktree OpenThrottle did not provision, a dirty or unpushed tree, or one an unsettled run still points at is kept and the outcome says why. */
  removePlanRunWorktree: RemovePlanRunWorktreePayloadObject;
  /** Remove a tag from a plan under the provenance ladder (an agent cannot remove a human row; server-llm removes only its own). Returns false when the tag was not present. */
  removePlanTag: Scalars['Boolean']['output'];
  /** Delete one project_skills row by slug. Distinct from ingest: vanished skills stay as orphans until this explicit remove. Omit projectId to target the dogfood monorepo project. Returns false when no row matched. */
  removeProjectSkill: Scalars['Boolean']['output'];
  /** Remove a tag from a project_skills row. Returns false when the row or tag is absent (never a 500). Omit projectId to target the dogfood monorepo project. */
  removeProjectSkillTag: Scalars['Boolean']['output'];
  /** Remove a tag from a project under the provenance ladder (an agent cannot remove a human row; server-llm removes only its own). Returns false when the tag was not present. Re-runs plan-rules evaluation for every plan in the project when a tag was removed. */
  removeProjectTag: Scalars['Boolean']['output'];
  /** Remove a repeatable (scheduled) job by key. Key is returned by repeatableJobs(queueName). */
  removeRepeatableJob: RemoveRepeatableJobResultObject;
  /** Remove a role from a service account (admin, human only). */
  removeRoleFromServiceAccount: Scalars['Boolean']['output'];
  /** Remove a role from a user */
  removeRoleFromUser: Scalars['Boolean']['output'];
  /** Remove a rule by id. Returns false when the rule was not present. */
  removeSkillAvailabilityRule: Scalars['Boolean']['output'];
  /** Remove a tag from the authenticated user's skill-tag vocabulary. Returns false when the tag was not present. */
  removeSkillTag: Scalars['Boolean']['output'];
  /** Remove a tag from a task under the provenance ladder. Returns false when the tag was not present. */
  removeTaskTag: Scalars['Boolean']['output'];
  /** Rename a tag in the authenticated user's skill-tag vocabulary. */
  renameSkillTag: SkillTagObject;
  /** Reorder a parent's children. childUuids must list exactly the current children. */
  reorderCmsFragmentChildren: Array<CmsFragmentChildObject>;
  /** Reorder tasks within a plan. Renumbers sortOrder 1000, 2000, … in taskIds order atomically. */
  reorderPlanTasks: Array<TaskObject>;
  /** Replace the ATIF document on an existing trajectory in place, keeping its id so human labels keyed by trajectory id survive. Used by the session re-segment operator when a task's boundaries change. The document is validated and capped the same way as recordAgentTrajectory. */
  replaceAgentTrajectory: AgentTrajectory;
  /** Move a SCHEDULED plan run's fire time in place: the run keeps its id, its frozen run config snapshot and its job; only scheduledFor and the delayed job's delay change. Same rule as schedulePlanRun (future, within 30 days). Rejected when the run is not SCHEDULED or its job is already starting. Never changes the plan or task statuses. */
  reschedulePlanRun: SchedulePlanRunResultObject;
  /** Answer a pending ACP permission request surfaced in an owned conversation: optionId selects one of the offered options, null cancels. Returns false for an unknown or already settled requestId. */
  respondToConversationPermission: Scalars['Boolean']['output'];
  /** Restore a soft-deleted custom prompt */
  restoreCustomPrompt?: Maybe<CustomPromptObject>;
  /** Resume a paused queue so workers pick up jobs again. */
  resumeQueue: QueueControlResultObject;
  /** Retry a failed job. Validates queue exists and job is in failed state. Returns job id or error. */
  retryJob: RetryJobResultObject;
  /** Revoke a service account credential (admin, human only). */
  revokeServiceAccountCredential: Scalars['Boolean']['output'];
  /** Enqueue an immediate one-off run (owner only); allowed even when the schedule is disabled. */
  runScheduledAgentJobNow: ScheduledAgentJobRunObject;
  /** Schedule a plan run for a later instant: the enqueuePlanRun input plus scheduledFor. Records a SCHEDULED plan_runs row with a frozen run config snapshot and a delayed job that starts it. scheduledFor must be in the future and within 30 days (SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS). Does not change the plan or task statuses (the plan stays as it is until the run fires). Cancel with cancelPlanRun (pass planRunId to cancel just this run). */
  schedulePlanRun: SchedulePlanRunResultObject;
  /** Relay one ~250ms chunk of base64-encoded 16kHz mono Int16 PCM to the session's WhisperLive connection. Executed over the same authenticated graphql-ws socket as the subscription. Returns false (no throw) for unauthenticated, unknown, foreign, or already-stopping sessions. */
  sendTranscriptionAudioChunk: Scalars['Boolean']['output'];
  /** Enable or disable an agent CLI backend for the current user. A disabled agent is hidden from chat/model pickers and rejected when starting new runs. Presence-as-disabled: enabled=false records the preference, enabled=true clears it (default is enabled). Gated by SETTINGS_WRITE, in parity with install/update; rejects unknown backends. */
  setAgentEnabled: SetAgentEnabledResult;
  /** Enable or disable a single MODEL of an agent CLI backend for the current user. A disabled model is hidden from chat/model pickers and rejected when starting new runs, even while the agent itself stays enabled (an agent-level OFF hard-overrides all its models). Presence-as-disabled: enabled=false records the preference, enabled=true clears it (default is enabled). Gated by SETTINGS_WRITE; rejects unknown backends. */
  setAgentModelEnabled: SetAgentModelEnabledResult;
  /** Star or unstar a single MODEL of an agent CLI backend for the current user. Favorited models float to the top of / are highlighted in chat/model pickers and run selection. Favoriting is orthogonal to enablement — it never enables a disabled model. Presence-as-favorite: favorite=true records the star, favorite=false clears it. Gated by SETTINGS_WRITE; rejects unknown backends. */
  setAgentModelFavorite: SetAgentModelFavoriteResult;
  /** Bulk enable or disable EVERY model of an agent CLI backend for the current user (the select-all / deselect-all affordance). enabled=true clears all per-model disables for the backend; enabled=false records each supplied model id as disabled. An agent-level OFF still hard-overrides all its models. Gated by SETTINGS_WRITE; rejects unknown backends. */
  setAgentModelsEnabled: SetAgentModelsEnabledResult;
  /** Replace the full set of tags on a blog post by tag slug. A caller holding only blog:draft may tag DRAFT posts; for any other post it gets BlogPostPublishPermissionRequiredError. Also returns BlogPostNotFoundError and BlogReferenceNotFoundError (unknown tag slug). */
  setBlogPostTags: SetBlogPostTagsResult;
  /** Enable or disable the authenticated user's connection for a connector. */
  setMcpConnectorEnabled?: Maybe<McpConnectorConnectionResultObject>;
  /** Set a plan's status (e.g. COMPLETED). Convenience mutation for Mark Complete; equivalent to updatePlan with { id, status }. */
  setPlanStatus?: Maybe<PlanObject>;
  /** Enable or disable a scheduled agent job (owner only); registers/removes its scheduler. */
  setScheduledAgentJobEnabled: ScheduledAgentJobObject;
  /**
   * Assign, change, or clear the OpenThrottle project link for a local repository.
   * @deprecated Project links now live on the repository row; use the repository-level surface.
   */
  setWorkspaceLocalRepositoryProject: WorkspaceLocalRepositoryObject;
  /** Settle a detached-CLI run row (from registerCliPlanRun) on exit: set the terminal status (COMPLETED, CANCELLED, FAILED, or USAGE_LIMITED) and clear the run-location columns. USAGE_LIMITED also records usageLimitResetsAt / usageLimitType. Settling USAGE_LIMITED schedules no resume: a detached CLI run has no queued job to continue, so it is re-run by hand after the reset. Keyed on the run id. Returns null when the row no longer exists. */
  settleCliPlanRun?: Maybe<PlanRunObject>;
  /** Sign out. Returns success; client is responsible for clearing the auth cookie. */
  signout: SignoutResultObject;
  /** Start a streamed assistant turn against a discovered local model. Persists the user message, returns the assistant message id to correlate the in-flight stream, and emits token deltas over conversationStreamChunkAdded. Uses errorMessage for expected validation failures. */
  startConversationStream: StartConversationStreamResult;
  /** Mint a transcription session: the server opens a websocket to the local WhisperLive service (WHISPER_SERVICE_URL — env-only, never client-supplied) and returns the session id to stream audio to. Must be executed over an authenticated graphql-ws connection (the audio mutations ride the same socket). A user's previous active session is closed first. Uses errorMessage for expected failures (unconfigured / unreachable). */
  startTranscriptionStream: StartTranscriptionStreamResult;
  startWorkSession: WorkSessionObject;
  /** Flush and finalize an owned transcription session: sends END_OF_AUDIO upstream, waits a short flush window for the last revising segments, then emits the terminal done:true snapshot. Returns false (no throw) for unauthenticated, unknown, or foreign sessions. */
  stopTranscriptionStream: Scalars['Boolean']['output'];
  /** Append a sample structured log line (JSONL + hub). Requires OT_SERVER_DEV_JSONL_LOGGING=true at startup. See packages/nestjs-logging README. */
  triggerDevJsonlLogSample: Scalars['Boolean']['output'];
  /** Trigger a test websocket notification (system.alert). Returns true when the event was emitted. Use from the web app to verify the notification flow end-to-end. */
  triggerWebsocketNotification: Scalars['Boolean']['output'];
  /** Return a blog post to DRAFT and clear its publishedAt. It stops being publicly visible immediately. Returns BlogPostNotFoundError for an unknown post. */
  unpublishBlogPost: UnpublishBlogPostResult;
  /** Update an allowlisted agent CLI on the server host by driver id. Gated by SETTINGS_WRITE and the default-off OT_AGENT_CLI_INSTALL_ENABLED flag; returns a runId to stream via agentSetupChunkAdded. */
  updateAgentCli: StartAgentSetupResult;
  /** Update the title on an owned agent conversation. */
  updateAgentConversationTitle: AgentConversationObject;
  /** Partially update a blog post. A caller holding only blog:draft may edit DRAFT posts; for any other post it gets BlogPostPublishPermissionRequiredError. Also returns BlogPostNotFoundError, BlogSlugConflictError, BlogCoverAltRequiredError, BlogReferenceNotFoundError (unknown authorSlug) and, when expectedUpdatedAt no longer matches, BlogPostStaleWriteError. */
  updateBlogPost: UpdateBlogPostResult;
  /** Rename a fragment and/or replace its properties, validated against the fragment's pinned schema version. */
  updateCmsFragment: CmsFragmentObject;
  /** Change a layout's name, slug, status, tags or metadata. */
  updateCmsLayout: CmsLayoutSummaryObject;
  /** Change a library component. */
  updateCmsLibraryComponent: CmsLibraryComponentObject;
  /** Update an existing custom prompt */
  updateCustomPrompt?: Maybe<CustomPromptObject>;
  /** Move an eval run to a new status. startedAt is stamped the first time it runs; finishedAt on completed, failed or cancelled, and cleared when a paused run resumes. */
  updateEvalRunStatus: EvalRun;
  /** Update a note */
  updateNote?: Maybe<NoteObject>;
  /** Update a plan */
  updatePlan?: Maybe<PlanObject>;
  /** Edit the body of a PENDING plan message. Delivered, withdrawn and recorded messages are immutable. */
  updatePlanMessage: PlanMessageObject;
  /** Update a project */
  updateProject?: Maybe<ProjectObject>;
  /** Edit an owned repository's name, default branch, and/or project link. Requires the authenticated user to own a checkout of the repository. */
  updateRepository: RepositoryObject;
  /** Update a role */
  updateRole?: Maybe<RoleObject>;
  /** Update a rollout feature flag */
  updateRolloutFlag?: Maybe<RolloutFlagObject>;
  /** Update a scheduled agent job (owner only). Re-projects the BullMQ scheduler. */
  updateScheduledAgentJob: ScheduledAgentJobObject;
  /** Update a service account (admin, human only). */
  updateServiceAccount?: Maybe<ServiceAccountObject>;
  /** Replace a rule's tag/slug lists and environment by rule id. Tag references are validated against the caller's skill-tag vocabulary. */
  updateSkillAvailabilityRule: SkillAvailabilityRuleObject;
  /** Update a task */
  updateTask?: Maybe<TaskObject>;
  /** Update a user */
  updateUser?: Maybe<UserObject>;
  /** Update the authenticated user's preferences. An omitted field is left unchanged; an explicit null clears it to the system default. */
  updateUserPreferences: UserPreferencesObject;
  /**
   * Update metadata for a local repository owned by the authenticated user.
   * @deprecated Replaced by the repository/checkout model (refreshCheckout re-derives git metadata from disk).
   */
  updateWorkspaceLocalRepository: WorkspaceLocalRepositoryObject;
  /** Update contact fields and/or enabled editors on the authenticated user's workspace profile. */
  updateWorkspaceProfile: UserWorkspaceProfileObject;
  /** Create the blog author with this slug, or replace its fields if it exists. */
  upsertBlogAuthor: BlogAuthorObject;
  /** Create the blog tag with this slug, or replace its fields if it exists. */
  upsertBlogTag: BlogTagObject;
  /** Create or update a project's rule set, setting its posture ("allow" | "deny"). Idempotent per project. */
  upsertSkillAvailabilityRuleSet: SkillAvailabilityRuleSetObject;
  /** Create or update a tag→action rule. The JSON payload is validated against the action type's schema. */
  upsertTagActionRule: TagActionRuleObject;
  /** Withdraw a PENDING plan message so no run receives it. */
  withdrawPlanMessage: PlanMessageObject;
  /**
   * Deprecated alias for enqueuePlanRun. Enqueues a spawn plan-run job with the same input and result shape.
   * @deprecated Use enqueuePlanRun. Identical spawn enqueue behavior; retained for backward-compatible clients only.
   */
  workflowPlanRun: EnqueuePlanRunResultObject;
  /** Write a custom prompt to the file system at its configured filePath */
  writeCustomPromptToFileSystem: Scalars['Boolean']['output'];
};

export type MutationAddCmsFragmentChildArgs = {
  childUuid: Scalars['String']['input'];
  parentUuid: Scalars['String']['input'];
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
};

export type MutationAddHookArgs = {
  input: AddHookInput;
};

export type MutationAddPermissionToRoleArgs = {
  input: AddPermissionToRoleInput;
};

export type MutationAddPlanTagArgs = {
  input: AddPlanTagInput;
};

export type MutationAddProjectSkillTagArgs = {
  input: AddProjectSkillTagInput;
};

export type MutationAddProjectTagArgs = {
  input: AddProjectTagInput;
};

export type MutationAddSkillAvailabilityRuleArgs = {
  input: SkillAvailabilityRuleInput;
  projectId: Scalars['ID']['input'];
};

export type MutationAddSkillTagArgs = {
  input: AddSkillTagInput;
};

export type MutationAddTaskTagArgs = {
  input: AddTaskTagInput;
};

export type MutationAddWorkspaceFolderArgs = {
  input: AddWorkspaceFolderInput;
};

export type MutationAgentsRunChatTurnArgs = {
  input: AgentsRunChatTurnInput;
};

export type MutationAppendPlanOutputArgs = {
  input: AppendPlanOutputInput;
};

export type MutationApplyWorkspaceEditorConfigurationArgs = {
  input?: InputMaybe<ApplyWorkspaceEditorConfigurationInput>;
};

export type MutationArchiveAgentConversationArgs = {
  input: ArchiveAgentConversationInput;
};

export type MutationArchiveBlogPostArgs = {
  id: Scalars['ID']['input'];
};

export type MutationAssignRoleToServiceAccountArgs = {
  input: AssignRoleToServiceAccountInput;
};

export type MutationAssignRoleToUserArgs = {
  input: AssignRoleToUserInput;
};

export type MutationAttachWorkSessionSubjectArgs = {
  input: AttachWorkSessionSubjectInput;
};

export type MutationCalibrateJudgeForRunArgs = {
  input: CalibrateJudgeForRunInput;
};

export type MutationCancelConversationStreamArgs = {
  conversationId: Scalars['ID']['input'];
};

export type MutationCancelPlanRunArgs = {
  input: CancelPlanRunInput;
};

export type MutationCancelScheduledAgentJobRunArgs = {
  runId: Scalars['ID']['input'];
};

export type MutationClaimPlanMessagesArgs = {
  input: ClaimPlanMessagesInput;
};

export type MutationCleanQueueArgs = {
  input: CleanQueueInput;
};

export type MutationCloneCmsFragmentArgs = {
  input: CloneCmsFragmentInput;
};

export type MutationCloneRepositoryArgs = {
  input: CloneRepositoryInput;
};

export type MutationConnectMcpConnectorArgs = {
  input: ConnectMcpConnectorInput;
};

export type MutationCreateAgentConversationArgs = {
  input?: InputMaybe<CreateAgentConversationInput>;
};

export type MutationCreateBlogPostArgs = {
  input: CreateBlogPostInput;
};

export type MutationCreateCmsFragmentArgs = {
  input: CreateCmsFragmentInput;
};

export type MutationCreateCmsLayoutArgs = {
  input: CreateCmsLayoutInput;
};

export type MutationCreateCmsLibraryComponentArgs = {
  input: CreateCmsLibraryComponentInput;
};

export type MutationCreateCustomPromptArgs = {
  input: CreateCustomPromptInput;
};

export type MutationCreateEvalDatasetFromTrajectoriesArgs = {
  input: CreateEvalDatasetFromTrajectoriesInput;
};

export type MutationCreateNoteArgs = {
  input: CreateNoteInput;
};

export type MutationCreatePlanArgs = {
  input: CreatePlanInput;
};

export type MutationCreatePlansArgs = {
  input: CreatePlansInput;
};

export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};

export type MutationCreateQueueArgs = {
  input: CreateQueueInput;
};

export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};

export type MutationCreateRolloutFlagArgs = {
  input: CreateRolloutFlagInput;
};

export type MutationCreateScheduledAgentJobArgs = {
  input: CreateScheduledAgentJobInputType;
};

export type MutationCreateServiceAccountArgs = {
  input: CreateServiceAccountInput;
};

export type MutationCreateServiceAccountCredentialArgs = {
  input: CreateServiceAccountCredentialInput;
};

export type MutationCreateTaskArgs = {
  input: CreateTaskInput;
};

export type MutationCreateTasksArgs = {
  input: CreateTasksInput;
};

export type MutationCreateUserArgs = {
  input: CreateUserInput;
};

export type MutationCreateWorkspaceLocalRepositoryArgs = {
  input: CreateWorkspaceLocalRepositoryInput;
};

export type MutationDeleteAgentConversationArgs = {
  input: DeleteAgentConversationInput;
};

export type MutationDeleteCmsFragmentArgs = {
  uuid: Scalars['String']['input'];
};

export type MutationDeleteCmsLayoutArgs = {
  uuid: Scalars['String']['input'];
};

export type MutationDeleteCmsLibraryComponentArgs = {
  uuid: Scalars['String']['input'];
};

export type MutationDeleteCustomPromptArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteNoteArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeletePlanArgs = {
  input: DeletePlanInput;
};

export type MutationDeletePlanOutputArgs = {
  input: DeletePlanOutputInput;
};

export type MutationDeleteProjectArgs = {
  input: DeleteProjectInput;
};

export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteRolloutFlagArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteScheduledAgentJobArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteSkillAvailabilityRuleSetArgs = {
  projectId: Scalars['ID']['input'];
};

export type MutationDeleteTagActionRuleArgs = {
  input: DeleteTagActionRuleInput;
};

export type MutationDeleteTaskArgs = {
  input: DeleteTaskInput;
};

export type MutationDeleteWorkspaceLocalRepositoryArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeregisterWorktreeCheckoutArgs = {
  input: DeregisterWorktreeCheckoutInput;
};

export type MutationDetachHookArgs = {
  input: DetachHookInput;
};

export type MutationDisableServiceAccountArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDisableUserArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDisconnectMcpConnectorArgs = {
  connectorKey: Scalars['ID']['input'];
};

export type MutationDuplicateJobArgs = {
  input: DuplicateJobInput;
};

export type MutationEnableServiceAccountArgs = {
  id: Scalars['ID']['input'];
};

export type MutationEnableUserArgs = {
  id: Scalars['ID']['input'];
};

export type MutationEndWorkSessionArgs = {
  input: EndWorkSessionInput;
};

export type MutationEnqueueDocIngestionArgs = {
  input: EnqueueDocIngestionInput;
};

export type MutationEnqueuePlanRalphOrchestratorArgs = {
  input: EnqueuePlanRalphOrchestratorInput;
};

export type MutationEnqueuePlanRunArgs = {
  input: EnqueuePlanRunInput;
};

export type MutationEvaluatePlanRulesArgs = {
  planId: Scalars['ID']['input'];
};

export type MutationForceSettlePlanRunArgs = {
  input: ForceSettlePlanRunInput;
};

export type MutationHardDeleteCustomPromptArgs = {
  id: Scalars['ID']['input'];
};

export type MutationIndexCodeRepositoryArgs = {
  repositoryId: Scalars['ID']['input'];
};

export type MutationInstallAgentCliArgs = {
  backend: Scalars['String']['input'];
};

export type MutationLabelAgentTrajectoryArgs = {
  input: LabelAgentTrajectoryInput;
};

export type MutationLoginArgs = {
  input: LoginInput;
};

export type MutationPauseQueueArgs = {
  input: QueueControlInput;
};

export type MutationPostPlanMessageArgs = {
  input: PostPlanMessageInput;
};

export type MutationPromoteTaskToPlanArgs = {
  input: PromoteTaskToPlanInput;
};

export type MutationPruneWorktreeCheckoutsArgs = {
  input: PruneWorktreeCheckoutsInput;
};

export type MutationPublishBlogPostArgs = {
  input: PublishBlogPostInput;
};

export type MutationRecordAgentTrajectoryArgs = {
  input: RecordAgentTrajectoryInput;
};

export type MutationRecordEvalGradeArgs = {
  input: RecordEvalGradeInput;
};

export type MutationRecordEvalRunArgs = {
  input: RecordEvalRunInput;
};

export type MutationRecordEvalTrialArgs = {
  input: RecordEvalTrialInput;
};

export type MutationRecordJudgeCalibrationArgs = {
  input: RecordJudgeCalibrationInput;
};

export type MutationRecordPlanRunHeartbeatArgs = {
  input: RecordPlanRunHeartbeatInput;
};

export type MutationRecordSkillUsageArgs = {
  input: RecordSkillUsageInput;
};

export type MutationRecordSkillUsageOutcomeArgs = {
  input: RecordSkillUsageOutcomeInput;
};

export type MutationRecordTokenUsageArgs = {
  input: RecordTokenUsageInput;
};

export type MutationRecordWorkArtifactArgs = {
  input: RecordWorkArtifactInput;
};

export type MutationRefreshCheckoutArgs = {
  input: RefreshCheckoutInput;
};

export type MutationRegisterArgs = {
  input: RegisterInput;
};

export type MutationRegisterCliPlanRunArgs = {
  input: RegisterCliPlanRunInput;
};

export type MutationRegisterPlanRunWorktreeCheckoutArgs = {
  input: RegisterPlanRunWorktreeCheckoutInput;
};

export type MutationRemoveAgentTrajectoryLabelArgs = {
  trajectoryId: Scalars['ID']['input'];
};

export type MutationRemoveCmsFragmentChildArgs = {
  childUuid: Scalars['String']['input'];
  parentUuid: Scalars['String']['input'];
};

export type MutationRemovePermissionFromRoleArgs = {
  input: RemovePermissionFromRoleInput;
};

export type MutationRemovePlanRunWorktreeArgs = {
  checkoutId: Scalars['ID']['input'];
};

export type MutationRemovePlanTagArgs = {
  input: RemovePlanTagInput;
};

export type MutationRemoveProjectSkillArgs = {
  projectId?: InputMaybe<Scalars['ID']['input']>;
  slug: Scalars['String']['input'];
};

export type MutationRemoveProjectSkillTagArgs = {
  input: RemoveProjectSkillTagInput;
};

export type MutationRemoveProjectTagArgs = {
  input: RemoveProjectTagInput;
};

export type MutationRemoveRepeatableJobArgs = {
  input: RemoveRepeatableJobInput;
};

export type MutationRemoveRoleFromServiceAccountArgs = {
  input: RemoveRoleFromServiceAccountInput;
};

export type MutationRemoveRoleFromUserArgs = {
  input: RemoveRoleFromUserInput;
};

export type MutationRemoveSkillAvailabilityRuleArgs = {
  ruleId: Scalars['ID']['input'];
};

export type MutationRemoveSkillTagArgs = {
  input: RemoveSkillTagInput;
};

export type MutationRemoveTaskTagArgs = {
  input: RemoveTaskTagInput;
};

export type MutationRenameSkillTagArgs = {
  input: RenameSkillTagInput;
};

export type MutationReorderCmsFragmentChildrenArgs = {
  childUuids: Array<Scalars['String']['input']>;
  parentUuid: Scalars['String']['input'];
};

export type MutationReorderPlanTasksArgs = {
  input: ReorderPlanTasksInput;
};

export type MutationReplaceAgentTrajectoryArgs = {
  id: Scalars['ID']['input'];
  input: ReplaceAgentTrajectoryInput;
};

export type MutationReschedulePlanRunArgs = {
  input: ReschedulePlanRunInput;
};

export type MutationRespondToConversationPermissionArgs = {
  conversationId: Scalars['ID']['input'];
  optionId?: InputMaybe<Scalars['String']['input']>;
  requestId: Scalars['String']['input'];
};

export type MutationRestoreCustomPromptArgs = {
  id: Scalars['ID']['input'];
};

export type MutationResumeQueueArgs = {
  input: QueueControlInput;
};

export type MutationRetryJobArgs = {
  input: RetryJobInput;
};

export type MutationRevokeServiceAccountCredentialArgs = {
  credentialId: Scalars['ID']['input'];
};

export type MutationRunScheduledAgentJobNowArgs = {
  id: Scalars['ID']['input'];
};

export type MutationSchedulePlanRunArgs = {
  input: SchedulePlanRunInput;
};

export type MutationSendTranscriptionAudioChunkArgs = {
  audioBase64: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
  sortOrder: Scalars['Int']['input'];
};

export type MutationSetAgentEnabledArgs = {
  backend: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
};

export type MutationSetAgentModelEnabledArgs = {
  backend: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
  model: Scalars['String']['input'];
};

export type MutationSetAgentModelFavoriteArgs = {
  backend: Scalars['String']['input'];
  favorite: Scalars['Boolean']['input'];
  model: Scalars['String']['input'];
};

export type MutationSetAgentModelsEnabledArgs = {
  backend: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
  models: Array<Scalars['String']['input']>;
};

export type MutationSetBlogPostTagsArgs = {
  input: SetBlogPostTagsInput;
};

export type MutationSetMcpConnectorEnabledArgs = {
  input: SetMcpConnectorEnabledInput;
};

export type MutationSetPlanStatusArgs = {
  input: SetPlanStatusInput;
};

export type MutationSetScheduledAgentJobEnabledArgs = {
  input: SetScheduledAgentJobEnabledInputType;
};

export type MutationSetWorkspaceLocalRepositoryProjectArgs = {
  input: SetWorkspaceLocalRepositoryProjectInput;
};

export type MutationSettleCliPlanRunArgs = {
  input: SettleCliPlanRunInput;
};

export type MutationStartConversationStreamArgs = {
  input: StartConversationStreamInput;
};

export type MutationStartWorkSessionArgs = {
  input: StartWorkSessionInput;
};

export type MutationStopTranscriptionStreamArgs = {
  sessionId: Scalars['ID']['input'];
};

export type MutationUnpublishBlogPostArgs = {
  id: Scalars['ID']['input'];
};

export type MutationUpdateAgentCliArgs = {
  backend: Scalars['String']['input'];
};

export type MutationUpdateAgentConversationTitleArgs = {
  input: UpdateAgentConversationTitleInput;
};

export type MutationUpdateBlogPostArgs = {
  input: UpdateBlogPostInput;
};

export type MutationUpdateCmsFragmentArgs = {
  input: UpdateCmsFragmentInput;
};

export type MutationUpdateCmsLayoutArgs = {
  input: UpdateCmsLayoutInput;
};

export type MutationUpdateCmsLibraryComponentArgs = {
  input: UpdateCmsLibraryComponentInput;
};

export type MutationUpdateCustomPromptArgs = {
  input: UpdateCustomPromptInput;
};

export type MutationUpdateEvalRunStatusArgs = {
  input: UpdateEvalRunStatusInput;
};

export type MutationUpdateNoteArgs = {
  input: UpdateNoteInput;
};

export type MutationUpdatePlanArgs = {
  input: UpdatePlanInput;
};

export type MutationUpdatePlanMessageArgs = {
  input: UpdatePlanMessageInput;
};

export type MutationUpdateProjectArgs = {
  input: UpdateProjectInput;
};

export type MutationUpdateRepositoryArgs = {
  input: UpdateRepositoryInput;
};

export type MutationUpdateRoleArgs = {
  input: UpdateRoleInput;
};

export type MutationUpdateRolloutFlagArgs = {
  input: UpdateRolloutFlagInput;
};

export type MutationUpdateScheduledAgentJobArgs = {
  input: UpdateScheduledAgentJobInputType;
};

export type MutationUpdateServiceAccountArgs = {
  input: UpdateServiceAccountInput;
};

export type MutationUpdateSkillAvailabilityRuleArgs = {
  input: SkillAvailabilityRuleInput;
  ruleId: Scalars['ID']['input'];
};

export type MutationUpdateTaskArgs = {
  input: UpdateTaskInput;
};

export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
};

export type MutationUpdateUserPreferencesArgs = {
  input: UpdateUserPreferencesInput;
};

export type MutationUpdateWorkspaceLocalRepositoryArgs = {
  input: UpdateWorkspaceLocalRepositoryInput;
};

export type MutationUpdateWorkspaceProfileArgs = {
  input: UpdateWorkspaceProfileInput;
};

export type MutationUpsertBlogAuthorArgs = {
  input: UpsertBlogAuthorInput;
};

export type MutationUpsertBlogTagArgs = {
  input: UpsertBlogTagInput;
};

export type MutationUpsertSkillAvailabilityRuleSetArgs = {
  posture: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type MutationUpsertTagActionRuleArgs = {
  input: UpsertTagActionRuleInput;
};

export type MutationWithdrawPlanMessageArgs = {
  input: WithdrawPlanMessageInput;
};

export type MutationWorkflowPlanRunArgs = {
  input: EnqueuePlanRunInput;
};

export type MutationWriteCustomPromptToFileSystemArgs = {
  id: Scalars['ID']['input'];
};

export type NoteObject = {
  __typename?: 'NoteObject';
  author?: Maybe<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Real-time notification event delivered over a GraphQL subscription. */
export type NotificationEvent = {
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

export type OpenPrCountByAuthorObject = {
  __typename?: 'OpenPrCountByAuthorObject';
  /** GitHub author login. */
  author: Scalars['String']['output'];
  /** Number of open PRs by this author for the repo. */
  openCount: Scalars['Int']['output'];
};

export type OpenToMergedCycleTimeInput = {
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Bucket by week (YYYY-Www) or month (YYYY-MM); omit for repo-wide summary. */
  period?: InputMaybe<Scalars['String']['input']>;
  /** Repository name */
  repo: Scalars['String']['input'];
};

export type OpenToMergedCycleTimeObject = {
  __typename?: 'OpenToMergedCycleTimeObject';
  /** Median number of days from PR open to merge. */
  medianDays?: Maybe<Scalars['Float']['output']>;
  /** 90th percentile of days from PR open to merge. */
  p90Days?: Maybe<Scalars['Float']['output']>;
  /** Period bucket (e.g. YYYY-MM or YYYY-Www in UTC), or null for repo-wide. */
  period?: Maybe<Scalars['String']['output']>;
  /** Number of merged PRs in this bucket. */
  prCount: Scalars['Int']['output'];
};

export type PermissionObject = {
  __typename?: 'PermissionObject';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  /** Permission identifier (e.g. users:read, settings:write) */
  name: Scalars['String']['output'];
};

/** Result of the native OS folder dialog: the chosen absolute server-host path, or null when the user cancelled (a clean no-op). The path may be outside the configured workspace roots — the native pick is an explicit user gesture. addWorkspaceFolder still re-validates and inspects it. */
export type PickFolderNativePayloadObject = {
  __typename?: 'PickFolderNativePayloadObject';
  /** Chosen absolute path on the server host, or null on user-cancel. */
  path?: Maybe<Scalars['String']['output']>;
};

export type PlanEmbeddingObject = {
  __typename?: 'PlanEmbeddingObject';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  /** JSON string of metadata object */
  metadataJson: Scalars['String']['output'];
  /** Resolved plan entity when planId is set */
  plan?: Maybe<PlanObject>;
  planId: Scalars['String']['output'];
};

export type PlanEmbeddingsByPlanInput = {
  /** Max rows to return (default and hard cap: 1000). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Rows to skip (pagination offset). */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Plan id to list embeddings for */
  planId: Scalars['ID']['input'];
};

export type PlanEnqueuedNotification = NotificationEvent & {
  __typename?: 'PlanEnqueuedNotification';
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  planId: Scalars['ID']['output'];
  queuePosition: Scalars['Int']['output'];
  queueTotal: Scalars['Int']['output'];
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

/** What a plan inbox message is for. STEER: a correction that overrides the task description where they conflict, delivered first at the next task boundary. QUEUE: an extra requirement for the upcoming work, delivered after STEERs. FEEDBACK: post-run reflection; recorded, never delivered. */
export const PlanMessageKind = {
  Feedback: 'FEEDBACK',
  Queue: 'QUEUE',
  Steer: 'STEER',
} as const;

export type PlanMessageKind =
  (typeof PlanMessageKind)[keyof typeof PlanMessageKind];
/** A human message on a plan's inbox: a STEER or QUEUE for a live run, or post-run FEEDBACK. */
export type PlanMessageObject = {
  __typename?: 'PlanMessageObject';
  /** GitHub username of the human who wrote the message. */
  author: Scalars['String']['output'];
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** When a run claimed the message. Null until DELIVERED. */
  deliveredAt?: Maybe<Scalars['DateTime']['output']>;
  /** Task the agent was about to start when the message was applied. Null until DELIVERED. */
  deliveredToTaskId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  kind: PlanMessageKind;
  planId: Scalars['ID']['output'];
  /** Run that consumed the message. Null until DELIVERED, or when claimed outside a registered run. */
  planRunId?: Maybe<Scalars['ID']['output']>;
  status: PlanMessageStatus;
  /** Task the human was looking at when they wrote the message. Context only; it does not decide delivery. */
  taskId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Plan inbox message lifecycle. PENDING: waiting for the next task boundary. DELIVERED: claimed by a run (immutable). WITHDRAWN: retracted before delivery. RECORDED: FEEDBACK messages only. */
export const PlanMessageStatus = {
  Delivered: 'DELIVERED',
  Pending: 'PENDING',
  Recorded: 'RECORDED',
  Withdrawn: 'WITHDRAWN',
} as const;

export type PlanMessageStatus =
  (typeof PlanMessageStatus)[keyof typeof PlanMessageStatus];
export type PlanObject = {
  __typename?: 'PlanObject';
  /** Plan-level after-hooks (afterAll, or afterEach when scope='each'), in execution order. */
  afterHooks: Array<TaskObject>;
  assignee?: Maybe<Scalars['String']['output']>;
  author: Scalars['String']['output'];
  /** Plan-level before-hooks (beforeAll, or beforeEach when scope='each'), in execution order. */
  beforeHooks: Array<TaskObject>;
  category: Scalars['String']['output'];
  /** Set once on transition into COMPLETED; cleared if status leaves COMPLETED. Null when never completed. */
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** True when saved workflow run configuration differs from canonical defaults. */
  hasCustomRunConfig: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  /** Job-run lifecycle hooks stored on the plan ({ hooks: [...] }). */
  jobRunHooksJson: Scalars['String']['output'];
  project?: Maybe<Scalars['String']['output']>;
  /** Optional. Project UUID (FK to projects table). Null when plan is not linked to a project. */
  projectId?: Maybe<Scalars['String']['output']>;
  /** Resolved project entity when projectId is set; null when projectId is unset. */
  projectRelation?: Maybe<ProjectObject>;
  /** Workflow-ralph run configuration stored on the plan (PlanRunConfigStorage v1). */
  runConfigJson: Scalars['String']['output'];
  /** Number of tasks a whole-plan run would pick up (status PENDING, IN_PROGRESS, BLOCKED, BACKLOG, SKIPPED, CANCELED or QUEUED): the count enqueuePlanRun and schedulePlanRun require to be above zero. Resolved through a batched loader; select it in plan-detail documents rather than list documents. */
  runnableTaskCount: Scalars['Int']['output'];
  /** The soonest instant a SCHEDULED run of this plan fires at (plan_runs.scheduled_for of its earliest SCHEDULED run); null when none is waiting. Lets the UI explain why a run is already pending ("a run is scheduled for <local time>; cancel it to run now"). Resolved from plan_runs; a run that fired, was cancelled or was settled MISSED/SUPERSEDED no longer counts. */
  scheduledRunAt?: Maybe<Scalars['DateTime']['output']>;
  /** The id of the SCHEDULED run behind scheduledRunAt (the same soonest run: earliest scheduled_for, then id); null when none is waiting. Pass it as planRunId to cancelPlanRun to cancel just that run, so the UI can offer Cancel without listing run history. */
  scheduledRunId?: Maybe<Scalars['ID']['output']>;
  status: Scalars['String']['output'];
  summary?: Maybe<Scalars['String']['output']>;
  /** Tags attached to this plan, alphabetically by tag. */
  tags: Array<PlanTagObject>;
  /** Number of tasks belonging to this plan. Resolved from tasks table. */
  taskCount: Scalars['Int']['output'];
  /** Number of resolved tasks on this plan (status COMPLETED, SKIPPED or PROMOTED). Mirrors client getResolvedTaskCount; SKIPPED and PROMOTED count as done / won't be worked on here (PROMOTED continued as its own plan). */
  tasksCompletedCount: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type PlanOutputStreamChunkObject = {
  __typename?: 'PlanOutputStreamChunkObject';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  /** Optional iteration number for the output chunk */
  iteration?: Maybe<Scalars['Int']['output']>;
  /** Resolved plan entity when planId is set */
  plan?: Maybe<PlanObject>;
  planId: Scalars['String']['output'];
  /** Task this chunk is attributed to (task-scoped output); null for plan-scoped chunks and historical rows. */
  taskId?: Maybe<Scalars['String']['output']>;
};

/** Plan-scoped run (default) or task-centric run ("task" requires taskId). */
export const PlanRalphWorkflowMode = {
  Plan: 'plan',
  Task: 'task',
} as const;

export type PlanRalphWorkflowMode =
  (typeof PlanRalphWorkflowMode)[keyof typeof PlanRalphWorkflowMode];
export type PlanRefObject = {
  __typename?: 'PlanRefObject';
  /** Full plan UUID the prefix resolved to. */
  id: Scalars['String']['output'];
  status: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type PlanRunCheckoutObject = {
  __typename?: 'PlanRunCheckoutObject';
  /** Human-readable checkout label. */
  displayName: Scalars['String']['output'];
  /** Absolute on-disk path of the checkout/worktree. */
  filesystemPath: Scalars['String']['output'];
  /** Checkout kind: 'primary' or 'worktree'. */
  kind: Scalars['String']['output'];
};

/** A single plan run with metrics: job id, finished timestamp, and task-run metrics (memory/CPU at start and end). */
export type PlanRunMetricsEntry = {
  __typename?: 'PlanRunMetricsEntry';
  /** Execution backend selected once for the whole run: cursor or claude. */
  executionBackend?: Maybe<Scalars['String']['output']>;
  /** Unix timestamp when the job finished. */
  finishedOn?: Maybe<Scalars['Float']['output']>;
  /** BullMQ job id for this run. */
  jobId: Scalars['String']['output'];
  /** Task-run metrics (process memory/CPU at start and end). Null if job completed without metrics. */
  taskRunMetrics?: Maybe<TaskRunMetrics>;
};

export type PlanRunObject = {
  __typename?: 'PlanRunObject';
  /** Git branch this run operates on, captured at kickoff (run provenance). Powers branch↔PR mapping. Null for legacy/backfilled rows that predate branch capture. */
  branch?: Maybe<Scalars['String']['output']>;
  /** BullMQ job id for this run. Null for detached-CLI runs that carry no queue job. */
  bullmqJobId?: Maybe<Scalars['String']['output']>;
  /** Durable cancel-request marker: when a stop was requested for this run. Null when no cancel was requested. The run loop polls this and stops at the next iteration boundary. */
  cancelRequestedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The run's on-disk checkout (worktree/primary) joined from checkout_id; its filesystemPath powers editor deep-links. Null when the run has no resolved checkout. */
  checkout?: Maybe<PlanRunCheckoutObject>;
  createdAt: Scalars['DateTime']['output'];
  /** Execution backend selected once for the whole run: cursor or claude. */
  executionBackend: Scalars['String']['output'];
  /** Whether this run’s owner bumps its heartbeat on a timer. True for every queued and detached-CLI run — heartbeat-based liveness applies as before. False marks an owner with no timer (an interactive /ot-loop agent turn), so heartbeat says nothing about it: such runs are exempt from the stale sweep and always report isStale false. Read it alongside isStale — isStale false on such a run means "unknown", not "verified live". */
  heartbeatExpected: Scalars['Boolean']['output'];
  /** Host the worker executing this run is on. Null when the run is not actively executing. Diagnostic only — cross-host OS kill is out of scope. */
  hostname?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  /** Derived: true when this run is IN_PROGRESS but its heartbeat is older than the staleness cutoff — i.e. the owning process crashed hard (SIGKILL/power-loss) and the row is stranded. The UI hides Kill for a stale run; a sweeper settles it to STALE. False for healthy or already-terminal runs — and always false when heartbeatExpected is false, where liveness is unknown rather than verified. */
  isStale: Scalars['Boolean']['output'];
  /** Liveness heartbeat: last time the owning run process reported it is alive (bumped ~every 15s, stamped at start). Null for legacy rows / rows that never started heartbeating. Drives isStale. */
  lastHeartbeatAt?: Maybe<Scalars['DateTime']['output']>;
  /** Resolved agent model id for this run (e.g. claude-fable-5), captured at kickoff. Null for legacy rows lacking snapshot data. */
  model?: Maybe<Scalars['String']['output']>;
  /** OS process id of the worker executing this run. Null when not actively executing. */
  pid?: Maybe<Scalars['Int']['output']>;
  planId: Scalars['String']['output'];
  /** The run's linked pull request (via the work-ledger session bridge), with lifecycle state and GitHub URL. Null when no PR has been recorded for the run. */
  pullRequest?: Maybe<PlanRunPullRequestObject>;
  queueName: Scalars['String']['output'];
  /** The usage-limited run this run continues: set on the continuation run enqueued automatically after a Claude usage limit. Null for every ordinary run. */
  resumeOfRunId?: Maybe<Scalars['String']['output']>;
  /** Resolved workflow-ralph configuration at enqueue (PlanRunConfigSnapshot v1 JSON). Null for legacy runs. */
  runConfigSnapshotJson?: Maybe<Scalars['String']['output']>;
  /** Ralph run implementation: spawn or orchestrator. */
  runKind: Scalars['String']['output'];
  /** The absolute UTC instant a scheduled run fires at. Set only on runs created by schedulePlanRun (status SCHEDULED while waiting) and kept once the run settles, so history still shows when it was meant to fire. Null for every run that was enqueued to run now. */
  scheduledFor?: Maybe<Scalars['DateTime']['output']>;
  /** Why a scheduled run settled without starting: the fire-time policy's reason for a MISSED, SUPERSEDED or SKIPPED run. Null for every other run. */
  settledReason?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  /** When the usage limit that stopped this run lifts, as reported by the agent CLI. Null unless status is USAGE_LIMITED, or when the CLI reported no reset time. */
  usageLimitResetsAt?: Maybe<Scalars['DateTime']['output']>;
  /** Raw name of the usage-limit window that stopped this run (five_hour, seven_day, ...). Null unless status is USAGE_LIMITED, or when the window was not reported. */
  usageLimitType?: Maybe<Scalars['String']['output']>;
  /** Identifier of the worker instance executing this run. Null when not actively executing. */
  workerId?: Maybe<Scalars['String']['output']>;
};

export type PlanRunPullRequestObject = {
  __typename?: 'PlanRunPullRequestObject';
  /** Pull request number. */
  number: Scalars['Int']['output'];
  /** owner/repo the PR belongs to. */
  repo: Scalars['String']['output'];
  /** Lifecycle state of the PR: 'open', 'merged', or 'closed'. */
  state?: Maybe<Scalars['String']['output']>;
  /** Canonical GitHub URL for the PR. */
  url: Scalars['String']['output'];
};

/** What a guarded plan-run worktree teardown did. */
export const PlanRunWorktreeTeardownOutcome = {
  /** A guard could not be evaluated or the ot-worktree destroy action failed. The worktree is still there. */
  Failed: 'FAILED',
  /** A queued or in-progress plan run still points at this worktree. */
  KeptActiveRun: 'KEPT_ACTIVE_RUN',
  /** The worktree has uncommitted changes. */
  KeptDirty: 'KEPT_DIRTY',
  /** Not a server-provisioned plan-<8> worktree under the worktree root. */
  KeptNotPlanRunWorktree: 'KEPT_NOT_PLAN_RUN_WORKTREE',
  /** The path is the primary checkout. */
  KeptPrimary: 'KEPT_PRIMARY',
  /** The branch has commits that are not on its upstream or the default branch. */
  KeptUnpushed: 'KEPT_UNPUSHED',
  /** Every guard passes; reported only by an assessment, never by a removal. */
  Removable: 'REMOVABLE',
  /** The worktree directory and its checkout record are gone; the branch is kept. */
  Removed: 'REMOVED',
} as const;

export type PlanRunWorktreeTeardownOutcome =
  (typeof PlanRunWorktreeTeardownOutcome)[keyof typeof PlanRunWorktreeTeardownOutcome];
export type PlanRunsByPlanIdInput = {
  /** When true, every SCHEDULED run of the plan is returned however old its row is, and limit caps only the runs that are not SCHEDULED. Rows stay newest createdAt first, so the first row is then not necessarily the newest run. Default false: limit caps every run. */
  includeAllScheduled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Max plan-run audit rows to return, newest first. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Plan id whose run audit rows should be returned */
  planId: Scalars['ID']['input'];
};

export type PlanStatusChangedNotification = NotificationEvent & {
  __typename?: 'PlanStatusChangedNotification';
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  planId: Scalars['ID']['output'];
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

export type PlanStatusCountObject = {
  __typename?: 'PlanStatusCountObject';
  count: Scalars['Int']['output'];
  status: Scalars['String']['output'];
};

/** A tag attached to a plan. Source is derived from the writing identity (human > agent > server-llm) and never client-supplied. */
export type PlanTagObject = {
  __typename?: 'PlanTagObject';
  /** Model confidence (0-1) for server-llm rows; null otherwise. */
  confidence?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Vocabulary axis: "domain" (subject area) or "phase" (lifecycle stage; at most one phase tag per plan). */
  dimension: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  planId: Scalars['ID']['output'];
  /** Writing identity class: "human", "agent", or "server-llm". Ranked human > agent > server-llm for replace/remove arbitration. */
  source: Scalars['String']['output'];
  /** Kebab-case tag slug, unique per plan. */
  tag: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Canonical plan/task status vocabulary (the Postgres plan_task_status enum). QUEUED and SCHEDULED are plans-only; SCHEDULED is server-written (set while a plan has a scheduled run). Sourced from the shared SSOT so the DB enum, GraphQL schema, and MCP tool contract cannot diverge. */
export const PlanTaskStatus = {
  Backlog: 'BACKLOG',
  Blocked: 'BLOCKED',
  Canceled: 'CANCELED',
  Completed: 'COMPLETED',
  InProgress: 'IN_PROGRESS',
  Pending: 'PENDING',
  Promoted: 'PROMOTED',
  Queued: 'QUEUED',
  Scheduled: 'SCHEDULED',
  Skipped: 'SKIPPED',
} as const;

export type PlanTaskStatus =
  (typeof PlanTaskStatus)[keyof typeof PlanTaskStatus];
export type PlanUpdatedNotification = NotificationEvent & {
  __typename?: 'PlanUpdatedNotification';
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  planId: Scalars['ID']['output'];
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  taskId?: Maybe<Scalars['ID']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

export type PlanWaitingForWorktreeNotification = NotificationEvent & {
  __typename?: 'PlanWaitingForWorktreeNotification';
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  planId: Scalars['ID']['output'];
  retryDelayMs: Scalars['Int']['output'];
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

export type PostPlanMessageInput = {
  /** GitHub username to attribute the message to. Omit to stamp it from the caller's identity. */
  author?: InputMaybe<Scalars['String']['input']>;
  /** Message text. Must not be blank. */
  body: Scalars['String']['input'];
  /** STEER or QUEUE for a live run (held PENDING for the next run when none is live); FEEDBACK for post-run reflection. */
  kind: PlanMessageKind;
  /** Plan to post the message to. */
  planId: Scalars['ID']['input'];
  /** Task the author was looking at, for context. It does not decide delivery. */
  taskId?: InputMaybe<Scalars['ID']['input']>;
};

export type PrCountByLabelInput = {
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Repository name */
  repo: Scalars['String']['input'];
  /** Filter PRs by state: open, closed, or all (default). */
  state?: InputMaybe<Scalars['String']['input']>;
};

export type PrCountByLabelObject = {
  __typename?: 'PrCountByLabelObject';
  /** Number of PRs that have this label (a PR with multiple labels is counted under each). */
  count: Scalars['Int']['output'];
  /** Label name (e.g. bug, feature, docs). */
  label: Scalars['String']['output'];
};

export type PrTimeInStateSummaryObject = {
  __typename?: 'PrTimeInStateSummaryObject';
  /** Average number of days PRs spent in this state. */
  avgDaysInState?: Maybe<Scalars['Float']['output']>;
  /** Count of PRs in this state. */
  count: Scalars['Int']['output'];
  /** PR state (e.g. open, closed, merged). */
  state: Scalars['String']['output'];
};

/** System CPU pressure level interpretation. */
export const PressureLevel = {
  High: 'high',
  Low: 'low',
  Moderate: 'moderate',
  Unknown: 'unknown',
} as const;

export type PressureLevel = (typeof PressureLevel)[keyof typeof PressureLevel];
/** Process metrics snapshot: memory (RSS, heap, external in MB) and CPU (user/system in ms). */
export type ProcessMetricsSnapshot = {
  __typename?: 'ProcessMetricsSnapshot';
  /** User CPU time in milliseconds (cumulative). */
  cpuUserMs: Scalars['Float']['output'];
  /** External (C++ objects bound to JS, e.g. Buffers) in MB. */
  externalMb: Scalars['Float']['output'];
  /** V8 heap total in MB. */
  heapTotalMb: Scalars['Float']['output'];
  /** V8 heap used in MB. */
  heapUsedMb: Scalars['Float']['output'];
  /** Resident set size (total process memory) in MB. */
  rssMb: Scalars['Float']['output'];
};

export type ProjectObject = {
  __typename?: 'ProjectObject';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** NX project name (e.g. applications/openthrottle-server) */
  nxProjectName?: Maybe<Scalars['String']['output']>;
  /** Plans linked to this project; resolved via ResolveField. */
  plans?: Maybe<Array<PlanObject>>;
  /** Tags attached to this project, alphabetically by tag. */
  tags: Array<ProjectTagObject>;
  /** Tasks linked to this project; resolved via ResolveField. */
  tasks?: Maybe<Array<TaskObject>>;
  updatedAt: Scalars['DateTime']['output'];
};

/** A single skill in a project's ingested skill universe, with its static frontmatter tags and tri-state disable-model-invocation flag. */
export type ProjectSkillObject = {
  __typename?: 'ProjectSkillObject';
  /** Skill description from SKILL.md frontmatter; null when the ingested row omits it. Lets the developer app's `/skills` slash-command menu show descriptions in deployed environments with no local checkout for filesystem discovery. */
  description?: Maybe<Scalars['String']['output']>;
  /** When ingest last found this slug missing from disk; null while the skill is present on disk. The row is not auto-deleted. */
  orphanedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Skill slug (the skill frontmatter `name`). */
  slug: Scalars['String']['output'];
  /** Skill provenance from frontmatter `source`: 'openthrottle' for skills OpenThrottle authors and manages, 'external' for skills installed from an outside source (omitted frontmatter normalizes to 'external'). */
  source: Scalars['String']['output'];
  /** Optional origin URL for external skills (marketplace listing or upstream repo); null when the frontmatter omits it. */
  sourceUrl?: Maybe<Scalars['String']['output']>;
  /** Static frontmatter `disable-model-invocation`. Tri-state: null = unset (frontmatter omits the key), true = auto-invocation suppressed, false = auto-invocation explicitly enabled. */
  staticDisableModelInvocation?: Maybe<Scalars['Boolean']['output']>;
  /** Static record tags for this skill (empty when none). */
  tags: Array<Scalars['String']['output']>;
};

/** A project's ingested skill universe, alphabetically by slug. */
export type ProjectSkillsResult = {
  __typename?: 'ProjectSkillsResult';
  /** Slugs ingested previously that are no longer on disk. Suggest an explicit removeProjectSkill; ingest does not delete these rows. */
  orphanSlugs: Array<Scalars['String']['output']>;
  /** Skills ingested for the project, alphabetically by slug. */
  skills: Array<ProjectSkillObject>;
  /** Number of skills in the universe. */
  totalCount: Scalars['Int']['output'];
};

/** A tag attached to a project. Same shape and provenance semantics as plan tags; a project's tags feed the effective-tag-set rollup for its plans. */
export type ProjectTagObject = {
  __typename?: 'ProjectTagObject';
  /** Model confidence (0-1) for server-llm rows; null otherwise. */
  confidence?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Vocabulary axis: "domain" (subject area) or "phase" (lifecycle stage). */
  dimension: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  projectId: Scalars['ID']['output'];
  /** Writing identity class: "human", "agent", or "server-llm". Ranked human > agent > server-llm for replace/remove arbitration. */
  source: Scalars['String']['output'];
  /** Kebab-case tag slug, unique per project. */
  tag: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type PromoteTaskToPlanInput = {
  /** Optional idempotency key: re-submitting the same key enqueues at most one promotion job. Letters, digits, and ._:- only. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** Id of the task to promote into a new plan */
  taskId: Scalars['ID']['input'];
};

export type PromoteTaskToPlanResultObject = {
  __typename?: 'PromoteTaskToPlanResultObject';
  /** Error message when success is false (validation/enqueue). */
  error?: Maybe<Scalars['String']['output']>;
  /** BullMQ job id when success is true. */
  jobId?: Maybe<Scalars['String']['output']>;
  /** Whether the promotion job was accepted and enqueued. */
  success: Scalars['Boolean']['output'];
};

export type PrsMergedPerPeriodInput = {
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Period bucket: week (YYYY-Www) or month (YYYY-MM) in UTC. */
  period: Scalars['String']['input'];
  /** Repository name */
  repo: Scalars['String']['input'];
};

export type PrsMergedPerPeriodObject = {
  __typename?: 'PrsMergedPerPeriodObject';
  /** Number of PRs merged in this period. */
  count: Scalars['Int']['output'];
  /** Period bucket in UTC (e.g. YYYY-MM or YYYY-Www). */
  period: Scalars['String']['output'];
};

/** What happened to one requested checkout id. */
export const PruneWorktreeCheckoutOutcome = {
  /** No checkout with that id is owned by the caller, or it was deleted concurrently. */
  NotFound: 'NOT_FOUND',
  /** The row was deleted. */
  Pruned: 'PRUNED',
  /** An unsettled (QUEUED or IN_PROGRESS) plan run still points at this checkout. Settle the run first. */
  SkippedActiveRun: 'SKIPPED_ACTIVE_RUN',
  /** The path is a live linked worktree right now, so the row is not stale. */
  SkippedLive: 'SKIPPED_LIVE',
  /** The row is a primary checkout. Prune only ever deletes worktree rows. */
  SkippedPrimary: 'SKIPPED_PRIMARY',
} as const;

export type PruneWorktreeCheckoutOutcome =
  (typeof PruneWorktreeCheckoutOutcome)[keyof typeof PruneWorktreeCheckoutOutcome];
/** The outcome for one requested checkout id. */
export type PruneWorktreeCheckoutResultObject = {
  __typename?: 'PruneWorktreeCheckoutResultObject';
  checkoutId: Scalars['ID']['output'];
  outcome: PruneWorktreeCheckoutOutcome;
  /** The registered path, or null when the checkout was not found. */
  path?: Maybe<Scalars['String']['output']>;
};

/** Registered worktree checkouts to delete. A request, not evidence: every guard is re-checked server-side. */
export type PruneWorktreeCheckoutsInput = {
  /** repository_checkouts ids, typically DiscoveredWorktrees.missingCheckouts. At most 200 distinct ids; duplicates are collapsed. */
  checkoutIds: Array<Scalars['ID']['input']>;
};

/** Result of pruneWorktreeCheckouts: one entry per distinct requested id, in request order. */
export type PruneWorktreeCheckoutsPayloadObject = {
  __typename?: 'PruneWorktreeCheckoutsPayloadObject';
  results: Array<PruneWorktreeCheckoutResultObject>;
};

/** Linux Pressure Stall Information (PSI) for CPU. Null fields on non-Linux platforms. */
export type PsiCpuMetrics = {
  __typename?: 'PsiCpuMetrics';
  /** Percentage of time all runnable tasks stalled (10s avg). */
  full10s?: Maybe<Scalars['Float']['output']>;
  /** Percentage of time all runnable tasks stalled (60s avg). */
  full60s?: Maybe<Scalars['Float']['output']>;
  /** Percentage of time all runnable tasks stalled (300s avg). */
  full300s?: Maybe<Scalars['Float']['output']>;
  /** Total full stall time in microseconds (cumulative since boot). */
  fullTotalUs?: Maybe<Scalars['Float']['output']>;
  /** Percentage of time at least one task stalled (10s avg). */
  some10s?: Maybe<Scalars['Float']['output']>;
  /** Percentage of time at least one task stalled (60s avg). */
  some60s?: Maybe<Scalars['Float']['output']>;
  /** Percentage of time at least one task stalled (300s avg). */
  some300s?: Maybe<Scalars['Float']['output']>;
  /** Total some stall time in microseconds (cumulative since boot). */
  someTotalUs?: Maybe<Scalars['Float']['output']>;
};

export type PublishBlogPostInput = {
  id: Scalars['ID']['input'];
  /** When the post goes live. Omit (or null) to publish now; a future date schedules the post — it is PUBLISHED but not publicly visible until then. */
  publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

/** The published (or scheduled) post, or BlogPostNotFoundError. */
export type PublishBlogPostResult = BlogPostAdminObject | BlogPostNotFoundError;

export type PullListItemObject = {
  __typename?: 'PullListItemObject';
  author: Scalars['String']['output'];
  baseRef?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  headRef?: Maybe<Scalars['String']['output']>;
  /** Head commit SHA when GitHub returns head.sha (for commit/checks drill-down). */
  headSha?: Maybe<Scalars['String']['output']>;
  htmlUrl: Scalars['String']['output'];
  mergedAt?: Maybe<Scalars['String']['output']>;
  number: Scalars['Int']['output'];
  state: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Activity for a single date (YYYY-MM-DD) or last N days. Provide exactly one of date or daysBack. Optional limit/offset for pagination. */
  activityByDate: ActivityByDateResultObject;
  /** Activity in a date range: commits, plan output chunks, tasks updated. Optional limit/offset for pagination. */
  activityByDateRange: ActivityByDateResultObject;
  /** Whether server-side agent-CLI install/update is enabled (env flag) and whether the current user may run it (SETTINGS_WRITE). Drives the /settings/agents control gating. */
  agentCliSetupConfig: AgentCliSetupConfigObject;
  /** List a plan run's agent trajectories, oldest first. */
  agentTrajectoriesByPlanRun: Array<AgentTrajectory>;
  /** List a task's agent trajectories, oldest first. */
  agentTrajectoriesByTask: Array<AgentTrajectory>;
  /** Fetch one recorded agent trajectory by id. Null when it does not exist. */
  agentTrajectory?: Maybe<AgentTrajectory>;
  /** List every rater's label on an agent trajectory, most recently updated first. */
  agentTrajectoryLabels: Array<AgentTrajectoryLabel>;
  /** Typenames an editor can add to a live layout: every live ACTIVE schema typename except the root "Layout", sorted. NOT_FOUND when the layout is missing or deleted. */
  availableCmsTypenames: Array<Scalars['String']['output']>;
  /** Every blog author, ordered by display name. */
  blogAdminAuthors: Array<BlogAuthorObject>;
  /** One blog post in any state, by id or by slug (exactly one of the two is required, otherwise the query is rejected). BlogPostNotFoundError when no such post exists. */
  blogAdminPost: BlogAdminPostResult;
  /** Every blog post in any state, most recently edited first, with cursor pagination. Optionally filtered to one or more derived states and to a case-insensitive title / slug search. */
  blogAdminPosts: BlogAdminPostListResult;
  /** Every blog tag (including tags no live post carries yet), ordered by name. */
  blogAdminTags: Array<BlogTagObject>;
  /** A publicly visible blog post by slug. Null for an unknown slug and for any post that is not public (draft, archived, or scheduled in the future). */
  blogPost?: Maybe<BlogPostObject>;
  /** Publicly visible blog posts, newest first, with cursor pagination. Optionally filtered to one tag. */
  blogPosts: BlogPostListResult;
  /** Blog tags carried by at least one publicly visible post, ordered by name. */
  blogTags: Array<BlogTagObject>;
  /** Interactive directory listing for the in-app picker: immediate subdirectories (annotated with isGitRepo / alreadyRegistered) plus navigation context (current + parent path, current-is-git-repo). With no path, lists the configured workspace roots as entries. All paths are on the server host. */
  browseDirectory: WorkspaceDirectoryListingObject;
  /** When telemetry last arrived, per (stream, source): skill_events and skill_outcomes by source, token_usage by provider. A source that is absent has never captured; a stale lastCapturedAt means capture may be broken. */
  captureHealth: Array<CaptureHealthRowObject>;
  /** A live cms fragment by uuid; null when none matches. */
  cmsFragment?: Maybe<CmsFragmentObject>;
  /** One page of live cms fragments, oldest first, optionally narrowed by typename and isSystem (false also matches an unset flag). take is clamped to 1–100 (default 25). */
  cmsFragments: CmsFragmentListResult;
  /** A live cms layout by slug, with its fragment tree; null when none matches. */
  cmsLayout?: Maybe<CmsLayoutObject>;
  /** A live cms layout by uuid, with its fragment tree; null when none matches. */
  cmsLayoutByUuid?: Maybe<CmsLayoutObject>;
  /** One page of live cms layouts, without their trees. take is clamped to 1–100 (default 25). */
  cmsLayouts: CmsLayoutListResult;
  /** One page of live cms libraries with their components. take is clamped to 1–100 (default 25). */
  cmsLibraries: CmsLibraryListResult;
  /** A live cms library by uuid, with its components; null when none matches. */
  cmsLibrary?: Maybe<CmsLibraryObject>;
  /** A live cms library component by uuid; null when none matches. */
  cmsLibraryComponent?: Maybe<CmsLibraryComponentObject>;
  /** One page of live cms library components across every library, by typename. take is clamped to 1–100 (default 25). */
  cmsLibraryComponents: CmsLibraryComponentListResult;
  /** A live cms schema by uuid; null when none matches. */
  cmsSchema?: Maybe<CmsSchemaObject>;
  /** The live cms schema for a typename at a version; without a version, its newest ACTIVE version. Null when none matches. */
  cmsSchemaByTypename?: Maybe<CmsSchemaObject>;
  /** One page of live cms schemas, optionally filtered by status (ACTIVE | DISABLED | DRAFT) and typename. take is clamped to 1–100 (default 25). */
  cmsSchemas: CmsSchemaListResult;
  /** Index status for a registered repository: unavailable, indexing, ready, or notIndexed. */
  codeIndexStatus: CodeIndexStatusObject;
  /** Natural-language code semantic search over a registered repository's indexed code. available=false when no embeddings provider is configured. */
  codeSemanticSearch: CodeSemanticSearchResult;
  /** Commits per PR (PR size in commits) for merged PRs. Lists merged PRs across pages up to 1000 (10 pages) and paginates commits per PR; maxPrs caps the per-PR commit-count requests. Optional period bucket (week/month UTC). */
  commitsPerPr: Array<CommitsPerPrRowObject>;
  /** Get a custom prompt by ID */
  customPrompt?: Maybe<CustomPromptObject>;
  /** List custom prompts with optional filters */
  customPrompts: Array<CustomPromptObject>;
  /** Aggregated plan and task stats for a single date (YYYY-MM-DD). Returns null if no row for that date. */
  dailyStats?: Maybe<DailyStatsObject>;
  /** Aggregated plan and task stats for a date range (start and end inclusive, YYYY-MM-DD). */
  dailyStatsRange: DailyStatsRangeResultObject;
  /** Database health: ok | unconfigured | unreachable. Used by app status page. */
  databaseHealth: Scalars['String']['output'];
  /** Development ping. Returns "pong" when the development GraphQL API is reachable. */
  developmentPing: Scalars['String']['output'];
  /** Discover allowlisted agentic CLI backends (e.g. cursor-agent) detected on the server host. Returns a cached snapshot (60s TTL); does not probe per request. Each agent's `enabled` reflects the current user's per-user preference, overlaid per request on top of the shared discovery cache. */
  discoverAgentClis: DiscoverAgentClisResult;
  /** Discover locally-running OpenAI-compatible model servers (Ollama-primary) and the models they serve. Returns a cached snapshot (60s TTL); does not scan per request. */
  discoverLocalModels: DiscoverLocalModelsResult;
  /** Git repositories found one level under the configured workspace roots (server-host paths); empty when OPENTHROTTLE_WORKSPACE_ROOTS is unset. */
  discoveredFolders: Array<DiscoveredFolderObject>;
  /** Git worktrees that exist on disk for the authenticated user's repositories, whether or not OpenThrottle provisioned them, each classified RUNNING / DIRTY / IDLE. Read-only: nothing here creates, prunes or removes a worktree. The on-disk scan is reused for a few seconds per user (pass refresh to force one); live-run classification is always current. Never throws — an unreadable root or a failed git probe becomes a warning on the payload. */
  discoveredWorktrees: DiscoveredWorktreesObject;
  /** Probe which editors are installed on the machine hosting the server. Returns a cached snapshot (60s TTL); does not probe per request. **Advisory only** — this never gates enabling an editor. An editor reporting NOT_FOUND can still be enabled and will still get a working toolbar button, and UNKNOWN (a containerized server, an unsupported platform, or a failed probe) means nothing is claimed either way and clients should render no hint. */
  editorPresence: EditorPresenceResultObject;
  /** Fetch one eval dataset by id. Null when it does not exist. */
  evalDataset?: Maybe<EvalDataset>;
  /** List a repository's eval datasets, newest first. */
  evalDatasets: Array<EvalDataset>;
  /** Fetch one eval run by id. Null when it does not exist. */
  evalRun?: Maybe<EvalRun>;
  /** Compare a candidate run with a baseline run: McNemar's test over the cases both have an outcome for, the cases that got worse and better, and warnings when the runs used different datasets, auth modes or k. */
  evalRunComparison: EvalRunComparison;
  /** The report of one eval run: config tuple, graders, headline numbers (pass rate with a bootstrap 95% interval, judge agreement, detection floor, pass^k, cost per success) and a row per case. Statistics are computed server-side over trials that count. */
  evalRunReport: EvalRunReport;
  /** List a dataset's eval runs, newest first. */
  evalRuns: Array<EvalRun>;
  /** Evaluated rollout flags for client hydration. Public: no flags:read. Authenticated principal enriches targeting/bucketing when present; otherwise anonymousId (or a degraded shared subject) is used for bucketing. applicationKey is accepted for future app scoping (log/stub today). */
  evaluateFeatureFlags: Array<FeatureFlagObject>;
  /** Get a generator by name (includes schema JSON) */
  generator?: Maybe<GeneratorDetailObject>;
  /** List available NX generators from @tools/generators */
  generators: Array<GeneratorObject>;
  /** Get one agent conversation by ID for the authenticated human user. */
  getAgentConversation?: Maybe<AgentConversationObject>;
  /** List messages for an owned conversation ordered by sort_order ASC (default limit 100 max 500). */
  getAgentConversationMessages: ListAgentConversationMessagesResultObject;
  /** Fetch a single document chunk by id (UUID from plan_embeddings, task_embeddings, or documentation_embeddings). Use after semantic search to read full chunk content. */
  getDocument?: Maybe<SearchChunk>;
  /** Whether GITHUB_TOKEN is configured on the server. Boolean only — the token value is never exposed. Used to prompt the user to set GITHUB_TOKEN instead of rendering empty/unauthenticated GitHub stats. */
  githubTokenConfigured: Scalars['Boolean']['output'];
  /** Single job by id and queue name. Returns null if not found. */
  job?: Maybe<JobObject>;
  /** List a grader's judge calibrations across versions, newest first. */
  judgeCalibrations: Array<EvalJudgeCalibration>;
  /** Single most recent activity (commit, plan output chunk, or task update) for a plan or task. Use for "What was the last thing we did for <plan> or <task>?". */
  lastActivity?: Maybe<LastActivityResultObject>;
  /** Lines added/deleted by period (week or month) and author for merged PRs. Lists merged PRs across pages up to 1000 (10 pages) then fetches per-PR diff stats; maxPrs caps the detail requests. */
  linesAddedDeleted: Array<LinesAddedDeletedRowObject>;
  /** List agent conversations for the authenticated human user (default status=active, limit 20 max 100). */
  listAgentConversations: ListAgentConversationsResultObject;
  /** Distinct author and assignee values from plans and tasks for filters */
  listDistinctAuthorsAndAssignees: Array<Scalars['String']['output']>;
  /** Distinct category values from plans for filters */
  listDistinctCategories: Array<Scalars['String']['output']>;
  /** Plan count per status for sidebar/filters (alias: use planCountsByStatus) */
  listPlanCountsByStatus: Array<PlanStatusCountObject>;
  /** List plans filtered by status(es), assignee(s), project, title; sorted and paginated. Pass statuses/assignees arrays; empty or "all" in statuses means no status filter. */
  listPlansByStatus: ListPlansByStatusResultObject;
  /** List knowledge-base sources (plan, task, documentation) and plan titles. Use to discover available collections and plans. */
  listSources: ListSourcesResultObject;
  /** The authenticated user's MCP connector connections. */
  mcpConnectorConnections: Array<McpConnectorConnectionObject>;
  /** The curated MCP connector catalog (static server-side seed). */
  mcpConnectors: Array<McpConnectorObject>;
  /** Get the currently authenticated user */
  me?: Maybe<UserObject>;
  /** Metrics namespace: serverSnapshot (current process metrics) and recentPlanRunsMetrics for plan-level visualization. serverMetrics at root is unchanged. */
  metrics: MetricsObject;
  /**
   * Deprecated: evaluated feature flags for the current actor (kind + valueJson). Prefer evaluateFeatureFlags.
   * @deprecated Use evaluateFeatureFlags (public hydration; no flags:read). Auth remains enrichment for targeting.
   */
  myFeatureFlags: Array<FeatureFlagObject>;
  /** Get permission names for the current user */
  myPermissions: Array<Scalars['String']['output']>;
  /** Get a note by ID */
  note?: Maybe<NoteObject>;
  /** List all notes, ordered by createdAt descending */
  notes: Array<NoteObject>;
  /** Open PR count per author for a repository (GitHub stats). Paginates PRs up to 1000 (10 pages); repos with more matching PRs are truncated to the most recent window. */
  openPrCountByAuthor: Array<OpenPrCountByAuthorObject>;
  /** Cycle time for merged PRs: median and P90 of days from open to merged. Optional period buckets by week/month (UTC). Paginates merged PRs up to 1000 (10 pages); older PRs beyond the cap are excluded. */
  openToMergedCycleTime: Array<OpenToMergedCycleTimeObject>;
  /** List all permissions */
  permissions: Array<PermissionObject>;
  /** Permission names for a service account (union of role permissions). */
  permissionsForServiceAccount: Array<Scalars['String']['output']>;
  /** Get permission names for a user (union of all their roles' permissions) */
  permissionsForUser: Array<Scalars['String']['output']>;
  /** Get a plan by ID */
  plan?: Maybe<PlanObject>;
  /** Plan count per status for sidebar/filters */
  planCountsByStatus: Array<PlanStatusCountObject>;
  /** Get a plan embedding by ID */
  planEmbedding?: Maybe<PlanEmbeddingObject>;
  /** List plan embeddings by plan ID, ordered by createdAt ascending */
  planEmbeddings: Array<PlanEmbeddingObject>;
  /** List a plan's inbox oldest first, optionally narrowed to some kinds and statuses. */
  planMessages: Array<PlanMessageObject>;
  /** Get a plan output stream chunk by ID */
  planOutputStreamChunk?: Maybe<PlanOutputStreamChunkObject>;
  /** List plan output stream chunks by plan ID, ordered by createdAt ascending */
  planOutputStreamChunks: Array<PlanOutputStreamChunkObject>;
  /** Recent persisted Ralph plan runs for a plan, newest first. Each row stores exactly one execution backend. */
  planRunsByPlanId: Array<PlanRunObject>;
  /** The canonical set of valid plan statuses (introspectable status vocabulary). Includes QUEUED (plans-only). */
  planStatuses: Array<PlanTaskStatus>;
  /** List plans, newest first. Capped at 100 by default (max 500); pass limit to override. Use listPlansByStatus for full pagination/filtering. */
  plans: Array<PlanObject>;
  /** PR counts by label (breakdown by type e.g. bug, feature, docs). Uses Issues API; optional state filter (open/closed/all). */
  prCountByLabel: Array<PrCountByLabelObject>;
  /** PR time-in-state summary (count and avg days per state: open, closed, merged). Paginates PRs up to 1000 (10 pages); repos with more PRs are truncated to the most recent window. */
  prTimeInStateSummary: Array<PrTimeInStateSummaryObject>;
  /** Get a project by ID */
  project?: Maybe<ProjectObject>;
  /** A project's ingested skill universe: slug, static frontmatter tags, and the tri-state static disable-model-invocation flag. Omit projectId to resolve the dogfood monorepo project (nx_project_name = 'monorepo'); returns an empty list when the project or its ingested rows are absent. Display-only in v1 — no per-context effective availability. */
  projectSkills: ProjectSkillsResult;
  /** List all projects, ordered by createdAt descending */
  projects: Array<ProjectObject>;
  /** PRs merged per week or month (throughput trend). Buckets by merged_at in UTC. Paginates merged PRs up to 1000 (10 pages); older PRs beyond the cap are excluded. */
  prsMergedPerPeriod: Array<PrsMergedPerPeriodObject>;
  /** Get one pull request by repository and PR number (GitHub API) */
  pull?: Maybe<PullListItemObject>;
  /** List pull requests for a repository (GitHub API) */
  pulls: Array<PullListItemObject>;
  /** Single queue by name with optional paginated jobs (limit/offset/states/asc). */
  queue?: Maybe<QueueDetailsObject>;
  /** Historical / catch-up read of a job's keyed BullMQ run transcript, paged by opaque cursor. */
  queueJobLogs: QueueJobLogPageObject;
  /** List registered BullMQ queues with job counts (waiting, active, completed, failed, delayed). */
  queues: Array<QueueStatsObject>;
  /** List remaining tasks for a plan (status in PENDING, IN_PROGRESS, BLOCKED), ordered by sortOrder then createdAt ascending */
  remainingTasksByPlanId: Array<TaskObject>;
  /** List repeatable (scheduled) jobs for a queue. Use the returned key with removeRepeatableJob to remove one. Job types (e.g. run-plan) and future workflow extensibility are documented on JobObject and RepeatableJobObject. */
  repeatableJobs: Array<RepeatableJobObject>;
  /** Resolve a short plan-id fragment (leading hex of a full UUID, e.g. "f5e40886") to matching plan refs. Normalizes the prefix (trim/lowercase/strip hyphens); prefixes shorter than 6 hex chars or containing non-hex characters return []. A unique match powers a confident ⌘K redirect; multiple matches (up to 6) are listed for disambiguation. */
  resolvePlanRef: Array<PlanRefObject>;
  /** Review cycle time for merged PRs: median and P90 of days from last CHANGES_REQUESTED to first subsequent APPROVED or merge. Optional period buckets by week/month (UTC). Lists merged PRs across pages up to 1000 (10 pages) and paginates reviews; maxPrs caps the per-PR review requests. */
  reviewCycleTime: Array<ReviewCycleTimeObject>;
  /** Get a role by ID */
  role?: Maybe<RoleObject>;
  /** List all roles with their permissions */
  roles: Array<RoleObject>;
  /** Roles assigned to a service account (admin, human only). */
  rolesForServiceAccount: Array<RoleObject>;
  /** Get roles assigned to a user */
  rolesForUser: Array<RoleObject>;
  /** Get a rollout feature flag by id */
  rolloutFlag?: Maybe<RolloutFlagObject>;
  /** List all rollout feature flags */
  rolloutFlags: Array<RolloutFlagObject>;
  /** The apply-once ledger rows for a plan, oldest first. Surfaces flagged/orphaned applications. */
  ruleApplications: Array<RuleApplicationObject>;
  /** One scheduled agent job by id, or null. */
  scheduledAgentJob?: Maybe<ScheduledAgentJobObject>;
  /** One run of a scheduled agent job by run id, or null. */
  scheduledAgentJobRun?: Maybe<ScheduledAgentJobRunObject>;
  /** Aggregate run counts across ALL scheduled agent jobs: live in-flight totals plus terminal outcomes since `since` (default: 24h ago). no_op is counted separately and is NOT a failure. */
  scheduledAgentJobRunStats: ScheduledAgentJobRunStatsObject;
  /** Run history for a scheduled agent job, newest first. */
  scheduledAgentJobRuns: Array<ScheduledAgentJobRunObject>;
  /** Every run that has not reached a terminal status yet — queued or running — across ALL scheduled agent jobs, oldest-first so the longest-running reads first. Capped; use scheduledAgentJobRuns for one job's history. */
  scheduledAgentJobRunsInFlight: Array<ScheduledAgentJobRunObject>;
  /** All scheduled agent jobs, newest first. */
  scheduledAgentJobs: Array<ScheduledAgentJobObject>;
  /** Semantic search over plan and task embeddings. Embeds the query and returns ranked chunks. Requires OpenThrottle Postgres and embedding (OPENAI_API_KEY or Ollama). */
  search: SearchResult;
  /** Semantic search over agent-asset (custom_prompt) embeddings. Embeds the query and returns ranked, de-duped assets (skills, rules, personas by default). Requires OpenThrottle Postgres and embedding (OPENAI_API_KEY or Ollama). */
  searchAgentAssets: AgentAssetSearchResult;
  /** Semantic search over plans/tasks (vector similarity). Requires OPENAI_API_KEY or Ollama for query embedding. Returns plans matching the query, deduped by plan id. */
  searchPlans: ListPlansByStatusResultObject;
  /** Server health: API, OpenThrottle DB, cms DB, Redis (BullMQ), and WebSocket. Each component is ok | unconfigured | unreachable. */
  serverHealth: ServerHealthObject;
  /** Current process CPU and memory snapshot. Memory in MB; CPU in ms (cumulative). Same data as REST GET /metrics. */
  serverMetrics: ServerMetricsObject;
  /** Get a service account by ID (admin, human only). */
  serviceAccount?: Maybe<ServiceAccountObject>;
  /** List credentials for a service account, including revoked (admin, human only). */
  serviceAccountCredentials: Array<ServiceAccountCredentialObject>;
  /** List all service accounts (admin, human only). */
  serviceAccounts: Array<ServiceAccountObject>;
  /** Resolve every skill's effective disable-model-invocation for a project and environment. Omit projectId to resolve the dogfood monorepo project (nx_project_name = 'monorepo'); returns an empty result when the project or its ingested rows are absent. environment (ci | interactive | ralph, default interactive) is rejected when unknown. Concerns model auto-invocation only — human /skill invocation is never gated. */
  skillAvailability: SkillAvailabilityResolutionResult;
  /** A project's skill-availability rule set (posture + rules), or null when the project has no rules (passthrough). Feeds resolveSkillAvailability. */
  skillAvailabilityRuleSet?: Maybe<SkillAvailabilityRuleSetObject>;
  /** The authenticated user's skill-tag vocabulary. Seeded from the platform default on first read. */
  skillTagVocabulary: SkillTagVocabularyResult;
  /** Aggregated skill usage over [start, end] (inclusive YYYY-MM-DD, UTC): top skills (with opt-in outcome stats), the ours / personal / third-party split, per-day series, and branch/cwd filter options. Optional scope/gitBranch/cwd/skillName narrow the aggregates. */
  skillUsage: SkillUsageResultObject;
  /** Git branches present in [start, end] (inclusive YYYY-MM-DD, UTC) for the /usage branch filter: the default branch (main, else master) first, then A-Z. Optional query narrows by case-insensitive substring; limit defaults to 20 and is capped at 50, with hasMore signalling that the search should be narrowed rather than paged. */
  skillUsageGitBranches: SkillUsageGitBranchSearchObject;
  /** A single tag→action rule by id, scoped to the authenticated user; null when absent or owned by someone else. */
  tagActionRule?: Maybe<TagActionRuleObject>;
  /** The authenticated user's tag→action rules, oldest first. */
  tagActionRules: Array<TagActionRuleObject>;
  /** Get a task by ID */
  task?: Maybe<TaskObject>;
  /** Get a task embedding by ID */
  taskEmbedding?: Maybe<TaskEmbeddingObject>;
  /** List task embeddings by task ID, ordered by createdAt ascending */
  taskEmbeddings: Array<TaskEmbeddingObject>;
  /** The canonical set of valid task statuses. Excludes QUEUED, which is plans-only. */
  taskStatuses: Array<PlanTaskStatus>;
  /** List tasks, ordered by planId then sortOrder then createdAt ascending. Capped at 100 by default (max 500); pass limit to override. Use tasksByPlanId/tasksByProjectId for scoped lists. */
  tasks: Array<TaskObject>;
  /** List tasks for a plan by plan ID, ordered by sortOrder then createdAt ascending */
  tasksByPlanId: Array<TaskObject>;
  /** List tasks for a project by project ID (FK). Optional limit/offset for pagination; when omitted returns all tasks and totalCount. */
  tasksByProjectId: TasksByProjectIdResultObject;
  /** Per-turn token/cost usage for the authenticated user over [start, end] (inclusive, YYYY-MM-DD), optionally narrowed to one provider and/or one agent account. Returns rows (newest first), summed totals, and the same range summed per agent account. */
  tokenUsage: TokenUsageResultObject;
  unverifiedWorkArtifacts: WorkArtifactListResult;
  /** Get a user by ID */
  user?: Maybe<UserObject>;
  /** Preferences for the authenticated user. All fields are null until the user saves one. */
  userPreferences: UserPreferencesObject;
  /** List all users, ordered by createdAt descending */
  users: Array<UserObject>;
  workArtifactsByPlan: WorkArtifactListResult;
  workArtifactsBySession: WorkArtifactListResult;
  workArtifactsByTask: WorkArtifactListResult;
  workLedgerCompleteness: WorkLedgerCompletenessResult;
  workSession?: Maybe<WorkSessionObject>;
  workSessionsByPlan: WorkSessionListResult;
  /** List local repositories for the authenticated user. */
  workspaceLocalRepositories: Array<WorkspaceLocalRepositoryObject>;
  /** Get a local repository by id for the authenticated user. */
  workspaceLocalRepository?: Maybe<WorkspaceLocalRepositoryObject>;
  /** Seed data for the add-folder picker: whether a native OS folder dialog can be opened on the server host for this request, the configured workspace roots (host view), and a default path to open the in-app picker at. */
  workspacePickerCapabilities: WorkspacePickerCapabilitiesObject;
  /** The authenticated user's repositories with their checkouts and inspection snapshots (snapshots refresh on view past the 15-minute TTL). */
  workspaceRepositories: Array<RepositoryObject>;
  /** A single repository the authenticated user has a checkout of, with those checkouts and inspection snapshots; null when the user owns no checkout of it. */
  workspaceRepository?: Maybe<RepositoryObject>;
  /** Workspace settings for the authenticated user (profile and local repositories). */
  workspaceSettings: WorkspaceSettingsObject;
  /** The workstream over a time window: run/session spans plus instant markers (task added, task updated, grilling, commit, PR, status change). Window is required and capped at 90 days. Rows are capped per kind; read `truncation` before presenting a lane as complete. */
  workstreamTimeline: WorkstreamTimelineResultObject;
};

export type QueryActivityByDateArgs = {
  input: ActivityByDateInput;
};

export type QueryActivityByDateRangeArgs = {
  input: ActivityByDateRangeInput;
};

export type QueryAgentTrajectoriesByPlanRunArgs = {
  planRunId: Scalars['ID']['input'];
};

export type QueryAgentTrajectoriesByTaskArgs = {
  taskId: Scalars['ID']['input'];
};

export type QueryAgentTrajectoryArgs = {
  id: Scalars['ID']['input'];
};

export type QueryAgentTrajectoryLabelsArgs = {
  trajectoryId: Scalars['ID']['input'];
};

export type QueryAvailableCmsTypenamesArgs = {
  layoutUuid: Scalars['String']['input'];
};

export type QueryBlogAdminPostArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type QueryBlogAdminPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Array<BlogPostState>>;
};

export type QueryBlogPostArgs = {
  slug: Scalars['String']['input'];
};

export type QueryBlogPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: Scalars['Int']['input'];
  tagSlug?: InputMaybe<Scalars['String']['input']>;
};

export type QueryBrowseDirectoryArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

export type QueryCmsFragmentArgs = {
  uuid: Scalars['String']['input'];
};

export type QueryCmsFragmentsArgs = {
  isSystem?: InputMaybe<Scalars['Boolean']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  typename?: InputMaybe<Scalars['String']['input']>;
};

export type QueryCmsLayoutArgs = {
  slug: Scalars['String']['input'];
};

export type QueryCmsLayoutByUuidArgs = {
  uuid: Scalars['String']['input'];
};

export type QueryCmsLayoutsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryCmsLibrariesArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryCmsLibraryArgs = {
  uuid: Scalars['String']['input'];
};

export type QueryCmsLibraryComponentArgs = {
  uuid: Scalars['String']['input'];
};

export type QueryCmsLibraryComponentsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryCmsSchemaArgs = {
  uuid: Scalars['String']['input'];
};

export type QueryCmsSchemaByTypenameArgs = {
  typename: Scalars['String']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};

export type QueryCmsSchemasArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  typename?: InputMaybe<Scalars['String']['input']>;
};

export type QueryCodeIndexStatusArgs = {
  repositoryId: Scalars['ID']['input'];
};

export type QueryCodeSemanticSearchArgs = {
  input: CodeSemanticSearchInput;
};

export type QueryCommitsPerPrArgs = {
  input: CommitsPerPrInput;
};

export type QueryCustomPromptArgs = {
  id: Scalars['ID']['input'];
};

export type QueryCustomPromptsArgs = {
  input?: InputMaybe<ListCustomPromptsInput>;
};

export type QueryDailyStatsArgs = {
  date: Scalars['String']['input'];
};

export type QueryDailyStatsRangeArgs = {
  end: Scalars['String']['input'];
  start: Scalars['String']['input'];
};

export type QueryDiscoveredWorktreesArgs = {
  refresh?: InputMaybe<Scalars['Boolean']['input']>;
};

export type QueryEvalDatasetArgs = {
  id: Scalars['ID']['input'];
};

export type QueryEvalDatasetsArgs = {
  repositoryId: Scalars['ID']['input'];
};

export type QueryEvalRunArgs = {
  id: Scalars['ID']['input'];
};

export type QueryEvalRunComparisonArgs = {
  baseRunId: Scalars['ID']['input'];
  candidateRunId: Scalars['ID']['input'];
};

export type QueryEvalRunReportArgs = {
  runId: Scalars['ID']['input'];
};

export type QueryEvalRunsArgs = {
  datasetId: Scalars['ID']['input'];
};

export type QueryEvaluateFeatureFlagsArgs = {
  anonymousId?: InputMaybe<Scalars['String']['input']>;
  applicationKey?: InputMaybe<Scalars['String']['input']>;
};

export type QueryGeneratorArgs = {
  input: GetGeneratorInput;
};

export type QueryGetAgentConversationArgs = {
  id: Scalars['ID']['input'];
};

export type QueryGetAgentConversationMessagesArgs = {
  input: GetAgentConversationMessagesInput;
};

export type QueryGetDocumentArgs = {
  id: Scalars['String']['input'];
};

export type QueryJobArgs = {
  jobId: Scalars['ID']['input'];
  queueName: Scalars['String']['input'];
};

export type QueryJudgeCalibrationsArgs = {
  graderId: Scalars['String']['input'];
};

export type QueryLastActivityArgs = {
  input: LastActivityInput;
};

export type QueryLinesAddedDeletedArgs = {
  input: LinesAddedDeletedInput;
};

export type QueryListAgentConversationsArgs = {
  input?: InputMaybe<ListAgentConversationsInput>;
};

export type QueryListPlansByStatusArgs = {
  input: ListPlansByStatusInput;
};

export type QueryNoteArgs = {
  id: Scalars['ID']['input'];
};

export type QueryOpenPrCountByAuthorArgs = {
  input: GitHubRepoInput;
};

export type QueryOpenToMergedCycleTimeArgs = {
  input: OpenToMergedCycleTimeInput;
};

export type QueryPermissionsForServiceAccountArgs = {
  serviceAccountId: Scalars['ID']['input'];
};

export type QueryPermissionsForUserArgs = {
  userId: Scalars['ID']['input'];
};

export type QueryPlanArgs = {
  id: Scalars['ID']['input'];
};

export type QueryPlanEmbeddingArgs = {
  input: GetPlanEmbeddingInput;
};

export type QueryPlanEmbeddingsArgs = {
  input: PlanEmbeddingsByPlanInput;
};

export type QueryPlanMessagesArgs = {
  input: ListPlanMessagesInput;
};

export type QueryPlanOutputStreamChunkArgs = {
  input: GetPlanOutputStreamChunkInput;
};

export type QueryPlanOutputStreamChunksArgs = {
  input: ListPlanOutputStreamChunksInput;
};

export type QueryPlanRunsByPlanIdArgs = {
  input: PlanRunsByPlanIdInput;
};

export type QueryPlansArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryPrCountByLabelArgs = {
  input: PrCountByLabelInput;
};

export type QueryPrTimeInStateSummaryArgs = {
  input: GitHubRepoInput;
};

export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};

export type QueryProjectSkillsArgs = {
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryPrsMergedPerPeriodArgs = {
  input: PrsMergedPerPeriodInput;
};

export type QueryPullArgs = {
  input: GetPullInput;
};

export type QueryPullsArgs = {
  input: ListPullsInput;
};

export type QueryQueueArgs = {
  input: QueueDetailsInput;
};

export type QueryQueueJobLogsArgs = {
  input: QueueJobLogsInput;
};

export type QueryRemainingTasksByPlanIdArgs = {
  input: RemainingTasksByPlanIdInput;
};

export type QueryRepeatableJobsArgs = {
  input: RepeatableJobsInput;
};

export type QueryResolvePlanRefArgs = {
  prefix: Scalars['String']['input'];
};

export type QueryReviewCycleTimeArgs = {
  input: ReviewCycleTimeInput;
};

export type QueryRoleArgs = {
  id: Scalars['ID']['input'];
};

export type QueryRolesForServiceAccountArgs = {
  serviceAccountId: Scalars['ID']['input'];
};

export type QueryRolesForUserArgs = {
  userId: Scalars['ID']['input'];
};

export type QueryRolloutFlagArgs = {
  id: Scalars['ID']['input'];
};

export type QueryRuleApplicationsArgs = {
  planId: Scalars['ID']['input'];
};

export type QueryScheduledAgentJobArgs = {
  id: Scalars['ID']['input'];
};

export type QueryScheduledAgentJobRunArgs = {
  runId: Scalars['ID']['input'];
};

export type QueryScheduledAgentJobRunStatsArgs = {
  since?: InputMaybe<Scalars['DateTime']['input']>;
};

export type QueryScheduledAgentJobRunsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  scheduledAgentJobId: Scalars['ID']['input'];
};

export type QueryScheduledAgentJobRunsInFlightArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QuerySearchArgs = {
  input: SearchInput;
};

export type QuerySearchAgentAssetsArgs = {
  input: AgentAssetSearchInput;
};

export type QuerySearchPlansArgs = {
  input: SearchPlansInput;
};

export type QueryServiceAccountArgs = {
  id: Scalars['ID']['input'];
};

export type QueryServiceAccountCredentialsArgs = {
  serviceAccountId: Scalars['ID']['input'];
};

export type QuerySkillAvailabilityArgs = {
  environment?: InputMaybe<Scalars['String']['input']>;
  planId?: InputMaybe<Scalars['ID']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  relevantOnly?: InputMaybe<Scalars['Boolean']['input']>;
  taskId?: InputMaybe<Scalars['ID']['input']>;
};

export type QuerySkillAvailabilityRuleSetArgs = {
  projectId: Scalars['ID']['input'];
};

export type QuerySkillUsageArgs = {
  cwd?: InputMaybe<Scalars['String']['input']>;
  end: Scalars['String']['input'];
  gitBranch?: InputMaybe<Scalars['String']['input']>;
  scope?: InputMaybe<Scalars['String']['input']>;
  skillName?: InputMaybe<Scalars['String']['input']>;
  start: Scalars['String']['input'];
};

export type QuerySkillUsageGitBranchesArgs = {
  end: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  skillName?: InputMaybe<Scalars['String']['input']>;
  start: Scalars['String']['input'];
};

export type QueryTagActionRuleArgs = {
  id: Scalars['ID']['input'];
};

export type QueryTaskArgs = {
  id: Scalars['ID']['input'];
};

export type QueryTaskEmbeddingArgs = {
  input: GetTaskEmbeddingInput;
};

export type QueryTaskEmbeddingsArgs = {
  input: TaskEmbeddingsByTaskInput;
};

export type QueryTasksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryTasksByPlanIdArgs = {
  input: TasksByPlanIdInput;
};

export type QueryTasksByProjectIdArgs = {
  input: TasksByProjectIdInput;
};

export type QueryTokenUsageArgs = {
  accountId?: InputMaybe<Scalars['String']['input']>;
  end: Scalars['String']['input'];
  provider?: InputMaybe<Scalars['String']['input']>;
  start: Scalars['String']['input'];
};

export type QueryUnverifiedWorkArtifactsArgs = {
  input: UnverifiedWorkArtifactsInput;
};

export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};

export type QueryWorkArtifactsByPlanArgs = {
  input: WorkArtifactsByPlanInput;
};

export type QueryWorkArtifactsBySessionArgs = {
  input: WorkArtifactsBySessionInput;
};

export type QueryWorkArtifactsByTaskArgs = {
  input: WorkArtifactsByTaskInput;
};

export type QueryWorkLedgerCompletenessArgs = {
  input: WorkLedgerCompletenessInput;
};

export type QueryWorkSessionArgs = {
  id: Scalars['String']['input'];
};

export type QueryWorkSessionsByPlanArgs = {
  input: WorkSessionsByPlanInput;
};

export type QueryWorkspaceLocalRepositoryArgs = {
  id: Scalars['ID']['input'];
};

export type QueryWorkspaceRepositoryArgs = {
  id: Scalars['ID']['input'];
};

export type QueryWorkstreamTimelineArgs = {
  input: WorkstreamTimelineInput;
};

export type QueueControlInput = {
  /** Queue name (e.g. plans). */
  queueName: Scalars['String']['input'];
};

export type QueueControlResultObject = {
  __typename?: 'QueueControlResultObject';
  /** Error message when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** Queue name when success is true. */
  queueName?: Maybe<Scalars['String']['output']>;
  /** Whether the control action was accepted. */
  success: Scalars['Boolean']['output'];
};

export type QueueDetailsInput = {
  /** Sort jobs ascending by timestamp. */
  asc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Max jobs to return. Omit or 0 to skip loading jobs. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Queue name (e.g. plans). */
  name: Scalars['String']['input'];
  /** Offset for job pagination. */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Job states to include (e.g. waiting, active, completed, failed, delayed). Defaults to all if empty. */
  states?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type QueueDetailsObject = {
  __typename?: 'QueueDetailsObject';
  /** Number of jobs currently being processed. */
  activeCount: Scalars['Int']['output'];
  /** Number of completed jobs. */
  completedCount: Scalars['Int']['output'];
  /** Number of delayed jobs. */
  delayedCount: Scalars['Int']['output'];
  /** Number of failed jobs. */
  failedCount: Scalars['Int']['output'];
  /** Paginated jobs for this queue (optional; omit for stats-only). */
  jobs?: Maybe<JobsResultObject>;
  /** Queue name (e.g. plans). */
  name: Scalars['String']['output'];
  /** Number of jobs waiting to be processed. */
  waitingCount: Scalars['Int']['output'];
};

export type QueueJobCompletedNotification = NotificationEvent & {
  __typename?: 'QueueJobCompletedNotification';
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  jobType: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  planId?: Maybe<Scalars['ID']['output']>;
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  taskId?: Maybe<Scalars['ID']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

export type QueueJobLogEventObject = {
  __typename?: 'QueueJobLogEventObject';
  /** Opaque cursor positioned AFTER this event; pass as `after` to resume. */
  cursor: Scalars['String']['output'];
  jobId: Scalars['String']['output'];
  level: QueueJobLogLevel;
  message: Scalars['String']['output'];
  queueName: Scalars['String']['output'];
  /** Origin layer, e.g. plans-queue | workflow-queue | ralph-shim. */
  source: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
};

/** Severity bucket for a keyed run-output log event (derived; see field semantics). */
export const QueueJobLogLevel = {
  Debug: 'debug',
  Error: 'error',
  Info: 'info',
  Warn: 'warn',
} as const;

export type QueueJobLogLevel =
  (typeof QueueJobLogLevel)[keyof typeof QueueJobLogLevel];
export type QueueJobLogPageObject = {
  __typename?: 'QueueJobLogPageObject';
  events: Array<QueueJobLogEventObject>;
  hasMore: Scalars['Boolean']['output'];
  /** Opaque cursor for the next page; null when caught up to end-of-file. */
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type QueueJobLogsInput = {
  /** Opaque cursor from a prior page. Mutually exclusive with `since`. */
  after?: InputMaybe<Scalars['String']['input']>;
  jobId: Scalars['String']['input'];
  /** Optional severity filter; empty/omitted = all levels. */
  levelIn?: InputMaybe<Array<QueueJobLogLevel>>;
  /** Max events; server-capped (default 200, hard max 1000). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  queueName: Scalars['String']['input'];
  /** ISO-8601 lower bound (inclusive). Mutually exclusive with `after`. */
  since?: InputMaybe<Scalars['DateTime']['input']>;
};

export type QueueStatsObject = {
  __typename?: 'QueueStatsObject';
  /** Number of jobs currently being processed. */
  activeCount: Scalars['Int']['output'];
  /** Number of completed jobs. */
  completedCount: Scalars['Int']['output'];
  /** Number of delayed jobs. */
  delayedCount: Scalars['Int']['output'];
  /** Number of failed jobs. */
  failedCount: Scalars['Int']['output'];
  /** Queue name (e.g. plans). */
  name: Scalars['String']['output'];
  /** Number of jobs waiting to be processed. */
  waitingCount: Scalars['Int']['output'];
};

/** Nested workflow-ralph logging: omit (default CLI/env), --debug, or --verbose. */
export const RalphNestedDebugCli = {
  Debug: 'debug',
  Omit: 'omit',
  Verbose: 'verbose',
} as const;

export type RalphNestedDebugCli =
  (typeof RalphNestedDebugCli)[keyof typeof RalphNestedDebugCli];
export type RalphPlanRunTuningInput = {
  /** Execution backend (e.g. cursor). Omit to use worktree defaults. */
  backend?: InputMaybe<Scalars['String']['input']>;
  /** Opt out of the worktree default and run in the base checkout. Omit to get the worktree OpenThrottle derives for the plan; only an explicit true disables it. */
  disableWorktree?: InputMaybe<Scalars['Boolean']['input']>;
  /** Reasoning-effort level for the run: "low", "medium", "high", "extraHigh", "max", or "ultra" (the same vocabulary as the chat composer's reasoning). Nullable + additive: omit to leave the run's effort unchanged. An unrecognized level is rejected. Recorded on the run's runConfigSnapshot and forwarded to the agent CLI, where each backend maps it to its own flag (claude --effort, codex -c model_reasoning_effort=, grok --reasoning-effort, opencode --variant), clamping to its accepted set; a backend with no reasoning knob (antigravity, cursor) ignores it. */
  effort?: InputMaybe<Scalars['String']['input']>;
  /** Per-iteration timeout in seconds (positive integer). */
  iterationTimeoutSeconds?: InputMaybe<Scalars['Int']['input']>;
  /** Max Ralph iterations for this run (positive integer). */
  iterations?: InputMaybe<Scalars['Int']['input']>;
  /** Model id passed to workflow-ralph --model. */
  model?: InputMaybe<Scalars['String']['input']>;
  /** Nx project name for workflow-ralph --project. */
  project?: InputMaybe<Scalars['String']['input']>;
  /** Prompt profile path (e.g. /agents-ralph) for --prompt. */
  prompt?: InputMaybe<Scalars['String']['input']>;
  /** Repo-relative or absolute path for --prompt-file (layer-1 prompt file). */
  promptFile?: InputMaybe<Scalars['String']['input']>;
  /** Whether to pass --debug / --verbose to nested workflow-ralph. */
  ralphDebugCli?: InputMaybe<RalphNestedDebugCli>;
  /** Cursor-only: pass --skip-worktree-setup to cursor-agent. */
  skipWorktreeSetup?: InputMaybe<Scalars['Boolean']['input']>;
  /** Worktree name for this run. When omitted, OpenThrottle derives plan-<short plan id> and creates that worktree itself; pass disableWorktree to run without one. */
  worktree?: InputMaybe<Scalars['String']['input']>;
  /** Cursor-only: branch/ref for --worktree-base. */
  worktreeBase?: InputMaybe<Scalars['String']['input']>;
};

export type RecordAgentTrajectoryInput = {
  /** Agent driver that produced the run, for example claude. */
  driver: Scalars['String']['input'];
  /** Wall-clock duration of the run in milliseconds. */
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  /** Process exit code of the run. */
  exitCode?: InputMaybe<Scalars['Int']['input']>;
  /** Optional key that makes recording idempotent: a second call with the same key returns the stored trajectory instead of inserting another. Clients use session:<sessionId>:<toolUseId> for session uploads and spawned:<planRunId>:<iteration> for spawned runs. At most 200 characters. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** Model that ran, when known. */
  model?: InputMaybe<Scalars['String']['input']>;
  /** Free-form result label for the run, for example completed. */
  outcome?: InputMaybe<Scalars['String']['input']>;
  /** Plan run the trajectory belongs to. */
  planRunId: Scalars['ID']['input'];
  /** How the trajectory was captured: spawned or session_upload. */
  source: Scalars['String']['input'];
  /** Task the run worked on. Omit for a run not scoped to one task. */
  taskId?: InputMaybe<Scalars['ID']['input']>;
  /** The ATIF document as a JSON string. Validated, then capped server-side at 4 MiB. */
  trajectoryJson: Scalars['String']['input'];
};

export type RecordEvalGradeInput = {
  /** Judge-cache key. Omit for graders that are not cached. */
  cacheKey?: InputMaybe<Scalars['String']['input']>;
  /** Cost of grading in USD. Omit for code graders and unpriceable judges. */
  costUsd?: InputMaybe<Scalars['Float']['input']>;
  /** Why the grader could not decide. Required when the verdict is error, and only then. */
  errorReason?: InputMaybe<Scalars['String']['input']>;
  /** Evidence the grader quoted, as a JSON string. Omit for an error verdict. */
  evidenceJson?: InputMaybe<Scalars['String']['input']>;
  /** Stable id of the grader. */
  graderId: Scalars['String']['input'];
  /** What produced the grade: code, judge or human. */
  graderKind: Scalars['String']['input'];
  /** Grader version. */
  graderVersion: Scalars['String']['input'];
  /** Driver that ran the judge. */
  judgeDriver?: InputMaybe<Scalars['String']['input']>;
  /** Model that ran the judge. Required when graderKind is judge. */
  judgeModel?: InputMaybe<Scalars['String']['input']>;
  /** Version or snapshot of the judge model when known. */
  judgeModelVersion?: InputMaybe<Scalars['String']['input']>;
  /** Trial being graded. */
  trialId: Scalars['ID']['input'];
  /** pass, fail or error. */
  verdict: Scalars['String']['input'];
};

export type RecordEvalRunInput = {
  /** How the CLI is billed: api_key or subscription. */
  authMode: Scalars['String']['input'];
  /** Token budget for the whole run. Omit for unlimited. */
  budgetTokens?: InputMaybe<Scalars['Int']['input']>;
  /** Dollar budget for the whole run. Omit for unlimited. */
  budgetUsd?: InputMaybe<Scalars['Float']['input']>;
  /** Dataset being run. */
  datasetId: Scalars['ID']['input'];
  /** Agent driver under test. */
  driver: Scalars['String']['input'];
  /** Reasoning effort under test. */
  effort?: InputMaybe<Scalars['String']['input']>;
  /** Attempts per case, at least 1. */
  k: Scalars['Int']['input'];
  /** Model under test. */
  model?: InputMaybe<Scalars['String']['input']>;
  /** Content SHA of the prompt under test. */
  promptSha?: InputMaybe<Scalars['String']['input']>;
  /** Content SHA of the skill under test. */
  skillSha?: InputMaybe<Scalars['String']['input']>;
  /** Initial status: pending (default) or running. */
  status?: InputMaybe<Scalars['String']['input']>;
};

export type RecordEvalTrialInput = {
  /** Attempt number, starting at 1. */
  attempt: Scalars['Int']['input'];
  /** Case that was attempted. */
  caseId: Scalars['ID']['input'];
  /** Cost of the attempt in USD. Omit when unpriceable. */
  costUsd?: InputMaybe<Scalars['Float']['input']>;
  /** Wall-clock duration in milliseconds. */
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  /** Failure message for an errored trial. */
  error?: InputMaybe<Scalars['String']['input']>;
  /** Run the trial belongs to. */
  runId: Scalars['ID']['input'];
  /** How the attempt ended: completed, errored or usage_limited. */
  status: Scalars['String']['input'];
  /** The recorded trajectory the attempt produced. */
  trajectoryId?: InputMaybe<Scalars['ID']['input']>;
};

export type RecordJudgeCalibrationInput = {
  /** Catch rate in [0, 1]. Omit when undefined. */
  catchRate?: InputMaybe<Scalars['Float']['input']>;
  /** Dataset whose cases were labelled. Omit for an ad hoc calibration. */
  datasetId?: InputMaybe<Scalars['ID']['input']>;
  /** False-fail rate in [0, 1]. Omit when undefined. */
  falseFailRate?: InputMaybe<Scalars['Float']['input']>;
  /** Id of the grader that was calibrated. */
  graderId: Scalars['String']['input'];
  /** Version of the grader that was calibrated. */
  graderVersion: Scalars['String']['input'];
  /** True for the held-out judge. Defaults to false. */
  heldOut?: Scalars['Boolean']['input'];
  /** Driver that ran the judge. */
  judgeDriver?: InputMaybe<Scalars['String']['input']>;
  /** Model that ran the judge. */
  judgeModel: Scalars['String']['input'];
  /** Version or snapshot of the judge model when known. */
  judgeModelVersion?: InputMaybe<Scalars['String']['input']>;
  /** Cohen's kappa. Omit when undefined. */
  kappa?: InputMaybe<Scalars['Float']['input']>;
  /** Upper bound of the bootstrap 95% interval of kappa. */
  kappaCiHigh?: InputMaybe<Scalars['Float']['input']>;
  /** Lower bound of the bootstrap 95% interval of kappa. */
  kappaCiLow?: InputMaybe<Scalars['Float']['input']>;
  /** Pairs used for the statistics. */
  n: Scalars['Int']['input'];
  /** Pairs left out because the judge returned an error verdict. */
  nExcluded?: Scalars['Int']['input'];
  /** Eval run the grades were read from. Omit when pairs were supplied directly. */
  runId?: InputMaybe<Scalars['ID']['input']>;
  /** Dataset split the labelled cases came from: dev or test. Needs datasetId. */
  split?: InputMaybe<Scalars['String']['input']>;
  /** unsupervised, gating, non_gating or insufficient. */
  status: Scalars['String']['input'];
};

export type RecordPlanRunHeartbeatInput = {
  /** Plan-run row id to bump the liveness heartbeat on (returned by registerCliPlanRun). */
  planRunId: Scalars['ID']['input'];
};

export type RecordSkillUsageInput = {
  /** Subagent id when the Skill call happened inside a nested agent. */
  agentId?: InputMaybe<Scalars['String']['input']>;
  /** Subagent type when present. */
  agentType?: InputMaybe<Scalars['String']['input']>;
  /** Args after client privacy seam. Pass null for name-only. */
  args?: InputMaybe<Scalars['String']['input']>;
  /** Working directory at invocation time. */
  cwd?: InputMaybe<Scalars['String']['input']>;
  /** Git branch at capture time. */
  gitBranch?: InputMaybe<Scalars['String']['input']>;
  /** Hook event name (PreToolUse or UserPromptExpansion). */
  hookEventName?: InputMaybe<Scalars['String']['input']>;
  /** Invocation path: skill_tool or slash. */
  invocationPath?: InputMaybe<Scalars['String']['input']>;
  /** Client-reported invocation timestamp (JSONL timestamp). */
  occurredAt: Scalars['DateTime']['input'];
  /** Client privacy level: name-only | truncated | full. Defaults to truncated. */
  privacyLevel?: InputMaybe<Scalars['String']['input']>;
  /** Harness prompt_id when present. */
  promptId?: InputMaybe<Scalars['String']['input']>;
  /** ours | injected | personal | third-party. */
  scope: Scalars['String']['input'];
  /** Harness session id when present. */
  sessionId?: InputMaybe<Scalars['String']['input']>;
  /** Skill identifier (e.g. ot-plans, vercel:deploy). */
  skillName: Scalars['String']['input'];
  /** Producer id of the capturing tool/adapter (e.g. claude-code, cursor). Stamped by the per-tool skill-usage adapter. */
  source?: InputMaybe<Scalars['String']['input']>;
  /** Harness tool_use_id when present. */
  toolUseId?: InputMaybe<Scalars['String']['input']>;
};

export type RecordSkillUsageOutcomeInput = {
  /** Working directory at outcome time. */
  cwd?: InputMaybe<Scalars['String']['input']>;
  /** True when a deliberate reporter (the skill-usage-outcome helper, or an adapter relaying a harness-observed failure) sent this outcome. A success/error without it is stored as legacy_assumed_success, because a stale pre-#537 hook hardcoded success. session_ended and abandoned make no quality claim and do not need it. */
  deliberate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Wall-clock duration in milliseconds when the skill reports it. */
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  /** Git branch at outcome time. */
  gitBranch?: InputMaybe<Scalars['String']['input']>;
  /** Client-reported outcome timestamp. */
  occurredAt: Scalars['DateTime']['input'];
  /** success | abandoned | error. */
  outcome: Scalars['String']['input'];
  /** ours | injected | personal | third-party. Omitting it defaults to ours — a legacy default for senders that predate the field; every current hook posts an explicit scope. */
  scope?: InputMaybe<Scalars['String']['input']>;
  /** Harness session id — primary correlation key with skillName. */
  sessionId?: InputMaybe<Scalars['String']['input']>;
  /** Skill identifier matching the start event. */
  skillName: Scalars['String']['input'];
  /** Producer id of the tool/adapter that recorded this outcome (e.g. claude-code, cursor). Stamped by the per-tool skill-usage adapter; matches the start event's source. */
  source?: InputMaybe<Scalars['String']['input']>;
  /** Optional tool_use_id for tighter start↔outcome correlation. */
  toolUseId?: InputMaybe<Scalars['String']['input']>;
};

/** The agent account (login) a hook saw the turn billed to, as the agent CLI reported it. No credential value is ever sent. */
export type RecordTokenUsageAccountInput = {
  /** What the turn billed: api_key, subscription or unknown. Any other value is stored as unknown. */
  credentialKind: Scalars['String']['input'];
  /** Login email the CLI reported, when it reports one. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** The provider's stable id for the login (for claude, <orgId>:<email>). The grouping key; a blank value leaves the row unattributed. */
  externalAccountId: Scalars['String']['input'];
  /** Provider organization or team id, when reported. */
  orgId?: InputMaybe<Scalars['String']['input']>;
  /** Provider organization or team name, when reported. */
  orgName?: InputMaybe<Scalars['String']['input']>;
  /** Subscription plan (for claude: pro, max, team, ...), when reported. */
  plan?: InputMaybe<Scalars['String']['input']>;
};

export type RecordTokenUsageInput = {
  /** Usage rows to ingest, at most 500 per call. The whole batch is rejected (BAD_REQUEST, naming the row index) if any row is invalid. */
  rows: Array<RecordTokenUsageRowInput>;
};

export type RecordTokenUsageResultObject = {
  __typename?: 'RecordTokenUsageResultObject';
  /** Rows written by this call. */
  inserted: Scalars['Int']['output'];
  /** Rows skipped because (source, sessionId, requestId) was already recorded. */
  skipped: Scalars['Int']['output'];
};

export type RecordTokenUsageRowInput = {
  /** The agent account the turn was billed to, stamped by the hook at capture time. Null (or absent) leaves the row unattributed. Attribution never rejects a batch: an unusable account is ignored. */
  account?: InputMaybe<RecordTokenUsageAccountInput>;
  /** Cache-read tokens for the turn, when reported. */
  cacheReadTokens?: InputMaybe<Scalars['Float']['input']>;
  /** Cache-creation (cache-write) tokens for the turn, when reported. */
  cacheWriteTokens?: InputMaybe<Scalars['Float']['input']>;
  /** Dollar cost of the turn when the producer priced it. When null, the server estimates it at Anthropic list price if the request can be priced exactly. */
  costUsd?: InputMaybe<Scalars['Float']['input']>;
  /** Working directory the harness reported. */
  cwd?: InputMaybe<Scalars['String']['input']>;
  /** Git branch the harness reported. */
  gitBranch?: InputMaybe<Scalars['String']['input']>;
  /** Input/prompt tokens for the turn, when reported. */
  inputTokens?: InputMaybe<Scalars['Float']['input']>;
  /** Model the usage is attributed to. Must not be blank. */
  model: Scalars['String']['input'];
  /** When the turn happened, as an ISO-8601 timestamp (the transcript timestamp). Stored as created_at, so a late JSONL drain lands on the day the turn actually ran. */
  occurredAt: Scalars['String']['input'];
  /** Output/completion tokens for the turn, when reported. */
  outputTokens?: InputMaybe<Scalars['Float']['input']>;
  /** Provider identity (for example claude). Must not be blank. */
  provider: Scalars['String']['input'];
  /** The raw provider usage payload, JSON-serialized (repo convention: no JSON scalar). Must parse to a JSON object; null to omit. */
  rawUsageJson?: InputMaybe<Scalars['String']['input']>;
  /** Reasoning tokens for the turn, when reported separately. */
  reasoningTokens?: InputMaybe<Scalars['Float']['input']>;
  /** Provider API request id. With source and sessionId it is the idempotency key: a re-sent row is skipped. A row without one is never deduplicated. */
  requestId?: InputMaybe<Scalars['String']['input']>;
  /** The agent harness's own session id. */
  sessionId?: InputMaybe<Scalars['String']['input']>;
  /** Producer id of the capturing tool (for example claude-code). Free text; must not be blank. */
  source: Scalars['String']['input'];
  /** Total tokens for the turn, when reported. */
  totalTokens?: InputMaybe<Scalars['Float']['input']>;
};

export type RecordWorkArtifactInput = {
  /** Optional human-readable note (e.g. commit message) */
  message?: InputMaybe<Scalars['String']['input']>;
  /** JSON-serialized payload; validated server-side against the type's schema */
  payloadJson: Scalars['String']['input'];
  /** Session that produced the artifact */
  sessionId: Scalars['ID']['input'];
  /** Artifact type: git_commit | pull_request | document | deployment | status_change */
  type: Scalars['String']['input'];
};

/** Re-run inspection on an owned checkout. */
export type RefreshCheckoutInput = {
  id: Scalars['ID']['input'];
};

/** Result of refreshCheckout: the checkout with its updated snapshot, drift flags, and the (possibly merged) repository. */
export type RefreshCheckoutPayloadObject = {
  __typename?: 'RefreshCheckoutPayloadObject';
  checkout: RepositoryCheckoutObject;
  drift: CheckoutDriftObject;
  /** True when a provisional repository gained a remote and merged into an existing canonical repository (its checkouts re-pointed; the canonical project link won). */
  merged: Scalars['Boolean']['output'];
  /** The checkout's repository after any promotion or merge. */
  repository: RepositoryObject;
  /** Project link that was dropped from the provisional repository when the merge kept the canonical link. */
  supersededProjectId?: Maybe<Scalars['String']['output']>;
};

export type RegisterCliPlanRunInput = {
  /** OPTIONAL git branch this detached-CLI run operates on. Captured on plan_runs.branch as run provenance. Omit or null → store null; non-empty strings are stored verbatim (no server-side trim/reject — enqueue remains the REQUIRED branch boundary). */
  branch?: InputMaybe<Scalars['String']['input']>;
  /** Execution backend for this run: antigravity, claude, codex, cursor, grok, or opencode. */
  executionBackend: Scalars['String']['input'];
  /** Whether this run's owner bumps its heartbeat on a ~15s timer. Omit or null → true, so the detached workflow-ralph CLI (which does) is unaffected. Pass false for an owner with no timer — an interactive /ot-loop agent turn, where a single test run outlives the staleness cutoff. A false run is exempt from the stale sweep, always reports isStale false, and can never yield RUN_STOPPING on cancel; nothing server-side will ever settle it, so its owner must. */
  heartbeatExpected?: InputMaybe<Scalars['Boolean']['input']>;
  /** Host the CLI is running on (diagnostic; cleared on settle). Null when unknown. */
  hostname?: InputMaybe<Scalars['String']['input']>;
  /** OPTIONAL resolved agent model id for this run (e.g. claude-opus-5). Captured on plan_runs.model as run provenance. Omit or null → store null; non-empty strings are stored verbatim. Prefer null over a guess: a wrong value here is worse than a missing one, because nothing downstream can tell it is wrong. */
  model?: InputMaybe<Scalars['String']['input']>;
  /** OS process id of the CLI process (cleared on settle). Null when unknown. */
  pid?: InputMaybe<Scalars['Int']['input']>;
  /** Plan id this detached-CLI run executes. */
  planId: Scalars['ID']['input'];
  /** Worker/run identifier for the CLI (cleared on settle). Null when unknown. */
  workerId?: InputMaybe<Scalars['String']['input']>;
};

export type RegisterInput = {
  /** User email (must be unique) */
  email: Scalars['String']['input'];
  /** GitHub username for display; defaults to email local part if omitted */
  githubUsername?: InputMaybe<Scalars['String']['input']>;
  /** User password (stored hashed with bcrypt) */
  password: Scalars['String']['input'];
};

export type RegisterPlanRunWorktreeCheckoutInput = {
  /** Absolute filesystem path of the resolved worktree for this run. */
  filesystemPath: Scalars['String']['input'];
  /** Plan-run row id whose checkout_id (and branch) should be pointed at the linked worktree path. */
  planRunId: Scalars['ID']['input'];
};

export type RegisterResultObject = {
  __typename?: 'RegisterResultObject';
  /** JWT access token so the client can stay logged in without calling login */
  accessToken: Scalars['String']['output'];
  /** Registered email */
  email: Scalars['String']['output'];
  /** Created user id (UUID) */
  id: Scalars['String']['output'];
};

export type RemainingTasksByPlanIdInput = {
  /** Plan id; returns tasks with status in PENDING, IN_PROGRESS, BLOCKED */
  planId: Scalars['ID']['input'];
};

export type RemovePermissionFromRoleInput = {
  /** Permission id to remove */
  permissionId: Scalars['ID']['input'];
  /** Role id to remove the permission from */
  roleId: Scalars['ID']['input'];
};

/** Result of removePlanRunWorktree for one worktree checkout. */
export type RemovePlanRunWorktreePayloadObject = {
  __typename?: 'RemovePlanRunWorktreePayloadObject';
  /** The branch the worktree had checked out, which survives the removal. Null when nothing was removed. */
  branch?: Maybe<Scalars['String']['output']>;
  checkoutId: Scalars['ID']['output'];
  /** Why the worktree was kept, in a sentence. Null when it was removed. */
  detail?: Maybe<Scalars['String']['output']>;
  outcome: PlanRunWorktreeTeardownOutcome;
  /** The worktree's path on the server host. */
  path: Scalars['String']['output'];
};

export type RemovePlanTagInput = {
  /** Plan to remove the tag from. */
  planId: Scalars['ID']['input'];
  /** Tag slug to remove. */
  tag: Scalars['String']['input'];
};

export type RemoveProjectSkillTagInput = {
  /** Project whose skill row to untag. Omit to target the dogfood monorepo project. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** Skill slug (project_skills.slug). */
  slug: Scalars['String']['input'];
  /** Tag slug to remove. */
  tag: Scalars['String']['input'];
};

export type RemoveProjectTagInput = {
  /** Project to remove the tag from. */
  projectId: Scalars['ID']['input'];
  /** Tag slug to remove. */
  tag: Scalars['String']['input'];
};

export type RemoveRepeatableJobInput = {
  /** Repeatable job key (from repeatableJobs query). Required to remove a repeatable job. */
  key: Scalars['String']['input'];
  /** Queue name (e.g. plans). */
  queueName: Scalars['String']['input'];
};

export type RemoveRepeatableJobResultObject = {
  __typename?: 'RemoveRepeatableJobResultObject';
  /** Error message when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** Whether the repeatable job was removed. */
  success: Scalars['Boolean']['output'];
};

export type RemoveRoleFromServiceAccountInput = {
  roleId: Scalars['ID']['input'];
  serviceAccountId: Scalars['ID']['input'];
};

export type RemoveRoleFromUserInput = {
  /** Role id to remove */
  roleId: Scalars['ID']['input'];
  /** User id to remove the role from */
  userId: Scalars['ID']['input'];
};

export type RemoveSkillTagInput = {
  /** Tag slug to remove. */
  tag: Scalars['String']['input'];
};

export type RemoveTaskTagInput = {
  /** Tag slug to remove. */
  tag: Scalars['String']['input'];
  /** Task to remove the tag from. */
  taskId: Scalars['ID']['input'];
};

export type RenameSkillTagInput = {
  /** Existing tag slug to rename. */
  from: Scalars['String']['input'];
  /** New kebab-case tag slug. */
  to: Scalars['String']['input'];
};

export type ReorderPlanTasksInput = {
  /** Plan id whose tasks are being reordered */
  planId: Scalars['ID']['input'];
  /** Task ids in desired order; sortOrder is reassigned 1000, 2000, … atomically */
  taskIds: Array<Scalars['ID']['input']>;
};

export type RepeatableJobObject = {
  __typename?: 'RepeatableJobObject';
  /** Unix timestamp when the repeat ends, or null if no end. */
  endDate?: Maybe<Scalars['Float']['output']>;
  /** Interval string (e.g. "1 hour", "2 days"), or null for cron. */
  every?: Maybe<Scalars['String']['output']>;
  /** Optional job id for the next scheduled run. */
  id?: Maybe<Scalars['String']['output']>;
  /** Unique key for the repeatable job (use with removeRepeatableJob). */
  key: Scalars['String']['output'];
  /** Job type name (e.g. run-plan). */
  name: Scalars['String']['output'];
  /** Unix timestamp of the next run. */
  next?: Maybe<Scalars['Float']['output']>;
  /** Cron pattern (e.g. "0 9 * * 1-5"), or null for every-based. */
  pattern?: Maybe<Scalars['String']['output']>;
  /** Timezone for cron (e.g. Europe/London), or null. */
  tz?: Maybe<Scalars['String']['output']>;
};

export type RepeatableJobsInput = {
  /** Sort repeatable jobs ascending. */
  asc?: InputMaybe<Scalars['Boolean']['input']>;
  /** End index for pagination. */
  end?: InputMaybe<Scalars['Int']['input']>;
  /** Queue name (e.g. plans). */
  queueName: Scalars['String']['input'];
  /** Start index for pagination. */
  start?: InputMaybe<Scalars['Int']['input']>;
};

export type ReplaceAgentTrajectoryInput = {
  /** Wall-clock duration of the run in milliseconds. */
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  /** Process exit code of the run. */
  exitCode?: InputMaybe<Scalars['Int']['input']>;
  /** Optional key that makes a later recordAgentTrajectory with the same key a no-op. At most 200 characters. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** Model that ran, when known. */
  model?: InputMaybe<Scalars['String']['input']>;
  /** Free-form result label for the run, for example completed. */
  outcome?: InputMaybe<Scalars['String']['input']>;
  /** Plan run the trajectory belongs to after the replace. */
  planRunId: Scalars['ID']['input'];
  /** The ATIF document as a JSON string. Validated, then capped server-side at 4 MiB. */
  trajectoryJson: Scalars['String']['input'];
};

/** A per-user on-disk instance of a repository. Paths are on the server host. */
export type RepositoryCheckoutObject = {
  __typename?: 'RepositoryCheckoutObject';
  createdAt: Scalars['DateTime']['output'];
  displayName: Scalars['String']['output'];
  /** Absolute path on the server host. */
  filesystemPath: Scalars['String']['output'];
  /** True when this user opts this checkout into foreign-workspace skill injection (OpenThrottle curated skills projected in on foreign runs). Default false (opt-in). */
  foreignSkillInjectionEnabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** Cached inspection snapshot; null until the first scan completes. */
  inspection?: Maybe<RepositoryInspectionObject>;
  /** True when this checkout is a foreign workspace (not the OpenThrottle monorepo itself). Foreign-only settings such as the worktree skill overlay are not meaningful when false. */
  isForeign: Scalars['Boolean']['output'];
  /** 'primary' or 'worktree' (worktree reserved for future workflow unification). */
  kind: Scalars['String']['output'];
  /** True when OpenThrottle cloned this checkout into the managed checkout root. */
  managed: Scalars['Boolean']['output'];
  repositoryId: Scalars['ID']['output'];
  scannedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
  /** True (default, opt-out) when the ot-worktree skill overlay is applied to worktrees of this foreign checkout; false falls back to the server's SSOT worktree scripts, and worktrees keep working. */
  worktreeSkillOverlayEnabled: Scalars['Boolean']['output'];
};

/** Presence of agent configuration files at the checkout root. */
export type RepositoryInspectionAgentConfigObject = {
  __typename?: 'RepositoryInspectionAgentConfigObject';
  agentsMd: Scalars['Boolean']['output'];
  claudeMd: Scalars['Boolean']['output'];
  cursorRules: Scalars['Boolean']['output'];
  mcpJson: Scalars['Boolean']['output'];
  skillsDir: Scalars['Boolean']['output'];
};

/** Git state detected at the checkout root; nulls mean the probe failed or does not apply. */
export type RepositoryInspectionGitObject = {
  __typename?: 'RepositoryInspectionGitObject';
  currentBranch?: Maybe<Scalars['String']['output']>;
  defaultBranch?: Maybe<Scalars['String']['output']>;
  dirty?: Maybe<Scalars['Boolean']['output']>;
  isRepo: Scalars['Boolean']['output'];
  linkedWorktrees: Array<Scalars['String']['output']>;
  normalizedRemoteUrl?: Maybe<Scalars['String']['output']>;
};

/** Whether this checkout can actually produce skill-usage telemetry, and if not why not. Carries no secret: the endpoint URL and auth token never cross this boundary, only whether each resolved and which location supplied it. */
export type RepositoryInspectionHookTelemetryObject = {
  __typename?: 'RepositoryInspectionHookTelemetryObject';
  /** True when an auth token resolved. The token itself is never exposed. */
  authTokenConfigured: Scalars['Boolean']['output'];
  /** True when an endpoint resolved. The URL itself is never exposed. */
  endpointConfigured: Scalars['Boolean']['output'];
  /** Which location supplied the endpoint: repo_env, process_env, user_env, or none. */
  endpointSource: Scalars['String']['output'];
  /** Hook configs found in the checkout, e.g. claude, cursor, codex. Empty means nothing in this checkout wires the hooks up — an OT-orchestrated run still records, since the driver passes --plugin-dir at spawn time. */
  producers: Array<Scalars['String']['output']>;
  /** Machine-readable reason for a non-recording status: no_producer, no_endpoint, no_auth_token, or offline_flag. Null when recording. */
  reason?: Maybe<Scalars['String']['output']>;
  /** recording, buffering, offline, or not_wired. */
  status: Scalars['String']['output'];
  /** Absolute path telemetry buffers to when it cannot be sent. */
  telemetryDir: Scalars['String']['output'];
};

/** Cached inspection snapshot for a checkout; disk is the source of truth and this refreshes on view (15-minute TTL) or via refreshCheckout. */
export type RepositoryInspectionObject = {
  __typename?: 'RepositoryInspectionObject';
  agentConfig: RepositoryInspectionAgentConfigObject;
  git: RepositoryInspectionGitObject;
  /** Absent on snapshots written before hook-readiness was reported; refresh the checkout to populate it. */
  hookTelemetry?: Maybe<RepositoryInspectionHookTelemetryObject>;
  scannedAt: Scalars['DateTime']['output'];
  stack: RepositoryInspectionStackObject;
  warnings: Array<Scalars['String']['output']>;
};

/** Stack markers detected at the checkout root (root-level heuristics only). */
export type RepositoryInspectionStackObject = {
  __typename?: 'RepositoryInspectionStackObject';
  languages: Array<Scalars['String']['output']>;
  nxWorkspace: Scalars['Boolean']['output'];
  packageManager?: Maybe<Scalars['String']['output']>;
  pnpmWorkspace: Scalars['Boolean']['output'];
  turbo: Scalars['Boolean']['output'];
};

/** A repository identity shared across users, keyed by normalized git remote URL; provisional (no remote) until one is detected. */
export type RepositoryObject = {
  __typename?: 'RepositoryObject';
  /** The authenticated user's checkouts of this repository. */
  checkouts: Array<RepositoryCheckoutObject>;
  createdAt: Scalars['DateTime']['output'];
  defaultBranch?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Canonical https form of the remote; null for provisional local-only repositories. */
  normalizedRemoteUrl?: Maybe<Scalars['String']['output']>;
  project?: Maybe<ProjectObject>;
  /** OpenThrottle project linked at the repository level. */
  projectId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReschedulePlanRunInput = {
  /** Plan id the scheduled run belongs to. */
  planId: Scalars['ID']['input'];
  /** plan_runs id of the SCHEDULED run to move. Any other status is rejected. */
  planRunId: Scalars['ID']['input'];
  /** The new absolute instant the run fires at: in the future and within 30 days (SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS), the same rule as schedulePlanRun. */
  scheduledFor: Scalars['DateTime']['input'];
};

export type RetryJobInput = {
  /** BullMQ job id to retry. */
  jobId: Scalars['ID']['input'];
  /** Queue name (e.g. plans). */
  queueName: Scalars['String']['input'];
};

export type RetryJobResultObject = {
  __typename?: 'RetryJobResultObject';
  /** Error message when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** Job id when success is true. */
  jobId?: Maybe<Scalars['String']['output']>;
  /** Whether the retry was accepted. */
  success: Scalars['Boolean']['output'];
};

export type ReviewCycleTimeInput = {
  /** Max merged PRs to fetch reviews for (default 100); caps API calls. */
  maxPrs?: InputMaybe<Scalars['Int']['input']>;
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Bucket by week (YYYY-Www) or month (YYYY-MM); omit for repo-wide summary. */
  period?: InputMaybe<Scalars['String']['input']>;
  /** Repository name */
  repo: Scalars['String']['input'];
};

export type ReviewCycleTimeObject = {
  __typename?: 'ReviewCycleTimeObject';
  /** Median number of days from last changes requested to first subsequent approval or merge. */
  medianDays?: Maybe<Scalars['Float']['output']>;
  /** 90th percentile of days from last changes requested to first subsequent approval or merge. */
  p90Days?: Maybe<Scalars['Float']['output']>;
  /** Period bucket (e.g. YYYY-MM or YYYY-Www in UTC), or null for repo-wide. */
  period?: Maybe<Scalars['String']['output']>;
  /** Number of merged PRs in this bucket that had at least one CHANGES_REQUESTED and then an APPROVED or merge. */
  prCount: Scalars['Int']['output'];
};

export type RoleObject = {
  __typename?: 'RoleObject';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  /** Role identifier (e.g. admin, user, viewer) */
  name: Scalars['String']['output'];
  /** Permissions assigned to this role */
  permissions: Array<PermissionObject>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Why a rollout variation was chosen: off | target_roles | fallthrough | flag_not_found. */
export const RolloutEvaluationReason = {
  Fallthrough: 'fallthrough',
  FlagNotFound: 'flag_not_found',
  Off: 'off',
  TargetRoles: 'target_roles',
} as const;

export type RolloutEvaluationReason =
  (typeof RolloutEvaluationReason)[keyof typeof RolloutEvaluationReason];
/** One weighted fallthrough bucket (variation index + integer percent). */
export type RolloutFallthroughBucketInput = {
  /** Index into the flag's variations array. */
  variation: Scalars['Int']['input'];
  /** Integer percent weight 0–100. All weights must sum to 100. */
  weight: Scalars['Int']['input'];
};

/** One weighted bucket in a fallthrough allocation (integer percent 0–100). */
export type RolloutFallthroughBucketObject = {
  __typename?: 'RolloutFallthroughBucketObject';
  /** Index into the flag's variations array. */
  variation: Scalars['Int']['output'];
  /** Integer percent weight 0–100. All weights on a flag must sum to 100. */
  weight: Scalars['Int']['output'];
};

/** Percentage allocation among variations. */
export type RolloutFallthroughInput = {
  /** Ordered weighted buckets. Weights must sum to 100. */
  variations: Array<RolloutFallthroughBucketInput>;
};

/** Percentage allocation among variations when the flag is on and targeting passes. */
export type RolloutFallthroughObject = {
  __typename?: 'RolloutFallthroughObject';
  /** Ordered weighted buckets. Weights must sum to 100. */
  variations: Array<RolloutFallthroughBucketObject>;
};

/** Typed rollout flag kind: boolean | string | number | json. Variation values must match. */
export const RolloutFlagKind = {
  Boolean: 'boolean',
  Json: 'json',
  Number: 'number',
  String: 'string',
} as const;

export type RolloutFlagKind =
  (typeof RolloutFlagKind)[keyof typeof RolloutFlagKind];
/** Admin view of a typed rollout feature flag (kind, variations, allocations). */
export type RolloutFlagObject = {
  __typename?: 'RolloutFlagObject';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** Master switch. When false the flag is off for everyone. */
  enabled: Scalars['Boolean']['output'];
  /** Fallthrough percentage allocation when enabled and targeting passes. */
  fallthrough: RolloutFallthroughObject;
  id: Scalars['ID']['output'];
  /** Unique flag key (e.g. new-dashboard or billing.invoices) */
  key: Scalars['String']['output'];
  /** Flag value kind: boolean | string | number | json. */
  kind: RolloutFlagKind;
  /** Index into variations returned when disabled or role gate fails. */
  offVariation: Scalars['Int']['output'];
  /** RBAC role names the flag targets. Empty => enabled for everyone. */
  targetRoles: Array<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  /** Ordered variations. valueJson is JSON-serialized and must match kind. */
  variations: Array<RolloutFlagVariationObject>;
};

/** One variation input. valueJson is JSON-serialized and must match kind. */
export type RolloutFlagVariationInput = {
  /** Optional human description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Optional display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** JSON-serialized variation value (must match the flag kind). */
  valueJson: Scalars['String']['input'];
};

/** One variation on a typed rollout flag. valueJson is JSON-serialized. */
export type RolloutFlagVariationObject = {
  __typename?: 'RolloutFlagVariationObject';
  /** Optional human description of this variation. */
  description?: Maybe<Scalars['String']['output']>;
  /** Optional display name for this variation. */
  name?: Maybe<Scalars['String']['output']>;
  /** JSON-serialized variation value (must match the flag kind). */
  valueJson: Scalars['String']['output'];
};

/** One apply-once ledger row for a (rule, plan) pair. States: applied | pre-satisfied | flagged | orphaned. */
export type RuleApplicationObject = {
  __typename?: 'RuleApplicationObject';
  createdAt: Scalars['DateTime']['output'];
  /** JSON-encoded executor context for the state (e.g. {"reason":"skill-unavailable"}). */
  detailsJson?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  planId: Scalars['ID']['output'];
  ruleId: Scalars['ID']['output'];
  /** applied | pre-satisfied | flagged | orphaned. */
  state: Scalars['String']['output'];
  /** The injected (or pre-satisfying) task; null when not applicable or after a human deleted the task. */
  taskId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** One resolved worktree root and what the depth-1 scan of it found. */
export type ScannedWorktreeRootObject = {
  __typename?: 'ScannedWorktreeRootObject';
  /** The configured worktree root this directory sits under, before OpenThrottle joins <org>/<repo> onto it — absolute and ~-expanded, on the server host. This is the value to show a person; path is one repository's folder beneath it. Several scanned roots share a baseRoot whenever their repositories share a configured root, so de-duplicate before listing. */
  baseRoot: Scalars['String']['output'];
  /** Whether the directory is there at all. False is the ordinary state of a repository with no worktrees yet — it is data, not a failure. */
  exists: Scalars['Boolean']['output'];
  /** The directory actually scanned: baseRoot joined with the repository's <org>/<repo>. Absolute path on the server host. */
  path: Scalars['String']['output'];
  /** Which rung of the shared ladder resolved this root. */
  source: WorktreeRootSource;
  /** Linked worktrees this root contributed to the result. */
  worktreeCount: Scalars['Int']['output'];
};

export type SchedulePlanRunInput = {
  /** REQUIRED git branch this run operates on. Captured on plan_runs.branch as run provenance (powers branch->PR mapping). Passed explicitly by callers (skills/UI may pre-fill a default from the worktree name / HEAD) and never inferred server-side; enqueue fails fast when missing or blank. */
  branch: Scalars['String']['input'];
  /** Optional registered checkout id (highest precedence). Resolved server-side to its filesystem path for this run; when set it overrides repositoryId and workingDirectory. */
  checkoutId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional dedupe key passed to BullMQ as jobId. Re-enqueue with the same key returns the existing job id instead of creating a duplicate. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** Optional JSON override for job-run lifecycle hooks for this enqueue only ({ hooks: [...] }). When omitted, hooks are copied from the plan. Validated against repo paths when workingDirectory is set. */
  jobRunHooksJson?: InputMaybe<Scalars['String']['input']>;
  /** Plan id to enqueue a run for */
  planId: Scalars['ID']['input'];
  /** Job priority (lower = higher priority). 1=interactive/UI, 10=normal (default), 100=batch/scheduled. Omit to use normal priority. */
  priority?: InputMaybe<Scalars['Int']['input']>;
  /** Optional Ralph / workflow-ralph runtime tuning (iterations, model, backend, etc.). When set, queued workers pass these to nested workflow-ralph; when omitted, defaults come from env and .workflow-ralph.json in the worktree cwd. */
  ralph?: InputMaybe<RalphPlanRunTuningInput>;
  /** Set true to reschedule a SCHEDULED plan: its scheduled run is cancelled and this one recorded in its place, in one transaction; the plan stays SCHEDULED. Without it, scheduling a plan that already has a scheduled run fails with extensions.code PLAN_ALREADY_SCHEDULED. Only PENDING and BACKLOG plans can be scheduled otherwise (PLAN_ACTIVE for QUEUED / IN_PROGRESS, PLAN_NOT_SCHEDULABLE for BLOCKED and terminal plans). */
  replaceScheduled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Optional registered repository id. Resolved to the enqueuing user's single checkout of that repository (errors when there is no checkout, or when it is ambiguous). Used when checkoutId is omitted. */
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  /** Which runner executes the run: "ralph" (the default) or "ot-loop" (the per-task discipline of /ot-loop run as deterministic job code, with a fresh worker per task). Nullable + additive: omit to use the plan's stored runConfig runner, else Ralph. An unrecognized value is rejected. "ot-loop" is also rejected when the run has no worktree (disableWorktree) or when no validation command resolves (set otLoop.validationCommands on the plan, or commit .openthrottle/ot-loop.json). */
  runner?: InputMaybe<Scalars['String']['input']>;
  /** REQUIRED absolute instant the run fires at (an ISO-8601 DateTime; send UTC or an explicit offset). Must be strictly in the future and no more than 30 days from now (SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS); the server rejects anything else. */
  scheduledFor: Scalars['DateTime']['input'];
  /** Optional absolute path to a local project directory used as the working directory for this run. Escape hatch used only when checkoutId and repositoryId are omitted. When all three are omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side. */
  workingDirectory?: InputMaybe<Scalars['String']['input']>;
};

export type SchedulePlanRunResultObject = {
  __typename?: 'SchedulePlanRunResultObject';
  /** Execution backend selected once for the whole run: cursor or claude. */
  executionBackend: Scalars['String']['output'];
  /** BullMQ job id of the delayed job that starts the run (deterministic: scheduled-plan-run-<idempotencyKey | planId-epochMs>). */
  jobId: Scalars['String']['output'];
  /** Plan id the run was scheduled for. */
  planId: Scalars['String']['output'];
  /** plan_runs id of the SCHEDULED run row (status SCHEDULED until the job fires). */
  planRunId: Scalars['String']['output'];
  /** The absolute UTC instant the run fires at. */
  scheduledFor: Scalars['DateTime']['output'];
};

/** A user-defined scheduled agent job: a prompt run with a driver/model/settings on a cron, interval or run-once schedule via one shared BullMQ queue. */
export type ScheduledAgentJobObject = {
  __typename?: 'ScheduledAgentJobObject';
  createdAt: Scalars['DateTime']['output'];
  /** 5- or 6-field cron pattern for a cron schedule; null for interval and once schedules. */
  cronPattern?: Maybe<Scalars['String']['output']>;
  /**
   * Legacy explicit process cwd for the agent CLI, used only when repositoryCheckoutId is null; null then uses WORKSPACE_ROOT.
   * @deprecated Use repositoryCheckoutId to target a registered repository checkout; cwd is only consulted when no checkout is set.
   */
  cwd?: Maybe<Scalars['String']['output']>;
  /** Agent driver id (antigravity | claude | codex | cursor | grok | opencode). */
  driverId: Scalars['String']['output'];
  /** Whether the schedule is active (registered as a BullMQ scheduler). */
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** For an interval schedule: ms from the end of one run to the start of the next (elapsed time, so DST-safe). Null for other kinds. */
  intervalMs?: Maybe<Scalars['Int']['output']>;
  /** Last time a run started. */
  lastRunAt?: Maybe<Scalars['DateTime']['output']>;
  /** What happens to a fire that starts more than misfireThresholdMs late (server down, or a backed-up queue): skip records it as a missed run; catch_up_once runs the most recent late fire once and records any earlier ones as missed. A fire within the threshold always runs. */
  misfirePolicy: Scalars['String']['output'];
  /** How late (ms after its cron slot) a fire may start and still count as on time; at least 60000. */
  misfireThresholdMs: Scalars['Int']['output'];
  /** Model preset; null uses the driver default. */
  model?: Maybe<Scalars['String']['output']>;
  /** Human-friendly schedule name. */
  name: Scalars['String']['output'];
  /** Next scheduled fire time (from the BullMQ scheduler). */
  nextRunAt?: Maybe<Scalars['DateTime']['output']>;
  /** Owning user id; null for system-seeded schedules. */
  ownerUserId?: Maybe<Scalars['ID']['output']>;
  /** Prompt passed to the agent CLI. */
  prompt: Scalars['String']['output'];
  /** The targeted checkout resolved for display; null when the schedule targets none or the checkout has been deleted. */
  repository?: Maybe<ScheduledAgentJobRepositoryObject>;
  /** Registered repository checkout this schedule runs in; the server resolves its cwd from this. Null means the legacy cwd / WORKSPACE_ROOT fallback. */
  repositoryCheckoutId?: Maybe<Scalars['ID']['output']>;
  /** For a once schedule: when its single run is due. Null for other kinds. */
  runAt?: Maybe<Scalars['DateTime']['output']>;
  /** How the schedule fires: cron (cronPattern in timezone), interval (intervalMs after the previous run finishes) or once (a single run at runAt, after which the schedule is disabled). */
  scheduleKind: Scalars['String']['output'];
  /** JSON-serialized AgentPromptSettings ({ endpoint?, worktree? }); endpoint.apiKey is never present. */
  settingsJson: Scalars['String']['output'];
  /** Per-run timeout override in ms; null uses the queue default. */
  timeoutMs?: Maybe<Scalars['Int']['output']>;
  /** IANA timezone for the cron pattern; null means UTC. */
  timezone?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Display fields for the repository checkout a schedule or run targeted — enough to label the target without a second round trip. */
export type ScheduledAgentJobRepositoryObject = {
  __typename?: 'ScheduledAgentJobRepositoryObject';
  /** Human-friendly checkout name. */
  displayName: Scalars['String']['output'];
  /** Canonical absolute path on the server host. */
  filesystemPath: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

/** One run of a scheduled agent job. Logs stream to queueJobLogs/queueJobLogTail keyed by bullmqJobId. */
export type ScheduledAgentJobRunObject = {
  __typename?: 'ScheduledAgentJobRunObject';
  /** BullMQ job id — join key to queueJobLogs; null before the run is enqueued. */
  bullmqJobId?: Maybe<Scalars['String']['output']>;
  /** Prompt-cache read tokens for the run; null when unreported. */
  cacheReadTokens?: Maybe<Scalars['Float']['output']>;
  /** Prompt-cache write tokens for the run; null when unreported. */
  cacheWriteTokens?: Maybe<Scalars['Float']['output']>;
  /** When cancellation was requested; null if never cancelled. */
  cancelRequestedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Estimated dollar cost of the run, when the backend prices it; null when unpriced. */
  costUsd?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  driverId: Scalars['String']['output'];
  /** Failure detail; null on success. */
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** Child process exit code; null on timeout/cancel/spawn error. */
  exitCode?: Maybe<Scalars['Int']['output']>;
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** Input/prompt tokens for the run, parsed from the CLI output; null when unreported. Float because GraphQL Int is 32-bit. */
  inputTokens?: Maybe<Scalars['Float']['output']>;
  /** The schedule this run belongs to, so a cross-job run list can label itself without a second round trip. Null only if the schedule has since been deleted. */
  job?: Maybe<ScheduledAgentJobObject>;
  model?: Maybe<Scalars['String']['output']>;
  /** Output/completion tokens for the run; null when unreported. */
  outputTokens?: Maybe<Scalars['Float']['output']>;
  /** Reasoning tokens for the run, when accounted separately; null when unreported. */
  reasoningTokens?: Maybe<Scalars['Float']['output']>;
  /** The targeted checkout resolved for display; null when the run targeted none or the checkout has been deleted. */
  repository?: Maybe<ScheduledAgentJobRepositoryObject>;
  /** Repository checkout this run targeted at fire time; null for a legacy run, the WORKSPACE_ROOT fallback, or a checkout since deleted. A snapshot — the schedule's current target may differ. */
  repositoryCheckoutId?: Maybe<Scalars['ID']['output']>;
  /** The exact directory the agent CLI was spawned in for this run, after the checkout -> cwd -> WORKSPACE_ROOT precedence. Authoritative record of where the run happened; null for legacy runs. */
  resolvedCwd?: Maybe<Scalars['String']['output']>;
  /** The usage_limited run this run continues (trigger resume); null for every ordinary run. */
  resumeOfRunId?: Maybe<Scalars['ID']['output']>;
  scheduledAgentJobId: Scalars['ID']['output'];
  /** The slot this run belongs to, for trigger schedule (missed runs included): the cron slot, or when an interval or once fire was due. Null for manual and resume runs and for runs recorded before slot accounting. */
  scheduledFor?: Maybe<Scalars['DateTime']['output']>;
  /** Effective run settings at execution time (driver/model/run-config), serialized JSON; null for legacy/pre-snapshot runs. Never contains endpoint.apiKey. */
  settingsSnapshotJson?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  /** queued | running | succeeded | no_op | failed | cancelled | usage_limited | missed. no_op is terminal and NOT an error: the process exited cleanly but the agent reported it did not do the work. usage_limited is terminal and NOT an error: the agent CLI stopped on a Claude subscription usage limit (see usageLimitResetsAt); a continuation run (trigger resume, resumeOfRunId = this run) may have been enqueued. missed is created terminal: a cron fire the schedule's misfire policy did not run (see scheduledFor and errorMessage); no agent was spawned. */
  status: Scalars['String']['output'];
  /** Total tokens for the run; null when nothing reported. */
  totalTokens?: Maybe<Scalars['Float']['output']>;
  /** schedule (a cron, interval or once fire) | manual (run-now) | resume (delayed continuation of a usage_limited run). */
  trigger: Scalars['String']['output'];
  /** When the usage limit that stopped this run lifts, as reported by the agent CLI; null when the run was not usage_limited or no reset time was reported. */
  usageLimitResetsAt?: Maybe<Scalars['DateTime']['output']>;
  /** Raw usage-limit window that stopped this run (five_hour, seven_day, ...); null when the run was not usage_limited or the window was not reported. */
  usageLimitType?: Maybe<Scalars['String']['output']>;
};

/** Aggregate run counts across all scheduled agent jobs: live in-flight totals plus terminal outcomes since a window boundary. */
export type ScheduledAgentJobRunStatsObject = {
  __typename?: 'ScheduledAgentJobRunStatsObject';
  /** Runs cancelled inside the window. */
  cancelledCount: Scalars['Int']['output'];
  /** Runs that failed inside the window — non-zero exit, timeout, or spawn failure. Does NOT include no_op. */
  failedCount: Scalars['Int']['output'];
  /** Runs not yet terminal right now — queuedCount + runningCount. Not windowed. */
  inFlightCount: Scalars['Int']['output'];
  /** Runs that exited cleanly but reported they did not do the work, inside the window. Terminal and NOT a failure. */
  noOpCount: Scalars['Int']['output'];
  /** Runs enqueued but not yet claimed by a processor right now. Not windowed. */
  queuedCount: Scalars['Int']['output'];
  /** Runs currently executing right now. Not windowed. */
  runningCount: Scalars['Int']['output'];
  /** Inclusive lower bound of the window the terminal counts cover; defaults to 24h ago. */
  since: Scalars['DateTime']['output'];
  /** Runs that completed successfully inside the window. */
  succeededCount: Scalars['Int']['output'];
  /** Runs that stopped on a Claude subscription usage limit inside the window. Terminal and NOT a failure; a continuation run may have been enqueued. */
  usageLimitedCount: Scalars['Int']['output'];
  /** Every run created inside the window, whatever its status — the "ran today" total. */
  windowTotalCount: Scalars['Int']['output'];
};

/** A scheduled agent job run failed, timed out, or was recorded missed. Sent to alert the schedule's owner. */
export type ScheduledRunFailedNotification = NotificationEvent & {
  __typename?: 'ScheduledRunFailedNotification';
  /** The schedule's owner, who the notice is for. Null for a schedule with no owner. */
  actorUserId?: Maybe<Scalars['ID']['output']>;
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  /** failed | timed_out | missed */
  reason: Scalars['String']['output'];
  /** How many runs the notice covers; above 1 only when a server boot records several missed fires at once. */
  runCount: Scalars['Int']['output'];
  /** The run, when the notice covers exactly one run whose id is known. */
  runId?: Maybe<Scalars['ID']['output']>;
  scheduleName: Scalars['String']['output'];
  scheduledAgentJobId: Scalars['ID']['output'];
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

export type SearchChunk = {
  __typename?: 'SearchChunk';
  /** Chunk content (plan or task text). */
  content: Scalars['String']['output'];
  /** Chunk UUID from plan_embeddings or task_embeddings. */
  id: Scalars['String']['output'];
  /** Plan UUID when chunk is from a plan or a plan's task. */
  planId?: Maybe<Scalars['String']['output']>;
  /** Plan title for display and linking. */
  planTitle?: Maybe<Scalars['String']['output']>;
  /** Cosine similarity score (0–1, higher is more relevant). */
  similarity: Scalars['Float']['output'];
  /** Source of the chunk: "plan", "task", or "documentation". */
  source: Scalars['String']['output'];
  /** When source is documentation: file path in the repo (e.g. docs/foo.md). */
  sourcePath?: Maybe<Scalars['String']['output']>;
  /** When source is documentation: GitHub repo (e.g. owner/repo). */
  sourceRepo?: Maybe<Scalars['String']['output']>;
  /** When source is documentation: Git SHA for a precise blob link; omit for main. */
  sourceSha?: Maybe<Scalars['String']['output']>;
  /** Task UUID when chunk is from a task. */
  taskId?: Maybe<Scalars['String']['output']>;
  /** Task title for display and linking. */
  taskTitle?: Maybe<Scalars['String']['output']>;
};

export type SearchInput = {
  /** Max number of chunks to return (default 20). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Text query to embed and search by vector similarity. */
  query: Scalars['String']['input'];
};

export type SearchPlansInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Semantic search query (embedded for vector similarity) */
  query: Scalars['String']['input'];
};

export type SearchResult = {
  __typename?: 'SearchResult';
  /** Ranked search chunks (plans and tasks) by similarity. */
  chunks: Array<SearchChunk>;
};

/** Server health: API reachability, OpenThrottle DB, cms DB, Redis (BullMQ), and WebSocket. Each component is ok, unconfigured, or unreachable. */
export type ServerHealthObject = {
  __typename?: 'ServerHealthObject';
  /** API status. "ok" when the resolver runs. */
  api: Scalars['String']['output'];
  /** cms DB status: ok | unconfigured | unreachable. SELECT 1 on the named cms DataSource. Null from a server that does not serve the cms database. */
  cms?: Maybe<Scalars['String']['output']>;
  /** OpenThrottle DB status: ok | unconfigured | unreachable. Reuses existing databaseHealth logic. */
  database: Scalars['String']['output'];
  /** Redis (BullMQ) status: ok | unconfigured | unreachable. From Redis PING. */
  redis: Scalars['String']['output'];
  /** WebSocket (Socket.IO) status: ok when server process is running. */
  websocket: Scalars['String']['output'];
};

/** Current process metrics: memory (RSS, heap, external in MB) and CPU (user/system in ms). */
export type ServerMetricsObject = {
  __typename?: 'ServerMetricsObject';
  /** System CPU time in milliseconds (cumulative). */
  cpuSystemMs: Scalars['Float']['output'];
  /** User CPU time in milliseconds (cumulative). */
  cpuUserMs: Scalars['Float']['output'];
  /** External (C++ objects bound to JS, e.g. Buffers) in MB. */
  externalMb: Scalars['Float']['output'];
  /** V8 heap total in MB. */
  heapTotalMb: Scalars['Float']['output'];
  /** V8 heap used in MB. */
  heapUsedMb: Scalars['Float']['output'];
  /** Resident set size (total process memory) in MB. */
  rssMb: Scalars['Float']['output'];
};

export type ServiceAccountCredentialObject = {
  __typename?: 'ServiceAccountCredentialObject';
  createdAt: Scalars['DateTime']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  label?: Maybe<Scalars['String']['output']>;
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Lookup prefix embedded in ot_sa_<prefix>_<secret> tokens. */
  prefix: Scalars['String']['output'];
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
  serviceAccountId: Scalars['ID']['output'];
};

export type ServiceAccountObject = {
  __typename?: 'ServiceAccountObject';
  /** The human user this machine identity acts as for user-scoped conveniences (e.g. plan workspace seeding). A hint, never a permission grant. */
  actingUserId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** When set, the service account cannot authenticate. */
  disabledAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  /** Stable identifier (e.g. openthrottle-mcp, workflow-ralph). */
  name: Scalars['String']['output'];
};

export type SetAgentEnabledResult = {
  __typename?: 'SetAgentEnabledResult';
  /** The backend (driver id) whose enablement was toggled. */
  backend: Scalars['String']['output'];
  /** The per-user enablement state after the toggle: true = enabled, false = disabled (hidden from pickers + blocked from new runs). */
  enabled: Scalars['Boolean']['output'];
};

export type SetAgentModelEnabledResult = {
  __typename?: 'SetAgentModelEnabledResult';
  /** The backend (driver id) the toggled model belongs to. */
  backend: Scalars['String']['output'];
  /** The per-model enablement state after the toggle: true = enabled, false = disabled (this model hidden from pickers + blocked from new runs, even while the agent stays enabled). */
  enabled: Scalars['Boolean']['output'];
  /** The model id whose enablement was toggled. */
  model: Scalars['String']['output'];
};

export type SetAgentModelFavoriteResult = {
  __typename?: 'SetAgentModelFavoriteResult';
  /** The backend (driver id) the favorited model belongs to. */
  backend: Scalars['String']['output'];
  /** The favorite state after the toggle: true = favorited (floated/highlighted in pickers), false = not favorited. */
  favorite: Scalars['Boolean']['output'];
  /** The model id whose favorite state was toggled. */
  model: Scalars['String']['output'];
};

export type SetAgentModelsEnabledResult = {
  __typename?: 'SetAgentModelsEnabledResult';
  /** The backend (driver id) whose models were bulk-toggled. */
  backend: Scalars['String']['output'];
  /** The per-model enablement state applied to every model of the backend: true = all enabled, false = all disabled. */
  enabled: Scalars['Boolean']['output'];
};

export type SetBlogPostTagsInput = {
  postId: Scalars['ID']['input'];
  /** Slugs of existing tags (see upsertBlogTag). Replaces the post's whole tag set; an empty list removes every tag. */
  tagSlugs: Array<Scalars['String']['input']>;
};

/** The post with its new tag set, or why nothing was written: the post does not exist, a tag slug is unknown, or the post is no longer a DRAFT and the caller lacks blog:write. */
export type SetBlogPostTagsResult =
  | BlogPostAdminObject
  | BlogPostNotFoundError
  | BlogPostPublishPermissionRequiredError
  | BlogReferenceNotFoundError;

export type SetMcpConnectorEnabledInput = {
  connectorKey: Scalars['ID']['input'];
  enabled: Scalars['Boolean']['input'];
};

export type SetPlanStatusInput = {
  /** Plan id to update status for */
  planId: Scalars['ID']['input'];
  /**
   * New plan status — one of: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, PROMOTED, QUEUED, SCHEDULED, SKIPPED. Normalized to uppercase. Provide this OR statusEnum.
   * @deprecated Use statusEnum (typed PlanTaskStatus). String status is still accepted (normalized to uppercase) and validated against the canonical set.
   */
  status?: InputMaybe<Scalars['String']['input']>;
  /** New plan status as the typed PlanTaskStatus enum (preferred over status). Provide this OR status. */
  statusEnum?: InputMaybe<PlanTaskStatus>;
};

export type SetScheduledAgentJobEnabledInputType = {
  enabled: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};

export type SetWorkspaceLocalRepositoryProjectInput = {
  id: Scalars['ID']['input'];
  /** OpenThrottle project id, or null to clear the link. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type SettleCliPlanRunInput = {
  /** Branch head sha at PR-open. Recorded as a git_commit artifact on COMPLETED; the verifier maps it to its squash commit once the PR merges. Optional — a run that exits without opening a PR has none. */
  headSha?: InputMaybe<Scalars['String']['input']>;
  /** Plan-run row id to settle (returned by registerCliPlanRun). */
  planRunId: Scalars['ID']['input'];
  /** Number of the PR the run opened. Recorded as a pull_request artifact on COMPLETED — it survives a rebase or amend, which the head sha does not. Optional. */
  prNumber?: InputMaybe<Scalars['Int']['input']>;
  /** Terminal status to set: COMPLETED, CANCELLED, FAILED, or USAGE_LIMITED. Normalized to uppercase. */
  status: Scalars['String']['input'];
  /** When the usage limit that stopped the run lifts, as reported by the agent CLI. Recorded only when status is USAGE_LIMITED; ignored otherwise. Null when the CLI reported no reset time. */
  usageLimitResetsAt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Raw name of the usage-limit window that stopped the run (five_hour, seven_day, ...). Recorded only when status is USAGE_LIMITED; ignored otherwise. */
  usageLimitType?: InputMaybe<Scalars['String']['input']>;
};

export type SignoutResultObject = {
  __typename?: 'SignoutResultObject';
  /** Whether signout completed successfully */
  success: Scalars['Boolean']['output'];
};

/** A project's resolved skill-availability universe for a given context (environment), plus resolve-time warnings. */
export type SkillAvailabilityResolutionResult = {
  __typename?: 'SkillAvailabilityResolutionResult';
  /** Resolved skills, in the project's ingested order (alphabetical by slug). */
  skills: Array<SkillAvailabilityResolvedSkillObject>;
  /** Number of skills in the resolved universe. */
  totalCount: Scalars['Int']['output'];
  /** Resolve-time warnings (e.g. unknown-tag:<tag>@<slug>), deduped. Empty for pure passthrough. */
  warnings: Array<Scalars['String']['output']>;
};

/** A single skill's resolved, per-context availability: its static frontmatter flag, the effective flag, and the decisive rung's provenance. */
export type SkillAvailabilityResolvedSkillObject = {
  __typename?: 'SkillAvailabilityResolvedSkillObject';
  /** Resolved per-context flag: true ⇒ model auto-invocation suppressed. Human /skill invocation is never gated. */
  effectiveDisableModelInvocation: Scalars['Boolean']['output'];
  /** Plan-context annotation: this skill's tags ∩ the plan's effective DOMAIN tag set. Empty when the query has no planId. */
  matchedPlanTags: Array<Scalars['String']['output']>;
  /** Plan-context annotation: true when matchedPlanTags is non-empty. Always false when the query has no planId. */
  planRelevant: Scalars['Boolean']['output'];
  /** Decisive rung's provenance (closed grammar), e.g. frontmatter:true|false|unset, posture:deny, slug-allow:<slug>@<ruleId>, tag-deny:<tag>@<ruleId>. */
  provenance: Scalars['String']['output'];
  /** Skill slug (the skill frontmatter `name`). */
  slug: Scalars['String']['output'];
  /** Static frontmatter `disable-model-invocation`. Tri-state: null = unset, true = suppressed, false = explicitly enabled. */
  staticDisableModelInvocation?: Maybe<Scalars['Boolean']['output']>;
};

export type SkillAvailabilityRuleInput = {
  /** Environment qualifier: omit/null for all environments, or "ci" | "interactive" | "ralph" to scope the rule. */
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Skill slugs to allow (rung 1 exceptions). */
  slugAllow?: Array<Scalars['String']['input']>;
  /** Skill slugs to deny (rung 1 exceptions). */
  slugDeny?: Array<Scalars['String']['input']>;
  /** Tags to allow (rung 2). Must be in the caller's skill-tag vocabulary. */
  tagAllow?: Array<Scalars['String']['input']>;
  /** Tags to deny (rung 2). Must be in the caller's skill-tag vocabulary. */
  tagDeny?: Array<Scalars['String']['input']>;
};

/** A single per-project skill-availability rule: tag/slug allow-deny lists, optionally scoped to an environment. */
export type SkillAvailabilityRuleObject = {
  __typename?: 'SkillAvailabilityRuleObject';
  /** Environment qualifier: null applies to all environments; a value (ci | interactive | ralph) scopes the rule to that environment. */
  environment?: Maybe<Scalars['String']['output']>;
  /** Stable rule identifier (used in resolver provenance and as the target of updateSkillAvailabilityRule / removeSkillAvailabilityRule). */
  id: Scalars['ID']['output'];
  /** Skill slugs this rule allows (rung 1 exceptions); empty when none. */
  slugAllow: Array<Scalars['String']['output']>;
  /** Skill slugs this rule denies (rung 1 exceptions); empty when none. */
  slugDeny: Array<Scalars['String']['output']>;
  /** Tags this rule allows (rung 2); empty when none. */
  tagAllow: Array<Scalars['String']['output']>;
  /** Tags this rule denies (rung 2); empty when none. */
  tagDeny: Array<Scalars['String']['output']>;
};

/** A project's skill-availability rule set: the single per-project posture and its rules. Absent (null query result) ⇒ passthrough. */
export type SkillAvailabilityRuleSetObject = {
  __typename?: 'SkillAvailabilityRuleSetObject';
  /** The single per-project posture (rung 3): "allow" or "deny". */
  posture: Scalars['String']['output'];
  /** The rule set's rules, evaluated at precedence rungs 1-2. */
  rules: Array<SkillAvailabilityRuleObject>;
};

/** A single tag in the authenticated user's skill-tag vocabulary. */
export type SkillTagObject = {
  __typename?: 'SkillTagObject';
  createdAt: Scalars['DateTime']['output'];
  /** Vocabulary axis: "domain" (subject area; the only dimension skills may carry) or "phase" (plan/task lifecycle stage). */
  dimension: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Kebab-case tag slug, unique per user. */
  tag: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

/** The authenticated user's skill-tag vocabulary, seeded from the platform default on first read. */
export type SkillTagVocabularyResult = {
  __typename?: 'SkillTagVocabularyResult';
  /** Tags in the user's vocabulary, alphabetically by tag. */
  tags: Array<SkillTagObject>;
  /** Number of tags in the vocabulary. */
  totalCount: Scalars['Int']['output'];
};

export type SkillUsageByDayObject = {
  __typename?: 'SkillUsageByDayObject';
  /** UTC calendar day (YYYY-MM-DD). */
  date: Scalars['String']['output'];
  /** injected-scoped invocations on this day: OpenThrottle skills authored in another repository and linked into this workspace by foreign skill injection. */
  injectedCount: Scalars['Int']['output'];
  /** ours-scoped invocations on this day. */
  oursCount: Scalars['Int']['output'];
  /** personal-scoped invocations on this day. */
  personalCount: Scalars['Int']['output'];
  /** third-party-scoped invocations on this day. Excludes personal invocations, which have counted into personalCount since that member was added; historical rows are never reclassified, so a personal skill's series can straddle both fields across that date. */
  thirdPartyCount: Scalars['Int']['output'];
  /** Total invocations on this day. */
  totalCount: Scalars['Int']['output'];
};

export type SkillUsageByScopeObject = {
  __typename?: 'SkillUsageByScopeObject';
  /** Invocation count for this scope in the filtered range. */
  count: Scalars['Int']['output'];
  /** ours | injected | personal | third-party. */
  scope: Scalars['String']['output'];
};

export type SkillUsageBySkillObject = {
  __typename?: 'SkillUsageBySkillObject';
  /** Abandoned outcomes for this skill in the filtered range — the session died without a clean end. Liveness, not quality; excluded from outcomeCount. */
  abandonedCount: Scalars['Int']['output'];
  /** Average reported duration_ms for outcomes with a duration; null when none. Only a deliberate reporter supplies a duration — the automatic session-end paths report null, because no hook brackets a skill's own work. */
  avgDurationMs?: Maybe<Scalars['Int']['output']>;
  /** Harness start (invocation) count for this skill in the filtered range. */
  count: Scalars['Int']['output'];
  /** Reported error outcomes for this skill in the filtered range. A quality claim; only a deliberate reporter or a harness with a real failure status writes it. */
  errorCount: Scalars['Int']['output'];
  /** Most recent start (invocation) timestamp for this skill in the filtered range; null when there are no invocations. */
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  /** QUALITY outcomes for this skill — successCount + errorCount only. Deliberately excludes sessionEndedCount and abandonedCount, which say the process finished or died, not that the skill's work went well. May be far less than count; zero is the normal, honest reading for any skill that does not report its own outcome. */
  outcomeCount: Scalars['Int']['output'];
  /** ours | injected | personal | third-party for this skill row. */
  scope: Scalars['String']['output'];
  /** Automatic session-end records for this skill — the session that loaded it ended normally. Liveness, not quality; excluded from outcomeCount. */
  sessionEndedCount: Scalars['Int']['output'];
  /** Skill identifier (e.g. ot-plans, vercel:deploy). */
  skillName: Scalars['String']['output'];
  /** Reported success outcomes for this skill in the filtered range. A quality claim; only a deliberate reporter writes it. */
  successCount: Scalars['Int']['output'];
};

export type SkillUsageEventObject = {
  __typename?: 'SkillUsageEventObject';
  /** Subagent id when the Skill call happened inside a nested agent. */
  agentId?: Maybe<Scalars['String']['output']>;
  /** Subagent type when present (e.g. general-purpose). */
  agentType?: Maybe<Scalars['String']['output']>;
  /** Skill args after client privacy seam. Null when privacyLevel is name-only. */
  args?: Maybe<Scalars['String']['output']>;
  /** Working directory reported by the harness at invocation time. */
  cwd?: Maybe<Scalars['String']['output']>;
  /** Git branch at capture time (best-effort). */
  gitBranch?: Maybe<Scalars['String']['output']>;
  /** Hook that captured the event (PreToolUse or UserPromptExpansion). */
  hookEventName?: Maybe<Scalars['String']['output']>;
  /** Skill usage event id. */
  id: Scalars['ID']['output'];
  /** Invocation path: skill_tool or slash. */
  invocationPath?: Maybe<Scalars['String']['output']>;
  /** Client-reported invocation timestamp. */
  occurredAt: Scalars['DateTime']['output'];
  /** Client privacy level applied before ingest: name-only | truncated | full. */
  privacyLevel: Scalars['String']['output'];
  /** Harness prompt_id when present. */
  promptId?: Maybe<Scalars['String']['output']>;
  /** Server receipt time (set on insert). */
  receivedAt: Scalars['DateTime']['output'];
  /** ours | injected | personal | third-party — derived by the client: ours is authored under skills/, personal is linked from the invoking user's personal skills root outside the repo, injected is an OpenThrottle skill authored under another repository's skills/ and linked in by foreign skill injection, third-party is everything else. */
  scope: Scalars['String']['output'];
  /** Harness session id when present. */
  sessionId?: Maybe<Scalars['String']['output']>;
  /** Skill identifier (e.g. ot-plans, vercel:deploy). */
  skillName: Scalars['String']['output'];
  /** Producer id of the capturing tool/adapter (e.g. claude-code, cursor). Null for rows ingested before source tracking. */
  source?: Maybe<Scalars['String']['output']>;
  /** Harness tool_use_id for the Skill call when present. */
  toolUseId?: Maybe<Scalars['String']['output']>;
};

export type SkillUsageFilterOptionsObject = {
  __typename?: 'SkillUsageFilterOptionsObject';
  /**
   * Distinct non-null cwd values in the date window (for project/path filter).
   * @deprecated Grew with every distinct path and is now capped at 50, so it is no longer an exhaustive list. A lazy cwd-search query will replace it; kept for back-compat until then.
   */
  cwds: Array<Scalars['String']['output']>;
  /**
   * Distinct non-null git branch values in the date window.
   * @deprecated Unbounded and now capped at 50 — use the skillUsageGitBranches query, which searches lazily and pins the default branch first.
   */
  gitBranches: Array<Scalars['String']['output']>;
};

export type SkillUsageGitBranchObject = {
  __typename?: 'SkillUsageGitBranchObject';
  /** Git branch value as captured by the harness. */
  branch: Scalars['String']['output'];
  /** Invocation count for this branch in the date window. */
  count: Scalars['Int']['output'];
};

export type SkillUsageGitBranchSearchObject = {
  __typename?: 'SkillUsageGitBranchSearchObject';
  /** True when more branches matched than the returned page — narrow the search instead of paging. */
  hasMore: Scalars['Boolean']['output'];
  /** Matching branches: the default branch (main, else master) first, then A–Z. */
  items: Array<SkillUsageGitBranchObject>;
};

export type SkillUsageOutcomeObject = {
  __typename?: 'SkillUsageOutcomeObject';
  /** Working directory at outcome time. */
  cwd?: Maybe<Scalars['String']['output']>;
  /** Wall-clock duration in milliseconds when reported. */
  durationMs?: Maybe<Scalars['Int']['output']>;
  /** Git branch at outcome time. */
  gitBranch?: Maybe<Scalars['String']['output']>;
  /** Skill usage outcome id. */
  id: Scalars['ID']['output'];
  /** Client-reported outcome timestamp. */
  occurredAt: Scalars['DateTime']['output'];
  /** success | abandoned | error. */
  outcome: Scalars['String']['output'];
  /** Server receipt time (set on insert). */
  receivedAt: Scalars['DateTime']['output'];
  /** ours | injected | personal | third-party. */
  scope: Scalars['String']['output'];
  /** Harness session id when present. */
  sessionId?: Maybe<Scalars['String']['output']>;
  /** Skill identifier matching the start event. */
  skillName: Scalars['String']['output'];
  /** Producer id of the tool/adapter that recorded this outcome (e.g. claude-code, cursor). Null for rows ingested before source tracking. */
  source?: Maybe<Scalars['String']['output']>;
  /** Optional tool_use_id for tighter correlation. */
  toolUseId?: Maybe<Scalars['String']['output']>;
};

export type SkillUsageResultObject = {
  __typename?: 'SkillUsageResultObject';
  /** Per-day series (UTC), oldest first, split into ours / personal / third-party. */
  byDay: Array<SkillUsageByDayObject>;
  /** ours / personal / third-party totals for the filtered range. */
  byScope: Array<SkillUsageByScopeObject>;
  /** Top skills by count (highest first; capped). */
  bySkill: Array<SkillUsageBySkillObject>;
  /** Distinct branch/cwd values in the date window for filter dropdowns. */
  filterOptions: SkillUsageFilterOptionsObject;
  /** Total invocations matching the filtered range. */
  totalCount: Scalars['Int']['output'];
};

export type StartAgentSetupResult = {
  __typename?: 'StartAgentSetupResult';
  /** The backend (driver id) this run targeted. */
  backend: Scalars['String']['output'];
  /** True when the request was rejected because server-side install/update is disabled by env flag (OT_AGENT_CLI_INSTALL_ENABLED). */
  disabled: Scalars['Boolean']['output'];
  /** Validation or policy error (no throw). Null on success. */
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** install | update — the mode that was started. */
  mode: Scalars['String']['output'];
  /** Correlation id to subscribe to via agentSetupChunkAdded. Null when the request was rejected. */
  runId?: Maybe<Scalars['String']['output']>;
};

export type StartConversationStreamInput = {
  /** Backend to stream from: "openai" (default) or an allowlisted agent CLI (e.g. "cursor"). Omit for openai. */
  backend?: InputMaybe<Scalars['String']['input']>;
  /** OpenAI-compatible base URL of a discovered local endpoint, e.g. http://localhost:11434/v1. Required for the openai backend. */
  baseUrl?: InputMaybe<Scalars['String']['input']>;
  /** Existing conversation to continue; omit to start a new conversation. */
  conversationId?: InputMaybe<Scalars['ID']['input']>;
  /** Workspace-relative POSIX paths @-mentioned in the message (parsed client-side). Nullable + additive. The paths also travel inline in the message as @path tokens; the server additionally injects them as structured turn context ("Referenced files") so the agent treats them as first-class references. */
  fileMentions?: InputMaybe<Array<Scalars['String']['input']>>;
  /** User message text for this turn. */
  message: Scalars['String']['input'];
  /** Model id to complete with. Required for the openai backend; optional model override for CLI backends. */
  modelId?: InputMaybe<Scalars['String']['input']>;
  /** Permission mode for an agent backend: "supervised", "autoAcceptEdits", or "fullAccess". Nullable + additive. Honored: each CLI backend maps it to concrete permission/sandbox flags in its argv/config builder (a backend that cannot route it ignores it). */
  permissionMode?: InputMaybe<Scalars['String']['input']>;
  /** Whether to persist this turn. True (default, or omitted) saves the conversation + messages as today. False runs a "Private mode" turn: the stream is ephemeral — no conversation row is created and no messages are written. A Private turn carries no server-side history (single-turn context) and CLI backends run a fresh, non-resumed session. */
  persist?: InputMaybe<Scalars['Boolean']['input']>;
  /** Persona to steer the turn; CLI backends inject it as a system prompt. */
  personaId?: InputMaybe<Scalars['ID']['input']>;
  /** Reasoning-effort level for the turn: "low", "medium", "high", "extraHigh", "max", or "ultra". Nullable + additive. Honored: each backend that exposes a reasoning knob maps it to its own vocabulary (claude --effort, grok --reasoning-effort, codex -c model_reasoning_effort=, opencode --variant, cursor model-string [effort=…], openai reasoning_effort), clamping to its accepted set. */
  reasoning?: InputMaybe<Scalars['String']['input']>;
  /**
   * Registered WorkspaceLocalRepository to run a CLI backend in. Required for CLI backends in production (the server resolves + ownership-checks the path).
   * @deprecated Use repositoryIds, which carries the primary checkout plus any additional context directories. A lone repositoryId is still honored as a one-element list.
   */
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  /** Registered WorkspaceLocalRepositories for a CLI backend, PRIMARY FIRST. Index 0 becomes the process working directory; the remainder are granted to the CLI as additional context directories (repeated --add-dir) by the backends that support them. Every id is ownership-checked independently, and the list is capped server-side per driver. */
  repositoryIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Service tier for the turn: "standard" or "fast". Nullable + additive. Honored only by backends that can route by tier (cursor-agent, via the model-string [fast=…] suffix); backends without a tier concept ignore it. */
  serviceTier?: InputMaybe<Scalars['String']['input']>;
};

export type StartConversationStreamResult = {
  __typename?: 'StartConversationStreamResult';
  /** Pre-allocated assistant message id the streamed deltas accumulate into. Null when the request failed. */
  assistantMessageId?: Maybe<Scalars['String']['output']>;
  /** Resolved (or newly created) conversation id. Null when the request failed. */
  conversationId?: Maybe<Scalars['String']['output']>;
  /** Validation or business-rule error (no throw). Null on success. */
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** Persisted user message id for this turn. Null when the request failed. */
  userMessageId?: Maybe<Scalars['String']['output']>;
};

export type StartTranscriptionStreamResult = {
  __typename?: 'StartTranscriptionStreamResult';
  /** Validation or availability error (no throw). Null on success. */
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** Minted transcription session id to send audio chunks to and subscribe on. Null when the request failed. */
  sessionId?: Maybe<Scalars['String']['output']>;
};

export type StartWorkSessionInput = {
  /** Chat conversation id when this session is a chat thread */
  conversationId?: InputMaybe<Scalars['String']['input']>;
  /** External correlation id (BullMQ job id, worktree+pid, agent session id) */
  externalRef?: InputMaybe<Scalars['String']['input']>;
  /** Model identifier when an agent did the work (e.g. claude-fable-5) */
  model?: InputMaybe<Scalars['String']['input']>;
  /** Unverified hint: the human this machine work is on behalf of (users.id) */
  onBehalfOfUserId?: InputMaybe<Scalars['ID']['input']>;
  /** plan_runs.id when this session is a Ralph run */
  planRunId?: InputMaybe<Scalars['ID']['input']>;
  /** Tool that produced the work: developer-app | openthrottle-mcp | workflow-ralph | MCP clientInfo.name */
  toolName: Scalars['String']['input'];
  /** Tool/client version */
  toolVersion?: InputMaybe<Scalars['String']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Live stdout/stderr for an agent-CLI install/update run (topic agent-setup:<runId>:stream). Requires an authenticated connection. */
  agentSetupChunkAdded: AgentSetupStreamChunkObject;
  /** Live token stream for a conversation (topic conversation:<id>:stream). Requires an authenticated connection that owns the conversation. */
  conversationStreamChunkAdded: ConversationStreamChunkObject;
  /** Firehose of all real-time notification events. Identity comes from the authenticated ws connection. */
  notifications: NotificationEvent;
  /** Live stream of a plan's inbox: each message as it is posted, edited, withdrawn or delivered (topic plan:<planId>:messages). */
  planMessageChanged: PlanMessageObject;
  /** Lifecycle notifications for a single plan (topic plan:<planId>:lifecycle). */
  planNotifications: NotificationEvent;
  /** Live stream of output chunks appended to a plan (topic plan:<planId>:output). */
  planOutputChunkAdded: PlanOutputStreamChunkObject;
  /** Live tail of new keyed run-output lines for a (queueName, jobId) — topic bullmq:<queueName>:<jobId>:logs. */
  queueJobLogTail: QueueJobLogEventObject;
  /** Live transcript snapshots for an owned transcription session (topic transcription:<sessionId>:stream). Snapshot-replace: each chunk carries the full transcript so far; clients keep the highest sortOrder. Requires an authenticated connection that owns the session. */
  transcriptionStreamChunkAdded: TranscriptionStreamChunkObject;
};

export type SubscriptionAgentSetupChunkAddedArgs = {
  runId: Scalars['ID']['input'];
};

export type SubscriptionConversationStreamChunkAddedArgs = {
  conversationId: Scalars['ID']['input'];
};

export type SubscriptionPlanMessageChangedArgs = {
  planId: Scalars['ID']['input'];
};

export type SubscriptionPlanNotificationsArgs = {
  planId: Scalars['ID']['input'];
};

export type SubscriptionPlanOutputChunkAddedArgs = {
  planId: Scalars['ID']['input'];
};

export type SubscriptionQueueJobLogTailArgs = {
  jobId: Scalars['String']['input'];
  queueName: Scalars['String']['input'];
};

export type SubscriptionTranscriptionStreamChunkAddedArgs = {
  sessionId: Scalars['ID']['input'];
};

export type SystemAlertNotification = NotificationEvent & {
  __typename?: 'SystemAlertNotification';
  code?: Maybe<Scalars['String']['output']>;
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

/** Complete system CPU metrics for a job, including start/end snapshots and pressure interpretation. */
export type SystemCpuMetrics = {
  __typename?: 'SystemCpuMetrics';
  /** Snapshot at job end. */
  atEnd: SystemCpuSnapshot;
  /** Snapshot at job start. */
  atStart: SystemCpuSnapshot;
  /** Platform: linux, darwin, win32, etc. */
  platform: Scalars['String']['output'];
  /** Interpretation of system CPU pressure: low, moderate, high, or unknown. */
  pressureLevel: PressureLevel;
  /** Whether PSI metrics are available (Linux with cgroup v2). */
  psiAvailable: Scalars['Boolean']['output'];
  /** Delta in PSI full stall time (microseconds) during the job. */
  psiFullDeltaUs?: Maybe<Scalars['Float']['output']>;
  /** Delta in PSI some stall time (microseconds) during the job. */
  psiSomeDeltaUs?: Maybe<Scalars['Float']['output']>;
};

/** System-level CPU metrics snapshot at a point in time. */
export type SystemCpuSnapshot = {
  __typename?: 'SystemCpuSnapshot';
  /** Load average at snapshot time. */
  loadAverage: LoadAverageMetrics;
  /** PSI metrics at snapshot time (Linux only). */
  psi: PsiCpuMetrics;
  /** Timestamp when snapshot was taken (Unix ms). */
  timestamp: Scalars['Float']['output'];
};

/** A declarative tag→action rule: when a plan's effective tag set satisfies tagAll (AND) plus the optional qualifiers, the action dispatches. Owned by the authenticated user. */
export type TagActionRuleObject = {
  __typename?: 'TagActionRuleObject';
  /** JSON-encoded action payload, validated per action type at write time. */
  actionPayloadJson: Scalars['String']['output'];
  /** Action type: "inject-task" or "availability-exception". */
  actionType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  /** Optional environment qualifier (ci | interactive | ralph); null applies everywhere. */
  environment?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Optional project scope; null matches every project. */
  projectId?: Maybe<Scalars['ID']['output']>;
  /** Optional plan-status qualifier; null matches any status. */
  status?: Maybe<Scalars['String']['output']>;
  /** Tags that must ALL be present in the plan's effective tag set; empty matches every plan. */
  tagAll: Array<Scalars['String']['output']>;
  /** Human-readable label for the rule (required, non-empty). */
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export type TaskCompletedNotification = NotificationEvent & {
  __typename?: 'TaskCompletedNotification';
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  planId: Scalars['ID']['output'];
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  taskId?: Maybe<Scalars['ID']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

export type TaskEmbeddingObject = {
  __typename?: 'TaskEmbeddingObject';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  /** JSON string of metadata object */
  metadataJson: Scalars['String']['output'];
  /** Resolved task entity when taskId is set */
  task?: Maybe<TaskObject>;
  taskId: Scalars['String']['output'];
};

export type TaskEmbeddingsByTaskInput = {
  /** Max rows to return (default and hard cap: 1000). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Rows to skip (pagination offset). */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Task id to list embeddings for */
  taskId: Scalars['ID']['input'];
};

export type TaskObject = {
  __typename?: 'TaskObject';
  /** Task-level after-hooks anchored to this task (one level), in execution order. */
  afterHooks: Array<TaskObject>;
  assignee?: Maybe<Scalars['String']['output']>;
  /** Task-level before-hooks anchored to this task (one level), in execution order. */
  beforeHooks: Array<TaskObject>;
  category?: Maybe<Scalars['String']['output']>;
  /** Set once on transition into COMPLETED; cleared if status leaves COMPLETED. Null when never completed. */
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** Lifecycle-hook role: 'before' or 'after'. NULL for a regular (non-hook) task. */
  hookRole?: Maybe<Scalars['String']['output']>;
  /** Plan-level hook scope: 'once' (beforeAll/afterAll) or 'each' (beforeEach/afterEach). NULL for regular tasks and task-level hooks. */
  hookScope?: Maybe<Scalars['String']['output']>;
  /** Hook body source: 'template' (inline title/description) or 'skill' (runs skillSlug via the hooks runner). NULL for regular tasks. */
  hookSource?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  /** Parent task this hook is anchored to (task-level before/after). NULL for regular tasks and plan-level hooks. */
  parentTaskId?: Maybe<Scalars['String']['output']>;
  /** Resolved plan entity when planId is set */
  plan?: Maybe<PlanObject>;
  planId: Scalars['String']['output'];
  project?: Maybe<Scalars['String']['output']>;
  /** Project UUID (FK to projects table) */
  projectId?: Maybe<Scalars['String']['output']>;
  /** Resolved project entity when projectId is set */
  projectRelation?: Maybe<ProjectObject>;
  /** JSON string of requirements array */
  requirementsJson: Scalars['String']['output'];
  /** Skill slug when hookSource is 'skill'; NULL otherwise. */
  skillSlug?: Maybe<Scalars['String']['output']>;
  /** Execution/list order within plan (gap-based: 1000, 2000, …). UNIQUE per planId. */
  sortOrder: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  summary?: Maybe<Scalars['String']['output']>;
  /** Tags attached to this task, alphabetically by tag. */
  tags: Array<TaskTagObject>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  /** Coarse concurrency layer within the plan, nullable. NULL means unassigned (runs alone, in sortOrder position) -- never wave zero. Tasks sharing a wave are the author's claim that they may be worked concurrently; sortOrder remains canonical and is the tiebreaker within a wave. Not consumed for execution yet. */
  wave?: Maybe<Scalars['Int']['output']>;
};

/** Metrics captured at job start and end for a plan/task run, including process snapshots, child process resource usage, wall-clock analysis, and system CPU pressure. */
export type TaskRunMetrics = {
  __typename?: 'TaskRunMetrics';
  /** Process metrics at the end of the task run. */
  atEnd: ProcessMetricsSnapshot;
  /** Process metrics at the start of the task run. */
  atStart: ProcessMetricsSnapshot;
  /** Aggregated CPU and memory metrics for spawned child processes. */
  childProcessMetrics?: Maybe<ChildProcessMetrics>;
  /** System-level CPU metrics including load average and PSI. */
  systemCpuMetrics?: Maybe<SystemCpuMetrics>;
  /** Wall-clock vs CPU time metrics for workload characterization. */
  wallClockMetrics?: Maybe<WallClockMetrics>;
};

export type TaskStatusChangedNotification = NotificationEvent & {
  __typename?: 'TaskStatusChangedNotification';
  /** Well-known event name (e.g. task.completed). */
  event: Scalars['String']['output'];
  /** App-relative click-through path. */
  link?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  planId: Scalars['ID']['output'];
  /** info | warning | error | success */
  severity?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  taskId?: Maybe<Scalars['ID']['output']>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: Scalars['String']['output'];
};

/** A tag attached to a task. Same shape and provenance semantics as plan tags. */
export type TaskTagObject = {
  __typename?: 'TaskTagObject';
  /** Model confidence (0-1) for server-llm rows; null otherwise. */
  confidence?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Vocabulary axis: "domain" (subject area) or "phase" (lifecycle stage). */
  dimension: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Writing identity class: "human", "agent", or "server-llm". Ranked human > agent > server-llm for replace/remove arbitration. */
  source: Scalars['String']['output'];
  /** Kebab-case tag slug, unique per task. */
  tag: Scalars['String']['output'];
  taskId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TasksByPlanIdInput = {
  /** Plan id to list tasks for */
  planId: Scalars['ID']['input'];
};

export type TasksByProjectIdInput = {
  /** Max number of tasks to return. Omit for no limit. */
  limit?: InputMaybe<Scalars['Float']['input']>;
  /** Number of tasks to skip. Omit or 0 for first page. */
  offset?: InputMaybe<Scalars['Float']['input']>;
  /** Project id (FK) to list tasks for */
  projectId: Scalars['ID']['input'];
};

export type TasksByProjectIdResultObject = {
  __typename?: 'TasksByProjectIdResultObject';
  tasks: Array<TaskObject>;
  totalCount: Scalars['Int']['output'];
};

export type TimelineKindTruncationObject = {
  __typename?: 'TimelineKindTruncationObject';
  /** The span or marker kind this entry describes. */
  kind: Scalars['String']['output'];
  /** Rows actually returned for this kind. */
  returned: Scalars['Int']['output'];
  /** TRUE when the per-kind cap was hit and rows in range were withheld. Say "showing first N" rather than implying completeness. */
  truncated: Scalars['Boolean']['output'];
};

/** How timeline rows are grouped into lanes. */
export const TimelineLaneGrouping = {
  /** One lane per execution backend / tool / driver. */
  ByBackend: 'BY_BACKEND',
  /** One lane per repository checkout (falling back to branch). */
  ByCheckout: 'BY_CHECKOUT',
  /** One lane per plan. The default. */
  ByPlan: 'BY_PLAN',
} as const;

export type TimelineLaneGrouping =
  (typeof TimelineLaneGrouping)[keyof typeof TimelineLaneGrouping];
/** Kinds of timeline marker (work recorded at an instant). */
export const TimelineMarkerKind = {
  /** A git_commit work artifact, keyed on produced_at. */
  GitCommit: 'GIT_COMMIT',
  /** A grilling skill invocation (skill_usage_events where skill_name = 'grilling'), keyed on occurred_at. Attributed via `userId` when ingest resolved a principal; older rows carry none and fall back to the branch heuristic. */
  Grilling: 'GRILLING',
  /** A pull_request work artifact, keyed on produced_at. */
  PullRequest: 'PULL_REQUEST',
  /** A status_change work artifact, keyed on produced_at. Recorded inconsistently — expect a sparse lane. */
  StatusChange: 'STATUS_CHANGE',
  /** A task was created (tasks.created_at). */
  TaskAdded: 'TASK_ADDED',
  /** A task was last written (tasks.updated_at). Last write only — tasks carry no status history. */
  TaskUpdated: 'TASK_UPDATED',
} as const;

export type TimelineMarkerKind =
  (typeof TimelineMarkerKind)[keyof typeof TimelineMarkerKind];
export type TimelineMarkerObject = {
  __typename?: 'TimelineMarkerObject';
  /** When the marker happened. */
  at: Scalars['DateTime']['output'];
  /** Git branch attributed to this marker, when known. */
  branch?: Maybe<Scalars['String']['output']>;
  /** Stable row id. */
  id: Scalars['String']['output'];
  kind: TimelineMarkerKind;
  /** Lane this marker belongs to under the requested grouping. */
  laneKey: Scalars['String']['output'];
  /** Human-legible lane label for `laneKey`. */
  laneLabel: Scalars['String']['output'];
  /** Plan (UUID) this marker is attributed to, when it has one. */
  planId?: Maybe<Scalars['String']['output']>;
  /** Task (UUID) this marker is attributed to, when it has one. */
  taskId?: Maybe<Scalars['String']['output']>;
  /** One-line summary for the tooltip. */
  title: Scalars['String']['output'];
  /** External deep-link target (commit or pull request URL), when the payload carries one. */
  url?: Maybe<Scalars['String']['output']>;
  /** The user (UUID) this marker is attributed to. Only GRILLING carries one, and only when ingest could resolve a principal — it is never backfilled, so a null means the actor is unknown, not that the row is unowned. Read it before presenting the lane as user-scoped; null rows fall back to the branch heuristic. */
  userId?: Maybe<Scalars['String']['output']>;
};

/** Kinds of timeline span (work with a duration). */
export const TimelineSpanKind = {
  /** A queued Ralph plan run (plan_runs). Its end is always derived — the table records no finish timestamp. */
  PlanRun: 'PLAN_RUN',
  /** A scheduled agent job run (scheduled_agent_job_runs). Carries measured started_at/finished_at. */
  ScheduledRun: 'SCHEDULED_RUN',
  /** A work-ledger session (work_sessions). Measured unless still open (ended_at IS NULL). */
  WorkSession: 'WORK_SESSION',
} as const;

export type TimelineSpanKind =
  (typeof TimelineSpanKind)[keyof typeof TimelineSpanKind];
export type TimelineSpanObject = {
  __typename?: 'TimelineSpanObject';
  /** Execution backend / tool name / driver id, when the source carries one. */
  backend?: Maybe<Scalars['String']['output']>;
  /** Git branch the work ran on, when known. */
  branch?: Maybe<Scalars['String']['output']>;
  /** Repository checkout (UUID) the work ran in, when known. */
  checkoutId?: Maybe<Scalars['String']['output']>;
  /** Agent conversation (UUID) behind this span, when known. */
  conversationId?: Maybe<Scalars['String']['output']>;
  /** TRUE when `endsAt` was inferred rather than recorded — always for PLAN_RUN (plan_runs has no finish column), and for any still-open session or run. Render it distinctly; a derived end must never read as a measured one. */
  derivedEnd: Scalars['Boolean']['output'];
  /** End of the span. See `derivedEnd` before treating it as a measured finish. */
  endsAt: Scalars['DateTime']['output'];
  /** Stable row id. */
  id: Scalars['String']['output'];
  kind: TimelineSpanKind;
  /** Lane this span belongs to under the requested grouping. */
  laneKey: Scalars['String']['output'];
  /** Human-legible lane label for `laneKey`. */
  laneLabel: Scalars['String']['output'];
  /** Model that did the work, when known. */
  model?: Maybe<Scalars['String']['output']>;
  /** Plan (UUID) this span is attributed to, when it has one. */
  planId?: Maybe<Scalars['String']['output']>;
  /** Start of the span. */
  startsAt: Scalars['DateTime']['output'];
  /** Source-specific status (plan run status, scheduled run status). */
  status?: Maybe<Scalars['String']['output']>;
  /** One-line summary for the tooltip. */
  title: Scalars['String']['output'];
};

/** An agent-CLI login that usage was billed to (a subscription seat or an API key), as the CLI reported it. */
export type TokenUsageAccountObject = {
  __typename?: 'TokenUsageAccountObject';
  /** What the account's runs bill: api_key, subscription or unknown. Subscription costs are list-price estimates, not invoiced dollars. */
  credentialKind: Scalars['String']['output'];
  /** Login email, when the CLI reports one (codex is identified by account id only). */
  email?: Maybe<Scalars['String']['output']>;
  /** Agent account id. */
  id: Scalars['ID']['output'];
  /** When a usage row was last stamped with this account. */
  lastSeenAt: Scalars['DateTime']['output'];
  /** Provider organization or team name, when reported. */
  orgName?: Maybe<Scalars['String']['output']>;
  /** Subscription plan (for claude: pro, max, team, ...), when reported. */
  plan?: Maybe<Scalars['String']['output']>;
  /** Driver id the account belongs to. */
  provider: Scalars['String']['output'];
};

/** Usage over the range for one agent account on one provider. A null account is that provider's unattributed bucket. */
export type TokenUsageByAccountObject = {
  __typename?: 'TokenUsageByAccountObject';
  /** The account, or null for usage no account was stamped on (rows from before accounts were recorded, and drivers that report no identity). */
  account?: Maybe<TokenUsageAccountObject>;
  /** Provider (driver id) of the bucket. */
  provider: Scalars['String']['output'];
  /** Summed usage + turn count for the bucket. */
  totals: TokenUsageTotalsObject;
};

export type TokenUsageResultObject = {
  __typename?: 'TokenUsageResultObject';
  /** The same filtered range summed per agent account and provider, costliest first, with an unattributed bucket per provider. */
  byAccount: Array<TokenUsageByAccountObject>;
  /** Per-turn usage rows in the range, newest first. */
  items: Array<TokenUsageRowObject>;
  /** Summed usage + turn count over the same filtered range. */
  totals: TokenUsageTotalsObject;
};

export type TokenUsageRowObject = {
  __typename?: 'TokenUsageRowObject';
  /** Agent account (login) the turn was billed to, stamped when the row was written. Null when it could not be identified, and for rows written before accounts were recorded. */
  agentAccountId?: Maybe<Scalars['ID']['output']>;
  /** Cache-read tokens for the turn, when reported. */
  cacheReadTokens?: Maybe<Scalars['Float']['output']>;
  /** Cache-write tokens for the turn, when reported. */
  cacheWriteTokens?: Maybe<Scalars['Float']['output']>;
  /** Source conversation id, when the usage came from chat; null otherwise. */
  conversationId?: Maybe<Scalars['ID']['output']>;
  /** Dollar cost of the turn: reported by the producer, or an estimate at Anthropic list price for an unpriced Claude request. Null when it cannot be priced. */
  costUsd?: Maybe<Scalars['Float']['output']>;
  /** Turn completion timestamp. */
  createdAt: Scalars['DateTime']['output'];
  /** Usage row id. */
  id: Scalars['ID']['output'];
  /** Input/prompt tokens for the turn, when reported. */
  inputTokens?: Maybe<Scalars['Float']['output']>;
  /** Model the usage is attributed to, when known. */
  model?: Maybe<Scalars['String']['output']>;
  /** Output/completion tokens for the turn, when reported. */
  outputTokens?: Maybe<Scalars['Float']['output']>;
  /** Provider identity (driver id: antigravity|claude|codex|cursor|grok|opencode|openai). */
  provider: Scalars['String']['output'];
  /** Reasoning tokens for the turn, when reported separately. */
  reasoningTokens?: Maybe<Scalars['Float']['output']>;
  /** Producer of the row: openthrottle-chat (in-app chat) or claude-code (Claude Code hooks). Null for legacy rows written before sources were recorded, which are chat. */
  source?: Maybe<Scalars['String']['output']>;
  /** Total tokens for the turn, when reported. */
  totalTokens?: Maybe<Scalars['Float']['output']>;
};

export type TokenUsageTotalsObject = {
  __typename?: 'TokenUsageTotalsObject';
  /** Summed cache-read tokens over the range. */
  cacheReadTokens: Scalars['Float']['output'];
  /** Summed cache-write tokens over the range. */
  cacheWriteTokens: Scalars['Float']['output'];
  /** Summed dollar cost over the range. */
  costUsd: Scalars['Float']['output'];
  /** Summed input tokens over the range. */
  inputTokens: Scalars['Float']['output'];
  /** Summed output tokens over the range. */
  outputTokens: Scalars['Float']['output'];
  /** Summed reasoning tokens over the range. */
  reasoningTokens: Scalars['Float']['output'];
  /** Summed total tokens over the range. */
  totalTokens: Scalars['Float']['output'];
  /** Number of turns (usage rows) contributing to the totals. */
  turnCount: Scalars['Int']['output'];
};

export type TranscriptionStreamChunkObject = {
  __typename?: 'TranscriptionStreamChunkObject';
  /** True exactly once, on the terminal chunk (stop, idle reap, or hard cap). */
  done: Scalars['Boolean']['output'];
  /** Error message when the session failed or was reaped; null otherwise. */
  error?: Maybe<Scalars['String']['output']>;
  sessionId: Scalars['String']['output'];
  /** Monotonic index within the stream; clients replace state with the highest-sortOrder snapshot. */
  sortOrder: Scalars['Int']['output'];
  /** Full transcript so far (snapshot-replace: completed segments plus the current revising tail — never a delta). */
  transcript: Scalars['String']['output'];
};

/** The post returned to DRAFT, or BlogPostNotFoundError. */
export type UnpublishBlogPostResult =
  BlogPostAdminObject | BlogPostNotFoundError;

export type UnverifiedWorkArtifactsInput = {
  /** Max rows (verifier feed); clamped server-side */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Restrict to a single artifact type (e.g. git_commit) */
  type?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAgentConversationTitleInput = {
  conversationId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

/** Partial update. Omitted fields are unchanged; null clears a nullable field. Status and publishedAt change only through publish / unpublish / archive. */
export type UpdateBlogPostInput = {
  /** Slug of an existing author; null removes the byline. */
  authorSlug?: InputMaybe<Scalars['String']['input']>;
  /** Must not be null. */
  bodyMarkdown?: InputMaybe<Scalars['String']['input']>;
  coverImageAlt?: InputMaybe<Scalars['String']['input']>;
  coverImageUrl?: InputMaybe<Scalars['String']['input']>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  /** The post's updatedAt as last read. When set and the post has changed since, nothing is written and BlogPostStaleWriteError is returned. Omit to skip the check. */
  expectedUpdatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['ID']['input'];
  seoDescription?: InputMaybe<Scalars['String']['input']>;
  seoTitle?: InputMaybe<Scalars['String']['input']>;
  /** Lowercase letters, digits and single hyphens (^[a-z0-9]+(-[a-z0-9]+)*$), e.g. "my-first-post". Must not be null. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Must not be null. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** The updated post, or why nothing was written: the post or author does not exist, the slug is taken, a cover image would have no alt text, the post changed since expectedUpdatedAt, or the post is no longer a DRAFT and the caller lacks blog:write. */
export type UpdateBlogPostResult =
  | BlogCoverAltRequiredError
  | BlogPostAdminObject
  | BlogPostNotFoundError
  | BlogPostPublishPermissionRequiredError
  | BlogPostStaleWriteError
  | BlogReferenceNotFoundError
  | BlogSlugConflictError;

/** Changes to a fragment. Omitted fields are left as they are. */
export type UpdateCmsFragmentInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  /** The full new properties as a JSON object string, validated against the fragment's own (pinned) schema. */
  propertiesJson?: InputMaybe<Scalars['String']['input']>;
  uuid: Scalars['String']['input'];
};

/** Changes to a layout. Omitted fields are left as they are. */
export type UpdateCmsLayoutInput = {
  /** Layout metadata as a JSON object string. */
  metadataJson?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  /** ACTIVE | DISABLED | DRAFT */
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  uuid: Scalars['String']['input'];
};

/** Changes to a library component. Omitted fields are left as they are. */
export type UpdateCmsLibraryComponentInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  propsSchemaJson?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  typename?: InputMaybe<Scalars['String']['input']>;
  uuid: Scalars['String']['input'];
};

/** Input for updating an existing custom prompt */
export type UpdateCustomPromptInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  filePath?: InputMaybe<Scalars['String']['input']>;
  /** Custom prompt id to update */
  id: Scalars['ID']['input'];
  labels?: InputMaybe<Array<Scalars['String']['input']>>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  promptType?: InputMaybe<CustomPromptType>;
  title?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
  /** Write content to the file system at filePath if provided */
  writeToFileSystem?: Scalars['Boolean']['input'];
};

export type UpdateEvalRunStatusInput = {
  /** Run to update. */
  runId: Scalars['ID']['input'];
  /** New status: pending, running, usage_limited, completed, failed or cancelled. */
  status: Scalars['String']['input'];
};

export type UpdateNoteInput = {
  author?: InputMaybe<Scalars['String']['input']>;
  content?: InputMaybe<Scalars['String']['input']>;
  /** Note id to update */
  id: Scalars['ID']['input'];
};

export type UpdatePlanInput = {
  assignee?: InputMaybe<Scalars['String']['input']>;
  author?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** Plan id to update */
  id: Scalars['ID']['input'];
  /** JSON string of job-run lifecycle hooks ({ hooks: [...] }). Pass null to clear; omit to leave unchanged. */
  jobRunHooksJson?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  /** Optional. Project UUID (FK to projects table). Pass null to clear; omit to leave unchanged. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** JSON string of workflow-ralph run configuration (PlanRunConfigStorage v1). Pass null to reset to default v1 shell; omit to leave unchanged. */
  runConfigJson?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePlanMessageInput = {
  /** Replacement text. Must not be blank. */
  body: Scalars['String']['input'];
  /** A PENDING message to edit. */
  id: Scalars['ID']['input'];
};

export type UpdateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  /** Project id to update */
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  /** NX project name (e.g. applications/openthrottle-server) */
  nxProjectName?: InputMaybe<Scalars['String']['input']>;
};

/** Edit an owned repository's name, default branch, and/or project link. Omitted fields are left unchanged. */
export type UpdateRepositoryInput = {
  /** New default branch; omit to leave unchanged. */
  defaultBranch?: InputMaybe<Scalars['String']['input']>;
  /** Opt this user's checkouts of the repository into (or out of) foreign-workspace skill injection; omit to leave unchanged. */
  foreignSkillInjectionEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Repository id. */
  id: Scalars['ID']['input'];
  /** New display name; omit to leave unchanged. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** OpenThrottle project to link, or null to clear; omit to leave unchanged. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** Turn the ot-worktree skill overlay on or off for this user's checkouts of the repository (default on; off falls back to the server's SSOT worktree scripts); omit to leave unchanged. Only meaningful for foreign checkouts. */
  worktreeSkillOverlayEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  /** Role id to update */
  id: Scalars['ID']['input'];
  /** Role name. Pass null to leave unchanged. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRolloutFlagInput = {
  /** Description. Pass null to clear, omit to leave unchanged. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Master switch. Omit to leave unchanged. */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Fallthrough allocation. Omit to leave unchanged. */
  fallthrough?: InputMaybe<RolloutFallthroughInput>;
  /** Flag id to update */
  id: Scalars['ID']['input'];
  /** Flag key. Omit to leave unchanged; must stay unique. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** Flag kind. Omit to leave unchanged; changing kind requires matching variations. */
  kind?: InputMaybe<RolloutFlagKind>;
  /** Off variation index. Omit to leave unchanged. */
  offVariation?: InputMaybe<Scalars['Int']['input']>;
  /** RBAC role names to target. Omit to leave unchanged. */
  targetRoles?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Variations. Omit to leave unchanged. */
  variations?: InputMaybe<Array<RolloutFlagVariationInput>>;
};

export type UpdateScheduledAgentJobInputType = {
  cronPattern?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated Use repositoryCheckoutId to target a registered repository checkout; cwd is only consulted when no checkout is set. */
  cwd?: InputMaybe<Scalars['String']['input']>;
  driverId?: InputMaybe<Scalars['String']['input']>;
  /** Schedule to update. */
  id: Scalars['ID']['input'];
  /** For scheduleKind interval: ms from the end of one run to the start of the next; at least 60000. */
  intervalMs?: InputMaybe<Scalars['Int']['input']>;
  /** Misfire policy for late fires: skip or catch_up_once. */
  misfirePolicy?: InputMaybe<Scalars['String']['input']>;
  /** How late (ms) a fire may start and still run; at least 60000. */
  misfireThresholdMs?: InputMaybe<Scalars['Int']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  prompt?: InputMaybe<Scalars['String']['input']>;
  /** Registered repository checkout to run in; must belong to the caller. Takes precedence over cwd. */
  repositoryCheckoutId?: InputMaybe<Scalars['ID']['input']>;
  /** For scheduleKind once: when to run, as ISO 8601 with an offset; a changed time must be in the future. */
  runAt?: InputMaybe<Scalars['String']['input']>;
  /** How the schedule fires: cron, interval or once. Omit to keep the current kind. */
  scheduleKind?: InputMaybe<Scalars['String']['input']>;
  /** JSON AgentPromptSettings; no endpoint.apiKey. */
  settingsJson?: InputMaybe<Scalars['String']['input']>;
  timeoutMs?: InputMaybe<Scalars['Int']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateServiceAccountInput = {
  /** The human user this account acts as for user-scoped conveniences (e.g. plan workspace seeding). Pass null to clear the link; omit to leave unchanged. Never a permission grant. */
  actingUserId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  /** Display name. Pass null to leave unchanged. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTaskInput = {
  assignee?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** Task id to update */
  id: Scalars['ID']['input'];
  planId?: InputMaybe<Scalars['ID']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  /** Optional. Project UUID. Pass null to clear; omit to leave unchanged. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** JSON string of requirements array */
  requirements?: InputMaybe<Scalars['String']['input']>;
  /** Optional. Execution order within plan (gap-based insert, e.g. 1500 between 1000 and 2000). */
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  /** Optional. Coarse concurrency layer within the plan: tasks sharing a wave may be worked concurrently. Never 0; pass null to clear (unassigned); omit to leave unchanged. Not consumed for execution yet. */
  wave?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateUserInput = {
  /** Set to null to re-enable a disabled user; omit to leave unchanged. */
  disabledAt?: InputMaybe<Scalars['DateTime']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  /** GitHub username. Pass null to leave unchanged. */
  githubUsername?: InputMaybe<Scalars['String']['input']>;
  /** User id to update */
  id: Scalars['ID']['input'];
};

/** A partial update: an omitted field is left unchanged and an explicit null clears it. */
export type UpdateUserPreferencesInput = {
  defaultAgent?: InputMaybe<UserPreferencesAgentInput>;
  defaultEditor?: InputMaybe<WorkspaceEditorId>;
};

export type UpdateWorkspaceLocalRepositoryInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  gitDefaultBranch?: InputMaybe<Scalars['String']['input']>;
  gitRemoteUrl?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateWorkspaceProfileInput = {
  contactDisplayName?: InputMaybe<Scalars['String']['input']>;
  contactEmail?: InputMaybe<Scalars['String']['input']>;
  enabledEditors?: InputMaybe<Array<WorkspaceEditorId>>;
};

/** Creates the author with this slug or replaces its fields. Omitted bio / avatarUrl are cleared. */
export type UpsertBlogAuthorInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  displayName: Scalars['String']['input'];
  /** Lowercase letters, digits and single hyphens (^[a-z0-9]+(-[a-z0-9]+)*$), e.g. "my-first-post". */
  slug: Scalars['String']['input'];
};

/** Creates the tag with this slug or replaces its fields. An omitted description is cleared. */
export type UpsertBlogTagInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  /** Lowercase letters, digits and single hyphens (^[a-z0-9]+(-[a-z0-9]+)*$), e.g. "my-first-post". */
  slug: Scalars['String']['input'];
};

export type UpsertTagActionRuleInput = {
  /** JSON-encoded action payload (validated per action type). */
  actionPayloadJson: Scalars['String']['input'];
  /** Action type: "inject-task" or "availability-exception". */
  actionType: Scalars['String']['input'];
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Optional environment qualifier: ci | interactive | ralph. */
  environment?: InputMaybe<Scalars['String']['input']>;
  /** When present, updates the existing rule (must belong to the caller). */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Optional project scope; null matches every project. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional plan-status qualifier (e.g. PENDING). */
  status?: InputMaybe<Scalars['String']['input']>;
  /** Tags that must ALL be present (AND); empty matches every plan. */
  tagAll?: Array<Scalars['String']['input']>;
  /** Human-readable label for the rule (required, non-empty). */
  title: Scalars['String']['input'];
};

export type UserObject = {
  __typename?: 'UserObject';
  createdAt: Scalars['DateTime']['output'];
  /** When set, user is disabled and cannot log in. */
  disabledAt?: Maybe<Scalars['DateTime']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  /** GitHub user or Organization name (e.g. OpenThrottle) */
  githubUsername: Scalars['String']['output'];
  id: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** A default agent. Backend and model are required together; effort may be null. */
export type UserPreferencesAgentInput = {
  /** Agent CLI driver id. */
  backend: Scalars['String']['input'];
  /** Reasoning effort level, or null for the backend's own default. */
  effort?: InputMaybe<Scalars['String']['input']>;
  /** Driver-specific model id. */
  model: Scalars['String']['input'];
};

/** The user's default agent. Backend and model always travel together, so a half-set agent cannot be represented. */
export type UserPreferencesAgentObject = {
  __typename?: 'UserPreferencesAgentObject';
  /** Agent CLI driver id (e.g. claude, cursor, codex). */
  backend: Scalars['String']['output'];
  /** Reasoning effort level, or null for the backend's own default. */
  effort?: Maybe<Scalars['String']['output']>;
  /** Driver-specific model id, opaque to the server. */
  model: Scalars['String']['output'];
};

/** Per-user preferences. A null field means "use the system default". */
export type UserPreferencesObject = {
  __typename?: 'UserPreferencesObject';
  /** Default agent (backend + model + effort), or null for the system default. */
  defaultAgent?: Maybe<UserPreferencesAgentObject>;
  /** Default editor for open-in-editor links, or null for the system default (VS Code). */
  defaultEditor?: Maybe<WorkspaceEditorId>;
};

/** Per-user workspace profile: contact fields and enabled editors. */
export type UserWorkspaceProfileObject = {
  __typename?: 'UserWorkspaceProfileObject';
  /** Display name for notifications and workspace attribution. */
  contactDisplayName?: Maybe<Scalars['String']['output']>;
  /** Contact email for workspace profile (distinct from auth email). */
  contactEmail?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Editors the user wants OpenThrottle to configure in linked repos. */
  enabledEditors: Array<WorkspaceEditorId>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

/** Interpretation of wall-clock to CPU time ratio. */
export const WallClockInterpretation = {
  CpuBound: 'cpu_bound',
  Idle: 'idle',
  IoBound: 'io_bound',
  Mixed: 'mixed',
} as const;

export type WallClockInterpretation =
  (typeof WallClockInterpretation)[keyof typeof WallClockInterpretation];
/** Wall-clock and CPU time metrics for determining job workload characteristics. */
export type WallClockMetrics = {
  __typename?: 'WallClockMetrics';
  /** CPU system time delta in milliseconds. */
  cpuSystemMs: Scalars['Float']['output'];
  /** Total CPU time (user + system) in milliseconds. */
  cpuTimeMs: Scalars['Float']['output'];
  /** CPU user time delta in milliseconds. */
  cpuUserMs: Scalars['Float']['output'];
  /** End timestamp (Unix ms) when job completed. */
  endTimestamp: Scalars['Float']['output'];
  /** Interpretation hint: cpu_bound (ratio <= 1.5), mixed (1.5-5), io_bound (> 5), idle (no CPU time). */
  interpretation: WallClockInterpretation;
  /** Start timestamp (Unix ms) when job began. */
  startTimestamp: Scalars['Float']['output'];
  /** Wall-clock duration in milliseconds. */
  wallClockMs: Scalars['Float']['output'];
  /** Ratio of wall-clock to CPU time. ~1 = CPU-bound, > 5 = I/O-bound. */
  wallClockToCpuRatio: Scalars['Float']['output'];
};

export type WithdrawPlanMessageInput = {
  /** A PENDING message to withdraw. */
  id: Scalars['ID']['input'];
};

export type WorkArtifactListResult = {
  __typename?: 'WorkArtifactListResult';
  artifacts: Array<WorkArtifactObject>;
  totalCount: Scalars['Int']['output'];
};

export type WorkArtifactObject = {
  __typename?: 'WorkArtifactObject';
  createdAt: Scalars['DateTime']['output'];
  externalKey: Scalars['String']['output'];
  id: Scalars['String']['output'];
  lifecycle?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  /** JSON-serialized per-type payload (parse client-side) */
  payloadJson: Scalars['String']['output'];
  producedAt: Scalars['DateTime']['output'];
  sessionId: Scalars['String']['output'];
  source: Scalars['String']['output'];
  type: Scalars['String']['output'];
  /** Claims-vs-facts state: unverified | verified | orphaned */
  verification: Scalars['String']['output'];
  verifiedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type WorkArtifactsByPlanInput = {
  /** Plan id to list linked artifacts for */
  planId: Scalars['ID']['input'];
};

export type WorkArtifactsBySessionInput = {
  /** Session id to list artifacts for */
  sessionId: Scalars['ID']['input'];
};

export type WorkArtifactsByTaskInput = {
  /** Task id to list linked artifacts for */
  taskId: Scalars['ID']['input'];
};

export type WorkLedgerCompletenessInput = {
  /** Max owed plans listed; the counts are always over the full set */
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type WorkLedgerCompletenessResult = {
  __typename?: 'WorkLedgerCompletenessResult';
  /** Plans with git work but no verifier-confirmed commit; worst-known first */
  owed: Array<WorkLedgerPlanCompletenessObject>;
  /** Plans with git work and nothing truthful */
  owedCount: Scalars['Int']['output'];
  /** Plans with at least one verifier-confirmed landed commit */
  recordedCount: Scalars['Int']['output'];
  /** Plans the ledger knows have git work (see the denominator caveat) */
  totalCount: Scalars['Int']['output'];
};

export type WorkLedgerPlanCompletenessObject = {
  __typename?: 'WorkLedgerPlanCompletenessObject';
  /** git_commit artifacts linked to this plan, truthful or not */
  artifactCount: Scalars['Int']['output'];
  planId: Scalars['ID']['output'];
  planStatus: Scalars['String']['output'];
  planTitle: Scalars['String']['output'];
  /** True when at least one linked git_commit carries a verifier-confirmed landedSha */
  recorded: Scalars['Boolean']['output'];
};

export type WorkSessionListResult = {
  __typename?: 'WorkSessionListResult';
  sessions: Array<WorkSessionObject>;
  totalCount: Scalars['Int']['output'];
};

export type WorkSessionObject = {
  __typename?: 'WorkSessionObject';
  actorServiceAccountId?: Maybe<Scalars['String']['output']>;
  actorUserId?: Maybe<Scalars['String']['output']>;
  /** How the session closed: explicit (after real work) | instant (no span) | sweeper (abandoned past TTL); null while open */
  closedBy?: Maybe<Scalars['String']['output']>;
  conversationId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  endedAt?: Maybe<Scalars['DateTime']['output']>;
  externalRef?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  model?: Maybe<Scalars['String']['output']>;
  onBehalfOfUserId?: Maybe<Scalars['String']['output']>;
  onBehalfOfVerified: Scalars['Boolean']['output'];
  planRunId?: Maybe<Scalars['String']['output']>;
  startedAt: Scalars['DateTime']['output'];
  summary?: Maybe<Scalars['String']['output']>;
  toolName: Scalars['String']['output'];
  toolVersion?: Maybe<Scalars['String']['output']>;
};

export type WorkSessionSubjectObject = {
  __typename?: 'WorkSessionSubjectObject';
  attachedAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  planId: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
  taskId?: Maybe<Scalars['String']['output']>;
};

export type WorkSessionsByPlanInput = {
  /** Plan id to list sessions for */
  planId: Scalars['ID']['input'];
};

/** An interactive listing from browseDirectory: the current directory's immediate subdirectories plus the navigation context (current + parent path, and whether the current directory is itself a git repo) so the client can render a breadcrumb, an Up control, and an "add this folder" action. All paths are on the server host. */
export type WorkspaceDirectoryListingObject = {
  __typename?: 'WorkspaceDirectoryListingObject';
  /** Immediate subdirectories of the current directory (or the configured roots when listing roots). */
  entries: Array<BrowseDirectoryEntryObject>;
  /** True when the currently-browsed directory is itself a git repository. Always false when listing roots (path is null). */
  isGitRepo: Scalars['Boolean']['output'];
  /** Absolute host path one level up, or null when at/above a configured root (containment-guarded) or when listing roots. */
  parentPath?: Maybe<Scalars['String']['output']>;
  /** Canonical absolute host path of the currently-browsed directory, or null when listing the configured roots (no directory is "current"). */
  path?: Maybe<Scalars['String']['output']>;
};

/** Result of applying editor configuration for one linked repository and editor. */
export type WorkspaceEditorConfigApplicationObject = {
  __typename?: 'WorkspaceEditorConfigApplicationObject';
  editor: WorkspaceEditorId;
  filesWritten: Array<Scalars['String']['output']>;
  filesystemPath: Scalars['String']['output'];
  repositoryId: Scalars['ID']['output'];
  warnings: Array<Scalars['String']['output']>;
};

/** Editor OpenThrottle may configure in linked local repositories (MCP, skills, rules). Supported values: claude, cursor, vscode. */
export const WorkspaceEditorId = {
  /** Claude Code */
  Claude: 'CLAUDE',
  /** Cursor IDE */
  Cursor: 'CURSOR',
  /** Visual Studio Code */
  Vscode: 'VSCODE',
} as const;

export type WorkspaceEditorId =
  (typeof WorkspaceEditorId)[keyof typeof WorkspaceEditorId];
/** How addWorkspaceFolder resolved the folder's identity: via the on-disk OT manifest (checkout or repository id), via the normalized git remote, or by creating a new canonical/provisional repository. */
export const WorkspaceFolderReconciliation = {
  CreatedCanonical: 'CREATED_CANONICAL',
  CreatedProvisional: 'CREATED_PROVISIONAL',
  MatchedManifestCheckout: 'MATCHED_MANIFEST_CHECKOUT',
  MatchedManifestRepository: 'MATCHED_MANIFEST_REPOSITORY',
  MatchedRemote: 'MATCHED_REMOTE',
} as const;

export type WorkspaceFolderReconciliation =
  (typeof WorkspaceFolderReconciliation)[keyof typeof WorkspaceFolderReconciliation];
/** A local filesystem checkout registered under the user's workspace settings. */
export type WorkspaceLocalRepositoryObject = {
  __typename?: 'WorkspaceLocalRepositoryObject';
  createdAt: Scalars['DateTime']['output'];
  displayName: Scalars['String']['output'];
  /** Canonical absolute path on the server host. */
  filesystemPath: Scalars['String']['output'];
  /** Branch the checkout is on per its last inspection scan; null until scanned or when HEAD is detached. */
  gitCurrentBranch?: Maybe<Scalars['String']['output']>;
  gitDefaultBranch?: Maybe<Scalars['String']['output']>;
  /** Optional git remote URL (origin). */
  gitRemoteUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Checkout kind: 'primary' (the repository's main clone) or 'worktree' (a linked git worktree). */
  kind: Scalars['String']['output'];
  project?: Maybe<ProjectObject>;
  /** Optional OpenThrottle project linked to this checkout. */
  projectId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

/** Capabilities that seed the add-folder picker: whether a native OS folder dialog can be opened on the server host, the configured workspace roots (host view), and a default path to open the in-app picker at — all server-host paths. */
export type WorkspacePickerCapabilitiesObject = {
  __typename?: 'WorkspacePickerCapabilitiesObject';
  /** True when the openthrottle-server host can open a native OS folder dialog for this request (request is loopback + a display is present, or forced via OPENTHROTTLE_NATIVE_PICKER). The client uses this to choose the Browse affordance; the pickFolderNative mutation re-checks it before spawning. */
  canUseNativeDialog: Scalars['Boolean']['output'];
  /** Absolute server-host path to seed the in-app picker at: the first configured workspace root, else the host home directory. */
  defaultBrowsePath: Scalars['String']['output'];
  /** Configured OPENTHROTTLE_WORKSPACE_ROOTS in the host view; empty when unset. */
  roots: Array<Scalars['String']['output']>;
};

/** Workspace settings for the authenticated user: profile and local repositories. */
export type WorkspaceSettingsObject = {
  __typename?: 'WorkspaceSettingsObject';
  localRepositories: Array<WorkspaceLocalRepositoryObject>;
  profile: UserWorkspaceProfileObject;
};

export type WorkstreamTimelineInput = {
  /** Filter spans to a single execution backend / tool / driver. */
  backend?: InputMaybe<Scalars['String']['input']>;
  /** Filter to a single repository checkout (UUID). */
  checkoutId?: InputMaybe<Scalars['String']['input']>;
  /** Start of the window (inclusive). */
  from: Scalars['DateTime']['input'];
  /** Filter to a single git branch. Also scopes the grilling lane, which is how unattributed grilling events (no `userId`) are narrowed. */
  gitBranch?: InputMaybe<Scalars['String']['input']>;
  /** How rows are grouped into lanes. Defaults to BY_PLAN. */
  grouping?: InputMaybe<TimelineLaneGrouping>;
  /** Marker kinds to include. Omit or pass null for all kinds; an empty list returns no markers. */
  markerKinds?: InputMaybe<Array<TimelineMarkerKind>>;
  /** Filter to a single plan (UUID). */
  planId?: InputMaybe<Scalars['String']['input']>;
  /** Span kinds to include. Omit or pass null for all kinds; an empty list returns no spans. */
  spanKinds?: InputMaybe<Array<TimelineSpanKind>>;
  /** End of the window (exclusive). Must be after `from`, and no more than 90 days later. */
  to: Scalars['DateTime']['input'];
};

export type WorkstreamTimelineResultObject = {
  __typename?: 'WorkstreamTimelineResultObject';
  /** Echo of the requested window start. */
  from: Scalars['DateTime']['output'];
  /** Instant markers in the window, oldest first. */
  markers: Array<TimelineMarkerObject>;
  /** Duration spans overlapping the window, oldest first. */
  spans: Array<TimelineSpanObject>;
  /** Echo of the requested window end. */
  to: Scalars['DateTime']['output'];
  /** Per-kind row counts and truncation flags, one entry per requested kind. */
  truncation: Array<TimelineKindTruncationObject>;
};

/** What a discovered worktree is doing. Never inferred from the directory merely existing. */
export const WorktreeActivity = {
  /** No live run, but there is uncommitted work or commits ahead of the upstream. */
  Dirty: 'DIRTY',
  /** Clean, with nothing running. */
  Idle: 'IDLE',
  /** A live IN_PROGRESS plan run is executing here — live meaning its heartbeat is inside the staleness cutoff. A stale IN_PROGRESS run is dead and does NOT read as running. */
  Running: 'RUNNING',
} as const;

export type WorktreeActivity =
  (typeof WorktreeActivity)[keyof typeof WorktreeActivity];
/** What a scan noticed that was less than complete. The server decides WHAT happened; the client decides how loud it is. States that are merely the healthy default — above all a repository that has no worktrees yet — are not problems and are never reported. */
export const WorktreeDiscoveryProblemKind = {
  /** More worktrees exist than the hard cap; the overflow is counted in droppedCount and not listed. */
  CapExceeded: 'CAP_EXCEEDED',
  /** The registered checkouts could not be listed, so the scan had nothing to scan from. The whole result is empty. */
  CheckoutListFailed: 'CHECKOUT_LIST_FAILED',
  /** A registered folder is not a git checkout at all. Carries repositoryId — belongs on that repository’s row, not on the page. */
  NotAGitRepo: 'NOT_A_GIT_REPO',
  /** A directory in a worktree root with no .git at all — the husk a removed worktree leaves behind. Not a worktree and never probed; nothing deletes it automatically. */
  OrphanDirectory: 'ORPHAN_DIRECTORY',
  /** A read-only git probe against a directory that does exist failed. The genuinely degraded case: worktrees may be missing from the list. */
  ProbeFailed: 'PROBE_FAILED',
  /** A worktree root exists but could not be read (EACCES and friends). A root that simply does not exist is NOT this — that is a repository with no worktrees yet, and is silent. */
  RootUnreadable: 'ROOT_UNREADABLE',
  /** git still reports a worktree whose directory is gone. Actionable exactly once, with `git worktree prune`; the path is never probed. */
  StaleWorktreeEntry: 'STALE_WORKTREE_ENTRY',
} as const;

export type WorktreeDiscoveryProblemKind =
  (typeof WorktreeDiscoveryProblemKind)[keyof typeof WorktreeDiscoveryProblemKind];
/** One classified, non-fatal thing that happened during a scan. */
export type WorktreeDiscoveryProblemObject = {
  __typename?: 'WorktreeDiscoveryProblemObject';
  /** The raw underlying message (errno text, git stderr). For diagnostics — the sentence shown to a person is derived from kind, never from this. */
  detail: Scalars['String']['output'];
  /** What happened. See WorktreeDiscoveryProblemKind. */
  kind: WorktreeDiscoveryProblemKind;
  /** The directory the problem is about, or null when it is not about one (the cap). */
  path?: Maybe<Scalars['String']['output']>;
  /** Set only when the problem is attributable to one registered repository, so the UI can report it on that row instead of page-wide. */
  repositoryId?: Maybe<Scalars['ID']['output']>;
};

/** Which rung of the shared worktree-root ladder resolved the scanned root. The same ladder skills/ot-worktree/scripts/root.sh applies, so the page can never disagree with where the script writes. */
export const WorktreeRootSource = {
  /** OPENTHROTTLE_WORKTREE_ROOT in the target repo’s .env file — how a repo customizes where its worktrees go. */
  CheckoutEnv: 'CHECKOUT_ENV',
  /** The default: ~/.openthrottle/worktrees, the hidden root OpenThrottle owns. OT appends <org>/<repo> beneath it, taken from the checkout’s git remote. */
  Default: 'DEFAULT',
  /** OPENTHROTTLE_WORKTREE_ROOT in the server process's environment. */
  Env: 'ENV',
} as const;

export type WorktreeRootSource =
  (typeof WorktreeRootSource)[keyof typeof WorktreeRootSource];
export type BlogPostQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;

export type BlogPostQuery = {
  __typename?: 'Query';
  blogPost?: {
    __typename?: 'BlogPostObject';
    bodyMarkdown: string;
    seoDescription?: string | null;
    seoTitle?: string | null;
    updatedAt: any;
    coverImageAlt?: string | null;
    coverImageUrl?: string | null;
    excerpt?: string | null;
    id: string;
    publishedAt?: any | null;
    readingTimeMinutes: number;
    slug: string;
    title: string;
    author?: {
      __typename?: 'BlogAuthorObject';
      bio?: string | null;
      avatarUrl?: string | null;
      displayName: string;
      slug: string;
    } | null;
    tags: Array<{ __typename?: 'BlogTagObject'; name: string; slug: string }>;
  } | null;
};

export type BlogIndexQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  first?: Scalars['Int']['input'];
}>;

export type BlogIndexQuery = {
  __typename?: 'Query';
  blogPosts: {
    __typename?: 'BlogPostListResult';
    endCursor?: string | null;
    hasNextPage: boolean;
    items: Array<{
      __typename?: 'BlogPostObject';
      coverImageAlt?: string | null;
      coverImageUrl?: string | null;
      excerpt?: string | null;
      id: string;
      publishedAt?: any | null;
      readingTimeMinutes: number;
      slug: string;
      title: string;
      author?: {
        __typename?: 'BlogAuthorObject';
        avatarUrl?: string | null;
        displayName: string;
        slug: string;
      } | null;
      tags: Array<{ __typename?: 'BlogTagObject'; name: string; slug: string }>;
    }>;
  };
};

export type BlogTagQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  first?: Scalars['Int']['input'];
  tagSlug: Scalars['String']['input'];
}>;

export type BlogTagQuery = {
  __typename?: 'Query';
  blogPosts: {
    __typename?: 'BlogPostListResult';
    endCursor?: string | null;
    hasNextPage: boolean;
    items: Array<{
      __typename?: 'BlogPostObject';
      coverImageAlt?: string | null;
      coverImageUrl?: string | null;
      excerpt?: string | null;
      id: string;
      publishedAt?: any | null;
      readingTimeMinutes: number;
      slug: string;
      title: string;
      author?: {
        __typename?: 'BlogAuthorObject';
        avatarUrl?: string | null;
        displayName: string;
        slug: string;
      } | null;
      tags: Array<{ __typename?: 'BlogTagObject'; name: string; slug: string }>;
    }>;
  };
  blogTags: Array<{
    __typename?: 'BlogTagObject';
    description?: string | null;
    name: string;
    slug: string;
  }>;
};

export type BlogFeedQueryVariables = Exact<{
  first?: Scalars['Int']['input'];
}>;

export type BlogFeedQuery = {
  __typename?: 'Query';
  blogPosts: {
    __typename?: 'BlogPostListResult';
    items: Array<{
      __typename?: 'BlogPostObject';
      excerpt?: string | null;
      publishedAt?: any | null;
      seoDescription?: string | null;
      slug: string;
      title: string;
      updatedAt: any;
      author?: { __typename?: 'BlogAuthorObject'; displayName: string } | null;
      tags: Array<{ __typename?: 'BlogTagObject'; name: string }>;
    }>;
  };
};

export type BlogSitemapPageQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  first?: Scalars['Int']['input'];
}>;

export type BlogSitemapPageQuery = {
  __typename?: 'Query';
  blogPosts: {
    __typename?: 'BlogPostListResult';
    endCursor?: string | null;
    hasNextPage: boolean;
    items: Array<{
      __typename?: 'BlogPostObject';
      slug: string;
      updatedAt: any;
    }>;
  };
};

export type BlogSitemapTagsQueryVariables = Exact<{ [key: string]: never }>;

export type BlogSitemapTagsQuery = {
  __typename?: 'Query';
  blogTags: Array<{ __typename?: 'BlogTagObject'; slug: string }>;
};

export type BlogPostSummaryFragment = {
  __typename?: 'BlogPostObject';
  coverImageAlt?: string | null;
  coverImageUrl?: string | null;
  excerpt?: string | null;
  id: string;
  publishedAt?: any | null;
  readingTimeMinutes: number;
  slug: string;
  title: string;
  author?: {
    __typename?: 'BlogAuthorObject';
    avatarUrl?: string | null;
    displayName: string;
    slug: string;
  } | null;
  tags: Array<{ __typename?: 'BlogTagObject'; name: string; slug: string }>;
};

export const BlogPostSummaryFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostSummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'author' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'readingTimeMinutes' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogPostSummaryFragment, unknown>;
export const BlogPostDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogPost' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPost' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'slug' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'author' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'bio' } },
                    ],
                  },
                },
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'BlogPostSummary' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'bodyMarkdown' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'seoDescription' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'seoTitle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostSummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'author' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'readingTimeMinutes' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogPostQuery, BlogPostQueryVariables>;
export const BlogIndexDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogIndex' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'after' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'first' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          defaultValue: { kind: 'IntValue', value: '9' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPosts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'after' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'after' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'first' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'first' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'endCursor' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'BlogPostSummary' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostSummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'author' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'readingTimeMinutes' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogIndexQuery, BlogIndexQueryVariables>;
export const BlogTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'after' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'first' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          defaultValue: { kind: 'IntValue', value: '9' },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'tagSlug' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPosts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'after' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'after' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'first' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'first' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tagSlug' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'tagSlug' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'endCursor' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'BlogPostSummary' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogTags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostSummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'author' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'readingTimeMinutes' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogTagQuery, BlogTagQueryVariables>;
export const BlogFeedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogFeed' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'first' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          defaultValue: { kind: 'IntValue', value: '20' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPosts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'first' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'first' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'author' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'displayName' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'excerpt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'publishedAt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'seoDescription' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'name' },
                            },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogFeedQuery, BlogFeedQueryVariables>;
export const BlogSitemapPageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogSitemapPage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'after' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'first' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          defaultValue: { kind: 'IntValue', value: '200' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPosts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'after' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'after' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'first' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'first' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'endCursor' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  BlogSitemapPageQuery,
  BlogSitemapPageQueryVariables
>;
export const BlogSitemapTagsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogSitemapTags' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogTags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  BlogSitemapTagsQuery,
  BlogSitemapTagsQueryVariables
>;
