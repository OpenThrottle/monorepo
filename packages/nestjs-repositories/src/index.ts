export { NestjsRepositoriesModule } from './nestjs-repositories.module.ts';
export { getTypeOrmOptions as getOpenThrottleTypeOrmOptions } from './nestjs-repositories.utils.ts';
export {
  type CollectionByColumnLoaderOptions,
  type GroupedCountColumnInFilter,
  type GroupedCountLoaderOptions,
  type RepositoryAccessor,
} from '@openthrottle/nestjs-postgres';
export {
  createCollectionByColumnLoader,
  createEntityByIdLoader,
  createGroupedCountLoader,
} from '@openthrottle/nestjs-postgres';
export {
  escapeLikePattern,
  toLikeContainsPattern,
} from '@openthrottle/nestjs-postgres';
export {
  LIST_PAGINATION_DEFAULT_LIMIT,
  LIST_PAGINATION_MAX_LIMIT,
} from '@openthrottle/nestjs-postgres';
export {
  type ListPaginationInput,
  type ResolvedListPagination,
} from '@openthrottle/nestjs-postgres';
export { resolveListPagination } from '@openthrottle/nestjs-postgres';
export { vectorTransformer } from '@openthrottle/nestjs-postgres';
// Moved to nestjs-repositories-server (OT plan f89ee499): re-exported under the same names so
// consumers compile unchanged until they inject the repositories directly.
export type {
  CreateTaskBatchItem,
  GroupedHooks,
  PlanData,
  PlanEmbeddingSearchRow,
  PlanMessageKind,
  PlanMessageStatus,
  PlanOutputStreamKind,
  PlanRunData,
  PlanRunExecutionBackend,
  PlanRunKind,
  PlanRunStatus,
  ProjectData,
  ScheduledPlanRun,
  ScheduledRunRef,
  TaskData,
  TaskEmbeddingSearchRow,
  TaskHookRole,
  TaskHookScope,
  TaskHookSource,
} from '@openthrottle/nestjs-repositories-server';
// Repositories, scheduled agent jobs, user preferences and workspace settings moved to
// nestjs-repositories-server (OT plan a097bdcd):
// re-exported under their entity/type names for non-server consumers. The old services are gone;
// inject the repositories from the new package.
export type {
  ClaimScheduledAgentJobSlotInput,
  CreateScheduledAgentJobInput,
  CreateScheduledAgentJobRunInput,
  FinishScheduledAgentJobRunInput,
  MergeDetectedRemoteResult,
  RecordMissedScheduledAgentJobRunsInput,
  RepositoryCheckoutData,
  RepositoryCheckoutKind,
  RepositoryData,
  ScheduledAgentJobData,
  ScheduledAgentJobDriverId,
  ScheduledAgentJobEndpointSettings,
  ScheduledAgentJobMisfirePolicy,
  ScheduledAgentJobRunData,
  ScheduledAgentJobRunSettingsSnapshot,
  ScheduledAgentJobRunStatus,
  ScheduledAgentJobRunStatusCount,
  ScheduledAgentJobRunTrigger,
  ScheduledAgentJobScheduleKind,
  ScheduledAgentJobSettings,
  ScheduledAgentJobWorktreeSettings,
  StartScheduledAgentJobRunInput,
  UpdateScheduledAgentJobInput,
  UpdateUserPreferencesPatch,
  UpdateUserPreferencesResult,
  UpdateUserWorkspaceProfileData,
  UserPreferencesAgent,
  UserPreferencesAgentInput,
  UserPreferencesData,
  UserPreferencesError,
  UserPreferencesErrorReason,
  UserWorkspaceSettingsData,
  WorkspaceEditorId,
} from '@openthrottle/nestjs-repositories-server';
export {
  isWorkspaceEditorId,
  normalizeRemoteUrl,
  RepositoriesModule,
  RepositoriesRepository,
  Repository,
  REPOSITORY_CHECKOUT_KINDS,
  RepositoryCheckout,
  RepositoryCheckoutsModule,
  RepositoryCheckoutsRepository,
  SCHEDULED_AGENT_JOB_MISFIRE_POLICIES,
  SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES,
  SCHEDULED_AGENT_JOB_SCHEDULE_KINDS,
  ScheduledAgentJob,
  ScheduledAgentJobRun,
  ScheduledAgentJobRunsModule,
  ScheduledAgentJobRunsRepository,
  ScheduledAgentJobsModule,
  ScheduledAgentJobsRepository,
  schedulerKeyForJob,
  USER_PREFERENCES_ERROR_REASONS,
  UserPreferences,
  UserPreferencesModule,
  UserPreferencesRepository,
  UserWorkspaceSettings,
  UserWorkspaceSettingsModule,
  UserWorkspaceSettingsRepository,
  WORKSPACE_EDITOR_IDS,
  WORKSPACE_EDITORS,
} from '@openthrottle/nestjs-repositories-server';
// Identity tables moved to nestjs-repositories-server (OT plan 8a341c01): re-exported under the
// same names for non-server consumers. Deprecated for batch 14, when the DataSource moves too.
export type {
  CreateServiceAccountCredentialResult,
  PermissionCreateInput,
  PermissionData,
  RoleCreateInput,
  RoleData,
  ServiceAccountCreateInput,
  ServiceAccountCredentialCreateInput,
  ServiceAccountCredentialData,
  ServiceAccountData,
  UpsertServiceAccountCredentialResult,
  UserCreateInput,
  UserData,
  VerifiedServiceAccountCredential,
} from '@openthrottle/nestjs-repositories-server';
export type {
  CaptureHealthRow,
  CaptureHealthStream,
} from '@openthrottle/nestjs-repositories-server';
export {
  formatServiceAccountToken,
  hashPassword,
  hashSecret,
  normalizeServiceAccountBearerToken,
  parseServiceAccountToken,
  Permission,
  PermissionsRepository,
  Role,
  RolesModule,
  RolesRepository,
  SERVICE_ACCOUNT_BEARER_PREFIX,
  ServiceAccount,
  ServiceAccountCredential,
  ServiceAccountCredentialsRepository,
  ServiceAccountsModule,
  ServiceAccountsRepository,
  User,
  UsersRepository,
  validatePassword,
  validateSecret,
} from '@openthrottle/nestjs-repositories-server';
export {
  CROSS_PLAN_TASK_LIST_ORDER,
  isPlanOutputStreamKind,
  Plan,
  PLAN_MESSAGE_DELIVERABLE_KINDS,
  PLAN_MESSAGE_KIND,
  PLAN_MESSAGE_STATUS,
  PLAN_OUTPUT_STREAM_KIND,
  PLAN_OUTPUT_STREAM_KINDS,
  PLAN_TASK_LIST_ORDER,
  PlanEmbedding,
  PlanMessage,
  PlanOutputStreamChunk,
  PlanRun,
  Project,
  Task,
  TASK_SORT_ORDER_GAP,
  TaskEmbedding,
} from '@openthrottle/nestjs-repositories-server';
export { CAPTURE_HEALTH_STREAMS } from '@openthrottle/nestjs-repositories-server';
export {
  HEARTBEAT_INTERVAL_MS,
  PLAN_RUN_SETTLED_REASON,
  PLAN_RUN_STARTABLE_STATUSES,
  PLAN_RUN_STATUS,
  STALE_CUTOFF_MS,
  UNSUPERVISED_STALE_CUTOFF_MS,
} from '@openthrottle/nestjs-repositories-server';
export { type ResolveCompletedAtForStatusChangeInput } from '@openthrottle/nestjs-repositories-server';
export { resolveCompletedAtForStatusChange } from '@openthrottle/nestjs-repositories-server';
export {
  PLAN_STATUS,
  PLAN_STATUS_LIST,
  PLAN_STATUS_VALUES,
  REMAINING_TASK_STATUSES,
  TASK_STATUS,
  TASK_STATUS_LIST,
  TASK_STATUS_VALUES,
} from '@openthrottle/nestjs-repositories-server';
export {
  type PlanStatus,
  type RemainingTaskStatus,
  type TaskStatus,
} from '@openthrottle/nestjs-repositories-server';
export {
  isPlanStatus,
  isTaskStatus,
} from '@openthrottle/nestjs-repositories-server';
export type {
  BuildPlanRunConfigSnapshotInput,
  PlanJobRunHooksStorage,
  PlanRunConfigDebugCli,
  PlanRunConfigExecutionBackend,
  PlanRunConfigOtLoop,
  PlanRunConfigPromptLayer,
  PlanRunConfigRalphV1,
  PlanRunConfigRunner,
  PlanRunConfigSnapshot,
  PlanRunConfigSnapshotRalphV1,
  PlanRunConfigSnapshotV1,
  PlanRunConfigStorage,
  PlanRunConfigStorageV1,
  PlanRunConfigTargetMode,
  PlanRunConfigWorktreeCleanup,
  PlanRunConfigWorktreeCli,
  PlanWorkflowRalphRunOptions,
  PlanWorkflowUiState,
} from '@openthrottle/openthrottle-plan-config';
export {
  buildPlanRunConfigSnapshot,
  buildPlanRunWorktreeName,
  buildRalphPlanRunTuningFromPlanRunConfig,
  DEFAULT_PLAN_RUN_RALPH_DEBUG_CLI,
  DEFAULT_PLAN_RUN_RALPH_ITERATIONS,
  DEFAULT_PLAN_RUN_RALPH_MODEL,
  DEFAULT_PLAN_RUN_RALPH_PROMPT,
  DEFAULT_PLAN_RUN_RALPH_RUNNER,
  DEFAULT_PLAN_RUN_RALPH_WORKTREE_CLEANUP,
  DEFAULT_PLAN_RUN_RALPH_WORKTREE_CLI,
  getDefaultPlanRunConfigRalphV1,
  getDefaultPlanRunConfigStorage,
  getDefaultPlanWorkflowUiState,
  parsePlanRunConfigJson,
  parsePlanRunConfigSnapshot,
  parsePlanRunConfigStorage,
  parsePlanRunIterationTimeoutSeconds,
  PLAN_RUN_CONFIG_SNAPSHOT_VERSION,
  PLAN_RUN_CONFIG_VERSION,
  planHasCustomRunConfig,
  planRunConfigFromPlanStorage,
  planRunConfigFromWorkflowUiState,
  serializePlanRunConfigForGraphql,
  serializePlanRunConfigSnapshotForGraphql,
  workflowUiStateFromPlanRunConfig,
} from '@openthrottle/openthrottle-plan-config';
