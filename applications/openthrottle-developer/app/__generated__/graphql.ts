/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type ActivityByDateInput = {
  /** Single date (YYYY-MM-DD). Provide exactly one of date or daysBack. */
  date?: string | null | undefined;
  /** Last N days (1-365). Provide exactly one of date or daysBack. */
  daysBack?: number | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
};

export type AddHookInput = {
  /** Anchor task the hook attaches to (task-level before/after). Omit or null for a plan-level hook (beforeAll/afterAll, or beforeEach/afterEach with scope 'each'). */
  anchorTaskId?: string | null | undefined;
  /** Optional hook task description (template source). */
  description?: string | null | undefined;
  /** Plan the hook belongs to */
  planId: string;
  /** Hook role: 'before' or 'after'. */
  role: string;
  /** Plan-level only: 'once' (beforeAll/afterAll) or 'each' (beforeEach/afterEach, expanded onto every task). Defaults to 'once'. Rejected for task-level hooks. */
  scope?: string | null | undefined;
  /** Skill slug when source is 'skill'; required in that case. */
  skillSlug?: string | null | undefined;
  /** Hook body source: 'template' (inline title/description) or 'skill' (runs skillSlug via the hooks runner). */
  source: string;
  /** Optional hook task title (template source). Defaults to a generated label. */
  title?: string | null | undefined;
};

export type AddPlanTagInput = {
  /** Plan to tag. */
  planId: string;
  /** Kebab-case tag slug from the caller's skill-tag vocabulary. */
  tag: string;
};

export type AddProjectSkillTagInput = {
  /** Project whose skill row to tag. Omit to target the dogfood monorepo project. */
  projectId?: string | null | undefined;
  /** Skill slug (project_skills.slug). */
  slug: string;
  /** Kebab-case domain tag from the caller's skill-tag vocabulary. Phase tags are rejected. */
  tag: string;
};

export type AddProjectTagInput = {
  /** Project to tag. */
  projectId: string;
  /** Kebab-case tag slug from the caller's skill-tag vocabulary. */
  tag: string;
};

export type AddSkillTagInput = {
  /** Vocabulary axis for the tag: "domain" (default) or "phase". */
  dimension?: string | null | undefined;
  /** Kebab-case tag slug to add (e.g. "pr-review"). */
  tag: string;
};

export type AddTaskTagInput = {
  /** Kebab-case tag slug from the caller's skill-tag vocabulary. */
  tag: string;
  /** Task to tag. */
  taskId: string;
};

/** Register a server-host folder as a workspace checkout. */
export type AddWorkspaceFolderInput = {
  /** Optional display name; defaults to the folder name. */
  displayName?: string | null | undefined;
  /** Absolute path on the server host. */
  path: string;
};

/** Input for semantic search over agent-asset (custom_prompt) embeddings. */
export type AgentAssetSearchInput = {
  /** Max number of assets to return (default 20, max 50). */
  limit?: number | null | undefined;
  /** Filter by project id (multi-repo scoping). */
  projectId?: string | null | undefined;
  /** Filter by prompt types (default: skills, rules, personas). Empty/null uses the default set. */
  promptTypes?: Array<CustomPromptType> | null | undefined;
  /** Text query to embed and search by vector similarity. */
  query: string;
};

export type AgentsRunChatTurnInput = {
  /** Opaque client thread id echoed on AgentsChatTurnResult.conversationId for correlation; omit for stateless turns. */
  conversationId?: string | null | undefined;
  /** User message text for this turn. */
  message: string;
  /** When true, persist the turn for an authenticated human JWT user. Omitted or false keeps stateless echo behavior. */
  persist?: boolean | null | undefined;
};

/** Optional filter: apply only to these local repository ids. Omit to apply to all linked repos. */
export type ApplyWorkspaceEditorConfigurationInput = {
  /** When set, only these repositories receive editor configuration. */
  repositoryIds?: Array<string> | null | undefined;
};

/** Derived lifecycle state of a blog post as the authoring surface shows it. LIVE is the only publicly visible state; SCHEDULED is PUBLISHED with a future publishedAt. */
export const BlogPostState = {
  Archived: 'ARCHIVED',
  Draft: 'DRAFT',
  Live: 'LIVE',
  Scheduled: 'SCHEDULED',
} as const;

export type BlogPostState = (typeof BlogPostState)[keyof typeof BlogPostState];
/** The kind of record a blog write referenced by slug that does not exist. */
export const BlogReferenceEntity = {
  Author: 'AUTHOR',
  Tag: 'TAG',
} as const;

export type BlogReferenceEntity =
  (typeof BlogReferenceEntity)[keyof typeof BlogReferenceEntity];
export type CancelPlanRunInput = {
  /** Plan id whose in-queue run-plan (Ralph) job should be cancelled */
  planId: string;
  /** Optional plan_runs id of a SCHEDULED run of this plan. When set, cancels only that run: its delayed job is removed and its row settles CANCELLED, with no effect on any other active run or the tasks; a SCHEDULED plan returns to PENDING. Already-settled runs are a no-op; a run that is QUEUED or IN_PROGRESS is rejected (omit planRunId to stop a live run). When omitted, the whole plan is cancelled as before. */
  planRunId?: string | null | undefined;
};

export type CleanQueueInput = {
  /** Must be true to confirm this destructive action. */
  confirm: boolean;
  /** Only remove jobs finished at least this many milliseconds ago (0 = any age). */
  graceMs?: number | null | undefined;
  /** Maximum number of jobs to remove (0 = no limit). */
  limit?: number | null | undefined;
  /** Queue name (e.g. plans). */
  queueName: string;
  /** Which finished jobs to remove: "completed" or "failed" only. */
  state: string;
};

/** Clone a git repository into the managed checkout root and register it. */
export type CloneRepositoryInput = {
  /** Git clone URL (https or ssh). Cloned with ambient host credentials (SSH agent / gh); OT stores no secrets. */
  gitUrl: string;
  /** Optional folder/display name; defaults to the repository name derived from the URL. */
  name?: string | null | undefined;
};

export type CodeSemanticSearchInput = {
  /** Max number of matches to return (default 10). */
  limit?: number | null | undefined;
  /** Natural-language query to embed and search by vector similarity. */
  query: string;
  /** Registered WorkspaceLocalRepository id to search within. */
  repositoryId: string;
};

export type ConnectMcpConnectorInput = {
  /** API token for api_token connectors; ignored for oauth. Never persisted raw — stored as a bcrypt hash + masked hint. */
  apiToken?: string | null | undefined;
  /** Catalog key of the connector to connect. */
  connectorKey: string;
  /** Optional label for the credential. */
  label?: string | null | undefined;
};

export type CreateBlogPostInput = {
  /** Slug of an existing author (see upsertBlogAuthor). Omit for no byline. */
  authorSlug?: string | null | undefined;
  bodyMarkdown: string;
  coverImageAlt?: string | null | undefined;
  coverImageUrl?: string | null | undefined;
  excerpt?: string | null | undefined;
  seoDescription?: string | null | undefined;
  seoTitle?: string | null | undefined;
  /** Lowercase letters, digits and single hyphens (^[a-z0-9]+(-[a-z0-9]+)*$), e.g. "my-first-post". */
  slug: string;
  title: string;
};

/** Input for creating a new custom prompt */
export type CreateCustomPromptInput = {
  content: string;
  description?: string | null | undefined;
  /** File path relative to workspace root for file system persistence */
  filePath?: string | null | undefined;
  labels?: Array<string>;
  projectId?: string | null | undefined;
  promptType: CustomPromptType;
  title: string;
  userId?: string | null | undefined;
  /** Write content to the file system at filePath if provided */
  writeToFileSystem?: boolean;
};

export type CreateNoteInput = {
  author?: string | null | undefined;
  content: string;
};

export type CreateProjectInput = {
  description?: string | null | undefined;
  name: string;
  /** NX project name (e.g. applications/openthrottle-server) */
  nxProjectName?: string | null | undefined;
};

export type CreateQueueInput = {
  /** Name of the queue to create. */
  name: string;
};

export type CreateRolloutFlagInput = {
  /** Description of what the flag gates. */
  description?: string | null | undefined;
  /** Master switch. Defaults to off. */
  enabled?: boolean;
  /** Fallthrough allocation. Omit for boolean defaults (100% on true). Required for non-boolean kinds. */
  fallthrough?: RolloutFallthroughInput | null | undefined;
  /** Unique flag key (kebab/dotted string). Must be unique. */
  key: string;
  /** Flag kind. Defaults to boolean with LD-like false/true variations. */
  kind?: RolloutFlagKind | null | undefined;
  /** Off / default variation index. Defaults to 0. */
  offVariation?: number | null | undefined;
  /** RBAC role names to target. Empty => enabled for everyone. */
  targetRoles?: Array<string>;
  /** Variations. Omit for boolean defaults [{false},{true}]. Required (≥2) for non-boolean kinds. */
  variations?: Array<RolloutFlagVariationInput> | null | undefined;
};

export type CreateScheduledAgentJobInputType = {
  /** 5- or 6-field cron pattern (may not fire every minute or sub-minute). Required when scheduleKind is cron (the default); ignored otherwise. */
  cronPattern?: string | null | undefined;
  /**
   * Legacy explicit process cwd for the agent CLI; omit for WORKSPACE_ROOT.
   * @deprecated Use repositoryCheckoutId to target a registered repository checkout; cwd is only consulted when no checkout is set.
   */
  cwd?: string | null | undefined;
  /** Agent driver id (antigravity | claude | codex | cursor | grok | opencode). */
  driverId: string;
  /** Whether the schedule starts enabled (default true). */
  enabled?: boolean | null | undefined;
  /** For scheduleKind interval: ms from the end of one run to the start of the next; at least 60000. */
  intervalMs?: number | null | undefined;
  /** Misfire policy for late fires: skip (default) or catch_up_once. */
  misfirePolicy?: string | null | undefined;
  /** How late (ms) a fire may start and still run; at least 60000. Omit for 10 minutes. */
  misfireThresholdMs?: number | null | undefined;
  /** Model preset; omit for the driver default. */
  model?: string | null | undefined;
  /** Human-friendly schedule name. */
  name: string;
  /** Prompt passed to the agent CLI. */
  prompt: string;
  /** Registered repository checkout to run in; must belong to the caller. Takes precedence over cwd. Omit for the legacy cwd / WORKSPACE_ROOT fallback. */
  repositoryCheckoutId?: string | null | undefined;
  /** For scheduleKind once: when to run, as ISO 8601 with an offset (e.g. 2026-11-03T09:00:00-08:00 or ...Z); must be in the future. */
  runAt?: string | null | undefined;
  /** How the schedule fires: cron (default), interval or once. */
  scheduleKind?: string | null | undefined;
  /** JSON AgentPromptSettings ({ endpoint?, worktree? }); no endpoint.apiKey. Omit for none. */
  settingsJson?: string | null | undefined;
  /** Per-run timeout override in ms; omit for the queue default. */
  timeoutMs?: number | null | undefined;
  /** IANA timezone; omit for UTC. */
  timezone?: string | null | undefined;
};

export type CreateServiceAccountCredentialInput = {
  expiresAt?: string | null | undefined;
  label?: string | null | undefined;
  serviceAccountId: string;
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
  conversationId: string;
};

export type DeleteTagActionRuleInput = {
  /** Rule to soft delete (its ledger rows are kept). */
  id: string;
};

export type DetachHookInput = {
  /** Hook task id to detach (delete) */
  hookTaskId: string;
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
export type EnqueuePlanRunInput = {
  /** REQUIRED git branch this run operates on. Captured on plan_runs.branch as run provenance (powers branch->PR mapping). Passed explicitly by callers (skills/UI may pre-fill a default from the worktree name / HEAD) and never inferred server-side; enqueue fails fast when missing or blank. */
  branch: string;
  /** Set true to run a SCHEDULED plan now: its scheduled run is cancelled and this run is enqueued in its place, in one transaction. Without it, enqueuing a plan that has a scheduled run fails with extensions.code PLAN_ALREADY_SCHEDULED (plus planRunId and scheduledFor). */
  cancelScheduled?: boolean | null | undefined;
  /** Optional registered checkout id (highest precedence). Resolved server-side to its filesystem path for this run; when set it overrides repositoryId and workingDirectory. */
  checkoutId?: string | null | undefined;
  /** Optional dedupe key passed to BullMQ as jobId. Re-enqueue with the same key returns the existing job id instead of creating a duplicate. */
  idempotencyKey?: string | null | undefined;
  /** Optional JSON override for job-run lifecycle hooks for this enqueue only ({ hooks: [...] }). When omitted, hooks are copied from the plan. Validated against repo paths when workingDirectory is set. */
  jobRunHooksJson?: string | null | undefined;
  /** Plan id to enqueue a run for */
  planId: string;
  /** Job priority (lower = higher priority). 1=interactive/UI, 10=normal (default), 100=batch/scheduled. Omit to use normal priority. */
  priority?: number | null | undefined;
  /** Optional Ralph / workflow-ralph runtime tuning (iterations, model, backend, etc.). When set, queued workers pass these to nested workflow-ralph; when omitted, defaults come from env and .workflow-ralph.json in the worktree cwd. */
  ralph?: RalphPlanRunTuningInput | null | undefined;
  /** Optional registered repository id. Resolved to the enqueuing user's single checkout of that repository (errors when there is no checkout, or when it is ambiguous). Used when checkoutId is omitted. */
  repositoryId?: string | null | undefined;
  /** Which runner executes the run: "ralph" (the default) or "ot-loop" (the per-task discipline of /ot-loop run as deterministic job code, with a fresh worker per task). Nullable + additive: omit to use the plan's stored runConfig runner, else Ralph. An unrecognized value is rejected. "ot-loop" is also rejected when the run has no worktree (disableWorktree) or when no validation command resolves (set otLoop.validationCommands on the plan, or commit .openthrottle/ot-loop.json). */
  runner?: string | null | undefined;
  /** Optional absolute path to a local project directory used as the working directory for this run. Escape hatch used only when checkoutId and repositoryId are omitted. When all three are omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side. */
  workingDirectory?: string | null | undefined;
};

export type ForceSettlePlanRunInput = {
  /** Plan-run row id to force-settle to STALE. Must be an IN_PROGRESS run that does not heartbeat; anything else is refused. */
  planRunId: string;
  /** Why the run is being settled, written to settledReason. Omit for a human's "contact lost"; an automated backstop (the Claude Code Stop janitor) names itself and its evidence. */
  reason?: string | null | undefined;
};

export type GetAgentConversationMessagesInput = {
  conversationId: string;
  /** Page size (default 100, max 500) */
  limit?: number | null | undefined;
  /** Offset for pagination */
  offset?: number | null | undefined;
};

export type GetPullInput = {
  /** Pull request number */
  number: number;
  /** Repository owner (e.g. GitHub username or org) */
  owner: string;
  /** Repository name */
  repo: string;
};

/** Which entity an id ref resolved to: a plan or a task. */
export const IdRefKind = {
  Plan: 'PLAN',
  Task: 'TASK',
} as const;

export type IdRefKind = (typeof IdRefKind)[keyof typeof IdRefKind];
export type LabelAgentTrajectoryInput = {
  /** Free-text failure category, for example wrong-file. Blank is stored as null. */
  failureType?: string | null | undefined;
  /** Free-text observation about the trajectory, at most 4000 characters. Blank is stored as null. */
  note?: string | null | undefined;
  /** Trajectory being labelled. */
  trajectoryId: string;
  /** The verdict: pass or fail. Re-labelling replaces your own earlier label. */
  verdict: string;
};

export type ListAgentConversationsInput = {
  /** Page size (default 20, max 100) */
  limit?: number | null | undefined;
  /** Offset for pagination */
  offset?: number | null | undefined;
  /** Filter by status: active or archived (default active) */
  status?: string | null | undefined;
};

/** Input for listing custom prompts with optional filters */
export type ListCustomPromptsInput = {
  /** Include soft-deleted prompts */
  includeDeleted?: boolean;
  /** Filter by labels (matches any) */
  labels?: Array<string> | null | undefined;
  /** Filter by project ID */
  projectId?: string | null | undefined;
  /** Filter by prompt type */
  promptType?: CustomPromptType | null | undefined;
  /** Search by title (case-insensitive partial match) */
  search?: string | null | undefined;
  /** Filter by user ID */
  userId?: string | null | undefined;
};

export type ListPlansByStatusInput = {
  /** Filter by author or assignee (any match). Empty means no assignee filter. */
  assignees?: Array<string | null | undefined> | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  project?: string | null | undefined;
  projectId?: string | null | undefined;
  /** Sort by "created" or "updated" */
  sortBy?: string | null | undefined;
  /** Sort order "asc" or "desc" */
  sortOrder?: string | null | undefined;
  /**
   * Filter by plan status. Empty or including "all" means no status filter. Values must be canonical PlanTaskStatus labels (uppercase, e.g. IN_PROGRESS).
   * @deprecated Use statusesEnum (typed PlanTaskStatus) for an introspectable, validated filter. String statuses are still accepted (case-insensitive) and merged with statusesEnum.
   */
  statuses?: Array<string | null | undefined> | null | undefined;
  /** Filter by plan status using the typed PlanTaskStatus enum (preferred over statuses). Merged with any values passed in statuses. */
  statusesEnum?: Array<PlanTaskStatus | null | undefined> | null | undefined;
  /** Filter plans whose title contains this substring (case-insensitive) */
  titleSubstring?: string | null | undefined;
};

export type ListPullsInput = {
  /** Filter by base branch */
  base?: string | null | undefined;
  /** Filter by merged (true/false); omit for no filter */
  merged?: boolean | null | undefined;
  /** Repository owner (e.g. GitHub username or org) */
  owner: string;
  /** Repository name */
  repo: string;
  /** Filter by state: open, closed, or all */
  state?: string | null | undefined;
};

export type LoginInput = {
  /** User email */
  email: string;
  /** User password */
  password: string;
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
  author?: string | null | undefined;
  /** Message text. Must not be blank. */
  body: string;
  /** STEER or QUEUE for a live run (held PENDING for the next run when none is live); FEEDBACK for post-run reflection. */
  kind: PlanMessageKind;
  /** Plan to post the message to. */
  planId: string;
  /** Task the author was looking at, for context. It does not decide delivery. */
  taskId?: string | null | undefined;
};

export type PromoteTaskToPlanInput = {
  /** Optional idempotency key: re-submitting the same key enqueues at most one promotion job. Letters, digits, and ._:- only. */
  idempotencyKey?: string | null | undefined;
  /** Id of the task to promote into a new plan */
  taskId: string;
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
  checkoutIds: Array<string>;
};

export type PublishBlogPostInput = {
  id: string;
  /** When the post goes live. Omit (or null) to publish now; a future date schedules the post — it is PUBLISHED but not publicly visible until then. */
  publishedAt?: string | null | undefined;
};

export type QueueControlInput = {
  /** Queue name (e.g. plans). */
  queueName: string;
};

export type QueueDetailsInput = {
  /** Sort jobs ascending by timestamp. */
  asc?: boolean | null | undefined;
  /** Max jobs to return. Omit or 0 to skip loading jobs. */
  limit?: number | null | undefined;
  /** Queue name (e.g. plans). */
  name: string;
  /** Offset for job pagination. */
  offset?: number | null | undefined;
  /** Job states to include (e.g. waiting, active, completed, failed, delayed). Defaults to all if empty. */
  states?: Array<string> | null | undefined;
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
  after?: string | null | undefined;
  jobId: string;
  /** Optional severity filter; empty/omitted = all levels. */
  levelIn?: Array<QueueJobLogLevel> | null | undefined;
  /** Max events; server-capped (default 200, hard max 1000). */
  limit?: number | null | undefined;
  queueName: string;
  /** ISO-8601 lower bound (inclusive). Mutually exclusive with `after`. */
  since?: string | null | undefined;
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
  backend?: string | null | undefined;
  /** Opt out of the worktree default and run in the base checkout. Omit to get the worktree OpenThrottle derives for the plan; only an explicit true disables it. */
  disableWorktree?: boolean | null | undefined;
  /** Reasoning-effort level for the run: "low", "medium", "high", "extraHigh", "max", or "ultra" (the same vocabulary as the chat composer's reasoning). Nullable + additive: omit to leave the run's effort unchanged. An unrecognized level is rejected. Recorded on the run's runConfigSnapshot and forwarded to the agent CLI, where each backend maps it to its own flag (claude --effort, codex -c model_reasoning_effort=, grok --reasoning-effort, opencode --variant), clamping to its accepted set; a backend with no reasoning knob (antigravity, cursor) ignores it. */
  effort?: string | null | undefined;
  /** Per-iteration timeout in seconds (positive integer). */
  iterationTimeoutSeconds?: number | null | undefined;
  /** Max Ralph iterations for this run (positive integer). */
  iterations?: number | null | undefined;
  /** Model id passed to workflow-ralph --model. */
  model?: string | null | undefined;
  /** Nx project name for workflow-ralph --project. */
  project?: string | null | undefined;
  /** Prompt profile path (e.g. /agents-ralph) for --prompt. */
  prompt?: string | null | undefined;
  /** Repo-relative or absolute path for --prompt-file (layer-1 prompt file). */
  promptFile?: string | null | undefined;
  /** Whether to pass --debug / --verbose to nested workflow-ralph. */
  ralphDebugCli?: RalphNestedDebugCli | null | undefined;
  /** Cursor-only: pass --skip-worktree-setup to cursor-agent. */
  skipWorktreeSetup?: boolean | null | undefined;
  /** Worktree name for this run. When omitted, OpenThrottle derives plan-<short plan id> and creates that worktree itself; pass disableWorktree to run without one. */
  worktree?: string | null | undefined;
  /** Cursor-only: branch/ref for --worktree-base. */
  worktreeBase?: string | null | undefined;
};

/** Re-run inspection on an owned checkout. */
export type RefreshCheckoutInput = {
  id: string;
};

export type RegisterInput = {
  /** User email (must be unique) */
  email: string;
  /** GitHub username for display; defaults to email local part if omitted */
  githubUsername?: string | null | undefined;
  /** User password (stored hashed with bcrypt) */
  password: string;
};

export type RemovePlanTagInput = {
  /** Plan to remove the tag from. */
  planId: string;
  /** Tag slug to remove. */
  tag: string;
};

export type RemoveProjectSkillTagInput = {
  /** Project whose skill row to untag. Omit to target the dogfood monorepo project. */
  projectId?: string | null | undefined;
  /** Skill slug (project_skills.slug). */
  slug: string;
  /** Tag slug to remove. */
  tag: string;
};

export type RemoveProjectTagInput = {
  /** Project to remove the tag from. */
  projectId: string;
  /** Tag slug to remove. */
  tag: string;
};

export type RemoveSkillTagInput = {
  /** Tag slug to remove. */
  tag: string;
};

export type RemoveTaskTagInput = {
  /** Tag slug to remove. */
  tag: string;
  /** Task to remove the tag from. */
  taskId: string;
};

export type RenameSkillTagInput = {
  /** Existing tag slug to rename. */
  from: string;
  /** New kebab-case tag slug. */
  to: string;
};

export type ReschedulePlanRunInput = {
  /** Plan id the scheduled run belongs to. */
  planId: string;
  /** plan_runs id of the SCHEDULED run to move. Any other status is rejected. */
  planRunId: string;
  /** The new absolute instant the run fires at: in the future and within 30 days (SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS), the same rule as schedulePlanRun. */
  scheduledFor: string;
};

export type RetryJobInput = {
  /** BullMQ job id to retry. */
  jobId: string;
  /** Queue name (e.g. plans). */
  queueName: string;
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
  variation: number;
  /** Integer percent weight 0–100. All weights must sum to 100. */
  weight: number;
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
  description?: string | null | undefined;
  /** Optional display name. */
  name?: string | null | undefined;
  /** JSON-serialized variation value (must match the flag kind). */
  valueJson: string;
};

export type SchedulePlanRunInput = {
  /** REQUIRED git branch this run operates on. Captured on plan_runs.branch as run provenance (powers branch->PR mapping). Passed explicitly by callers (skills/UI may pre-fill a default from the worktree name / HEAD) and never inferred server-side; enqueue fails fast when missing or blank. */
  branch: string;
  /** Optional registered checkout id (highest precedence). Resolved server-side to its filesystem path for this run; when set it overrides repositoryId and workingDirectory. */
  checkoutId?: string | null | undefined;
  /** Optional dedupe key passed to BullMQ as jobId. Re-enqueue with the same key returns the existing job id instead of creating a duplicate. */
  idempotencyKey?: string | null | undefined;
  /** Optional JSON override for job-run lifecycle hooks for this enqueue only ({ hooks: [...] }). When omitted, hooks are copied from the plan. Validated against repo paths when workingDirectory is set. */
  jobRunHooksJson?: string | null | undefined;
  /** Plan id to enqueue a run for */
  planId: string;
  /** Job priority (lower = higher priority). 1=interactive/UI, 10=normal (default), 100=batch/scheduled. Omit to use normal priority. */
  priority?: number | null | undefined;
  /** Optional Ralph / workflow-ralph runtime tuning (iterations, model, backend, etc.). When set, queued workers pass these to nested workflow-ralph; when omitted, defaults come from env and .workflow-ralph.json in the worktree cwd. */
  ralph?: RalphPlanRunTuningInput | null | undefined;
  /** Set true to reschedule a SCHEDULED plan: its scheduled run is cancelled and this one recorded in its place, in one transaction; the plan stays SCHEDULED. Without it, scheduling a plan that already has a scheduled run fails with extensions.code PLAN_ALREADY_SCHEDULED. Only PENDING and BACKLOG plans can be scheduled otherwise (PLAN_ACTIVE for QUEUED / IN_PROGRESS, PLAN_NOT_SCHEDULABLE for BLOCKED and terminal plans). */
  replaceScheduled?: boolean | null | undefined;
  /** Optional registered repository id. Resolved to the enqueuing user's single checkout of that repository (errors when there is no checkout, or when it is ambiguous). Used when checkoutId is omitted. */
  repositoryId?: string | null | undefined;
  /** Which runner executes the run: "ralph" (the default) or "ot-loop" (the per-task discipline of /ot-loop run as deterministic job code, with a fresh worker per task). Nullable + additive: omit to use the plan's stored runConfig runner, else Ralph. An unrecognized value is rejected. "ot-loop" is also rejected when the run has no worktree (disableWorktree) or when no validation command resolves (set otLoop.validationCommands on the plan, or commit .openthrottle/ot-loop.json). */
  runner?: string | null | undefined;
  /** REQUIRED absolute instant the run fires at (an ISO-8601 DateTime; send UTC or an explicit offset). Must be strictly in the future and no more than 30 days from now (SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS); the server rejects anything else. */
  scheduledFor: string;
  /** Optional absolute path to a local project directory used as the working directory for this run. Escape hatch used only when checkoutId and repositoryId are omitted. When all three are omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side. */
  workingDirectory?: string | null | undefined;
};

export type SearchInput = {
  /** Max number of chunks to return (default 20). */
  limit?: number | null | undefined;
  /** Requested ranking: "hybrid" (default; vector and full-text merged by reciprocal rank fusion) or "semantic" (vector similarity only). The full-text fallback still applies when the embedder cannot answer. */
  mode?: string | null | undefined;
  /** Number of ranked chunks to skip before returning `limit` (default 0). Pages are slices of one ranking of at most 100 candidates, so offsets past `total` return no chunks. */
  offset?: number | null | undefined;
  /** Text query to search for. */
  query: string;
};

export type SetBlogPostTagsInput = {
  postId: string;
  /** Slugs of existing tags (see upsertBlogTag). Replaces the post's whole tag set; an empty list removes every tag. */
  tagSlugs: Array<string>;
};

export type SetMcpConnectorEnabledInput = {
  connectorKey: string;
  enabled: boolean;
};

export type SetPlanStatusInput = {
  /** Plan id to update status for */
  planId: string;
  /**
   * New plan status — one of: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, PROMOTED, QUEUED, SCHEDULED, SKIPPED. Normalized to uppercase. Provide this OR statusEnum.
   * @deprecated Use statusEnum (typed PlanTaskStatus). String status is still accepted (normalized to uppercase) and validated against the canonical set.
   */
  status?: string | null | undefined;
  /** New plan status as the typed PlanTaskStatus enum (preferred over status). Provide this OR status. */
  statusEnum?: PlanTaskStatus | null | undefined;
};

export type SetScheduledAgentJobEnabledInputType = {
  enabled: boolean;
  id: string;
};

export type SkillAvailabilityRuleInput = {
  /** Environment qualifier: omit/null for all environments, or "ci" | "interactive" | "ralph" to scope the rule. */
  environment?: string | null | undefined;
  /** Skill slugs to allow (rung 1 exceptions). */
  slugAllow?: Array<string>;
  /** Skill slugs to deny (rung 1 exceptions). */
  slugDeny?: Array<string>;
  /** Tags to allow (rung 2). Must be in the caller's skill-tag vocabulary. */
  tagAllow?: Array<string>;
  /** Tags to deny (rung 2). Must be in the caller's skill-tag vocabulary. */
  tagDeny?: Array<string>;
};

export type StartConversationStreamInput = {
  /** Backend to stream from: "openai" (default) or an allowlisted agent CLI (e.g. "cursor"). Omit for openai. */
  backend?: string | null | undefined;
  /** OpenAI-compatible base URL of a discovered local endpoint, e.g. http://localhost:11434/v1. Required for the openai backend. */
  baseUrl?: string | null | undefined;
  /** Existing conversation to continue; omit to start a new conversation. */
  conversationId?: string | null | undefined;
  /** Workspace-relative POSIX paths @-mentioned in the message (parsed client-side). Nullable + additive. The paths also travel inline in the message as @path tokens; the server additionally injects them as structured turn context ("Referenced files") so the agent treats them as first-class references. */
  fileMentions?: Array<string> | null | undefined;
  /** User message text for this turn. */
  message: string;
  /** Model id to complete with. Required for the openai backend; optional model override for CLI backends. */
  modelId?: string | null | undefined;
  /** Permission mode for an agent backend: "supervised", "autoAcceptEdits", or "fullAccess". Nullable + additive. Honored: each CLI backend maps it to concrete permission/sandbox flags in its argv/config builder (a backend that cannot route it ignores it). */
  permissionMode?: string | null | undefined;
  /** Whether to persist this turn. True (default, or omitted) saves the conversation + messages as today. False runs a "Private mode" turn: the stream is ephemeral — no conversation row is created and no messages are written. A Private turn carries no server-side history (single-turn context) and CLI backends run a fresh, non-resumed session. */
  persist?: boolean | null | undefined;
  /** Persona to steer the turn; CLI backends inject it as a system prompt. */
  personaId?: string | null | undefined;
  /** Reasoning-effort level for the turn: "low", "medium", "high", "extraHigh", "max", or "ultra". Nullable + additive. Honored: each backend that exposes a reasoning knob maps it to its own vocabulary (claude --effort, grok --reasoning-effort, codex -c model_reasoning_effort=, opencode --variant, cursor model-string [effort=…], openai reasoning_effort), clamping to its accepted set. */
  reasoning?: string | null | undefined;
  /**
   * Registered WorkspaceLocalRepository to run a CLI backend in. Required for CLI backends in production (the server resolves + ownership-checks the path).
   * @deprecated Use repositoryIds, which carries the primary checkout plus any additional context directories. A lone repositoryId is still honored as a one-element list.
   */
  repositoryId?: string | null | undefined;
  /** Registered WorkspaceLocalRepositories for a CLI backend, PRIMARY FIRST. Index 0 becomes the process working directory; the remainder are granted to the CLI as additional context directories (repeated --add-dir) by the backends that support them. Every id is ownership-checked independently, and the list is capped server-side per driver. */
  repositoryIds?: Array<string> | null | undefined;
  /** Service tier for the turn: "standard" or "fast". Nullable + additive. Honored only by backends that can route by tier (cursor-agent, via the model-string [fast=…] suffix); backends without a tier concept ignore it. */
  serviceTier?: string | null | undefined;
};

export type TasksByPlanIdInput = {
  /** Plan id to list tasks for */
  planId: string;
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
export type UpdateAgentConversationTitleInput = {
  conversationId: string;
  title: string;
};

/** Partial update. Omitted fields are unchanged; null clears a nullable field. Status and publishedAt change only through publish / unpublish / archive. */
export type UpdateBlogPostInput = {
  /** Slug of an existing author; null removes the byline. */
  authorSlug?: string | null | undefined;
  /** Must not be null. */
  bodyMarkdown?: string | null | undefined;
  coverImageAlt?: string | null | undefined;
  coverImageUrl?: string | null | undefined;
  excerpt?: string | null | undefined;
  /** The post's updatedAt as last read. When set and the post has changed since, nothing is written and BlogPostStaleWriteError is returned. Omit to skip the check. */
  expectedUpdatedAt?: string | null | undefined;
  id: string;
  seoDescription?: string | null | undefined;
  seoTitle?: string | null | undefined;
  /** Lowercase letters, digits and single hyphens (^[a-z0-9]+(-[a-z0-9]+)*$), e.g. "my-first-post". Must not be null. */
  slug?: string | null | undefined;
  /** Must not be null. */
  title?: string | null | undefined;
};

/** Input for updating an existing custom prompt */
export type UpdateCustomPromptInput = {
  content?: string | null | undefined;
  description?: string | null | undefined;
  filePath?: string | null | undefined;
  /** Custom prompt id to update */
  id: string;
  labels?: Array<string> | null | undefined;
  projectId?: string | null | undefined;
  promptType?: CustomPromptType | null | undefined;
  title?: string | null | undefined;
  userId?: string | null | undefined;
  /** Write content to the file system at filePath if provided */
  writeToFileSystem?: boolean;
};

export type UpdateNoteInput = {
  author?: string | null | undefined;
  content?: string | null | undefined;
  /** Note id to update */
  id: string;
};

export type UpdatePlanInput = {
  assignee?: string | null | undefined;
  author?: string | null | undefined;
  category?: string | null | undefined;
  description?: string | null | undefined;
  /** Plan id to update */
  id: string;
  /** JSON string of job-run lifecycle hooks ({ hooks: [...] }). Pass null to clear; omit to leave unchanged. */
  jobRunHooksJson?: string | null | undefined;
  project?: string | null | undefined;
  /** Optional. Project UUID (FK to projects table). Pass null to clear; omit to leave unchanged. */
  projectId?: string | null | undefined;
  /** JSON string of workflow-ralph run configuration (PlanRunConfigStorage v1). Pass null to reset to default v1 shell; omit to leave unchanged. */
  runConfigJson?: string | null | undefined;
  status?: string | null | undefined;
  summary?: string | null | undefined;
  title?: string | null | undefined;
};

export type UpdateProjectInput = {
  description?: string | null | undefined;
  /** Project id to update */
  id: string;
  name?: string | null | undefined;
  /** NX project name (e.g. applications/openthrottle-server) */
  nxProjectName?: string | null | undefined;
};

/** Edit an owned repository's name, default branch, and/or project link. Omitted fields are left unchanged. */
export type UpdateRepositoryInput = {
  /** New default branch; omit to leave unchanged. */
  defaultBranch?: string | null | undefined;
  /** Opt this user's checkouts of the repository into (or out of) foreign-workspace skill injection; omit to leave unchanged. */
  foreignSkillInjectionEnabled?: boolean | null | undefined;
  /** Repository id. */
  id: string;
  /** New display name; omit to leave unchanged. */
  name?: string | null | undefined;
  /** OpenThrottle project to link, or null to clear; omit to leave unchanged. */
  projectId?: string | null | undefined;
  /** Turn the ot-worktree skill overlay on or off for this user's checkouts of the repository (default on; off falls back to the server's SSOT worktree scripts); omit to leave unchanged. Only meaningful for foreign checkouts. */
  worktreeSkillOverlayEnabled?: boolean | null | undefined;
};

export type UpdateRolloutFlagInput = {
  /** Description. Pass null to clear, omit to leave unchanged. */
  description?: string | null | undefined;
  /** Master switch. Omit to leave unchanged. */
  enabled?: boolean | null | undefined;
  /** Fallthrough allocation. Omit to leave unchanged. */
  fallthrough?: RolloutFallthroughInput | null | undefined;
  /** Flag id to update */
  id: string;
  /** Flag key. Omit to leave unchanged; must stay unique. */
  key?: string | null | undefined;
  /** Flag kind. Omit to leave unchanged; changing kind requires matching variations. */
  kind?: RolloutFlagKind | null | undefined;
  /** Off variation index. Omit to leave unchanged. */
  offVariation?: number | null | undefined;
  /** RBAC role names to target. Omit to leave unchanged. */
  targetRoles?: Array<string> | null | undefined;
  /** Variations. Omit to leave unchanged. */
  variations?: Array<RolloutFlagVariationInput> | null | undefined;
};

export type UpdateScheduledAgentJobInputType = {
  cronPattern?: string | null | undefined;
  /** @deprecated Use repositoryCheckoutId to target a registered repository checkout; cwd is only consulted when no checkout is set. */
  cwd?: string | null | undefined;
  driverId?: string | null | undefined;
  /** Schedule to update. */
  id: string;
  /** For scheduleKind interval: ms from the end of one run to the start of the next; at least 60000. */
  intervalMs?: number | null | undefined;
  /** Misfire policy for late fires: skip or catch_up_once. */
  misfirePolicy?: string | null | undefined;
  /** How late (ms) a fire may start and still run; at least 60000. */
  misfireThresholdMs?: number | null | undefined;
  model?: string | null | undefined;
  name?: string | null | undefined;
  prompt?: string | null | undefined;
  /** Registered repository checkout to run in; must belong to the caller. Takes precedence over cwd. */
  repositoryCheckoutId?: string | null | undefined;
  /** For scheduleKind once: when to run, as ISO 8601 with an offset; a changed time must be in the future. */
  runAt?: string | null | undefined;
  /** How the schedule fires: cron, interval or once. Omit to keep the current kind. */
  scheduleKind?: string | null | undefined;
  /** JSON AgentPromptSettings; no endpoint.apiKey. */
  settingsJson?: string | null | undefined;
  timeoutMs?: number | null | undefined;
  timezone?: string | null | undefined;
};

export type UpdateTaskInput = {
  assignee?: string | null | undefined;
  category?: string | null | undefined;
  description?: string | null | undefined;
  /** Task id to update */
  id: string;
  planId?: string | null | undefined;
  project?: string | null | undefined;
  /** Optional. Project UUID. Pass null to clear; omit to leave unchanged. */
  projectId?: string | null | undefined;
  /** JSON string of requirements array */
  requirements?: string | null | undefined;
  /** Optional. Execution order within plan (gap-based insert, e.g. 1500 between 1000 and 2000). */
  sortOrder?: number | null | undefined;
  status?: string | null | undefined;
  summary?: string | null | undefined;
  title?: string | null | undefined;
  /** Optional. Coarse concurrency layer within the plan: tasks sharing a wave may be worked concurrently. Never 0; pass null to clear (unassigned); omit to leave unchanged. Not consumed for execution yet. */
  wave?: number | null | undefined;
};

/** A partial update: an omitted field is left unchanged and an explicit null clears it. */
export type UpdateUserPreferencesInput = {
  defaultAgent?: UserPreferencesAgentInput | null | undefined;
  defaultEditor?: WorkspaceEditorId | null | undefined;
};

export type UpdateWorkspaceProfileInput = {
  contactDisplayName?: string | null | undefined;
  contactEmail?: string | null | undefined;
  enabledEditors?: Array<WorkspaceEditorId> | null | undefined;
};

export type UpsertTagActionRuleInput = {
  /** JSON-encoded action payload (validated per action type). */
  actionPayloadJson: string;
  /** Action type: "inject-task" or "availability-exception". */
  actionType: string;
  enabled?: boolean | null | undefined;
  /** Optional environment qualifier: ci | interactive | ralph. */
  environment?: string | null | undefined;
  /** When present, updates the existing rule (must belong to the caller). */
  id?: string | null | undefined;
  /** Optional project scope; null matches every project. */
  projectId?: string | null | undefined;
  /** Optional plan-status qualifier (e.g. PENDING). */
  status?: string | null | undefined;
  /** Tags that must ALL be present (AND); empty matches every plan. */
  tagAll?: Array<string>;
  /** Human-readable label for the rule (required, non-empty). */
  title: string;
};

/** A default agent. Backend and model are required together; effort may be null. */
export type UserPreferencesAgentInput = {
  /** Agent CLI driver id. */
  backend: string;
  /** Reasoning effort level, or null for the backend's own default. */
  effort?: string | null | undefined;
  /** Driver-specific model id. */
  model: string;
};

export type WithdrawPlanMessageInput = {
  /** A PENDING message to withdraw. */
  id: string;
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
  backend?: string | null | undefined;
  /** Filter to a single repository checkout (UUID). */
  checkoutId?: string | null | undefined;
  /** Start of the window (inclusive). */
  from: string;
  /** Filter to a single git branch. Also scopes the grilling lane, which is how unattributed grilling events (no `userId`) are narrowed. */
  gitBranch?: string | null | undefined;
  /** How rows are grouped into lanes. Defaults to BY_PLAN. */
  grouping?: TimelineLaneGrouping | null | undefined;
  /** Marker kinds to include. Omit or pass null for all kinds; an empty list returns no markers. */
  markerKinds?: Array<TimelineMarkerKind> | null | undefined;
  /** Filter to a single plan (UUID). */
  planId?: string | null | undefined;
  /** Span kinds to include. Omit or pass null for all kinds; an empty list returns no spans. */
  spanKinds?: Array<TimelineSpanKind> | null | undefined;
  /** End of the window (exclusive). Must be after `from`, and no more than 90 days later. */
  to: string;
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
export type BackgroundActivityFieldsFragment = {
  done: number;
  etaSeconds: number | null;
  id: string;
  label: string;
  startedAt: string;
  status: string;
  total: number | null;
};

export type HealthCardFragment = {
  api: string;
  database: string;
  redis: string;
  websocket: string;
};

type NotificationFields_DebugNotification_Fragment = {
  dataJson: string | null;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

type NotificationFields_PlanEnqueuedNotification_Fragment = {
  planId: string;
  queuePosition: number;
  queueTotal: number;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

type NotificationFields_PlanStatusChangedNotification_Fragment = {
  planId: string;
  status: string;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

type NotificationFields_PlanUpdatedNotification_Fragment = {
  planId: string;
  taskId: string | null;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

type NotificationFields_PlanWaitingForWorktreeNotification_Fragment = {
  planId: string;
  retryDelayMs: number;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

type NotificationFields_QueueJobCompletedNotification_Fragment = {
  jobType: string;
  taskId: string | null;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

type NotificationFields_ScheduledRunFailedNotification_Fragment = {
  reason: string;
  runCount: number;
  runId: string | null;
  scheduledAgentJobId: string;
  scheduleName: string;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

type NotificationFields_SystemAlertNotification_Fragment = {
  code: string | null;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

type NotificationFields_TaskCompletedNotification_Fragment = {
  planId: string;
  taskId: string | null;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

type NotificationFields_TaskStatusChangedNotification_Fragment = {
  planId: string;
  status: string;
  taskId: string | null;
  event: string;
  link: string | null;
  message: string | null;
  severity: string | null;
  timestamp: string;
};

export type NotificationFieldsFragment =
  | NotificationFields_DebugNotification_Fragment
  | NotificationFields_PlanEnqueuedNotification_Fragment
  | NotificationFields_PlanStatusChangedNotification_Fragment
  | NotificationFields_PlanUpdatedNotification_Fragment
  | NotificationFields_PlanWaitingForWorktreeNotification_Fragment
  | NotificationFields_QueueJobCompletedNotification_Fragment
  | NotificationFields_ScheduledRunFailedNotification_Fragment
  | NotificationFields_SystemAlertNotification_Fragment
  | NotificationFields_TaskCompletedNotification_Fragment
  | NotificationFields_TaskStatusChangedNotification_Fragment;

export type RootMetricsFragment = {
  cpuSystemMs: number;
  cpuUserMs: number;
  externalMb: number;
  heapTotalMb: number;
  heapUsedMb: number;
  rssMb: number;
};

export type GetMyPermissionsQueryVariables = Exact<{ [key: string]: never }>;

export type GetMyPermissionsQuery = { myPermissions: Array<string> };

export type GetMyUserQueryVariables = Exact<{ [key: string]: never }>;

export type GetMyUserQuery = {
  me: {
    createdAt: string;
    disabledAt: string | null;
    email: string | null;
    githubUsername: string;
    id: string;
    updatedAt: string;
  } | null;
};

export type GetMyDefaultEditorQueryVariables = Exact<{ [key: string]: never }>;

export type GetMyDefaultEditorQuery = {
  userPreferences: { defaultEditor: WorkspaceEditorId | null };
};

export type EvaluateFeatureFlagsQueryVariables = Exact<{
  anonymousId?: string | null | undefined;
  applicationKey?: string | null | undefined;
}>;

export type EvaluateFeatureFlagsQuery = {
  evaluateFeatureFlags: Array<{
    enabled: boolean;
    key: string;
    kind: RolloutFlagKind;
    reason: RolloutEvaluationReason;
    valueJson: string;
    variationIndex: number;
  }>;
};

export type GetRootHealthQueryVariables = Exact<{ [key: string]: never }>;

export type GetRootHealthQuery = {
  backgroundActivities: Array<{
    done: number;
    etaSeconds: number | null;
    id: string;
    label: string;
    startedAt: string;
    status: string;
    total: number | null;
  }>;
  serverHealth: {
    api: string;
    database: string;
    redis: string;
    websocket: string;
  };
};

export type GetRootMetricsQueryVariables = Exact<{ [key: string]: never }>;

export type GetRootMetricsQuery = {
  serverMetrics: {
    cpuSystemMs: number;
    cpuUserMs: number;
    externalMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    rssMb: number;
  };
};

export type ListAgentConversationsQueryVariables = Exact<{
  input?: ListAgentConversationsInput | null | undefined;
}>;

export type ListAgentConversationsQuery = {
  listAgentConversations: {
    totalCount: number;
    conversations: Array<{
      id: string;
      status: string;
      title: string | null;
      updatedAt: string;
    }>;
  };
};

export type DeleteAgentConversationMutationVariables = Exact<{
  input: DeleteAgentConversationInput;
}>;

export type DeleteAgentConversationMutation = {
  deleteAgentConversation: {
    id: string;
    status: string;
    title: string | null;
    updatedAt: string;
  };
};

export type UpdateAgentConversationTitleMutationVariables = Exact<{
  input: UpdateAgentConversationTitleInput;
}>;

export type UpdateAgentConversationTitleMutation = {
  updateAgentConversationTitle: {
    id: string;
    status: string;
    title: string | null;
    updatedAt: string;
  };
};

export type GetAgentConversationMessagesQueryVariables = Exact<{
  input: GetAgentConversationMessagesInput;
}>;

export type GetAgentConversationMessagesQuery = {
  getAgentConversationMessages: {
    totalCount: number;
    messages: Array<{
      content: string;
      createdAt: string;
      id: string;
      role: string;
      routingConfidence: number | null;
      routingReason: string | null;
      toolMetadataJson: string | null;
    }>;
  };
};

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;

export type LoginMutation = { login: { accessToken: string } };

export type LogoutMutationVariables = Exact<{ [key: string]: never }>;

export type LogoutMutation = { signout: { success: boolean } };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;

export type RegisterMutation = {
  register: { accessToken: string; email: string; id: string };
};

export type SendAgentMessageMutationVariables = Exact<{
  input: AgentsRunChatTurnInput;
}>;

export type SendAgentMessageMutation = {
  agentsRunChatTurn: {
    assistantText: string | null;
    conversationId: string | null;
    errorMessage: string | null;
    mcpTool: string | null;
    readOnlyAgentsChat: boolean;
    routingConfidence: number | null;
    routingReason: string | null;
    structuredPayloadJson: string | null;
    toolMetadataJson: string | null;
  };
};

export type NotificationsSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type NotificationsSubscription = {
  notifications:
    | {
        dataJson: string | null;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      }
    | {
        planId: string;
        queuePosition: number;
        queueTotal: number;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      }
    | {
        planId: string;
        status: string;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      }
    | {
        planId: string;
        taskId: string | null;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      }
    | {
        planId: string;
        retryDelayMs: number;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      }
    | {
        jobType: string;
        taskId: string | null;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      }
    | {
        reason: string;
        runCount: number;
        runId: string | null;
        scheduledAgentJobId: string;
        scheduleName: string;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      }
    | {
        code: string | null;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      }
    | {
        planId: string;
        taskId: string | null;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      }
    | {
        planId: string;
        status: string;
        taskId: string | null;
        event: string;
        link: string | null;
        message: string | null;
        severity: string | null;
        timestamp: string;
      };
};

export type DiscoverAgentClisQueryVariables = Exact<{ [key: string]: never }>;

export type DiscoverAgentClisQuery = {
  discoverAgentClis: {
    totalCount: number;
    agents: Array<{
      backend: string;
      chatCapable: boolean;
      enabled: boolean;
      label: string;
      supportsCustomBaseUrl: boolean;
      version: string | null;
      authState: { status: string };
      capabilities: { approvals: boolean; editApprovals: boolean };
      modelOptions: Array<{
        enabled: boolean;
        favorite: boolean;
        model: string;
      }>;
    }>;
  };
};

export type DiscoverLocalModelsQueryVariables = Exact<{ [key: string]: never }>;

export type DiscoverLocalModelsQuery = {
  discoverLocalModels: {
    totalCount: number;
    endpoints: Array<{
      baseUrl: string;
      host: string;
      models: Array<string>;
      provider: string | null;
    }>;
  };
};

export type PersonaPromptsQueryVariables = Exact<{ [key: string]: never }>;

export type PersonaPromptsQuery = {
  customPrompts: Array<{
    description: string | null;
    id: string;
    title: string;
  }>;
};

export type WorkspaceLocalRepositoriesQueryVariables = Exact<{
  [key: string]: never;
}>;

export type WorkspaceLocalRepositoriesQuery = {
  workspaceLocalRepositories: Array<{
    displayName: string;
    filesystemPath: string;
    gitCurrentBranch: string | null;
    gitDefaultBranch: string | null;
    gitRemoteUrl: string | null;
    id: string;
    kind: string;
    project: { name: string } | null;
  }>;
};

export type StartConversationStreamMutationVariables = Exact<{
  input: StartConversationStreamInput;
}>;

export type StartConversationStreamMutation = {
  startConversationStream: {
    assistantMessageId: string | null;
    conversationId: string | null;
    errorMessage: string | null;
    userMessageId: string | null;
  };
};

export type CancelConversationStreamMutationVariables = Exact<{
  conversationId: string;
}>;

export type CancelConversationStreamMutation = {
  cancelConversationStream: boolean;
};

export type RespondToConversationPermissionMutationVariables = Exact<{
  conversationId: string;
  optionId?: string | null | undefined;
  requestId: string;
}>;

export type RespondToConversationPermissionMutation = {
  respondToConversationPermission: boolean;
};

export type ConversationStreamChunkAddedSubscriptionVariables = Exact<{
  conversationId: string;
}>;

export type ConversationStreamChunkAddedSubscription = {
  conversationStreamChunkAdded: {
    conversationId: string;
    delta: string;
    done: boolean;
    error: string | null;
    id: string;
    kind: string;
    messageId: string;
    metadataJson: string | null;
    sortOrder: number;
  };
};

export type StartTranscriptionStreamMutationVariables = Exact<{
  [key: string]: never;
}>;

export type StartTranscriptionStreamMutation = {
  startTranscriptionStream: {
    errorMessage: string | null;
    sessionId: string | null;
  };
};

export type SendTranscriptionAudioChunkMutationVariables = Exact<{
  audioBase64: string;
  sessionId: string;
  sortOrder: number;
}>;

export type SendTranscriptionAudioChunkMutation = {
  sendTranscriptionAudioChunk: boolean;
};

export type StopTranscriptionStreamMutationVariables = Exact<{
  sessionId: string;
}>;

export type StopTranscriptionStreamMutation = {
  stopTranscriptionStream: boolean;
};

export type TranscriptionStreamChunkAddedSubscriptionVariables = Exact<{
  sessionId: string;
}>;

export type TranscriptionStreamChunkAddedSubscription = {
  transcriptionStreamChunkAdded: {
    done: boolean;
    error: string | null;
    sessionId: string;
    sortOrder: number;
    transcript: string;
  };
};

export type HomeDefaultAgentQueryVariables = Exact<{ [key: string]: never }>;

export type HomeDefaultAgentQuery = {
  userPreferences: {
    defaultAgent: {
      backend: string;
      effort: string | null;
      model: string;
    } | null;
  };
};

export type SearchAgentAssetsQueryVariables = Exact<{
  input: AgentAssetSearchInput;
}>;

export type SearchAgentAssetsQuery = {
  searchAgentAssets: {
    mode: string;
    reason: string | null;
    chunks: Array<{
      content: string;
      customPromptId: string;
      description: string | null;
      filePath: string | null;
      id: string;
      labels: Array<string>;
      projectId: string | null;
      promptType: CustomPromptType;
      similarity: number;
      title: string;
    }>;
  };
};

export type SignoutMutationVariables = Exact<{ [key: string]: never }>;

export type SignoutMutation = { signout: { success: boolean } };

export type MintSubscriptionTokenMutationVariables = Exact<{
  [key: string]: never;
}>;

export type MintSubscriptionTokenMutation = { mintSubscriptionToken: string };

export type BlogPostEditorPostFragment = {
  bodyMarkdown: string;
  coverImageAlt: string | null;
  coverImageUrl: string | null;
  excerpt: string | null;
  id: string;
  lastEditedBy: string | null;
  publishedAt: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  slug: string;
  state: BlogPostState;
  title: string;
  updatedAt: string;
  author: { displayName: string; slug: string } | null;
  tags: Array<{ name: string; slug: string }>;
};

export type GetBlogPostEditorQueryVariables = Exact<{
  id: string;
}>;

export type GetBlogPostEditorQuery = {
  blogAdminAuthors: Array<{ displayName: string; slug: string }>;
  blogAdminPost:
    | {
        __typename: 'BlogPostAdminObject';
        bodyMarkdown: string;
        coverImageAlt: string | null;
        coverImageUrl: string | null;
        excerpt: string | null;
        id: string;
        lastEditedBy: string | null;
        publishedAt: string | null;
        seoDescription: string | null;
        seoTitle: string | null;
        slug: string;
        state: BlogPostState;
        title: string;
        updatedAt: string;
        author: { displayName: string; slug: string } | null;
        tags: Array<{ name: string; slug: string }>;
      }
    | { __typename: 'BlogPostNotFoundError'; message: string };
  blogAdminTags: Array<{ name: string; slug: string }>;
};

export type UpdateBlogPostEditorMutationVariables = Exact<{
  input: UpdateBlogPostInput;
}>;

export type UpdateBlogPostEditorMutation = {
  updateBlogPost:
    | { __typename: 'BlogCoverAltRequiredError'; message: string }
    | { __typename: 'BlogPostAdminObject'; id: string; updatedAt: string }
    | { __typename: 'BlogPostNotFoundError'; message: string }
    | { __typename: 'BlogPostPublishPermissionRequiredError'; message: string }
    | {
        __typename: 'BlogPostStaleWriteError';
        currentUpdatedAt: string;
        message: string;
      }
    | {
        __typename: 'BlogReferenceNotFoundError';
        entity: BlogReferenceEntity;
        key: string;
        message: string;
      }
    | { __typename: 'BlogSlugConflictError'; message: string; slug: string };
};

export type SetBlogPostEditorTagsMutationVariables = Exact<{
  input: SetBlogPostTagsInput;
}>;

export type SetBlogPostEditorTagsMutation = {
  setBlogPostTags:
    | { __typename: 'BlogPostAdminObject'; id: string; updatedAt: string }
    | { __typename: 'BlogPostNotFoundError'; message: string }
    | { __typename: 'BlogPostPublishPermissionRequiredError'; message: string }
    | {
        __typename: 'BlogReferenceNotFoundError';
        entity: BlogReferenceEntity;
        key: string;
        message: string;
      };
};

export type PublishBlogPostEditorMutationVariables = Exact<{
  input: PublishBlogPostInput;
}>;

export type PublishBlogPostEditorMutation = {
  publishBlogPost:
    | {
        __typename: 'BlogPostAdminObject';
        id: string;
        publishedAt: string | null;
        state: BlogPostState;
        updatedAt: string;
      }
    | { __typename: 'BlogPostNotFoundError'; message: string };
};

export type UnpublishBlogPostEditorMutationVariables = Exact<{
  id: string;
}>;

export type UnpublishBlogPostEditorMutation = {
  unpublishBlogPost:
    | {
        __typename: 'BlogPostAdminObject';
        id: string;
        state: BlogPostState;
        updatedAt: string;
      }
    | { __typename: 'BlogPostNotFoundError'; message: string };
};

export type ArchiveBlogPostEditorMutationVariables = Exact<{
  id: string;
}>;

export type ArchiveBlogPostEditorMutation = {
  archiveBlogPost:
    | {
        __typename: 'BlogPostAdminObject';
        id: string;
        state: BlogPostState;
        updatedAt: string;
      }
    | { __typename: 'BlogPostNotFoundError'; message: string };
};

export type BlogPostListRowFragment = {
  id: string;
  lastEditedBy: string | null;
  publishedAt: string | null;
  slug: string;
  state: BlogPostState;
  title: string;
  updatedAt: string;
  author: { displayName: string; slug: string } | null;
};

export type GetBlogAdminPostsQueryVariables = Exact<{
  after?: string | null | undefined;
  first: number;
  search?: string | null | undefined;
  state?: Array<BlogPostState> | BlogPostState | null | undefined;
}>;

export type GetBlogAdminPostsQuery = {
  blogAdminPosts: {
    endCursor: string | null;
    hasNextPage: boolean;
    items: Array<{
      id: string;
      lastEditedBy: string | null;
      publishedAt: string | null;
      slug: string;
      state: BlogPostState;
      title: string;
      updatedAt: string;
      author: { displayName: string; slug: string } | null;
    }>;
  };
};

export type CreateBlogPostDraftMutationVariables = Exact<{
  input: CreateBlogPostInput;
}>;

export type CreateBlogPostDraftMutation = {
  createBlogPost:
    | { __typename: 'BlogCoverAltRequiredError'; message: string }
    | { __typename: 'BlogPostAdminObject'; id: string }
    | {
        __typename: 'BlogReferenceNotFoundError';
        entity: BlogReferenceEntity;
        key: string;
        message: string;
      }
    | { __typename: 'BlogSlugConflictError'; message: string; slug: string };
};

export type DashboardActivityCardFragment = {
  hasNext: boolean;
  totalCount: number;
  commits: Array<{
    createdAt: string;
    id: string;
    message: string | null;
    planId: string;
    planTitle: string;
    repo: string;
    sha: string;
    taskId: string | null;
    taskTitle: string | null;
  }>;
  outputChunks: Array<{
    content: string;
    createdAt: string;
    id: string;
    iteration: number | null;
    planId: string;
    planTitle: string;
  }>;
  tasksUpdated: Array<{
    id: string;
    planId: string;
    planTitle: string;
    status: string;
    title: string;
    updatedAt: string;
  }>;
};

export type DashboardQueueStatsCardFragment = {
  activeCount: number;
  completedCount: number;
  delayedCount: number;
  failedCount: number;
  name: string;
  waitingCount: number;
};

export type DashboardDailyStatsCardFragment = {
  date: string;
  plansCompleted: number;
  plansCreated: number;
  plansUpdated: number;
  tasksCompleted: number;
  tasksCreated: number;
  tasksUpdated: number;
};

export type GetDashboardQueryVariables = Exact<{
  input: ActivityByDateInput;
  start: string;
  end: string;
}>;

export type GetDashboardQuery = {
  activityByDate: {
    hasNext: boolean;
    totalCount: number;
    commits: Array<{
      createdAt: string;
      id: string;
      message: string | null;
      planId: string;
      planTitle: string;
      repo: string;
      sha: string;
      taskId: string | null;
      taskTitle: string | null;
    }>;
    outputChunks: Array<{
      content: string;
      createdAt: string;
      id: string;
      iteration: number | null;
      planId: string;
      planTitle: string;
    }>;
    tasksUpdated: Array<{
      id: string;
      planId: string;
      planTitle: string;
      status: string;
      title: string;
      updatedAt: string;
    }>;
  };
  dailyStatsRange: {
    items: Array<{
      date: string;
      plansCompleted: number;
      plansCreated: number;
      plansUpdated: number;
      tasksCompleted: number;
      tasksCreated: number;
      tasksUpdated: number;
    }>;
  };
  queues: Array<{
    activeCount: number;
    completedCount: number;
    delayedCount: number;
    failedCount: number;
    name: string;
    waitingCount: number;
  }>;
};

export type GetDashboardOnboardingQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetDashboardOnboardingQuery = {
  githubTokenConfigured: boolean;
  discoverAgentClis: { totalCount: number };
  planCountsByStatus: Array<{ count: number; status: string }>;
  workspaceLocalRepositories: Array<{ id: string }>;
};

export type GetDashboardGithubStatsQueryVariables = Exact<{
  owner: string;
  repo: string;
}>;

export type GetDashboardGithubStatsQuery = {
  closedPrCountByAuthor: Array<{ author: string; openCount: number }>;
  openPrCountByAuthor: Array<{ author: string; openCount: number }>;
  prTimeInStateSummary: Array<{
    avgDaysInState: number | null;
    count: number;
    state: string;
  }>;
};

export type TriggerNotificationMutationVariables = Exact<{
  [key: string]: never;
}>;

export type TriggerNotificationMutation = {
  triggerWebsocketNotification: boolean;
};

export type EvalRunListRowFragment = {
  authMode: string;
  createdAt: string;
  datasetId: string;
  datasetVersion: number;
  driver: string;
  effort: string | null;
  finishedAt: string | null;
  id: string;
  k: number;
  model: string | null;
  promptSha: string | null;
  skillSha: string | null;
  startedAt: string | null;
  status: string;
};

export type EvalsIndexRepositoriesQueryVariables = Exact<{
  [key: string]: never;
}>;

export type EvalsIndexRepositoriesQuery = {
  workspaceRepositories: Array<{ id: string; name: string }>;
};

export type EvalsIndexDatasetsQueryVariables = Exact<{
  repositoryId: string;
}>;

export type EvalsIndexDatasetsQuery = {
  evalDatasets: Array<{
    createdAt: string;
    id: string;
    name: string;
    target: string;
    version: number;
  }>;
};

export type EvalsIndexRunsQueryVariables = Exact<{
  datasetId: string;
}>;

export type EvalsIndexRunsQuery = {
  evalRuns: Array<{
    authMode: string;
    createdAt: string;
    datasetId: string;
    datasetVersion: number;
    driver: string;
    effort: string | null;
    finishedAt: string | null;
    id: string;
    k: number;
    model: string | null;
    promptSha: string | null;
    skillSha: string | null;
    startedAt: string | null;
    status: string;
  }>;
};

export type EvalRunComparisonRouteQueryVariables = Exact<{
  baseRunId: string;
  candidateRunId: string;
}>;

export type EvalRunComparisonRouteQuery = {
  evalRunComparison: {
    improvedCaseIds: Array<string>;
    regressedCaseIds: Array<string>;
    sharedCases: number;
    base: {
      datasetName: string;
      cases: Array<{
        attemptsCounted: number;
        attemptsPassed: number;
        caseId: string;
        passed: boolean | null;
        split: string;
      }>;
      graders: Array<{
        calibrationStatus: string | null;
        counts: boolean;
        graderId: string;
        graderKind: string;
        graderVersion: string;
        judgeModel: string | null;
        judgeModelVersion: string | null;
        kappa: number | null;
        kappaCiHigh: number | null;
        kappaCiLow: number | null;
      }>;
      numbers: {
        casesAtK: number;
        casesCounted: number;
        costPerSuccessUsd: number | null;
        detectionFloor: number | null;
        passAtK: number | null;
        passHatK: number | null;
        passRate: number | null;
        totalCostUsd: number | null;
        trialsCounted: number;
        trialsExcluded: number;
        trialsPassed: number;
        excluded: {
          errored: number;
          gradeError: number;
          noCountedGrade: number;
          usageLimited: number;
        };
        judgeAgreement: {
          graderId: string;
          graderVersion: string;
          kappa: number;
          kappaCiHigh: number | null;
          kappaCiLow: number | null;
          status: string;
        } | null;
        passRateCi: { confidence: number; lower: number; upper: number } | null;
      };
      run: {
        authMode: string;
        budgetTokens: number | null;
        budgetUsd: number | null;
        createdAt: string;
        datasetId: string;
        datasetVersion: number;
        driver: string;
        effort: string | null;
        finishedAt: string | null;
        id: string;
        k: number;
        model: string | null;
        promptSha: string | null;
        skillSha: string | null;
        startedAt: string | null;
        status: string;
      };
    };
    candidate: {
      datasetName: string;
      cases: Array<{
        attemptsCounted: number;
        attemptsPassed: number;
        caseId: string;
        passed: boolean | null;
        split: string;
      }>;
      graders: Array<{
        calibrationStatus: string | null;
        counts: boolean;
        graderId: string;
        graderKind: string;
        graderVersion: string;
        judgeModel: string | null;
        judgeModelVersion: string | null;
        kappa: number | null;
        kappaCiHigh: number | null;
        kappaCiLow: number | null;
      }>;
      numbers: {
        casesAtK: number;
        casesCounted: number;
        costPerSuccessUsd: number | null;
        detectionFloor: number | null;
        passAtK: number | null;
        passHatK: number | null;
        passRate: number | null;
        totalCostUsd: number | null;
        trialsCounted: number;
        trialsExcluded: number;
        trialsPassed: number;
        excluded: {
          errored: number;
          gradeError: number;
          noCountedGrade: number;
          usageLimited: number;
        };
        judgeAgreement: {
          graderId: string;
          graderVersion: string;
          kappa: number;
          kappaCiHigh: number | null;
          kappaCiLow: number | null;
          status: string;
        } | null;
        passRateCi: { confidence: number; lower: number; upper: number } | null;
      };
      run: {
        authMode: string;
        budgetTokens: number | null;
        budgetUsd: number | null;
        createdAt: string;
        datasetId: string;
        datasetVersion: number;
        driver: string;
        effort: string | null;
        finishedAt: string | null;
        id: string;
        k: number;
        model: string | null;
        promptSha: string | null;
        skillSha: string | null;
        startedAt: string | null;
        status: string;
      };
    };
    mcnemar: { b: number; c: number; method: string; pValue: number } | null;
    warnings: Array<{ code: string; message: string }>;
  };
};

export type EvalRunReportFieldsFragment = {
  datasetName: string;
  cases: Array<{
    attemptsCounted: number;
    attemptsPassed: number;
    caseId: string;
    passed: boolean | null;
    split: string;
  }>;
  graders: Array<{
    calibrationStatus: string | null;
    counts: boolean;
    graderId: string;
    graderKind: string;
    graderVersion: string;
    judgeModel: string | null;
    judgeModelVersion: string | null;
    kappa: number | null;
    kappaCiHigh: number | null;
    kappaCiLow: number | null;
  }>;
  numbers: {
    casesAtK: number;
    casesCounted: number;
    costPerSuccessUsd: number | null;
    detectionFloor: number | null;
    passAtK: number | null;
    passHatK: number | null;
    passRate: number | null;
    totalCostUsd: number | null;
    trialsCounted: number;
    trialsExcluded: number;
    trialsPassed: number;
    excluded: {
      errored: number;
      gradeError: number;
      noCountedGrade: number;
      usageLimited: number;
    };
    judgeAgreement: {
      graderId: string;
      graderVersion: string;
      kappa: number;
      kappaCiHigh: number | null;
      kappaCiLow: number | null;
      status: string;
    } | null;
    passRateCi: { confidence: number; lower: number; upper: number } | null;
  };
  run: {
    authMode: string;
    budgetTokens: number | null;
    budgetUsd: number | null;
    createdAt: string;
    datasetId: string;
    datasetVersion: number;
    driver: string;
    effort: string | null;
    finishedAt: string | null;
    id: string;
    k: number;
    model: string | null;
    promptSha: string | null;
    skillSha: string | null;
    startedAt: string | null;
    status: string;
  };
};

export type EvalRunReportRouteQueryVariables = Exact<{
  runId: string;
}>;

export type EvalRunReportRouteQuery = {
  evalRunReport: {
    datasetName: string;
    cases: Array<{
      attemptsCounted: number;
      attemptsPassed: number;
      caseId: string;
      passed: boolean | null;
      split: string;
    }>;
    graders: Array<{
      calibrationStatus: string | null;
      counts: boolean;
      graderId: string;
      graderKind: string;
      graderVersion: string;
      judgeModel: string | null;
      judgeModelVersion: string | null;
      kappa: number | null;
      kappaCiHigh: number | null;
      kappaCiLow: number | null;
    }>;
    numbers: {
      casesAtK: number;
      casesCounted: number;
      costPerSuccessUsd: number | null;
      detectionFloor: number | null;
      passAtK: number | null;
      passHatK: number | null;
      passRate: number | null;
      totalCostUsd: number | null;
      trialsCounted: number;
      trialsExcluded: number;
      trialsPassed: number;
      excluded: {
        errored: number;
        gradeError: number;
        noCountedGrade: number;
        usageLimited: number;
      };
      judgeAgreement: {
        graderId: string;
        graderVersion: string;
        kappa: number;
        kappaCiHigh: number | null;
        kappaCiLow: number | null;
        status: string;
      } | null;
      passRateCi: { confidence: number; lower: number; upper: number } | null;
    };
    run: {
      authMode: string;
      budgetTokens: number | null;
      budgetUsd: number | null;
      createdAt: string;
      datasetId: string;
      datasetVersion: number;
      driver: string;
      effort: string | null;
      finishedAt: string | null;
      id: string;
      k: number;
      model: string | null;
      promptSha: string | null;
      skillSha: string | null;
      startedAt: string | null;
      status: string;
    };
  };
};

export type EvalRunReportSiblingsQueryVariables = Exact<{
  datasetId: string;
}>;

export type EvalRunReportSiblingsQuery = {
  evalRuns: Array<{
    authMode: string;
    createdAt: string;
    datasetId: string;
    datasetVersion: number;
    driver: string;
    effort: string | null;
    finishedAt: string | null;
    id: string;
    k: number;
    model: string | null;
    promptSha: string | null;
    skillSha: string | null;
    startedAt: string | null;
    status: string;
  }>;
};

export type GeneratorDetailCardFragment = {
  description: string;
  name: string;
  schemaJson: string | null;
};

export type GetGeneratorByNameQueryVariables = Exact<{
  name: string;
}>;

export type GetGeneratorByNameQuery = {
  generator: {
    description: string;
    name: string;
    schemaJson: string | null;
  } | null;
};

export type GeneratorCardFragment = { description: string; name: string };

export type GetGeneratorsQueryVariables = Exact<{ [key: string]: never }>;

export type GetGeneratorsQuery = {
  generators: Array<{ description: string; name: string }>;
};

export type CodeIndexStatusQueryVariables = Exact<{
  repositoryId: string;
}>;

export type CodeIndexStatusQuery = {
  codeIndexStatus: {
    indexedChunks: number;
    repositoryId: string;
    status: string;
  };
};

export type CodeSemanticSearchQueryVariables = Exact<{
  input: CodeSemanticSearchInput;
}>;

export type CodeSemanticSearchQuery = {
  codeSemanticSearch: {
    available: boolean;
    matches: Array<{
      content: string;
      endLine: number;
      path: string;
      score: number;
      startLine: number;
    }>;
  };
};

export type IndexCodeRepositoryMutationVariables = Exact<{
  repositoryId: string;
}>;

export type IndexCodeRepositoryMutation = {
  indexCodeRepository: { repositoryId: string; status: string };
};

export type GetNoteByIdQueryVariables = Exact<{
  id: string;
}>;

export type GetNoteByIdQuery = {
  note: {
    author: string | null;
    content: string;
    createdAt: string;
    id: string;
    updatedAt: string;
  } | null;
};

export type UpdateNoteMutationVariables = Exact<{
  input: UpdateNoteInput;
}>;

export type UpdateNoteMutation = {
  updateNote: {
    author: string | null;
    content: string;
    createdAt: string;
    id: string;
    updatedAt: string;
  } | null;
};

export type NoteCardFragment = {
  author: string | null;
  content: string;
  createdAt: string;
  id: string;
  updatedAt: string;
};

export type GetNotesQueryVariables = Exact<{ [key: string]: never }>;

export type GetNotesQuery = {
  notes: Array<{
    author: string | null;
    content: string;
    createdAt: string;
    id: string;
    updatedAt: string;
  }>;
};

export type CreateNoteMutationVariables = Exact<{
  input: CreateNoteInput;
}>;

export type CreateNoteMutation = {
  createNote: {
    author: string | null;
    content: string;
    createdAt: string;
    id: string;
    updatedAt: string;
  };
};

export type HookTaskFragment = {
  hookRole: string | null;
  hookScope: string | null;
  hookSource: string | null;
  id: string;
  skillSlug: string | null;
  status: string;
  title: string;
};

export type PlanTaskRowFragment = {
  assignee: string | null;
  category: string | null;
  createdAt: string;
  description: string | null;
  hookRole: string | null;
  id: string;
  planId: string;
  requirementsJson: string;
  sortOrder: number;
  status: string;
  summary: string | null;
  title: string;
  updatedAt: string;
  wave: number | null;
  projectRelation: { id: string; name: string } | null;
};

export type ProjectDetailsFragment = { id: string; name: string };

export type PlanTagChipFragment = {
  confidence: number | null;
  dimension: string;
  id: string;
  source: string;
  tag: string;
};

export type PlanDetailsFragment = {
  assignee: string | null;
  author: string;
  category: string;
  createdAt: string;
  description: string | null;
  id: string;
  jobRunHooksJson: string;
  project: string | null;
  projectId: string | null;
  runConfigJson: string;
  runnableTaskCount: number;
  scheduledRunAt: string | null;
  scheduledRunId: string | null;
  status: string;
  summary: string | null;
  title: string;
  updatedAt: string;
  afterHooks: Array<{
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    skillSlug: string | null;
    status: string;
    title: string;
  }>;
  beforeHooks: Array<{
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    skillSlug: string | null;
    status: string;
    title: string;
  }>;
  projectRelation: { id: string; name: string } | null;
  tags: Array<{
    confidence: number | null;
    dimension: string;
    id: string;
    source: string;
    tag: string;
  }>;
};

export type GetPlanByIdQueryVariables = Exact<{
  id: string;
}>;

export type GetPlanByIdQuery = {
  plan: {
    assignee: string | null;
    author: string;
    category: string;
    createdAt: string;
    description: string | null;
    id: string;
    jobRunHooksJson: string;
    project: string | null;
    projectId: string | null;
    runConfigJson: string;
    runnableTaskCount: number;
    scheduledRunAt: string | null;
    scheduledRunId: string | null;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    afterHooks: Array<{
      hookRole: string | null;
      hookScope: string | null;
      hookSource: string | null;
      id: string;
      skillSlug: string | null;
      status: string;
      title: string;
    }>;
    beforeHooks: Array<{
      hookRole: string | null;
      hookScope: string | null;
      hookSource: string | null;
      id: string;
      skillSlug: string | null;
      status: string;
      title: string;
    }>;
    projectRelation: { id: string; name: string } | null;
    tags: Array<{
      confidence: number | null;
      dimension: string;
      id: string;
      source: string;
      tag: string;
    }>;
  } | null;
};

export type GetTasksByPlanIdQueryVariables = Exact<{
  input: TasksByPlanIdInput;
}>;

export type GetTasksByPlanIdQuery = {
  tasksByPlanId: Array<{
    assignee: string | null;
    category: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    id: string;
    planId: string;
    requirementsJson: string;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
    projectRelation: { id: string; name: string } | null;
  }>;
};

export type PlanDetailEnqueuePlanRunMutationVariables = Exact<{
  input: EnqueuePlanRunInput;
}>;

export type PlanDetailEnqueuePlanRunMutation = {
  enqueuePlanRun: {
    executionBackend: string;
    jobId: string;
    planId: string;
    queuePosition: number;
    queueTotal: number;
  };
};

export type PlanDetailSchedulePlanRunMutationVariables = Exact<{
  input: SchedulePlanRunInput;
}>;

export type PlanDetailSchedulePlanRunMutation = {
  schedulePlanRun: {
    executionBackend: string;
    jobId: string;
    planId: string;
    planRunId: string;
    scheduledFor: string;
  };
};

export type PlanDetailReschedulePlanRunMutationVariables = Exact<{
  input: ReschedulePlanRunInput;
}>;

export type PlanDetailReschedulePlanRunMutation = {
  reschedulePlanRun: {
    jobId: string;
    planId: string;
    planRunId: string;
    scheduledFor: string;
  };
};

export type PlanDetailEvaluatePlanRulesMutationVariables = Exact<{
  planId: string;
}>;

export type PlanDetailEvaluatePlanRulesMutation = {
  evaluatePlanRules: { enqueued: boolean; planId: string; triggerKind: string };
};

export type PlanDetailCancelPlanRunMutationVariables = Exact<{
  input: CancelPlanRunInput;
}>;

export type PlanDetailCancelPlanRunMutation = {
  cancelPlanRun: {
    activeJobIdsCouldNotCancel: Array<string>;
    cancelRequested: boolean;
    noMatchingJob: boolean;
    outcome: string;
    planId: string;
    planStatusAfter: string | null;
    removedJobIds: Array<string>;
    signaledActiveRunToStop: boolean;
  };
};

export type PlanDetailForceSettlePlanRunMutationVariables = Exact<{
  input: ForceSettlePlanRunInput;
}>;

export type PlanDetailForceSettlePlanRunMutation = {
  forceSettlePlanRun: {
    heartbeatExpected: boolean;
    id: string;
    isStale: boolean;
    status: string;
  } | null;
};

export type PlanDetailSetPlanStatusMutationVariables = Exact<{
  input: SetPlanStatusInput;
}>;

export type PlanDetailSetPlanStatusMutation = {
  setPlanStatus: {
    id: string;
    status: string;
    title: string;
    updatedAt: string;
  } | null;
};

export type PlanDetailUpdateTaskMutationVariables = Exact<{
  input: UpdateTaskInput;
}>;

export type PlanDetailUpdateTaskMutation = {
  updateTask: {
    assignee: string | null;
    category: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    id: string;
    planId: string;
    requirementsJson: string;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
    projectRelation: { id: string; name: string } | null;
  } | null;
};

export type PlanDetailUpdatePlanJobRunHooksMutationVariables = Exact<{
  input: UpdatePlanInput;
}>;

export type PlanDetailUpdatePlanJobRunHooksMutation = {
  updatePlan: { id: string; jobRunHooksJson: string; updatedAt: string } | null;
};

export type PlanDetailRunConfigQueryVariables = Exact<{
  id: string;
}>;

export type PlanDetailRunConfigQuery = {
  plan: { id: string; runConfigJson: string } | null;
};

export type PlanDetailUpdatePlanRunConfigMutationVariables = Exact<{
  input: UpdatePlanInput;
}>;

export type PlanDetailUpdatePlanRunConfigMutation = {
  updatePlan: { id: string; runConfigJson: string; updatedAt: string } | null;
};

export type PlanRunConfigRepositoryFieldsFragment = {
  defaultBranch: string | null;
  id: string;
  name: string;
  normalizedRemoteUrl: string | null;
  projectId: string | null;
  checkouts: Array<{
    displayName: string;
    filesystemPath: string;
    id: string;
    kind: string;
    managed: boolean;
    inspection: {
      git: { currentBranch: string | null; defaultBranch: string | null };
    } | null;
  }>;
};

export type PlanDetailWorkspaceEditorsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type PlanDetailWorkspaceEditorsQuery = {
  workspaceSettings: { profile: { enabledEditors: Array<WorkspaceEditorId> } };
};

export type PlanDetailCriticalQueryVariables = Exact<{
  planId: string;
}>;

export type PlanDetailCriticalQuery = {
  plan: {
    assignee: string | null;
    author: string;
    category: string;
    createdAt: string;
    description: string | null;
    id: string;
    jobRunHooksJson: string;
    project: string | null;
    projectId: string | null;
    runConfigJson: string;
    runnableTaskCount: number;
    scheduledRunAt: string | null;
    scheduledRunId: string | null;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    afterHooks: Array<{
      hookRole: string | null;
      hookScope: string | null;
      hookSource: string | null;
      id: string;
      skillSlug: string | null;
      status: string;
      title: string;
    }>;
    beforeHooks: Array<{
      hookRole: string | null;
      hookScope: string | null;
      hookSource: string | null;
      id: string;
      skillSlug: string | null;
      status: string;
      title: string;
    }>;
    projectRelation: { id: string; name: string } | null;
    tags: Array<{
      confidence: number | null;
      dimension: string;
      id: string;
      source: string;
      tag: string;
    }>;
  } | null;
  tasksByPlanId: Array<{
    assignee: string | null;
    category: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    id: string;
    planId: string;
    requirementsJson: string;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
    projectRelation: { id: string; name: string } | null;
  }>;
};

export type PlanDetailWorkspaceRepositoriesQueryVariables = Exact<{
  [key: string]: never;
}>;

export type PlanDetailWorkspaceRepositoriesQuery = {
  workspaceRepositories: Array<{
    defaultBranch: string | null;
    id: string;
    name: string;
    normalizedRemoteUrl: string | null;
    projectId: string | null;
    checkouts: Array<{
      displayName: string;
      filesystemPath: string;
      id: string;
      kind: string;
      managed: boolean;
      inspection: {
        git: { currentBranch: string | null; defaultBranch: string | null };
      } | null;
    }>;
  }>;
};

export type PlanDetailOutputChunksQueryVariables = Exact<{
  planId: string;
}>;

export type PlanDetailOutputChunksQuery = {
  planOutputStreamChunks: Array<{
    content: string;
    createdAt: string;
    id: string;
    iteration: number | null;
    kind: string | null;
    planId: string;
    taskId: string | null;
  }>;
};

export type PlanDetailRunHistoryQueryVariables = Exact<{
  planId: string;
}>;

export type PlanDetailRunHistoryQuery = {
  metrics: {
    recentPlanRunsMetrics: Array<{
      executionBackend: string | null;
      finishedOn: number | null;
      jobId: string;
      taskRunMetrics: { atEnd: { rssMb: number } } | null;
    }>;
  };
  planRunsByPlanId: Array<{
    branch: string | null;
    bullmqJobId: string | null;
    createdAt: string;
    executionBackend: string;
    heartbeatExpected: boolean;
    id: string;
    isStale: boolean;
    lastHeartbeatAt: string | null;
    model: string | null;
    resumeOfRunId: string | null;
    runConfigSnapshotJson: string | null;
    runKind: string;
    scheduledFor: string | null;
    settledReason: string | null;
    status: string;
    usageLimitResetsAt: string | null;
    checkout: {
      displayName: string;
      filesystemPath: string;
      kind: string;
    } | null;
    pullRequest: {
      number: number;
      repo: string;
      state: string | null;
      url: string;
    } | null;
  }>;
};

export type PlanDetailLedgerQueryVariables = Exact<{
  planId: string;
}>;

export type PlanDetailLedgerQuery = {
  ruleApplications: Array<{
    createdAt: string;
    detailsJson: string | null;
    id: string;
    planId: string;
    ruleId: string;
    state: string;
    taskId: string | null;
  }>;
  workArtifactsByPlan: {
    totalCount: number;
    artifacts: Array<{
      createdAt: string;
      externalKey: string;
      id: string;
      lifecycle: string | null;
      message: string | null;
      payloadJson: string;
      producedAt: string;
      sessionId: string;
      source: string;
      type: string;
      verification: string;
      verifiedAt: string | null;
    }>;
  };
};

export type PlanDetailTagVocabularyQueryVariables = Exact<{
  [key: string]: never;
}>;

export type PlanDetailTagVocabularyQuery = {
  skillTagVocabulary: {
    totalCount: number;
    tags: Array<{ dimension: string; id: string; tag: string }>;
  };
};

export type LinkedArtifactFragment = {
  createdAt: string;
  externalKey: string;
  id: string;
  lifecycle: string | null;
  message: string | null;
  payloadJson: string;
  producedAt: string;
  sessionId: string;
  source: string;
  type: string;
  verification: string;
  verifiedAt: string | null;
};

export type PlanOutputChunkAddedSubscriptionVariables = Exact<{
  planId: string;
}>;

export type PlanOutputChunkAddedSubscription = {
  planOutputChunkAdded: {
    content: string;
    createdAt: string;
    id: string;
    iteration: number | null;
    kind: string | null;
    planId: string;
    taskId: string | null;
  };
};

export type PlanLifecycleNotificationsSubscriptionVariables = Exact<{
  planId: string;
}>;

export type PlanLifecycleNotificationsSubscription = {
  planNotifications:
    | { event: string }
    | { event: string }
    | { planId: string; status: string; event: string }
    | { planId: string; taskId: string | null; event: string }
    | { event: string }
    | { event: string }
    | { event: string }
    | { event: string }
    | { planId: string; taskId: string | null; event: string }
    | { planId: string; status: string; taskId: string | null; event: string };
};

export type PlanInboxMessageFragment = {
  author: string;
  body: string;
  createdAt: string;
  deliveredAt: string | null;
  deliveredToTaskId: string | null;
  id: string;
  kind: PlanMessageKind;
  planId: string;
  status: PlanMessageStatus;
  taskId: string | null;
  updatedAt: string;
};

export type PlanDetailInboxQueryVariables = Exact<{
  planId: string;
}>;

export type PlanDetailInboxQuery = {
  planMessages: Array<{
    author: string;
    body: string;
    createdAt: string;
    deliveredAt: string | null;
    deliveredToTaskId: string | null;
    id: string;
    kind: PlanMessageKind;
    planId: string;
    status: PlanMessageStatus;
    taskId: string | null;
    updatedAt: string;
  }>;
};

export type PlanDetailPostPlanMessageMutationVariables = Exact<{
  input: PostPlanMessageInput;
}>;

export type PlanDetailPostPlanMessageMutation = {
  postPlanMessage: {
    author: string;
    body: string;
    createdAt: string;
    deliveredAt: string | null;
    deliveredToTaskId: string | null;
    id: string;
    kind: PlanMessageKind;
    planId: string;
    status: PlanMessageStatus;
    taskId: string | null;
    updatedAt: string;
  };
};

export type PlanDetailWithdrawPlanMessageMutationVariables = Exact<{
  input: WithdrawPlanMessageInput;
}>;

export type PlanDetailWithdrawPlanMessageMutation = {
  withdrawPlanMessage: {
    author: string;
    body: string;
    createdAt: string;
    deliveredAt: string | null;
    deliveredToTaskId: string | null;
    id: string;
    kind: PlanMessageKind;
    planId: string;
    status: PlanMessageStatus;
    taskId: string | null;
    updatedAt: string;
  };
};

export type PlanMessageChangedSubscriptionVariables = Exact<{
  planId: string;
}>;

export type PlanMessageChangedSubscription = {
  planMessageChanged: {
    author: string;
    body: string;
    createdAt: string;
    deliveredAt: string | null;
    deliveredToTaskId: string | null;
    id: string;
    kind: PlanMessageKind;
    planId: string;
    status: PlanMessageStatus;
    taskId: string | null;
    updatedAt: string;
  };
};

export type PlanDetailAddPlanTagMutationVariables = Exact<{
  input: AddPlanTagInput;
}>;

export type PlanDetailAddPlanTagMutation = {
  addPlanTag: {
    confidence: number | null;
    dimension: string;
    id: string;
    source: string;
    tag: string;
  };
};

export type PlanDetailRemovePlanTagMutationVariables = Exact<{
  input: RemovePlanTagInput;
}>;

export type PlanDetailRemovePlanTagMutation = { removePlanTag: boolean };

export type PlanDetailAddHookMutationVariables = Exact<{
  input: AddHookInput;
}>;

export type PlanDetailAddHookMutation = {
  addHook: {
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    skillSlug: string | null;
    status: string;
    title: string;
  };
};

export type PlanDetailDetachHookMutationVariables = Exact<{
  input: DetachHookInput;
}>;

export type PlanDetailDetachHookMutation = { detachHook: boolean };

export type GetTaskByIdQueryVariables = Exact<{
  id: string;
}>;

export type GetTaskByIdQuery = {
  skillTagVocabulary: {
    totalCount: number;
    tags: Array<{ dimension: string; id: string; tag: string }>;
  };
  task: {
    assignee: string | null;
    category: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    id: string;
    planId: string;
    requirementsJson: string;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
    afterHooks: Array<{
      hookRole: string | null;
      hookScope: string | null;
      hookSource: string | null;
      id: string;
      skillSlug: string | null;
      status: string;
      title: string;
    }>;
    beforeHooks: Array<{
      hookRole: string | null;
      hookScope: string | null;
      hookSource: string | null;
      id: string;
      skillSlug: string | null;
      status: string;
      title: string;
    }>;
    tags: Array<{
      confidence: number | null;
      dimension: string;
      id: string;
      source: string;
      tag: string;
    }>;
    projectRelation: { id: string; name: string } | null;
  } | null;
};

export type TaskDetailsFragment = {
  assignee: string | null;
  category: string | null;
  createdAt: string;
  description: string | null;
  hookRole: string | null;
  id: string;
  planId: string;
  requirementsJson: string;
  sortOrder: number;
  status: string;
  summary: string | null;
  title: string;
  updatedAt: string;
  wave: number | null;
  afterHooks: Array<{
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    skillSlug: string | null;
    status: string;
    title: string;
  }>;
  beforeHooks: Array<{
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    skillSlug: string | null;
    status: string;
    title: string;
  }>;
  tags: Array<{
    confidence: number | null;
    dimension: string;
    id: string;
    source: string;
    tag: string;
  }>;
  projectRelation: { id: string; name: string } | null;
};

export type TaskTagChipFragment = {
  confidence: number | null;
  dimension: string;
  id: string;
  source: string;
  tag: string;
};

export type TaskDetailAddTaskTagMutationVariables = Exact<{
  input: AddTaskTagInput;
}>;

export type TaskDetailAddTaskTagMutation = {
  addTaskTag: {
    confidence: number | null;
    dimension: string;
    id: string;
    source: string;
    tag: string;
  };
};

export type TaskDetailRemoveTaskTagMutationVariables = Exact<{
  input: RemoveTaskTagInput;
}>;

export type TaskDetailRemoveTaskTagMutation = { removeTaskTag: boolean };

export type TaskDetailPromoteToPlanMutationVariables = Exact<{
  input: PromoteTaskToPlanInput;
}>;

export type TaskDetailPromoteToPlanMutation = {
  promoteTaskToPlan: {
    error: string | null;
    jobId: string | null;
    success: boolean;
  };
};

export type TaskLinkedArtifactsQueryVariables = Exact<{
  taskId: string;
}>;

export type TaskLinkedArtifactsQuery = {
  workArtifactsByTask: {
    totalCount: number;
    artifacts: Array<{
      createdAt: string;
      externalKey: string;
      id: string;
      lifecycle: string | null;
      message: string | null;
      payloadJson: string;
      producedAt: string;
      sessionId: string;
      source: string;
      type: string;
      verification: string;
      verifiedAt: string | null;
    }>;
  };
};

export type TaskOutputStreamChunksQueryVariables = Exact<{
  planId: string;
  taskId: string;
}>;

export type TaskOutputStreamChunksQuery = {
  planOutputStreamChunks: Array<{
    content: string;
    createdAt: string;
    id: string;
    iteration: number | null;
    kind: string | null;
    planId: string;
    taskId: string | null;
  }>;
};

export type UpdateTaskMutationVariables = Exact<{
  input: UpdateTaskInput;
}>;

export type UpdateTaskMutation = {
  updateTask: {
    assignee: string | null;
    category: string | null;
    createdAt: string;
    description: string | null;
    id: string;
    planId: string;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
  } | null;
};

export type TaskAgentTrajectoriesQueryVariables = Exact<{
  taskId: string;
}>;

export type TaskAgentTrajectoriesQuery = {
  agentTrajectoriesByTask: Array<{
    byteSize: number;
    cachedTokens: number | null;
    costUsd: number | null;
    createdAt: string;
    driver: string;
    durationMs: number | null;
    exitCode: number | null;
    id: string;
    incomplete: boolean;
    inputTokens: number | null;
    model: string | null;
    outcome: string | null;
    outputTokens: number | null;
    planRunId: string;
    schemaVersion: string;
    source: string;
    taskId: string | null;
    toolCallCount: number;
    truncated: boolean;
  }>;
};

export type TrajectoryViewerQueryVariables = Exact<{
  planId: string;
  taskId: string;
  trajectoryId: string;
}>;

export type TrajectoryViewerQuery = {
  agentTrajectory: {
    trajectoryJson: string;
    byteSize: number;
    cachedTokens: number | null;
    costUsd: number | null;
    createdAt: string;
    driver: string;
    durationMs: number | null;
    exitCode: number | null;
    id: string;
    incomplete: boolean;
    inputTokens: number | null;
    model: string | null;
    outcome: string | null;
    outputTokens: number | null;
    planRunId: string;
    schemaVersion: string;
    source: string;
    taskId: string | null;
    toolCallCount: number;
    truncated: boolean;
  } | null;
  agentTrajectoryLabels: Array<{
    createdAt: string;
    failureType: string | null;
    id: string;
    note: string | null;
    rater: string;
    trajectoryId: string;
    updatedAt: string;
    verdict: string;
  }>;
  me: { email: string | null; githubUsername: string; id: string } | null;
  plan: { id: string; title: string } | null;
  task: { id: string; planId: string; title: string } | null;
};

export type AgentTrajectorySummaryFragment = {
  byteSize: number;
  cachedTokens: number | null;
  costUsd: number | null;
  createdAt: string;
  driver: string;
  durationMs: number | null;
  exitCode: number | null;
  id: string;
  incomplete: boolean;
  inputTokens: number | null;
  model: string | null;
  outcome: string | null;
  outputTokens: number | null;
  planRunId: string;
  schemaVersion: string;
  source: string;
  taskId: string | null;
  toolCallCount: number;
  truncated: boolean;
};

export type AgentTrajectoryLabelRowFragment = {
  createdAt: string;
  failureType: string | null;
  id: string;
  note: string | null;
  rater: string;
  trajectoryId: string;
  updatedAt: string;
  verdict: string;
};

export type TrajectoryViewerLabelMutationVariables = Exact<{
  input: LabelAgentTrajectoryInput;
}>;

export type TrajectoryViewerLabelMutation = {
  labelAgentTrajectory: {
    createdAt: string;
    failureType: string | null;
    id: string;
    note: string | null;
    rater: string;
    trajectoryId: string;
    updatedAt: string;
    verdict: string;
  };
};

export type TrajectoryViewerRemoveLabelMutationVariables = Exact<{
  trajectoryId: string;
}>;

export type TrajectoryViewerRemoveLabelMutation = {
  removeAgentTrajectoryLabel: boolean;
};

export type PlanCardFragment = {
  assignee: string | null;
  author: string;
  category: string;
  createdAt: string;
  description: string | null;
  hasCustomRunConfig: boolean;
  id: string;
  project: string | null;
  scheduledRunAt: string | null;
  status: string;
  summary: string | null;
  taskCount: number;
  tasksCompletedCount: number;
  title: string;
  updatedAt: string;
  projectRelation: { id: string; name: string } | null;
  tags: Array<{ dimension: string; tag: string }>;
};

export type GetPlanAssigneeOptionsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetPlanAssigneeOptionsQuery = {
  listDistinctAuthorsAndAssignees: Array<string>;
};

export type GetPlanCountsByStatusQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetPlanCountsByStatusQuery = {
  planCountsByStatus: Array<{ count: number; status: string }>;
};

export type GetPlansByStatusQueryVariables = Exact<{
  input: ListPlansByStatusInput;
}>;

export type GetPlansByStatusQuery = {
  allPlansCount: { totalCount: number };
  listPlansByStatus: {
    totalCount: number;
    plans: Array<{
      assignee: string | null;
      author: string;
      category: string;
      createdAt: string;
      description: string | null;
      hasCustomRunConfig: boolean;
      id: string;
      project: string | null;
      scheduledRunAt: string | null;
      status: string;
      summary: string | null;
      taskCount: number;
      tasksCompletedCount: number;
      title: string;
      updatedAt: string;
      projectRelation: { id: string; name: string } | null;
      tags: Array<{ dimension: string; tag: string }>;
    }>;
  };
};

export type TestWorkflowMutationVariables = Exact<{
  input: EnqueuePlanRunInput;
}>;

export type TestWorkflowMutation = {
  enqueuePlanRun: { executionBackend: string; jobId: string; planId: string };
};

export type ProjectPageDetailsFragment = {
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  nxProjectName: string | null;
  updatedAt: string;
  tags: Array<{
    confidence: number | null;
    dimension: string;
    id: string;
    source: string;
    tag: string;
  }>;
};

export type GetProjectByIdQueryVariables = Exact<{
  id: string;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;

export type GetProjectByIdQuery = {
  project: {
    createdAt: string;
    description: string | null;
    id: string;
    name: string;
    nxProjectName: string | null;
    updatedAt: string;
    tags: Array<{
      confidence: number | null;
      dimension: string;
      id: string;
      source: string;
      tag: string;
    }>;
  } | null;
  projectTasksResult: {
    totalCount: number;
    tasks: Array<{
      assignee: string | null;
      category: string | null;
      createdAt: string;
      description: string | null;
      id: string;
      planId: string;
      requirementsJson: string;
      summary: string | null;
      title: string;
      updatedAt: string;
    }>;
  };
  skillTagVocabulary: {
    totalCount: number;
    tags: Array<{ dimension: string; id: string; tag: string }>;
  };
};

export type ProjectDetailAddProjectTagMutationVariables = Exact<{
  input: AddProjectTagInput;
}>;

export type ProjectDetailAddProjectTagMutation = {
  addProjectTag: {
    confidence: number | null;
    dimension: string;
    id: string;
    source: string;
    tag: string;
  };
};

export type ProjectDetailRemoveProjectTagMutationVariables = Exact<{
  input: RemoveProjectTagInput;
}>;

export type ProjectDetailRemoveProjectTagMutation = {
  removeProjectTag: boolean;
};

export type ProjectTagChipFragment = {
  confidence: number | null;
  dimension: string;
  id: string;
  source: string;
  tag: string;
};

export type GetProjectForEditQueryVariables = Exact<{
  id: string;
}>;

export type GetProjectForEditQuery = {
  project: {
    description: string | null;
    id: string;
    name: string;
    nxProjectName: string | null;
    updatedAt: string;
  } | null;
};

export type UpdateProjectMutationVariables = Exact<{
  input: UpdateProjectInput;
}>;

export type UpdateProjectMutation = {
  updateProject: {
    description: string | null;
    id: string;
    name: string;
    nxProjectName: string | null;
    updatedAt: string;
  } | null;
};

export type ProjectCardFragment = {
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  nxProjectName: string | null;
  updatedAt: string;
  plans: Array<{ title: string }> | null;
  tasks: Array<{ title: string }> | null;
};

export type GetProjectsQueryVariables = Exact<{ [key: string]: never }>;

export type GetProjectsQuery = {
  projects: Array<{
    createdAt: string;
    description: string | null;
    id: string;
    name: string;
    nxProjectName: string | null;
    updatedAt: string;
    plans: Array<{ title: string }> | null;
    tasks: Array<{ title: string }> | null;
  }>;
};

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput;
}>;

export type CreateProjectMutation = {
  createProject: {
    createdAt: string;
    description: string | null;
    id: string;
    name: string;
    nxProjectName: string | null;
    updatedAt: string;
  };
};

export type PromptDetailsFragment = {
  content: string;
  createdAt: string;
  description: string | null;
  filePath: string | null;
  id: string;
  labels: Array<string>;
  projectId: string | null;
  promptType: CustomPromptType;
  title: string;
  updatedAt: string;
  userId: string | null;
};

export type GetPromptQueryVariables = Exact<{
  id: string;
}>;

export type GetPromptQuery = {
  customPrompt: {
    content: string;
    createdAt: string;
    description: string | null;
    filePath: string | null;
    id: string;
    labels: Array<string>;
    projectId: string | null;
    promptType: CustomPromptType;
    title: string;
    updatedAt: string;
    userId: string | null;
  } | null;
};

export type UpdatePromptMutationVariables = Exact<{
  input: UpdateCustomPromptInput;
}>;

export type UpdatePromptMutation = {
  updateCustomPrompt: {
    content: string;
    createdAt: string;
    description: string | null;
    filePath: string | null;
    id: string;
    labels: Array<string>;
    projectId: string | null;
    promptType: CustomPromptType;
    title: string;
    updatedAt: string;
    userId: string | null;
  } | null;
};

export type DeletePromptMutationVariables = Exact<{
  id: string;
}>;

export type DeletePromptMutation = { deleteCustomPrompt: boolean };

export type WritePromptToFileSystemMutationVariables = Exact<{
  id: string;
}>;

export type WritePromptToFileSystemMutation = {
  writeCustomPromptToFileSystem: boolean;
};

export type PromptCardFragment = {
  content: string;
  createdAt: string;
  description: string | null;
  filePath: string | null;
  id: string;
  labels: Array<string>;
  promptType: CustomPromptType;
  title: string;
  updatedAt: string;
};

export type GetPromptsQueryVariables = Exact<{
  input?: ListCustomPromptsInput | null | undefined;
}>;

export type GetPromptsQuery = {
  customPrompts: Array<{
    content: string;
    createdAt: string;
    description: string | null;
    filePath: string | null;
    id: string;
    labels: Array<string>;
    promptType: CustomPromptType;
    title: string;
    updatedAt: string;
  }>;
};

export type CreatePromptMutationVariables = Exact<{
  input: CreateCustomPromptInput;
}>;

export type CreatePromptMutation = {
  createCustomPrompt: {
    content: string;
    createdAt: string;
    description: string | null;
    filePath: string | null;
    id: string;
    labels: Array<string>;
    promptType: CustomPromptType;
    title: string;
    updatedAt: string;
  };
};

export type PullRequestDetailFragment = {
  author: string;
  baseRef: string | null;
  createdAt: string;
  headRef: string | null;
  headSha: string | null;
  htmlUrl: string;
  mergedAt: string | null;
  number: number;
  state: string;
  title: string;
  updatedAt: string;
};

export type GetPullRequestDetailQueryVariables = Exact<{
  input: GetPullInput;
}>;

export type GetPullRequestDetailQuery = {
  pull: {
    author: string;
    baseRef: string | null;
    createdAt: string;
    headRef: string | null;
    headSha: string | null;
    htmlUrl: string;
    mergedAt: string | null;
    number: number;
    state: string;
    title: string;
    updatedAt: string;
  } | null;
};

export type PullRequestCardFragment = {
  author: string;
  baseRef: string | null;
  createdAt: string;
  headRef: string | null;
  headSha: string | null;
  htmlUrl: string;
  mergedAt: string | null;
  number: number;
  state: string;
  title: string;
  updatedAt: string;
};

export type GetPullRequestsQueryVariables = Exact<{
  input: ListPullsInput;
}>;

export type GetPullRequestsQuery = {
  pulls: Array<{
    author: string;
    baseRef: string | null;
    createdAt: string;
    headRef: string | null;
    headSha: string | null;
    htmlUrl: string;
    mergedAt: string | null;
    number: number;
    state: string;
    title: string;
    updatedAt: string;
  }>;
};

export type JobDetailsCardFragment = {
  data: string | null;
  executionBackend: string | null;
  failedReason: string | null;
  finishedOn: number | null;
  id: string;
  name: string | null;
  processedOn: number | null;
  progress: number | null;
  returnvalue: string | null;
  state: string;
  timestamp: number | null;
  taskRunMetrics: {
    atEnd: { heapUsedMb: number; rssMb: number };
    atStart: { heapUsedMb: number; rssMb: number };
  } | null;
};

export type GetQueueJobDetailsQueryVariables = Exact<{
  jobId: string;
  queueName: string;
}>;

export type GetQueueJobDetailsQuery = {
  job: {
    data: string | null;
    executionBackend: string | null;
    failedReason: string | null;
    finishedOn: number | null;
    id: string;
    name: string | null;
    processedOn: number | null;
    progress: number | null;
    returnvalue: string | null;
    state: string;
    timestamp: number | null;
    taskRunMetrics: {
      atEnd: { heapUsedMb: number; rssMb: number };
      atStart: { heapUsedMb: number; rssMb: number };
    } | null;
  } | null;
};

export type QueueJobDetailRetryMutationVariables = Exact<{
  input: RetryJobInput;
}>;

export type QueueJobDetailRetryMutation = {
  retryJob: { error: string | null; jobId: string | null; success: boolean };
};

export type QueueJobDetailCancelPlanRunMutationVariables = Exact<{
  input: CancelPlanRunInput;
}>;

export type QueueJobDetailCancelPlanRunMutation = {
  cancelPlanRun: {
    activeJobIdsCouldNotCancel: Array<string>;
    cancelRequested: boolean;
    noMatchingJob: boolean;
    outcome: string;
    planId: string;
    planStatusAfter: string | null;
    removedJobIds: Array<string>;
    signaledActiveRunToStop: boolean;
  };
};

export type QueueJobLogEventFragment = {
  cursor: string;
  jobId: string;
  level: QueueJobLogLevel;
  message: string;
  queueName: string;
  source: string;
  timestamp: string;
};

export type QueueJobLogsQueryVariables = Exact<{
  input: QueueJobLogsInput;
}>;

export type QueueJobLogsQuery = {
  queueJobLogs: {
    hasMore: boolean;
    nextCursor: string | null;
    events: Array<{
      cursor: string;
      jobId: string;
      level: QueueJobLogLevel;
      message: string;
      queueName: string;
      source: string;
      timestamp: string;
    }>;
  };
};

export type QueueJobLogTailSubscriptionVariables = Exact<{
  jobId: string;
  queueName: string;
}>;

export type QueueJobLogTailSubscription = {
  queueJobLogTail: {
    cursor: string;
    jobId: string;
    level: QueueJobLogLevel;
    message: string;
    queueName: string;
    source: string;
    timestamp: string;
  };
};

export type QueueJobDetailsFragment = {
  data: string | null;
  failedReason: string | null;
  finishedOn: number | null;
  id: string;
  name: string | null;
  processedOn: number | null;
  progress: number | null;
  returnvalue: string | null;
  state: string;
  timestamp: number | null;
};

export type QueueDetailsFragment = {
  activeCount: number;
  completedCount: number;
  delayedCount: number;
  failedCount: number;
  name: string;
  waitingCount: number;
  jobs: {
    hasNext: boolean;
    total: number;
    jobs: Array<{
      data: string | null;
      failedReason: string | null;
      finishedOn: number | null;
      id: string;
      name: string | null;
      processedOn: number | null;
      progress: number | null;
      returnvalue: string | null;
      state: string;
      timestamp: number | null;
    }>;
  } | null;
};

export type GetQueueQueryVariables = Exact<{
  input: QueueDetailsInput;
}>;

export type GetQueueQuery = {
  queue: {
    activeCount: number;
    completedCount: number;
    delayedCount: number;
    failedCount: number;
    name: string;
    waitingCount: number;
    jobs: {
      hasNext: boolean;
      total: number;
      jobs: Array<{
        data: string | null;
        failedReason: string | null;
        finishedOn: number | null;
        id: string;
        name: string | null;
        processedOn: number | null;
        progress: number | null;
        returnvalue: string | null;
        state: string;
        timestamp: number | null;
      }>;
    } | null;
  } | null;
};

export type QueueDetailPauseQueueMutationVariables = Exact<{
  input: QueueControlInput;
}>;

export type QueueDetailPauseQueueMutation = {
  pauseQueue: {
    error: string | null;
    queueName: string | null;
    success: boolean;
  };
};

export type QueueDetailResumeQueueMutationVariables = Exact<{
  input: QueueControlInput;
}>;

export type QueueDetailResumeQueueMutation = {
  resumeQueue: {
    error: string | null;
    queueName: string | null;
    success: boolean;
  };
};

export type QueueDetailCleanQueueMutationVariables = Exact<{
  input: CleanQueueInput;
}>;

export type QueueDetailCleanQueueMutation = {
  cleanQueue: {
    error: string | null;
    queueName: string | null;
    removedCount: number;
    success: boolean;
  };
};

export type QueueCardFragment = {
  activeCount: number;
  completedCount: number;
  delayedCount: number;
  failedCount: number;
  name: string;
  waitingCount: number;
};

export type GetQueuesQueryVariables = Exact<{ [key: string]: never }>;

export type GetQueuesQuery = {
  queues: Array<{
    activeCount: number;
    completedCount: number;
    delayedCount: number;
    failedCount: number;
    name: string;
    waitingCount: number;
  }>;
};

export type QueuesPauseQueueMutationVariables = Exact<{
  input: QueueControlInput;
}>;

export type QueuesPauseQueueMutation = {
  pauseQueue: {
    error: string | null;
    queueName: string | null;
    success: boolean;
  };
};

export type QueuesResumeQueueMutationVariables = Exact<{
  input: QueueControlInput;
}>;

export type QueuesResumeQueueMutation = {
  resumeQueue: {
    error: string | null;
    queueName: string | null;
    success: boolean;
  };
};

export type CreateQueueMutationVariables = Exact<{
  input: CreateQueueInput;
}>;

export type CreateQueueMutation = {
  createQueue: {
    error: string | null;
    queueName: string | null;
    success: boolean;
  };
};

export type InstallAgentCliMutationVariables = Exact<{
  backend: string;
}>;

export type InstallAgentCliMutation = {
  installAgentCli: {
    backend: string;
    disabled: boolean;
    errorMessage: string | null;
    mode: string;
    runId: string | null;
  };
};

export type UpdateAgentCliMutationVariables = Exact<{
  backend: string;
}>;

export type UpdateAgentCliMutation = {
  updateAgentCli: {
    backend: string;
    disabled: boolean;
    errorMessage: string | null;
    mode: string;
    runId: string | null;
  };
};

export type GetBackgroundActivitiesQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetBackgroundActivitiesQuery = {
  backgroundActivities: Array<{
    done: number;
    etaSeconds: number | null;
    id: string;
    label: string;
    startedAt: string;
    status: string;
    total: number | null;
  }>;
};

export type ResolveIdRefQueryVariables = Exact<{
  ref: string;
}>;

export type ResolveIdRefQuery = {
  resolveIdRef: Array<{
    id: string;
    kind: IdRefKind;
    planId: string | null;
    planTitle: string | null;
    status: string;
    title: string;
  }>;
};

export type UsageBranchOptionFragment = { branch: string; count: number };

export type GetUsageBranchSearchQueryVariables = Exact<{
  start: string;
  end: string;
  query?: string | null | undefined;
  limit?: number | null | undefined;
}>;

export type GetUsageBranchSearchQuery = {
  skillUsageGitBranches: {
    hasMore: boolean;
    items: Array<{ branch: string; count: number }>;
  };
};

export type TagActionRuleRowFragment = {
  actionPayloadJson: string;
  actionType: string;
  createdAt: string;
  enabled: boolean;
  environment: string | null;
  id: string;
  projectId: string | null;
  status: string | null;
  tagAll: Array<string>;
  title: string;
  updatedAt: string;
  userId: string;
};

export type RulesIndexLoaderQueryVariables = Exact<{ [key: string]: never }>;

export type RulesIndexLoaderQuery = {
  skillAvailability: {
    totalCount: number;
    warnings: Array<string>;
    skills: Array<{ effectiveDisableModelInvocation: boolean; slug: string }>;
  };
  skillTagVocabulary: {
    totalCount: number;
    tags: Array<{ dimension: string; id: string; tag: string }>;
  };
  tagActionRules: Array<{
    actionPayloadJson: string;
    actionType: string;
    createdAt: string;
    enabled: boolean;
    environment: string | null;
    id: string;
    projectId: string | null;
    status: string | null;
    tagAll: Array<string>;
    title: string;
    updatedAt: string;
    userId: string;
  }>;
};

export type RuleEditLoaderQueryVariables = Exact<{
  id: string;
}>;

export type RuleEditLoaderQuery = {
  skillAvailability: {
    totalCount: number;
    warnings: Array<string>;
    skills: Array<{ effectiveDisableModelInvocation: boolean; slug: string }>;
  };
  skillTagVocabulary: {
    totalCount: number;
    tags: Array<{ dimension: string; id: string; tag: string }>;
  };
  tagActionRule: {
    actionPayloadJson: string;
    actionType: string;
    createdAt: string;
    enabled: boolean;
    environment: string | null;
    id: string;
    projectId: string | null;
    status: string | null;
    tagAll: Array<string>;
    title: string;
    updatedAt: string;
    userId: string;
  } | null;
};

export type RulesUpsertTagActionRuleMutationVariables = Exact<{
  input: UpsertTagActionRuleInput;
}>;

export type RulesUpsertTagActionRuleMutation = {
  upsertTagActionRule: {
    actionPayloadJson: string;
    actionType: string;
    createdAt: string;
    enabled: boolean;
    environment: string | null;
    id: string;
    projectId: string | null;
    status: string | null;
    tagAll: Array<string>;
    title: string;
    updatedAt: string;
    userId: string;
  };
};

export type RulesDeleteTagActionRuleMutationVariables = Exact<{
  input: DeleteTagActionRuleInput;
}>;

export type RulesDeleteTagActionRuleMutation = { deleteTagActionRule: boolean };

export type ScheduledJobRunRowFragment = {
  bullmqJobId: string | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  costUsd: number | null;
  createdAt: string;
  driverId: string;
  errorMessage: string | null;
  exitCode: number | null;
  finishedAt: string | null;
  id: string;
  inputTokens: number | null;
  model: string | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  resumeOfRunId: string | null;
  scheduledFor: string | null;
  startedAt: string | null;
  status: string;
  totalTokens: number | null;
  trigger: string;
  usageLimitResetsAt: string | null;
};

export type ScheduledJobDetailFragment = {
  createdAt: string;
  cwd: string | null;
  misfirePolicy: string;
  misfireThresholdMs: number;
  prompt: string;
  settingsJson: string;
  timeoutMs: number | null;
  cronPattern: string | null;
  driverId: string;
  enabled: boolean;
  id: string;
  intervalMs: number | null;
  lastRunAt: string | null;
  model: string | null;
  name: string;
  nextRunAt: string | null;
  repositoryCheckoutId: string | null;
  runAt: string | null;
  scheduleKind: string;
  timezone: string | null;
  updatedAt: string;
  repository: {
    displayName: string;
    filesystemPath: string;
    id: string;
  } | null;
};

export type ScheduledAgentJobDetailQueryVariables = Exact<{
  id: string;
}>;

export type ScheduledAgentJobDetailQuery = {
  scheduledAgentJob: {
    createdAt: string;
    cwd: string | null;
    misfirePolicy: string;
    misfireThresholdMs: number;
    prompt: string;
    settingsJson: string;
    timeoutMs: number | null;
    cronPattern: string | null;
    driverId: string;
    enabled: boolean;
    id: string;
    intervalMs: number | null;
    lastRunAt: string | null;
    model: string | null;
    name: string;
    nextRunAt: string | null;
    repositoryCheckoutId: string | null;
    runAt: string | null;
    scheduleKind: string;
    timezone: string | null;
    updatedAt: string;
    repository: {
      displayName: string;
      filesystemPath: string;
      id: string;
    } | null;
  } | null;
  scheduledAgentJobRuns: Array<{
    bullmqJobId: string | null;
    cacheReadTokens: number | null;
    cacheWriteTokens: number | null;
    costUsd: number | null;
    createdAt: string;
    driverId: string;
    errorMessage: string | null;
    exitCode: number | null;
    finishedAt: string | null;
    id: string;
    inputTokens: number | null;
    model: string | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
    resumeOfRunId: string | null;
    scheduledFor: string | null;
    startedAt: string | null;
    status: string;
    totalTokens: number | null;
    trigger: string;
    usageLimitResetsAt: string | null;
  }>;
};

export type UpdateScheduledAgentJobMutationVariables = Exact<{
  input: UpdateScheduledAgentJobInputType;
}>;

export type UpdateScheduledAgentJobMutation = {
  updateScheduledAgentJob: {
    cronPattern: string | null;
    driverId: string;
    enabled: boolean;
    id: string;
    intervalMs: number | null;
    lastRunAt: string | null;
    model: string | null;
    name: string;
    nextRunAt: string | null;
    repositoryCheckoutId: string | null;
    runAt: string | null;
    scheduleKind: string;
    timezone: string | null;
    updatedAt: string;
    repository: {
      displayName: string;
      filesystemPath: string;
      id: string;
    } | null;
  };
};

export type SetScheduledAgentJobEnabledMutationVariables = Exact<{
  input: SetScheduledAgentJobEnabledInputType;
}>;

export type SetScheduledAgentJobEnabledMutation = {
  setScheduledAgentJobEnabled: {
    cronPattern: string | null;
    driverId: string;
    enabled: boolean;
    id: string;
    intervalMs: number | null;
    lastRunAt: string | null;
    model: string | null;
    name: string;
    nextRunAt: string | null;
    repositoryCheckoutId: string | null;
    runAt: string | null;
    scheduleKind: string;
    timezone: string | null;
    updatedAt: string;
    repository: {
      displayName: string;
      filesystemPath: string;
      id: string;
    } | null;
  };
};

export type RunScheduledAgentJobNowMutationVariables = Exact<{
  id: string;
}>;

export type RunScheduledAgentJobNowMutation = {
  runScheduledAgentJobNow: {
    bullmqJobId: string | null;
    cacheReadTokens: number | null;
    cacheWriteTokens: number | null;
    costUsd: number | null;
    createdAt: string;
    driverId: string;
    errorMessage: string | null;
    exitCode: number | null;
    finishedAt: string | null;
    id: string;
    inputTokens: number | null;
    model: string | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
    resumeOfRunId: string | null;
    scheduledFor: string | null;
    startedAt: string | null;
    status: string;
    totalTokens: number | null;
    trigger: string;
    usageLimitResetsAt: string | null;
  };
};

export type DeleteScheduledAgentJobMutationVariables = Exact<{
  id: string;
}>;

export type DeleteScheduledAgentJobMutation = {
  deleteScheduledAgentJob: boolean;
};

export type ScheduledJobRunDetailFragment = {
  bullmqJobId: string | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  cancelRequestedAt: string | null;
  costUsd: number | null;
  createdAt: string;
  driverId: string;
  errorMessage: string | null;
  exitCode: number | null;
  finishedAt: string | null;
  id: string;
  inputTokens: number | null;
  model: string | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  repositoryCheckoutId: string | null;
  resolvedCwd: string | null;
  resumeOfRunId: string | null;
  scheduledAgentJobId: string;
  settingsSnapshotJson: string | null;
  startedAt: string | null;
  status: string;
  totalTokens: number | null;
  trigger: string;
  usageLimitResetsAt: string | null;
  repository: {
    displayName: string;
    filesystemPath: string;
    id: string;
  } | null;
};

export type ScheduledAgentJobRunDetailQueryVariables = Exact<{
  runId: string;
  jobId: string;
}>;

export type ScheduledAgentJobRunDetailQuery = {
  scheduledAgentJob: { id: string; name: string } | null;
  scheduledAgentJobRun: {
    bullmqJobId: string | null;
    cacheReadTokens: number | null;
    cacheWriteTokens: number | null;
    cancelRequestedAt: string | null;
    costUsd: number | null;
    createdAt: string;
    driverId: string;
    errorMessage: string | null;
    exitCode: number | null;
    finishedAt: string | null;
    id: string;
    inputTokens: number | null;
    model: string | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
    repositoryCheckoutId: string | null;
    resolvedCwd: string | null;
    resumeOfRunId: string | null;
    scheduledAgentJobId: string;
    settingsSnapshotJson: string | null;
    startedAt: string | null;
    status: string;
    totalTokens: number | null;
    trigger: string;
    usageLimitResetsAt: string | null;
    repository: {
      displayName: string;
      filesystemPath: string;
      id: string;
    } | null;
  } | null;
};

export type CancelScheduledAgentJobRunMutationVariables = Exact<{
  runId: string;
}>;

export type CancelScheduledAgentJobRunMutation = {
  cancelScheduledAgentJobRun: {
    bullmqJobId: string | null;
    cacheReadTokens: number | null;
    cacheWriteTokens: number | null;
    cancelRequestedAt: string | null;
    costUsd: number | null;
    createdAt: string;
    driverId: string;
    errorMessage: string | null;
    exitCode: number | null;
    finishedAt: string | null;
    id: string;
    inputTokens: number | null;
    model: string | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
    repositoryCheckoutId: string | null;
    resolvedCwd: string | null;
    resumeOfRunId: string | null;
    scheduledAgentJobId: string;
    settingsSnapshotJson: string | null;
    startedAt: string | null;
    status: string;
    totalTokens: number | null;
    trigger: string;
    usageLimitResetsAt: string | null;
    repository: {
      displayName: string;
      filesystemPath: string;
      id: string;
    } | null;
  };
};

export type ScheduledJobCardFragment = {
  cronPattern: string | null;
  driverId: string;
  enabled: boolean;
  id: string;
  intervalMs: number | null;
  lastRunAt: string | null;
  model: string | null;
  name: string;
  nextRunAt: string | null;
  repositoryCheckoutId: string | null;
  runAt: string | null;
  scheduleKind: string;
  timezone: string | null;
  updatedAt: string;
  repository: {
    displayName: string;
    filesystemPath: string;
    id: string;
  } | null;
};

export type ScheduleInFlightRunFragment = {
  bullmqJobId: string | null;
  cancelRequestedAt: string | null;
  driverId: string;
  id: string;
  model: string | null;
  scheduledAgentJobId: string;
  startedAt: string | null;
  status: string;
  trigger: string;
  job: { id: string; name: string } | null;
};

export type ScheduleRunStatsFragment = {
  cancelledCount: number;
  failedCount: number;
  inFlightCount: number;
  noOpCount: number;
  queuedCount: number;
  runningCount: number;
  since: string;
  succeededCount: number;
  windowTotalCount: number;
};

export type ScheduledAgentJobsQueryVariables = Exact<{ [key: string]: never }>;

export type ScheduledAgentJobsQuery = {
  scheduledAgentJobRunsInFlight: Array<{
    bullmqJobId: string | null;
    cancelRequestedAt: string | null;
    driverId: string;
    id: string;
    model: string | null;
    scheduledAgentJobId: string;
    startedAt: string | null;
    status: string;
    trigger: string;
    job: { id: string; name: string } | null;
  }>;
  scheduledAgentJobRunStats: {
    cancelledCount: number;
    failedCount: number;
    inFlightCount: number;
    noOpCount: number;
    queuedCount: number;
    runningCount: number;
    since: string;
    succeededCount: number;
    windowTotalCount: number;
  };
  scheduledAgentJobs: Array<{
    cronPattern: string | null;
    driverId: string;
    enabled: boolean;
    id: string;
    intervalMs: number | null;
    lastRunAt: string | null;
    model: string | null;
    name: string;
    nextRunAt: string | null;
    repositoryCheckoutId: string | null;
    runAt: string | null;
    scheduleKind: string;
    timezone: string | null;
    updatedAt: string;
    repository: {
      displayName: string;
      filesystemPath: string;
      id: string;
    } | null;
  }>;
};

export type CancelScheduleIndexRunMutationVariables = Exact<{
  runId: string;
}>;

export type CancelScheduleIndexRunMutation = {
  cancelScheduledAgentJobRun: {
    bullmqJobId: string | null;
    cancelRequestedAt: string | null;
    driverId: string;
    id: string;
    model: string | null;
    scheduledAgentJobId: string;
    startedAt: string | null;
    status: string;
    trigger: string;
    job: { id: string; name: string } | null;
  };
};

export type ScheduleRepositoryOptionsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type ScheduleRepositoryOptionsQuery = {
  workspaceLocalRepositories: Array<{
    displayName: string;
    filesystemPath: string;
    id: string;
  }>;
};

export type CreateScheduledAgentJobMutationVariables = Exact<{
  input: CreateScheduledAgentJobInputType;
}>;

export type CreateScheduledAgentJobMutation = {
  createScheduledAgentJob: {
    cronPattern: string | null;
    driverId: string;
    enabled: boolean;
    id: string;
    intervalMs: number | null;
    lastRunAt: string | null;
    model: string | null;
    name: string;
    nextRunAt: string | null;
    repositoryCheckoutId: string | null;
    runAt: string | null;
    scheduleKind: string;
    timezone: string | null;
    updatedAt: string;
    repository: {
      displayName: string;
      filesystemPath: string;
      id: string;
    } | null;
  };
};

export type GetSearchResultsQueryVariables = Exact<{
  input: SearchInput;
}>;

export type GetSearchResultsQuery = {
  search: {
    mode: string;
    reason: string | null;
    total: number;
    chunks: Array<{
      content: string;
      id: string;
      planId: string | null;
      planTitle: string | null;
      similarity: number;
      source: string;
      sourcePath: string | null;
      sourceRepo: string | null;
      sourceSha: string | null;
      taskId: string | null;
      taskTitle: string | null;
    }>;
  };
};

export type SettingsAgentsAgentClisQueryVariables = Exact<{
  [key: string]: never;
}>;

export type SettingsAgentsAgentClisQuery = {
  discoverAgentClis: {
    scannedAt: string;
    totalCount: number;
    agents: Array<{
      backend: string;
      enabled: boolean;
      label: string;
      version: string | null;
      auth: { warning: string | null } | null;
      modelOptions: Array<{
        enabled: boolean;
        favorite: boolean;
        model: string;
      }>;
    }>;
  };
};

export type AgentCliSetupConfigQueryVariables = Exact<{ [key: string]: never }>;

export type AgentCliSetupConfigQuery = {
  agentCliSetupConfig: { canManage: boolean; installEnabled: boolean };
};

export type SetAgentEnabledMutationVariables = Exact<{
  backend: string;
  enabled: boolean;
}>;

export type SetAgentEnabledMutation = {
  setAgentEnabled: { backend: string; enabled: boolean };
};

export type SetAgentModelEnabledMutationVariables = Exact<{
  backend: string;
  model: string;
  enabled: boolean;
}>;

export type SetAgentModelEnabledMutation = {
  setAgentModelEnabled: { backend: string; enabled: boolean; model: string };
};

export type SetAgentModelsEnabledMutationVariables = Exact<{
  backend: string;
  models: Array<string> | string;
  enabled: boolean;
}>;

export type SetAgentModelsEnabledMutation = {
  setAgentModelsEnabled: { backend: string; enabled: boolean };
};

export type SetAgentModelFavoriteMutationVariables = Exact<{
  backend: string;
  model: string;
  favorite: boolean;
}>;

export type SetAgentModelFavoriteMutation = {
  setAgentModelFavorite: { backend: string; favorite: boolean; model: string };
};

export type AgentSetupChunkAddedSubscriptionVariables = Exact<{
  runId: string;
}>;

export type AgentSetupChunkAddedSubscription = {
  agentSetupChunkAdded: {
    data: string;
    done: boolean;
    error: string | null;
    exitCode: number | null;
    id: string;
    runId: string;
    sortOrder: number;
    stream: string;
  };
};

export type ServiceAccountCredentialFieldsFragment = {
  createdAt: string;
  expiresAt: string | null;
  id: string;
  label: string | null;
  lastUsedAt: string | null;
  prefix: string;
  revokedAt: string | null;
  serviceAccountId: string;
};

export type ServiceAccountListItemFragment = {
  createdAt: string;
  description: string | null;
  disabledAt: string | null;
  id: string;
  name: string;
};

export type GetSettingsKeysQueryVariables = Exact<{
  serviceAccountId: string;
}>;

export type GetSettingsKeysQuery = {
  serviceAccountCredentials: Array<{
    createdAt: string;
    expiresAt: string | null;
    id: string;
    label: string | null;
    lastUsedAt: string | null;
    prefix: string;
    revokedAt: string | null;
    serviceAccountId: string;
  }>;
  serviceAccounts: Array<{
    createdAt: string;
    description: string | null;
    disabledAt: string | null;
    id: string;
    name: string;
  }>;
};

export type CreateServiceAccountCredentialMutationVariables = Exact<{
  input: CreateServiceAccountCredentialInput;
}>;

export type CreateServiceAccountCredentialMutation = {
  createServiceAccountCredential: {
    token: string;
    credential: {
      createdAt: string;
      expiresAt: string | null;
      id: string;
      label: string | null;
      lastUsedAt: string | null;
      prefix: string;
      revokedAt: string | null;
      serviceAccountId: string;
    };
  } | null;
};

export type RevokeServiceAccountCredentialMutationVariables = Exact<{
  credentialId: string;
}>;

export type RevokeServiceAccountCredentialMutation = {
  revokeServiceAccountCredential: boolean;
};

export type ConnectMcpConnectorMutationVariables = Exact<{
  input: ConnectMcpConnectorInput;
}>;

export type ConnectMcpConnectorMutation = {
  connectMcpConnector: {
    connection: {
      authType: string;
      connectedAt: string;
      connectorKey: string;
      credentialLabel: string | null;
      credentialPrefix: string | null;
      enabled: boolean;
      id: string;
      lastUsedAt: string | null;
    };
  };
};

export type SetMcpConnectorEnabledMutationVariables = Exact<{
  input: SetMcpConnectorEnabledInput;
}>;

export type SetMcpConnectorEnabledMutation = {
  setMcpConnectorEnabled: {
    connection: {
      authType: string;
      connectedAt: string;
      connectorKey: string;
      credentialLabel: string | null;
      credentialPrefix: string | null;
      enabled: boolean;
      id: string;
      lastUsedAt: string | null;
    };
  } | null;
};

export type DisconnectMcpConnectorMutationVariables = Exact<{
  connectorKey: string;
}>;

export type DisconnectMcpConnectorMutation = {
  disconnectMcpConnector: boolean;
};

export type McpConnectorFieldsFragment = {
  authType: string;
  category: string;
  description: string;
  docsUrl: string;
  endpointUrl: string | null;
  iconHint: string;
  key: string;
  name: string;
  provider: string;
  transport: string;
};

export type McpConnectorConnectionFieldsFragment = {
  authType: string;
  connectedAt: string;
  connectorKey: string;
  credentialLabel: string | null;
  credentialPrefix: string | null;
  enabled: boolean;
  id: string;
  lastUsedAt: string | null;
};

export type GetSettingsMcpQueryVariables = Exact<{ [key: string]: never }>;

export type GetSettingsMcpQuery = {
  mcpConnectorConnections: Array<{
    authType: string;
    connectedAt: string;
    connectorKey: string;
    credentialLabel: string | null;
    credentialPrefix: string | null;
    enabled: boolean;
    id: string;
    lastUsedAt: string | null;
  }>;
  mcpConnectors: Array<{
    authType: string;
    category: string;
    description: string;
    docsUrl: string;
    endpointUrl: string | null;
    iconHint: string;
    key: string;
    name: string;
    provider: string;
    transport: string;
  }>;
};

export type UserPreferencesFieldsFragment = {
  defaultEditor: WorkspaceEditorId | null;
  defaultAgent: {
    backend: string;
    effort: string | null;
    model: string;
  } | null;
};

export type SettingsUserPreferencesQueryVariables = Exact<{
  [key: string]: never;
}>;

export type SettingsUserPreferencesQuery = {
  userPreferences: {
    defaultEditor: WorkspaceEditorId | null;
    defaultAgent: {
      backend: string;
      effort: string | null;
      model: string;
    } | null;
  };
};

export type SettingsPreferencesEnabledEditorsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type SettingsPreferencesEnabledEditorsQuery = {
  workspaceSettings: { profile: { enabledEditors: Array<WorkspaceEditorId> } };
};

export type UpdateUserPreferencesMutationVariables = Exact<{
  input: UpdateUserPreferencesInput;
}>;

export type UpdateUserPreferencesMutation = {
  updateUserPreferences: {
    defaultEditor: WorkspaceEditorId | null;
    defaultAgent: {
      backend: string;
      effort: string | null;
      model: string;
    } | null;
  };
};

export type GetWorkspaceRepositoryQueryVariables = Exact<{
  repositoryId: string;
}>;

export type GetWorkspaceRepositoryQuery = {
  workspaceRepository: {
    createdAt: string;
    defaultBranch: string | null;
    id: string;
    name: string;
    normalizedRemoteUrl: string | null;
    projectId: string | null;
    updatedAt: string;
    checkouts: Array<{
      createdAt: string;
      displayName: string;
      filesystemPath: string;
      foreignSkillInjectionEnabled: boolean;
      id: string;
      isForeign: boolean;
      kind: string;
      managed: boolean;
      repositoryId: string;
      scannedAt: string | null;
      updatedAt: string;
      userId: string;
      worktreeSkillOverlayEnabled: boolean;
      inspection: {
        scannedAt: string;
        warnings: Array<string>;
        agentConfig: {
          agentsMd: boolean;
          claudeMd: boolean;
          cursorRules: boolean;
          mcpJson: boolean;
          skillsDir: boolean;
        };
        git: {
          currentBranch: string | null;
          defaultBranch: string | null;
          dirty: boolean | null;
          isRepo: boolean;
          linkedWorktrees: Array<string>;
          normalizedRemoteUrl: string | null;
        };
        hookTelemetry: {
          authTokenConfigured: boolean;
          endpointConfigured: boolean;
          endpointSource: string;
          producers: Array<string>;
          reason: string | null;
          status: string;
          telemetryDir: string;
        } | null;
        stack: {
          languages: Array<string>;
          nxWorkspace: boolean;
          packageManager: string | null;
          pnpmWorkspace: boolean;
          turbo: boolean;
        };
      } | null;
    }>;
    project: { id: string; name: string } | null;
  } | null;
};

export type GetWorkspaceRepositoryForEditQueryVariables = Exact<{
  repositoryId: string;
}>;

export type GetWorkspaceRepositoryForEditQuery = {
  projects: Array<{ id: string; name: string }>;
  workspaceRepository: {
    createdAt: string;
    defaultBranch: string | null;
    id: string;
    name: string;
    normalizedRemoteUrl: string | null;
    projectId: string | null;
    updatedAt: string;
    checkouts: Array<{
      createdAt: string;
      displayName: string;
      filesystemPath: string;
      foreignSkillInjectionEnabled: boolean;
      id: string;
      isForeign: boolean;
      kind: string;
      managed: boolean;
      repositoryId: string;
      scannedAt: string | null;
      updatedAt: string;
      userId: string;
      worktreeSkillOverlayEnabled: boolean;
      inspection: {
        scannedAt: string;
        warnings: Array<string>;
        agentConfig: {
          agentsMd: boolean;
          claudeMd: boolean;
          cursorRules: boolean;
          mcpJson: boolean;
          skillsDir: boolean;
        };
        git: {
          currentBranch: string | null;
          defaultBranch: string | null;
          dirty: boolean | null;
          isRepo: boolean;
          linkedWorktrees: Array<string>;
          normalizedRemoteUrl: string | null;
        };
        hookTelemetry: {
          authTokenConfigured: boolean;
          endpointConfigured: boolean;
          endpointSource: string;
          producers: Array<string>;
          reason: string | null;
          status: string;
          telemetryDir: string;
        } | null;
        stack: {
          languages: Array<string>;
          nxWorkspace: boolean;
          packageManager: string | null;
          pnpmWorkspace: boolean;
          turbo: boolean;
        };
      } | null;
    }>;
    project: { id: string; name: string } | null;
  } | null;
};

export type UpdateRepositoryMutationVariables = Exact<{
  input: UpdateRepositoryInput;
}>;

export type UpdateRepositoryMutation = {
  updateRepository: {
    createdAt: string;
    defaultBranch: string | null;
    id: string;
    name: string;
    normalizedRemoteUrl: string | null;
    projectId: string | null;
    updatedAt: string;
    checkouts: Array<{
      createdAt: string;
      displayName: string;
      filesystemPath: string;
      foreignSkillInjectionEnabled: boolean;
      id: string;
      isForeign: boolean;
      kind: string;
      managed: boolean;
      repositoryId: string;
      scannedAt: string | null;
      updatedAt: string;
      userId: string;
      worktreeSkillOverlayEnabled: boolean;
      inspection: {
        scannedAt: string;
        warnings: Array<string>;
        agentConfig: {
          agentsMd: boolean;
          claudeMd: boolean;
          cursorRules: boolean;
          mcpJson: boolean;
          skillsDir: boolean;
        };
        git: {
          currentBranch: string | null;
          defaultBranch: string | null;
          dirty: boolean | null;
          isRepo: boolean;
          linkedWorktrees: Array<string>;
          normalizedRemoteUrl: string | null;
        };
        hookTelemetry: {
          authTokenConfigured: boolean;
          endpointConfigured: boolean;
          endpointSource: string;
          producers: Array<string>;
          reason: string | null;
          status: string;
          telemetryDir: string;
        } | null;
        stack: {
          languages: Array<string>;
          nxWorkspace: boolean;
          packageManager: string | null;
          pnpmWorkspace: boolean;
          turbo: boolean;
        };
      } | null;
    }>;
    project: { id: string; name: string } | null;
  };
};

export type RepositoryCheckoutFieldsFragment = {
  createdAt: string;
  displayName: string;
  filesystemPath: string;
  foreignSkillInjectionEnabled: boolean;
  id: string;
  isForeign: boolean;
  kind: string;
  managed: boolean;
  repositoryId: string;
  scannedAt: string | null;
  updatedAt: string;
  userId: string;
  worktreeSkillOverlayEnabled: boolean;
  inspection: {
    scannedAt: string;
    warnings: Array<string>;
    agentConfig: {
      agentsMd: boolean;
      claudeMd: boolean;
      cursorRules: boolean;
      mcpJson: boolean;
      skillsDir: boolean;
    };
    git: {
      currentBranch: string | null;
      defaultBranch: string | null;
      dirty: boolean | null;
      isRepo: boolean;
      linkedWorktrees: Array<string>;
      normalizedRemoteUrl: string | null;
    };
    hookTelemetry: {
      authTokenConfigured: boolean;
      endpointConfigured: boolean;
      endpointSource: string;
      producers: Array<string>;
      reason: string | null;
      status: string;
      telemetryDir: string;
    } | null;
    stack: {
      languages: Array<string>;
      nxWorkspace: boolean;
      packageManager: string | null;
      pnpmWorkspace: boolean;
      turbo: boolean;
    };
  } | null;
};

export type DiscoveredWorktreeFieldsFragment = {
  activity: WorktreeActivity;
  branch: string | null;
  checkoutId: string | null;
  name: string;
  path: string;
  planId: string | null;
  planRunId: string | null;
  repositoryId: string | null;
  runMonitored: boolean | null;
  safeToRemove: boolean;
  unregistered: boolean;
};

export type WorkspaceRepositoryFieldsFragment = {
  createdAt: string;
  defaultBranch: string | null;
  id: string;
  name: string;
  normalizedRemoteUrl: string | null;
  projectId: string | null;
  updatedAt: string;
  checkouts: Array<{
    createdAt: string;
    displayName: string;
    filesystemPath: string;
    foreignSkillInjectionEnabled: boolean;
    id: string;
    isForeign: boolean;
    kind: string;
    managed: boolean;
    repositoryId: string;
    scannedAt: string | null;
    updatedAt: string;
    userId: string;
    worktreeSkillOverlayEnabled: boolean;
    inspection: {
      scannedAt: string;
      warnings: Array<string>;
      agentConfig: {
        agentsMd: boolean;
        claudeMd: boolean;
        cursorRules: boolean;
        mcpJson: boolean;
        skillsDir: boolean;
      };
      git: {
        currentBranch: string | null;
        defaultBranch: string | null;
        dirty: boolean | null;
        isRepo: boolean;
        linkedWorktrees: Array<string>;
        normalizedRemoteUrl: string | null;
      };
      hookTelemetry: {
        authTokenConfigured: boolean;
        endpointConfigured: boolean;
        endpointSource: string;
        producers: Array<string>;
        reason: string | null;
        status: string;
        telemetryDir: string;
      } | null;
      stack: {
        languages: Array<string>;
        nxWorkspace: boolean;
        packageManager: string | null;
        pnpmWorkspace: boolean;
        turbo: boolean;
      };
    } | null;
  }>;
  project: { id: string; name: string } | null;
};

export type GetSettingsRepositoriesQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetSettingsRepositoriesQuery = {
  workspacePickerCapabilities: {
    canUseNativeDialog: boolean;
    defaultBrowsePath: string;
    roots: Array<string>;
  };
  workspaceRepositories: Array<{
    createdAt: string;
    defaultBranch: string | null;
    id: string;
    name: string;
    normalizedRemoteUrl: string | null;
    projectId: string | null;
    updatedAt: string;
    checkouts: Array<{
      createdAt: string;
      displayName: string;
      filesystemPath: string;
      foreignSkillInjectionEnabled: boolean;
      id: string;
      isForeign: boolean;
      kind: string;
      managed: boolean;
      repositoryId: string;
      scannedAt: string | null;
      updatedAt: string;
      userId: string;
      worktreeSkillOverlayEnabled: boolean;
      inspection: {
        scannedAt: string;
        warnings: Array<string>;
        agentConfig: {
          agentsMd: boolean;
          claudeMd: boolean;
          cursorRules: boolean;
          mcpJson: boolean;
          skillsDir: boolean;
        };
        git: {
          currentBranch: string | null;
          defaultBranch: string | null;
          dirty: boolean | null;
          isRepo: boolean;
          linkedWorktrees: Array<string>;
          normalizedRemoteUrl: string | null;
        };
        hookTelemetry: {
          authTokenConfigured: boolean;
          endpointConfigured: boolean;
          endpointSource: string;
          producers: Array<string>;
          reason: string | null;
          status: string;
          telemetryDir: string;
        } | null;
        stack: {
          languages: Array<string>;
          nxWorkspace: boolean;
          packageManager: string | null;
          pnpmWorkspace: boolean;
          turbo: boolean;
        };
      } | null;
    }>;
    project: { id: string; name: string } | null;
  }>;
};

export type GetSettingsRepositoriesDiscoveryQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetSettingsRepositoriesDiscoveryQuery = {
  discoveredFolders: Array<{
    alreadyRegistered: boolean;
    name: string;
    path: string;
  }>;
  discoveredWorktrees: {
    droppedCount: number;
    scannedAt: string;
    missingCheckouts: Array<{
      checkoutId: string;
      path: string;
      reason: MissingWorktreeCheckoutReason;
      repositoryId: string;
      lastRemoval: {
        agentSession: string | null;
        createdAt: string;
        id: string;
        outcome: string;
        parentCommand: string | null;
        removedAt: string | null;
        result: string | null;
      } | null;
    }>;
    problems: Array<{
      detail: string;
      kind: WorktreeDiscoveryProblemKind;
      path: string | null;
      repositoryId: string | null;
    }>;
    scannedRoots: Array<{
      baseRoot: string;
      exists: boolean;
      path: string;
      source: WorktreeRootSource;
      worktreeCount: number;
    }>;
    worktrees: Array<{
      activity: WorktreeActivity;
      branch: string | null;
      checkoutId: string | null;
      name: string;
      path: string;
      planId: string | null;
      planRunId: string | null;
      repositoryId: string | null;
      runMonitored: boolean | null;
      safeToRemove: boolean;
      unregistered: boolean;
    }>;
  };
};

export type BrowseWorkspaceDirectoryQueryVariables = Exact<{
  path?: string | null | undefined;
}>;

export type BrowseWorkspaceDirectoryQuery = {
  browseDirectory: {
    isGitRepo: boolean;
    parentPath: string | null;
    path: string | null;
    entries: Array<{
      alreadyRegistered: boolean;
      isGitRepo: boolean;
      name: string;
      path: string;
    }>;
  };
};

export type PickFolderNativeMutationVariables = Exact<{ [key: string]: never }>;

export type PickFolderNativeMutation = {
  pickFolderNative: { path: string | null };
};

export type AddWorkspaceFolderMutationVariables = Exact<{
  input: AddWorkspaceFolderInput;
}>;

export type AddWorkspaceFolderMutation = {
  addWorkspaceFolder: {
    projectCreated: boolean;
    reconciliation: WorkspaceFolderReconciliation;
    checkout: {
      createdAt: string;
      displayName: string;
      filesystemPath: string;
      foreignSkillInjectionEnabled: boolean;
      id: string;
      isForeign: boolean;
      kind: string;
      managed: boolean;
      repositoryId: string;
      scannedAt: string | null;
      updatedAt: string;
      userId: string;
      worktreeSkillOverlayEnabled: boolean;
      inspection: {
        scannedAt: string;
        warnings: Array<string>;
        agentConfig: {
          agentsMd: boolean;
          claudeMd: boolean;
          cursorRules: boolean;
          mcpJson: boolean;
          skillsDir: boolean;
        };
        git: {
          currentBranch: string | null;
          defaultBranch: string | null;
          dirty: boolean | null;
          isRepo: boolean;
          linkedWorktrees: Array<string>;
          normalizedRemoteUrl: string | null;
        };
        hookTelemetry: {
          authTokenConfigured: boolean;
          endpointConfigured: boolean;
          endpointSource: string;
          producers: Array<string>;
          reason: string | null;
          status: string;
          telemetryDir: string;
        } | null;
        stack: {
          languages: Array<string>;
          nxWorkspace: boolean;
          packageManager: string | null;
          pnpmWorkspace: boolean;
          turbo: boolean;
        };
      } | null;
    };
    project: { id: string; name: string } | null;
    repository: {
      createdAt: string;
      defaultBranch: string | null;
      id: string;
      name: string;
      normalizedRemoteUrl: string | null;
      projectId: string | null;
      updatedAt: string;
      checkouts: Array<{
        createdAt: string;
        displayName: string;
        filesystemPath: string;
        foreignSkillInjectionEnabled: boolean;
        id: string;
        isForeign: boolean;
        kind: string;
        managed: boolean;
        repositoryId: string;
        scannedAt: string | null;
        updatedAt: string;
        userId: string;
        worktreeSkillOverlayEnabled: boolean;
        inspection: {
          scannedAt: string;
          warnings: Array<string>;
          agentConfig: {
            agentsMd: boolean;
            claudeMd: boolean;
            cursorRules: boolean;
            mcpJson: boolean;
            skillsDir: boolean;
          };
          git: {
            currentBranch: string | null;
            defaultBranch: string | null;
            dirty: boolean | null;
            isRepo: boolean;
            linkedWorktrees: Array<string>;
            normalizedRemoteUrl: string | null;
          };
          hookTelemetry: {
            authTokenConfigured: boolean;
            endpointConfigured: boolean;
            endpointSource: string;
            producers: Array<string>;
            reason: string | null;
            status: string;
            telemetryDir: string;
          } | null;
          stack: {
            languages: Array<string>;
            nxWorkspace: boolean;
            packageManager: string | null;
            pnpmWorkspace: boolean;
            turbo: boolean;
          };
        } | null;
      }>;
      project: { id: string; name: string } | null;
    };
  };
};

export type CloneRepositoryMutationVariables = Exact<{
  input: CloneRepositoryInput;
}>;

export type CloneRepositoryMutation = {
  cloneRepository: {
    projectCreated: boolean;
    reconciliation: WorkspaceFolderReconciliation;
    checkout: {
      createdAt: string;
      displayName: string;
      filesystemPath: string;
      foreignSkillInjectionEnabled: boolean;
      id: string;
      isForeign: boolean;
      kind: string;
      managed: boolean;
      repositoryId: string;
      scannedAt: string | null;
      updatedAt: string;
      userId: string;
      worktreeSkillOverlayEnabled: boolean;
      inspection: {
        scannedAt: string;
        warnings: Array<string>;
        agentConfig: {
          agentsMd: boolean;
          claudeMd: boolean;
          cursorRules: boolean;
          mcpJson: boolean;
          skillsDir: boolean;
        };
        git: {
          currentBranch: string | null;
          defaultBranch: string | null;
          dirty: boolean | null;
          isRepo: boolean;
          linkedWorktrees: Array<string>;
          normalizedRemoteUrl: string | null;
        };
        hookTelemetry: {
          authTokenConfigured: boolean;
          endpointConfigured: boolean;
          endpointSource: string;
          producers: Array<string>;
          reason: string | null;
          status: string;
          telemetryDir: string;
        } | null;
        stack: {
          languages: Array<string>;
          nxWorkspace: boolean;
          packageManager: string | null;
          pnpmWorkspace: boolean;
          turbo: boolean;
        };
      } | null;
    };
    project: { id: string; name: string } | null;
    repository: {
      createdAt: string;
      defaultBranch: string | null;
      id: string;
      name: string;
      normalizedRemoteUrl: string | null;
      projectId: string | null;
      updatedAt: string;
      checkouts: Array<{
        createdAt: string;
        displayName: string;
        filesystemPath: string;
        foreignSkillInjectionEnabled: boolean;
        id: string;
        isForeign: boolean;
        kind: string;
        managed: boolean;
        repositoryId: string;
        scannedAt: string | null;
        updatedAt: string;
        userId: string;
        worktreeSkillOverlayEnabled: boolean;
        inspection: {
          scannedAt: string;
          warnings: Array<string>;
          agentConfig: {
            agentsMd: boolean;
            claudeMd: boolean;
            cursorRules: boolean;
            mcpJson: boolean;
            skillsDir: boolean;
          };
          git: {
            currentBranch: string | null;
            defaultBranch: string | null;
            dirty: boolean | null;
            isRepo: boolean;
            linkedWorktrees: Array<string>;
            normalizedRemoteUrl: string | null;
          };
          hookTelemetry: {
            authTokenConfigured: boolean;
            endpointConfigured: boolean;
            endpointSource: string;
            producers: Array<string>;
            reason: string | null;
            status: string;
            telemetryDir: string;
          } | null;
          stack: {
            languages: Array<string>;
            nxWorkspace: boolean;
            packageManager: string | null;
            pnpmWorkspace: boolean;
            turbo: boolean;
          };
        } | null;
      }>;
      project: { id: string; name: string } | null;
    };
  };
};

export type RefreshCheckoutMutationVariables = Exact<{
  input: RefreshCheckoutInput;
}>;

export type RefreshCheckoutMutation = {
  refreshCheckout: {
    merged: boolean;
    supersededProjectId: string | null;
    checkout: {
      createdAt: string;
      displayName: string;
      filesystemPath: string;
      foreignSkillInjectionEnabled: boolean;
      id: string;
      isForeign: boolean;
      kind: string;
      managed: boolean;
      repositoryId: string;
      scannedAt: string | null;
      updatedAt: string;
      userId: string;
      worktreeSkillOverlayEnabled: boolean;
      inspection: {
        scannedAt: string;
        warnings: Array<string>;
        agentConfig: {
          agentsMd: boolean;
          claudeMd: boolean;
          cursorRules: boolean;
          mcpJson: boolean;
          skillsDir: boolean;
        };
        git: {
          currentBranch: string | null;
          defaultBranch: string | null;
          dirty: boolean | null;
          isRepo: boolean;
          linkedWorktrees: Array<string>;
          normalizedRemoteUrl: string | null;
        };
        hookTelemetry: {
          authTokenConfigured: boolean;
          endpointConfigured: boolean;
          endpointSource: string;
          producers: Array<string>;
          reason: string | null;
          status: string;
          telemetryDir: string;
        } | null;
        stack: {
          languages: Array<string>;
          nxWorkspace: boolean;
          packageManager: string | null;
          pnpmWorkspace: boolean;
          turbo: boolean;
        };
      } | null;
    };
    drift: {
      branchMoved: boolean;
      pathMissing: boolean;
      remoteChanged: boolean;
    };
    repository: {
      createdAt: string;
      defaultBranch: string | null;
      id: string;
      name: string;
      normalizedRemoteUrl: string | null;
      projectId: string | null;
      updatedAt: string;
      checkouts: Array<{
        createdAt: string;
        displayName: string;
        filesystemPath: string;
        foreignSkillInjectionEnabled: boolean;
        id: string;
        isForeign: boolean;
        kind: string;
        managed: boolean;
        repositoryId: string;
        scannedAt: string | null;
        updatedAt: string;
        userId: string;
        worktreeSkillOverlayEnabled: boolean;
        inspection: {
          scannedAt: string;
          warnings: Array<string>;
          agentConfig: {
            agentsMd: boolean;
            claudeMd: boolean;
            cursorRules: boolean;
            mcpJson: boolean;
            skillsDir: boolean;
          };
          git: {
            currentBranch: string | null;
            defaultBranch: string | null;
            dirty: boolean | null;
            isRepo: boolean;
            linkedWorktrees: Array<string>;
            normalizedRemoteUrl: string | null;
          };
          hookTelemetry: {
            authTokenConfigured: boolean;
            endpointConfigured: boolean;
            endpointSource: string;
            producers: Array<string>;
            reason: string | null;
            status: string;
            telemetryDir: string;
          } | null;
          stack: {
            languages: Array<string>;
            nxWorkspace: boolean;
            packageManager: string | null;
            pnpmWorkspace: boolean;
            turbo: boolean;
          };
        } | null;
      }>;
      project: { id: string; name: string } | null;
    };
  };
};

export type PruneWorktreeCheckoutsMutationVariables = Exact<{
  input: PruneWorktreeCheckoutsInput;
}>;

export type PruneWorktreeCheckoutsMutation = {
  pruneWorktreeCheckouts: {
    results: Array<{
      checkoutId: string;
      outcome: PruneWorktreeCheckoutOutcome;
      path: string | null;
    }>;
  };
};

export type RemovePlanRunWorktreeMutationVariables = Exact<{
  checkoutId: string;
}>;

export type RemovePlanRunWorktreeMutation = {
  removePlanRunWorktree: {
    branch: string | null;
    checkoutId: string;
    detail: string | null;
    outcome: PlanRunWorktreeTeardownOutcome;
    path: string;
  };
};

export type DeleteWorkspaceLocalRepositoryMutationVariables = Exact<{
  id: string;
}>;

export type DeleteWorkspaceLocalRepositoryMutation = {
  deleteWorkspaceLocalRepository: boolean;
};

export type RescanSettingsWorktreesQueryVariables = Exact<{
  [key: string]: never;
}>;

export type RescanSettingsWorktreesQuery = {
  discoveredWorktrees: { scannedAt: string };
};

export type GetRolloutFlagQueryVariables = Exact<{
  id: string;
}>;

export type GetRolloutFlagQuery = {
  rolloutFlag: {
    createdAt: string;
    description: string | null;
    enabled: boolean;
    id: string;
    key: string;
    kind: RolloutFlagKind;
    offVariation: number;
    targetRoles: Array<string>;
    updatedAt: string;
    fallthrough: { variations: Array<{ variation: number; weight: number }> };
    variations: Array<{
      description: string | null;
      name: string | null;
      valueJson: string;
    }>;
  } | null;
};

export type UpdateRolloutFlagMutationVariables = Exact<{
  input: UpdateRolloutFlagInput;
}>;

export type UpdateRolloutFlagMutation = {
  updateRolloutFlag: {
    createdAt: string;
    description: string | null;
    enabled: boolean;
    id: string;
    key: string;
    kind: RolloutFlagKind;
    offVariation: number;
    targetRoles: Array<string>;
    updatedAt: string;
    fallthrough: { variations: Array<{ variation: number; weight: number }> };
    variations: Array<{
      description: string | null;
      name: string | null;
      valueJson: string;
    }>;
  } | null;
};

export type RolloutFlagFieldsFragment = {
  createdAt: string;
  description: string | null;
  enabled: boolean;
  id: string;
  key: string;
  kind: RolloutFlagKind;
  offVariation: number;
  targetRoles: Array<string>;
  updatedAt: string;
  fallthrough: { variations: Array<{ variation: number; weight: number }> };
  variations: Array<{
    description: string | null;
    name: string | null;
    valueJson: string;
  }>;
};

export type ListRolloutFlagsQueryVariables = Exact<{ [key: string]: never }>;

export type ListRolloutFlagsQuery = {
  rolloutFlags: Array<{
    createdAt: string;
    description: string | null;
    enabled: boolean;
    id: string;
    key: string;
    kind: RolloutFlagKind;
    offVariation: number;
    targetRoles: Array<string>;
    updatedAt: string;
    fallthrough: { variations: Array<{ variation: number; weight: number }> };
    variations: Array<{
      description: string | null;
      name: string | null;
      valueJson: string;
    }>;
  }>;
};

export type CreateRolloutFlagMutationVariables = Exact<{
  input: CreateRolloutFlagInput;
}>;

export type CreateRolloutFlagMutation = {
  createRolloutFlag: {
    createdAt: string;
    description: string | null;
    enabled: boolean;
    id: string;
    key: string;
    kind: RolloutFlagKind;
    offVariation: number;
    targetRoles: Array<string>;
    updatedAt: string;
    fallthrough: { variations: Array<{ variation: number; weight: number }> };
    variations: Array<{
      description: string | null;
      name: string | null;
      valueJson: string;
    }>;
  };
};

export type DeleteRolloutFlagMutationVariables = Exact<{
  id: string;
}>;

export type DeleteRolloutFlagMutation = { deleteRolloutFlag: boolean };

export type WorkspaceLocalRepositoryFieldsFragment = {
  createdAt: string;
  displayName: string;
  filesystemPath: string;
  gitDefaultBranch: string | null;
  gitRemoteUrl: string | null;
  id: string;
  projectId: string | null;
  updatedAt: string;
  userId: string;
  project: { id: string; name: string } | null;
};

export type UserWorkspaceProfileFieldsFragment = {
  contactDisplayName: string | null;
  contactEmail: string | null;
  createdAt: string;
  enabledEditors: Array<WorkspaceEditorId>;
  updatedAt: string;
  userId: string;
};

export type GetWorkspaceSettingsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetWorkspaceSettingsQuery = {
  workspaceSettings: {
    localRepositories: Array<{
      createdAt: string;
      displayName: string;
      filesystemPath: string;
      gitDefaultBranch: string | null;
      gitRemoteUrl: string | null;
      id: string;
      projectId: string | null;
      updatedAt: string;
      userId: string;
      project: { id: string; name: string } | null;
    }>;
    profile: {
      contactDisplayName: string | null;
      contactEmail: string | null;
      createdAt: string;
      enabledEditors: Array<WorkspaceEditorId>;
      updatedAt: string;
      userId: string;
    };
  };
};

export type UpdateWorkspaceProfileMutationVariables = Exact<{
  input: UpdateWorkspaceProfileInput;
}>;

export type UpdateWorkspaceProfileMutation = {
  updateWorkspaceProfile: {
    contactDisplayName: string | null;
    contactEmail: string | null;
    createdAt: string;
    enabledEditors: Array<WorkspaceEditorId>;
    updatedAt: string;
    userId: string;
  };
};

export type ApplyWorkspaceEditorConfigurationMutationVariables = Exact<{
  input?: ApplyWorkspaceEditorConfigurationInput | null | undefined;
}>;

export type ApplyWorkspaceEditorConfigurationMutation = {
  applyWorkspaceEditorConfiguration: {
    applications: Array<{
      editor: WorkspaceEditorId;
      filesWritten: Array<string>;
      filesystemPath: string;
      repositoryId: string;
      warnings: Array<string>;
    }>;
  };
};

export type GetEditorPresenceQueryVariables = Exact<{ [key: string]: never }>;

export type GetEditorPresenceQuery = {
  editorPresence: {
    scannedAt: string;
    trusted: boolean;
    editors: Array<{
      editor: WorkspaceEditorId;
      presence: EditorPresenceState;
    }>;
  };
};

export type SkillDetailUsageBySkillFragment = {
  abandonedCount: number;
  avgDurationMs: number | null;
  count: number;
  errorCount: number;
  lastUsedAt: string | null;
  outcomeCount: number;
  scope: string;
  sessionEndedCount: number;
  skillName: string;
  successCount: number;
};

export type SkillDetailUsageByDayFragment = {
  date: string;
  injectedCount: number;
  oursCount: number;
  personalCount: number;
  thirdPartyCount: number;
  totalCount: number;
};

export type GetSkillDetailUsageQueryVariables = Exact<{
  start: string;
  end: string;
  skillName: string;
}>;

export type GetSkillDetailUsageQuery = {
  skillUsage: {
    byDay: Array<{
      date: string;
      injectedCount: number;
      oursCount: number;
      personalCount: number;
      thirdPartyCount: number;
      totalCount: number;
    }>;
    bySkill: Array<{
      abandonedCount: number;
      avgDurationMs: number | null;
      count: number;
      errorCount: number;
      lastUsedAt: string | null;
      outcomeCount: number;
      scope: string;
      sessionEndedCount: number;
      skillName: string;
      successCount: number;
    }>;
  };
};

export type ProjectSkillsQueryVariables = Exact<{
  projectId?: string | null | undefined;
}>;

export type ProjectSkillsQuery = {
  projectSkills: {
    orphanSlugs: Array<string>;
    totalCount: number;
    skills: Array<{
      description: string | null;
      orphanedAt: string | null;
      slug: string;
      source: string;
      sourceUrl: string | null;
      staticDisableModelInvocation: boolean | null;
      tags: Array<string>;
    }>;
  };
};

export type SkillAvailabilityQueryVariables = Exact<{
  projectId?: string | null | undefined;
  environment?: string | null | undefined;
}>;

export type SkillAvailabilityQuery = {
  skillAvailability: {
    totalCount: number;
    warnings: Array<string>;
    skills: Array<{
      effectiveDisableModelInvocation: boolean;
      provenance: string;
      slug: string;
      staticDisableModelInvocation: boolean | null;
    }>;
  };
};

export type SkillAvailabilityProjectsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type SkillAvailabilityProjectsQuery = {
  projects: Array<{ id: string; name: string; nxProjectName: string | null }>;
};

export type SkillAvailabilityAuthoringRuleSetQueryVariables = Exact<{
  projectId: string;
}>;

export type SkillAvailabilityAuthoringRuleSetQuery = {
  skillAvailabilityRuleSet: {
    posture: string;
    rules: Array<{
      environment: string | null;
      id: string;
      slugAllow: Array<string>;
      slugDeny: Array<string>;
      tagAllow: Array<string>;
      tagDeny: Array<string>;
    }>;
  } | null;
};

export type SkillAvailabilityAuthoringVocabularyQueryVariables = Exact<{
  [key: string]: never;
}>;

export type SkillAvailabilityAuthoringVocabularyQuery = {
  skillTagVocabulary: {
    totalCount: number;
    tags: Array<{ id: string; tag: string }>;
  };
};

export type UpsertSkillAvailabilityRuleSetMutationVariables = Exact<{
  projectId: string;
  posture: string;
}>;

export type UpsertSkillAvailabilityRuleSetMutation = {
  upsertSkillAvailabilityRuleSet: { posture: string };
};

export type DeleteSkillAvailabilityRuleSetMutationVariables = Exact<{
  projectId: string;
}>;

export type DeleteSkillAvailabilityRuleSetMutation = {
  deleteSkillAvailabilityRuleSet: boolean;
};

export type AddSkillAvailabilityRuleMutationVariables = Exact<{
  projectId: string;
  input: SkillAvailabilityRuleInput;
}>;

export type AddSkillAvailabilityRuleMutation = {
  addSkillAvailabilityRule: { id: string };
};

export type UpdateSkillAvailabilityRuleMutationVariables = Exact<{
  ruleId: string;
  input: SkillAvailabilityRuleInput;
}>;

export type UpdateSkillAvailabilityRuleMutation = {
  updateSkillAvailabilityRule: { id: string };
};

export type RemoveSkillAvailabilityRuleMutationVariables = Exact<{
  ruleId: string;
}>;

export type RemoveSkillAvailabilityRuleMutation = {
  removeSkillAvailabilityRule: boolean;
};

export type AddSkillTagMutationVariables = Exact<{
  input: AddSkillTagInput;
}>;

export type AddSkillTagMutation = { addSkillTag: { id: string; tag: string } };

export type RenameSkillTagMutationVariables = Exact<{
  input: RenameSkillTagInput;
}>;

export type RenameSkillTagMutation = {
  renameSkillTag: { id: string; tag: string };
};

export type RemoveSkillTagMutationVariables = Exact<{
  input: RemoveSkillTagInput;
}>;

export type RemoveSkillTagMutation = { removeSkillTag: boolean };

export type TimelineSpanRowFragment = {
  backend: string | null;
  branch: string | null;
  checkoutId: string | null;
  conversationId: string | null;
  derivedEnd: boolean;
  endsAt: string;
  id: string;
  kind: TimelineSpanKind;
  laneKey: string;
  laneLabel: string;
  model: string | null;
  planId: string | null;
  startsAt: string;
  status: string | null;
  title: string;
};

export type TimelineMarkerRowFragment = {
  at: string;
  branch: string | null;
  id: string;
  kind: TimelineMarkerKind;
  laneKey: string;
  laneLabel: string;
  planId: string | null;
  taskId: string | null;
  title: string;
  url: string | null;
  userId: string | null;
};

export type GetWorkstreamTimelineQueryVariables = Exact<{
  input: WorkstreamTimelineInput;
}>;

export type GetWorkstreamTimelineQuery = {
  workstreamTimeline: {
    from: string;
    to: string;
    markers: Array<{
      at: string;
      branch: string | null;
      id: string;
      kind: TimelineMarkerKind;
      laneKey: string;
      laneLabel: string;
      planId: string | null;
      taskId: string | null;
      title: string;
      url: string | null;
      userId: string | null;
    }>;
    spans: Array<{
      backend: string | null;
      branch: string | null;
      checkoutId: string | null;
      conversationId: string | null;
      derivedEnd: boolean;
      endsAt: string;
      id: string;
      kind: TimelineSpanKind;
      laneKey: string;
      laneLabel: string;
      model: string | null;
      planId: string | null;
      startsAt: string;
      status: string | null;
      title: string;
    }>;
    truncation: Array<{ kind: string; returned: number; truncated: boolean }>;
  };
};

export type UsageDailyStatsRowFragment = {
  date: string;
  plansCompleted: number;
  plansCreated: number;
  plansUpdated: number;
  tasksCompleted: number;
  tasksCreated: number;
  tasksUpdated: number;
};

export type GetUsageDailyStatsQueryVariables = Exact<{
  start: string;
  end: string;
}>;

export type GetUsageDailyStatsQuery = {
  dailyStatsRange: {
    items: Array<{
      date: string;
      plansCompleted: number;
      plansCreated: number;
      plansUpdated: number;
      tasksCompleted: number;
      tasksCreated: number;
      tasksUpdated: number;
    }>;
  };
};

export type UsageTokenUsageRowFragment = {
  agentAccountId: string | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  costUsd: number | null;
  createdAt: string;
  id: string;
  inputTokens: number | null;
  model: string | null;
  outputTokens: number | null;
  provider: string;
  reasoningTokens: number | null;
  source: string | null;
  totalTokens: number | null;
};

export type UsageTokenUsageTotalsFragment = {
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  turnCount: number;
};

export type UsageTokenUsageAccountFragment = {
  credentialKind: string;
  email: string | null;
  id: string;
  lastSeenAt: string;
  orgName: string | null;
  plan: string | null;
  provider: string;
};

export type UsageTokenUsageByAccountFragment = {
  provider: string;
  account: {
    credentialKind: string;
    email: string | null;
    id: string;
    lastSeenAt: string;
    orgName: string | null;
    plan: string | null;
    provider: string;
  } | null;
  totals: {
    cacheReadTokens: number;
    cacheWriteTokens: number;
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    turnCount: number;
  };
};

export type GetUsageTokenUsageQueryVariables = Exact<{
  start: string;
  end: string;
  provider?: string | null | undefined;
  accountId?: string | null | undefined;
}>;

export type GetUsageTokenUsageQuery = {
  tokenUsage: {
    byAccount: Array<{
      provider: string;
      account: {
        credentialKind: string;
        email: string | null;
        id: string;
        lastSeenAt: string;
        orgName: string | null;
        plan: string | null;
        provider: string;
      } | null;
      totals: {
        cacheReadTokens: number;
        cacheWriteTokens: number;
        costUsd: number;
        inputTokens: number;
        outputTokens: number;
        reasoningTokens: number;
        totalTokens: number;
        turnCount: number;
      };
    }>;
    items: Array<{
      agentAccountId: string | null;
      cacheReadTokens: number | null;
      cacheWriteTokens: number | null;
      costUsd: number | null;
      createdAt: string;
      id: string;
      inputTokens: number | null;
      model: string | null;
      outputTokens: number | null;
      provider: string;
      reasoningTokens: number | null;
      source: string | null;
      totalTokens: number | null;
    }>;
    totals: {
      cacheReadTokens: number;
      cacheWriteTokens: number;
      costUsd: number;
      inputTokens: number;
      outputTokens: number;
      reasoningTokens: number;
      totalTokens: number;
      turnCount: number;
    };
  };
};

export type UsageSkillUsageBySkillFragment = {
  abandonedCount: number;
  avgDurationMs: number | null;
  count: number;
  errorCount: number;
  outcomeCount: number;
  scope: string;
  sessionEndedCount: number;
  skillName: string;
  successCount: number;
};

export type UsageSkillUsageByScopeFragment = { count: number; scope: string };

export type UsageSkillUsageByDayFragment = {
  date: string;
  injectedCount: number;
  oursCount: number;
  personalCount: number;
  thirdPartyCount: number;
  totalCount: number;
};

export type UsageSkillUsageFilterOptionsFragment = {
  cwds: Array<string>;
  gitBranches: Array<string>;
  repoIdentities: Array<string>;
};

export type GetUsageSkillUsageQueryVariables = Exact<{
  start: string;
  end: string;
  scope?: string | null | undefined;
  gitBranch?: string | null | undefined;
  cwd?: string | null | undefined;
  repoIdentity?: string | null | undefined;
}>;

export type GetUsageSkillUsageQuery = {
  skillUsage: {
    totalCount: number;
    byDay: Array<{
      date: string;
      injectedCount: number;
      oursCount: number;
      personalCount: number;
      thirdPartyCount: number;
      totalCount: number;
    }>;
    byScope: Array<{ count: number; scope: string }>;
    bySkill: Array<{
      abandonedCount: number;
      avgDurationMs: number | null;
      count: number;
      errorCount: number;
      outcomeCount: number;
      scope: string;
      sessionEndedCount: number;
      skillName: string;
      successCount: number;
    }>;
    filterOptions: {
      cwds: Array<string>;
      gitBranches: Array<string>;
      repoIdentities: Array<string>;
    };
  };
};

export type UsageCaptureHealthRowFragment = {
  lastCapturedAt: string;
  source: string;
  stream: string;
};

export type GetUsageCaptureHealthQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetUsageCaptureHealthQuery = {
  captureHealth: Array<{
    lastCapturedAt: string;
    source: string;
    stream: string;
  }>;
};

export type UsageTelemetryCoverageRepoFragment = {
  repoIdentity: string | null;
  deliveryLegs: Array<{ deliveryLeg: string; lastSeenAt: string }>;
};

export type UsageTelemetryCoverageMachineFragment = {
  deliveryLegsSeen: Array<string>;
  lastSeenAt: string;
  machineId: string;
  machineLabel: string | null;
  marketplacePluginInstalled: boolean | null;
  marketplacePluginVersion: string | null;
  pluginVersion: string | null;
  buffer: {
    deadLetterCount: number;
    oldestBufferedAt: string | null;
    totalBuffered: number;
  };
  repos: Array<{
    repoIdentity: string | null;
    deliveryLegs: Array<{ deliveryLeg: string; lastSeenAt: string }>;
  }>;
  warnings: Array<{ kind: string; message: string }>;
};

export type GetUsageTelemetryCoverageQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetUsageTelemetryCoverageQuery = {
  telemetryCoverage: {
    currentPluginVersion: string | null;
    generatedAt: string;
    windowDays: number;
    machines: Array<{
      deliveryLegsSeen: Array<string>;
      lastSeenAt: string;
      machineId: string;
      machineLabel: string | null;
      marketplacePluginInstalled: boolean | null;
      marketplacePluginVersion: string | null;
      pluginVersion: string | null;
      buffer: {
        deadLetterCount: number;
        oldestBufferedAt: string | null;
        totalBuffered: number;
      };
      repos: Array<{
        repoIdentity: string | null;
        deliveryLegs: Array<{ deliveryLeg: string; lastSeenAt: string }>;
      }>;
      warnings: Array<{ kind: string; message: string }>;
    }>;
  };
};

export type ForgetUsageTelemetryMachineMutationVariables = Exact<{
  machineId: string;
}>;

export type ForgetUsageTelemetryMachineMutation = {
  forgetTelemetryMachine: number;
};

export type ScheduleFormAgentClisQueryVariables = Exact<{
  [key: string]: never;
}>;

export type ScheduleFormAgentClisQuery = {
  discoverAgentClis: {
    agents: Array<{
      attachesWorkspaceMcp: boolean;
      backend: string;
      label: string;
    }>;
  };
};

export type SkillsRecordTagVocabularyQueryVariables = Exact<{
  [key: string]: never;
}>;

export type SkillsRecordTagVocabularyQuery = {
  skillTagVocabulary: {
    totalCount: number;
    tags: Array<{ dimension: string; id: string; tag: string }>;
  };
};

export type AddProjectSkillTagMutationVariables = Exact<{
  input: AddProjectSkillTagInput;
}>;

export type AddProjectSkillTagMutation = {
  addProjectSkillTag: { slug: string; tags: Array<string> };
};

export type RemoveProjectSkillTagMutationVariables = Exact<{
  input: RemoveProjectSkillTagInput;
}>;

export type RemoveProjectSkillTagMutation = { removeProjectSkillTag: boolean };

export type RemoveProjectSkillMutationVariables = Exact<{
  projectId?: string | null | undefined;
  slug: string;
}>;

export type RemoveProjectSkillMutation = { removeProjectSkill: boolean };

export const BackgroundActivityFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BackgroundActivityFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BackgroundActivityObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'done' } },
          { kind: 'Field', name: { kind: 'Name', value: 'etaSeconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'label' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'total' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BackgroundActivityFieldsFragment, unknown>;
export const HealthCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HealthCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ServerHealthObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'api' } },
          { kind: 'Field', name: { kind: 'Name', value: 'database' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis' } },
          { kind: 'Field', name: { kind: 'Name', value: 'websocket' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<HealthCardFragment, unknown>;
export const NotificationFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'NotificationFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'NotificationEvent' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'event' } },
          { kind: 'Field', name: { kind: 'Name', value: 'link' } },
          { kind: 'Field', name: { kind: 'Name', value: 'message' } },
          { kind: 'Field', name: { kind: 'Name', value: 'severity' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'DebugNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'dataJson' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PlanEnqueuedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'queuePosition' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'queueTotal' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PlanUpdatedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'TaskCompletedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'QueueJobCompletedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'jobType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: 'PlanWaitingForWorktreeNotification',
              },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'retryDelayMs' },
                },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PlanStatusChangedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ScheduledRunFailedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                { kind: 'Field', name: { kind: 'Name', value: 'runCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'runId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduledAgentJobId' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduleName' },
                },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SystemAlertNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'code' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'TaskStatusChangedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<NotificationFieldsFragment, unknown>;
export const RootMetricsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RootMetrics' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ServerMetricsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cpuSystemMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cpuUserMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'externalMb' } },
          { kind: 'Field', name: { kind: 'Name', value: 'heapTotalMb' } },
          { kind: 'Field', name: { kind: 'Name', value: 'heapUsedMb' } },
          { kind: 'Field', name: { kind: 'Name', value: 'rssMb' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RootMetricsFragment, unknown>;
export const BlogPostEditorPostFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostEditorPost' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostAdminObject' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'bodyMarkdown' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastEditedBy' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'seoDescription' } },
          { kind: 'Field', name: { kind: 'Name', value: 'seoTitle' } },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogPostEditorPostFragment, unknown>;
export const BlogPostListRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostListRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostAdminObject' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastEditedBy' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogPostListRowFragment, unknown>;
export const DashboardActivityCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'DashboardActivityCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ActivityByDateResultObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'commits' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planTitle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'repo' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sha' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskTitle' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'hasNext' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'outputChunks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'iteration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planTitle' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tasksUpdated' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planTitle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DashboardActivityCardFragment, unknown>;
export const DashboardQueueStatsCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'DashboardQueueStatsCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'activeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delayedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'waitingCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DashboardQueueStatsCardFragment, unknown>;
export const DashboardDailyStatsCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'DashboardDailyStatsCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'DailyStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'date' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansCompleted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansCreated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansUpdated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksCompleted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksCreated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksUpdated' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DashboardDailyStatsCardFragment, unknown>;
export const EvalRunListRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'EvalRunListRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'EvalRun' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'authMode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'datasetId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'datasetVersion' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driver' } },
          { kind: 'Field', name: { kind: 'Name', value: 'effort' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'k' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'promptSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<EvalRunListRowFragment, unknown>;
export const EvalRunReportFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'EvalRunReportFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'EvalRunReport' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cases' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'attemptsCounted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'attemptsPassed' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'caseId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'passed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'split' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'datasetName' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'graders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'calibrationStatus' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'counts' } },
                { kind: 'Field', name: { kind: 'Name', value: 'graderId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'graderKind' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'graderVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'judgeModel' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'judgeModelVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'kappa' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kappaCiHigh' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kappaCiLow' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'numbers' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'casesAtK' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'casesCounted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'costPerSuccessUsd' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'detectionFloor' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'excluded' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'errored' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'gradeError' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'noCountedGrade' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'usageLimited' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'judgeAgreement' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'graderId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'graderVersion' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'kappa' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'kappaCiHigh' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'kappaCiLow' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'passAtK' } },
                { kind: 'Field', name: { kind: 'Name', value: 'passHatK' } },
                { kind: 'Field', name: { kind: 'Name', value: 'passRate' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'passRateCi' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'confidence' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'lower' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'upper' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'totalCostUsd' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trialsCounted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trialsExcluded' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trialsPassed' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'run' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'authMode' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'budgetTokens' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'budgetUsd' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'datasetId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'datasetVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'driver' } },
                { kind: 'Field', name: { kind: 'Name', value: 'effort' } },
                { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'k' } },
                { kind: 'Field', name: { kind: 'Name', value: 'model' } },
                { kind: 'Field', name: { kind: 'Name', value: 'promptSha' } },
                { kind: 'Field', name: { kind: 'Name', value: 'skillSha' } },
                { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<EvalRunReportFieldsFragment, unknown>;
export const GeneratorDetailCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'GeneratorDetailCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'GeneratorDetailObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'schemaJson' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GeneratorDetailCardFragment, unknown>;
export const GeneratorCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'GeneratorCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'GeneratorObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GeneratorCardFragment, unknown>;
export const NoteCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'NoteCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'NoteObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<NoteCardFragment, unknown>;
export const HookTaskFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HookTask' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<HookTaskFragment, unknown>;
export const ProjectDetailsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ProjectDetailsFragment, unknown>;
export const PlanTagChipFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlanTagChipFragment, unknown>;
export const PlanDetailsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'afterHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'beforeHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ProjectDetails' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runnableTaskCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanTagChip' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HookTask' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlanDetailsFragment, unknown>;
export const PlanRunConfigRepositoryFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanRunConfigRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'inspection' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'git' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'currentBranch' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'defaultBranch' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlanRunConfigRepositoryFieldsFragment, unknown>;
export const LinkedArtifactFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'LinkedArtifact' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'WorkArtifactObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'externalKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifecycle' } },
          { kind: 'Field', name: { kind: 'Name', value: 'message' } },
          { kind: 'Field', name: { kind: 'Name', value: 'payloadJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'producedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'verification' } },
          { kind: 'Field', name: { kind: 'Name', value: 'verifiedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<LinkedArtifactFragment, unknown>;
export const PlanInboxMessageFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanInboxMessage' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanMessageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'body' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredToTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlanInboxMessageFragment, unknown>;
export const PlanTaskRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTaskRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'wave' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlanTaskRowFragment, unknown>;
export const TaskTagChipFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TaskTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TaskTagChipFragment, unknown>;
export const TaskDetailsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TaskDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'afterHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'beforeHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'PlanTaskRow' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'TaskTagChip' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HookTask' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTaskRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'wave' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TaskTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TaskDetailsFragment, unknown>;
export const AgentTrajectorySummaryFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'AgentTrajectorySummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'AgentTrajectory' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'byteSize' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cachedTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driver' } },
          { kind: 'Field', name: { kind: 'Name', value: 'durationMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'incomplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outcome' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'schemaVersion' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'toolCallCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'truncated' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AgentTrajectorySummaryFragment, unknown>;
export const AgentTrajectoryLabelRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'AgentTrajectoryLabelRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'AgentTrajectoryLabel' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failureType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'note' } },
          { kind: 'Field', name: { kind: 'Name', value: 'rater' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trajectoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'verdict' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AgentTrajectoryLabelRowFragment, unknown>;
export const PlanCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'hasCustomRunConfig' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'taskCount' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tasksCompletedCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlanCardFragment, unknown>;
export const ProjectPageDetailsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectPageDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nxProjectName' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'source' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ProjectPageDetailsFragment, unknown>;
export const ProjectTagChipFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ProjectTagChipFragment, unknown>;
export const ProjectCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nxProjectName' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'plans' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tasks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ProjectCardFragment, unknown>;
export const PromptDetailsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PromptDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'CustomPromptObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filePath' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'labels' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'promptType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PromptDetailsFragment, unknown>;
export const PromptCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PromptCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'CustomPromptObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filePath' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'labels' } },
          { kind: 'Field', name: { kind: 'Name', value: 'promptType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PromptCardFragment, unknown>;
export const PullRequestCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PullRequestCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PullListItemObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'baseRef' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'headRef' } },
          { kind: 'Field', name: { kind: 'Name', value: 'headSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'htmlUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mergedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'number' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PullRequestCardFragment, unknown>;
export const PullRequestDetailFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PullRequestDetail' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PullListItemObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'PullRequestCard' },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PullRequestCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PullListItemObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'baseRef' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'headRef' } },
          { kind: 'Field', name: { kind: 'Name', value: 'headSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'htmlUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mergedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'number' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PullRequestDetailFragment, unknown>;
export const JobDetailsCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobDetailsCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          { kind: 'Field', name: { kind: 'Name', value: 'executionBackend' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'taskRunMetrics' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'atEnd' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'heapUsedMb' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'rssMb' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'atStart' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'heapUsedMb' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'rssMb' } },
                    ],
                  },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<JobDetailsCardFragment, unknown>;
export const QueueJobLogEventFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueJobLogEvent' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueJobLogEventObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cursor' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'level' } },
          { kind: 'Field', name: { kind: 'Name', value: 'message' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueueJobLogEventFragment, unknown>;
export const QueueJobDetailsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueJobDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueueJobDetailsFragment, unknown>;
export const QueueDetailsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueDetailsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'activeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delayedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedCount' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobs' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'hasNext' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobs' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'QueueJobDetails' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'total' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'waitingCount' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueJobDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueueDetailsFragment, unknown>;
export const QueueCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'activeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delayedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'waitingCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueueCardFragment, unknown>;
export const UsageBranchOptionFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageBranchOption' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageGitBranchObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageBranchOptionFragment, unknown>;
export const TagActionRuleRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TagActionRuleRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TagActionRuleObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'actionPayloadJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'actionType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'environment' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tagAll' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TagActionRuleRowFragment, unknown>;
export const ScheduledJobRunRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobRunRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorMessage' } },
          { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledFor' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trigger' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ScheduledJobRunRowFragment, unknown>;
export const ScheduledJobCardFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cronPattern' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'intervalMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nextRunAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduleKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timezone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ScheduledJobCardFragment, unknown>;
export const ScheduledJobDetailFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobDetail' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cwd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'misfirePolicy' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'misfireThresholdMs' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'ScheduledJobCard' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'settingsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeoutMs' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cronPattern' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'intervalMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nextRunAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduleKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timezone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ScheduledJobDetailFragment, unknown>;
export const ScheduledJobRunDetailFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobRunDetail' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorMessage' } },
          { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'resolvedCwd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobId' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'settingsSnapshotJson' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trigger' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ScheduledJobRunDetailFragment, unknown>;
export const ScheduleInFlightRunFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduleInFlightRun' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'job' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trigger' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ScheduleInFlightRunFragment, unknown>;
export const ScheduleRunStatsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduleRunStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cancelledCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inFlightCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'noOpCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queuedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runningCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'since' } },
          { kind: 'Field', name: { kind: 'Name', value: 'succeededCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'windowTotalCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ScheduleRunStatsFragment, unknown>;
export const ServiceAccountCredentialFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ServiceAccountCredentialFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ServiceAccountCredentialObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'label' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'revokedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'serviceAccountId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ServiceAccountCredentialFieldsFragment, unknown>;
export const ServiceAccountListItemFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ServiceAccountListItem' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ServiceAccountObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'disabledAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ServiceAccountListItemFragment, unknown>;
export const McpConnectorFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'McpConnectorFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'McpConnectorObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'authType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'docsUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endpointUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'iconHint' } },
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
          { kind: 'Field', name: { kind: 'Name', value: 'transport' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<McpConnectorFieldsFragment, unknown>;
export const McpConnectorConnectionFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'McpConnectorConnectionFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'McpConnectorConnectionObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'authType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connectedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connectorKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'credentialLabel' } },
          { kind: 'Field', name: { kind: 'Name', value: 'credentialPrefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<McpConnectorConnectionFieldsFragment, unknown>;
export const UserPreferencesFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserPreferencesFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'UserPreferencesObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'defaultAgent' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
                { kind: 'Field', name: { kind: 'Name', value: 'effort' } },
                { kind: 'Field', name: { kind: 'Name', value: 'model' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultEditor' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UserPreferencesFieldsFragment, unknown>;
export const DiscoveredWorktreeFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'DiscoveredWorktreeFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'DiscoveredWorktreeObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'activity' } },
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkoutId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'path' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runMonitored' } },
          { kind: 'Field', name: { kind: 'Name', value: 'safeToRemove' } },
          { kind: 'Field', name: { kind: 'Name', value: 'unregistered' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DiscoveredWorktreeFieldsFragment, unknown>;
export const RepositoryCheckoutFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryCheckoutObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'foreignSkillInjectionEnabled' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inspection' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agentConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'agentsMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'claudeMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursorRules' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mcpJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skillsDir' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'git' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentBranch' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultBranch' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'dirty' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkedWorktrees' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'normalizedRemoteUrl' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hookTelemetry' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authTokenConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointSource' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producers' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'telemetryDir' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stack' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'languages' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nxWorkspace' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'packageManager' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pnpmWorkspace' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'turbo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'isForeign' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'worktreeSkillOverlayEnabled' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RepositoryCheckoutFieldsFragment, unknown>;
export const WorkspaceRepositoryFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryCheckoutObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'foreignSkillInjectionEnabled' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inspection' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agentConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'agentsMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'claudeMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursorRules' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mcpJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skillsDir' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'git' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentBranch' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultBranch' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'dirty' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkedWorktrees' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'normalizedRemoteUrl' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hookTelemetry' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authTokenConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointSource' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producers' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'telemetryDir' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stack' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'languages' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nxWorkspace' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'packageManager' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pnpmWorkspace' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'turbo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'isForeign' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'worktreeSkillOverlayEnabled' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<WorkspaceRepositoryFieldsFragment, unknown>;
export const RolloutFlagFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RolloutFlagFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RolloutFlagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'fallthrough' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'variations' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'variation' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'weight' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'offVariation' } },
          { kind: 'Field', name: { kind: 'Name', value: 'targetRoles' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'variations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'valueJson' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RolloutFlagFieldsFragment, unknown>;
export const WorkspaceLocalRepositoryFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'WorkspaceLocalRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'WorkspaceLocalRepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          { kind: 'Field', name: { kind: 'Name', value: 'gitDefaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'gitRemoteUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<WorkspaceLocalRepositoryFieldsFragment, unknown>;
export const UserWorkspaceProfileFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserWorkspaceProfileFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'UserWorkspaceProfileObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'contactDisplayName' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'contactEmail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabledEditors' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UserWorkspaceProfileFieldsFragment, unknown>;
export const SkillDetailUsageBySkillFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'SkillDetailUsageBySkill' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageBySkillObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'abandonedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avgDurationMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outcomeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sessionEndedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'successCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SkillDetailUsageBySkillFragment, unknown>;
export const SkillDetailUsageByDayFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'SkillDetailUsageByDay' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageByDayObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'date' } },
          { kind: 'Field', name: { kind: 'Name', value: 'injectedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'oursCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'personalCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'thirdPartyCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SkillDetailUsageByDayFragment, unknown>;
export const TimelineSpanRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TimelineSpanRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TimelineSpanObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkoutId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'conversationId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'derivedEnd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endsAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'laneKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'laneLabel' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startsAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TimelineSpanRowFragment, unknown>;
export const TimelineMarkerRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TimelineMarkerRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TimelineMarkerObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'at' } },
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'laneKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'laneLabel' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'url' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TimelineMarkerRowFragment, unknown>;
export const UsageDailyStatsRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageDailyStatsRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'DailyStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'date' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansCompleted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansCreated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansUpdated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksCompleted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksCreated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksUpdated' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageDailyStatsRowFragment, unknown>;
export const UsageTokenUsageRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTokenUsageRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageRowObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'agentAccountId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageTokenUsageRowFragment, unknown>;
export const UsageTokenUsageAccountFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTokenUsageAccount' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageAccountObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'credentialKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastSeenAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'orgName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plan' } },
          { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageTokenUsageAccountFragment, unknown>;
export const UsageTokenUsageTotalsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTokenUsageTotals' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageTotalsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'turnCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageTokenUsageTotalsFragment, unknown>;
export const UsageTokenUsageByAccountFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTokenUsageByAccount' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageByAccountObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'account' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UsageTokenUsageAccount' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'totals' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UsageTokenUsageTotals' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTokenUsageAccount' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageAccountObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'credentialKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastSeenAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'orgName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plan' } },
          { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTokenUsageTotals' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageTotalsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'turnCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageTokenUsageByAccountFragment, unknown>;
export const UsageSkillUsageBySkillFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageSkillUsageBySkill' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageBySkillObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'abandonedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avgDurationMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outcomeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sessionEndedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'successCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageSkillUsageBySkillFragment, unknown>;
export const UsageSkillUsageByScopeFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageSkillUsageByScope' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageByScopeObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scope' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageSkillUsageByScopeFragment, unknown>;
export const UsageSkillUsageByDayFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageSkillUsageByDay' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageByDayObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'date' } },
          { kind: 'Field', name: { kind: 'Name', value: 'injectedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'oursCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'personalCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'thirdPartyCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageSkillUsageByDayFragment, unknown>;
export const UsageSkillUsageFilterOptionsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageSkillUsageFilterOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageFilterOptionsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cwds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'gitBranches' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repoIdentities' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageSkillUsageFilterOptionsFragment, unknown>;
export const UsageCaptureHealthRowFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageCaptureHealthRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'CaptureHealthRowObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'lastCapturedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stream' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageCaptureHealthRowFragment, unknown>;
export const UsageTelemetryCoverageRepoFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTelemetryCoverageRepo' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TelemetryRepoCoverageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deliveryLegs' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'deliveryLeg' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastSeenAt' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'repoIdentity' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageTelemetryCoverageRepoFragment, unknown>;
export const UsageTelemetryCoverageMachineFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTelemetryCoverageMachine' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TelemetryMachineCoverageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'buffer' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'deadLetterCount' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'oldestBufferedAt' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'totalBuffered' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveryLegsSeen' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastSeenAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'machineId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'machineLabel' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'marketplacePluginInstalled' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'marketplacePluginVersion' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'pluginVersion' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repos' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UsageTelemetryCoverageRepo' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'warnings' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTelemetryCoverageRepo' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TelemetryRepoCoverageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deliveryLegs' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'deliveryLeg' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastSeenAt' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'repoIdentity' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UsageTelemetryCoverageMachineFragment, unknown>;
export const GetMyPermissionsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getMyPermissions' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'myPermissions' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetMyPermissionsQuery,
  GetMyPermissionsQueryVariables
>;
export const GetMyUserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getMyUser' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'me' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'disabledAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'githubUsername' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetMyUserQuery, GetMyUserQueryVariables>;
export const GetMyDefaultEditorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getMyDefaultEditor' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'userPreferences' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'defaultEditor' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetMyDefaultEditorQuery,
  GetMyDefaultEditorQueryVariables
>;
export const EvaluateFeatureFlagsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'evaluateFeatureFlags' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'anonymousId' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'applicationKey' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'evaluateFeatureFlags' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'anonymousId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'anonymousId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'applicationKey' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'applicationKey' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
                { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                { kind: 'Field', name: { kind: 'Name', value: 'valueJson' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'variationIndex' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  EvaluateFeatureFlagsQuery,
  EvaluateFeatureFlagsQueryVariables
>;
export const GetRootHealthDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getRootHealth' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'backgroundActivities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'BackgroundActivityFields' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'serverHealth' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HealthCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BackgroundActivityFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BackgroundActivityObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'done' } },
          { kind: 'Field', name: { kind: 'Name', value: 'etaSeconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'label' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'total' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HealthCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ServerHealthObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'api' } },
          { kind: 'Field', name: { kind: 'Name', value: 'database' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis' } },
          { kind: 'Field', name: { kind: 'Name', value: 'websocket' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetRootHealthQuery, GetRootHealthQueryVariables>;
export const GetRootMetricsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getRootMetrics' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'serverMetrics' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RootMetrics' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RootMetrics' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ServerMetricsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cpuSystemMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cpuUserMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'externalMb' } },
          { kind: 'Field', name: { kind: 'Name', value: 'heapTotalMb' } },
          { kind: 'Field', name: { kind: 'Name', value: 'heapUsedMb' } },
          { kind: 'Field', name: { kind: 'Name', value: 'rssMb' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetRootMetricsQuery, GetRootMetricsQueryVariables>;
export const ListAgentConversationsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'listAgentConversations' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'ListAgentConversationsInput' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'listAgentConversations' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'conversations' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ListAgentConversationsQuery,
  ListAgentConversationsQueryVariables
>;
export const DeleteAgentConversationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'deleteAgentConversation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'DeleteAgentConversationInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteAgentConversation' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DeleteAgentConversationMutation,
  DeleteAgentConversationMutationVariables
>;
export const UpdateAgentConversationTitleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateAgentConversationTitle' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: 'UpdateAgentConversationTitleInput',
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateAgentConversationTitle' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateAgentConversationTitleMutation,
  UpdateAgentConversationTitleMutationVariables
>;
export const GetAgentConversationMessagesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getAgentConversationMessages' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: 'GetAgentConversationMessagesInput',
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'getAgentConversationMessages' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'messages' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'content' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdAt' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'routingConfidence' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'routingReason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'toolMetadataJson' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetAgentConversationMessagesQuery,
  GetAgentConversationMessagesQueryVariables
>;
export const LoginDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'login' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'LoginInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'login' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const LogoutDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'logout' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'signout' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
export const RegisterDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'register' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RegisterInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'register' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const SendAgentMessageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'sendAgentMessage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'AgentsRunChatTurnInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'agentsRunChatTurn' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'assistantText' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'conversationId' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'errorMessage' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'mcpTool' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'readOnlyAgentsChat' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'routingConfidence' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'routingReason' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'structuredPayloadJson' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'toolMetadataJson' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SendAgentMessageMutation,
  SendAgentMessageMutationVariables
>;
export const NotificationsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'Notifications' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'notifications' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'NotificationFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'NotificationFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'NotificationEvent' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'event' } },
          { kind: 'Field', name: { kind: 'Name', value: 'link' } },
          { kind: 'Field', name: { kind: 'Name', value: 'message' } },
          { kind: 'Field', name: { kind: 'Name', value: 'severity' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'DebugNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'dataJson' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PlanEnqueuedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'queuePosition' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'queueTotal' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PlanUpdatedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'TaskCompletedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'QueueJobCompletedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'jobType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: 'PlanWaitingForWorktreeNotification',
              },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'retryDelayMs' },
                },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PlanStatusChangedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ScheduledRunFailedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                { kind: 'Field', name: { kind: 'Name', value: 'runCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'runId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduledAgentJobId' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduleName' },
                },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SystemAlertNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'code' } },
              ],
            },
          },
          {
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'TaskStatusChangedNotification' },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  NotificationsSubscription,
  NotificationsSubscriptionVariables
>;
export const DiscoverAgentClisDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'DiscoverAgentClis' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'discoverAgentClis' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agents' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authState' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'status' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'backend' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'capabilities' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'approvals' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'editApprovals' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'chatCapable' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'enabled' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'modelOptions' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'enabled' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'favorite' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'model' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'supportsCustomBaseUrl' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'version' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DiscoverAgentClisQuery,
  DiscoverAgentClisQueryVariables
>;
export const DiscoverLocalModelsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'DiscoverLocalModels' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'discoverLocalModels' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'endpoints' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'baseUrl' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'host' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'models' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'provider' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DiscoverLocalModelsQuery,
  DiscoverLocalModelsQueryVariables
>;
export const PersonaPromptsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PersonaPrompts' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'customPrompts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'promptType' },
                      value: { kind: 'EnumValue', value: 'PERSONAS' },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PersonaPromptsQuery, PersonaPromptsQueryVariables>;
export const WorkspaceLocalRepositoriesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'WorkspaceLocalRepositories' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceLocalRepositories' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'gitCurrentBranch' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'gitDefaultBranch' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'gitRemoteUrl' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'project' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
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
  WorkspaceLocalRepositoriesQuery,
  WorkspaceLocalRepositoriesQueryVariables
>;
export const StartConversationStreamDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'StartConversationStream' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StartConversationStreamInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'startConversationStream' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'assistantMessageId' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'conversationId' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'errorMessage' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'userMessageId' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  StartConversationStreamMutation,
  StartConversationStreamMutationVariables
>;
export const CancelConversationStreamDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CancelConversationStream' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'conversationId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cancelConversationStream' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'conversationId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'conversationId' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CancelConversationStreamMutation,
  CancelConversationStreamMutationVariables
>;
export const RespondToConversationPermissionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RespondToConversationPermission' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'conversationId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'optionId' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'requestId' },
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
            name: { kind: 'Name', value: 'respondToConversationPermission' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'conversationId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'conversationId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'optionId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'optionId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'requestId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'requestId' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RespondToConversationPermissionMutation,
  RespondToConversationPermissionMutationVariables
>;
export const ConversationStreamChunkAddedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'ConversationStreamChunkAdded' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'conversationId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'conversationStreamChunkAdded' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'conversationId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'conversationId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'conversationId' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'delta' } },
                { kind: 'Field', name: { kind: 'Name', value: 'done' } },
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'messageId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'metadataJson' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ConversationStreamChunkAddedSubscription,
  ConversationStreamChunkAddedSubscriptionVariables
>;
export const StartTranscriptionStreamDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'StartTranscriptionStream' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'startTranscriptionStream' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'errorMessage' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  StartTranscriptionStreamMutation,
  StartTranscriptionStreamMutationVariables
>;
export const SendTranscriptionAudioChunkDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SendTranscriptionAudioChunk' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'audioBase64' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'sessionId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'sortOrder' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'sendTranscriptionAudioChunk' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'audioBase64' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'audioBase64' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sessionId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'sessionId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sortOrder' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'sortOrder' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SendTranscriptionAudioChunkMutation,
  SendTranscriptionAudioChunkMutationVariables
>;
export const StopTranscriptionStreamDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'StopTranscriptionStream' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'sessionId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'stopTranscriptionStream' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sessionId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'sessionId' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  StopTranscriptionStreamMutation,
  StopTranscriptionStreamMutationVariables
>;
export const TranscriptionStreamChunkAddedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'TranscriptionStreamChunkAdded' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'sessionId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'transcriptionStreamChunkAdded' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sessionId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'sessionId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'done' } },
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
                { kind: 'Field', name: { kind: 'Name', value: 'transcript' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TranscriptionStreamChunkAddedSubscription,
  TranscriptionStreamChunkAddedSubscriptionVariables
>;
export const HomeDefaultAgentDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HomeDefaultAgent' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'userPreferences' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'defaultAgent' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'backend' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'effort' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'model' } },
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
  HomeDefaultAgentQuery,
  HomeDefaultAgentQueryVariables
>;
export const SearchAgentAssetsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'searchAgentAssets' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'AgentAssetSearchInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'searchAgentAssets' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'chunks' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'content' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'customPromptId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'description' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'filePath' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'labels' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'projectId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'promptType' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'similarity' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SearchAgentAssetsQuery,
  SearchAgentAssetsQueryVariables
>;
export const SignoutDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'signout' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'signout' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SignoutMutation, SignoutMutationVariables>;
export const MintSubscriptionTokenDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'MintSubscriptionToken' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mintSubscriptionToken' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MintSubscriptionTokenMutation,
  MintSubscriptionTokenMutationVariables
>;
export const GetBlogPostEditorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getBlogPostEditor' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogAdminAuthors' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogAdminPost' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostAdminObject' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'BlogPostEditorPost' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostNotFoundError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogAdminTags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
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
      name: { kind: 'Name', value: 'BlogPostEditorPost' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostAdminObject' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'bodyMarkdown' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastEditedBy' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'seoDescription' } },
          { kind: 'Field', name: { kind: 'Name', value: 'seoTitle' } },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetBlogPostEditorQuery,
  GetBlogPostEditorQueryVariables
>;
export const UpdateBlogPostEditorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateBlogPostEditor' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateBlogPostInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateBlogPost' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogCoverAltRequiredError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostAdminObject' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostNotFoundError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: {
                      kind: 'Name',
                      value: 'BlogPostPublishPermissionRequiredError',
                    },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostStaleWriteError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentUpdatedAt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogReferenceNotFoundError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'entity' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogSlugConflictError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
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
  UpdateBlogPostEditorMutation,
  UpdateBlogPostEditorMutationVariables
>;
export const SetBlogPostEditorTagsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'setBlogPostEditorTags' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SetBlogPostTagsInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setBlogPostTags' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostAdminObject' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostNotFoundError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: {
                      kind: 'Name',
                      value: 'BlogPostPublishPermissionRequiredError',
                    },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogReferenceNotFoundError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'entity' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
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
  SetBlogPostEditorTagsMutation,
  SetBlogPostEditorTagsMutationVariables
>;
export const PublishBlogPostEditorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'publishBlogPostEditor' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PublishBlogPostInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'publishBlogPost' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostAdminObject' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'publishedAt' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostNotFoundError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
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
  PublishBlogPostEditorMutation,
  PublishBlogPostEditorMutationVariables
>;
export const UnpublishBlogPostEditorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'unpublishBlogPostEditor' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'unpublishBlogPost' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostAdminObject' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostNotFoundError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
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
  UnpublishBlogPostEditorMutation,
  UnpublishBlogPostEditorMutationVariables
>;
export const ArchiveBlogPostEditorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'archiveBlogPostEditor' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'archiveBlogPost' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostAdminObject' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostNotFoundError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
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
  ArchiveBlogPostEditorMutation,
  ArchiveBlogPostEditorMutationVariables
>;
export const GetBlogAdminPostsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getBlogAdminPosts' },
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
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'search' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'state' },
          },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: {
                kind: 'NamedType',
                name: { kind: 'Name', value: 'BlogPostState' },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogAdminPosts' },
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
                name: { kind: 'Name', value: 'search' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'search' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'state' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'state' },
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
                        name: { kind: 'Name', value: 'BlogPostListRow' },
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
      name: { kind: 'Name', value: 'BlogPostListRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostAdminObject' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastEditedBy' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetBlogAdminPostsQuery,
  GetBlogAdminPostsQueryVariables
>;
export const CreateBlogPostDraftDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createBlogPostDraft' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateBlogPostInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createBlogPost' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogCoverAltRequiredError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogPostAdminObject' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogReferenceNotFoundError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'entity' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'BlogSlugConflictError' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
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
  CreateBlogPostDraftMutation,
  CreateBlogPostDraftMutationVariables
>;
export const GetDashboardDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getDashboard' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ActivityByDateInput' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'start' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'end' } },
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
            name: { kind: 'Name', value: 'activityByDate' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'DashboardActivityCard' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'dailyStatsRange' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'start' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'start' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'end' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'end' },
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
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'DashboardDailyStatsCard',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queues' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'DashboardQueueStatsCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'DashboardActivityCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ActivityByDateResultObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'commits' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planTitle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'repo' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sha' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskTitle' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'hasNext' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'outputChunks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'iteration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planTitle' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tasksUpdated' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planTitle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'DashboardDailyStatsCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'DailyStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'date' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansCompleted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansCreated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansUpdated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksCompleted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksCreated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksUpdated' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'DashboardQueueStatsCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'activeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delayedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'waitingCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetDashboardQuery, GetDashboardQueryVariables>;
export const GetDashboardOnboardingDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getDashboardOnboarding' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'discoverAgentClis' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'githubTokenConfigured' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planCountsByStatus' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'count' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceLocalRepositories' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetDashboardOnboardingQuery,
  GetDashboardOnboardingQueryVariables
>;
export const GetDashboardGithubStatsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getDashboardGithubStats' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'owner' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'repo' } },
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
            alias: { kind: 'Name', value: 'closedPrCountByAuthor' },
            name: { kind: 'Name', value: 'openPrCountByAuthor' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'owner' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'owner' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'repo' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'repo' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'state' },
                      value: {
                        kind: 'StringValue',
                        value: 'closed',
                        block: false,
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'author' } },
                { kind: 'Field', name: { kind: 'Name', value: 'openCount' } },
              ],
            },
          },
          {
            kind: 'Field',
            alias: { kind: 'Name', value: 'openPrCountByAuthor' },
            name: { kind: 'Name', value: 'openPrCountByAuthor' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'owner' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'owner' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'repo' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'repo' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'state' },
                      value: {
                        kind: 'StringValue',
                        value: 'open',
                        block: false,
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'author' } },
                { kind: 'Field', name: { kind: 'Name', value: 'openCount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'prTimeInStateSummary' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'owner' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'owner' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'repo' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'repo' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'state' },
                      value: {
                        kind: 'StringValue',
                        value: 'open',
                        block: false,
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'avgDaysInState' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'count' } },
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetDashboardGithubStatsQuery,
  GetDashboardGithubStatsQueryVariables
>;
export const TriggerNotificationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'triggerNotification' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'triggerWebsocketNotification' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TriggerNotificationMutation,
  TriggerNotificationMutationVariables
>;
export const EvalsIndexRepositoriesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'EvalsIndexRepositories' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceRepositories' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  EvalsIndexRepositoriesQuery,
  EvalsIndexRepositoriesQueryVariables
>;
export const EvalsIndexDatasetsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'EvalsIndexDatasets' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'repositoryId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'evalDatasets' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'repositoryId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'repositoryId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'target' } },
                { kind: 'Field', name: { kind: 'Name', value: 'version' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  EvalsIndexDatasetsQuery,
  EvalsIndexDatasetsQueryVariables
>;
export const EvalsIndexRunsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'EvalsIndexRuns' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'datasetId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'evalRuns' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'datasetId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'datasetId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'EvalRunListRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'EvalRunListRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'EvalRun' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'authMode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'datasetId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'datasetVersion' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driver' } },
          { kind: 'Field', name: { kind: 'Name', value: 'effort' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'k' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'promptSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<EvalsIndexRunsQuery, EvalsIndexRunsQueryVariables>;
export const EvalRunComparisonRouteDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'EvalRunComparisonRoute' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'baseRunId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'candidateRunId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'evalRunComparison' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'baseRunId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'baseRunId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'candidateRunId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'candidateRunId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'base' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'EvalRunReportFields' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'candidate' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'EvalRunReportFields' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'improvedCaseIds' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'mcnemar' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'b' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'c' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'method' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pValue' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'regressedCaseIds' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'sharedCases' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'warnings' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'code' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
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
      name: { kind: 'Name', value: 'EvalRunReportFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'EvalRunReport' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cases' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'attemptsCounted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'attemptsPassed' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'caseId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'passed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'split' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'datasetName' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'graders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'calibrationStatus' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'counts' } },
                { kind: 'Field', name: { kind: 'Name', value: 'graderId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'graderKind' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'graderVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'judgeModel' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'judgeModelVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'kappa' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kappaCiHigh' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kappaCiLow' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'numbers' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'casesAtK' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'casesCounted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'costPerSuccessUsd' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'detectionFloor' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'excluded' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'errored' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'gradeError' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'noCountedGrade' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'usageLimited' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'judgeAgreement' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'graderId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'graderVersion' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'kappa' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'kappaCiHigh' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'kappaCiLow' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'passAtK' } },
                { kind: 'Field', name: { kind: 'Name', value: 'passHatK' } },
                { kind: 'Field', name: { kind: 'Name', value: 'passRate' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'passRateCi' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'confidence' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'lower' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'upper' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'totalCostUsd' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trialsCounted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trialsExcluded' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trialsPassed' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'run' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'authMode' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'budgetTokens' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'budgetUsd' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'datasetId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'datasetVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'driver' } },
                { kind: 'Field', name: { kind: 'Name', value: 'effort' } },
                { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'k' } },
                { kind: 'Field', name: { kind: 'Name', value: 'model' } },
                { kind: 'Field', name: { kind: 'Name', value: 'promptSha' } },
                { kind: 'Field', name: { kind: 'Name', value: 'skillSha' } },
                { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  EvalRunComparisonRouteQuery,
  EvalRunComparisonRouteQueryVariables
>;
export const EvalRunReportRouteDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'EvalRunReportRoute' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'runId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'evalRunReport' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'runId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'runId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'EvalRunReportFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'EvalRunReportFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'EvalRunReport' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cases' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'attemptsCounted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'attemptsPassed' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'caseId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'passed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'split' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'datasetName' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'graders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'calibrationStatus' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'counts' } },
                { kind: 'Field', name: { kind: 'Name', value: 'graderId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'graderKind' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'graderVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'judgeModel' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'judgeModelVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'kappa' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kappaCiHigh' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kappaCiLow' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'numbers' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'casesAtK' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'casesCounted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'costPerSuccessUsd' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'detectionFloor' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'excluded' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'errored' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'gradeError' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'noCountedGrade' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'usageLimited' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'judgeAgreement' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'graderId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'graderVersion' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'kappa' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'kappaCiHigh' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'kappaCiLow' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'passAtK' } },
                { kind: 'Field', name: { kind: 'Name', value: 'passHatK' } },
                { kind: 'Field', name: { kind: 'Name', value: 'passRate' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'passRateCi' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'confidence' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'lower' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'upper' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'totalCostUsd' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trialsCounted' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trialsExcluded' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trialsPassed' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'run' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'authMode' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'budgetTokens' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'budgetUsd' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'datasetId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'datasetVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'driver' } },
                { kind: 'Field', name: { kind: 'Name', value: 'effort' } },
                { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'k' } },
                { kind: 'Field', name: { kind: 'Name', value: 'model' } },
                { kind: 'Field', name: { kind: 'Name', value: 'promptSha' } },
                { kind: 'Field', name: { kind: 'Name', value: 'skillSha' } },
                { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  EvalRunReportRouteQuery,
  EvalRunReportRouteQueryVariables
>;
export const EvalRunReportSiblingsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'EvalRunReportSiblings' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'datasetId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'evalRuns' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'datasetId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'datasetId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'EvalRunListRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'EvalRunListRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'EvalRun' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'authMode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'datasetId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'datasetVersion' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driver' } },
          { kind: 'Field', name: { kind: 'Name', value: 'effort' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'k' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'promptSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  EvalRunReportSiblingsQuery,
  EvalRunReportSiblingsQueryVariables
>;
export const GetGeneratorByNameDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getGeneratorByName' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'name' } },
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
            name: { kind: 'Name', value: 'generator' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'name' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'name' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'GeneratorDetailCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'GeneratorDetailCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'GeneratorDetailObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'schemaJson' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetGeneratorByNameQuery,
  GetGeneratorByNameQueryVariables
>;
export const GetGeneratorsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getGenerators' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'generators' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetGeneratorsQuery, GetGeneratorsQueryVariables>;
export const CodeIndexStatusDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'CodeIndexStatus' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'repositoryId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'codeIndexStatus' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'repositoryId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'repositoryId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'indexedChunks' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'repositoryId' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CodeIndexStatusQuery,
  CodeIndexStatusQueryVariables
>;
export const CodeSemanticSearchDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'CodeSemanticSearch' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CodeSemanticSearchInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'codeSemanticSearch' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'available' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'matches' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'content' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endLine' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'path' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'score' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'startLine' },
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
  CodeSemanticSearchQuery,
  CodeSemanticSearchQueryVariables
>;
export const IndexCodeRepositoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'IndexCodeRepository' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'repositoryId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'indexCodeRepository' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'repositoryId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'repositoryId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'repositoryId' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  IndexCodeRepositoryMutation,
  IndexCodeRepositoryMutationVariables
>;
export const GetNoteByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getNoteById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'note' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'NoteCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'NoteCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'NoteObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetNoteByIdQuery, GetNoteByIdQueryVariables>;
export const UpdateNoteDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateNote' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateNoteInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateNote' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'NoteCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'NoteCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'NoteObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateNoteMutation, UpdateNoteMutationVariables>;
export const GetNotesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getNotes' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'notes' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'NoteCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'NoteCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'NoteObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetNotesQuery, GetNotesQueryVariables>;
export const CreateNoteDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createNote' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateNoteInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createNote' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'NoteCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'NoteCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'NoteObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateNoteMutation, CreateNoteMutationVariables>;
export const GetPlanByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPlanById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'plan' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanDetails' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HookTask' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'afterHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'beforeHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ProjectDetails' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runnableTaskCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanTagChip' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetPlanByIdQuery, GetPlanByIdQueryVariables>;
export const GetTasksByPlanIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getTasksByPlanId' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'TasksByPlanIdInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tasksByPlanId' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanTaskRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTaskRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'wave' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetTasksByPlanIdQuery,
  GetTasksByPlanIdQueryVariables
>;
export const PlanDetailEnqueuePlanRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailEnqueuePlanRun' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'EnqueuePlanRunInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'enqueuePlanRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'executionBackend' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'queuePosition' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'queueTotal' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailEnqueuePlanRunMutation,
  PlanDetailEnqueuePlanRunMutationVariables
>;
export const PlanDetailSchedulePlanRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailSchedulePlanRun' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SchedulePlanRunInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'schedulePlanRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'executionBackend' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planRunId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduledFor' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailSchedulePlanRunMutation,
  PlanDetailSchedulePlanRunMutationVariables
>;
export const PlanDetailReschedulePlanRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailReschedulePlanRun' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ReschedulePlanRunInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'reschedulePlanRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planRunId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduledFor' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailReschedulePlanRunMutation,
  PlanDetailReschedulePlanRunMutationVariables
>;
export const PlanDetailEvaluatePlanRulesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailEvaluatePlanRules' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'evaluatePlanRules' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'planId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'planId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'enqueued' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'triggerKind' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailEvaluatePlanRulesMutation,
  PlanDetailEvaluatePlanRulesMutationVariables
>;
export const PlanDetailCancelPlanRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailCancelPlanRun' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CancelPlanRunInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cancelPlanRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'activeJobIdsCouldNotCancel' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'cancelRequested' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'noMatchingJob' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'outcome' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'planStatusAfter' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'removedJobIds' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'signaledActiveRunToStop' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailCancelPlanRunMutation,
  PlanDetailCancelPlanRunMutationVariables
>;
export const PlanDetailForceSettlePlanRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailForceSettlePlanRun' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ForceSettlePlanRunInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'forceSettlePlanRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'heartbeatExpected' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isStale' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailForceSettlePlanRunMutation,
  PlanDetailForceSettlePlanRunMutationVariables
>;
export const PlanDetailSetPlanStatusDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailSetPlanStatus' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SetPlanStatusInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setPlanStatus' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailSetPlanStatusMutation,
  PlanDetailSetPlanStatusMutationVariables
>;
export const PlanDetailUpdateTaskDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailUpdateTask' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateTaskInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateTask' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanTaskRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTaskRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'wave' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailUpdateTaskMutation,
  PlanDetailUpdateTaskMutationVariables
>;
export const PlanDetailUpdatePlanJobRunHooksDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailUpdatePlanJobRunHooks' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdatePlanInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updatePlan' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobRunHooksJson' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailUpdatePlanJobRunHooksMutation,
  PlanDetailUpdatePlanJobRunHooksMutationVariables
>;
export const PlanDetailRunConfigDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailRunConfig' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'plan' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'runConfigJson' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailRunConfigQuery,
  PlanDetailRunConfigQueryVariables
>;
export const PlanDetailUpdatePlanRunConfigDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailUpdatePlanRunConfig' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdatePlanInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updatePlan' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'runConfigJson' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailUpdatePlanRunConfigMutation,
  PlanDetailUpdatePlanRunConfigMutationVariables
>;
export const PlanDetailWorkspaceEditorsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailWorkspaceEditors' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceSettings' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'profile' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'enabledEditors' },
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
  PlanDetailWorkspaceEditorsQuery,
  PlanDetailWorkspaceEditorsQueryVariables
>;
export const PlanDetailCriticalDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailCritical' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'plan' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'planId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanDetails' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tasksByPlanId' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'planId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'planId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanTaskRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HookTask' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'afterHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'beforeHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ProjectDetails' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runnableTaskCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanTagChip' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTaskRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'wave' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailCriticalQuery,
  PlanDetailCriticalQueryVariables
>;
export const PlanDetailWorkspaceRepositoriesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailWorkspaceRepositories' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceRepositories' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: {
                    kind: 'Name',
                    value: 'PlanRunConfigRepositoryFields',
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
      name: { kind: 'Name', value: 'PlanRunConfigRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'inspection' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'git' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'currentBranch' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'defaultBranch' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailWorkspaceRepositoriesQuery,
  PlanDetailWorkspaceRepositoriesQueryVariables
>;
export const PlanDetailOutputChunksDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailOutputChunks' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planOutputStreamChunks' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'planId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'planId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'limit' },
                      value: { kind: 'IntValue', value: '200' },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'iteration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailOutputChunksQuery,
  PlanDetailOutputChunksQueryVariables
>;
export const PlanDetailRunHistoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailRunHistory' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'metrics' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'recentPlanRunsMetrics' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'planId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'planId' },
                      },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'limit' },
                      value: { kind: 'IntValue', value: '25' },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'executionBackend' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'finishedOn' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'taskRunMetrics' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'atEnd' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'rssMb' },
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
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planRunsByPlanId' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'includeAllScheduled' },
                      value: { kind: 'BooleanValue', value: true },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'limit' },
                      value: { kind: 'IntValue', value: '25' },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'planId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'planId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
                { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'checkout' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'displayName' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'filesystemPath' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'executionBackend' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'heartbeatExpected' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isStale' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'lastHeartbeatAt' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'model' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'pullRequest' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'number' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'repo' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resumeOfRunId' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'runConfigSnapshotJson' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'runKind' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scheduledFor' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'settledReason' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'usageLimitResetsAt' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailRunHistoryQuery,
  PlanDetailRunHistoryQueryVariables
>;
export const PlanDetailLedgerDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailLedger' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'ruleApplications' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'planId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'planId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'detailsJson' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ruleId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workArtifactsByPlan' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'planId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'planId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'artifacts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'LinkedArtifact' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'LinkedArtifact' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'WorkArtifactObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'externalKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifecycle' } },
          { kind: 'Field', name: { kind: 'Name', value: 'message' } },
          { kind: 'Field', name: { kind: 'Name', value: 'payloadJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'producedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'verification' } },
          { kind: 'Field', name: { kind: 'Name', value: 'verifiedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailLedgerQuery,
  PlanDetailLedgerQueryVariables
>;
export const PlanDetailTagVocabularyDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailTagVocabulary' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillTagVocabulary' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tags' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'dimension' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailTagVocabularyQuery,
  PlanDetailTagVocabularyQueryVariables
>;
export const PlanOutputChunkAddedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'PlanOutputChunkAdded' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planOutputChunkAdded' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'planId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'planId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'iteration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanOutputChunkAddedSubscription,
  PlanOutputChunkAddedSubscriptionVariables
>;
export const PlanLifecycleNotificationsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'PlanLifecycleNotifications' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planNotifications' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'planId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'planId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'event' } },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: {
                      kind: 'Name',
                      value: 'PlanStatusChangedNotification',
                    },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'PlanUpdatedNotification' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'taskId' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'TaskCompletedNotification' },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'taskId' },
                      },
                    ],
                  },
                },
                {
                  kind: 'InlineFragment',
                  typeCondition: {
                    kind: 'NamedType',
                    name: {
                      kind: 'Name',
                      value: 'TaskStatusChangedNotification',
                    },
                  },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'taskId' },
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
  PlanLifecycleNotificationsSubscription,
  PlanLifecycleNotificationsSubscriptionVariables
>;
export const PlanDetailInboxDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailInbox' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planMessages' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'kinds' },
                      value: {
                        kind: 'ListValue',
                        values: [
                          { kind: 'EnumValue', value: 'QUEUE' },
                          { kind: 'EnumValue', value: 'STEER' },
                        ],
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'planId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'planId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanInboxMessage' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanInboxMessage' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanMessageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'body' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredToTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailInboxQuery,
  PlanDetailInboxQueryVariables
>;
export const PlanDetailPostPlanMessageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailPostPlanMessage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PostPlanMessageInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'postPlanMessage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanInboxMessage' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanInboxMessage' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanMessageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'body' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredToTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailPostPlanMessageMutation,
  PlanDetailPostPlanMessageMutationVariables
>;
export const PlanDetailWithdrawPlanMessageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailWithdrawPlanMessage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'WithdrawPlanMessageInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'withdrawPlanMessage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanInboxMessage' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanInboxMessage' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanMessageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'body' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredToTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailWithdrawPlanMessageMutation,
  PlanDetailWithdrawPlanMessageMutationVariables
>;
export const PlanMessageChangedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'PlanMessageChanged' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planMessageChanged' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'planId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'planId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanInboxMessage' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanInboxMessage' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanMessageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'body' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveredToTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanMessageChangedSubscription,
  PlanMessageChangedSubscriptionVariables
>;
export const PlanDetailAddPlanTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailAddPlanTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'AddPlanTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addPlanTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanTagChip' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailAddPlanTagMutation,
  PlanDetailAddPlanTagMutationVariables
>;
export const PlanDetailRemovePlanTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailRemovePlanTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RemovePlanTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'removePlanTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailRemovePlanTagMutation,
  PlanDetailRemovePlanTagMutationVariables
>;
export const PlanDetailAddHookDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailAddHook' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'AddHookInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addHook' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HookTask' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailAddHookMutation,
  PlanDetailAddHookMutationVariables
>;
export const PlanDetailDetachHookDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PlanDetailDetachHook' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'DetachHookInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'detachHook' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailDetachHookMutation,
  PlanDetailDetachHookMutationVariables
>;
export const GetTaskByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getTaskById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillTagVocabulary' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tags' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'dimension' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'task' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'TaskDetails' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HookTask' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanTaskRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'wave' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TaskTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TaskDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'afterHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'beforeHooks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'HookTask' },
                },
              ],
            },
          },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'PlanTaskRow' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'TaskTagChip' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetTaskByIdQuery, GetTaskByIdQueryVariables>;
export const TaskDetailAddTaskTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TaskDetailAddTaskTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'AddTaskTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addTaskTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'TaskTagChip' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TaskTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TaskDetailAddTaskTagMutation,
  TaskDetailAddTaskTagMutationVariables
>;
export const TaskDetailRemoveTaskTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TaskDetailRemoveTaskTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RemoveTaskTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'removeTaskTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TaskDetailRemoveTaskTagMutation,
  TaskDetailRemoveTaskTagMutationVariables
>;
export const TaskDetailPromoteToPlanDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TaskDetailPromoteToPlan' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PromoteTaskToPlanInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'promoteTaskToPlan' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TaskDetailPromoteToPlanMutation,
  TaskDetailPromoteToPlanMutationVariables
>;
export const TaskLinkedArtifactsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'TaskLinkedArtifacts' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'taskId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workArtifactsByTask' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'taskId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'taskId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'artifacts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'LinkedArtifact' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'LinkedArtifact' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'WorkArtifactObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'externalKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifecycle' } },
          { kind: 'Field', name: { kind: 'Name', value: 'message' } },
          { kind: 'Field', name: { kind: 'Name', value: 'payloadJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'producedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sessionId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'verification' } },
          { kind: 'Field', name: { kind: 'Name', value: 'verifiedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TaskLinkedArtifactsQuery,
  TaskLinkedArtifactsQueryVariables
>;
export const TaskOutputStreamChunksDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'TaskOutputStreamChunks' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'taskId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planOutputStreamChunks' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'planId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'planId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'taskId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'taskId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'iteration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TaskOutputStreamChunksQuery,
  TaskOutputStreamChunksQueryVariables
>;
export const UpdateTaskDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateTask' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateTaskInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateTask' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateTaskMutation, UpdateTaskMutationVariables>;
export const TaskAgentTrajectoriesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'TaskAgentTrajectories' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'taskId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'agentTrajectoriesByTask' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'taskId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'taskId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'AgentTrajectorySummary' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'AgentTrajectorySummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'AgentTrajectory' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'byteSize' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cachedTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driver' } },
          { kind: 'Field', name: { kind: 'Name', value: 'durationMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'incomplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outcome' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'schemaVersion' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'toolCallCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'truncated' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TaskAgentTrajectoriesQuery,
  TaskAgentTrajectoriesQueryVariables
>;
export const TrajectoryViewerDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'TrajectoryViewer' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'planId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'taskId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'trajectoryId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'agentTrajectory' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'trajectoryId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'AgentTrajectorySummary' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'trajectoryJson' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'agentTrajectoryLabels' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'trajectoryId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'trajectoryId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'AgentTrajectoryLabelRow' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'me' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'githubUsername' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'plan' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'planId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'task' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'taskId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'AgentTrajectorySummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'AgentTrajectory' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'byteSize' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cachedTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driver' } },
          { kind: 'Field', name: { kind: 'Name', value: 'durationMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'incomplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outcome' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'schemaVersion' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'toolCallCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'truncated' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'AgentTrajectoryLabelRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'AgentTrajectoryLabel' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failureType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'note' } },
          { kind: 'Field', name: { kind: 'Name', value: 'rater' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trajectoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'verdict' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TrajectoryViewerQuery,
  TrajectoryViewerQueryVariables
>;
export const TrajectoryViewerLabelDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TrajectoryViewerLabel' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'LabelAgentTrajectoryInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'labelAgentTrajectory' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'AgentTrajectoryLabelRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'AgentTrajectoryLabelRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'AgentTrajectoryLabel' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failureType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'note' } },
          { kind: 'Field', name: { kind: 'Name', value: 'rater' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trajectoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'verdict' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TrajectoryViewerLabelMutation,
  TrajectoryViewerLabelMutationVariables
>;
export const TrajectoryViewerRemoveLabelDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TrajectoryViewerRemoveLabel' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'trajectoryId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'removeAgentTrajectoryLabel' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'trajectoryId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'trajectoryId' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TrajectoryViewerRemoveLabelMutation,
  TrajectoryViewerRemoveLabelMutationVariables
>;
export const GetPlanAssigneeOptionsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPlanAssigneeOptions' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'listDistinctAuthorsAndAssignees' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetPlanAssigneeOptionsQuery,
  GetPlanAssigneeOptionsQueryVariables
>;
export const GetPlanCountsByStatusDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPlanCountsByStatus' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planCountsByStatus' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'count' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetPlanCountsByStatusQuery,
  GetPlanCountsByStatusQueryVariables
>;
export const GetPlansByStatusDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPlansByStatus' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ListPlansByStatusInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            alias: { kind: 'Name', value: 'allPlansCount' },
            name: { kind: 'Name', value: 'listPlansByStatus' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'statuses' },
                      value: { kind: 'ListValue', values: [] },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'listPlansByStatus' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'plans' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'PlanCard' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'hasCustomRunConfig' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectRelation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'taskCount' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tasksCompletedCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetPlansByStatusQuery,
  GetPlansByStatusQueryVariables
>;
export const TestWorkflowDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TestWorkflow' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'EnqueuePlanRunInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'enqueuePlanRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'executionBackend' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TestWorkflowMutation,
  TestWorkflowMutationVariables
>;
export const GetProjectByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getProjectById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'limit' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Float' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'offset' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Float' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ProjectPageDetails' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            alias: { kind: 'Name', value: 'projectTasksResult' },
            name: { kind: 'Name', value: 'tasksByProjectId' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'projectId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'id' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'limit' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'limit' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'offset' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'offset' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tasks' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'assignee' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'category' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdAt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'description' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'requirementsJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'summary' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillTagVocabulary' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tags' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'dimension' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectPageDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nxProjectName' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
                { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'source' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetProjectByIdQuery, GetProjectByIdQueryVariables>;
export const ProjectDetailAddProjectTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ProjectDetailAddProjectTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'AddProjectTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addProjectTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ProjectTagChip' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectTagChip' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectTagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'confidence' } },
          { kind: 'Field', name: { kind: 'Name', value: 'dimension' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ProjectDetailAddProjectTagMutation,
  ProjectDetailAddProjectTagMutationVariables
>;
export const ProjectDetailRemoveProjectTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ProjectDetailRemoveProjectTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RemoveProjectTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'removeProjectTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ProjectDetailRemoveProjectTagMutation,
  ProjectDetailRemoveProjectTagMutationVariables
>;
export const GetProjectForEditDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getProjectForEdit' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'nxProjectName' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetProjectForEditQuery,
  GetProjectForEditQueryVariables
>;
export const UpdateProjectDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateProject' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateProjectInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateProject' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'nxProjectName' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateProjectMutation,
  UpdateProjectMutationVariables
>;
export const GetProjectsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getProjects' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projects' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ProjectCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ProjectCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ProjectObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nxProjectName' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'plans' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tasks' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetProjectsQuery, GetProjectsQueryVariables>;
export const CreateProjectDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createProject' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateProjectInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createProject' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'nxProjectName' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateProjectMutation,
  CreateProjectMutationVariables
>;
export const GetPromptDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPrompt' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'customPrompt' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PromptDetails' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PromptDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'CustomPromptObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filePath' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'labels' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'promptType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetPromptQuery, GetPromptQueryVariables>;
export const UpdatePromptDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updatePrompt' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateCustomPromptInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateCustomPrompt' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PromptDetails' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PromptDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'CustomPromptObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filePath' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'labels' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'promptType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdatePromptMutation,
  UpdatePromptMutationVariables
>;
export const DeletePromptDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'deletePrompt' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteCustomPrompt' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DeletePromptMutation,
  DeletePromptMutationVariables
>;
export const WritePromptToFileSystemDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'writePromptToFileSystem' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'writeCustomPromptToFileSystem' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  WritePromptToFileSystemMutation,
  WritePromptToFileSystemMutationVariables
>;
export const GetPromptsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPrompts' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'ListCustomPromptsInput' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'customPrompts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PromptCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PromptCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'CustomPromptObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'content' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filePath' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'labels' } },
          { kind: 'Field', name: { kind: 'Name', value: 'promptType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetPromptsQuery, GetPromptsQueryVariables>;
export const CreatePromptDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createPrompt' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateCustomPromptInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createCustomPrompt' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'filePath' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'labels' } },
                { kind: 'Field', name: { kind: 'Name', value: 'promptType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreatePromptMutation,
  CreatePromptMutationVariables
>;
export const GetPullRequestDetailDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPullRequestDetail' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'GetPullInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pull' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PullRequestDetail' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PullRequestCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PullListItemObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'baseRef' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'headRef' } },
          { kind: 'Field', name: { kind: 'Name', value: 'headSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'htmlUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mergedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'number' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PullRequestDetail' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PullListItemObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'PullRequestCard' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetPullRequestDetailQuery,
  GetPullRequestDetailQueryVariables
>;
export const GetPullRequestsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPullRequests' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ListPullsInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pulls' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PullRequestCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PullRequestCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PullListItemObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'baseRef' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'headRef' } },
          { kind: 'Field', name: { kind: 'Name', value: 'headSha' } },
          { kind: 'Field', name: { kind: 'Name', value: 'htmlUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mergedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'number' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetPullRequestsQuery,
  GetPullRequestsQueryVariables
>;
export const GetQueueJobDetailsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getQueueJobDetails' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueName' },
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
            name: { kind: 'Name', value: 'job' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'jobId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'jobId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'queueName' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'queueName' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobDetailsCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobDetailsCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          { kind: 'Field', name: { kind: 'Name', value: 'executionBackend' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'taskRunMetrics' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'atEnd' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'heapUsedMb' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'rssMb' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'atStart' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'heapUsedMb' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'rssMb' } },
                    ],
                  },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetQueueJobDetailsQuery,
  GetQueueJobDetailsQueryVariables
>;
export const QueueJobDetailRetryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'QueueJobDetailRetry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RetryJobInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'retryJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QueueJobDetailRetryMutation,
  QueueJobDetailRetryMutationVariables
>;
export const QueueJobDetailCancelPlanRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'QueueJobDetailCancelPlanRun' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CancelPlanRunInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cancelPlanRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'activeJobIdsCouldNotCancel' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'cancelRequested' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'noMatchingJob' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'outcome' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'planStatusAfter' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'removedJobIds' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'signaledActiveRunToStop' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QueueJobDetailCancelPlanRunMutation,
  QueueJobDetailCancelPlanRunMutationVariables
>;
export const QueueJobLogsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'QueueJobLogs' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'QueueJobLogsInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queueJobLogs' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'events' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'QueueJobLogEvent' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'hasMore' } },
                { kind: 'Field', name: { kind: 'Name', value: 'nextCursor' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueJobLogEvent' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueJobLogEventObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cursor' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'level' } },
          { kind: 'Field', name: { kind: 'Name', value: 'message' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueueJobLogsQuery, QueueJobLogsQueryVariables>;
export const QueueJobLogTailDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'QueueJobLogTail' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobId' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueName' },
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
            name: { kind: 'Name', value: 'queueJobLogTail' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'jobId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'jobId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'queueName' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'queueName' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'QueueJobLogEvent' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueJobLogEvent' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueJobLogEventObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cursor' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'level' } },
          { kind: 'Field', name: { kind: 'Name', value: 'message' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QueueJobLogTailSubscription,
  QueueJobLogTailSubscriptionVariables
>;
export const GetQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'QueueDetailsInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'QueueDetails' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueJobDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueDetails' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueDetailsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'activeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delayedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedCount' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobs' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'hasNext' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobs' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'QueueJobDetails' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'total' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'waitingCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetQueueQuery, GetQueueQueryVariables>;
export const QueueDetailPauseQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'QueueDetailPauseQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'QueueControlInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pauseQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QueueDetailPauseQueueMutation,
  QueueDetailPauseQueueMutationVariables
>;
export const QueueDetailResumeQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'QueueDetailResumeQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'QueueControlInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'resumeQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QueueDetailResumeQueueMutation,
  QueueDetailResumeQueueMutationVariables
>;
export const QueueDetailCleanQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'QueueDetailCleanQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CleanQueueInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cleanQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'removedCount' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QueueDetailCleanQueueMutation,
  QueueDetailCleanQueueMutationVariables
>;
export const GetQueuesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getQueues' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queues' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'QueueCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'activeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delayedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'waitingCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetQueuesQuery, GetQueuesQueryVariables>;
export const QueuesPauseQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'QueuesPauseQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'QueueControlInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pauseQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QueuesPauseQueueMutation,
  QueuesPauseQueueMutationVariables
>;
export const QueuesResumeQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'QueuesResumeQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'QueueControlInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'resumeQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QueuesResumeQueueMutation,
  QueuesResumeQueueMutationVariables
>;
export const CreateQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateQueueInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateQueueMutation, CreateQueueMutationVariables>;
export const InstallAgentCliDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'InstallAgentCli' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'backend' },
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
            name: { kind: 'Name', value: 'installAgentCli' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'backend' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'backend' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
                { kind: 'Field', name: { kind: 'Name', value: 'disabled' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'errorMessage' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'runId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  InstallAgentCliMutation,
  InstallAgentCliMutationVariables
>;
export const UpdateAgentCliDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateAgentCli' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'backend' },
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
            name: { kind: 'Name', value: 'updateAgentCli' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'backend' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'backend' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
                { kind: 'Field', name: { kind: 'Name', value: 'disabled' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'errorMessage' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'runId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateAgentCliMutation,
  UpdateAgentCliMutationVariables
>;
export const GetBackgroundActivitiesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getBackgroundActivities' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'backgroundActivities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'BackgroundActivityFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BackgroundActivityFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BackgroundActivityObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'done' } },
          { kind: 'Field', name: { kind: 'Name', value: 'etaSeconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'label' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'total' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetBackgroundActivitiesQuery,
  GetBackgroundActivitiesQueryVariables
>;
export const ResolveIdRefDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'resolveIdRef' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ref' } },
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
            name: { kind: 'Name', value: 'resolveIdRef' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ref' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'ref' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planTitle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ResolveIdRefQuery, ResolveIdRefQueryVariables>;
export const GetUsageBranchSearchDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getUsageBranchSearch' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'start' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'end' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'query' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'limit' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillUsageGitBranches' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'start' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'start' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'end' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'end' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'query' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'query' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'limit' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'hasMore' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'UsageBranchOption' },
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
      name: { kind: 'Name', value: 'UsageBranchOption' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageGitBranchObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetUsageBranchSearchQuery,
  GetUsageBranchSearchQueryVariables
>;
export const RulesIndexLoaderDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'RulesIndexLoader' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillAvailability' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'skills' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: {
                          kind: 'Name',
                          value: 'effectiveDisableModelInvocation',
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillTagVocabulary' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tags' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'dimension' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tagActionRules' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'TagActionRuleRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TagActionRuleRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TagActionRuleObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'actionPayloadJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'actionType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'environment' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tagAll' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RulesIndexLoaderQuery,
  RulesIndexLoaderQueryVariables
>;
export const RuleEditLoaderDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'RuleEditLoader' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillAvailability' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'skills' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: {
                          kind: 'Name',
                          value: 'effectiveDisableModelInvocation',
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillTagVocabulary' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tags' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'dimension' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tagActionRule' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'TagActionRuleRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TagActionRuleRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TagActionRuleObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'actionPayloadJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'actionType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'environment' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tagAll' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RuleEditLoaderQuery, RuleEditLoaderQueryVariables>;
export const RulesUpsertTagActionRuleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RulesUpsertTagActionRule' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpsertTagActionRuleInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'upsertTagActionRule' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'TagActionRuleRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TagActionRuleRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TagActionRuleObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'actionPayloadJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'actionType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'environment' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tagAll' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RulesUpsertTagActionRuleMutation,
  RulesUpsertTagActionRuleMutationVariables
>;
export const RulesDeleteTagActionRuleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RulesDeleteTagActionRule' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'DeleteTagActionRuleInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteTagActionRule' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RulesDeleteTagActionRuleMutation,
  RulesDeleteTagActionRuleMutationVariables
>;
export const ScheduledAgentJobDetailDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'scheduledAgentJobDetail' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduledJobDetail' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobRuns' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scheduledAgentJobId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'IntValue', value: '50' },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduledJobRunRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cronPattern' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'intervalMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nextRunAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduleKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timezone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobDetail' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cwd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'misfirePolicy' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'misfireThresholdMs' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'prompt' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'ScheduledJobCard' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'settingsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeoutMs' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobRunRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorMessage' } },
          { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledFor' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trigger' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ScheduledAgentJobDetailQuery,
  ScheduledAgentJobDetailQueryVariables
>;
export const UpdateScheduledAgentJobDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateScheduledAgentJob' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateScheduledAgentJobInputType' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateScheduledAgentJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduledJobCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cronPattern' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'intervalMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nextRunAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduleKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timezone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateScheduledAgentJobMutation,
  UpdateScheduledAgentJobMutationVariables
>;
export const SetScheduledAgentJobEnabledDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'setScheduledAgentJobEnabled' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: 'SetScheduledAgentJobEnabledInputType',
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setScheduledAgentJobEnabled' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduledJobCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cronPattern' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'intervalMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nextRunAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduleKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timezone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetScheduledAgentJobEnabledMutation,
  SetScheduledAgentJobEnabledMutationVariables
>;
export const RunScheduledAgentJobNowDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'runScheduledAgentJobNow' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'runScheduledAgentJobNow' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduledJobRunRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobRunRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorMessage' } },
          { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduledFor' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trigger' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RunScheduledAgentJobNowMutation,
  RunScheduledAgentJobNowMutationVariables
>;
export const DeleteScheduledAgentJobDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'deleteScheduledAgentJob' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteScheduledAgentJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DeleteScheduledAgentJobMutation,
  DeleteScheduledAgentJobMutationVariables
>;
export const ScheduledAgentJobRunDetailDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'scheduledAgentJobRunDetail' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'runId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'jobId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'runId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'runId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduledJobRunDetail' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobRunDetail' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorMessage' } },
          { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'resolvedCwd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobId' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'settingsSnapshotJson' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trigger' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ScheduledAgentJobRunDetailQuery,
  ScheduledAgentJobRunDetailQueryVariables
>;
export const CancelScheduledAgentJobRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'cancelScheduledAgentJobRun' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'runId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cancelScheduledAgentJobRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'runId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'runId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduledJobRunDetail' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobRunDetail' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorMessage' } },
          { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'resolvedCwd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobId' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'settingsSnapshotJson' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trigger' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CancelScheduledAgentJobRunMutation,
  CancelScheduledAgentJobRunMutationVariables
>;
export const ScheduledAgentJobsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'scheduledAgentJobs' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobRunsInFlight' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduleInFlightRun' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobRunStats' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduleRunStats' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobs' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduledJobCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduleInFlightRun' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'job' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trigger' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduleRunStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cancelledCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inFlightCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'noOpCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queuedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runningCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'since' } },
          { kind: 'Field', name: { kind: 'Name', value: 'succeededCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'windowTotalCount' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cronPattern' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'intervalMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nextRunAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduleKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timezone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ScheduledAgentJobsQuery,
  ScheduledAgentJobsQueryVariables
>;
export const CancelScheduleIndexRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'cancelScheduleIndexRun' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'runId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cancelScheduledAgentJobRun' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'runId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'runId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduleInFlightRun' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduleInFlightRun' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'job' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'scheduledAgentJobId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'startedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'trigger' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CancelScheduleIndexRunMutation,
  CancelScheduleIndexRunMutationVariables
>;
export const ScheduleRepositoryOptionsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'scheduleRepositoryOptions' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceLocalRepositories' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ScheduleRepositoryOptionsQuery,
  ScheduleRepositoryOptionsQueryVariables
>;
export const CreateScheduledAgentJobDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createScheduledAgentJob' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateScheduledAgentJobInputType' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createScheduledAgentJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ScheduledJobCard' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ScheduledJobCard' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ScheduledAgentJobObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cronPattern' } },
          { kind: 'Field', name: { kind: 'Name', value: 'driverId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'intervalMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastRunAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'nextRunAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repository' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filesystemPath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repositoryCheckoutId' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'runAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scheduleKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timezone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateScheduledAgentJobMutation,
  CreateScheduledAgentJobMutationVariables
>;
export const GetSearchResultsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getSearchResults' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SearchInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'search' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'chunks' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'content' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planTitle' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'similarity' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'source' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'sourcePath' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'sourceRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'sourceSha' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'taskId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'taskTitle' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                { kind: 'Field', name: { kind: 'Name', value: 'total' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetSearchResultsQuery,
  GetSearchResultsQueryVariables
>;
export const SettingsAgentsAgentClisDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SettingsAgentsAgentClis' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'discoverAgentClis' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agents' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'auth' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'warning' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'backend' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'enabled' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'label' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'modelOptions' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'enabled' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'favorite' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'model' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'version' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SettingsAgentsAgentClisQuery,
  SettingsAgentsAgentClisQueryVariables
>;
export const AgentCliSetupConfigDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'AgentCliSetupConfig' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'agentCliSetupConfig' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'canManage' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'installEnabled' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AgentCliSetupConfigQuery,
  AgentCliSetupConfigQueryVariables
>;
export const SetAgentEnabledDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetAgentEnabled' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'backend' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'enabled' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Boolean' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setAgentEnabled' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'backend' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'backend' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'enabled' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'enabled' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
                { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetAgentEnabledMutation,
  SetAgentEnabledMutationVariables
>;
export const SetAgentModelEnabledDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetAgentModelEnabled' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'backend' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'model' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'enabled' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Boolean' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setAgentModelEnabled' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'backend' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'backend' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'model' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'model' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'enabled' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'enabled' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
                { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
                { kind: 'Field', name: { kind: 'Name', value: 'model' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetAgentModelEnabledMutation,
  SetAgentModelEnabledMutationVariables
>;
export const SetAgentModelsEnabledDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetAgentModelsEnabled' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'backend' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'models' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'ListType',
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: { kind: 'Name', value: 'String' },
                },
              },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'enabled' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Boolean' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setAgentModelsEnabled' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'backend' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'backend' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'models' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'models' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'enabled' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'enabled' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
                { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetAgentModelsEnabledMutation,
  SetAgentModelsEnabledMutationVariables
>;
export const SetAgentModelFavoriteDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetAgentModelFavorite' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'backend' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'model' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'favorite' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Boolean' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setAgentModelFavorite' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'backend' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'backend' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'model' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'model' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'favorite' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'favorite' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
                { kind: 'Field', name: { kind: 'Name', value: 'favorite' } },
                { kind: 'Field', name: { kind: 'Name', value: 'model' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetAgentModelFavoriteMutation,
  SetAgentModelFavoriteMutationVariables
>;
export const AgentSetupChunkAddedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'AgentSetupChunkAdded' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'runId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'agentSetupChunkAdded' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'runId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'runId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'data' } },
                { kind: 'Field', name: { kind: 'Name', value: 'done' } },
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
                { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'runId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
                { kind: 'Field', name: { kind: 'Name', value: 'stream' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AgentSetupChunkAddedSubscription,
  AgentSetupChunkAddedSubscriptionVariables
>;
export const GetSettingsKeysDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getSettingsKeys' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'serviceAccountId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'serviceAccountCredentials' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'serviceAccountId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'serviceAccountId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: {
                    kind: 'Name',
                    value: 'ServiceAccountCredentialFields',
                  },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'serviceAccounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'ServiceAccountListItem' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ServiceAccountCredentialFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ServiceAccountCredentialObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'label' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'revokedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'serviceAccountId' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ServiceAccountListItem' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ServiceAccountObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'disabledAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetSettingsKeysQuery,
  GetSettingsKeysQueryVariables
>;
export const CreateServiceAccountCredentialDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createServiceAccountCredential' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: {
                kind: 'Name',
                value: 'CreateServiceAccountCredentialInput',
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createServiceAccountCredential' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'credential' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'ServiceAccountCredentialFields',
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'token' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ServiceAccountCredentialFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'ServiceAccountCredentialObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'label' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'revokedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'serviceAccountId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateServiceAccountCredentialMutation,
  CreateServiceAccountCredentialMutationVariables
>;
export const RevokeServiceAccountCredentialDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'revokeServiceAccountCredential' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'credentialId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'revokeServiceAccountCredential' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'credentialId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'credentialId' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RevokeServiceAccountCredentialMutation,
  RevokeServiceAccountCredentialMutationVariables
>;
export const ConnectMcpConnectorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'connectMcpConnector' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'ConnectMcpConnectorInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'connectMcpConnector' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'connection' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'McpConnectorConnectionFields',
                        },
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
      name: { kind: 'Name', value: 'McpConnectorConnectionFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'McpConnectorConnectionObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'authType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connectedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connectorKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'credentialLabel' } },
          { kind: 'Field', name: { kind: 'Name', value: 'credentialPrefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ConnectMcpConnectorMutation,
  ConnectMcpConnectorMutationVariables
>;
export const SetMcpConnectorEnabledDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'setMcpConnectorEnabled' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SetMcpConnectorEnabledInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setMcpConnectorEnabled' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'connection' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'McpConnectorConnectionFields',
                        },
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
      name: { kind: 'Name', value: 'McpConnectorConnectionFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'McpConnectorConnectionObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'authType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connectedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connectorKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'credentialLabel' } },
          { kind: 'Field', name: { kind: 'Name', value: 'credentialPrefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetMcpConnectorEnabledMutation,
  SetMcpConnectorEnabledMutationVariables
>;
export const DisconnectMcpConnectorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'disconnectMcpConnector' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'connectorKey' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'disconnectMcpConnector' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'connectorKey' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'connectorKey' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DisconnectMcpConnectorMutation,
  DisconnectMcpConnectorMutationVariables
>;
export const GetSettingsMcpDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getSettingsMcp' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mcpConnectorConnections' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'McpConnectorConnectionFields' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mcpConnectors' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'McpConnectorFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'McpConnectorConnectionFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'McpConnectorConnectionObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'authType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connectedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connectorKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'credentialLabel' } },
          { kind: 'Field', name: { kind: 'Name', value: 'credentialPrefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'McpConnectorFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'McpConnectorObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'authType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'docsUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endpointUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'iconHint' } },
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
          { kind: 'Field', name: { kind: 'Name', value: 'transport' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetSettingsMcpQuery, GetSettingsMcpQueryVariables>;
export const SettingsUserPreferencesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SettingsUserPreferences' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'userPreferences' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UserPreferencesFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserPreferencesFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'UserPreferencesObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'defaultAgent' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
                { kind: 'Field', name: { kind: 'Name', value: 'effort' } },
                { kind: 'Field', name: { kind: 'Name', value: 'model' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultEditor' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SettingsUserPreferencesQuery,
  SettingsUserPreferencesQueryVariables
>;
export const SettingsPreferencesEnabledEditorsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SettingsPreferencesEnabledEditors' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceSettings' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'profile' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'enabledEditors' },
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
  SettingsPreferencesEnabledEditorsQuery,
  SettingsPreferencesEnabledEditorsQueryVariables
>;
export const UpdateUserPreferencesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateUserPreferences' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateUserPreferencesInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateUserPreferences' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UserPreferencesFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserPreferencesFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'UserPreferencesObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'defaultAgent' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
                { kind: 'Field', name: { kind: 'Name', value: 'effort' } },
                { kind: 'Field', name: { kind: 'Name', value: 'model' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultEditor' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateUserPreferencesMutation,
  UpdateUserPreferencesMutationVariables
>;
export const GetWorkspaceRepositoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getWorkspaceRepository' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'repositoryId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceRepository' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'repositoryId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryCheckoutObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'foreignSkillInjectionEnabled' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inspection' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agentConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'agentsMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'claudeMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursorRules' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mcpJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skillsDir' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'git' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentBranch' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultBranch' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'dirty' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkedWorktrees' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'normalizedRemoteUrl' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hookTelemetry' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authTokenConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointSource' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producers' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'telemetryDir' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stack' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'languages' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nxWorkspace' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'packageManager' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pnpmWorkspace' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'turbo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'isForeign' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'worktreeSkillOverlayEnabled' },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetWorkspaceRepositoryQuery,
  GetWorkspaceRepositoryQueryVariables
>;
export const GetWorkspaceRepositoryForEditDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getWorkspaceRepositoryForEdit' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'repositoryId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projects' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceRepository' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'repositoryId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryCheckoutObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'foreignSkillInjectionEnabled' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inspection' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agentConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'agentsMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'claudeMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursorRules' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mcpJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skillsDir' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'git' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentBranch' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultBranch' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'dirty' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkedWorktrees' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'normalizedRemoteUrl' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hookTelemetry' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authTokenConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointSource' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producers' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'telemetryDir' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stack' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'languages' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nxWorkspace' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'packageManager' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pnpmWorkspace' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'turbo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'isForeign' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'worktreeSkillOverlayEnabled' },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetWorkspaceRepositoryForEditQuery,
  GetWorkspaceRepositoryForEditQueryVariables
>;
export const UpdateRepositoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateRepository' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateRepositoryInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateRepository' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryCheckoutObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'foreignSkillInjectionEnabled' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inspection' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agentConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'agentsMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'claudeMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursorRules' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mcpJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skillsDir' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'git' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentBranch' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultBranch' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'dirty' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkedWorktrees' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'normalizedRemoteUrl' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hookTelemetry' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authTokenConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointSource' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producers' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'telemetryDir' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stack' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'languages' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nxWorkspace' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'packageManager' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pnpmWorkspace' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'turbo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'isForeign' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'worktreeSkillOverlayEnabled' },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateRepositoryMutation,
  UpdateRepositoryMutationVariables
>;
export const GetSettingsRepositoriesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getSettingsRepositories' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspacePickerCapabilities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'canUseNativeDialog' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'defaultBrowsePath' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'roots' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceRepositories' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryCheckoutObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'foreignSkillInjectionEnabled' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inspection' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agentConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'agentsMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'claudeMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursorRules' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mcpJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skillsDir' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'git' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentBranch' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultBranch' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'dirty' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkedWorktrees' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'normalizedRemoteUrl' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hookTelemetry' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authTokenConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointSource' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producers' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'telemetryDir' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stack' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'languages' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nxWorkspace' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'packageManager' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pnpmWorkspace' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'turbo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'isForeign' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'worktreeSkillOverlayEnabled' },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetSettingsRepositoriesQuery,
  GetSettingsRepositoriesQueryVariables
>;
export const GetSettingsRepositoriesDiscoveryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getSettingsRepositoriesDiscovery' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'discoveredFolders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'alreadyRegistered' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'path' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'discoveredWorktrees' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'droppedCount' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'missingCheckouts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'checkoutId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'lastRemoval' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'agentSession' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'createdAt' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'id' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'outcome' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'parentCommand' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'removedAt' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'result' },
                            },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'path' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'repositoryId' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'problems' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'detail' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'path' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'repositoryId' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'scannedRoots' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'baseRoot' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'exists' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'path' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'source' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'worktreeCount' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'worktrees' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'DiscoveredWorktreeFields',
                        },
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
      name: { kind: 'Name', value: 'DiscoveredWorktreeFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'DiscoveredWorktreeObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'activity' } },
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkoutId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'path' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runMonitored' } },
          { kind: 'Field', name: { kind: 'Name', value: 'safeToRemove' } },
          { kind: 'Field', name: { kind: 'Name', value: 'unregistered' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetSettingsRepositoriesDiscoveryQuery,
  GetSettingsRepositoriesDiscoveryQueryVariables
>;
export const BrowseWorkspaceDirectoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'browseWorkspaceDirectory' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'browseDirectory' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'path' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'path' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'entries' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'alreadyRegistered' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isGitRepo' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'path' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'isGitRepo' } },
                { kind: 'Field', name: { kind: 'Name', value: 'parentPath' } },
                { kind: 'Field', name: { kind: 'Name', value: 'path' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  BrowseWorkspaceDirectoryQuery,
  BrowseWorkspaceDirectoryQueryVariables
>;
export const PickFolderNativeDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'pickFolderNative' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pickFolderNative' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'path' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PickFolderNativeMutation,
  PickFolderNativeMutationVariables
>;
export const AddWorkspaceFolderDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'addWorkspaceFolder' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'AddWorkspaceFolderInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addWorkspaceFolder' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'checkout' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'RepositoryCheckoutFields',
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'project' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'projectCreated' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'reconciliation' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'repository' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'WorkspaceRepositoryFields',
                        },
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
      name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryCheckoutObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'foreignSkillInjectionEnabled' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inspection' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agentConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'agentsMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'claudeMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursorRules' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mcpJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skillsDir' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'git' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentBranch' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultBranch' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'dirty' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkedWorktrees' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'normalizedRemoteUrl' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hookTelemetry' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authTokenConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointSource' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producers' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'telemetryDir' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stack' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'languages' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nxWorkspace' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'packageManager' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pnpmWorkspace' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'turbo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'isForeign' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'worktreeSkillOverlayEnabled' },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AddWorkspaceFolderMutation,
  AddWorkspaceFolderMutationVariables
>;
export const CloneRepositoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'cloneRepository' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CloneRepositoryInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cloneRepository' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'checkout' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'RepositoryCheckoutFields',
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'project' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'projectCreated' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'reconciliation' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'repository' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'WorkspaceRepositoryFields',
                        },
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
      name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryCheckoutObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'foreignSkillInjectionEnabled' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inspection' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agentConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'agentsMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'claudeMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursorRules' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mcpJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skillsDir' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'git' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentBranch' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultBranch' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'dirty' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkedWorktrees' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'normalizedRemoteUrl' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hookTelemetry' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authTokenConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointSource' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producers' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'telemetryDir' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stack' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'languages' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nxWorkspace' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'packageManager' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pnpmWorkspace' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'turbo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'isForeign' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'worktreeSkillOverlayEnabled' },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CloneRepositoryMutation,
  CloneRepositoryMutationVariables
>;
export const RefreshCheckoutDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'refreshCheckout' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RefreshCheckoutInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'refreshCheckout' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'checkout' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'RepositoryCheckoutFields',
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'drift' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'branchMoved' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pathMissing' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'remoteChanged' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'merged' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'repository' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'WorkspaceRepositoryFields',
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'supersededProjectId' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryCheckoutObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'foreignSkillInjectionEnabled' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inspection' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agentConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'agentsMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'claudeMd' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursorRules' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'mcpJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'skillsDir' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'git' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'currentBranch' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultBranch' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'dirty' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isRepo' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'linkedWorktrees' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'normalizedRemoteUrl' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hookTelemetry' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'authTokenConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointConfigured' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endpointSource' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producers' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'telemetryDir' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stack' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'languages' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'nxWorkspace' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'packageManager' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pnpmWorkspace' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'turbo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'isForeign' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'managed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repositoryId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'worktreeSkillOverlayEnabled' },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'WorkspaceRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'checkouts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RepositoryCheckoutFields' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'normalizedRemoteUrl' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RefreshCheckoutMutation,
  RefreshCheckoutMutationVariables
>;
export const PruneWorktreeCheckoutsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'pruneWorktreeCheckouts' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'PruneWorktreeCheckoutsInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pruneWorktreeCheckouts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'results' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'checkoutId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'outcome' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'path' } },
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
  PruneWorktreeCheckoutsMutation,
  PruneWorktreeCheckoutsMutationVariables
>;
export const RemovePlanRunWorktreeDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'removePlanRunWorktree' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'checkoutId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'removePlanRunWorktree' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'checkoutId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'checkoutId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
                { kind: 'Field', name: { kind: 'Name', value: 'checkoutId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'detail' } },
                { kind: 'Field', name: { kind: 'Name', value: 'outcome' } },
                { kind: 'Field', name: { kind: 'Name', value: 'path' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RemovePlanRunWorktreeMutation,
  RemovePlanRunWorktreeMutationVariables
>;
export const DeleteWorkspaceLocalRepositoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'deleteWorkspaceLocalRepository' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteWorkspaceLocalRepository' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DeleteWorkspaceLocalRepositoryMutation,
  DeleteWorkspaceLocalRepositoryMutationVariables
>;
export const RescanSettingsWorktreesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'rescanSettingsWorktrees' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'discoveredWorktrees' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'refresh' },
                value: { kind: 'BooleanValue', value: true },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RescanSettingsWorktreesQuery,
  RescanSettingsWorktreesQueryVariables
>;
export const GetRolloutFlagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getRolloutFlag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'rolloutFlag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RolloutFlagFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RolloutFlagFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RolloutFlagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'fallthrough' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'variations' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'variation' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'weight' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'offVariation' } },
          { kind: 'Field', name: { kind: 'Name', value: 'targetRoles' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'variations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'valueJson' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetRolloutFlagQuery, GetRolloutFlagQueryVariables>;
export const UpdateRolloutFlagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateRolloutFlag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateRolloutFlagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateRolloutFlag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RolloutFlagFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RolloutFlagFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RolloutFlagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'fallthrough' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'variations' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'variation' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'weight' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'offVariation' } },
          { kind: 'Field', name: { kind: 'Name', value: 'targetRoles' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'variations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'valueJson' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateRolloutFlagMutation,
  UpdateRolloutFlagMutationVariables
>;
export const ListRolloutFlagsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'listRolloutFlags' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'rolloutFlags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RolloutFlagFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RolloutFlagFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RolloutFlagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'fallthrough' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'variations' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'variation' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'weight' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'offVariation' } },
          { kind: 'Field', name: { kind: 'Name', value: 'targetRoles' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'variations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'valueJson' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ListRolloutFlagsQuery,
  ListRolloutFlagsQueryVariables
>;
export const CreateRolloutFlagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createRolloutFlag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateRolloutFlagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createRolloutFlag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RolloutFlagFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RolloutFlagFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RolloutFlagObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabled' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'fallthrough' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'variations' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'variation' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'weight' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'offVariation' } },
          { kind: 'Field', name: { kind: 'Name', value: 'targetRoles' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'variations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'valueJson' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateRolloutFlagMutation,
  CreateRolloutFlagMutationVariables
>;
export const DeleteRolloutFlagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'deleteRolloutFlag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteRolloutFlag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DeleteRolloutFlagMutation,
  DeleteRolloutFlagMutationVariables
>;
export const GetWorkspaceSettingsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getWorkspaceSettings' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workspaceSettings' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'localRepositories' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'WorkspaceLocalRepositoryFields',
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'profile' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'UserWorkspaceProfileFields',
                        },
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
      name: { kind: 'Name', value: 'WorkspaceLocalRepositoryFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'WorkspaceLocalRepositoryObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'filesystemPath' } },
          { kind: 'Field', name: { kind: 'Name', value: 'gitDefaultBranch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'gitRemoteUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'project' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserWorkspaceProfileFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'UserWorkspaceProfileObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'contactDisplayName' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'contactEmail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabledEditors' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetWorkspaceSettingsQuery,
  GetWorkspaceSettingsQueryVariables
>;
export const UpdateWorkspaceProfileDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateWorkspaceProfile' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateWorkspaceProfileInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateWorkspaceProfile' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UserWorkspaceProfileFields' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserWorkspaceProfileFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'UserWorkspaceProfileObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'contactDisplayName' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'contactEmail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'enabledEditors' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateWorkspaceProfileMutation,
  UpdateWorkspaceProfileMutationVariables
>;
export const ApplyWorkspaceEditorConfigurationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'applyWorkspaceEditorConfiguration' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NamedType',
            name: {
              kind: 'Name',
              value: 'ApplyWorkspaceEditorConfigurationInput',
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'applyWorkspaceEditorConfiguration' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'applications' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'editor' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'filesWritten' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'filesystemPath' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'repositoryId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'warnings' },
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
  ApplyWorkspaceEditorConfigurationMutation,
  ApplyWorkspaceEditorConfigurationMutationVariables
>;
export const GetEditorPresenceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getEditorPresence' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'editorPresence' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'editors' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'editor' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'presence' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'scannedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'trusted' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetEditorPresenceQuery,
  GetEditorPresenceQueryVariables
>;
export const GetSkillDetailUsageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getSkillDetailUsage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'start' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'end' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'skillName' },
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
            name: { kind: 'Name', value: 'skillUsage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'start' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'start' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'end' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'end' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'skillName' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'skillName' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'byDay' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'SkillDetailUsageByDay' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'bySkill' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'SkillDetailUsageBySkill',
                        },
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
      name: { kind: 'Name', value: 'SkillDetailUsageByDay' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageByDayObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'date' } },
          { kind: 'Field', name: { kind: 'Name', value: 'injectedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'oursCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'personalCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'thirdPartyCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'SkillDetailUsageBySkill' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageBySkillObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'abandonedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avgDurationMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outcomeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sessionEndedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'successCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetSkillDetailUsageQuery,
  GetSkillDetailUsageQueryVariables
>;
export const ProjectSkillsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ProjectSkills' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'projectId' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projectSkills' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'projectId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'projectId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'orphanSlugs' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'skills' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'description' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'orphanedAt' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'source' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'sourceUrl' },
                      },
                      {
                        kind: 'Field',
                        name: {
                          kind: 'Name',
                          value: 'staticDisableModelInvocation',
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'tags' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ProjectSkillsQuery, ProjectSkillsQueryVariables>;
export const SkillAvailabilityDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SkillAvailability' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'projectId' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'environment' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillAvailability' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'projectId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'projectId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'environment' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'environment' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'skills' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: {
                          kind: 'Name',
                          value: 'effectiveDisableModelInvocation',
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'provenance' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      {
                        kind: 'Field',
                        name: {
                          kind: 'Name',
                          value: 'staticDisableModelInvocation',
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'warnings' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SkillAvailabilityQuery,
  SkillAvailabilityQueryVariables
>;
export const SkillAvailabilityProjectsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SkillAvailabilityProjects' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projects' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'nxProjectName' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SkillAvailabilityProjectsQuery,
  SkillAvailabilityProjectsQueryVariables
>;
export const SkillAvailabilityAuthoringRuleSetDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SkillAvailabilityAuthoringRuleSet' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'projectId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillAvailabilityRuleSet' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'projectId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'projectId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'posture' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'rules' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'environment' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'slugAllow' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'slugDeny' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tagAllow' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tagDeny' },
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
  SkillAvailabilityAuthoringRuleSetQuery,
  SkillAvailabilityAuthoringRuleSetQueryVariables
>;
export const SkillAvailabilityAuthoringVocabularyDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SkillAvailabilityAuthoringVocabulary' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillTagVocabulary' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tags' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SkillAvailabilityAuthoringVocabularyQuery,
  SkillAvailabilityAuthoringVocabularyQueryVariables
>;
export const UpsertSkillAvailabilityRuleSetDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpsertSkillAvailabilityRuleSet' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'projectId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'posture' },
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
            name: { kind: 'Name', value: 'upsertSkillAvailabilityRuleSet' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'projectId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'projectId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'posture' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'posture' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'posture' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpsertSkillAvailabilityRuleSetMutation,
  UpsertSkillAvailabilityRuleSetMutationVariables
>;
export const DeleteSkillAvailabilityRuleSetDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteSkillAvailabilityRuleSet' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'projectId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteSkillAvailabilityRuleSet' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'projectId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'projectId' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DeleteSkillAvailabilityRuleSetMutation,
  DeleteSkillAvailabilityRuleSetMutationVariables
>;
export const AddSkillAvailabilityRuleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AddSkillAvailabilityRule' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'projectId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SkillAvailabilityRuleInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addSkillAvailabilityRule' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'projectId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'projectId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AddSkillAvailabilityRuleMutation,
  AddSkillAvailabilityRuleMutationVariables
>;
export const UpdateSkillAvailabilityRuleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateSkillAvailabilityRule' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'ruleId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'SkillAvailabilityRuleInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateSkillAvailabilityRule' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ruleId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'ruleId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateSkillAvailabilityRuleMutation,
  UpdateSkillAvailabilityRuleMutationVariables
>;
export const RemoveSkillAvailabilityRuleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RemoveSkillAvailabilityRule' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'ruleId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'removeSkillAvailabilityRule' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ruleId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'ruleId' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RemoveSkillAvailabilityRuleMutation,
  RemoveSkillAvailabilityRuleMutationVariables
>;
export const AddSkillTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AddSkillTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'AddSkillTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addSkillTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AddSkillTagMutation, AddSkillTagMutationVariables>;
export const RenameSkillTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RenameSkillTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RenameSkillTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'renameSkillTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RenameSkillTagMutation,
  RenameSkillTagMutationVariables
>;
export const RemoveSkillTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RemoveSkillTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RemoveSkillTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'removeSkillTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RemoveSkillTagMutation,
  RemoveSkillTagMutationVariables
>;
export const GetWorkstreamTimelineDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getWorkstreamTimeline' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'WorkstreamTimelineInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workstreamTimeline' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'from' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'markers' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'TimelineMarkerRow' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'spans' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'TimelineSpanRow' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'to' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'truncation' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'returned' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'truncated' },
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
      name: { kind: 'Name', value: 'TimelineMarkerRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TimelineMarkerObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'at' } },
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'laneKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'laneLabel' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'url' } },
          { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'TimelineSpanRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TimelineSpanObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'backend' } },
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkoutId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'conversationId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'derivedEnd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endsAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'laneKey' } },
          { kind: 'Field', name: { kind: 'Name', value: 'laneLabel' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startsAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetWorkstreamTimelineQuery,
  GetWorkstreamTimelineQueryVariables
>;
export const GetUsageDailyStatsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getUsageDailyStats' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'start' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'end' } },
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
            name: { kind: 'Name', value: 'dailyStatsRange' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'start' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'start' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'end' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'end' },
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
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'UsageDailyStatsRow' },
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
      name: { kind: 'Name', value: 'UsageDailyStatsRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'DailyStatsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'date' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansCompleted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansCreated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plansUpdated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksCompleted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksCreated' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tasksUpdated' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetUsageDailyStatsQuery,
  GetUsageDailyStatsQueryVariables
>;
export const GetUsageTokenUsageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getUsageTokenUsage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'start' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'end' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'provider' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'accountId' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tokenUsage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'start' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'start' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'end' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'end' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'provider' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'provider' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'accountId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'accountId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'byAccount' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'UsageTokenUsageByAccount',
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'UsageTokenUsageRow' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'totals' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'UsageTokenUsageTotals' },
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
      name: { kind: 'Name', value: 'UsageTokenUsageAccount' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageAccountObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'credentialKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastSeenAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'orgName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'plan' } },
          { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTokenUsageTotals' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageTotalsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'turnCount' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTokenUsageByAccount' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageByAccountObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'account' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UsageTokenUsageAccount' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'totals' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UsageTokenUsageTotals' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTokenUsageRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TokenUsageRowObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'agentAccountId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheReadTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cacheWriteTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'costUsd' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'inputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outputTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reasoningTokens' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalTokens' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetUsageTokenUsageQuery,
  GetUsageTokenUsageQueryVariables
>;
export const GetUsageSkillUsageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getUsageSkillUsage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'start' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'end' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'scope' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'gitBranch' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'cwd' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'repoIdentity' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillUsage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'start' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'start' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'end' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'end' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'scope' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'gitBranch' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'gitBranch' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'cwd' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'cwd' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'repoIdentity' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'repoIdentity' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'byDay' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'UsageSkillUsageByDay' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'byScope' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'UsageSkillUsageByScope' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'bySkill' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'UsageSkillUsageBySkill' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filterOptions' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'UsageSkillUsageFilterOptions',
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageSkillUsageByDay' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageByDayObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'date' } },
          { kind: 'Field', name: { kind: 'Name', value: 'injectedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'oursCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'personalCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'thirdPartyCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageSkillUsageByScope' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageByScopeObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scope' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageSkillUsageBySkill' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageBySkillObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'abandonedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avgDurationMs' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'errorCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'outcomeCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'scope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sessionEndedCount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'successCount' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageSkillUsageFilterOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'SkillUsageFilterOptionsObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cwds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'gitBranches' } },
          { kind: 'Field', name: { kind: 'Name', value: 'repoIdentities' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetUsageSkillUsageQuery,
  GetUsageSkillUsageQueryVariables
>;
export const GetUsageCaptureHealthDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getUsageCaptureHealth' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'captureHealth' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UsageCaptureHealthRow' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageCaptureHealthRow' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'CaptureHealthRowObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'lastCapturedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stream' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetUsageCaptureHealthQuery,
  GetUsageCaptureHealthQueryVariables
>;
export const GetUsageTelemetryCoverageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getUsageTelemetryCoverage' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'telemetryCoverage' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'currentPluginVersion' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'generatedAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'machines' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: 'UsageTelemetryCoverageMachine',
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'windowDays' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTelemetryCoverageRepo' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TelemetryRepoCoverageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deliveryLegs' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'deliveryLeg' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastSeenAt' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'repoIdentity' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UsageTelemetryCoverageMachine' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TelemetryMachineCoverageObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'buffer' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'deadLetterCount' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'oldestBufferedAt' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'totalBuffered' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'deliveryLegsSeen' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastSeenAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'machineId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'machineLabel' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'marketplacePluginInstalled' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'marketplacePluginVersion' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'pluginVersion' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repos' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'UsageTelemetryCoverageRepo' },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'warnings' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetUsageTelemetryCoverageQuery,
  GetUsageTelemetryCoverageQueryVariables
>;
export const ForgetUsageTelemetryMachineDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'forgetUsageTelemetryMachine' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'machineId' },
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
            name: { kind: 'Name', value: 'forgetTelemetryMachine' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'machineId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'machineId' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ForgetUsageTelemetryMachineMutation,
  ForgetUsageTelemetryMachineMutationVariables
>;
export const ScheduleFormAgentClisDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ScheduleFormAgentClis' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'discoverAgentClis' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'agents' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'attachesWorkspaceMcp' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'backend' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'label' } },
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
  ScheduleFormAgentClisQuery,
  ScheduleFormAgentClisQueryVariables
>;
export const SkillsRecordTagVocabularyDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SkillsRecordTagVocabulary' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'skillTagVocabulary' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tags' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'dimension' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SkillsRecordTagVocabularyQuery,
  SkillsRecordTagVocabularyQueryVariables
>;
export const AddProjectSkillTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AddProjectSkillTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'AddProjectSkillTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addProjectSkillTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tags' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AddProjectSkillTagMutation,
  AddProjectSkillTagMutationVariables
>;
export const RemoveProjectSkillTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RemoveProjectSkillTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RemoveProjectSkillTagInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'removeProjectSkillTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RemoveProjectSkillTagMutation,
  RemoveProjectSkillTagMutationVariables
>;
export const RemoveProjectSkillDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RemoveProjectSkill' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'projectId' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
        },
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
            name: { kind: 'Name', value: 'removeProjectSkill' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'projectId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'projectId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'slug' },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RemoveProjectSkillMutation,
  RemoveProjectSkillMutationVariables
>;
