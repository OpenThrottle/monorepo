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

export type AddSkillTagInput = {
  /** Kebab-case tag slug to add (e.g. "pr-review"). */
  tag: Scalars['String']['input'];
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

export type AgentCliOptionObject = {
  __typename?: 'AgentCliOptionObject';
  /** Backend discriminator (e.g. "cursor") used in StartConversationStreamInput. */
  backend: Scalars['String']['output'];
  /** Human-readable label for the selector. */
  label: Scalars['String']['output'];
  /** Trimmed --version output, or null when unknown. */
  version?: Maybe<Scalars['String']['output']>;
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

export type CancelPlanRunInput = {
  /** Plan id whose in-queue run-plan (Ralph) job should be cancelled */
  planId: Scalars['ID']['input'];
};

export type CancelPlanRunResultObject = {
  __typename?: 'CancelPlanRunResultObject';
  /** BullMQ job ids that were active (locked by a worker) and could not be removed from the queue. When "signaledActiveRunToStop" is true, the worker was asked to terminate the Ralph child for this plan. */
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
  /** Event kind: text (assistant output) | thinking | tool_call | tool_result | usage | session. */
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
  /** JSON string of workflow-ralph run configuration (PlanRunConfigStorage v1). Omit to use defaults. */
  runConfigJson?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
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
export enum CustomPromptType {
  Agents = 'AGENTS',
  Commands = 'COMMANDS',
  Personas = 'PERSONAS',
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

export type DeletePlanInput = {
  /** Plan id to delete */
  id: Scalars['ID']['input'];
};

export type DeleteProjectInput = {
  /** Project id to delete */
  id: Scalars['ID']['input'];
};

export type DeleteTaskInput = {
  /** Task id to delete */
  id: Scalars['ID']['input'];
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
  /** Required when mode is task; must belong to the plan. */
  taskId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional absolute path to a local project directory used as the working directory for this run. When omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side. */
  workingDirectory?: InputMaybe<Scalars['String']['input']>;
};

export type EnqueuePlanRunInput = {
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
  /** Optional absolute path to a local project directory used as the working directory for this run. When omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side. */
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

export type ListPlanOutputStreamChunksInput = {
  /** Max rows to return (default and hard cap: 1000). */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Rows to skip (pagination offset). */
  offset?: InputMaybe<Scalars['Int']['input']>;
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
  /** Add a permission to a role */
  addPermissionToRole: Scalars['Boolean']['output'];
  /** Add a rule to a project's rule set (creating the rule set with the default "allow" posture if absent). Tag references are validated against the caller's skill-tag vocabulary. */
  addSkillAvailabilityRule: SkillAvailabilityRuleObject;
  /** Add a kebab-case tag to the authenticated user's skill-tag vocabulary. */
  addSkillTag: SkillTagObject;
  /** Agents namespace: run one chat turn against the server-side agents path (OpenThrottle / MCP developer). Returns assistant text, mcpTool, structuredPayloadJson, and toolMetadataJson; uses errorMessage instead of throws for expected validation failures. */
  agentsRunChatTurn: AgentsChatTurnResult;
  /** Append a chunk to a plan's output stream (e.g. agent iteration log). */
  appendPlanOutput: PlanOutputStreamChunkObject;
  /** Apply enabled editor configuration (MCP, skills paths, rules dirs) to linked local repositories. */
  applyWorkspaceEditorConfiguration: ApplyWorkspaceEditorConfigurationResultObject;
  /** Archive an owned agent conversation (no hard delete in v1). */
  archiveAgentConversation: AgentConversationObject;
  /** Assign a role to a service account (admin, human only). */
  assignRoleToServiceAccount: Scalars['Boolean']['output'];
  /** Assign a role to a user */
  assignRoleToUser: Scalars['Boolean']['output'];
  /** Abort an in-flight streamed turn for an owned conversation. Returns true when a stream was aborted. */
  cancelConversationStream: Scalars['Boolean']['output'];
  /** Cancel BullMQ plan-run jobs for a plan: removes waiting or delayed jobs, and signals the worker to stop the Ralph child when a job is active (cannot be removed from Redis without the lock token). */
  cancelPlanRun: CancelPlanRunResultObject;
  /** Create an agent conversation for the authenticated human user. */
  createAgentConversation: AgentConversationObject;
  /** Create a new custom prompt */
  createCustomPrompt: CustomPromptObject;
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
  /** Register a local filesystem repository for the authenticated user. */
  createWorkspaceLocalRepository: WorkspaceLocalRepositoryObject;
  /** Soft delete a custom prompt by ID */
  deleteCustomPrompt: Scalars['Boolean']['output'];
  /** Delete a note by ID */
  deleteNote: Scalars['Boolean']['output'];
  /** Delete a plan by ID */
  deletePlan: Scalars['Boolean']['output'];
  /** Delete a project by ID. Related plans and tasks remain; their project link is cleared (ON DELETE SET NULL). */
  deleteProject: Scalars['Boolean']['output'];
  /** Delete a role */
  deleteRole: Scalars['Boolean']['output'];
  /** Delete a project's rule set (cascading its rules). Returns false when the project had no rule set. */
  deleteSkillAvailabilityRuleSet: Scalars['Boolean']['output'];
  /** Delete a task by ID */
  deleteTask: Scalars['Boolean']['output'];
  /** Remove a local repository owned by the authenticated user. */
  deleteWorkspaceLocalRepository: Scalars['Boolean']['output'];
  /** Disable a service account (admin, human only). */
  disableServiceAccount?: Maybe<ServiceAccountObject>;
  /** Disable a user; they will not be able to log in. */
  disableUser?: Maybe<UserObject>;
  /** Duplicate a job (add new job with same data). Works for plans queue and future queues. Returns new job id or error. */
  duplicateJob: DuplicateJobResultObject;
  /** Re-enable a disabled service account (admin, human only). */
  enableServiceAccount?: Maybe<ServiceAccountObject>;
  /** Re-enable a disabled user. */
  enableUser?: Maybe<UserObject>;
  /** Enqueue an agentic-test smoke job. Echoes the current ISO timestamp once per second for ~30s, then completes. Returns job id or error. */
  enqueueAgenticTest: EnqueueAgenticTestResultObject;
  /** Enqueue a deterministic mock payload on the agentic-test queue (agentic-workflow smoke path). Returns job metadata or error. */
  enqueueAgenticWorkflowMock: EnqueueAgenticWorkflowMockResultObject;
  /** Enqueue a doc-ingestion job. Provide directories and/or files (at least one required). Job runs diff-based re-ingestion for the given paths. Returns job id or error. */
  enqueueDocIngestion: EnqueueDocIngestionResultObject;
  /** Enqueue an in-process Ralph orchestrator job (GraphQL-backed pipeline, no nested workflow-ralph process). Same queue position and plan/task status updates as enqueuePlanRun. */
  enqueuePlanRalphOrchestrator: EnqueuePlanRunResultObject;
  /** Canonical mutation to enqueue a spawn plan-run job (nested workflow-ralph in the worker). Used by the Developer app "Run plan" action and external clients. Returns job id, plan id, and queue position. For in-process orchestrator runs use enqueuePlanRalphOrchestrator instead. */
  enqueuePlanRun: EnqueuePlanRunResultObject;
  /** Permanently delete a custom prompt by ID */
  hardDeleteCustomPrompt: Scalars['Boolean']['output'];
  /** Enqueue a full re-index of a registered repository's code. Returns indexing, or unavailable when no embeddings provider is configured. */
  indexCodeRepository: IndexCodeRepositoryResult;
  /** Associate a git commit with a plan (and optionally a task). Use after PR merge with squash SHA. */
  linkCommit: CommitLinkObject;
  /** Sign in with email and password. Returns JWT access token for Authorization header or cookie. */
  login: LoginResultObject;
  /** Mint a short-lived token (scoped to the current user) for authenticating a graphql-ws subscription connection via connectionParams.authToken. */
  mintSubscriptionToken: Scalars['String']['output'];
  /** Register a new user. Returns id, email, and JWT access token. */
  register: RegisterResultObject;
  /** Remove a permission from a role */
  removePermissionFromRole: Scalars['Boolean']['output'];
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
  /** Rename a tag in the authenticated user's skill-tag vocabulary. */
  renameSkillTag: SkillTagObject;
  /** Reorder tasks within a plan. Renumbers sortOrder 1000, 2000, … in taskIds order atomically. */
  reorderPlanTasks: Array<TaskObject>;
  /** Restore a soft-deleted custom prompt */
  restoreCustomPrompt?: Maybe<CustomPromptObject>;
  /** Retry a failed job. Validates queue exists and job is in failed state. Returns job id or error. */
  retryJob: RetryJobResultObject;
  /** Revoke a service account credential (admin, human only). */
  revokeServiceAccountCredential: Scalars['Boolean']['output'];
  /** Relay one ~250ms chunk of base64-encoded 16kHz mono Int16 PCM to the session's WhisperLive connection. Executed over the same authenticated graphql-ws socket as the subscription. Returns false (no throw) for unauthenticated, unknown, foreign, or already-stopping sessions. */
  sendTranscriptionAudioChunk: Scalars['Boolean']['output'];
  /** Set a plan's status (e.g. COMPLETED). Convenience mutation for Mark Complete; equivalent to updatePlan with { id, status }. */
  setPlanStatus?: Maybe<PlanObject>;
  /** Assign, change, or clear the OpenThrottle project link for a local repository. */
  setWorkspaceLocalRepositoryProject: WorkspaceLocalRepositoryObject;
  /** Sign out. Returns success; client is responsible for clearing the auth cookie. */
  signout: SignoutResultObject;
  /** Start a streamed assistant turn against a discovered local model. Persists the user message, returns the assistant message id to correlate the in-flight stream, and emits token deltas over conversationStreamChunkAdded. Uses errorMessage for expected validation failures. */
  startConversationStream: StartConversationStreamResult;
  /** Mint a transcription session: the server opens a websocket to the local WhisperLive service (WHISPER_SERVICE_URL — env-only, never client-supplied) and returns the session id to stream audio to. Must be executed over an authenticated graphql-ws connection (the audio mutations ride the same socket). A user's previous active session is closed first. Uses errorMessage for expected failures (unconfigured / unreachable). */
  startTranscriptionStream: StartTranscriptionStreamResult;
  /** Flush and finalize an owned transcription session: sends END_OF_AUDIO upstream, waits a short flush window for the last revising segments, then emits the terminal done:true snapshot. Returns false (no throw) for unauthenticated, unknown, or foreign sessions. */
  stopTranscriptionStream: Scalars['Boolean']['output'];
  /** Append a sample structured log line (JSONL + hub). Requires OT_SERVER_DEV_JSONL_LOGGING=true at startup. See packages/nestjs-logging README. */
  triggerDevJsonlLogSample: Scalars['Boolean']['output'];
  /** Trigger a test websocket notification (system.alert). Returns true when the event was emitted. Use from the web app to verify the notification flow end-to-end. */
  triggerWebsocketNotification: Scalars['Boolean']['output'];
  /** Update the title on an owned agent conversation. */
  updateAgentConversationTitle: AgentConversationObject;
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
  /** Update a service account (admin, human only). */
  updateServiceAccount?: Maybe<ServiceAccountObject>;
  /** Replace a rule's tag/slug lists and environment by rule id. Tag references are validated against the caller's skill-tag vocabulary. */
  updateSkillAvailabilityRule: SkillAvailabilityRuleObject;
  /** Update a task */
  updateTask?: Maybe<TaskObject>;
  /** Update a user */
  updateUser?: Maybe<UserObject>;
  /** Update metadata for a local repository owned by the authenticated user. */
  updateWorkspaceLocalRepository: WorkspaceLocalRepositoryObject;
  /** Update contact fields and/or enabled editors on the authenticated user's workspace profile. */
  updateWorkspaceProfile: UserWorkspaceProfileObject;
  /** Create or update a project's rule set, setting its posture ("allow" | "deny"). Idempotent per project. */
  upsertSkillAvailabilityRuleSet: SkillAvailabilityRuleSetObject;
  /**
   * Deprecated alias for enqueuePlanRun. Enqueues a spawn plan-run job with the same input and result shape.
   * @deprecated Use enqueuePlanRun. Identical spawn enqueue behavior; retained for backward-compatible clients only.
   */
  workflowPlanRun: EnqueuePlanRunResultObject;
  /** Write a custom prompt to the file system at its configured filePath */
  writeCustomPromptToFileSystem: Scalars['Boolean']['output'];
};

export type MutationAddPermissionToRoleArgs = {
  input: AddPermissionToRoleInput;
};

export type MutationAddSkillAvailabilityRuleArgs = {
  input: SkillAvailabilityRuleInput;
  projectId: Scalars['ID']['input'];
};

export type MutationAddSkillTagArgs = {
  input: AddSkillTagInput;
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

export type MutationAssignRoleToServiceAccountArgs = {
  input: AssignRoleToServiceAccountInput;
};

export type MutationAssignRoleToUserArgs = {
  input: AssignRoleToUserInput;
};

export type MutationCancelConversationStreamArgs = {
  conversationId: Scalars['ID']['input'];
};

export type MutationCancelPlanRunArgs = {
  input: CancelPlanRunInput;
};

export type MutationCreateAgentConversationArgs = {
  input?: InputMaybe<CreateAgentConversationInput>;
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

export type MutationDeleteCustomPromptArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteNoteArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeletePlanArgs = {
  input: DeletePlanInput;
};

export type MutationDeleteProjectArgs = {
  input: DeleteProjectInput;
};

export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteSkillAvailabilityRuleSetArgs = {
  projectId: Scalars['ID']['input'];
};

export type MutationDeleteTaskArgs = {
  input: DeleteTaskInput;
};

export type MutationDeleteWorkspaceLocalRepositoryArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDisableServiceAccountArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDisableUserArgs = {
  id: Scalars['ID']['input'];
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

export type MutationEnqueueDocIngestionArgs = {
  input: EnqueueDocIngestionInput;
};

export type MutationEnqueuePlanRalphOrchestratorArgs = {
  input: EnqueuePlanRalphOrchestratorInput;
};

export type MutationEnqueuePlanRunArgs = {
  input: EnqueuePlanRunInput;
};

export type MutationHardDeleteCustomPromptArgs = {
  id: Scalars['ID']['input'];
};

export type MutationIndexCodeRepositoryArgs = {
  repositoryId: Scalars['ID']['input'];
};

export type MutationLinkCommitArgs = {
  input: LinkCommitInput;
};

export type MutationLoginArgs = {
  input: LoginInput;
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

export type MutationRenameSkillTagArgs = {
  input: RenameSkillTagInput;
};

export type MutationReorderPlanTasksArgs = {
  input: ReorderPlanTasksInput;
};

export type MutationRestoreCustomPromptArgs = {
  id: Scalars['ID']['input'];
};

export type MutationRetryJobArgs = {
  input: RetryJobInput;
};

export type MutationRevokeServiceAccountCredentialArgs = {
  credentialId: Scalars['ID']['input'];
};

export type MutationSendTranscriptionAudioChunkArgs = {
  audioBase64: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
  sortOrder: Scalars['Int']['input'];
};

export type MutationSetPlanStatusArgs = {
  input: SetPlanStatusInput;
};

export type MutationSetWorkspaceLocalRepositoryProjectArgs = {
  input: SetWorkspaceLocalRepositoryProjectInput;
};

export type MutationStartConversationStreamArgs = {
  input: StartConversationStreamInput;
};

export type MutationStopTranscriptionStreamArgs = {
  sessionId: Scalars['ID']['input'];
};

export type MutationUpdateAgentConversationTitleArgs = {
  input: UpdateAgentConversationTitleInput;
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

export type MutationUpdateWorkspaceLocalRepositoryArgs = {
  input: UpdateWorkspaceLocalRepositoryInput;
};

export type MutationUpdateWorkspaceProfileArgs = {
  input: UpdateWorkspaceProfileInput;
};

export type MutationUpsertSkillAvailabilityRuleSetArgs = {
  posture: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
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

export type PlanObject = {
  __typename?: 'PlanObject';
  assignee?: Maybe<Scalars['String']['output']>;
  author: Scalars['String']['output'];
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

/** Plan-scoped run (default) or task-centric run ("task" requires taskId). */
export enum PlanRalphWorkflowMode {
  Plan = 'plan',
  Task = 'task',
}

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
  /** BullMQ job id for this run. */
  bullmqJobId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** Execution backend selected once for the whole run: cursor or claude. */
  executionBackend: Scalars['String']['output'];
  id: Scalars['String']['output'];
  planId: Scalars['String']['output'];
  queueName: Scalars['String']['output'];
  /** Resolved workflow-ralph configuration at enqueue (PlanRunConfigSnapshot v1 JSON). Null for legacy runs. */
  runConfigSnapshotJson?: Maybe<Scalars['String']['output']>;
  /** Ralph run implementation: spawn or orchestrator. */
  runKind: Scalars['String']['output'];
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type PlanRunsByPlanIdInput = {
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

/** A single skill in a project's ingested skill universe, with its static frontmatter tags and tri-state disable-model-invocation flag. */
export type ProjectSkillObject = {
  __typename?: 'ProjectSkillObject';
  /** Skill slug (the skill frontmatter `name`). */
  slug: Scalars['String']['output'];
  /** Static frontmatter `disable-model-invocation`. Tri-state: null = unset (frontmatter omits the key), true = auto-invocation suppressed, false = auto-invocation explicitly enabled. */
  staticDisableModelInvocation?: Maybe<Scalars['Boolean']['output']>;
  /** Static frontmatter tags for this skill (empty when none). */
  tags: Array<Scalars['String']['output']>;
};

/** A project's ingested skill universe, alphabetically by slug. */
export type ProjectSkillsResult = {
  __typename?: 'ProjectSkillsResult';
  /** Skills ingested for the project, alphabetically by slug. */
  skills: Array<ProjectSkillObject>;
  /** Number of skills in the universe. */
  totalCount: Scalars['Int']['output'];
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
  /** Index status for a registered repository: unavailable, indexing, ready, or notIndexed. */
  codeIndexStatus: CodeIndexStatusObject;
  /** Natural-language code semantic search over a registered repository's indexed code. available=false when no embeddings provider is configured. */
  codeSemanticSearch: CodeSemanticSearchResult;
  /** Get a commit link by ID */
  commitLink?: Maybe<CommitLinkObject>;
  /** List commit links, ordered by createdAt descending. Capped at 100 by default (max 500); pass limit to override. Use commitLinksByPlanId/commitLinksByTaskId for scoped lists. */
  commitLinks: Array<CommitLinkObject>;
  /** List commit links for a plan (plan-level and task-level), ordered by createdAt descending */
  commitLinksByPlanId: Array<CommitLinkObject>;
  /** List commit links for a task, ordered by createdAt descending */
  commitLinksByTaskId: Array<CommitLinkObject>;
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
  /** Discover allowlisted agentic CLI backends (e.g. cursor-agent) detected on the server host. Returns a cached snapshot (60s TTL); does not probe per request. */
  discoverAgentClis: DiscoverAgentClisResult;
  /** Discover locally-running OpenAI-compatible model servers (Ollama-primary) and the models they serve. Returns a cached snapshot (60s TTL); does not scan per request. */
  discoverLocalModels: DiscoverLocalModelsResult;
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
  /** Single job by id and queue name. Returns null if not found. */
  job?: Maybe<JobObject>;
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
  /** Get the currently authenticated user */
  me?: Maybe<UserObject>;
  /** Metrics namespace: serverSnapshot (current process metrics) and recentPlanRunsMetrics for plan-level visualization. serverMetrics at root is unchanged. */
  metrics: MetricsObject;
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
  /** Get a plan output stream chunk by ID */
  planOutputStreamChunk?: Maybe<PlanOutputStreamChunkObject>;
  /** List plan output stream chunks by plan ID, ordered by createdAt ascending */
  planOutputStreamChunks: Array<PlanOutputStreamChunkObject>;
  /** Recent persisted Ralph plan runs for a plan, newest first. Each row stores exactly one execution backend. */
  planRunsByPlanId: Array<PlanRunObject>;
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
  /** Semantic search over plan and task embeddings. Embeds the query and returns ranked chunks. Requires OpenThrottle Postgres and embedding (OPENAI_API_KEY or Ollama). */
  search: SearchResult;
  /** Semantic search over agent-asset (custom_prompt) embeddings. Embeds the query and returns ranked, de-duped assets (skills, rules, personas by default). Requires OpenThrottle Postgres and embedding (OPENAI_API_KEY or Ollama). */
  searchAgentAssets: AgentAssetSearchResult;
  /** Semantic search over plans/tasks (vector similarity). Requires OPENAI_API_KEY or Ollama for query embedding. Returns plans matching the query, deduped by plan id. */
  searchPlans: ListPlansByStatusResultObject;
  /** Server health: API, OpenThrottle DB, Redis (BullMQ), and WebSocket. Each component is ok | unconfigured | unreachable. */
  serverHealth: ServerHealthObject;
  /** Current process CPU and memory snapshot. Memory in MB; CPU in ms (cumulative). Same data as REST GET /metrics. */
  serverMetrics: ServerMetricsObject;
  /** Get a service account by ID (admin, human only). */
  serviceAccount?: Maybe<ServiceAccountObject>;
  /** List credentials for a service account, including revoked (admin, human only). */
  serviceAccountCredentials: Array<ServiceAccountCredentialObject>;
  /** List all service accounts (admin, human only). */
  serviceAccounts: Array<ServiceAccountObject>;
  /** A project's skill-availability rule set (posture + rules), or null when the project has no rules (passthrough). Feeds resolveSkillAvailability. */
  skillAvailabilityRuleSet?: Maybe<SkillAvailabilityRuleSetObject>;
  /** The authenticated user's skill-tag vocabulary. Seeded from the platform default on first read. */
  skillTagVocabulary: SkillTagVocabularyResult;
  /** Get a task by ID */
  task?: Maybe<TaskObject>;
  /** Get a task embedding by ID */
  taskEmbedding?: Maybe<TaskEmbeddingObject>;
  /** List task embeddings by task ID, ordered by createdAt ascending */
  taskEmbeddings: Array<TaskEmbeddingObject>;
  /** List tasks, ordered by planId then sortOrder then createdAt ascending. Capped at 100 by default (max 500); pass limit to override. Use tasksByPlanId/tasksByProjectId for scoped lists. */
  tasks: Array<TaskObject>;
  /** List tasks for a plan by plan ID, ordered by sortOrder then createdAt ascending */
  tasksByPlanId: Array<TaskObject>;
  /** List tasks for a project by project ID (FK). Optional limit/offset for pagination; when omitted returns all tasks and totalCount. */
  tasksByProjectId: TasksByProjectIdResultObject;
  /** Get a user by ID */
  user?: Maybe<UserObject>;
  /** List all users, ordered by createdAt descending */
  users: Array<UserObject>;
  /** List local repositories for the authenticated user. */
  workspaceLocalRepositories: Array<WorkspaceLocalRepositoryObject>;
  /** Get a local repository by id for the authenticated user. */
  workspaceLocalRepository?: Maybe<WorkspaceLocalRepositoryObject>;
  /** Workspace settings for the authenticated user (profile and local repositories). */
  workspaceSettings: WorkspaceSettingsObject;
};

export type QueryActivityByDateArgs = {
  input: ActivityByDateInput;
};

export type QueryActivityByDateRangeArgs = {
  input: ActivityByDateRangeInput;
};

export type QueryCodeIndexStatusArgs = {
  repositoryId: Scalars['ID']['input'];
};

export type QueryCodeSemanticSearchArgs = {
  input: CodeSemanticSearchInput;
};

export type QueryCommitLinkArgs = {
  input: GetCommitLinkInput;
};

export type QueryCommitLinksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
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

export type QuerySkillAvailabilityRuleSetArgs = {
  projectId: Scalars['ID']['input'];
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

export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};

export type QueryWorkspaceLocalRepositoryArgs = {
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
export enum QueueJobLogLevel {
  Debug = 'debug',
  Error = 'error',
  Info = 'info',
  Warn = 'warn',
}

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
  /** Prompt profile path (e.g. /agents-ralph) for --prompt. */
  prompt?: InputMaybe<Scalars['String']['input']>;
  /** Repo-relative or absolute path for --prompt-file (layer-1 prompt file). */
  promptFile?: InputMaybe<Scalars['String']['input']>;
  /** Whether to pass --debug / --verbose to nested workflow-ralph. */
  ralphDebugCli?: InputMaybe<RalphNestedDebugCli>;
  /** Cursor-only: pass --skip-worktree-setup to cursor-agent. */
  skipWorktreeSetup?: InputMaybe<Scalars['Boolean']['input']>;
  /** Agent CLI worktree name for -w/--worktree on cursor-agent and claude. When omitted in a BullMQ worktree run, defaults to the acquired target id. */
  worktree?: InputMaybe<Scalars['String']['input']>;
  /** Cursor-only: branch/ref for --worktree-base. */
  worktreeBase?: InputMaybe<Scalars['String']['input']>;
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
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** When set, the service account cannot authenticate. */
  disabledAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  /** Stable identifier (e.g. openthrottle-mcp, workflow-ralph). */
  name: Scalars['String']['output'];
};

export type SetPlanStatusInput = {
  /** Plan id to update status for */
  planId: Scalars['ID']['input'];
  /** New status (e.g. COMPLETED, IN_PROGRESS, PENDING, QUEUED). Normalized to uppercase. */
  status: Scalars['String']['input'];
};

export type SetWorkspaceLocalRepositoryProjectInput = {
  id: Scalars['ID']['input'];
  /** OpenThrottle project id, or null to clear the link. */
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type SignoutResultObject = {
  __typename?: 'SignoutResultObject';
  /** Whether signout completed successfully */
  success: Scalars['Boolean']['output'];
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

export type StartConversationStreamInput = {
  /** Backend to stream from: "openai" (default) or an allowlisted agent CLI (e.g. "cursor"). Omit for openai. */
  backend?: InputMaybe<Scalars['String']['input']>;
  /** OpenAI-compatible base URL of a discovered local endpoint, e.g. http://localhost:11434/v1. Required for the openai backend. */
  baseUrl?: InputMaybe<Scalars['String']['input']>;
  /** Existing conversation to continue; omit to start a new conversation. */
  conversationId?: InputMaybe<Scalars['ID']['input']>;
  /** User message text for this turn. */
  message: Scalars['String']['input'];
  /** Model id to complete with. Required for the openai backend; optional model override for CLI backends. */
  modelId?: InputMaybe<Scalars['String']['input']>;
  /** Persona to steer the turn; CLI backends inject it as a system prompt. */
  personaId?: InputMaybe<Scalars['ID']['input']>;
  /** Registered WorkspaceLocalRepository to run a CLI backend in. Required for CLI backends in production (the server resolves + ownership-checks the path). */
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
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

export type Subscription = {
  __typename?: 'Subscription';
  /** Live token stream for a conversation (topic conversation:<id>:stream). Requires an authenticated connection that owns the conversation. */
  conversationStreamChunkAdded: ConversationStreamChunkObject;
  /** Firehose of all real-time notification events. Identity comes from the authenticated ws connection. */
  notifications: NotificationEvent;
  /** Lifecycle notifications for a single plan (topic plan:<planId>:lifecycle). */
  planNotifications: NotificationEvent;
  /** Live stream of output chunks appended to a plan (topic plan:<planId>:output). */
  planOutputChunkAdded: PlanOutputStreamChunkObject;
  /** Live transcript snapshots for an owned transcription session (topic transcription:<sessionId>:stream). Snapshot-replace: each chunk carries the full transcript so far; clients keep the highest sortOrder. Requires an authenticated connection that owns the session. */
  transcriptionStreamChunkAdded: TranscriptionStreamChunkObject;
};

export type SubscriptionConversationStreamChunkAddedArgs = {
  conversationId: Scalars['ID']['input'];
};

export type SubscriptionPlanNotificationsArgs = {
  planId: Scalars['ID']['input'];
};

export type SubscriptionPlanOutputChunkAddedArgs = {
  planId: Scalars['ID']['input'];
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
  assignee?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  /** Set once on transition into COMPLETED; cleared if status leaves COMPLETED. Null when never completed. */
  completedAt?: Maybe<Scalars['DateTime']['output']>;
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
  /** Execution/list order within plan (gap-based: 1000, 2000, …). UNIQUE per planId. */
  sortOrder: Scalars['Int']['output'];
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

export type UpdateAgentConversationTitleInput = {
  conversationId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
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

export type UpdateServiceAccountInput = {
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

/** Result of applying editor configuration for one linked repository and editor. */
export type WorkspaceEditorConfigApplicationObject = {
  __typename?: 'WorkspaceEditorConfigApplicationObject';
  editor: WorkspaceEditorId;
  filesWritten: Array<Scalars['String']['output']>;
  filesystemPath: Scalars['String']['output'];
  repositoryId: Scalars['ID']['output'];
  warnings: Array<Scalars['String']['output']>;
};

/** Editor OpenThrottle may configure in linked local repositories (MCP, skills, rules). Supported values: cursor, vscode. */
export enum WorkspaceEditorId {
  /** Cursor IDE */
  Cursor = 'CURSOR',
  /** Visual Studio Code */
  Vscode = 'VSCODE',
}

/** A local filesystem checkout registered under the user's workspace settings. */
export type WorkspaceLocalRepositoryObject = {
  __typename?: 'WorkspaceLocalRepositoryObject';
  createdAt: Scalars['DateTime']['output'];
  displayName: Scalars['String']['output'];
  /** Canonical absolute path on the server host. */
  filesystemPath: Scalars['String']['output'];
  gitDefaultBranch?: Maybe<Scalars['String']['output']>;
  /** Optional git remote URL (origin). */
  gitRemoteUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<ProjectObject>;
  /** Optional OpenThrottle project linked to this checkout. */
  projectId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

/** Workspace settings for the authenticated user: profile and local repositories. */
export type WorkspaceSettingsObject = {
  __typename?: 'WorkspaceSettingsObject';
  localRepositories: Array<WorkspaceLocalRepositoryObject>;
  profile: UserWorkspaceProfileObject;
};

export type HealthCardFragment = {
  __typename?: 'ServerHealthObject';
  api: string;
  database: string;
  redis: string;
  websocket: string;
};

type NotificationFields_DebugNotification_Fragment = {
  __typename?: 'DebugNotification';
  dataJson?: string | null;
  event: string;
  link?: string | null;
  message?: string | null;
  severity?: string | null;
  timestamp: string;
};

type NotificationFields_PlanEnqueuedNotification_Fragment = {
  __typename?: 'PlanEnqueuedNotification';
  planId: string;
  queuePosition: number;
  queueTotal: number;
  event: string;
  link?: string | null;
  message?: string | null;
  severity?: string | null;
  timestamp: string;
};

type NotificationFields_PlanStatusChangedNotification_Fragment = {
  __typename?: 'PlanStatusChangedNotification';
  planId: string;
  status: string;
  event: string;
  link?: string | null;
  message?: string | null;
  severity?: string | null;
  timestamp: string;
};

type NotificationFields_PlanUpdatedNotification_Fragment = {
  __typename?: 'PlanUpdatedNotification';
  planId: string;
  taskId?: string | null;
  event: string;
  link?: string | null;
  message?: string | null;
  severity?: string | null;
  timestamp: string;
};

type NotificationFields_PlanWaitingForWorktreeNotification_Fragment = {
  __typename?: 'PlanWaitingForWorktreeNotification';
  planId: string;
  retryDelayMs: number;
  event: string;
  link?: string | null;
  message?: string | null;
  severity?: string | null;
  timestamp: string;
};

type NotificationFields_QueueJobCompletedNotification_Fragment = {
  __typename?: 'QueueJobCompletedNotification';
  jobType: string;
  taskId?: string | null;
  event: string;
  link?: string | null;
  message?: string | null;
  severity?: string | null;
  timestamp: string;
};

type NotificationFields_SystemAlertNotification_Fragment = {
  __typename?: 'SystemAlertNotification';
  code?: string | null;
  event: string;
  link?: string | null;
  message?: string | null;
  severity?: string | null;
  timestamp: string;
};

type NotificationFields_TaskCompletedNotification_Fragment = {
  __typename?: 'TaskCompletedNotification';
  planId: string;
  taskId?: string | null;
  event: string;
  link?: string | null;
  message?: string | null;
  severity?: string | null;
  timestamp: string;
};

type NotificationFields_TaskStatusChangedNotification_Fragment = {
  __typename?: 'TaskStatusChangedNotification';
  planId: string;
  status: string;
  taskId?: string | null;
  event: string;
  link?: string | null;
  message?: string | null;
  severity?: string | null;
  timestamp: string;
};

export type NotificationFieldsFragment =
  | NotificationFields_DebugNotification_Fragment
  | NotificationFields_PlanEnqueuedNotification_Fragment
  | NotificationFields_PlanStatusChangedNotification_Fragment
  | NotificationFields_PlanUpdatedNotification_Fragment
  | NotificationFields_PlanWaitingForWorktreeNotification_Fragment
  | NotificationFields_QueueJobCompletedNotification_Fragment
  | NotificationFields_SystemAlertNotification_Fragment
  | NotificationFields_TaskCompletedNotification_Fragment
  | NotificationFields_TaskStatusChangedNotification_Fragment;

export type RootMetricsFragment = {
  __typename?: 'ServerMetricsObject';
  cpuSystemMs: number;
  cpuUserMs: number;
  externalMb: number;
  heapTotalMb: number;
  heapUsedMb: number;
  rssMb: number;
};

export type GetMyUserQueryVariables = Exact<{ [key: string]: never }>;

export type GetMyUserQuery = {
  __typename?: 'Query';
  me?: {
    __typename?: 'UserObject';
    createdAt: any;
    disabledAt?: any | null;
    email?: string | null;
    githubUsername: string;
    id: string;
    updatedAt: any;
  } | null;
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

export type GetAgentConversationMessagesQueryVariables = Exact<{
  input: GetAgentConversationMessagesInput;
}>;

export type GetAgentConversationMessagesQuery = {
  __typename?: 'Query';
  getAgentConversationMessages: {
    __typename?: 'ListAgentConversationMessagesResultObject';
    totalCount: number;
    messages: Array<{
      __typename?: 'AgentConversationMessageObject';
      content: string;
      createdAt: any;
      id: string;
      role: string;
      routingConfidence?: number | null;
      routingReason?: string | null;
      toolMetadataJson?: string | null;
    }>;
  };
};

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;

export type LoginMutation = {
  __typename?: 'Mutation';
  login: { __typename?: 'LoginResultObject'; accessToken: string };
};

export type LogoutMutationVariables = Exact<{ [key: string]: never }>;

export type LogoutMutation = {
  __typename?: 'Mutation';
  signout: { __typename?: 'SignoutResultObject'; success: boolean };
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

export type SendAgentMessageMutationVariables = Exact<{
  input: AgentsRunChatTurnInput;
}>;

export type SendAgentMessageMutation = {
  __typename?: 'Mutation';
  agentsRunChatTurn: {
    __typename?: 'AgentsChatTurnResult';
    assistantText?: string | null;
    conversationId?: string | null;
    errorMessage?: string | null;
    mcpTool?: string | null;
    readOnlyAgentsChat: boolean;
    routingConfidence?: number | null;
    routingReason?: string | null;
    structuredPayloadJson?: string | null;
    toolMetadataJson?: string | null;
  };
};

export type NotificationsSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type NotificationsSubscription = {
  __typename?: 'Subscription';
  notifications:
    | {
        __typename?: 'DebugNotification';
        dataJson?: string | null;
        event: string;
        link?: string | null;
        message?: string | null;
        severity?: string | null;
        timestamp: string;
      }
    | {
        __typename?: 'PlanEnqueuedNotification';
        planId: string;
        queuePosition: number;
        queueTotal: number;
        event: string;
        link?: string | null;
        message?: string | null;
        severity?: string | null;
        timestamp: string;
      }
    | {
        __typename?: 'PlanStatusChangedNotification';
        planId: string;
        status: string;
        event: string;
        link?: string | null;
        message?: string | null;
        severity?: string | null;
        timestamp: string;
      }
    | {
        __typename?: 'PlanUpdatedNotification';
        planId: string;
        taskId?: string | null;
        event: string;
        link?: string | null;
        message?: string | null;
        severity?: string | null;
        timestamp: string;
      }
    | {
        __typename?: 'PlanWaitingForWorktreeNotification';
        planId: string;
        retryDelayMs: number;
        event: string;
        link?: string | null;
        message?: string | null;
        severity?: string | null;
        timestamp: string;
      }
    | {
        __typename?: 'QueueJobCompletedNotification';
        jobType: string;
        taskId?: string | null;
        event: string;
        link?: string | null;
        message?: string | null;
        severity?: string | null;
        timestamp: string;
      }
    | {
        __typename?: 'SystemAlertNotification';
        code?: string | null;
        event: string;
        link?: string | null;
        message?: string | null;
        severity?: string | null;
        timestamp: string;
      }
    | {
        __typename?: 'TaskCompletedNotification';
        planId: string;
        taskId?: string | null;
        event: string;
        link?: string | null;
        message?: string | null;
        severity?: string | null;
        timestamp: string;
      }
    | {
        __typename?: 'TaskStatusChangedNotification';
        planId: string;
        status: string;
        taskId?: string | null;
        event: string;
        link?: string | null;
        message?: string | null;
        severity?: string | null;
        timestamp: string;
      };
};

export type DiscoverAgentClisQueryVariables = Exact<{ [key: string]: never }>;

export type DiscoverAgentClisQuery = {
  __typename?: 'Query';
  discoverAgentClis: {
    __typename?: 'DiscoverAgentClisResult';
    totalCount: number;
    agents: Array<{
      __typename?: 'AgentCliOptionObject';
      backend: string;
      label: string;
      version?: string | null;
    }>;
  };
};

export type DiscoverLocalModelsQueryVariables = Exact<{ [key: string]: never }>;

export type DiscoverLocalModelsQuery = {
  __typename?: 'Query';
  discoverLocalModels: {
    __typename?: 'DiscoverLocalModelsResult';
    totalCount: number;
    endpoints: Array<{
      __typename?: 'ModelEndpointObject';
      baseUrl: string;
      host: string;
      models: Array<string>;
      provider?: string | null;
    }>;
  };
};

export type PersonaPromptsQueryVariables = Exact<{ [key: string]: never }>;

export type PersonaPromptsQuery = {
  __typename?: 'Query';
  customPrompts: Array<{
    __typename?: 'CustomPromptObject';
    description?: string | null;
    id: string;
    title: string;
  }>;
};

export type WorkspaceLocalRepositoriesQueryVariables = Exact<{
  [key: string]: never;
}>;

export type WorkspaceLocalRepositoriesQuery = {
  __typename?: 'Query';
  workspaceLocalRepositories: Array<{
    __typename?: 'WorkspaceLocalRepositoryObject';
    displayName: string;
    filesystemPath: string;
    id: string;
  }>;
};

export type StartConversationStreamMutationVariables = Exact<{
  input: StartConversationStreamInput;
}>;

export type StartConversationStreamMutation = {
  __typename?: 'Mutation';
  startConversationStream: {
    __typename?: 'StartConversationStreamResult';
    assistantMessageId?: string | null;
    conversationId?: string | null;
    errorMessage?: string | null;
    userMessageId?: string | null;
  };
};

export type CancelConversationStreamMutationVariables = Exact<{
  conversationId: Scalars['ID']['input'];
}>;

export type CancelConversationStreamMutation = {
  __typename?: 'Mutation';
  cancelConversationStream: boolean;
};

export type ConversationStreamChunkAddedSubscriptionVariables = Exact<{
  conversationId: Scalars['ID']['input'];
}>;

export type ConversationStreamChunkAddedSubscription = {
  __typename?: 'Subscription';
  conversationStreamChunkAdded: {
    __typename?: 'ConversationStreamChunkObject';
    conversationId: string;
    delta: string;
    done: boolean;
    error?: string | null;
    id: string;
    kind: string;
    messageId: string;
    metadataJson?: string | null;
    sortOrder: number;
  };
};

export type StartTranscriptionStreamMutationVariables = Exact<{
  [key: string]: never;
}>;

export type StartTranscriptionStreamMutation = {
  __typename?: 'Mutation';
  startTranscriptionStream: {
    __typename?: 'StartTranscriptionStreamResult';
    errorMessage?: string | null;
    sessionId?: string | null;
  };
};

export type SendTranscriptionAudioChunkMutationVariables = Exact<{
  audioBase64: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
  sortOrder: Scalars['Int']['input'];
}>;

export type SendTranscriptionAudioChunkMutation = {
  __typename?: 'Mutation';
  sendTranscriptionAudioChunk: boolean;
};

export type StopTranscriptionStreamMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;

export type StopTranscriptionStreamMutation = {
  __typename?: 'Mutation';
  stopTranscriptionStream: boolean;
};

export type TranscriptionStreamChunkAddedSubscriptionVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;

export type TranscriptionStreamChunkAddedSubscription = {
  __typename?: 'Subscription';
  transcriptionStreamChunkAdded: {
    __typename?: 'TranscriptionStreamChunkObject';
    done: boolean;
    error?: string | null;
    sessionId: string;
    sortOrder: number;
    transcript: string;
  };
};

export type SearchAgentAssetsQueryVariables = Exact<{
  input: AgentAssetSearchInput;
}>;

export type SearchAgentAssetsQuery = {
  __typename?: 'Query';
  searchAgentAssets: {
    __typename?: 'AgentAssetSearchResult';
    chunks: Array<{
      __typename?: 'AgentAssetChunk';
      content: string;
      customPromptId: string;
      description?: string | null;
      filePath?: string | null;
      id: string;
      labels: Array<string>;
      projectId?: string | null;
      promptType: CustomPromptType;
      similarity: number;
      title: string;
    }>;
  };
};

export type MintSubscriptionTokenMutationVariables = Exact<{
  [key: string]: never;
}>;

export type MintSubscriptionTokenMutation = {
  __typename?: 'Mutation';
  mintSubscriptionToken: string;
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
  owner: Scalars['String']['input'];
  repo: Scalars['String']['input'];
}>;

export type GetDashboardGithubStatsQuery = {
  __typename?: 'Query';
  openPrCountByAuthor: Array<{
    __typename?: 'OpenPrCountByAuthorObject';
    author: string;
    openCount: number;
  }>;
  closedPrCountByAuthor: Array<{
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

export type CodeIndexStatusQueryVariables = Exact<{
  repositoryId: Scalars['ID']['input'];
}>;

export type CodeIndexStatusQuery = {
  __typename?: 'Query';
  codeIndexStatus: {
    __typename?: 'CodeIndexStatusObject';
    indexedChunks: number;
    repositoryId: string;
    status: string;
  };
};

export type CodeSemanticSearchQueryVariables = Exact<{
  input: CodeSemanticSearchInput;
}>;

export type CodeSemanticSearchQuery = {
  __typename?: 'Query';
  codeSemanticSearch: {
    __typename?: 'CodeSemanticSearchResult';
    available: boolean;
    matches: Array<{
      __typename?: 'CodeSearchMatch';
      content: string;
      endLine: number;
      path: string;
      score: number;
      startLine: number;
    }>;
  };
};

export type IndexCodeRepositoryMutationVariables = Exact<{
  repositoryId: Scalars['ID']['input'];
}>;

export type IndexCodeRepositoryMutation = {
  __typename?: 'Mutation';
  indexCodeRepository: {
    __typename?: 'IndexCodeRepositoryResult';
    repositoryId: string;
    status: string;
  };
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
  sortOrder: number;
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
  jobRunHooksJson: string;
  runConfigJson: string;
  project?: string | null;
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
    jobRunHooksJson: string;
    runConfigJson: string;
    project?: string | null;
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
    sortOrder: number;
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
    executionBackend: string;
    jobId: string;
    planId: string;
    queuePosition: number;
    queueTotal: number;
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
    sortOrder: number;
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

export type PlanDetailUpdatePlanJobRunHooksMutationVariables = Exact<{
  input: UpdatePlanInput;
}>;

export type PlanDetailUpdatePlanJobRunHooksMutation = {
  __typename?: 'Mutation';
  updatePlan?: {
    __typename?: 'PlanObject';
    id: string;
    jobRunHooksJson: string;
    updatedAt: any;
  } | null;
};

export type PlanDetailUpdatePlanRunConfigMutationVariables = Exact<{
  input: UpdatePlanInput;
}>;

export type PlanDetailUpdatePlanRunConfigMutation = {
  __typename?: 'Mutation';
  updatePlan?: {
    __typename?: 'PlanObject';
    id: string;
    runConfigJson: string;
    updatedAt: any;
  } | null;
};

export type PlanDetailIndexLoaderQueryVariables = Exact<{
  planId: Scalars['ID']['input'];
}>;

export type PlanDetailIndexLoaderQuery = {
  __typename?: 'Query';
  plan?: {
    __typename?: 'PlanObject';
    assignee?: string | null;
    author: string;
    category: string;
    createdAt: any;
    description?: string | null;
    id: string;
    jobRunHooksJson: string;
    runConfigJson: string;
    project?: string | null;
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
  tasksByPlanId: Array<{
    __typename?: 'TaskObject';
    assignee?: string | null;
    category?: string | null;
    createdAt: any;
    description?: string | null;
    id: string;
    planId: string;
    requirementsJson: string;
    sortOrder: number;
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
  planOutputStreamChunks: Array<{
    __typename?: 'PlanOutputStreamChunkObject';
    id: string;
    content: string;
    createdAt: any;
    iteration?: number | null;
    planId: string;
  }>;
  metrics: {
    __typename?: 'MetricsObject';
    recentPlanRunsMetrics: Array<{
      __typename?: 'PlanRunMetricsEntry';
      executionBackend?: string | null;
      finishedOn?: number | null;
      jobId: string;
      taskRunMetrics?: {
        __typename?: 'TaskRunMetrics';
        atEnd: { __typename?: 'ProcessMetricsSnapshot'; rssMb: number };
      } | null;
    }>;
  };
  planRunsByPlanId: Array<{
    __typename?: 'PlanRunObject';
    bullmqJobId: string;
    createdAt: any;
    executionBackend: string;
    id: string;
    runConfigSnapshotJson?: string | null;
    runKind: string;
    status: string;
  }>;
};

export type PlanOutputChunkAddedSubscriptionVariables = Exact<{
  planId: Scalars['ID']['input'];
}>;

export type PlanOutputChunkAddedSubscription = {
  __typename?: 'Subscription';
  planOutputChunkAdded: {
    __typename?: 'PlanOutputStreamChunkObject';
    id: string;
    content: string;
    createdAt: any;
    iteration?: number | null;
    planId: string;
  };
};

export type PlanLifecycleNotificationsSubscriptionVariables = Exact<{
  planId: Scalars['ID']['input'];
}>;

export type PlanLifecycleNotificationsSubscription = {
  __typename?: 'Subscription';
  planNotifications:
    | { __typename?: 'DebugNotification'; event: string }
    | { __typename?: 'PlanEnqueuedNotification'; event: string }
    | {
        __typename?: 'PlanStatusChangedNotification';
        planId: string;
        status: string;
        event: string;
      }
    | { __typename?: 'PlanUpdatedNotification'; event: string }
    | { __typename?: 'PlanWaitingForWorktreeNotification'; event: string }
    | { __typename?: 'QueueJobCompletedNotification'; event: string }
    | { __typename?: 'SystemAlertNotification'; event: string }
    | { __typename?: 'TaskCompletedNotification'; event: string }
    | {
        __typename?: 'TaskStatusChangedNotification';
        planId: string;
        status: string;
        taskId?: string | null;
        event: string;
      };
};

export type UpdatePlanMutationVariables = Exact<{
  input: UpdatePlanInput;
}>;

export type UpdatePlanMutation = {
  __typename?: 'Mutation';
  updatePlan?: {
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
    sortOrder: number;
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

export type GetTaskForEditByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetTaskForEditByIdQuery = {
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
  hasCustomRunConfig: boolean;
  id: string;
  project?: string | null;
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
  allPlansCount: {
    __typename?: 'ListPlansByStatusResultObject';
    totalCount: number;
  };
  queuedPlansCount: {
    __typename?: 'ListPlansByStatusResultObject';
    totalCount: number;
  };
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
      hasCustomRunConfig: boolean;
      id: string;
      project?: string | null;
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

export type TestWorkflowMutationVariables = Exact<{
  input: EnqueuePlanRunInput;
}>;

export type TestWorkflowMutation = {
  __typename?: 'Mutation';
  enqueuePlanRun: {
    __typename?: 'EnqueuePlanRunResultObject';
    executionBackend: string;
    jobId: string;
    planId: string;
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

export type GetPullRequestDetailQueryVariables = Exact<{
  input: GetPullInput;
}>;

export type GetPullRequestDetailQuery = {
  __typename?: 'Query';
  pull?: {
    __typename?: 'PullListItemObject';
    author: string;
    baseRef?: string | null;
    createdAt: string;
    headRef?: string | null;
    headSha?: string | null;
    htmlUrl: string;
    mergedAt?: string | null;
    number: number;
    state: string;
    title: string;
    updatedAt: string;
  } | null;
};

export type PullRequestCardFragment = {
  __typename?: 'PullListItemObject';
  author: string;
  baseRef?: string | null;
  createdAt: string;
  headRef?: string | null;
  headSha?: string | null;
  htmlUrl: string;
  mergedAt?: string | null;
  number: number;
  state: string;
  title: string;
  updatedAt: string;
};

export type GetPullRequestsQueryVariables = Exact<{
  input: ListPullsInput;
}>;

export type GetPullRequestsQuery = {
  __typename?: 'Query';
  pulls: Array<{
    __typename?: 'PullListItemObject';
    author: string;
    baseRef?: string | null;
    createdAt: string;
    headRef?: string | null;
    headSha?: string | null;
    htmlUrl: string;
    mergedAt?: string | null;
    number: number;
    state: string;
    title: string;
    updatedAt: string;
  }>;
};

export type JobDetailsCardFragment = {
  __typename?: 'JobObject';
  data?: string | null;
  executionBackend?: string | null;
  failedReason?: string | null;
  finishedOn?: number | null;
  id: string;
  name?: string | null;
  processedOn?: number | null;
  progress?: number | null;
  returnvalue?: string | null;
  state: string;
  timestamp?: number | null;
  taskRunMetrics?: {
    __typename?: 'TaskRunMetrics';
    atEnd: {
      __typename?: 'ProcessMetricsSnapshot';
      heapUsedMb: number;
      rssMb: number;
    };
    atStart: {
      __typename?: 'ProcessMetricsSnapshot';
      heapUsedMb: number;
      rssMb: number;
    };
  } | null;
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
    executionBackend?: string | null;
    failedReason?: string | null;
    finishedOn?: number | null;
    id: string;
    name?: string | null;
    processedOn?: number | null;
    progress?: number | null;
    returnvalue?: string | null;
    state: string;
    timestamp?: number | null;
    taskRunMetrics?: {
      __typename?: 'TaskRunMetrics';
      atEnd: {
        __typename?: 'ProcessMetricsSnapshot';
        heapUsedMb: number;
        rssMb: number;
      };
      atStart: {
        __typename?: 'ProcessMetricsSnapshot';
        heapUsedMb: number;
        rssMb: number;
      };
    } | null;
  } | null;
};

export type QueueJobDetailRetryMutationVariables = Exact<{
  input: RetryJobInput;
}>;

export type QueueJobDetailRetryMutation = {
  __typename?: 'Mutation';
  retryJob: {
    __typename?: 'RetryJobResultObject';
    error?: string | null;
    jobId?: string | null;
    success: boolean;
  };
};

export type QueueJobDetailCancelPlanRunMutationVariables = Exact<{
  input: CancelPlanRunInput;
}>;

export type QueueJobDetailCancelPlanRunMutation = {
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

export type QueueJobDetailsFragment = {
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

export type QueueDetailsFragment = {
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

export type ServiceAccountCredentialFieldsFragment = {
  __typename?: 'ServiceAccountCredentialObject';
  createdAt: any;
  expiresAt?: any | null;
  id: string;
  label?: string | null;
  lastUsedAt?: any | null;
  prefix: string;
  revokedAt?: any | null;
  serviceAccountId: string;
};

export type ServiceAccountListItemFragment = {
  __typename?: 'ServiceAccountObject';
  createdAt: any;
  description?: string | null;
  disabledAt?: any | null;
  id: string;
  name: string;
};

export type GetSettingsKeysQueryVariables = Exact<{
  serviceAccountId: Scalars['ID']['input'];
}>;

export type GetSettingsKeysQuery = {
  __typename?: 'Query';
  serviceAccounts: Array<{
    __typename?: 'ServiceAccountObject';
    createdAt: any;
    description?: string | null;
    disabledAt?: any | null;
    id: string;
    name: string;
  }>;
  serviceAccountCredentials: Array<{
    __typename?: 'ServiceAccountCredentialObject';
    createdAt: any;
    expiresAt?: any | null;
    id: string;
    label?: string | null;
    lastUsedAt?: any | null;
    prefix: string;
    revokedAt?: any | null;
    serviceAccountId: string;
  }>;
};

export type CreateServiceAccountCredentialMutationVariables = Exact<{
  input: CreateServiceAccountCredentialInput;
}>;

export type CreateServiceAccountCredentialMutation = {
  __typename?: 'Mutation';
  createServiceAccountCredential?: {
    __typename?: 'CreateServiceAccountCredentialResultObject';
    token: string;
    credential: {
      __typename?: 'ServiceAccountCredentialObject';
      createdAt: any;
      expiresAt?: any | null;
      id: string;
      label?: string | null;
      lastUsedAt?: any | null;
      prefix: string;
      revokedAt?: any | null;
      serviceAccountId: string;
    };
  } | null;
};

export type RevokeServiceAccountCredentialMutationVariables = Exact<{
  credentialId: Scalars['ID']['input'];
}>;

export type RevokeServiceAccountCredentialMutation = {
  __typename?: 'Mutation';
  revokeServiceAccountCredential: boolean;
};

export type WorkspaceLocalRepositoryFieldsFragment = {
  __typename?: 'WorkspaceLocalRepositoryObject';
  createdAt: any;
  displayName: string;
  filesystemPath: string;
  gitDefaultBranch?: string | null;
  gitRemoteUrl?: string | null;
  id: string;
  projectId?: string | null;
  updatedAt: any;
  userId: string;
  project?: { __typename?: 'ProjectObject'; id: string; name: string } | null;
};

export type UserWorkspaceProfileFieldsFragment = {
  __typename?: 'UserWorkspaceProfileObject';
  contactDisplayName?: string | null;
  contactEmail?: string | null;
  createdAt: any;
  enabledEditors: Array<WorkspaceEditorId>;
  updatedAt: any;
  userId: string;
};

export type GetWorkspaceSettingsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetWorkspaceSettingsQuery = {
  __typename?: 'Query';
  workspaceSettings: {
    __typename?: 'WorkspaceSettingsObject';
    localRepositories: Array<{
      __typename?: 'WorkspaceLocalRepositoryObject';
      createdAt: any;
      displayName: string;
      filesystemPath: string;
      gitDefaultBranch?: string | null;
      gitRemoteUrl?: string | null;
      id: string;
      projectId?: string | null;
      updatedAt: any;
      userId: string;
      project?: {
        __typename?: 'ProjectObject';
        id: string;
        name: string;
      } | null;
    }>;
    profile: {
      __typename?: 'UserWorkspaceProfileObject';
      contactDisplayName?: string | null;
      contactEmail?: string | null;
      createdAt: any;
      enabledEditors: Array<WorkspaceEditorId>;
      updatedAt: any;
      userId: string;
    };
  };
  projects: Array<{ __typename?: 'ProjectObject'; id: string; name: string }>;
};

export type UpdateWorkspaceProfileMutationVariables = Exact<{
  input: UpdateWorkspaceProfileInput;
}>;

export type UpdateWorkspaceProfileMutation = {
  __typename?: 'Mutation';
  updateWorkspaceProfile: {
    __typename?: 'UserWorkspaceProfileObject';
    contactDisplayName?: string | null;
    contactEmail?: string | null;
    createdAt: any;
    enabledEditors: Array<WorkspaceEditorId>;
    updatedAt: any;
    userId: string;
  };
};

export type CreateWorkspaceLocalRepositoryMutationVariables = Exact<{
  input: CreateWorkspaceLocalRepositoryInput;
}>;

export type CreateWorkspaceLocalRepositoryMutation = {
  __typename?: 'Mutation';
  createWorkspaceLocalRepository: {
    __typename?: 'WorkspaceLocalRepositoryObject';
    createdAt: any;
    displayName: string;
    filesystemPath: string;
    gitDefaultBranch?: string | null;
    gitRemoteUrl?: string | null;
    id: string;
    projectId?: string | null;
    updatedAt: any;
    userId: string;
    project?: { __typename?: 'ProjectObject'; id: string; name: string } | null;
  };
};

export type UpdateWorkspaceLocalRepositoryMutationVariables = Exact<{
  input: UpdateWorkspaceLocalRepositoryInput;
}>;

export type UpdateWorkspaceLocalRepositoryMutation = {
  __typename?: 'Mutation';
  updateWorkspaceLocalRepository: {
    __typename?: 'WorkspaceLocalRepositoryObject';
    createdAt: any;
    displayName: string;
    filesystemPath: string;
    gitDefaultBranch?: string | null;
    gitRemoteUrl?: string | null;
    id: string;
    projectId?: string | null;
    updatedAt: any;
    userId: string;
    project?: { __typename?: 'ProjectObject'; id: string; name: string } | null;
  };
};

export type SetWorkspaceLocalRepositoryProjectMutationVariables = Exact<{
  input: SetWorkspaceLocalRepositoryProjectInput;
}>;

export type SetWorkspaceLocalRepositoryProjectMutation = {
  __typename?: 'Mutation';
  setWorkspaceLocalRepositoryProject: {
    __typename?: 'WorkspaceLocalRepositoryObject';
    createdAt: any;
    displayName: string;
    filesystemPath: string;
    gitDefaultBranch?: string | null;
    gitRemoteUrl?: string | null;
    id: string;
    projectId?: string | null;
    updatedAt: any;
    userId: string;
    project?: { __typename?: 'ProjectObject'; id: string; name: string } | null;
  };
};

export type DeleteWorkspaceLocalRepositoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteWorkspaceLocalRepositoryMutation = {
  __typename?: 'Mutation';
  deleteWorkspaceLocalRepository: boolean;
};

export type ApplyWorkspaceEditorConfigurationMutationVariables = Exact<{
  input?: InputMaybe<ApplyWorkspaceEditorConfigurationInput>;
}>;

export type ApplyWorkspaceEditorConfigurationMutation = {
  __typename?: 'Mutation';
  applyWorkspaceEditorConfiguration: {
    __typename?: 'ApplyWorkspaceEditorConfigurationResultObject';
    applications: Array<{
      __typename?: 'WorkspaceEditorConfigApplicationObject';
      editor: WorkspaceEditorId;
      filesWritten: Array<string>;
      filesystemPath: string;
      repositoryId: string;
      warnings: Array<string>;
    }>;
  };
};

export type ProjectSkillsQueryVariables = Exact<{
  projectId?: InputMaybe<Scalars['ID']['input']>;
}>;

export type ProjectSkillsQuery = {
  __typename?: 'Query';
  projectSkills: {
    __typename?: 'ProjectSkillsResult';
    totalCount: number;
    skills: Array<{
      __typename?: 'ProjectSkillObject';
      slug: string;
      staticDisableModelInvocation?: boolean | null;
      tags: Array<string>;
    }>;
  };
};

export type UsageDailyStatsRowFragment = {
  __typename?: 'DailyStatsObject';
  date: string;
  plansCompleted: number;
  plansCreated: number;
  plansUpdated: number;
  tasksCompleted: number;
  tasksCreated: number;
  tasksUpdated: number;
};

export type GetUsageDailyStatsQueryVariables = Exact<{
  start: Scalars['String']['input'];
  end: Scalars['String']['input'];
}>;

export type GetUsageDailyStatsQuery = {
  __typename?: 'Query';
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
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
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
                        name: { kind: 'Name', value: 'backend' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'label' } },
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
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
export const PlanDetailIndexLoaderDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlanDetailIndexLoader' },
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
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'iteration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
              ],
            },
          },
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
                      name: { kind: 'Name', value: 'planId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'planId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'limit' },
                      value: { kind: 'IntValue', value: '10' },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'bullmqJobId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'executionBackend' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'runConfigSnapshotJson' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'runKind' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'jobRunHooksJson' } },
          { kind: 'Field', name: { kind: 'Name', value: 'runConfigJson' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
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
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  PlanDetailIndexLoaderQuery,
  PlanDetailIndexLoaderQueryVariables
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
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'content' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'iteration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planId' } },
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
                { kind: 'Field', name: { kind: 'Name', value: 'assignee' } },
                { kind: 'Field', name: { kind: 'Name', value: 'author' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'summary' } },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetTaskByIdQuery, GetTaskByIdQueryVariables>;
export const GetTaskForEditByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'getTaskForEditById' },
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
} as unknown as DocumentNode<
  GetTaskForEditByIdQuery,
  GetTaskForEditByIdQueryVariables
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
            alias: { kind: 'Name', value: 'queuedPlansCount' },
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
                      value: {
                        kind: 'ListValue',
                        values: [
                          {
                            kind: 'StringValue',
                            value: 'QUEUED',
                            block: false,
                          },
                        ],
                      },
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
  QueueJobDetailCancelPlanRunMutation,
  QueueJobDetailCancelPlanRunMutationVariables
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
export const CreateWorkspaceLocalRepositoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'createWorkspaceLocalRepository' },
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
                value: 'CreateWorkspaceLocalRepositoryInput',
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
            name: { kind: 'Name', value: 'createWorkspaceLocalRepository' },
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
                  name: {
                    kind: 'Name',
                    value: 'WorkspaceLocalRepositoryFields',
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
  ],
} as unknown as DocumentNode<
  CreateWorkspaceLocalRepositoryMutation,
  CreateWorkspaceLocalRepositoryMutationVariables
>;
export const UpdateWorkspaceLocalRepositoryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'updateWorkspaceLocalRepository' },
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
                value: 'UpdateWorkspaceLocalRepositoryInput',
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
            name: { kind: 'Name', value: 'updateWorkspaceLocalRepository' },
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
                  name: {
                    kind: 'Name',
                    value: 'WorkspaceLocalRepositoryFields',
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
  ],
} as unknown as DocumentNode<
  UpdateWorkspaceLocalRepositoryMutation,
  UpdateWorkspaceLocalRepositoryMutationVariables
>;
export const SetWorkspaceLocalRepositoryProjectDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'setWorkspaceLocalRepositoryProject' },
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
                value: 'SetWorkspaceLocalRepositoryProjectInput',
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
            name: { kind: 'Name', value: 'setWorkspaceLocalRepositoryProject' },
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
                  name: {
                    kind: 'Name',
                    value: 'WorkspaceLocalRepositoryFields',
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
  ],
} as unknown as DocumentNode<
  SetWorkspaceLocalRepositoryProjectMutation,
  SetWorkspaceLocalRepositoryProjectMutationVariables
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
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'skills' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
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
