/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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

export type AddPermissionToRoleInput = {
  /** Permission id to add */
  permissionId: Scalars['ID']['input'];
  /** Role id to add the permission to */
  roleId: Scalars['ID']['input'];
};

export type AppendPlanOutputInput = {
  /** Content of the output chunk */
  content: Scalars['String']['input'];
  /** Optional iteration number for the output chunk */
  iteration?: InputMaybe<Scalars['Int']['input']>;
  /** Plan id to append output to */
  planId: Scalars['ID']['input'];
};

export type AssignRoleToUserInput = {
  /** Role id to assign */
  roleId: Scalars['ID']['input'];
  /** User id to assign the role to */
  userId: Scalars['ID']['input'];
};

export type CancelPlanRunInput = {
  /** Plan id whose in-queue run-plan (Ralph) job should be cancelled */
  planId: Scalars['ID']['input'];
};

export type CancelPlanRunResultObject = {
  __typename?: 'CancelPlanRunResultObject';
  /** BullMQ job ids that were active (locked by a worker) and could not be removed from the queue. When `signaledActiveRunToStop` is true, the worker was asked to terminate the Ralph child for this plan. */
  activeJobIdsCouldNotCancel: Array<Scalars['String']['output']>;
  /** True when no run-plan job for this plan existed in waiting, delayed, paused, active, or prioritized state. */
  noMatchingJob: Scalars['Boolean']['output'];
  /** Plan id from the request. */
  planId: Scalars['String']['output'];
  /** Plan status after cancel when a queued job was removed or an active run was signaled to stop (typically PENDING). Null when neither applied. */
  planStatusAfter?: Maybe<Scalars['String']['output']>;
  /** BullMQ job ids removed from the queue (waiting, delayed, paused, prioritized). */
  removedJobIds: Array<Scalars['String']['output']>;
  /** True when an in-flight plan run was signaled to stop (Ralph child receives SIGTERM, then SIGKILL if needed). The BullMQ job may still be active until the worker finishes. */
  signaledActiveRunToStop: Scalars['Boolean']['output'];
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

export type CommitLinkObject = {
  __typename?: 'CommitLinkObject';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  /** Resolved plan entity when planId is set */
  plan?: Maybe<PlanObject>;
  planId: Scalars['String']['output'];
  repo: Scalars['String']['output'];
  sha: Scalars['String']['output'];
  /** Resolved task entity when taskId is set */
  task?: Maybe<TaskObject>;
  taskId?: Maybe<Scalars['String']['output']>;
};

export type CommitLinksByPlanIdInput = {
  /** Plan id to list commit links for */
  planId: Scalars['ID']['input'];
};

export type CommitLinksByTaskIdInput = {
  /** Task id to list commit links for */
  taskId: Scalars['ID']['input'];
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

export type CreateCheckoutSessionInput = {
  /** URL to redirect to if the user cancels checkout. */
  cancelUrl: Scalars['String']['input'];
  /** Stripe Price ID (e.g. price_xxx) for the subscription. */
  priceId: Scalars['String']['input'];
  /** URL to redirect to after successful payment. */
  successUrl: Scalars['String']['input'];
};

export type CreateCheckoutSessionPayload = {
  __typename?: 'CreateCheckoutSessionPayload';
  /** Redirect URL to Stripe Checkout. Null if user not found or session creation failed. */
  url?: Maybe<Scalars['String']['output']>;
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
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
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
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateUserInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  /** GitHub username (e.g. visormatt) */
  githubUsername: Scalars['String']['input'];
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
export enum CustomPromptType {
  Agents = 'AGENTS',
  Commands = 'COMMANDS',
  Prompts = 'PROMPTS',
  Rules = 'RULES',
  Skills = 'SKILLS',
}

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

export type DeletePlanInput = {
  /** Plan id to delete */
  id: Scalars['ID']['input'];
};

export type DeleteTaskInput = {
  /** Task id to delete */
  id: Scalars['ID']['input'];
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

export type EnqueuePlanRunInput = {
  /** Plan id to enqueue a run for */
  planId: Scalars['ID']['input'];
  /** Job priority (lower = higher priority). 1=interactive/UI, 10=normal (default), 100=batch/scheduled. Omit to use normal priority. */
  priority?: InputMaybe<Scalars['Int']['input']>;
  /** Optional Ralph / workflow-ralph runtime tuning (iterations, model, backend, etc.). When set, queued workers pass these to nested workflow-ralph; when omitted, defaults come from env and .workflow-ralph.json in the worktree cwd. */
  ralph?: InputMaybe<RalphPlanRunTuningInput>;
};

export type EnqueuePlanRunResultObject = {
  __typename?: 'EnqueuePlanRunResultObject';
  /** BullMQ job id */
  jobId: Scalars['String']['output'];
  /** Plan id that was enqueued */
  planId: Scalars['String']['output'];
  /** Position of this job in the waiting queue (1-based). E.g., 1 means next to be processed. */
  queuePosition: Scalars['Int']['output'];
  /** Total number of jobs waiting in the queue (including this one). */
  queueTotal: Scalars['Int']['output'];
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

export type GetCommitLinkInput = {
  /** Commit link id */
  id: Scalars['ID']['input'];
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

export type JobObject = {
  __typename?: 'JobObject';
  /** JSON string of job data (e.g. { planId } for run-plan). */
  data?: Maybe<Scalars['String']['output']>;
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

export type LinkCommitInput = {
  /** Optional commit or PR message */
  message?: InputMaybe<Scalars['String']['input']>;
  /** Plan id to link the commit to */
  planId: Scalars['ID']['input'];
  /** Repository (e.g. owner/repo) */
  repo: Scalars['String']['input'];
  /** Git commit SHA (squash commit after PR merge) */
  sha: Scalars['String']['input'];
  /** Optional task id to link the commit to */
  taskId?: InputMaybe<Scalars['ID']['input']>;
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

export type ListPlanOutputStreamChunksInput = {
  /** Plan id to list chunks for */
  planId: Scalars['ID']['input'];
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
  /** Filter by plan status. Empty or including "all" means no status filter. */
  statuses?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
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

export type Mutation = {
  __typename?: 'Mutation';
  /** Add a permission to a role */
  addPermissionToRole: Scalars['Boolean']['output'];
  /** Append a chunk to a plan's output stream (e.g. agent iteration log). */
  appendPlanOutput: PlanOutputStreamChunkObject;
  /** Assign a role to a user */
  assignRoleToUser: Scalars['Boolean']['output'];
  /** Cancel BullMQ plan-run jobs for a plan: removes waiting or delayed jobs, and signals the worker to stop the Ralph child when a job is active (cannot be removed from Redis without the lock token). */
  cancelPlanRun: CancelPlanRunResultObject;
  /** Create a Stripe Checkout session for the current user. Returns redirect URL for subscription signup. */
  createCheckoutSession: CreateCheckoutSessionPayload;
  /** Create a new custom prompt */
  createCustomPrompt: CustomPromptObject;
  /** Create a note */
  createNote: NoteObject;
  /** Create a plan */
  createPlan: PlanObject;
  /** Create a project */
  createProject: ProjectObject;
  /** Create a queue dynamically. The queue is registered so it appears in queues() and queue(name). Returns success with queueName or error. */
  createQueue: CreateQueueResultObject;
  /** Create a role */
  createRole: RoleObject;
  /** Create a task */
  createTask: TaskObject;
  /** Create a user */
  createUser: UserObject;
  /** Soft delete a custom prompt by ID */
  deleteCustomPrompt: Scalars['Boolean']['output'];
  /** Delete a note by ID */
  deleteNote: Scalars['Boolean']['output'];
  /** Delete a plan by ID */
  deletePlan: Scalars['Boolean']['output'];
  /** Delete a role */
  deleteRole: Scalars['Boolean']['output'];
  /** Delete a task by ID */
  deleteTask: Scalars['Boolean']['output'];
  /** Disable a user; they will not be able to log in. */
  disableUser?: Maybe<UserObject>;
  /** Duplicate a job (add new job with same data). Works for plans queue and future queues. Returns new job id or error. */
  duplicateJob: DuplicateJobResultObject;
  /** Re-enable a disabled user. */
  enableUser?: Maybe<UserObject>;
  /** Enqueue a doc-ingestion job. Provide directories and/or files (at least one required). Job runs diff-based re-ingestion for the given paths. Returns job id or error. */
  enqueueDocIngestion: EnqueueDocIngestionResultObject;
  /** Enqueue a plan-run job for the given plan. Used by Cortex UI "Run plan" action. Returns job id, plan id, and queue position. */
  enqueuePlanRun: EnqueuePlanRunResultObject;
  /** Permanently delete a custom prompt by ID */
  hardDeleteCustomPrompt: Scalars['Boolean']['output'];
  /** Associate a git commit with a plan (and optionally a task). Use after PR merge with squash SHA. */
  linkCommit: CommitLinkObject;
  /** Sign in with email and password. Returns JWT access token for Authorization header or cookie. */
  login: LoginResultObject;
  /** Verify and process a Stripe webhook. Pass the exact raw body bytes as base64 and the Stripe-Signature header value. */
  processStripeWebhook: StripeWebhookProcessedPayload;
  /** Register a new user. Returns id, email, and JWT access token. */
  register: RegisterResultObject;
  /** Remove a permission from a role */
  removePermissionFromRole: Scalars['Boolean']['output'];
  /** Remove a repeatable (scheduled) job by key. Key is returned by repeatableJobs(queueName). */
  removeRepeatableJob: RemoveRepeatableJobResultObject;
  /** Remove a role from a user */
  removeRoleFromUser: Scalars['Boolean']['output'];
  /** Restore a soft-deleted custom prompt */
  restoreCustomPrompt?: Maybe<CustomPromptObject>;
  /** Retry a failed job. Validates queue exists and job is in failed state. Returns job id or error. */
  retryJob: RetryJobResultObject;
  /** Set a plan's status (e.g. COMPLETED). Convenience mutation for Mark Complete; equivalent to updatePlan with { id, status }. */
  setPlanStatus?: Maybe<PlanObject>;
  /** Sign out. Returns success; client is responsible for clearing the auth cookie. */
  signout: SignoutResultObject;
  /** Trigger a test websocket notification (system.alert). Returns true when the event was emitted. Use from the web app to verify the notification flow end-to-end. */
  triggerWebsocketNotification: Scalars['Boolean']['output'];
  /** Update an existing custom prompt */
  updateCustomPrompt?: Maybe<CustomPromptObject>;
  /** Update a note */
  updateNote?: Maybe<NoteObject>;
  /** Update a plan */
  updatePlan?: Maybe<PlanObject>;
  /** Update a project */
  updateProject?: Maybe<ProjectObject>;
  /** Update a role */
  updateRole?: Maybe<RoleObject>;
  /** Update a task */
  updateTask?: Maybe<TaskObject>;
  /** Update a user */
  updateUser?: Maybe<UserObject>;
  /** Write a custom prompt to the file system at its configured filePath */
  writeCustomPromptToFileSystem: Scalars['Boolean']['output'];
};

export type MutationAddPermissionToRoleArgs = {
  input: AddPermissionToRoleInput;
};

export type MutationAppendPlanOutputArgs = {
  input: AppendPlanOutputInput;
};

export type MutationAssignRoleToUserArgs = {
  input: AssignRoleToUserInput;
};

export type MutationCancelPlanRunArgs = {
  input: CancelPlanRunInput;
};

export type MutationCreateCheckoutSessionArgs = {
  input: CreateCheckoutSessionInput;
};

export type MutationCreateCustomPromptArgs = {
  input: CreateCustomPromptInput;
};

export type MutationCreateNoteArgs = {
  input: CreateNoteInput;
};

export type MutationCreatePlanArgs = {
  input: CreatePlanInput;
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

export type MutationCreateTaskArgs = {
  input: CreateTaskInput;
};

export type MutationCreateUserArgs = {
  input: CreateUserInput;
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

export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteTaskArgs = {
  input: DeleteTaskInput;
};

export type MutationDisableUserArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDuplicateJobArgs = {
  input: DuplicateJobInput;
};

export type MutationEnableUserArgs = {
  id: Scalars['ID']['input'];
};

export type MutationEnqueueDocIngestionArgs = {
  input: EnqueueDocIngestionInput;
};

export type MutationEnqueuePlanRunArgs = {
  input: EnqueuePlanRunInput;
};

export type MutationHardDeleteCustomPromptArgs = {
  id: Scalars['ID']['input'];
};

export type MutationLinkCommitArgs = {
  input: LinkCommitInput;
};

export type MutationLoginArgs = {
  input: LoginInput;
};

export type MutationProcessStripeWebhookArgs = {
  input: ProcessStripeWebhookInput;
};

export type MutationRegisterArgs = {
  input: RegisterInput;
};

export type MutationRemovePermissionFromRoleArgs = {
  input: RemovePermissionFromRoleInput;
};

export type MutationRemoveRepeatableJobArgs = {
  input: RemoveRepeatableJobInput;
};

export type MutationRemoveRoleFromUserArgs = {
  input: RemoveRoleFromUserInput;
};

export type MutationRestoreCustomPromptArgs = {
  id: Scalars['ID']['input'];
};

export type MutationRetryJobArgs = {
  input: RetryJobInput;
};

export type MutationSetPlanStatusArgs = {
  input: SetPlanStatusInput;
};

export type MutationUpdateCustomPromptArgs = {
  input: UpdateCustomPromptInput;
};

export type MutationUpdateNoteArgs = {
  input: UpdateNoteInput;
};

export type MutationUpdatePlanArgs = {
  input: UpdatePlanInput;
};

export type MutationUpdateProjectArgs = {
  input: UpdateProjectInput;
};

export type MutationUpdateRoleArgs = {
  input: UpdateRoleInput;
};

export type MutationUpdateTaskArgs = {
  input: UpdateTaskInput;
};

export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
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
  /** Plan id to list embeddings for */
  planId: Scalars['ID']['input'];
};

export type PlanObject = {
  __typename?: 'PlanObject';
  assignee?: Maybe<Scalars['String']['output']>;
  author: Scalars['String']['output'];
  category: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  project?: Maybe<Scalars['String']['output']>;
  /** Optional. Project UUID (FK to projects table). Null when plan is not linked to a project. */
  projectId?: Maybe<Scalars['String']['output']>;
  /** Resolved project entity when projectId is set; null when projectId is unset. */
  projectRelation?: Maybe<ProjectObject>;
  status: Scalars['String']['output'];
  summary?: Maybe<Scalars['String']['output']>;
  /** Number of tasks belonging to this plan. Resolved from tasks table. */
  taskCount: Scalars['Int']['output'];
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
};

/** A single plan run with metrics: job id, finished timestamp, and task-run metrics (memory/CPU at start and end). */
export type PlanRunMetricsEntry = {
  __typename?: 'PlanRunMetricsEntry';
  /** Unix timestamp when the job finished. */
  finishedOn?: Maybe<Scalars['Float']['output']>;
  /** BullMQ job id for this run. */
  jobId: Scalars['String']['output'];
  /** Task-run metrics (process memory/CPU at start and end). Null if job completed without metrics. */
  taskRunMetrics?: Maybe<TaskRunMetrics>;
};

export type PlanStatusCountObject = {
  __typename?: 'PlanStatusCountObject';
  count: Scalars['Int']['output'];
  status: Scalars['String']['output'];
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
export enum PressureLevel {
  High = 'high',
  Low = 'low',
  Moderate = 'moderate',
  Unknown = 'unknown',
}

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

export type ProcessStripeWebhookInput = {
  /** Canonical raw request body encoded as standard base64. Must match the bytes Stripe signed. */
  rawPayloadBase64: Scalars['String']['input'];
  /** Value of the Stripe-Signature header from the original HTTP request. */
  stripeSignature: Scalars['String']['input'];
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
  /** Tasks linked to this project; resolved via ResolveField. */
  tasks?: Maybe<Array<TaskObject>>;
  updatedAt: Scalars['DateTime']['output'];
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

export type PullListItemObject = {
  __typename?: 'PullListItemObject';
  author: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
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
  /** Get a commit link by ID */
  commitLink?: Maybe<CommitLinkObject>;
  /** List all commit links, ordered by createdAt descending */
  commitLinks: Array<CommitLinkObject>;
  /** List commit links for a plan (plan-level and task-level), ordered by createdAt descending */
  commitLinksByPlanId: Array<CommitLinkObject>;
  /** List commit links for a task, ordered by createdAt descending */
  commitLinksByTaskId: Array<CommitLinkObject>;
  /** Commits per PR (PR size in commits) for merged PRs. Paginates commits per PR; maxPrs caps API calls. Optional period bucket (week/month UTC). */
  commitsPerPr: Array<CommitsPerPrRowObject>;
  /** Cortex DB health: ok | unconfigured | unreachable. Used by cortex app status page. */
  cortexHealth: Scalars['String']['output'];
  /** Get a custom prompt by ID */
  customPrompt?: Maybe<CustomPromptObject>;
  /** List custom prompts with optional filters */
  customPrompts: Array<CustomPromptObject>;
  /** Aggregated plan and task stats for a single date (YYYY-MM-DD). Returns null if no row for that date. */
  dailyStats?: Maybe<DailyStatsObject>;
  /** Aggregated plan and task stats for a date range (start and end inclusive, YYYY-MM-DD). */
  dailyStatsRange: DailyStatsRangeResultObject;
  /** Development ping. Returns "pong" when the development GraphQL API is reachable. */
  developmentPing: Scalars['String']['output'];
  /** Get a generator by name (includes schema JSON) */
  generator?: Maybe<GeneratorDetailObject>;
  /** List available NX generators from @tools/generators */
  generators: Array<GeneratorObject>;
  /** Fetch a single document chunk by id (UUID from plan_embeddings, task_embeddings, or documentation_embeddings). Use after semantic search to read full chunk content. */
  getDocument?: Maybe<SearchChunk>;
  /** Single job by id and queue name. Returns null if not found. */
  job?: Maybe<JobObject>;
  /** Single most recent activity (commit, plan output chunk, or task update) for a plan or task. Use for "What was the last thing we did for <plan> or <task>?". */
  lastActivity?: Maybe<LastActivityResultObject>;
  /** Lines added/deleted by period (week or month) and author for merged PRs. Uses REST get-per-PR for diff stats; maxPrs caps requests. */
  linesAddedDeleted: Array<LinesAddedDeletedRowObject>;
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
  /** Get the currently authenticated user */
  me?: Maybe<UserObject>;
  /** Metrics namespace: serverSnapshot (current process metrics) and recentPlanRunsMetrics for plan-level visualization. serverMetrics at root is unchanged. */
  metrics: MetricsObject;
  /** Get permission names for the current user */
  myPermissions: Array<Scalars['String']['output']>;
  /** Current user's active subscription (entitlement). Null if none. */
  mySubscription?: Maybe<SubscriptionObject>;
  /** Get a note by ID */
  note?: Maybe<NoteObject>;
  /** List all notes, ordered by createdAt descending */
  notes: Array<NoteObject>;
  /** Open PR count per author for a repository (GitHub stats). */
  openPrCountByAuthor: Array<OpenPrCountByAuthorObject>;
  /** Cycle time for merged PRs: median and P90 of days from open to merged. Optional period buckets by week/month (UTC). */
  openToMergedCycleTime: Array<OpenToMergedCycleTimeObject>;
  /** List all permissions */
  permissions: Array<PermissionObject>;
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
  /** Get a plan output stream chunk by ID */
  planOutputStreamChunk?: Maybe<PlanOutputStreamChunkObject>;
  /** List plan output stream chunks by plan ID, ordered by createdAt ascending */
  planOutputStreamChunks: Array<PlanOutputStreamChunkObject>;
  /** List all plans */
  plans: Array<PlanObject>;
  /** PR counts by label (breakdown by type e.g. bug, feature, docs). Uses Issues API; optional state filter (open/closed/all). */
  prCountByLabel: Array<PrCountByLabelObject>;
  /** PR time-in-state summary (count and avg days per state: open, closed, merged). */
  prTimeInStateSummary: Array<PrTimeInStateSummaryObject>;
  /** Get a project by ID */
  project?: Maybe<ProjectObject>;
  /** List all projects, ordered by createdAt descending */
  projects: Array<ProjectObject>;
  /** PRs merged per week or month (throughput trend). Buckets by merged_at in UTC. */
  prsMergedPerPeriod: Array<PrsMergedPerPeriodObject>;
  /** List pull requests for a repository (GitHub API) */
  pulls: Array<PullListItemObject>;
  /** Single queue by name with optional paginated jobs (limit/offset/states/asc). */
  queue?: Maybe<QueueDetailsObject>;
  /** List registered BullMQ queues with job counts (waiting, active, completed, failed, delayed). */
  queues: Array<QueueStatsObject>;
  /** List remaining tasks for a plan (status in PENDING, IN_PROGRESS, BLOCKED) */
  remainingTasksByPlanId: Array<TaskObject>;
  /** List repeatable (scheduled) jobs for a queue. Use the returned key with removeRepeatableJob to remove one. Job types (e.g. run-plan) and future workflow extensibility are documented on JobObject and RepeatableJobObject. */
  repeatableJobs: Array<RepeatableJobObject>;
  /** Review cycle time for merged PRs: median and P90 of days from last CHANGES_REQUESTED to first subsequent APPROVED or merge. Optional period buckets by week/month (UTC). Paginates reviews; maxPrs caps API calls. */
  reviewCycleTime: Array<ReviewCycleTimeObject>;
  /** Get a role by ID */
  role?: Maybe<RoleObject>;
  /** List all roles with their permissions */
  roles: Array<RoleObject>;
  /** Get roles assigned to a user */
  rolesForUser: Array<RoleObject>;
  /** Semantic search over plan and task embeddings. Embeds the query and returns ranked chunks. Requires Cortex Postgres and embedding (OPENAI_API_KEY or Ollama). */
  search: SearchResult;
  /** Semantic search over plans/tasks (vector similarity). Requires OPENAI_API_KEY or Ollama for query embedding. Returns plans matching the query, deduped by plan id. */
  searchPlans: ListPlansByStatusResultObject;
  /** Server health: API, Cortex DB, Redis (BullMQ), and WebSocket. Each component is ok | unconfigured | unreachable. */
  serverHealth: ServerHealthObject;
  /** Current process CPU and memory snapshot. Memory in MB; CPU in ms (cumulative). Same data as REST GET /metrics. */
  serverMetrics: ServerMetricsObject;
  /** A single Stripe product by ID, or null if not found. */
  stripeProduct?: Maybe<StripeProductObject>;
  /** Active Stripe products (catalog). Does not require authentication. */
  stripeProducts: Array<StripeProductObject>;
  /** Get a task by ID */
  task?: Maybe<TaskObject>;
  /** Get a task embedding by ID */
  taskEmbedding?: Maybe<TaskEmbeddingObject>;
  /** List task embeddings by task ID, ordered by createdAt ascending */
  taskEmbeddings: Array<TaskEmbeddingObject>;
  /** List all tasks, ordered by createdAt ascending */
  tasks: Array<TaskObject>;
  /** List tasks for a plan by plan ID */
  tasksByPlanId: Array<TaskObject>;
  /** List tasks for a project by project ID (FK). Optional limit/offset for pagination; when omitted returns all tasks and totalCount. */
  tasksByProjectId: TasksByProjectIdResultObject;
  /** Get a user by ID */
  user?: Maybe<UserObject>;
  /** List all users, ordered by createdAt descending */
  users: Array<UserObject>;
};

export type QueryActivityByDateArgs = {
  input: ActivityByDateInput;
};

export type QueryActivityByDateRangeArgs = {
  input: ActivityByDateRangeInput;
};

export type QueryCommitLinkArgs = {
  input: GetCommitLinkInput;
};

export type QueryCommitLinksByPlanIdArgs = {
  input: CommitLinksByPlanIdInput;
};

export type QueryCommitLinksByTaskIdArgs = {
  input: CommitLinksByTaskIdInput;
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

export type QueryGeneratorArgs = {
  input: GetGeneratorInput;
};

export type QueryGetDocumentArgs = {
  id: Scalars['String']['input'];
};

export type QueryJobArgs = {
  jobId: Scalars['ID']['input'];
  queueName: Scalars['String']['input'];
};

export type QueryLastActivityArgs = {
  input: LastActivityInput;
};

export type QueryLinesAddedDeletedArgs = {
  input: LinesAddedDeletedInput;
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

export type QueryPlanOutputStreamChunkArgs = {
  input: GetPlanOutputStreamChunkInput;
};

export type QueryPlanOutputStreamChunksArgs = {
  input: ListPlanOutputStreamChunksInput;
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

export type QueryPrsMergedPerPeriodArgs = {
  input: PrsMergedPerPeriodInput;
};

export type QueryPullsArgs = {
  input: ListPullsInput;
};

export type QueryQueueArgs = {
  input: QueueDetailsInput;
};

export type QueryRemainingTasksByPlanIdArgs = {
  input: RemainingTasksByPlanIdInput;
};

export type QueryRepeatableJobsArgs = {
  input: RepeatableJobsInput;
};

export type QueryReviewCycleTimeArgs = {
  input: ReviewCycleTimeInput;
};

export type QueryRoleArgs = {
  id: Scalars['ID']['input'];
};

export type QueryRolesForUserArgs = {
  userId: Scalars['ID']['input'];
};

export type QuerySearchArgs = {
  input: SearchInput;
};

export type QuerySearchPlansArgs = {
  input: SearchPlansInput;
};

export type QueryStripeProductArgs = {
  id: Scalars['String']['input'];
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

export type QueryTasksByPlanIdArgs = {
  input: TasksByPlanIdInput;
};

export type QueryTasksByProjectIdArgs = {
  input: TasksByProjectIdInput;
};

export type QueryUserArgs = {
  id: Scalars['ID']['input'];
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
export enum RalphNestedDebugCli {
  Debug = 'debug',
  Omit = 'omit',
  Verbose = 'verbose',
}

export type RalphPlanRunTuningInput = {
  /** Execution backend (e.g. cursor). Omit to use worktree defaults. */
  backend?: InputMaybe<Scalars['String']['input']>;
  /** Per-iteration timeout in seconds (positive integer). */
  iterationTimeoutSeconds?: InputMaybe<Scalars['Int']['input']>;
  /** Max Ralph iterations for this run (positive integer). */
  iterations?: InputMaybe<Scalars['Int']['input']>;
  /** Model id passed to workflow-ralph --model. */
  model?: InputMaybe<Scalars['String']['input']>;
  /** Nx project name for workflow-ralph --project. */
  project?: InputMaybe<Scalars['String']['input']>;
  /** Prompt profile path (e.g. /agents/ralph) for --prompt. */
  prompt?: InputMaybe<Scalars['String']['input']>;
  /** Repo-relative or absolute path for --prompt-file (layer-1 prompt file). */
  promptFile?: InputMaybe<Scalars['String']['input']>;
  /** Whether to pass --debug / --verbose to nested workflow-ralph. */
  ralphDebugCli?: InputMaybe<RalphNestedDebugCli>;
};

export type RegisterInput = {
  /** User email (must be unique) */
  email: Scalars['String']['input'];
  /** GitHub username for display; defaults to email local part if omitted */
  githubUsername?: InputMaybe<Scalars['String']['input']>;
  /** User password (stored hashed with bcrypt) */
  password: Scalars['String']['input'];
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

export type RemoveRoleFromUserInput = {
  /** Role id to remove */
  roleId: Scalars['ID']['input'];
  /** User id to remove the role from */
  userId: Scalars['ID']['input'];
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

/** Server health: API reachability, OpenThrottle DB, Redis (BullMQ), and WebSocket. Each component is ok, unconfigured, or unreachable. */
export type ServerHealthObject = {
  __typename?: 'ServerHealthObject';
  /** API status. "ok" when the resolver runs. */
  api: Scalars['String']['output'];
  /** OpenThrottle DB status: ok | unconfigured | unreachable. Reuses existing cortexHealth logic. */
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

export type SetPlanStatusInput = {
  /** Plan id to update status for */
  planId: Scalars['ID']['input'];
  /** New status (e.g. COMPLETED, IN_PROGRESS, PENDING, QUEUED). Normalized to uppercase. */
  status: Scalars['String']['input'];
};

export type SignoutResultObject = {
  __typename?: 'SignoutResultObject';
  /** Whether signout completed successfully */
  success: Scalars['Boolean']['output'];
};

/** Stripe price for catalog or checkout. */
export type StripePriceObject = {
  __typename?: 'StripePriceObject';
  active: Scalars['Boolean']['output'];
  /** Three-letter ISO currency code. */
  currency: Scalars['String']['output'];
  id: Scalars['String']['output'];
  /** Present when type is recurring. */
  recurring?: Maybe<StripePriceRecurringObject>;
  /** Stripe price type: one_time or recurring. */
  type: Scalars['String']['output'];
  /** Unit amount in the smallest currency unit (e.g. cents). Null for some metered or custom schemes. */
  unitAmount?: Maybe<Scalars['Int']['output']>;
};

/** Recurring billing details when a Stripe price is recurring. */
export type StripePriceRecurringObject = {
  __typename?: 'StripePriceRecurringObject';
  /** Billing interval (e.g. month, year). */
  interval: Scalars['String']['output'];
  /** Number of intervals between billings. */
  intervalCount: Scalars['Int']['output'];
};

/** Stripe catalog product. */
export type StripeProductObject = {
  __typename?: 'StripeProductObject';
  active: Scalars['Boolean']['output'];
  /** Default Stripe Price ID when set on the product. */
  defaultPriceId?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  images: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** Active prices for this product. Populated by resolvers that batch-fetch prices to avoid N+1 queries. */
  prices: Array<StripePriceObject>;
};

export type StripeWebhookProcessedPayload = {
  __typename?: 'StripeWebhookProcessedPayload';
  /** True when the webhook was verified and handled (including ignored event types). */
  received: Scalars['Boolean']['output'];
};

export type SubscriptionObject = {
  __typename?: 'SubscriptionObject';
  cancelAtPeriodEnd: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  currentPeriodEnd?: Maybe<Scalars['DateTime']['output']>;
  currentPeriodStart?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  status: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  stripePriceId: Scalars['String']['output'];
  stripeSubscriptionId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
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
  /** Task id to list embeddings for */
  taskId: Scalars['ID']['input'];
};

export type TaskObject = {
  __typename?: 'TaskObject';
  assignee?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
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
  status: Scalars['String']['output'];
  summary?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
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
  project?: InputMaybe<Scalars['String']['input']>;
  /** Optional. Project UUID (FK to projects table). Pass null to clear; omit to leave unchanged. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  /** Project id to update */
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  /** NX project name (e.g. applications/openthrottle-server) */
  nxProjectName?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  /** Role id to update */
  id: Scalars['ID']['input'];
  /** Role name. Pass null to leave unchanged. */
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
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
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

export type UserObject = {
  __typename?: 'UserObject';
  createdAt: Scalars['DateTime']['output'];
  /** When set, user is disabled and cannot log in. */
  disabledAt?: Maybe<Scalars['DateTime']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  /** GitHub username (e.g. visormatt) */
  githubUsername: Scalars['String']['output'];
  id: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Interpretation of wall-clock to CPU time ratio. */
export enum WallClockInterpretation {
  CpuBound = 'cpu_bound',
  Idle = 'idle',
  IoBound = 'io_bound',
  Mixed = 'mixed',
}

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

export type HealthCardFragment = {
  __typename?: 'ServerHealthObject';
  api: string;
  database: string;
  redis: string;
  websocket: string;
};

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;

export type RegisterMutation = {
  __typename?: 'Mutation';
  register: {
    __typename?: 'RegisterResultObject';
    accessToken: string;
    email: string;
    id: string;
  };
};

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;

export type LoginMutation = {
  __typename?: 'Mutation';
  login: { __typename?: 'LoginResultObject'; accessToken: string };
};

export type GetRootHealthQueryVariables = Exact<{ [key: string]: never }>;

export type GetRootHealthQuery = {
  __typename?: 'Query';
  serverHealth: {
    __typename?: 'ServerHealthObject';
    api: string;
    database: string;
    redis: string;
    websocket: string;
  };
};

export type GetSubscriptionQueryVariables = Exact<{ [key: string]: never }>;

export type GetSubscriptionQuery = {
  __typename?: 'Query';
  mySubscription?: {
    __typename?: 'SubscriptionObject';
    cancelAtPeriodEnd: boolean;
    status: string;
    stripeCustomerId?: string | null;
    stripePriceId: string;
  } | null;
};

export type RootMetricsFragment = {
  __typename?: 'ServerMetricsObject';
  cpuSystemMs: number;
  cpuUserMs: number;
  externalMb: number;
  heapTotalMb: number;
  heapUsedMb: number;
  rssMb: number;
};

export type GetRootMetricsQueryVariables = Exact<{ [key: string]: never }>;

export type GetRootMetricsQuery = {
  __typename?: 'Query';
  serverMetrics: {
    __typename?: 'ServerMetricsObject';
    cpuSystemMs: number;
    cpuUserMs: number;
    externalMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    rssMb: number;
  };
};

export type DashboardActivityCardFragment = {
  __typename?: 'ActivityByDateResultObject';
  hasNext: boolean;
  totalCount: number;
  commits: Array<{
    __typename?: 'ActivityCommitRowObject';
    createdAt: any;
    id: string;
    message?: string | null;
    planId: string;
    planTitle: string;
    repo: string;
    sha: string;
    taskId?: string | null;
    taskTitle?: string | null;
  }>;
  outputChunks: Array<{
    __typename?: 'ActivityOutputChunkRowObject';
    content: string;
    createdAt: any;
    id: string;
    iteration?: number | null;
    planId: string;
    planTitle: string;
  }>;
  tasksUpdated: Array<{
    __typename?: 'ActivityTaskUpdatedRowObject';
    id: string;
    planId: string;
    planTitle: string;
    status: string;
    title: string;
    updatedAt: any;
  }>;
};

export type DashboardQueueStatsCardFragment = {
  __typename?: 'QueueStatsObject';
  activeCount: number;
  completedCount: number;
  delayedCount: number;
  failedCount: number;
  name: string;
  waitingCount: number;
};

export type DashboardDailyStatsCardFragment = {
  __typename?: 'DailyStatsObject';
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
  start: Scalars['String']['input'];
  end: Scalars['String']['input'];
}>;

export type GetDashboardQuery = {
  __typename?: 'Query';
  activityByDate: {
    __typename?: 'ActivityByDateResultObject';
    hasNext: boolean;
    totalCount: number;
    commits: Array<{
      __typename?: 'ActivityCommitRowObject';
      createdAt: any;
      id: string;
      message?: string | null;
      planId: string;
      planTitle: string;
      repo: string;
      sha: string;
      taskId?: string | null;
      taskTitle?: string | null;
    }>;
    outputChunks: Array<{
      __typename?: 'ActivityOutputChunkRowObject';
      content: string;
      createdAt: any;
      id: string;
      iteration?: number | null;
      planId: string;
      planTitle: string;
    }>;
    tasksUpdated: Array<{
      __typename?: 'ActivityTaskUpdatedRowObject';
      id: string;
      planId: string;
      planTitle: string;
      status: string;
      title: string;
      updatedAt: any;
    }>;
  };
  dailyStatsRange: {
    __typename?: 'DailyStatsRangeResultObject';
    items: Array<{
      __typename?: 'DailyStatsObject';
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
    __typename?: 'QueueStatsObject';
    activeCount: number;
    completedCount: number;
    delayedCount: number;
    failedCount: number;
    name: string;
    waitingCount: number;
  }>;
};

export type GetDashboardGithubStatsQueryVariables = Exact<{
  input: GitHubRepoInput;
}>;

export type GetDashboardGithubStatsQuery = {
  __typename?: 'Query';
  openPrCountByAuthor: Array<{
    __typename?: 'OpenPrCountByAuthorObject';
    author: string;
    openCount: number;
  }>;
  prTimeInStateSummary: Array<{
    __typename?: 'PrTimeInStateSummaryObject';
    state: string;
    count: number;
    avgDaysInState?: number | null;
  }>;
};

export type TriggerNotificationMutationVariables = Exact<{
  [key: string]: never;
}>;

export type TriggerNotificationMutation = {
  __typename?: 'Mutation';
  triggerWebsocketNotification: boolean;
};

export type GeneratorDetailCardFragment = {
  __typename?: 'GeneratorDetailObject';
  description: string;
  name: string;
  schemaJson?: string | null;
};

export type GetGeneratorByNameQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;

export type GetGeneratorByNameQuery = {
  __typename?: 'Query';
  generator?: {
    __typename?: 'GeneratorDetailObject';
    description: string;
    name: string;
    schemaJson?: string | null;
  } | null;
};

export type GeneratorCardFragment = {
  __typename?: 'GeneratorObject';
  description: string;
  name: string;
};

export type GetGeneratorsQueryVariables = Exact<{ [key: string]: never }>;

export type GetGeneratorsQuery = {
  __typename?: 'Query';
  generators: Array<{
    __typename?: 'GeneratorObject';
    description: string;
    name: string;
  }>;
};

export type GetNoteByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetNoteByIdQuery = {
  __typename?: 'Query';
  note?: {
    __typename?: 'NoteObject';
    author?: string | null;
    content: string;
    createdAt: any;
    id: string;
    updatedAt: any;
  } | null;
};

export type UpdateNoteMutationVariables = Exact<{
  input: UpdateNoteInput;
}>;

export type UpdateNoteMutation = {
  __typename?: 'Mutation';
  updateNote?: {
    __typename?: 'NoteObject';
    author?: string | null;
    content: string;
    createdAt: any;
    id: string;
    updatedAt: any;
  } | null;
};

export type NoteCardFragment = {
  __typename?: 'NoteObject';
  author?: string | null;
  content: string;
  createdAt: any;
  id: string;
  updatedAt: any;
};

export type GetNotesQueryVariables = Exact<{ [key: string]: never }>;

export type GetNotesQuery = {
  __typename?: 'Query';
  notes: Array<{
    __typename?: 'NoteObject';
    author?: string | null;
    content: string;
    createdAt: any;
    id: string;
    updatedAt: any;
  }>;
};

export type CreateNoteMutationVariables = Exact<{
  input: CreateNoteInput;
}>;

export type CreateNoteMutation = {
  __typename?: 'Mutation';
  createNote: {
    __typename?: 'NoteObject';
    author?: string | null;
    content: string;
    createdAt: any;
    id: string;
    updatedAt: any;
  };
};

export type PlanTaskRowFragment = {
  __typename?: 'TaskObject';
  assignee?: string | null;
  category?: string | null;
  createdAt: any;
  description?: string | null;
  id: string;
  planId: string;
  requirementsJson: string;
  status: string;
  summary?: string | null;
  title: string;
  updatedAt: any;
  projectRelation?: {
    __typename?: 'ProjectObject';
    id: string;
    name: string;
  } | null;
};

export type ProjectDetailsFragment = {
  __typename?: 'ProjectObject';
  id: string;
  name: string;
};

export type PlanDetailsFragment = {
  __typename?: 'PlanObject';
  assignee?: string | null;
  author: string;
  category: string;
  createdAt: any;
  description?: string | null;
  id: string;
  projectId?: string | null;
  status: string;
  summary?: string | null;
  title: string;
  updatedAt: any;
  projectRelation?: {
    __typename?: 'ProjectObject';
    id: string;
    name: string;
  } | null;
};

export type GetPlanByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetPlanByIdQuery = {
  __typename?: 'Query';
  plan?: {
    __typename?: 'PlanObject';
    assignee?: string | null;
    author: string;
    category: string;
    createdAt: any;
    description?: string | null;
    id: string;
    projectId?: string | null;
    status: string;
    summary?: string | null;
    title: string;
    updatedAt: any;
    projectRelation?: {
      __typename?: 'ProjectObject';
      id: string;
      name: string;
    } | null;
  } | null;
};

export type GetTasksByPlanIdQueryVariables = Exact<{
  input: TasksByPlanIdInput;
}>;

export type GetTasksByPlanIdQuery = {
  __typename?: 'Query';
  tasksByPlanId: Array<{
    __typename?: 'TaskObject';
    assignee?: string | null;
    category?: string | null;
    createdAt: any;
    description?: string | null;
    id: string;
    planId: string;
    requirementsJson: string;
    status: string;
    summary?: string | null;
    title: string;
    updatedAt: any;
    projectRelation?: {
      __typename?: 'ProjectObject';
      id: string;
      name: string;
    } | null;
  }>;
};

export type PlanDetailEnqueuePlanRunMutationVariables = Exact<{
  input: EnqueuePlanRunInput;
}>;

export type PlanDetailEnqueuePlanRunMutation = {
  __typename?: 'Mutation';
  enqueuePlanRun: {
    __typename?: 'EnqueuePlanRunResultObject';
    jobId: string;
    planId: string;
  };
};

export type PlanDetailCancelPlanRunMutationVariables = Exact<{
  input: CancelPlanRunInput;
}>;

export type PlanDetailCancelPlanRunMutation = {
  __typename?: 'Mutation';
  cancelPlanRun: {
    __typename?: 'CancelPlanRunResultObject';
    activeJobIdsCouldNotCancel: Array<string>;
    noMatchingJob: boolean;
    planId: string;
    planStatusAfter?: string | null;
    removedJobIds: Array<string>;
    signaledActiveRunToStop: boolean;
  };
};

export type PlanDetailSetPlanStatusMutationVariables = Exact<{
  input: SetPlanStatusInput;
}>;

export type PlanDetailSetPlanStatusMutation = {
  __typename?: 'Mutation';
  setPlanStatus?: {
    __typename?: 'PlanObject';
    id: string;
    status: string;
    title: string;
    updatedAt: any;
  } | null;
};

export type PlanDetailUpdateTaskMutationVariables = Exact<{
  input: UpdateTaskInput;
}>;

export type PlanDetailUpdateTaskMutation = {
  __typename?: 'Mutation';
  updateTask?: {
    __typename?: 'TaskObject';
    assignee?: string | null;
    category?: string | null;
    createdAt: any;
    description?: string | null;
    id: string;
    planId: string;
    requirementsJson: string;
    status: string;
    summary?: string | null;
    title: string;
    updatedAt: any;
    projectRelation?: {
      __typename?: 'ProjectObject';
      id: string;
      name: string;
    } | null;
  } | null;
};

export type CreatePlanMutationVariables = Exact<{
  input: CreatePlanInput;
}>;

export type CreatePlanMutation = {
  __typename?: 'Mutation';
  createPlan: {
    __typename?: 'PlanObject';
    id: string;
    title: string;
    author: string;
    category: string;
    status: string;
    createdAt: any;
    updatedAt: any;
    description?: string | null;
    assignee?: string | null;
    project?: string | null;
    projectId?: string | null;
    summary?: string | null;
  };
};

export type UpdatePlanMutationVariables = Exact<{
  input: UpdatePlanInput;
}>;

export type UpdatePlanMutation = {
  __typename?: 'Mutation';
  updatePlan?: {
    __typename?: 'PlanObject';
    id: string;
    title: string;
    author: string;
    category: string;
    status: string;
    createdAt: any;
    updatedAt: any;
    description?: string | null;
    assignee?: string | null;
    projectId?: string | null;
    summary?: string | null;
  } | null;
};

export type GetTaskByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetTaskByIdQuery = {
  __typename?: 'Query';
  task?: {
    __typename?: 'TaskObject';
    assignee?: string | null;
    category?: string | null;
    createdAt: any;
    description?: string | null;
    id: string;
    planId: string;
    requirementsJson: string;
    status: string;
    summary?: string | null;
    title: string;
    updatedAt: any;
    projectRelation?: {
      __typename?: 'ProjectObject';
      id: string;
      name: string;
    } | null;
  } | null;
};

export type UpdateTaskMutationVariables = Exact<{
  input: UpdateTaskInput;
}>;

export type UpdateTaskMutation = {
  __typename?: 'Mutation';
  updateTask?: {
    __typename?: 'TaskObject';
    id: string;
    title: string;
    planId: string;
    status: string;
    assignee?: string | null;
    category?: string | null;
    description?: string | null;
    summary?: string | null;
    createdAt: any;
    updatedAt: any;
  } | null;
};

export type CreateTaskMutationVariables = Exact<{
  input: CreateTaskInput;
}>;

export type CreateTaskMutation = {
  __typename?: 'Mutation';
  createTask: {
    __typename?: 'TaskObject';
    id: string;
    title: string;
    planId: string;
    status: string;
    assignee?: string | null;
    category?: string | null;
    description?: string | null;
    summary?: string | null;
    createdAt: any;
    updatedAt: any;
  };
};

export type PlanCardFragment = {
  __typename?: 'PlanObject';
  assignee?: string | null;
  author: string;
  category: string;
  createdAt: any;
  description?: string | null;
  id: string;
  status: string;
  summary?: string | null;
  taskCount: number;
  title: string;
  updatedAt: any;
  projectRelation?: {
    __typename?: 'ProjectObject';
    id: string;
    name: string;
  } | null;
};

export type GetPlanAssigneeOptionsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetPlanAssigneeOptionsQuery = {
  __typename?: 'Query';
  listDistinctAuthorsAndAssignees: Array<string>;
};

export type GetPlanCountsByStatusQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetPlanCountsByStatusQuery = {
  __typename?: 'Query';
  planCountsByStatus: Array<{
    __typename?: 'PlanStatusCountObject';
    count: number;
    status: string;
  }>;
};

export type GetPlansByStatusQueryVariables = Exact<{
  input: ListPlansByStatusInput;
}>;

export type GetPlansByStatusQuery = {
  __typename?: 'Query';
  listPlansByStatus: {
    __typename?: 'ListPlansByStatusResultObject';
    totalCount: number;
    plans: Array<{
      __typename?: 'PlanObject';
      assignee?: string | null;
      author: string;
      category: string;
      createdAt: any;
      description?: string | null;
      id: string;
      status: string;
      summary?: string | null;
      taskCount: number;
      title: string;
      updatedAt: any;
      projectRelation?: {
        __typename?: 'ProjectObject';
        id: string;
        name: string;
      } | null;
    }>;
  };
};

export type ProjectPageDetailsFragment = {
  __typename?: 'ProjectObject';
  createdAt: any;
  description?: string | null;
  id: string;
  name: string;
  nxProjectName?: string | null;
  updatedAt: any;
};

export type GetProjectByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Float']['input']>;
  offset?: InputMaybe<Scalars['Float']['input']>;
}>;

export type GetProjectByIdQuery = {
  __typename?: 'Query';
  project?: {
    __typename?: 'ProjectObject';
    createdAt: any;
    description?: string | null;
    id: string;
    name: string;
    nxProjectName?: string | null;
    updatedAt: any;
  } | null;
  projectTasksResult: {
    __typename?: 'TasksByProjectIdResultObject';
    totalCount: number;
    tasks: Array<{
      __typename?: 'TaskObject';
      assignee?: string | null;
      requirementsJson: string;
      summary?: string | null;
      title: string;
      updatedAt: any;
      category?: string | null;
      createdAt: any;
      description?: string | null;
      id: string;
      planId: string;
    }>;
  };
};

export type ProjectCardFragment = {
  __typename?: 'ProjectObject';
  createdAt: any;
  description?: string | null;
  id: string;
  name: string;
  nxProjectName?: string | null;
  updatedAt: any;
  plans?: Array<{ __typename?: 'PlanObject'; title: string }> | null;
  tasks?: Array<{ __typename?: 'TaskObject'; title: string }> | null;
};

export type GetProjectsQueryVariables = Exact<{ [key: string]: never }>;

export type GetProjectsQuery = {
  __typename?: 'Query';
  projects: Array<{
    __typename?: 'ProjectObject';
    createdAt: any;
    description?: string | null;
    id: string;
    name: string;
    nxProjectName?: string | null;
    updatedAt: any;
    plans?: Array<{ __typename?: 'PlanObject'; title: string }> | null;
    tasks?: Array<{ __typename?: 'TaskObject'; title: string }> | null;
  }>;
};

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput;
}>;

export type CreateProjectMutation = {
  __typename?: 'Mutation';
  createProject: {
    __typename?: 'ProjectObject';
    id: string;
    name: string;
    description?: string | null;
    nxProjectName?: string | null;
    createdAt: any;
    updatedAt: any;
  };
};

export type GetPromptQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetPromptQuery = {
  __typename?: 'Query';
  customPrompt?: {
    __typename?: 'CustomPromptObject';
    content: string;
    createdAt: any;
    description?: string | null;
    filePath?: string | null;
    id: string;
    labels: Array<string>;
    projectId?: string | null;
    promptType: CustomPromptType;
    title: string;
    updatedAt: any;
    userId?: string | null;
  } | null;
};

export type UpdatePromptMutationVariables = Exact<{
  input: UpdateCustomPromptInput;
}>;

export type UpdatePromptMutation = {
  __typename?: 'Mutation';
  updateCustomPrompt?: {
    __typename?: 'CustomPromptObject';
    content: string;
    createdAt: any;
    description?: string | null;
    filePath?: string | null;
    id: string;
    labels: Array<string>;
    promptType: CustomPromptType;
    title: string;
    updatedAt: any;
  } | null;
};

export type DeletePromptMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeletePromptMutation = {
  __typename?: 'Mutation';
  deleteCustomPrompt: boolean;
};

export type WritePromptToFileSystemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type WritePromptToFileSystemMutation = {
  __typename?: 'Mutation';
  writeCustomPromptToFileSystem: boolean;
};

export type PromptCardFragment = {
  __typename?: 'CustomPromptObject';
  content: string;
  createdAt: any;
  description?: string | null;
  filePath?: string | null;
  id: string;
  labels: Array<string>;
  promptType: CustomPromptType;
  title: string;
  updatedAt: any;
};

export type GetPromptsQueryVariables = Exact<{
  input?: InputMaybe<ListCustomPromptsInput>;
}>;

export type GetPromptsQuery = {
  __typename?: 'Query';
  customPrompts: Array<{
    __typename?: 'CustomPromptObject';
    content: string;
    createdAt: any;
    description?: string | null;
    filePath?: string | null;
    id: string;
    labels: Array<string>;
    promptType: CustomPromptType;
    title: string;
    updatedAt: any;
  }>;
};

export type CreatePromptMutationVariables = Exact<{
  input: CreateCustomPromptInput;
}>;

export type CreatePromptMutation = {
  __typename?: 'Mutation';
  createCustomPrompt: {
    __typename?: 'CustomPromptObject';
    content: string;
    createdAt: any;
    description?: string | null;
    filePath?: string | null;
    id: string;
    labels: Array<string>;
    promptType: CustomPromptType;
    title: string;
    updatedAt: any;
  };
};

export type PullRequestCardFragment = {
  __typename?: 'PullListItemObject';
  createdAt: string;
  number: number;
  title: string;
  updatedAt: string;
};

export type GetPullRequestsQueryVariables = Exact<{ [key: string]: never }>;

export type GetPullRequestsQuery = {
  __typename?: 'Query';
  pulls: Array<{
    __typename?: 'PullListItemObject';
    createdAt: string;
    number: number;
    title: string;
    updatedAt: string;
  }>;
};

export type JobDetailsCardFragment = {
  __typename?: 'JobObject';
  data?: string | null;
  failedReason?: string | null;
  finishedOn?: number | null;
  id: string;
  name?: string | null;
  processedOn?: number | null;
  progress?: number | null;
  returnvalue?: string | null;
  state: string;
  timestamp?: number | null;
};

export type GetQueueJobDetailsQueryVariables = Exact<{
  jobId: Scalars['ID']['input'];
  queueName: Scalars['String']['input'];
}>;

export type GetQueueJobDetailsQuery = {
  __typename?: 'Query';
  job?: {
    __typename?: 'JobObject';
    data?: string | null;
    failedReason?: string | null;
    finishedOn?: number | null;
    id: string;
    name?: string | null;
    processedOn?: number | null;
    progress?: number | null;
    returnvalue?: string | null;
    state: string;
    timestamp?: number | null;
  } | null;
};

export type GetQueueQueryVariables = Exact<{
  input: QueueDetailsInput;
}>;

export type GetQueueQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'QueueDetailsObject';
    activeCount: number;
    completedCount: number;
    delayedCount: number;
    failedCount: number;
    name: string;
    waitingCount: number;
    jobs?: {
      __typename?: 'JobsResultObject';
      hasNext: boolean;
      jobs: Array<{
        __typename?: 'JobObject';
        data?: string | null;
        failedReason?: string | null;
        finishedOn?: number | null;
        id: string;
        name?: string | null;
        processedOn?: number | null;
        progress?: number | null;
        returnvalue?: string | null;
        state: string;
        timestamp?: number | null;
      }>;
    } | null;
  } | null;
};

export type QueueCardFragment = {
  __typename?: 'QueueStatsObject';
  activeCount: number;
  completedCount: number;
  delayedCount: number;
  failedCount: number;
  name: string;
  waitingCount: number;
};

export type GetQueuesQueryVariables = Exact<{ [key: string]: never }>;

export type GetQueuesQuery = {
  __typename?: 'Query';
  queues: Array<{
    __typename?: 'QueueStatsObject';
    activeCount: number;
    completedCount: number;
    delayedCount: number;
    failedCount: number;
    name: string;
    waitingCount: number;
  }>;
};

export type CreateQueueMutationVariables = Exact<{
  input: CreateQueueInput;
}>;

export type CreateQueueMutation = {
  __typename?: 'Mutation';
  createQueue: {
    __typename?: 'CreateQueueResultObject';
    success: boolean;
    queueName?: string | null;
    error?: string | null;
  };
};

export type GetSearchResultsQueryVariables = Exact<{
  input: SearchInput;
}>;

export type GetSearchResultsQuery = {
  __typename?: 'Query';
  search: {
    __typename?: 'SearchResult';
    chunks: Array<{
      __typename?: 'SearchChunk';
      content: string;
      id: string;
      planId?: string | null;
      planTitle?: string | null;
      similarity: number;
      source: string;
      sourcePath?: string | null;
      sourceRepo?: string | null;
      sourceSha?: string | null;
      taskId?: string | null;
      taskTitle?: string | null;
    }>;
  };
};

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
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlanTaskRowFragment, unknown>;
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
          { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
          { kind: 'Field', name: { kind: 'Name', value: 'author' } },
          { kind: 'Field', name: { kind: 'Name', value: 'category' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
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
  ],
} as unknown as DocumentNode<PlanDetailsFragment, unknown>;
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
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskCount' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ProjectPageDetailsFragment, unknown>;
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
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'number' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PullRequestCardFragment, unknown>;
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
} as unknown as DocumentNode<JobDetailsCardFragment, unknown>;
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
export const GetSubscriptionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getSubscription' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mySubscription' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'cancelAtPeriodEnd' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stripeCustomerId' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stripePriceId' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetSubscriptionQuery,
  GetSubscriptionQueryVariables
>;
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
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'GitHubRepoInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'openPrCountByAuthor' },
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
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                { kind: 'Field', name: { kind: 'Name', value: 'count' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'avgDaysInState' },
                },
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
      name: { kind: 'Name', value: 'PlanDetails' },
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
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
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
  PlanDetailEnqueuePlanRunMutation,
  PlanDetailEnqueuePlanRunMutationVariables
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
                  name: { kind: 'Name', value: 'noMatchingJob' },
                },
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
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailUpdateTaskMutation,
  PlanDetailUpdateTaskMutationVariables
>;
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'author' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
                { kind: 'Field', name: { kind: 'Name', value: 'project' } },
                { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
              ],
            },
          },
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'author' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
                { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdatePlanMutation, UpdatePlanMutationVariables>;
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
                { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
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
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'requirementsJson' },
                },
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
} as unknown as DocumentNode<GetTaskByIdQuery, GetTaskByIdQueryVariables>;
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateTaskMutation, UpdateTaskMutationVariables>;
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateTaskMutation, CreateTaskMutationVariables>;
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
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taskCount' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetProjectByIdQuery, GetProjectByIdQueryVariables>;
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'nxProjectName' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
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
export const GetPullRequestsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getPullRequests' },
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
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'owner' },
                      value: {
                        kind: 'StringValue',
                        value: 'visormatt',
                        block: false,
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'repo' },
                      value: {
                        kind: 'StringValue',
                        value: 'monorepo',
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
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'number' } },
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
} as unknown as DocumentNode<
  GetQueueJobDetailsQuery,
  GetQueueJobDetailsQueryVariables
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
                { kind: 'Field', name: { kind: 'Name', value: 'activeCount' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'completedCount' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'delayedCount' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'failedCount' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobs' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasNext' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'jobs' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'data' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'failedReason' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'finishedOn' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'id' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'name' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'processedOn' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'progress' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'returnvalue' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'state' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'timestamp' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'waitingCount' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetQueueQuery, GetQueueQueryVariables>;
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
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'queueName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'error' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateQueueMutation, CreateQueueMutationVariables>;
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
