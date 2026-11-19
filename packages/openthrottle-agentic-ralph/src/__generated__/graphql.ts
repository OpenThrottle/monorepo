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

export type ActivityByDateRangeInput = {
  /** End of range (ISO 8601). */
  endIso: string;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  /** Start of range (ISO 8601). */
  startIso: string;
};

export type AppendPlanOutputInput = {
  /** Content of the output chunk */
  content: string;
  /** Optional iteration number for the output chunk */
  iteration?: number | null | undefined;
  /** Optional producer tag for the chunk: loop, worker, tool or validation. Omit for an untagged chunk. */
  kind?: string | null | undefined;
  /** Plan id to append output to */
  planId: string;
  /** Optional task id to attribute this output chunk to (task-scoped output). Omit for plan-scoped chunks. */
  taskId?: string | null | undefined;
};

export type AttachWorkSessionSubjectInput = {
  /** Subject plan */
  planId: string;
  /** Session to attach the subject to */
  sessionId: string;
  /** Subject task (task-level subject); omit for plan-level */
  taskId?: string | null | undefined;
};

export type ClaimPlanMessagesInput = {
  /** Plan whose pending inbox to claim. */
  planId: string;
  /** The claiming run (plan_runs.id), stamped on each delivered message. Omit only when no run row exists. */
  planRunId?: string | null | undefined;
  /** The task the agent is about to start; delivered messages and the audit chunk are attributed to it. */
  taskId?: string | null | undefined;
};

export type CreateNoteInput = {
  author?: string | null | undefined;
  content: string;
};

export type CreatePlanInput = {
  assignee?: string | null | undefined;
  author: string;
  category: string;
  description?: string | null | undefined;
  /** Optional client-chosen plan id (UUID) that makes the create idempotent. Re-sending a create with the same id and title returns the plan the first call created instead of inserting a second, so a caller whose request timed out can retry safely. A different title under an existing id is refused. */
  id?: string | null | undefined;
  project?: string | null | undefined;
  /** Optional. Project UUID (FK to projects table). Omit or pass null when plan is not linked to a project. */
  projectId?: string | null | undefined;
  /** JSON string of workflow-ralph run configuration (PlanRunConfigStorage v1). Omit to use defaults. */
  runConfigJson?: string | null | undefined;
  status?: string | null | undefined;
  summary?: string | null | undefined;
  title: string;
  /** Optional. Absolute path of the caller's workspace (typically the MCP client's cwd). Resolved SERVER-SIDE to one of the caller's own registered checkouts and recorded as the plan's default run workspace, so the Configuration tab opens pre-selected. Treated as a hint, never trusted: a path the caller does not own, an unregistered path or a relative path is ignored. Ignored entirely when runConfigJson already names a workspace, and never fails plan creation. */
  workspacePath?: string | null | undefined;
};

export type CreatePlansInput = {
  /** Plans to create atomically in one transaction. Each item carries its own author/category/title (same shape as createPlan). */
  plans: Array<CreatePlanInput>;
};

export type CreateProjectInput = {
  description?: string | null | undefined;
  name: string;
  /** NX project name (e.g. applications/openthrottle-server) */
  nxProjectName?: string | null | undefined;
};

export type CreateTaskInput = {
  assignee?: string | null | undefined;
  category?: string | null | undefined;
  description?: string | null | undefined;
  /** Plan id the task belongs to */
  planId: string;
  project?: string | null | undefined;
  /** Project UUID (FK to projects table). Omit or pass null when task is not linked to a project. */
  projectId?: string | null | undefined;
  /** JSON string of requirements array */
  requirements?: string | null | undefined;
  /** Optional. Execution order within plan. When omitted, server auto-assigns MAX+1000. */
  sortOrder?: number | null | undefined;
  status?: string | null | undefined;
  summary?: string | null | undefined;
  title: string;
  /** Optional. Coarse concurrency layer within the plan: tasks sharing a wave may be worked concurrently. Never 0; NULL (omitted) means unassigned and runs sequentially in sortOrder position. Not consumed for execution yet. */
  wave?: number | null | undefined;
};

export type CreateTasksInput = {
  /** Plan id all tasks in this batch belong to */
  planId: string;
  /** Tasks to create atomically in one transaction. sortOrder is per-item optional; omitted items append MAX+1000, MAX+2000, … in array order. */
  tasks: Array<CreateTasksItemInput>;
};

export type CreateTasksItemInput = {
  assignee?: string | null | undefined;
  category?: string | null | undefined;
  description?: string | null | undefined;
  project?: string | null | undefined;
  /** Project UUID (FK to projects table). Omit or pass null when task is not linked to a project. */
  projectId?: string | null | undefined;
  /** JSON string of requirements array */
  requirements?: string | null | undefined;
  /** Optional. Execution order within plan. When omitted, server auto-assigns MAX+1000 stepping in array order. */
  sortOrder?: number | null | undefined;
  status?: string | null | undefined;
  summary?: string | null | undefined;
  title: string;
  /** Optional. Coarse concurrency layer within the plan: tasks sharing a wave may be worked concurrently. Never 0; NULL (omitted) means unassigned and runs sequentially in sortOrder position. Not consumed for execution yet. */
  wave?: number | null | undefined;
};

export type DeletePlanInput = {
  /** Plan id to delete */
  id: string;
};

export type DeleteProjectInput = {
  /** Project id to delete */
  id: string;
};

export type DeleteTaskInput = {
  /** Task id to delete */
  id: string;
};

export type EndWorkSessionInput = {
  /** Session to close */
  sessionId: string;
  /** Summary set at close (legibility for unpromoted sessions) */
  summary?: string | null | undefined;
};

export type LastActivityInput = {
  /** Plan ID (UUID). Returns the single most recent activity for this plan. */
  planId: string;
  /** Optional task ID to scope the last activity to that task. */
  taskId?: string | null | undefined;
};

export type ListPlanMessagesInput = {
  /** Return only these kinds. Omit for every kind. */
  kinds?: Array<PlanMessageKind> | null | undefined;
  /** Plan whose inbox to list. */
  planId: string;
  /** Return only these statuses. Omit for every status. */
  statuses?: Array<PlanMessageStatus> | null | undefined;
};

export type ListPlanOutputStreamChunksInput = {
  /** Max rows to return (default and hard cap: 1000). */
  limit?: number | null | undefined;
  /** Rows to skip (pagination offset). */
  offset?: number | null | undefined;
  /** Plan id to list chunks for */
  planId: string;
  /** Return only chunks attributed to this task id. Omit for the whole plan stream (both tagged and untagged chunks). */
  taskId?: string | null | undefined;
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
export type PlanRunsByPlanIdInput = {
  /** When true, every SCHEDULED run of the plan is returned however old its row is, and limit caps only the runs that are not SCHEDULED. Rows stay newest createdAt first, so the first row is then not necessarily the newest run. Default false: limit caps every run. */
  includeAllScheduled?: boolean | null | undefined;
  /** Max plan-run audit rows to return, newest first. */
  limit?: number | null | undefined;
  /** Plan id whose run audit rows should be returned */
  planId: string;
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
export type PromoteTaskToPlanInput = {
  /** Optional idempotency key: re-submitting the same key enqueues at most one promotion job. Letters, digits, and ._:- only. */
  idempotencyKey?: string | null | undefined;
  /** Id of the task to promote into a new plan */
  taskId: string;
};

export type RecordAgentTrajectoryInput = {
  /** Agent driver that produced the run, for example claude. */
  driver: string;
  /** Wall-clock duration of the run in milliseconds. */
  durationMs?: number | null | undefined;
  /** Process exit code of the run. */
  exitCode?: number | null | undefined;
  /** Optional key that makes recording idempotent: a second call with the same key returns the stored trajectory instead of inserting another. Clients use session:<sessionId>:<toolUseId> for session uploads and spawned:<planRunId>:<iteration> for spawned runs. At most 200 characters. */
  idempotencyKey?: string | null | undefined;
  /** Model that ran, when known. */
  model?: string | null | undefined;
  /** Free-form result label for the run, for example completed. */
  outcome?: string | null | undefined;
  /** Plan run the trajectory belongs to. */
  planRunId: string;
  /** How the trajectory was captured: spawned or session_upload. */
  source: string;
  /** Task the run worked on. Omit for a run not scoped to one task. */
  taskId?: string | null | undefined;
  /** The ATIF document as a JSON string. Validated, then capped server-side at 4 MiB. */
  trajectoryJson: string;
};

export type RecordPlanRunHeartbeatInput = {
  /** Plan-run row id to bump the liveness heartbeat on (returned by registerCliPlanRun). */
  planRunId: string;
};

export type RecordWorkArtifactInput = {
  /** Optional human-readable note (e.g. commit message) */
  message?: string | null | undefined;
  /** JSON-serialized payload; validated server-side against the type's schema */
  payloadJson: string;
  /** Session that produced the artifact */
  sessionId: string;
  /** Artifact type: git_commit | pull_request | document | deployment | status_change */
  type: string;
};

export type RegisterCliPlanRunInput = {
  /** OPTIONAL git branch this detached-CLI run operates on. Captured on plan_runs.branch as run provenance. Omit or null → store null; non-empty strings are stored verbatim (no server-side trim/reject — enqueue remains the REQUIRED branch boundary). */
  branch?: string | null | undefined;
  /** Execution backend for this run: antigravity, claude, codex, cursor, grok, or opencode. */
  executionBackend: string;
  /** Whether this run's owner bumps its heartbeat on a ~15s timer. Omit or null → true, so the detached workflow-ralph CLI (which does) is unaffected. Pass false for an owner with no timer — an interactive /ot-loop agent turn, where a single test run outlives the staleness cutoff. A false run is exempt from the stale sweep, always reports isStale false, and can never yield RUN_STOPPING on cancel; nothing server-side will ever settle it, so its owner must. */
  heartbeatExpected?: boolean | null | undefined;
  /** Host the CLI is running on (diagnostic; cleared on settle). Null when unknown. */
  hostname?: string | null | undefined;
  /** OPTIONAL resolved agent model id for this run (e.g. claude-opus-5). Captured on plan_runs.model as run provenance. Omit or null → store null; non-empty strings are stored verbatim. Prefer null over a guess: a wrong value here is worse than a missing one, because nothing downstream can tell it is wrong. */
  model?: string | null | undefined;
  /** OS process id of the CLI process (cleared on settle). Null when unknown. */
  pid?: number | null | undefined;
  /** Plan id this detached-CLI run executes. */
  planId: string;
  /** Worker/run identifier for the CLI (cleared on settle). Null when unknown. */
  workerId?: string | null | undefined;
};

export type RegisterInput = {
  /** User email (must be unique) */
  email: string;
  /** GitHub username for display; defaults to email local part if omitted */
  githubUsername?: string | null | undefined;
  /** User password (stored hashed with bcrypt) */
  password: string;
};

export type RegisterPlanRunWorktreeCheckoutInput = {
  /** Absolute filesystem path of the resolved worktree for this run. */
  filesystemPath: string;
  /** Plan-run row id whose checkout_id (and branch) should be pointed at the linked worktree path. */
  planRunId: string;
};

export type RemainingTasksByPlanIdInput = {
  /** Plan id; returns tasks with status in PENDING, IN_PROGRESS, BLOCKED */
  planId: string;
};

export type ReorderPlanTasksInput = {
  /** Plan id whose tasks are being reordered */
  planId: string;
  /** Task ids in desired order; sortOrder is reassigned 1000, 2000, … atomically */
  taskIds: Array<string>;
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

export type SettleCliPlanRunInput = {
  /** Branch head sha at PR-open. Recorded as a git_commit artifact on COMPLETED; the verifier maps it to its squash commit once the PR merges. Optional — a run that exits without opening a PR has none. */
  headSha?: string | null | undefined;
  /** Plan-run row id to settle (returned by registerCliPlanRun). */
  planRunId: string;
  /** Number of the PR the run opened. Recorded as a pull_request artifact on COMPLETED — it survives a rebase or amend, which the head sha does not. Optional. */
  prNumber?: number | null | undefined;
  /** Terminal status to set: COMPLETED, CANCELLED, FAILED, or USAGE_LIMITED. Normalized to uppercase. */
  status: string;
  /** When the usage limit that stopped the run lifts, as reported by the agent CLI. Recorded only when status is USAGE_LIMITED; ignored otherwise. Null when the CLI reported no reset time. */
  usageLimitResetsAt?: string | null | undefined;
  /** Raw name of the usage-limit window that stopped the run (five_hour, seven_day, ...). Recorded only when status is USAGE_LIMITED; ignored otherwise. */
  usageLimitType?: string | null | undefined;
};

export type StartWorkSessionInput = {
  /** Chat conversation id when this session is a chat thread */
  conversationId?: string | null | undefined;
  /** External correlation id (BullMQ job id, worktree+pid, agent session id) */
  externalRef?: string | null | undefined;
  /** Model identifier when an agent did the work (e.g. claude-fable-5) */
  model?: string | null | undefined;
  /** Unverified hint: the human this machine work is on behalf of (users.id) */
  onBehalfOfUserId?: string | null | undefined;
  /** plan_runs.id when this session is a Ralph run */
  planRunId?: string | null | undefined;
  /** Tool that produced the work: developer-app | openthrottle-mcp | workflow-ralph | MCP clientInfo.name */
  toolName: string;
  /** Tool/client version */
  toolVersion?: string | null | undefined;
};

export type TasksByPlanIdInput = {
  /** Plan id to list tasks for */
  planId: string;
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

export type WorkArtifactsByPlanInput = {
  /** Plan id to list linked artifacts for */
  planId: string;
};

export type NoteFragment = {
  author: string | null;
  content: string;
  createdAt: string;
  id: string;
  updatedAt: string;
};

export type PlanFragment = {
  assignee: string | null;
  author: string;
  category: string;
  completedAt: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  jobRunHooksJson: string;
  project: string | null;
  projectId: string | null;
  runConfigJson: string;
  status: string;
  summary: string | null;
  title: string;
  updatedAt: string;
};

export type TaskFragment = {
  assignee: string | null;
  category: string | null;
  completedAt: string | null;
  createdAt: string;
  description: string | null;
  hookRole: string | null;
  hookScope: string | null;
  hookSource: string | null;
  id: string;
  parentTaskId: string | null;
  planId: string;
  project: string | null;
  projectId: string | null;
  requirementsJson: string;
  skillSlug: string | null;
  sortOrder: number;
  status: string;
  summary: string | null;
  title: string;
  updatedAt: string;
  wave: number | null;
};

export type ProjectFragment = {
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  nxProjectName: string | null;
  updatedAt: string;
};

export type PlanRunFragment = {
  branch: string | null;
  bullmqJobId: string | null;
  cancelRequestedAt: string | null;
  createdAt: string;
  executionBackend: string;
  heartbeatExpected: boolean;
  id: string;
  isStale: boolean;
  lastHeartbeatAt: string | null;
  model: string | null;
  planId: string;
  queueName: string;
  resumeOfRunId: string | null;
  runKind: string;
  settledReason: string | null;
  status: string;
  updatedAt: string;
  usageLimitResetsAt: string | null;
  usageLimitType: string | null;
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

export type DeleteNoteMutationVariables = Exact<{
  id: string;
}>;

export type DeleteNoteMutation = { deleteNote: boolean };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;

export type RegisterMutation = {
  register: { accessToken: string; email: string; id: string };
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

export type CreatePlanMutationVariables = Exact<{
  input: CreatePlanInput;
}>;

export type CreatePlanMutation = {
  createPlan: {
    assignee: string | null;
    author: string;
    category: string;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    id: string;
    jobRunHooksJson: string;
    project: string | null;
    projectId: string | null;
    runConfigJson: string;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
  };
};

export type UpdatePlanMutationVariables = Exact<{
  input: UpdatePlanInput;
}>;

export type UpdatePlanMutation = {
  updatePlan: {
    assignee: string | null;
    author: string;
    category: string;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    id: string;
    jobRunHooksJson: string;
    project: string | null;
    projectId: string | null;
    runConfigJson: string;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
  } | null;
};

export type DeletePlanMutationVariables = Exact<{
  input: DeletePlanInput;
}>;

export type DeletePlanMutation = { deletePlan: boolean };

export type CreateTaskMutationVariables = Exact<{
  input: CreateTaskInput;
}>;

export type CreateTaskMutation = {
  createTask: {
    assignee: string | null;
    category: string | null;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    parentTaskId: string | null;
    planId: string;
    project: string | null;
    projectId: string | null;
    requirementsJson: string;
    skillSlug: string | null;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
  };
};

export type CreateTasksMutationVariables = Exact<{
  input: CreateTasksInput;
}>;

export type CreateTasksMutation = {
  createTasks: {
    totalCount: number;
    tasks: Array<{
      assignee: string | null;
      category: string | null;
      completedAt: string | null;
      createdAt: string;
      description: string | null;
      hookRole: string | null;
      hookScope: string | null;
      hookSource: string | null;
      id: string;
      parentTaskId: string | null;
      planId: string;
      project: string | null;
      projectId: string | null;
      requirementsJson: string;
      skillSlug: string | null;
      sortOrder: number;
      status: string;
      summary: string | null;
      title: string;
      updatedAt: string;
      wave: number | null;
    }>;
  };
};

export type CreatePlansMutationVariables = Exact<{
  input: CreatePlansInput;
}>;

export type CreatePlansMutation = {
  createPlans: {
    totalCount: number;
    plans: Array<{
      assignee: string | null;
      author: string;
      category: string;
      completedAt: string | null;
      createdAt: string;
      description: string | null;
      id: string;
      jobRunHooksJson: string;
      project: string | null;
      projectId: string | null;
      runConfigJson: string;
      status: string;
      summary: string | null;
      title: string;
      updatedAt: string;
    }>;
  };
};

export type UpdateTaskMutationVariables = Exact<{
  input: UpdateTaskInput;
}>;

export type UpdateTaskMutation = {
  updateTask: {
    assignee: string | null;
    category: string | null;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    parentTaskId: string | null;
    planId: string;
    project: string | null;
    projectId: string | null;
    requirementsJson: string;
    skillSlug: string | null;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
  } | null;
};

export type DeleteTaskMutationVariables = Exact<{
  input: DeleteTaskInput;
}>;

export type DeleteTaskMutation = { deleteTask: boolean };

export type PromoteTaskToPlanMutationVariables = Exact<{
  input: PromoteTaskToPlanInput;
}>;

export type PromoteTaskToPlanMutation = {
  promoteTaskToPlan: {
    error: string | null;
    jobId: string | null;
    success: boolean;
  };
};

export type ReorderPlanTasksMutationVariables = Exact<{
  input: ReorderPlanTasksInput;
}>;

export type ReorderPlanTasksMutation = {
  reorderPlanTasks: Array<{
    assignee: string | null;
    category: string | null;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    parentTaskId: string | null;
    planId: string;
    project: string | null;
    projectId: string | null;
    requirementsJson: string;
    skillSlug: string | null;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
  }>;
};

export type AppendPlanOutputMutationVariables = Exact<{
  input: AppendPlanOutputInput;
}>;

export type AppendPlanOutputMutation = {
  appendPlanOutput: {
    content: string;
    createdAt: string;
    id: string;
    iteration: number | null;
    planId: string;
    taskId: string | null;
  };
};

export type RalphClaimPlanMessagesMutationVariables = Exact<{
  input: ClaimPlanMessagesInput;
}>;

export type RalphClaimPlanMessagesMutation = {
  claimPlanMessages: {
    messages: Array<{ body: string; id: string; kind: PlanMessageKind }>;
  };
};

export type RalphStartWorkSessionMutationVariables = Exact<{
  input: StartWorkSessionInput;
}>;

export type RalphStartWorkSessionMutation = {
  startWorkSession: { id: string };
};

export type RalphAttachWorkSessionSubjectMutationVariables = Exact<{
  input: AttachWorkSessionSubjectInput;
}>;

export type RalphAttachWorkSessionSubjectMutation = {
  attachWorkSessionSubject: { id: string };
};

export type RalphRecordWorkArtifactMutationVariables = Exact<{
  input: RecordWorkArtifactInput;
}>;

export type RalphRecordWorkArtifactMutation = {
  recordWorkArtifact: { createdAt: string; id: string; message: string | null };
};

export type RalphEndWorkSessionMutationVariables = Exact<{
  input: EndWorkSessionInput;
}>;

export type RalphEndWorkSessionMutation = {
  endWorkSession: { id: string } | null;
};

export type RegisterCliPlanRunMutationVariables = Exact<{
  input: RegisterCliPlanRunInput;
}>;

export type RegisterCliPlanRunMutation = {
  registerCliPlanRun: {
    hostname: string | null;
    pid: number | null;
    workerId: string | null;
    branch: string | null;
    bullmqJobId: string | null;
    cancelRequestedAt: string | null;
    createdAt: string;
    executionBackend: string;
    heartbeatExpected: boolean;
    id: string;
    isStale: boolean;
    lastHeartbeatAt: string | null;
    model: string | null;
    planId: string;
    queueName: string;
    resumeOfRunId: string | null;
    runKind: string;
    settledReason: string | null;
    status: string;
    updatedAt: string;
    usageLimitResetsAt: string | null;
    usageLimitType: string | null;
  };
};

export type SettleCliPlanRunMutationVariables = Exact<{
  input: SettleCliPlanRunInput;
}>;

export type SettleCliPlanRunMutation = {
  settleCliPlanRun: {
    hostname: string | null;
    pid: number | null;
    workerId: string | null;
    branch: string | null;
    bullmqJobId: string | null;
    cancelRequestedAt: string | null;
    createdAt: string;
    executionBackend: string;
    heartbeatExpected: boolean;
    id: string;
    isStale: boolean;
    lastHeartbeatAt: string | null;
    model: string | null;
    planId: string;
    queueName: string;
    resumeOfRunId: string | null;
    runKind: string;
    settledReason: string | null;
    status: string;
    updatedAt: string;
    usageLimitResetsAt: string | null;
    usageLimitType: string | null;
  } | null;
};

export type RecordPlanRunHeartbeatMutationVariables = Exact<{
  input: RecordPlanRunHeartbeatInput;
}>;

export type RecordPlanRunHeartbeatMutation = {
  recordPlanRunHeartbeat: {
    id: string;
    lastHeartbeatAt: string | null;
    status: string;
  } | null;
};

export type RegisterPlanRunWorktreeCheckoutMutationVariables = Exact<{
  input: RegisterPlanRunWorktreeCheckoutInput;
}>;

export type RegisterPlanRunWorktreeCheckoutMutation = {
  registerPlanRunWorktreeCheckout: {
    branch: string | null;
    bullmqJobId: string | null;
    cancelRequestedAt: string | null;
    createdAt: string;
    executionBackend: string;
    heartbeatExpected: boolean;
    id: string;
    isStale: boolean;
    lastHeartbeatAt: string | null;
    model: string | null;
    planId: string;
    queueName: string;
    resumeOfRunId: string | null;
    runKind: string;
    settledReason: string | null;
    status: string;
    updatedAt: string;
    usageLimitResetsAt: string | null;
    usageLimitType: string | null;
    checkout: {
      displayName: string;
      filesystemPath: string;
      kind: string;
    } | null;
  } | null;
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

export type DeleteProjectMutationVariables = Exact<{
  input: DeleteProjectInput;
}>;

export type DeleteProjectMutation = { deleteProject: boolean };

export type RecordAgentTrajectoryMutationVariables = Exact<{
  input: RecordAgentTrajectoryInput;
}>;

export type RecordAgentTrajectoryMutation = {
  recordAgentTrajectory: {
    byteSize: number;
    id: string;
    incomplete: boolean;
    toolCallCount: number;
    truncated: boolean;
  };
};

export type GetNoteQueryVariables = Exact<{
  id: string;
}>;

export type GetNoteQuery = {
  note: {
    author: string | null;
    content: string;
    createdAt: string;
    id: string;
    updatedAt: string;
  } | null;
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

export type GetServerHealthQueryVariables = Exact<{ [key: string]: never }>;

export type GetServerHealthQuery = {
  serverHealth: {
    api: string;
    database: string;
    redis: string;
    websocket: string;
  };
};

export type GetPlanQueryVariables = Exact<{
  id: string;
}>;

export type GetPlanQuery = {
  plan: {
    assignee: string | null;
    author: string;
    category: string;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    id: string;
    jobRunHooksJson: string;
    project: string | null;
    projectId: string | null;
    runConfigJson: string;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    tags: Array<{ dimension: string; source: string; tag: string }>;
  } | null;
};

export type ListPlansByStatusQueryVariables = Exact<{
  input: ListPlansByStatusInput;
}>;

export type ListPlansByStatusQuery = {
  listPlansByStatus: {
    totalCount: number;
    plans: Array<{
      assignee: string | null;
      author: string;
      category: string;
      completedAt: string | null;
      createdAt: string;
      description: string | null;
      id: string;
      jobRunHooksJson: string;
      project: string | null;
      projectId: string | null;
      runConfigJson: string;
      status: string;
      summary: string | null;
      title: string;
      updatedAt: string;
      tags: Array<{ dimension: string; source: string; tag: string }>;
    }>;
  };
};

export type GetTaskQueryVariables = Exact<{
  id: string;
}>;

export type GetTaskQuery = {
  task: {
    assignee: string | null;
    category: string | null;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    parentTaskId: string | null;
    planId: string;
    project: string | null;
    projectId: string | null;
    requirementsJson: string;
    skillSlug: string | null;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
  } | null;
};

export type GetTasksByPlanIdQueryVariables = Exact<{
  input: TasksByPlanIdInput;
}>;

export type GetTasksByPlanIdQuery = {
  tasksByPlanId: Array<{
    assignee: string | null;
    category: string | null;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    parentTaskId: string | null;
    planId: string;
    project: string | null;
    projectId: string | null;
    requirementsJson: string;
    skillSlug: string | null;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
  }>;
};

export type GetRemainingTasksByPlanIdQueryVariables = Exact<{
  input: RemainingTasksByPlanIdInput;
}>;

export type GetRemainingTasksByPlanIdQuery = {
  remainingTasksByPlanId: Array<{
    assignee: string | null;
    category: string | null;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    parentTaskId: string | null;
    planId: string;
    project: string | null;
    projectId: string | null;
    requirementsJson: string;
    skillSlug: string | null;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
  }>;
};

export type GetTasksQueryVariables = Exact<{
  limit?: number | null | undefined;
}>;

export type GetTasksQuery = {
  tasks: Array<{
    assignee: string | null;
    category: string | null;
    completedAt: string | null;
    createdAt: string;
    description: string | null;
    hookRole: string | null;
    hookScope: string | null;
    hookSource: string | null;
    id: string;
    parentTaskId: string | null;
    planId: string;
    project: string | null;
    projectId: string | null;
    requirementsJson: string;
    skillSlug: string | null;
    sortOrder: number;
    status: string;
    summary: string | null;
    title: string;
    updatedAt: string;
    wave: number | null;
  }>;
};

export type GetWorkArtifactsByPlanQueryVariables = Exact<{
  input: WorkArtifactsByPlanInput;
}>;

export type GetWorkArtifactsByPlanQuery = {
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
      source: string;
      type: string;
      verification: string;
    }>;
  };
};

export type GetActivityByDateQueryVariables = Exact<{
  input: ActivityByDateInput;
}>;

export type GetActivityByDateQuery = {
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
      taskId: string | null;
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
};

export type GetActivityByDateRangeQueryVariables = Exact<{
  input: ActivityByDateRangeInput;
}>;

export type GetActivityByDateRangeQuery = {
  activityByDateRange: {
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
      taskId: string | null;
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
};

export type GetLastActivityQueryVariables = Exact<{
  input: LastActivityInput;
}>;

export type GetLastActivityQuery = {
  lastActivity: {
    at: string;
    kind: string;
    planId: string;
    summary: string;
    taskId: string | null;
    commit: { message: string | null; repo: string; sha: string } | null;
    outputChunk: {
      content: string;
      iteration: number | null;
      taskId: string | null;
    } | null;
    taskUpdate: { status: string; taskId: string; taskTitle: string } | null;
  } | null;
};

export type GetPlanOutputStreamChunksQueryVariables = Exact<{
  input: ListPlanOutputStreamChunksInput;
}>;

export type GetPlanOutputStreamChunksQuery = {
  planOutputStreamChunks: Array<{
    content: string;
    createdAt: string;
    id: string;
    iteration: number | null;
    planId: string;
    taskId: string | null;
  }>;
};

export type SearchQueryVariables = Exact<{
  input: SearchInput;
}>;

export type SearchQuery = {
  search: {
    mode: string;
    reason: string | null;
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

export type GetDocumentQueryVariables = Exact<{
  id: string;
}>;

export type GetDocumentQuery = {
  getDocument: {
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
  } | null;
};

export type ListSourcesQueryVariables = Exact<{ [key: string]: never }>;

export type ListSourcesQuery = {
  listSources: {
    plans: Array<{ id: string; title: string }>;
    sources: Array<{ description: string; name: string }>;
  };
};

export type ReadPlanRunCancelMarkerQueryVariables = Exact<{
  input: PlanRunsByPlanIdInput;
}>;

export type ReadPlanRunCancelMarkerQuery = {
  planRunsByPlanId: Array<{
    cancelRequestedAt: string | null;
    createdAt: string;
    id: string;
    status: string;
  }>;
};

export type GetPlanRunsQueryVariables = Exact<{
  input: PlanRunsByPlanIdInput;
}>;

export type GetPlanRunsQuery = {
  planRunsByPlanId: Array<{
    branch: string | null;
    bullmqJobId: string | null;
    cancelRequestedAt: string | null;
    createdAt: string;
    executionBackend: string;
    heartbeatExpected: boolean;
    id: string;
    isStale: boolean;
    lastHeartbeatAt: string | null;
    model: string | null;
    planId: string;
    queueName: string;
    resumeOfRunId: string | null;
    runKind: string;
    settledReason: string | null;
    status: string;
    updatedAt: string;
    usageLimitResetsAt: string | null;
    usageLimitType: string | null;
    checkout: {
      displayName: string;
      filesystemPath: string;
      kind: string;
    } | null;
  }>;
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
  }>;
};

export type GetProjectQueryVariables = Exact<{
  id: string;
}>;

export type GetProjectQuery = {
  project: {
    createdAt: string;
    description: string | null;
    id: string;
    name: string;
    nxProjectName: string | null;
    updatedAt: string;
  } | null;
};

export type RalphDeliveredPlanMessagesQueryVariables = Exact<{
  input: ListPlanMessagesInput;
}>;

export type RalphDeliveredPlanMessagesQuery = {
  planMessages: Array<{ body: string; id: string; planRunId: string | null }>;
};

export const NoteFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Note' },
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
} as unknown as DocumentNode<NoteFragment, unknown>;
export const PlanFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Plan' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlanFragment, unknown>;
export const TaskFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Task' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'parentTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
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
} as unknown as DocumentNode<TaskFragment, unknown>;
export const ProjectFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Project' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ProjectFragment, unknown>;
export const PlanRunFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanRun' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'executionBackend' } },
          { kind: 'Field', name: { kind: 'Name', value: 'heartbeatExpected' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isStale' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastHeartbeatAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'settledReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'usageLimitType' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlanRunFragment, unknown>;
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
                  name: { kind: 'Name', value: 'Note' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Note' },
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
export const DeleteNoteDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'deleteNote' },
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
            name: { kind: 'Name', value: 'deleteNote' },
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
} as unknown as DocumentNode<DeleteNoteMutation, DeleteNoteMutationVariables>;
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
                  name: { kind: 'Name', value: 'Note' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Note' },
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
export const CreatePlanDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createPlan' },
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
              name: { kind: 'Name', value: 'CreatePlanInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createPlan' },
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
                  name: { kind: 'Name', value: 'Plan' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Plan' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreatePlanMutation, CreatePlanMutationVariables>;
export const UpdatePlanDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updatePlan' },
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
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Plan' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Plan' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdatePlanMutation, UpdatePlanMutationVariables>;
export const DeletePlanDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'deletePlan' },
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
              name: { kind: 'Name', value: 'DeletePlanInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deletePlan' },
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
} as unknown as DocumentNode<DeletePlanMutation, DeletePlanMutationVariables>;
export const CreateTaskDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createTask' },
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
              name: { kind: 'Name', value: 'CreateTaskInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createTask' },
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
                  name: { kind: 'Name', value: 'Task' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Task' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'parentTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
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
} as unknown as DocumentNode<CreateTaskMutation, CreateTaskMutationVariables>;
export const CreateTasksDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createTasks' },
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
              name: { kind: 'Name', value: 'CreateTasksInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createTasks' },
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
                  name: { kind: 'Name', value: 'tasks' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'Task' },
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
      name: { kind: 'Name', value: 'Task' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'parentTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
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
} as unknown as DocumentNode<CreateTasksMutation, CreateTasksMutationVariables>;
export const CreatePlansDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createPlans' },
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
              name: { kind: 'Name', value: 'CreatePlansInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createPlans' },
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
                        name: { kind: 'Name', value: 'Plan' },
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
      name: { kind: 'Name', value: 'Plan' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreatePlansMutation, CreatePlansMutationVariables>;
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
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Task' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Task' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'parentTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
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
} as unknown as DocumentNode<UpdateTaskMutation, UpdateTaskMutationVariables>;
export const DeleteTaskDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'deleteTask' },
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
              name: { kind: 'Name', value: 'DeleteTaskInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteTask' },
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
} as unknown as DocumentNode<DeleteTaskMutation, DeleteTaskMutationVariables>;
export const PromoteTaskToPlanDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'promoteTaskToPlan' },
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
  PromoteTaskToPlanMutation,
  PromoteTaskToPlanMutationVariables
>;
export const ReorderPlanTasksDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'reorderPlanTasks' },
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
              name: { kind: 'Name', value: 'ReorderPlanTasksInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'reorderPlanTasks' },
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
                  name: { kind: 'Name', value: 'Task' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Task' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'parentTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
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
  ReorderPlanTasksMutation,
  ReorderPlanTasksMutationVariables
>;
export const AppendPlanOutputDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'appendPlanOutput' },
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
              name: { kind: 'Name', value: 'AppendPlanOutputInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'appendPlanOutput' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'iteration' } },
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
  AppendPlanOutputMutation,
  AppendPlanOutputMutationVariables
>;
export const RalphClaimPlanMessagesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ralphClaimPlanMessages' },
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
              name: { kind: 'Name', value: 'ClaimPlanMessagesInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'claimPlanMessages' },
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
                      { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
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
  RalphClaimPlanMessagesMutation,
  RalphClaimPlanMessagesMutationVariables
>;
export const RalphStartWorkSessionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ralphStartWorkSession' },
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
              name: { kind: 'Name', value: 'StartWorkSessionInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'startWorkSession' },
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
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RalphStartWorkSessionMutation,
  RalphStartWorkSessionMutationVariables
>;
export const RalphAttachWorkSessionSubjectDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ralphAttachWorkSessionSubject' },
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
              name: { kind: 'Name', value: 'AttachWorkSessionSubjectInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'attachWorkSessionSubject' },
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
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RalphAttachWorkSessionSubjectMutation,
  RalphAttachWorkSessionSubjectMutationVariables
>;
export const RalphRecordWorkArtifactDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ralphRecordWorkArtifact' },
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
              name: { kind: 'Name', value: 'RecordWorkArtifactInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'recordWorkArtifact' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RalphRecordWorkArtifactMutation,
  RalphRecordWorkArtifactMutationVariables
>;
export const RalphEndWorkSessionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ralphEndWorkSession' },
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
              name: { kind: 'Name', value: 'EndWorkSessionInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'endWorkSession' },
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
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RalphEndWorkSessionMutation,
  RalphEndWorkSessionMutationVariables
>;
export const RegisterCliPlanRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'registerCliPlanRun' },
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
              name: { kind: 'Name', value: 'RegisterCliPlanRunInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'registerCliPlanRun' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'hostname' } },
                { kind: 'Field', name: { kind: 'Name', value: 'pid' } },
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanRun' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'workerId' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanRun' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'executionBackend' } },
          { kind: 'Field', name: { kind: 'Name', value: 'heartbeatExpected' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isStale' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastHeartbeatAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'settledReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'usageLimitType' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RegisterCliPlanRunMutation,
  RegisterCliPlanRunMutationVariables
>;
export const SettleCliPlanRunDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'settleCliPlanRun' },
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
              name: { kind: 'Name', value: 'SettleCliPlanRunInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'settleCliPlanRun' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'hostname' } },
                { kind: 'Field', name: { kind: 'Name', value: 'pid' } },
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanRun' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'workerId' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanRun' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'executionBackend' } },
          { kind: 'Field', name: { kind: 'Name', value: 'heartbeatExpected' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isStale' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastHeartbeatAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'settledReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'usageLimitType' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SettleCliPlanRunMutation,
  SettleCliPlanRunMutationVariables
>;
export const RecordPlanRunHeartbeatDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'recordPlanRunHeartbeat' },
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
              name: { kind: 'Name', value: 'RecordPlanRunHeartbeatInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'recordPlanRunHeartbeat' },
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
                  name: { kind: 'Name', value: 'lastHeartbeatAt' },
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
  RecordPlanRunHeartbeatMutation,
  RecordPlanRunHeartbeatMutationVariables
>;
export const RegisterPlanRunWorktreeCheckoutDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'registerPlanRunWorktreeCheckout' },
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
                value: 'RegisterPlanRunWorktreeCheckoutInput',
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
            name: { kind: 'Name', value: 'registerPlanRunWorktreeCheckout' },
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
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanRun' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanRun' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'executionBackend' } },
          { kind: 'Field', name: { kind: 'Name', value: 'heartbeatExpected' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isStale' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastHeartbeatAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'settledReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'usageLimitType' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RegisterPlanRunWorktreeCheckoutMutation,
  RegisterPlanRunWorktreeCheckoutMutationVariables
>;
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
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Project' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Project' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateProjectMutation,
  CreateProjectMutationVariables
>;
export const DeleteProjectDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'deleteProject' },
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
              name: { kind: 'Name', value: 'DeleteProjectInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteProject' },
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
  DeleteProjectMutation,
  DeleteProjectMutationVariables
>;
export const RecordAgentTrajectoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'recordAgentTrajectory' },
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
              name: { kind: 'Name', value: 'RecordAgentTrajectoryInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'recordAgentTrajectory' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'byteSize' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'incomplete' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'toolCallCount' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'truncated' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RecordAgentTrajectoryMutation,
  RecordAgentTrajectoryMutationVariables
>;
export const GetNoteDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getNote' },
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
                  name: { kind: 'Name', value: 'Note' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Note' },
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
} as unknown as DocumentNode<GetNoteQuery, GetNoteQueryVariables>;
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
                  name: { kind: 'Name', value: 'Note' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Note' },
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
export const GetServerHealthDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getServerHealth' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'serverHealth' },
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
      },
    },
  ],
} as unknown as DocumentNode<
  GetServerHealthQuery,
  GetServerHealthQueryVariables
>;
export const GetPlanDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPlan' },
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
                  name: { kind: 'Name', value: 'Plan' },
                },
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
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'source' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'tag' } },
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
      name: { kind: 'Name', value: 'Plan' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetPlanQuery, GetPlanQueryVariables>;
export const ListPlansByStatusDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'listPlansByStatus' },
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
                        name: { kind: 'Name', value: 'Plan' },
                      },
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
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'source' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'tag' },
                            },
                          ],
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
      name: { kind: 'Name', value: 'Plan' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ListPlansByStatusQuery,
  ListPlansByStatusQueryVariables
>;
export const GetTaskDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getTask' },
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
                  name: { kind: 'Name', value: 'Task' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Task' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'parentTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
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
} as unknown as DocumentNode<GetTaskQuery, GetTaskQueryVariables>;
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
                  name: { kind: 'Name', value: 'Task' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Task' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'parentTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
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
export const GetRemainingTasksByPlanIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getRemainingTasksByPlanId' },
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
              name: { kind: 'Name', value: 'RemainingTasksByPlanIdInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'remainingTasksByPlanId' },
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
                  name: { kind: 'Name', value: 'Task' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Task' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'parentTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
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
  GetRemainingTasksByPlanIdQuery,
  GetRemainingTasksByPlanIdQueryVariables
>;
export const GetTasksDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getTasks' },
      variableDefinitions: [
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
            name: { kind: 'Name', value: 'tasks' },
            arguments: [
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
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Task' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Task' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'TaskObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookRole' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookScope' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hookSource' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'parentTaskId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'project' } },
          { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'requirementsJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'skillSlug' } },
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
} as unknown as DocumentNode<GetTasksQuery, GetTasksQueryVariables>;
export const GetWorkArtifactsByPlanDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getWorkArtifactsByPlan' },
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
              name: { kind: 'Name', value: 'WorkArtifactsByPlanInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workArtifactsByPlan' },
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
                  name: { kind: 'Name', value: 'artifacts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdAt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'externalKey' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'lifecycle' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'payloadJson' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'producedAt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'source' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'verification' },
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
  GetWorkArtifactsByPlanQuery,
  GetWorkArtifactsByPlanQueryVariables
>;
export const GetActivityByDateDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getActivityByDate' },
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
                  kind: 'Field',
                  name: { kind: 'Name', value: 'commits' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdAt' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planTitle' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'repo' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'sha' } },
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
                { kind: 'Field', name: { kind: 'Name', value: 'hasNext' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'outputChunks' },
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
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'iteration' },
                      },
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
                        name: { kind: 'Name', value: 'taskId' },
                      },
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
  GetActivityByDateQuery,
  GetActivityByDateQueryVariables
>;
export const GetActivityByDateRangeDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getActivityByDateRange' },
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
              name: { kind: 'Name', value: 'ActivityByDateRangeInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'activityByDateRange' },
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
                  name: { kind: 'Name', value: 'commits' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdAt' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'planTitle' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'repo' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'sha' } },
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
                { kind: 'Field', name: { kind: 'Name', value: 'hasNext' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'outputChunks' },
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
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'iteration' },
                      },
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
                        name: { kind: 'Name', value: 'taskId' },
                      },
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
  GetActivityByDateRangeQuery,
  GetActivityByDateRangeQueryVariables
>;
export const GetLastActivityDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getLastActivity' },
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
              name: { kind: 'Name', value: 'LastActivityInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'lastActivity' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'at' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'commit' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'message' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'repo' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'sha' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'kind' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'outputChunk' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'content' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'iteration' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'taskId' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'taskUpdate' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
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
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetLastActivityQuery,
  GetLastActivityQueryVariables
>;
export const GetPlanOutputStreamChunksDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPlanOutputStreamChunks' },
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
              name: { kind: 'Name', value: 'ListPlanOutputStreamChunksInput' },
            },
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'iteration' } },
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
  GetPlanOutputStreamChunksQuery,
  GetPlanOutputStreamChunksQueryVariables
>;
export const SearchDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'search' },
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
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SearchQuery, SearchQueryVariables>;
export const GetDocumentDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getDocument' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
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
            name: { kind: 'Name', value: 'getDocument' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planTitle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'similarity' } },
                { kind: 'Field', name: { kind: 'Name', value: 'source' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sourcePath' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sourceRepo' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sourceSha' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taskTitle' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetDocumentQuery, GetDocumentQueryVariables>;
export const ListSourcesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'listSources' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'listSources' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'plans' },
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
                  name: { kind: 'Name', value: 'sources' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'description' },
                      },
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
} as unknown as DocumentNode<ListSourcesQuery, ListSourcesQueryVariables>;
export const ReadPlanRunCancelMarkerDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'readPlanRunCancelMarker' },
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
              name: { kind: 'Name', value: 'PlanRunsByPlanIdInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planRunsByPlanId' },
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
                  name: { kind: 'Name', value: 'cancelRequestedAt' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ReadPlanRunCancelMarkerQuery,
  ReadPlanRunCancelMarkerQueryVariables
>;
export const GetPlanRunsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPlanRuns' },
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
              name: { kind: 'Name', value: 'PlanRunsByPlanIdInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'planRunsByPlanId' },
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
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'PlanRun' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'PlanRun' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'PlanRunObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'branch' } },
          { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cancelRequestedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'executionBackend' } },
          { kind: 'Field', name: { kind: 'Name', value: 'heartbeatExpected' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isStale' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lastHeartbeatAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'model' } },
          { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'resumeOfRunId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runKind' } },
          { kind: 'Field', name: { kind: 'Name', value: 'settledReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageLimitResetsAt' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'usageLimitType' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetPlanRunsQuery, GetPlanRunsQueryVariables>;
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
                  name: { kind: 'Name', value: 'Project' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Project' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetProjectsQuery, GetProjectsQueryVariables>;
export const GetProjectDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getProject' },
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
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Project' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Project' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetProjectQuery, GetProjectQueryVariables>;
export const RalphDeliveredPlanMessagesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ralphDeliveredPlanMessages' },
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
              name: { kind: 'Name', value: 'ListPlanMessagesInput' },
            },
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
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planRunId' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RalphDeliveredPlanMessagesQuery,
  RalphDeliveredPlanMessagesQueryVariables
>;
