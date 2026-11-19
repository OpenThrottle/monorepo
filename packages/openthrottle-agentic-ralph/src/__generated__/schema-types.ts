export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: unknown; output: unknown };
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
  /** Optional producer tag for the chunk: loop, worker, tool or validation. Omit for an untagged chunk. */
  kind?: InputMaybe<Scalars['String']['input']>;
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

export type ArchiveAgentConversationInput = {
  conversationId: Scalars['ID']['input'];
};

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

export type CancelPlanRunInput = {
  /** Plan id whose in-queue run-plan (Ralph) job should be cancelled */
  planId: Scalars['ID']['input'];
  /** Optional plan_runs id of a SCHEDULED run of this plan. When set, cancels only that run: its delayed job is removed and its row settles CANCELLED, with no effect on any other active run or the tasks; a SCHEDULED plan returns to PENDING. Already-settled runs are a no-op; a run that is QUEUED or IN_PROGRESS is rejected (omit planRunId to stop a live run). When omitted, the whole plan is cancelled as before. */
  planRunId?: InputMaybe<Scalars['ID']['input']>;
};

export type ClaimPlanMessagesInput = {
  /** Plan whose pending inbox to claim. */
  planId: Scalars['ID']['input'];
  /** The claiming run (plan_runs.id), stamped on each delivered message. Omit only when no run row exists. */
  planRunId?: InputMaybe<Scalars['ID']['input']>;
  /** The task the agent is about to start; delivered messages and the audit chunk are attributed to it. */
  taskId?: InputMaybe<Scalars['ID']['input']>;
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

export type CodeSemanticSearchInput = {
  /** Max number of matches to return (default 10). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Natural-language query to embed and search by vector similarity. */
  query: Scalars['String']['input'];
  /** Registered WorkspaceLocalRepository id to search within. */
  repositoryId: Scalars['ID']['input'];
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

export type ConnectMcpConnectorInput = {
  /** API token for api_token connectors; ignored for oauth. Never persisted raw — stored as a bcrypt hash + masked hint. */
  apiToken?: InputMaybe<Scalars['String']['input']>;
  /** Catalog key of the connector to connect. */
  connectorKey: Scalars['ID']['input'];
  /** Optional label for the credential. */
  label?: InputMaybe<Scalars['String']['input']>;
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
  /** Optional client-chosen plan id (UUID) that makes the create idempotent. Re-sending a create with the same id and title returns the plan the first call created instead of inserting a second, so a caller whose request timed out can retry safely. A different title under an existing id is refused. */
  id?: InputMaybe<Scalars['ID']['input']>;
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

export type DeleteProjectInput = {
  /** Project id to delete */
  id: Scalars['ID']['input'];
};

export type DeleteTagActionRuleInput = {
  /** Rule to soft delete (its ledger rows are kept). */
  id: Scalars['ID']['input'];
};

export type DeleteTaskInput = {
  /** Task id to delete */
  id: Scalars['ID']['input'];
};

/** The worktree path a teardown just removed. */
export type DeregisterWorktreeCheckoutInput = {
  /** Who removed the worktree and how. When present the server records the removal (whatever the outcome) so it can be attributed without the client's local log; omitted by the pre-removal active-run probe, which records nothing. */
  audit?: InputMaybe<WorktreeRemovalAuditInput>;
  /** Absolute filesystem path of the removed worktree. Matched as given and by its real path. */
  filesystemPath: Scalars['String']['input'];
};

export type DetachHookInput = {
  /** Hook task id to detach (delete) */
  hookTaskId: Scalars['ID']['input'];
};

export type DuplicateJobInput = {
  /** BullMQ job id to duplicate. */
  jobId: Scalars['ID']['input'];
  /** Queue name (e.g. plans). */
  queueName: Scalars['String']['input'];
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

export type ForceSettlePlanRunInput = {
  /** Plan-run row id to force-settle to STALE. Must be an IN_PROGRESS run that does not heartbeat; anything else is refused. */
  planRunId: Scalars['ID']['input'];
  /** Why the run is being settled, written to settledReason. Omit for a human's "contact lost"; an automated backstop (the Claude Code Stop janitor) names itself and its evidence. */
  reason?: InputMaybe<Scalars['String']['input']>;
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

/** Which plan (and optionally which task) to draft git text for. */
export type GitTextDraftInput = {
  /** The plan the branch, PR and commits belong to. */
  planId: Scalars['ID']['input'];
  /** The target repo's PR template (its raw markdown). The body keeps its headings and checklists and fills the first section. Omit for the default sections. */
  pullRequestTemplate?: InputMaybe<Scalars['String']['input']>;
  /** Conventional-commit scope, e.g. the Nx project touched; send one the repo's commitlint accepts. Omitted or malformed, the header has no scope: type: subject. */
  scope?: InputMaybe<Scalars['String']['input']>;
  /** A task of the plan to draft a commit message for. Omit for the branch and PR only. */
  taskId?: InputMaybe<Scalars['ID']['input']>;
};

/** Which entity an id ref resolved to: a plan or a task. */
export const IdRefKind = {
  Plan: 'PLAN',
  Task: 'TASK',
} as const;

export type IdRefKind = (typeof IdRefKind)[keyof typeof IdRefKind];
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

export type LastActivityInput = {
  /** Plan ID (UUID). Returns the single most recent activity for this plan. */
  planId: Scalars['String']['input'];
  /** Optional task ID to scope the last activity to that task. */
  taskId?: InputMaybe<Scalars['String']['input']>;
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

export type ListAgentConversationsInput = {
  /** Page size (default 20, max 100) */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Offset for pagination */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Filter by status: active or archived (default active) */
  status?: InputMaybe<Scalars['String']['input']>;
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

export type LoginInput = {
  /** User email */
  email: Scalars['String']['input'];
  /** User password */
  password: Scalars['String']['input'];
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
export type OpenToMergedCycleTimeInput = {
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Bucket by week (YYYY-Www) or month (YYYY-MM); omit for repo-wide summary. */
  period?: InputMaybe<Scalars['String']['input']>;
  /** Repository name */
  repo: Scalars['String']['input'];
};

export type PlanEmbeddingsByPlanInput = {
  /** Max rows to return (default and hard cap: 1000). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Rows to skip (pagination offset). */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Plan id to list embeddings for */
  planId: Scalars['ID']['input'];
};

/** What a plan inbox message is for. STEER: a correction that overrides the task description where they conflict, delivered first at the next task boundary. QUEUE: an extra requirement for the upcoming work, delivered after STEERs. FEEDBACK: post-run reflection; recorded, never delivered. */
export const PlanMessageKind = {
  Feedback: 'FEEDBACK',
  Queue: 'QUEUE',
  Steer: 'STEER',
} as const;

export type PlanMessageKind =
  (typeof PlanMessageKind)[keyof typeof PlanMessageKind];
/** Plan inbox message lifecycle. PENDING: waiting for the next task boundary. DELIVERED: claimed by a run (immutable). WITHDRAWN: retracted before delivery. RECORDED: FEEDBACK messages only. */
export const PlanMessageStatus = {
  Delivered: 'DELIVERED',
  Pending: 'PENDING',
  Recorded: 'RECORDED',
  Withdrawn: 'WITHDRAWN',
} as const;

export type PlanMessageStatus =
  (typeof PlanMessageStatus)[keyof typeof PlanMessageStatus];
/** Plan-scoped run (default) or task-centric run ("task" requires taskId). */
export const PlanRalphWorkflowMode = {
  Plan: 'plan',
  Task: 'task',
} as const;

export type PlanRalphWorkflowMode =
  (typeof PlanRalphWorkflowMode)[keyof typeof PlanRalphWorkflowMode];
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

/** System CPU pressure level interpretation. */
export const PressureLevel = {
  High: 'high',
  Low: 'low',
  Moderate: 'moderate',
  Unknown: 'unknown',
} as const;

export type PressureLevel = (typeof PressureLevel)[keyof typeof PressureLevel];
export type PromoteTaskToPlanInput = {
  /** Optional idempotency key: re-submitting the same key enqueues at most one promotion job. Letters, digits, and ._:- only. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** Id of the task to promote into a new plan */
  taskId: Scalars['ID']['input'];
};

export type PrsMergedPerPeriodInput = {
  /** Repository owner (e.g. GitHub username or org) */
  owner: Scalars['String']['input'];
  /** Period bucket: week (YYYY-Www) or month (YYYY-MM) in UTC. */
  period: Scalars['String']['input'];
  /** Repository name */
  repo: Scalars['String']['input'];
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
/** Registered worktree checkouts to delete. A request, not evidence: every guard is re-checked server-side. */
export type PruneWorktreeCheckoutsInput = {
  /** repository_checkouts ids, typically DiscoveredWorktrees.missingCheckouts. At most 200 distinct ids; duplicates are collapsed. */
  checkoutIds: Array<Scalars['ID']['input']>;
};

export type PublishBlogPostInput = {
  id: Scalars['ID']['input'];
  /** When the post goes live. Omit (or null) to publish now; a future date schedules the post — it is PUBLISHED but not publicly visible until then. */
  publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type QueueControlInput = {
  /** Queue name (e.g. plans). */
  queueName: Scalars['String']['input'];
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

/** Severity bucket for a keyed run-output log event (derived; see field semantics). */
export const QueueJobLogLevel = {
  Debug: 'debug',
  Error: 'error',
  Info: 'info',
  Warn: 'warn',
} as const;

export type QueueJobLogLevel =
  (typeof QueueJobLogLevel)[keyof typeof QueueJobLogLevel];
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
  /**
   * Working directory at invocation time.
   * @deprecated Absolute paths leak the home-directory layout and foreign repos now send null (child-repo-hook-telemetry-contract §3). Use repoIdentity.
   */
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
  /** Git remote of the repository the skill ran in. Re-normalized server-side with normalizeRemoteUrl; anything that does not normalize (a filesystem path included) is stored as null. */
  repoIdentity?: InputMaybe<Scalars['String']['input']>;
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

export type RecordTelemetryHeartbeatInput = {
  /** Skill-usage events buffered locally. */
  bufferedEvents: Scalars['Int']['input'];
  /** Skill-usage outcomes buffered locally. */
  bufferedOutcomes: Scalars['Int']['input'];
  /** Token-usage records buffered locally. */
  bufferedTokenUsage: Scalars['Int']['input'];
  /** Trajectories buffered locally. */
  bufferedTrajectories: Scalars['Int']['input'];
  /** Records across the local dead-letter files. */
  deadLetterCount: Scalars['Int']['input'];
  /** How the hooks reached the session: repo, plugin-dir or marketplace. */
  deliveryLeg: Scalars['String']['input'];
  /** Opaque random machine id (max 64 chars), never a hostname. */
  machineId: Scalars['String']['input'];
  /** Operator-chosen machine label; opt-in. */
  machineLabel?: InputMaybe<Scalars['String']['input']>;
  /** Whether the marketplace plugin is installed; null = unknown. */
  marketplacePluginInstalled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Installed marketplace plugin version. */
  marketplacePluginVersion?: InputMaybe<Scalars['String']['input']>;
  /** Client-reported heartbeat timestamp. */
  occurredAt: Scalars['DateTime']['input'];
  /** Timestamp of the oldest locally buffered record. */
  oldestBufferedAt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Running payload version, or null for the repo leg. */
  pluginVersion?: InputMaybe<Scalars['String']['input']>;
  /** Git remote of the session's repository. The server re-normalizes it and stores null when it does not survive; absolute paths are rejected. */
  repoIdentity?: InputMaybe<Scalars['String']['input']>;
  /** Harness, e.g. claude-code. */
  source: Scalars['String']['input'];
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

export type RecordTokenUsageRowInput = {
  /** The agent account the turn was billed to, stamped by the hook at capture time. Null (or absent) leaves the row unattributed. Attribution never rejects a batch: an unusable account is ignored. */
  account?: InputMaybe<RecordTokenUsageAccountInput>;
  /** Cache-read tokens for the turn, when reported. */
  cacheReadTokens?: InputMaybe<Scalars['Float']['input']>;
  /** Cache-creation (cache-write) tokens for the turn, when reported. */
  cacheWriteTokens?: InputMaybe<Scalars['Float']['input']>;
  /** Dollar cost of the turn when the producer priced it. When null, the server estimates it at Anthropic list price if the request can be priced exactly. */
  costUsd?: InputMaybe<Scalars['Float']['input']>;
  /**
   * Working directory the harness reported.
   * @deprecated Absolute paths leak the home-directory layout and foreign repos now send null (child-repo-hook-telemetry-contract §3). Use repoIdentity.
   */
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
  /** Git remote of the repository the turn ran in. Re-normalized server-side with normalizeRemoteUrl; anything that does not normalize (a filesystem path included) is stored as null. Absent on older senders. */
  repoIdentity?: InputMaybe<Scalars['String']['input']>;
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

/** Percentage allocation among variations. */
export type RolloutFallthroughInput = {
  /** Ordered weighted buckets. Weights must sum to 100. */
  variations: Array<RolloutFallthroughBucketInput>;
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
/** One variation input. valueJson is JSON-serialized and must match kind. */
export type RolloutFlagVariationInput = {
  /** Optional human description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Optional display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** JSON-serialized variation value (must match the flag kind). */
  valueJson: Scalars['String']['input'];
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

export type SearchInput = {
  /** Max number of chunks to return (default 20). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Requested ranking: "hybrid" (default; vector and full-text merged by reciprocal rank fusion) or "semantic" (vector similarity only). The full-text fallback still applies when the embedder cannot answer. */
  mode?: InputMaybe<Scalars['String']['input']>;
  /** Number of ranked chunks to skip before returning `limit` (default 0). Pages are slices of one ranking of at most 100 candidates, so offsets past `total` return no chunks. */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Text query to search for. */
  query: Scalars['String']['input'];
};

export type SearchPlansInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Semantic search query (embedded for vector similarity) */
  query: Scalars['String']['input'];
};

export type SetBlogPostTagsInput = {
  postId: Scalars['ID']['input'];
  /** Slugs of existing tags (see upsertBlogTag). Replaces the post's whole tag set; an empty list removes every tag. */
  tagSlugs: Array<Scalars['String']['input']>;
};

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

export type TaskEmbeddingsByTaskInput = {
  /** Max rows to return (default and hard cap: 1000). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Rows to skip (pagination offset). */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Task id to list embeddings for */
  taskId: Scalars['ID']['input'];
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

/** A default agent. Backend and model are required together; effort may be null. */
export type UserPreferencesAgentInput = {
  /** Agent CLI driver id. */
  backend: Scalars['String']['input'];
  /** Reasoning effort level, or null for the backend's own default. */
  effort?: InputMaybe<Scalars['String']['input']>;
  /** Driver-specific model id. */
  model: Scalars['String']['input'];
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
export type WithdrawPlanMessageInput = {
  /** A PENDING message to withdraw. */
  id: Scalars['ID']['input'];
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

export type WorkSessionsByPlanInput = {
  /** Plan id to list sessions for */
  planId: Scalars['ID']['input'];
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
/** Who removed a worktree and how: the fields ot-worktree's destroy.sh writes to its local removal log. Every field is untrusted, optional and truncated server-side; a malformed value is dropped rather than failing the deregistration. */
export type WorktreeRemovalAuditInput = {
  /** Calling agent's session id when its harness exports one (Claude Code: CLAUDE_CODE_SESSION_ID). */
  agentSession?: InputMaybe<Scalars['String']['input']>;
  /** A few levels of "pid command" above the parent process, joined by " <- ". */
  ancestry?: InputMaybe<Scalars['String']['input']>;
  /** Branch the worktree had checked out. */
  branch?: InputMaybe<Scalars['String']['input']>;
  /** Command line of destroy.sh's parent process. */
  parent?: InputMaybe<Scalars['String']['input']>;
  /** destroy.sh process id on the client machine. */
  pid?: InputMaybe<Scalars['Int']['input']>;
  /** Parent process id of destroy.sh on the client machine. */
  ppid?: InputMaybe<Scalars['Int']['input']>;
  /** Outcome of destroy.sh's pre-removal active-run probe. */
  probe?: InputMaybe<Scalars['String']['input']>;
  /** destroy.sh's own result for the invocation, e.g. removed. */
  result?: InputMaybe<Scalars['String']['input']>;
  /** Client-side ISO-8601 timestamp of the removal. Ignored when unparseable. */
  ts?: InputMaybe<Scalars['String']['input']>;
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
