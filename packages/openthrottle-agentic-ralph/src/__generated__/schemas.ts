import { z } from 'zod/v3';
import {
  ActivityByDateInput,
  ActivityByDateRangeInput,
  AddHookInput,
  AddPermissionToRoleInput,
  AddPlanTagInput,
  AddProjectSkillTagInput,
  AddProjectTagInput,
  AddSkillTagInput,
  AddTaskTagInput,
  AddWorkspaceFolderInput,
  AgentAssetSearchInput,
  AgentsRunChatTurnInput,
  AppendPlanOutputInput,
  ApplyWorkspaceEditorConfigurationInput,
  ArchiveAgentConversationInput,
  AssignRoleToServiceAccountInput,
  AssignRoleToUserInput,
  AttachWorkSessionSubjectInput,
  CancelPlanRunInput,
  CleanQueueInput,
  CloneRepositoryInput,
  CodeSemanticSearchInput,
  CommitsPerPrInput,
  ConnectMcpConnectorInput,
  CreateAgentConversationInput,
  CreateCustomPromptInput,
  CreateNoteInput,
  CreatePlanInput,
  CreatePlansInput,
  CreateProjectInput,
  CreateQueueInput,
  CreateRoleInput,
  CreateRolloutFlagInput,
  CreateScheduledAgentJobInputType,
  CreateServiceAccountCredentialInput,
  CreateServiceAccountInput,
  CreateTaskInput,
  CreateTasksInput,
  CreateTasksItemInput,
  CreateUserInput,
  CreateWorkspaceLocalRepositoryInput,
  CustomPromptType,
  DeleteAgentConversationInput,
  DeletePlanInput,
  DeletePlanOutputInput,
  DeleteProjectInput,
  DeleteTagActionRuleInput,
  DeleteTaskInput,
  DetachHookInput,
  DuplicateJobInput,
  EndWorkSessionInput,
  EnqueueDocIngestionInput,
  EnqueuePlanRalphOrchestratorInput,
  EnqueuePlanRunInput,
  GetAgentConversationMessagesInput,
  GetGeneratorInput,
  GetPlanEmbeddingInput,
  GetPlanOutputStreamChunkInput,
  GetPullInput,
  GetTaskEmbeddingInput,
  GitHubRepoInput,
  LastActivityInput,
  LinesAddedDeletedInput,
  ListAgentConversationsInput,
  ListCustomPromptsInput,
  ListPlanOutputStreamChunksInput,
  ListPlansByStatusInput,
  ListPullsInput,
  LoginInput,
  OpenToMergedCycleTimeInput,
  PlanEmbeddingsByPlanInput,
  PlanRalphWorkflowMode,
  PlanRunsByPlanIdInput,
  PlanTaskStatus,
  PrCountByLabelInput,
  PressureLevel,
  PromoteTaskToPlanInput,
  PrsMergedPerPeriodInput,
  QueueControlInput,
  QueueDetailsInput,
  QueueJobLogLevel,
  QueueJobLogsInput,
  RalphNestedDebugCli,
  RalphPlanRunTuningInput,
  RecordPlanRunHeartbeatInput,
  RecordSkillUsageInput,
  RecordSkillUsageOutcomeInput,
  RecordWorkArtifactInput,
  RefreshCheckoutInput,
  RegisterCliPlanRunInput,
  RegisterInput,
  RegisterPlanRunWorktreeCheckoutInput,
  RemainingTasksByPlanIdInput,
  RemovePermissionFromRoleInput,
  RemovePlanTagInput,
  RemoveProjectSkillTagInput,
  RemoveProjectTagInput,
  RemoveRepeatableJobInput,
  RemoveRoleFromServiceAccountInput,
  RemoveRoleFromUserInput,
  RemoveSkillTagInput,
  RemoveTaskTagInput,
  RenameSkillTagInput,
  ReorderPlanTasksInput,
  RepeatableJobsInput,
  RetryJobInput,
  ReviewCycleTimeInput,
  RolloutEvaluationReason,
  RolloutFallthroughBucketInput,
  RolloutFallthroughInput,
  RolloutFlagKind,
  RolloutFlagVariationInput,
  SearchInput,
  SearchPlansInput,
  SetMcpConnectorEnabledInput,
  SetPlanStatusInput,
  SetScheduledAgentJobEnabledInputType,
  SetWorkspaceLocalRepositoryProjectInput,
  SettleCliPlanRunInput,
  SkillAvailabilityRuleInput,
  StartConversationStreamInput,
  StartWorkSessionInput,
  TaskEmbeddingsByTaskInput,
  TasksByPlanIdInput,
  TasksByProjectIdInput,
  UnverifiedWorkArtifactsInput,
  UpdateAgentConversationTitleInput,
  UpdateCustomPromptInput,
  UpdateNoteInput,
  UpdatePlanInput,
  UpdateProjectInput,
  UpdateRepositoryInput,
  UpdateRoleInput,
  UpdateRolloutFlagInput,
  UpdateScheduledAgentJobInputType,
  UpdateServiceAccountInput,
  UpdateTaskInput,
  UpdateUserInput,
  UpdateWorkspaceLocalRepositoryInput,
  UpdateWorkspaceProfileInput,
  UpsertTagActionRuleInput,
  WallClockInterpretation,
  WorkArtifactsByPlanInput,
  WorkArtifactsBySessionInput,
  WorkArtifactsByTaskInput,
  WorkSessionsByPlanInput,
  WorkspaceEditorId,
  WorkspaceFolderReconciliation,
  WorktreeActivity,
  WorktreeRootSource,
} from './graphql.js';

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny =>
  v !== undefined && v !== null;

export const definedNonNullAnySchema = z
  .any()
  .refine((v) => isDefinedNonNullAny(v));

export const CustomPromptTypeSchema = z.nativeEnum(CustomPromptType);

export const PlanRalphWorkflowModeSchema = z.nativeEnum(PlanRalphWorkflowMode);

export const PlanTaskStatusSchema = z.nativeEnum(PlanTaskStatus);

export const PressureLevelSchema = z.nativeEnum(PressureLevel);

export const QueueJobLogLevelSchema = z.nativeEnum(QueueJobLogLevel);

export const RalphNestedDebugCliSchema = z.nativeEnum(RalphNestedDebugCli);

export const RolloutEvaluationReasonSchema = z.nativeEnum(
  RolloutEvaluationReason,
);

export const RolloutFlagKindSchema = z.nativeEnum(RolloutFlagKind);

export const WallClockInterpretationSchema = z.nativeEnum(
  WallClockInterpretation,
);

export const WorkspaceEditorIdSchema = z.nativeEnum(WorkspaceEditorId);

export const WorkspaceFolderReconciliationSchema = z.nativeEnum(
  WorkspaceFolderReconciliation,
);

export const WorktreeActivitySchema = z.nativeEnum(WorktreeActivity);

export const WorktreeRootSourceSchema = z.nativeEnum(WorktreeRootSource);

export function ActivityByDateInputSchema(): z.ZodObject<
  Properties<ActivityByDateInput>
> {
  return z.object({
    date: z.string().nullish(),
    daysBack: z.number().nullish(),
    limit: z.number().nullish(),
    offset: z.number().nullish(),
  });
}

export function ActivityByDateRangeInputSchema(): z.ZodObject<
  Properties<ActivityByDateRangeInput>
> {
  return z.object({
    endIso: z.string().min(1),
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    startIso: z.string().min(1),
  });
}

export function AddHookInputSchema(): z.ZodObject<Properties<AddHookInput>> {
  return z.object({
    anchorTaskId: z.string().nullish(),
    description: z.string().nullish(),
    planId: z.string().min(1),
    role: z.string().min(1),
    scope: z.string().nullish(),
    skillSlug: z.string().nullish(),
    source: z.string().min(1),
    title: z.string().nullish(),
  });
}

export function AddPermissionToRoleInputSchema(): z.ZodObject<
  Properties<AddPermissionToRoleInput>
> {
  return z.object({
    permissionId: z.string().min(1),
    roleId: z.string().min(1),
  });
}

export function AddPlanTagInputSchema(): z.ZodObject<
  Properties<AddPlanTagInput>
> {
  return z.object({
    planId: z.string().min(1),
    tag: z.string().min(1),
  });
}

export function AddProjectSkillTagInputSchema(): z.ZodObject<
  Properties<AddProjectSkillTagInput>
> {
  return z.object({
    projectId: z.string().nullish(),
    slug: z.string().min(1),
    tag: z.string().min(1),
  });
}

export function AddProjectTagInputSchema(): z.ZodObject<
  Properties<AddProjectTagInput>
> {
  return z.object({
    projectId: z.string().min(1),
    tag: z.string().min(1),
  });
}

export function AddSkillTagInputSchema(): z.ZodObject<
  Properties<AddSkillTagInput>
> {
  return z.object({
    dimension: z.string().default('domain').nullish(),
    tag: z.string().min(1),
  });
}

export function AddTaskTagInputSchema(): z.ZodObject<
  Properties<AddTaskTagInput>
> {
  return z.object({
    tag: z.string().min(1),
    taskId: z.string().min(1),
  });
}

export function AddWorkspaceFolderInputSchema(): z.ZodObject<
  Properties<AddWorkspaceFolderInput>
> {
  return z.object({
    displayName: z.string().nullish(),
    path: z.string().min(1),
  });
}

export function AgentAssetSearchInputSchema(): z.ZodObject<
  Properties<AgentAssetSearchInput>
> {
  return z.object({
    limit: z.number().nullish(),
    projectId: z.string().nullish(),
    promptTypes: z.array(CustomPromptTypeSchema).nullish(),
    query: z.string().min(1),
  });
}

export function AgentsRunChatTurnInputSchema(): z.ZodObject<
  Properties<AgentsRunChatTurnInput>
> {
  return z.object({
    conversationId: z.string().nullish(),
    message: z.string().min(1),
    persist: z.boolean().default(false).nullish(),
  });
}

export function AppendPlanOutputInputSchema(): z.ZodObject<
  Properties<AppendPlanOutputInput>
> {
  return z.object({
    content: z.string().min(1),
    iteration: z.number().nullish(),
    planId: z.string().min(1),
    taskId: z.string().nullish(),
  });
}

export function ApplyWorkspaceEditorConfigurationInputSchema(): z.ZodObject<
  Properties<ApplyWorkspaceEditorConfigurationInput>
> {
  return z.object({
    repositoryIds: z.array(z.string().min(1)).nullish(),
  });
}

export function ArchiveAgentConversationInputSchema(): z.ZodObject<
  Properties<ArchiveAgentConversationInput>
> {
  return z.object({
    conversationId: z.string().min(1),
  });
}

export function AssignRoleToServiceAccountInputSchema(): z.ZodObject<
  Properties<AssignRoleToServiceAccountInput>
> {
  return z.object({
    roleId: z.string().min(1),
    serviceAccountId: z.string().min(1),
  });
}

export function AssignRoleToUserInputSchema(): z.ZodObject<
  Properties<AssignRoleToUserInput>
> {
  return z.object({
    roleId: z.string().min(1),
    userId: z.string().min(1),
  });
}

export function AttachWorkSessionSubjectInputSchema(): z.ZodObject<
  Properties<AttachWorkSessionSubjectInput>
> {
  return z.object({
    planId: z.string().min(1),
    sessionId: z.string().min(1),
    taskId: z.string().nullish(),
  });
}

export function CancelPlanRunInputSchema(): z.ZodObject<
  Properties<CancelPlanRunInput>
> {
  return z.object({
    planId: z.string().min(1),
  });
}

export function CleanQueueInputSchema(): z.ZodObject<
  Properties<CleanQueueInput>
> {
  return z.object({
    confirm: z.boolean(),
    graceMs: z.number().nullish(),
    limit: z.number().nullish(),
    queueName: z.string().min(1),
    state: z.string().min(1),
  });
}

export function CloneRepositoryInputSchema(): z.ZodObject<
  Properties<CloneRepositoryInput>
> {
  return z.object({
    gitUrl: z.string().min(1),
    name: z.string().nullish(),
  });
}

export function CodeSemanticSearchInputSchema(): z.ZodObject<
  Properties<CodeSemanticSearchInput>
> {
  return z.object({
    limit: z.number().nullish(),
    query: z.string().min(1),
    repositoryId: z.string().min(1),
  });
}

export function CommitsPerPrInputSchema(): z.ZodObject<
  Properties<CommitsPerPrInput>
> {
  return z.object({
    maxPrs: z.number().nullish(),
    owner: z.string().min(1),
    period: z.string().nullish(),
    repo: z.string().min(1),
  });
}

export function ConnectMcpConnectorInputSchema(): z.ZodObject<
  Properties<ConnectMcpConnectorInput>
> {
  return z.object({
    apiToken: z.string().nullish(),
    connectorKey: z.string().min(1),
    label: z.string().nullish(),
  });
}

export function CreateAgentConversationInputSchema(): z.ZodObject<
  Properties<CreateAgentConversationInput>
> {
  return z.object({
    metadataJson: z.string().nullish(),
    planId: z.string().nullish(),
    projectId: z.string().nullish(),
    title: z.string().nullish(),
  });
}

export function CreateCustomPromptInputSchema(): z.ZodObject<
  Properties<CreateCustomPromptInput>
> {
  return z.object({
    content: z.string().min(1),
    description: z.string().nullish(),
    filePath: z.string().nullish(),
    labels: z.array(z.string().min(1)),
    projectId: z.string().nullish(),
    promptType: CustomPromptTypeSchema,
    title: z.string().min(1),
    userId: z.string().nullish(),
    writeToFileSystem: z.boolean().default(false),
  });
}

export function CreateNoteInputSchema(): z.ZodObject<
  Properties<CreateNoteInput>
> {
  return z.object({
    author: z.string().nullish(),
    content: z.string().min(1),
  });
}

export function CreatePlanInputSchema(): z.ZodObject<
  Properties<CreatePlanInput>
> {
  return z.object({
    assignee: z.string().nullish(),
    author: z.string().min(1),
    category: z.string().min(1),
    description: z.string().nullish(),
    project: z.string().nullish(),
    projectId: z.string().nullish(),
    runConfigJson: z.string().nullish(),
    status: z.string().nullish(),
    summary: z.string().nullish(),
    title: z.string().min(1),
  });
}

export function CreatePlansInputSchema(): z.ZodObject<
  Properties<CreatePlansInput>
> {
  return z.object({
    plans: z.array(z.lazy(() => CreatePlanInputSchema())),
  });
}

export function CreateProjectInputSchema(): z.ZodObject<
  Properties<CreateProjectInput>
> {
  return z.object({
    description: z.string().nullish(),
    name: z.string().min(1),
    nxProjectName: z.string().nullish(),
  });
}

export function CreateQueueInputSchema(): z.ZodObject<
  Properties<CreateQueueInput>
> {
  return z.object({
    name: z.string().min(1),
  });
}

export function CreateRoleInputSchema(): z.ZodObject<
  Properties<CreateRoleInput>
> {
  return z.object({
    description: z.string().nullish(),
    name: z.string().min(1),
  });
}

export function CreateRolloutFlagInputSchema(): z.ZodObject<
  Properties<CreateRolloutFlagInput>
> {
  return z.object({
    description: z.string().nullish(),
    enabled: z.boolean().default(false),
    fallthrough: z.lazy(() => RolloutFallthroughInputSchema().nullish()),
    key: z.string().min(1),
    kind: RolloutFlagKindSchema.nullish(),
    offVariation: z.number().nullish(),
    targetRoles: z.array(z.string().min(1)),
    variations: z
      .array(z.lazy(() => RolloutFlagVariationInputSchema()))
      .nullish(),
  });
}

export function CreateScheduledAgentJobInputTypeSchema(): z.ZodObject<
  Properties<CreateScheduledAgentJobInputType>
> {
  return z.object({
    cronPattern: z.string().min(1),
    cwd: z.string().nullish(),
    driverId: z.string().min(1),
    enabled: z.boolean().nullish(),
    model: z.string().nullish(),
    name: z.string().min(1),
    prompt: z.string().min(1),
    repositoryCheckoutId: z.string().nullish(),
    settingsJson: z.string().nullish(),
    timeoutMs: z.number().nullish(),
    timezone: z.string().nullish(),
  });
}

export function CreateServiceAccountCredentialInputSchema(): z.ZodObject<
  Properties<CreateServiceAccountCredentialInput>
> {
  return z.object({
    expiresAt: definedNonNullAnySchema.nullish(),
    label: z.string().nullish(),
    serviceAccountId: z.string().min(1),
  });
}

export function CreateServiceAccountInputSchema(): z.ZodObject<
  Properties<CreateServiceAccountInput>
> {
  return z.object({
    description: z.string().nullish(),
    name: z.string().min(1),
  });
}

export function CreateTaskInputSchema(): z.ZodObject<
  Properties<CreateTaskInput>
> {
  return z.object({
    assignee: z.string().nullish(),
    category: z.string().nullish(),
    description: z.string().nullish(),
    planId: z.string().min(1),
    project: z.string().nullish(),
    projectId: z.string().nullish(),
    requirements: z.string().nullish(),
    sortOrder: z.number().nullish(),
    status: z.string().nullish(),
    summary: z.string().nullish(),
    title: z.string().min(1),
  });
}

export function CreateTasksInputSchema(): z.ZodObject<
  Properties<CreateTasksInput>
> {
  return z.object({
    planId: z.string().min(1),
    tasks: z.array(z.lazy(() => CreateTasksItemInputSchema())),
  });
}

export function CreateTasksItemInputSchema(): z.ZodObject<
  Properties<CreateTasksItemInput>
> {
  return z.object({
    assignee: z.string().nullish(),
    category: z.string().nullish(),
    description: z.string().nullish(),
    project: z.string().nullish(),
    projectId: z.string().nullish(),
    requirements: z.string().nullish(),
    sortOrder: z.number().nullish(),
    status: z.string().nullish(),
    summary: z.string().nullish(),
    title: z.string().min(1),
  });
}

export function CreateUserInputSchema(): z.ZodObject<
  Properties<CreateUserInput>
> {
  return z.object({
    email: z.string().nullish(),
    githubUsername: z.string().min(1),
  });
}

export function CreateWorkspaceLocalRepositoryInputSchema(): z.ZodObject<
  Properties<CreateWorkspaceLocalRepositoryInput>
> {
  return z.object({
    displayName: z.string().min(1),
    filesystemPath: z.string().min(1),
    gitDefaultBranch: z.string().nullish(),
    gitRemoteUrl: z.string().nullish(),
    projectId: z.string().nullish(),
  });
}

export function DeleteAgentConversationInputSchema(): z.ZodObject<
  Properties<DeleteAgentConversationInput>
> {
  return z.object({
    conversationId: z.string().min(1),
  });
}

export function DeletePlanInputSchema(): z.ZodObject<
  Properties<DeletePlanInput>
> {
  return z.object({
    id: z.string().min(1),
  });
}

export function DeletePlanOutputInputSchema(): z.ZodObject<
  Properties<DeletePlanOutputInput>
> {
  return z.object({
    chunkId: z.string().nullish(),
    planId: z.string().min(1),
    taskId: z.string().nullish(),
  });
}

export function DeleteProjectInputSchema(): z.ZodObject<
  Properties<DeleteProjectInput>
> {
  return z.object({
    id: z.string().min(1),
  });
}

export function DeleteTagActionRuleInputSchema(): z.ZodObject<
  Properties<DeleteTagActionRuleInput>
> {
  return z.object({
    id: z.string().min(1),
  });
}

export function DeleteTaskInputSchema(): z.ZodObject<
  Properties<DeleteTaskInput>
> {
  return z.object({
    id: z.string().min(1),
  });
}

export function DetachHookInputSchema(): z.ZodObject<
  Properties<DetachHookInput>
> {
  return z.object({
    hookTaskId: z.string().min(1),
  });
}

export function DuplicateJobInputSchema(): z.ZodObject<
  Properties<DuplicateJobInput>
> {
  return z.object({
    jobId: z.string().min(1),
    queueName: z.string().min(1),
  });
}

export function EndWorkSessionInputSchema(): z.ZodObject<
  Properties<EndWorkSessionInput>
> {
  return z.object({
    sessionId: z.string().min(1),
    summary: z.string().nullish(),
  });
}

export function EnqueueDocIngestionInputSchema(): z.ZodObject<
  Properties<EnqueueDocIngestionInput>
> {
  return z.object({
    directories: z.array(z.string().min(1)).nullish(),
    files: z.array(z.string().min(1)).nullish(),
    repo: z.string().nullish(),
    scope: z.string().nullish(),
    sha: z.string().nullish(),
  });
}

export function EnqueuePlanRalphOrchestratorInputSchema(): z.ZodObject<
  Properties<EnqueuePlanRalphOrchestratorInput>
> {
  return z.object({
    branch: z.string().min(1),
    checkoutId: z.string().nullish(),
    idempotencyKey: z.string().nullish(),
    jobRunHooksJson: z.string().nullish(),
    mode: PlanRalphWorkflowModeSchema.nullish(),
    planId: z.string().min(1),
    priority: z.number().nullish(),
    ralph: z.lazy(() => RalphPlanRunTuningInputSchema().nullish()),
    repositoryId: z.string().nullish(),
    taskId: z.string().nullish(),
    workingDirectory: z.string().nullish(),
  });
}

export function EnqueuePlanRunInputSchema(): z.ZodObject<
  Properties<EnqueuePlanRunInput>
> {
  return z.object({
    branch: z.string().min(1),
    checkoutId: z.string().nullish(),
    idempotencyKey: z.string().nullish(),
    jobRunHooksJson: z.string().nullish(),
    planId: z.string().min(1),
    priority: z.number().nullish(),
    ralph: z.lazy(() => RalphPlanRunTuningInputSchema().nullish()),
    repositoryId: z.string().nullish(),
    workingDirectory: z.string().nullish(),
  });
}

export function GetAgentConversationMessagesInputSchema(): z.ZodObject<
  Properties<GetAgentConversationMessagesInput>
> {
  return z.object({
    conversationId: z.string().min(1),
    limit: z.number().default(100).nullish(),
    offset: z.number().default(0).nullish(),
  });
}

export function GetGeneratorInputSchema(): z.ZodObject<
  Properties<GetGeneratorInput>
> {
  return z.object({
    name: z.string().min(1),
  });
}

export function GetPlanEmbeddingInputSchema(): z.ZodObject<
  Properties<GetPlanEmbeddingInput>
> {
  return z.object({
    id: z.string().min(1),
  });
}

export function GetPlanOutputStreamChunkInputSchema(): z.ZodObject<
  Properties<GetPlanOutputStreamChunkInput>
> {
  return z.object({
    id: z.string().min(1),
  });
}

export function GetPullInputSchema(): z.ZodObject<Properties<GetPullInput>> {
  return z.object({
    number: z.number(),
    owner: z.string().min(1),
    repo: z.string().min(1),
  });
}

export function GetTaskEmbeddingInputSchema(): z.ZodObject<
  Properties<GetTaskEmbeddingInput>
> {
  return z.object({
    id: z.string().min(1),
  });
}

export function GitHubRepoInputSchema(): z.ZodObject<
  Properties<GitHubRepoInput>
> {
  return z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    state: z.string().min(1),
  });
}

export function LastActivityInputSchema(): z.ZodObject<
  Properties<LastActivityInput>
> {
  return z.object({
    planId: z.string().min(1),
    taskId: z.string().nullish(),
  });
}

export function LinesAddedDeletedInputSchema(): z.ZodObject<
  Properties<LinesAddedDeletedInput>
> {
  return z.object({
    maxPrs: z.number().nullish(),
    owner: z.string().min(1),
    period: z.string().nullish(),
    repo: z.string().min(1),
  });
}

export function ListAgentConversationsInputSchema(): z.ZodObject<
  Properties<ListAgentConversationsInput>
> {
  return z.object({
    limit: z.number().default(20).nullish(),
    offset: z.number().default(0).nullish(),
    status: z.string().default('active').nullish(),
  });
}

export function ListCustomPromptsInputSchema(): z.ZodObject<
  Properties<ListCustomPromptsInput>
> {
  return z.object({
    includeDeleted: z.boolean().default(false),
    labels: z.array(z.string().min(1)).nullish(),
    projectId: z.string().nullish(),
    promptType: CustomPromptTypeSchema.nullish(),
    search: z.string().nullish(),
    userId: z.string().nullish(),
  });
}

export function ListPlanOutputStreamChunksInputSchema(): z.ZodObject<
  Properties<ListPlanOutputStreamChunksInput>
> {
  return z.object({
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    planId: z.string().min(1),
  });
}

export function ListPlansByStatusInputSchema(): z.ZodObject<
  Properties<ListPlansByStatusInput>
> {
  return z.object({
    assignees: z.array(z.string().nullable()).nullish(),
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    project: z.string().nullish(),
    projectId: z.string().nullish(),
    sortBy: z.string().nullish(),
    sortOrder: z.string().nullish(),
    statuses: z.array(z.string().nullable()).nullish(),
    statusesEnum: z.array(PlanTaskStatusSchema.nullable()).nullish(),
    titleSubstring: z.string().nullish(),
  });
}

export function ListPullsInputSchema(): z.ZodObject<
  Properties<ListPullsInput>
> {
  return z.object({
    base: z.string().nullish(),
    merged: z.boolean().nullish(),
    owner: z.string().min(1),
    repo: z.string().min(1),
    state: z.string().nullish(),
  });
}

export function LoginInputSchema(): z.ZodObject<Properties<LoginInput>> {
  return z.object({
    email: z.string().min(1),
    password: z.string().min(1),
  });
}

export function OpenToMergedCycleTimeInputSchema(): z.ZodObject<
  Properties<OpenToMergedCycleTimeInput>
> {
  return z.object({
    owner: z.string().min(1),
    period: z.string().nullish(),
    repo: z.string().min(1),
  });
}

export function PlanEmbeddingsByPlanInputSchema(): z.ZodObject<
  Properties<PlanEmbeddingsByPlanInput>
> {
  return z.object({
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    planId: z.string().min(1),
  });
}

export function PlanRunsByPlanIdInputSchema(): z.ZodObject<
  Properties<PlanRunsByPlanIdInput>
> {
  return z.object({
    limit: z.number().nullish(),
    planId: z.string().min(1),
  });
}

export function PrCountByLabelInputSchema(): z.ZodObject<
  Properties<PrCountByLabelInput>
> {
  return z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    state: z.string().nullish(),
  });
}

export function PromoteTaskToPlanInputSchema(): z.ZodObject<
  Properties<PromoteTaskToPlanInput>
> {
  return z.object({
    idempotencyKey: z.string().nullish(),
    taskId: z.string().min(1),
  });
}

export function PrsMergedPerPeriodInputSchema(): z.ZodObject<
  Properties<PrsMergedPerPeriodInput>
> {
  return z.object({
    owner: z.string().min(1),
    period: z.string().min(1),
    repo: z.string().min(1),
  });
}

export function QueueControlInputSchema(): z.ZodObject<
  Properties<QueueControlInput>
> {
  return z.object({
    queueName: z.string().min(1),
  });
}

export function QueueDetailsInputSchema(): z.ZodObject<
  Properties<QueueDetailsInput>
> {
  return z.object({
    asc: z.boolean().nullish(),
    limit: z.number().nullish(),
    name: z.string().min(1),
    offset: z.number().nullish(),
    states: z.array(z.string().min(1)).nullish(),
  });
}

export function QueueJobLogsInputSchema(): z.ZodObject<
  Properties<QueueJobLogsInput>
> {
  return z.object({
    after: z.string().nullish(),
    jobId: z.string().min(1),
    levelIn: z.array(QueueJobLogLevelSchema).nullish(),
    limit: z.number().nullish(),
    queueName: z.string().min(1),
    since: definedNonNullAnySchema.nullish(),
  });
}

export function RalphPlanRunTuningInputSchema(): z.ZodObject<
  Properties<RalphPlanRunTuningInput>
> {
  return z.object({
    backend: z.string().nullish(),
    disableWorktree: z.boolean().nullish(),
    iterationTimeoutSeconds: z.number().nullish(),
    iterations: z.number().nullish(),
    model: z.string().nullish(),
    project: z.string().nullish(),
    prompt: z.string().nullish(),
    promptFile: z.string().nullish(),
    ralphDebugCli: RalphNestedDebugCliSchema.nullish(),
    skipWorktreeSetup: z.boolean().nullish(),
    worktree: z.string().nullish(),
    worktreeBase: z.string().nullish(),
  });
}

export function RecordPlanRunHeartbeatInputSchema(): z.ZodObject<
  Properties<RecordPlanRunHeartbeatInput>
> {
  return z.object({
    planRunId: z.string().min(1),
  });
}

export function RecordSkillUsageInputSchema(): z.ZodObject<
  Properties<RecordSkillUsageInput>
> {
  return z.object({
    agentId: z.string().nullish(),
    agentType: z.string().nullish(),
    args: z.string().nullish(),
    cwd: z.string().nullish(),
    gitBranch: z.string().nullish(),
    hookEventName: z.string().nullish(),
    invocationPath: z.string().nullish(),
    occurredAt: definedNonNullAnySchema,
    privacyLevel: z.string().nullish(),
    promptId: z.string().nullish(),
    scope: z.string().min(1),
    sessionId: z.string().nullish(),
    skillName: z.string().min(1),
    source: z.string().nullish(),
    toolUseId: z.string().nullish(),
  });
}

export function RecordSkillUsageOutcomeInputSchema(): z.ZodObject<
  Properties<RecordSkillUsageOutcomeInput>
> {
  return z.object({
    cwd: z.string().nullish(),
    durationMs: z.number().nullish(),
    gitBranch: z.string().nullish(),
    occurredAt: definedNonNullAnySchema,
    outcome: z.string().min(1),
    scope: z.string().nullish(),
    sessionId: z.string().nullish(),
    skillName: z.string().min(1),
    toolUseId: z.string().nullish(),
  });
}

export function RecordWorkArtifactInputSchema(): z.ZodObject<
  Properties<RecordWorkArtifactInput>
> {
  return z.object({
    message: z.string().nullish(),
    payloadJson: z.string().min(1),
    sessionId: z.string().min(1),
    type: z.string().min(1),
  });
}

export function RefreshCheckoutInputSchema(): z.ZodObject<
  Properties<RefreshCheckoutInput>
> {
  return z.object({
    id: z.string().min(1),
  });
}

export function RegisterCliPlanRunInputSchema(): z.ZodObject<
  Properties<RegisterCliPlanRunInput>
> {
  return z.object({
    branch: z.string().nullish(),
    executionBackend: z.string().min(1),
    hostname: z.string().nullish(),
    pid: z.number().nullish(),
    planId: z.string().min(1),
    workerId: z.string().nullish(),
  });
}

export function RegisterInputSchema(): z.ZodObject<Properties<RegisterInput>> {
  return z.object({
    email: z.string().min(1),
    githubUsername: z.string().nullish(),
    password: z.string().min(1),
  });
}

export function RegisterPlanRunWorktreeCheckoutInputSchema(): z.ZodObject<
  Properties<RegisterPlanRunWorktreeCheckoutInput>
> {
  return z.object({
    filesystemPath: z.string().min(1),
    planRunId: z.string().min(1),
  });
}

export function RemainingTasksByPlanIdInputSchema(): z.ZodObject<
  Properties<RemainingTasksByPlanIdInput>
> {
  return z.object({
    planId: z.string().min(1),
  });
}

export function RemovePermissionFromRoleInputSchema(): z.ZodObject<
  Properties<RemovePermissionFromRoleInput>
> {
  return z.object({
    permissionId: z.string().min(1),
    roleId: z.string().min(1),
  });
}

export function RemovePlanTagInputSchema(): z.ZodObject<
  Properties<RemovePlanTagInput>
> {
  return z.object({
    planId: z.string().min(1),
    tag: z.string().min(1),
  });
}

export function RemoveProjectSkillTagInputSchema(): z.ZodObject<
  Properties<RemoveProjectSkillTagInput>
> {
  return z.object({
    projectId: z.string().nullish(),
    slug: z.string().min(1),
    tag: z.string().min(1),
  });
}

export function RemoveProjectTagInputSchema(): z.ZodObject<
  Properties<RemoveProjectTagInput>
> {
  return z.object({
    projectId: z.string().min(1),
    tag: z.string().min(1),
  });
}

export function RemoveRepeatableJobInputSchema(): z.ZodObject<
  Properties<RemoveRepeatableJobInput>
> {
  return z.object({
    key: z.string().min(1),
    queueName: z.string().min(1),
  });
}

export function RemoveRoleFromServiceAccountInputSchema(): z.ZodObject<
  Properties<RemoveRoleFromServiceAccountInput>
> {
  return z.object({
    roleId: z.string().min(1),
    serviceAccountId: z.string().min(1),
  });
}

export function RemoveRoleFromUserInputSchema(): z.ZodObject<
  Properties<RemoveRoleFromUserInput>
> {
  return z.object({
    roleId: z.string().min(1),
    userId: z.string().min(1),
  });
}

export function RemoveSkillTagInputSchema(): z.ZodObject<
  Properties<RemoveSkillTagInput>
> {
  return z.object({
    tag: z.string().min(1),
  });
}

export function RemoveTaskTagInputSchema(): z.ZodObject<
  Properties<RemoveTaskTagInput>
> {
  return z.object({
    tag: z.string().min(1),
    taskId: z.string().min(1),
  });
}

export function RenameSkillTagInputSchema(): z.ZodObject<
  Properties<RenameSkillTagInput>
> {
  return z.object({
    from: z.string().min(1),
    to: z.string().min(1),
  });
}

export function ReorderPlanTasksInputSchema(): z.ZodObject<
  Properties<ReorderPlanTasksInput>
> {
  return z.object({
    planId: z.string().min(1),
    taskIds: z.array(z.string().min(1)),
  });
}

export function RepeatableJobsInputSchema(): z.ZodObject<
  Properties<RepeatableJobsInput>
> {
  return z.object({
    asc: z.boolean().nullish(),
    end: z.number().nullish(),
    queueName: z.string().min(1),
    start: z.number().nullish(),
  });
}

export function RetryJobInputSchema(): z.ZodObject<Properties<RetryJobInput>> {
  return z.object({
    jobId: z.string().min(1),
    queueName: z.string().min(1),
  });
}

export function ReviewCycleTimeInputSchema(): z.ZodObject<
  Properties<ReviewCycleTimeInput>
> {
  return z.object({
    maxPrs: z.number().nullish(),
    owner: z.string().min(1),
    period: z.string().nullish(),
    repo: z.string().min(1),
  });
}

export function RolloutFallthroughBucketInputSchema(): z.ZodObject<
  Properties<RolloutFallthroughBucketInput>
> {
  return z.object({
    variation: z.number(),
    weight: z.number(),
  });
}

export function RolloutFallthroughInputSchema(): z.ZodObject<
  Properties<RolloutFallthroughInput>
> {
  return z.object({
    variations: z.array(z.lazy(() => RolloutFallthroughBucketInputSchema())),
  });
}

export function RolloutFlagVariationInputSchema(): z.ZodObject<
  Properties<RolloutFlagVariationInput>
> {
  return z.object({
    description: z.string().nullish(),
    name: z.string().nullish(),
    valueJson: z.string().min(1),
  });
}

export function SearchInputSchema(): z.ZodObject<Properties<SearchInput>> {
  return z.object({
    limit: z.number().nullish(),
    query: z.string().min(1),
  });
}

export function SearchPlansInputSchema(): z.ZodObject<
  Properties<SearchPlansInput>
> {
  return z.object({
    limit: z.number().nullish(),
    query: z.string().min(1),
  });
}

export function SetMcpConnectorEnabledInputSchema(): z.ZodObject<
  Properties<SetMcpConnectorEnabledInput>
> {
  return z.object({
    connectorKey: z.string().min(1),
    enabled: z.boolean(),
  });
}

export function SetPlanStatusInputSchema(): z.ZodObject<
  Properties<SetPlanStatusInput>
> {
  return z.object({
    planId: z.string().min(1),
    status: z.string().nullish(),
    statusEnum: PlanTaskStatusSchema.nullish(),
  });
}

export function SetScheduledAgentJobEnabledInputTypeSchema(): z.ZodObject<
  Properties<SetScheduledAgentJobEnabledInputType>
> {
  return z.object({
    enabled: z.boolean(),
    id: z.string().min(1),
  });
}

export function SetWorkspaceLocalRepositoryProjectInputSchema(): z.ZodObject<
  Properties<SetWorkspaceLocalRepositoryProjectInput>
> {
  return z.object({
    id: z.string().min(1),
    projectId: z.string().nullish(),
  });
}

export function SettleCliPlanRunInputSchema(): z.ZodObject<
  Properties<SettleCliPlanRunInput>
> {
  return z.object({
    planRunId: z.string().min(1),
    status: z.string().min(1),
  });
}

export function SkillAvailabilityRuleInputSchema(): z.ZodObject<
  Properties<SkillAvailabilityRuleInput>
> {
  return z.object({
    environment: z.string().nullish(),
    slugAllow: z.array(z.string().min(1)),
    slugDeny: z.array(z.string().min(1)),
    tagAllow: z.array(z.string().min(1)),
    tagDeny: z.array(z.string().min(1)),
  });
}

export function StartConversationStreamInputSchema(): z.ZodObject<
  Properties<StartConversationStreamInput>
> {
  return z.object({
    backend: z.string().nullish(),
    baseUrl: z.string().nullish(),
    conversationId: z.string().nullish(),
    fileMentions: z.array(z.string().min(1)).nullish(),
    message: z.string().min(1),
    modelId: z.string().nullish(),
    permissionMode: z.string().nullish(),
    persist: z.boolean().nullish(),
    personaId: z.string().nullish(),
    reasoning: z.string().nullish(),
    repositoryId: z.string().nullish(),
    serviceTier: z.string().nullish(),
  });
}

export function StartWorkSessionInputSchema(): z.ZodObject<
  Properties<StartWorkSessionInput>
> {
  return z.object({
    conversationId: z.string().nullish(),
    externalRef: z.string().nullish(),
    model: z.string().nullish(),
    onBehalfOfUserId: z.string().nullish(),
    planRunId: z.string().nullish(),
    toolName: z.string().min(1),
    toolVersion: z.string().nullish(),
  });
}

export function TaskEmbeddingsByTaskInputSchema(): z.ZodObject<
  Properties<TaskEmbeddingsByTaskInput>
> {
  return z.object({
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    taskId: z.string().min(1),
  });
}

export function TasksByPlanIdInputSchema(): z.ZodObject<
  Properties<TasksByPlanIdInput>
> {
  return z.object({
    planId: z.string().min(1),
  });
}

export function TasksByProjectIdInputSchema(): z.ZodObject<
  Properties<TasksByProjectIdInput>
> {
  return z.object({
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    projectId: z.string().min(1),
  });
}

export function UnverifiedWorkArtifactsInputSchema(): z.ZodObject<
  Properties<UnverifiedWorkArtifactsInput>
> {
  return z.object({
    limit: z.number().nullish(),
    type: z.string().nullish(),
  });
}

export function UpdateAgentConversationTitleInputSchema(): z.ZodObject<
  Properties<UpdateAgentConversationTitleInput>
> {
  return z.object({
    conversationId: z.string().min(1),
    title: z.string().min(1),
  });
}

export function UpdateCustomPromptInputSchema(): z.ZodObject<
  Properties<UpdateCustomPromptInput>
> {
  return z.object({
    content: z.string().nullish(),
    description: z.string().nullish(),
    filePath: z.string().nullish(),
    id: z.string().min(1),
    labels: z.array(z.string().min(1)).nullish(),
    projectId: z.string().nullish(),
    promptType: CustomPromptTypeSchema.nullish(),
    title: z.string().nullish(),
    userId: z.string().nullish(),
    writeToFileSystem: z.boolean().default(false),
  });
}

export function UpdateNoteInputSchema(): z.ZodObject<
  Properties<UpdateNoteInput>
> {
  return z.object({
    author: z.string().nullish(),
    content: z.string().nullish(),
    id: z.string().min(1),
  });
}

export function UpdatePlanInputSchema(): z.ZodObject<
  Properties<UpdatePlanInput>
> {
  return z.object({
    assignee: z.string().nullish(),
    author: z.string().nullish(),
    category: z.string().nullish(),
    description: z.string().nullish(),
    id: z.string().min(1),
    jobRunHooksJson: z.string().nullish(),
    project: z.string().nullish(),
    projectId: z.string().nullish(),
    runConfigJson: z.string().nullish(),
    status: z.string().nullish(),
    summary: z.string().nullish(),
    title: z.string().nullish(),
  });
}

export function UpdateProjectInputSchema(): z.ZodObject<
  Properties<UpdateProjectInput>
> {
  return z.object({
    description: z.string().nullish(),
    id: z.string().min(1),
    name: z.string().nullish(),
    nxProjectName: z.string().nullish(),
  });
}

export function UpdateRepositoryInputSchema(): z.ZodObject<
  Properties<UpdateRepositoryInput>
> {
  return z.object({
    defaultBranch: z.string().nullish(),
    foreignSkillInjectionEnabled: z.boolean().nullish(),
    id: z.string().min(1),
    name: z.string().nullish(),
    projectId: z.string().nullish(),
  });
}

export function UpdateRoleInputSchema(): z.ZodObject<
  Properties<UpdateRoleInput>
> {
  return z.object({
    description: z.string().nullish(),
    id: z.string().min(1),
    name: z.string().nullish(),
  });
}

export function UpdateRolloutFlagInputSchema(): z.ZodObject<
  Properties<UpdateRolloutFlagInput>
> {
  return z.object({
    description: z.string().nullish(),
    enabled: z.boolean().nullish(),
    fallthrough: z.lazy(() => RolloutFallthroughInputSchema().nullish()),
    id: z.string().min(1),
    key: z.string().nullish(),
    kind: RolloutFlagKindSchema.nullish(),
    offVariation: z.number().nullish(),
    targetRoles: z.array(z.string().min(1)).nullish(),
    variations: z
      .array(z.lazy(() => RolloutFlagVariationInputSchema()))
      .nullish(),
  });
}

export function UpdateScheduledAgentJobInputTypeSchema(): z.ZodObject<
  Properties<UpdateScheduledAgentJobInputType>
> {
  return z.object({
    cronPattern: z.string().nullish(),
    cwd: z.string().nullish(),
    driverId: z.string().nullish(),
    id: z.string().min(1),
    model: z.string().nullish(),
    name: z.string().nullish(),
    prompt: z.string().nullish(),
    repositoryCheckoutId: z.string().nullish(),
    settingsJson: z.string().nullish(),
    timeoutMs: z.number().nullish(),
    timezone: z.string().nullish(),
  });
}

export function UpdateServiceAccountInputSchema(): z.ZodObject<
  Properties<UpdateServiceAccountInput>
> {
  return z.object({
    description: z.string().nullish(),
    id: z.string().min(1),
    name: z.string().nullish(),
  });
}

export function UpdateTaskInputSchema(): z.ZodObject<
  Properties<UpdateTaskInput>
> {
  return z.object({
    assignee: z.string().nullish(),
    category: z.string().nullish(),
    description: z.string().nullish(),
    id: z.string().min(1),
    planId: z.string().nullish(),
    project: z.string().nullish(),
    projectId: z.string().nullish(),
    requirements: z.string().nullish(),
    sortOrder: z.number().nullish(),
    status: z.string().nullish(),
    summary: z.string().nullish(),
    title: z.string().nullish(),
  });
}

export function UpdateUserInputSchema(): z.ZodObject<
  Properties<UpdateUserInput>
> {
  return z.object({
    disabledAt: definedNonNullAnySchema.nullish(),
    email: z.string().nullish(),
    githubUsername: z.string().nullish(),
    id: z.string().min(1),
  });
}

export function UpdateWorkspaceLocalRepositoryInputSchema(): z.ZodObject<
  Properties<UpdateWorkspaceLocalRepositoryInput>
> {
  return z.object({
    displayName: z.string().nullish(),
    gitDefaultBranch: z.string().nullish(),
    gitRemoteUrl: z.string().nullish(),
    id: z.string().min(1),
    projectId: z.string().nullish(),
  });
}

export function UpdateWorkspaceProfileInputSchema(): z.ZodObject<
  Properties<UpdateWorkspaceProfileInput>
> {
  return z.object({
    contactDisplayName: z.string().nullish(),
    contactEmail: z.string().nullish(),
    enabledEditors: z.array(WorkspaceEditorIdSchema).nullish(),
    worktreeRoot: z.string().nullish(),
  });
}

export function UpsertTagActionRuleInputSchema(): z.ZodObject<
  Properties<UpsertTagActionRuleInput>
> {
  return z.object({
    actionPayloadJson: z.string().min(1),
    actionType: z.string().min(1),
    enabled: z.boolean().default(true).nullish(),
    environment: z.string().nullish(),
    id: z.string().nullish(),
    projectId: z.string().nullish(),
    status: z.string().nullish(),
    tagAll: z.array(z.string().min(1)),
    title: z.string().min(1),
  });
}

export function WorkArtifactsByPlanInputSchema(): z.ZodObject<
  Properties<WorkArtifactsByPlanInput>
> {
  return z.object({
    planId: z.string().min(1),
  });
}

export function WorkArtifactsBySessionInputSchema(): z.ZodObject<
  Properties<WorkArtifactsBySessionInput>
> {
  return z.object({
    sessionId: z.string().min(1),
  });
}

export function WorkArtifactsByTaskInputSchema(): z.ZodObject<
  Properties<WorkArtifactsByTaskInput>
> {
  return z.object({
    taskId: z.string().min(1),
  });
}

export function WorkSessionsByPlanInputSchema(): z.ZodObject<
  Properties<WorkSessionsByPlanInput>
> {
  return z.object({
    planId: z.string().min(1),
  });
}
