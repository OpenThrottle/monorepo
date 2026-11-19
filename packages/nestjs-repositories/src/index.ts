export { AGENT_TRAJECTORY_SOURCE } from './modules/agent-trajectories/agent-trajectories.constants.ts';
export { AgentTrajectoriesModule } from './modules/agent-trajectories/agent-trajectories.module.ts';
export { AgentTrajectoriesService } from './modules/agent-trajectories/agent-trajectories.service.ts';
export type {
  AgentTrajectorySource,
  CreateAgentTrajectoryInput,
  ReplaceAgentTrajectoryInput,
} from './modules/agent-trajectories/agent-trajectories.types.ts';
export { AgentTrajectory } from './modules/agent-trajectories/agent-trajectory.entity.ts';
export { EvalCase } from './modules/eval-datasets/eval-case.entity.ts';
export { EvalDataset } from './modules/eval-datasets/eval-dataset.entity.ts';
export {
  EVAL_DATASET_TARGET,
  EVAL_SPLIT,
} from './modules/eval-datasets/eval-datasets.constants.ts';
export { EvalDatasetsModule } from './modules/eval-datasets/eval-datasets.module.ts';
export { EvalDatasetsService } from './modules/eval-datasets/eval-datasets.service.ts';
export type {
  CreateEvalCaseInput,
  CreateEvalDatasetInput,
  EvalDatasetTarget,
  EvalSplit,
} from './modules/eval-datasets/eval-datasets.types.ts';
export { EvalHumanLabel } from './modules/eval-human-labels/eval-human-label.entity.ts';
export { EVAL_LABEL_VERDICT } from './modules/eval-human-labels/eval-human-labels.constants.ts';
export { EvalHumanLabelsModule } from './modules/eval-human-labels/eval-human-labels.module.ts';
export { EvalHumanLabelsService } from './modules/eval-human-labels/eval-human-labels.service.ts';
export type {
  EvalLabelVerdict,
  RemoveEvalHumanLabelInput,
  UpsertEvalHumanLabelInput,
} from './modules/eval-human-labels/eval-human-labels.types.ts';
export { EvalJudgeCalibration } from './modules/eval-judge-calibrations/eval-judge-calibration.entity.ts';
export { EVAL_CALIBRATION_STATUS } from './modules/eval-judge-calibrations/eval-judge-calibrations.constants.ts';
export { EvalJudgeCalibrationsModule } from './modules/eval-judge-calibrations/eval-judge-calibrations.module.ts';
export { EvalJudgeCalibrationsService } from './modules/eval-judge-calibrations/eval-judge-calibrations.service.ts';
export type {
  CreateEvalJudgeCalibrationInput,
  EvalCalibrationStatus,
  EvalJudgeIdentity,
  EvalJudgePair,
  EvalJudgePairs,
  FindEvalJudgePairsInput,
} from './modules/eval-judge-calibrations/eval-judge-calibrations.types.ts';
export { EvalGrade } from './modules/eval-runs/eval-grade.entity.ts';
export { EvalRun } from './modules/eval-runs/eval-run.entity.ts';
export {
  EVAL_AUTH_MODE,
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
  EVAL_RUN_STATUS,
  EVAL_TRIAL_STATUS,
} from './modules/eval-runs/eval-runs.constants.ts';
export { EvalRunsModule } from './modules/eval-runs/eval-runs.module.ts';
export { EvalRunsService } from './modules/eval-runs/eval-runs.service.ts';
export type {
  CreateEvalRunInput,
  EvalAuthMode,
  EvalGraderKind,
  EvalGradeVerdict,
  EvalJsonValue,
  EvalRunStatus,
  EvalTrialStatus,
  UpdateEvalRunStatusInput,
  UpsertEvalGradeInput,
  UpsertEvalTrialInput,
} from './modules/eval-runs/eval-runs.types.ts';
export { EvalTrial } from './modules/eval-runs/eval-trial.entity.ts';
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
