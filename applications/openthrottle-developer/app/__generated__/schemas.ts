import { z } from 'zod/v3';
import {
  ActivityByDateInput,
  ActivityByDateRangeInput,
  AddHookInput,
  AddPermissionToRoleInput,
  AddPlanTagInput,
  AddProjectTagInput,
  AddSkillTagInput,
  AddTaskTagInput,
  AgentAssetSearchInput,
  AgentsRunChatTurnInput,
  AppendPlanOutputInput,
  ApplyWorkspaceEditorConfigurationInput,
  ArchiveAgentConversationInput,
  AssignRoleToServiceAccountInput,
  AssignRoleToUserInput,
  AttachWorkSessionSubjectInput,
  CancelPlanRunInput,
  CodeSemanticSearchInput,
  CommitsPerPrInput,
  CreateAgentConversationInput,
  CreateCustomPromptInput,
  CreateNoteInput,
  CreatePlanInput,
  CreatePlansInput,
  CreateProjectInput,
  CreateQueueInput,
  CreateRoleInput,
  CreateServiceAccountCredentialInput,
  CreateServiceAccountInput,
  CreateTaskInput,
  CreateTasksInput,
  CreateTasksItemInput,
  CreateUserInput,
  CreateWorkspaceLocalRepositoryInput,
  CustomPromptType,
  DeletePlanInput,
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
  PrCountByLabelInput,
  PressureLevel,
  PromoteTaskToPlanInput,
  PrsMergedPerPeriodInput,
  QueueDetailsInput,
  QueueJobLogLevel,
  QueueJobLogsInput,
  RalphNestedDebugCli,
  RalphPlanRunTuningInput,
  RecordWorkArtifactInput,
  RegisterInput,
  RemainingTasksByPlanIdInput,
  RemovePermissionFromRoleInput,
  RemovePlanTagInput,
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
  SearchInput,
  SearchPlansInput,
  SetPlanStatusInput,
  SetWorkspaceLocalRepositoryProjectInput,
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
  UpdateRoleInput,
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

export const PressureLevelSchema = z.nativeEnum(PressureLevel);

export const QueueJobLogLevelSchema = z.nativeEnum(QueueJobLogLevel);

export const RalphNestedDebugCliSchema = z.nativeEnum(RalphNestedDebugCli);

export const WallClockInterpretationSchema = z.nativeEnum(
  WallClockInterpretation,
);

export const WorkspaceEditorIdSchema = z.nativeEnum(WorkspaceEditorId);

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
    endIso: z.string(),
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    startIso: z.string(),
  });
}

export function AddHookInputSchema(): z.ZodObject<Properties<AddHookInput>> {
  return z.object({
    anchorTaskId: z.string().nullish(),
    description: z.string().nullish(),
    planId: z.string(),
    role: z.string(),
    scope: z.string().nullish(),
    skillSlug: z.string().nullish(),
    source: z.string(),
    title: z.string().nullish(),
  });
}

export function AddPermissionToRoleInputSchema(): z.ZodObject<
  Properties<AddPermissionToRoleInput>
> {
  return z.object({
    permissionId: z.string(),
    roleId: z.string(),
  });
}

export function AddPlanTagInputSchema(): z.ZodObject<
  Properties<AddPlanTagInput>
> {
  return z.object({
    planId: z.string(),
    tag: z.string(),
  });
}

export function AddProjectTagInputSchema(): z.ZodObject<
  Properties<AddProjectTagInput>
> {
  return z.object({
    projectId: z.string(),
    tag: z.string(),
  });
}

export function AddSkillTagInputSchema(): z.ZodObject<
  Properties<AddSkillTagInput>
> {
  return z.object({
    dimension: z.string().default('domain').nullish(),
    tag: z.string(),
  });
}

export function AddTaskTagInputSchema(): z.ZodObject<
  Properties<AddTaskTagInput>
> {
  return z.object({
    tag: z.string(),
    taskId: z.string(),
  });
}

export function AgentAssetSearchInputSchema(): z.ZodObject<
  Properties<AgentAssetSearchInput>
> {
  return z.object({
    limit: z.number().nullish(),
    projectId: z.string().nullish(),
    promptTypes: z.array(CustomPromptTypeSchema).nullish(),
    query: z.string(),
  });
}

export function AgentsRunChatTurnInputSchema(): z.ZodObject<
  Properties<AgentsRunChatTurnInput>
> {
  return z.object({
    conversationId: z.string().nullish(),
    message: z.string(),
    persist: z.boolean().default(false).nullish(),
  });
}

export function AppendPlanOutputInputSchema(): z.ZodObject<
  Properties<AppendPlanOutputInput>
> {
  return z.object({
    content: z.string(),
    iteration: z.number().nullish(),
    planId: z.string(),
    taskId: z.string().nullish(),
  });
}

export function ApplyWorkspaceEditorConfigurationInputSchema(): z.ZodObject<
  Properties<ApplyWorkspaceEditorConfigurationInput>
> {
  return z.object({
    repositoryIds: z.array(z.string()).nullish(),
  });
}

export function ArchiveAgentConversationInputSchema(): z.ZodObject<
  Properties<ArchiveAgentConversationInput>
> {
  return z.object({
    conversationId: z.string(),
  });
}

export function AssignRoleToServiceAccountInputSchema(): z.ZodObject<
  Properties<AssignRoleToServiceAccountInput>
> {
  return z.object({
    roleId: z.string(),
    serviceAccountId: z.string(),
  });
}

export function AssignRoleToUserInputSchema(): z.ZodObject<
  Properties<AssignRoleToUserInput>
> {
  return z.object({
    roleId: z.string(),
    userId: z.string(),
  });
}

export function AttachWorkSessionSubjectInputSchema(): z.ZodObject<
  Properties<AttachWorkSessionSubjectInput>
> {
  return z.object({
    planId: z.string(),
    sessionId: z.string(),
    taskId: z.string().nullish(),
  });
}

export function CancelPlanRunInputSchema(): z.ZodObject<
  Properties<CancelPlanRunInput>
> {
  return z.object({
    planId: z.string(),
  });
}

export function CodeSemanticSearchInputSchema(): z.ZodObject<
  Properties<CodeSemanticSearchInput>
> {
  return z.object({
    limit: z.number().nullish(),
    query: z.string(),
    repositoryId: z.string(),
  });
}

export function CommitsPerPrInputSchema(): z.ZodObject<
  Properties<CommitsPerPrInput>
> {
  return z.object({
    maxPrs: z.number().nullish(),
    owner: z.string(),
    period: z.string().nullish(),
    repo: z.string(),
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
    content: z.string(),
    description: z.string().nullish(),
    filePath: z.string().nullish(),
    labels: z.array(z.string()),
    projectId: z.string().nullish(),
    promptType: CustomPromptTypeSchema,
    title: z.string(),
    userId: z.string().nullish(),
    writeToFileSystem: z.boolean().default(false),
  });
}

export function CreateNoteInputSchema(): z.ZodObject<
  Properties<CreateNoteInput>
> {
  return z.object({
    author: z.string().nullish(),
    content: z.string(),
  });
}

export function CreatePlanInputSchema(): z.ZodObject<
  Properties<CreatePlanInput>
> {
  return z.object({
    assignee: z.string().nullish(),
    author: z.string(),
    category: z.string(),
    description: z.string().nullish(),
    project: z.string().nullish(),
    projectId: z.string().nullish(),
    runConfigJson: z.string().nullish(),
    status: z.string().nullish(),
    summary: z.string().nullish(),
    title: z.string(),
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
    name: z.string(),
    nxProjectName: z.string().nullish(),
  });
}

export function CreateQueueInputSchema(): z.ZodObject<
  Properties<CreateQueueInput>
> {
  return z.object({
    name: z.string(),
  });
}

export function CreateRoleInputSchema(): z.ZodObject<
  Properties<CreateRoleInput>
> {
  return z.object({
    description: z.string().nullish(),
    name: z.string(),
  });
}

export function CreateServiceAccountCredentialInputSchema(): z.ZodObject<
  Properties<CreateServiceAccountCredentialInput>
> {
  return z.object({
    expiresAt: definedNonNullAnySchema.nullish(),
    label: z.string().nullish(),
    serviceAccountId: z.string(),
  });
}

export function CreateServiceAccountInputSchema(): z.ZodObject<
  Properties<CreateServiceAccountInput>
> {
  return z.object({
    description: z.string().nullish(),
    name: z.string(),
  });
}

export function CreateTaskInputSchema(): z.ZodObject<
  Properties<CreateTaskInput>
> {
  return z.object({
    assignee: z.string().nullish(),
    category: z.string().nullish(),
    description: z.string().nullish(),
    planId: z.string(),
    project: z.string().nullish(),
    projectId: z.string().nullish(),
    requirements: z.string().nullish(),
    sortOrder: z.number().nullish(),
    status: z.string().nullish(),
    summary: z.string().nullish(),
    title: z.string(),
  });
}

export function CreateTasksInputSchema(): z.ZodObject<
  Properties<CreateTasksInput>
> {
  return z.object({
    planId: z.string(),
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
    title: z.string(),
  });
}

export function CreateUserInputSchema(): z.ZodObject<
  Properties<CreateUserInput>
> {
  return z.object({
    email: z.string().nullish(),
    githubUsername: z.string(),
  });
}

export function CreateWorkspaceLocalRepositoryInputSchema(): z.ZodObject<
  Properties<CreateWorkspaceLocalRepositoryInput>
> {
  return z.object({
    displayName: z.string(),
    filesystemPath: z.string(),
    gitDefaultBranch: z.string().nullish(),
    gitRemoteUrl: z.string().nullish(),
    projectId: z.string().nullish(),
  });
}

export function DeletePlanInputSchema(): z.ZodObject<
  Properties<DeletePlanInput>
> {
  return z.object({
    id: z.string(),
  });
}

export function DeleteProjectInputSchema(): z.ZodObject<
  Properties<DeleteProjectInput>
> {
  return z.object({
    id: z.string(),
  });
}

export function DeleteTagActionRuleInputSchema(): z.ZodObject<
  Properties<DeleteTagActionRuleInput>
> {
  return z.object({
    id: z.string(),
  });
}

export function DeleteTaskInputSchema(): z.ZodObject<
  Properties<DeleteTaskInput>
> {
  return z.object({
    id: z.string(),
  });
}

export function DetachHookInputSchema(): z.ZodObject<
  Properties<DetachHookInput>
> {
  return z.object({
    hookTaskId: z.string(),
  });
}

export function DuplicateJobInputSchema(): z.ZodObject<
  Properties<DuplicateJobInput>
> {
  return z.object({
    jobId: z.string(),
    queueName: z.string(),
  });
}

export function EndWorkSessionInputSchema(): z.ZodObject<
  Properties<EndWorkSessionInput>
> {
  return z.object({
    sessionId: z.string(),
    summary: z.string().nullish(),
  });
}

export function EnqueueDocIngestionInputSchema(): z.ZodObject<
  Properties<EnqueueDocIngestionInput>
> {
  return z.object({
    directories: z.array(z.string()).nullish(),
    files: z.array(z.string()).nullish(),
    repo: z.string().nullish(),
    scope: z.string().nullish(),
    sha: z.string().nullish(),
  });
}

export function EnqueuePlanRalphOrchestratorInputSchema(): z.ZodObject<
  Properties<EnqueuePlanRalphOrchestratorInput>
> {
  return z.object({
    idempotencyKey: z.string().nullish(),
    jobRunHooksJson: z.string().nullish(),
    mode: PlanRalphWorkflowModeSchema.nullish(),
    planId: z.string(),
    priority: z.number().nullish(),
    ralph: z.lazy(() => RalphPlanRunTuningInputSchema().nullish()),
    taskId: z.string().nullish(),
    workingDirectory: z.string().nullish(),
  });
}

export function EnqueuePlanRunInputSchema(): z.ZodObject<
  Properties<EnqueuePlanRunInput>
> {
  return z.object({
    idempotencyKey: z.string().nullish(),
    jobRunHooksJson: z.string().nullish(),
    planId: z.string(),
    priority: z.number().nullish(),
    ralph: z.lazy(() => RalphPlanRunTuningInputSchema().nullish()),
    workingDirectory: z.string().nullish(),
  });
}

export function GetAgentConversationMessagesInputSchema(): z.ZodObject<
  Properties<GetAgentConversationMessagesInput>
> {
  return z.object({
    conversationId: z.string(),
    limit: z.number().default(100).nullish(),
    offset: z.number().default(0).nullish(),
  });
}

export function GetGeneratorInputSchema(): z.ZodObject<
  Properties<GetGeneratorInput>
> {
  return z.object({
    name: z.string(),
  });
}

export function GetPlanEmbeddingInputSchema(): z.ZodObject<
  Properties<GetPlanEmbeddingInput>
> {
  return z.object({
    id: z.string(),
  });
}

export function GetPlanOutputStreamChunkInputSchema(): z.ZodObject<
  Properties<GetPlanOutputStreamChunkInput>
> {
  return z.object({
    id: z.string(),
  });
}

export function GetPullInputSchema(): z.ZodObject<Properties<GetPullInput>> {
  return z.object({
    number: z.number(),
    owner: z.string(),
    repo: z.string(),
  });
}

export function GetTaskEmbeddingInputSchema(): z.ZodObject<
  Properties<GetTaskEmbeddingInput>
> {
  return z.object({
    id: z.string(),
  });
}

export function GitHubRepoInputSchema(): z.ZodObject<
  Properties<GitHubRepoInput>
> {
  return z.object({
    owner: z.string(),
    repo: z.string(),
    state: z.string(),
  });
}

export function LastActivityInputSchema(): z.ZodObject<
  Properties<LastActivityInput>
> {
  return z.object({
    planId: z.string(),
    taskId: z.string().nullish(),
  });
}

export function LinesAddedDeletedInputSchema(): z.ZodObject<
  Properties<LinesAddedDeletedInput>
> {
  return z.object({
    maxPrs: z.number().nullish(),
    owner: z.string(),
    period: z.string().nullish(),
    repo: z.string(),
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
    labels: z.array(z.string()).nullish(),
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
    planId: z.string(),
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
    titleSubstring: z.string().nullish(),
  });
}

export function ListPullsInputSchema(): z.ZodObject<
  Properties<ListPullsInput>
> {
  return z.object({
    base: z.string().nullish(),
    merged: z.boolean().nullish(),
    owner: z.string(),
    repo: z.string(),
    state: z.string().nullish(),
  });
}

export function LoginInputSchema(): z.ZodObject<Properties<LoginInput>> {
  return z.object({
    email: z.string(),
    password: z.string(),
  });
}

export function OpenToMergedCycleTimeInputSchema(): z.ZodObject<
  Properties<OpenToMergedCycleTimeInput>
> {
  return z.object({
    owner: z.string(),
    period: z.string().nullish(),
    repo: z.string(),
  });
}

export function PlanEmbeddingsByPlanInputSchema(): z.ZodObject<
  Properties<PlanEmbeddingsByPlanInput>
> {
  return z.object({
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    planId: z.string(),
  });
}

export function PlanRunsByPlanIdInputSchema(): z.ZodObject<
  Properties<PlanRunsByPlanIdInput>
> {
  return z.object({
    limit: z.number().nullish(),
    planId: z.string(),
  });
}

export function PrCountByLabelInputSchema(): z.ZodObject<
  Properties<PrCountByLabelInput>
> {
  return z.object({
    owner: z.string(),
    repo: z.string(),
    state: z.string().nullish(),
  });
}

export function PromoteTaskToPlanInputSchema(): z.ZodObject<
  Properties<PromoteTaskToPlanInput>
> {
  return z.object({
    idempotencyKey: z.string().nullish(),
    taskId: z.string(),
  });
}

export function PrsMergedPerPeriodInputSchema(): z.ZodObject<
  Properties<PrsMergedPerPeriodInput>
> {
  return z.object({
    owner: z.string(),
    period: z.string(),
    repo: z.string(),
  });
}

export function QueueDetailsInputSchema(): z.ZodObject<
  Properties<QueueDetailsInput>
> {
  return z.object({
    asc: z.boolean().nullish(),
    limit: z.number().nullish(),
    name: z.string(),
    offset: z.number().nullish(),
    states: z.array(z.string()).nullish(),
  });
}

export function QueueJobLogsInputSchema(): z.ZodObject<
  Properties<QueueJobLogsInput>
> {
  return z.object({
    after: z.string().nullish(),
    jobId: z.string(),
    levelIn: z.array(QueueJobLogLevelSchema).nullish(),
    limit: z.number().nullish(),
    queueName: z.string(),
    since: definedNonNullAnySchema.nullish(),
  });
}

export function RalphPlanRunTuningInputSchema(): z.ZodObject<
  Properties<RalphPlanRunTuningInput>
> {
  return z.object({
    backend: z.string().nullish(),
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

export function RecordWorkArtifactInputSchema(): z.ZodObject<
  Properties<RecordWorkArtifactInput>
> {
  return z.object({
    message: z.string().nullish(),
    payloadJson: z.string(),
    sessionId: z.string(),
    type: z.string(),
  });
}

export function RegisterInputSchema(): z.ZodObject<Properties<RegisterInput>> {
  return z.object({
    email: z.string(),
    githubUsername: z.string().nullish(),
    password: z.string(),
  });
}

export function RemainingTasksByPlanIdInputSchema(): z.ZodObject<
  Properties<RemainingTasksByPlanIdInput>
> {
  return z.object({
    planId: z.string(),
  });
}

export function RemovePermissionFromRoleInputSchema(): z.ZodObject<
  Properties<RemovePermissionFromRoleInput>
> {
  return z.object({
    permissionId: z.string(),
    roleId: z.string(),
  });
}

export function RemovePlanTagInputSchema(): z.ZodObject<
  Properties<RemovePlanTagInput>
> {
  return z.object({
    planId: z.string(),
    tag: z.string(),
  });
}

export function RemoveProjectTagInputSchema(): z.ZodObject<
  Properties<RemoveProjectTagInput>
> {
  return z.object({
    projectId: z.string(),
    tag: z.string(),
  });
}

export function RemoveRepeatableJobInputSchema(): z.ZodObject<
  Properties<RemoveRepeatableJobInput>
> {
  return z.object({
    key: z.string(),
    queueName: z.string(),
  });
}

export function RemoveRoleFromServiceAccountInputSchema(): z.ZodObject<
  Properties<RemoveRoleFromServiceAccountInput>
> {
  return z.object({
    roleId: z.string(),
    serviceAccountId: z.string(),
  });
}

export function RemoveRoleFromUserInputSchema(): z.ZodObject<
  Properties<RemoveRoleFromUserInput>
> {
  return z.object({
    roleId: z.string(),
    userId: z.string(),
  });
}

export function RemoveSkillTagInputSchema(): z.ZodObject<
  Properties<RemoveSkillTagInput>
> {
  return z.object({
    tag: z.string(),
  });
}

export function RemoveTaskTagInputSchema(): z.ZodObject<
  Properties<RemoveTaskTagInput>
> {
  return z.object({
    tag: z.string(),
    taskId: z.string(),
  });
}

export function RenameSkillTagInputSchema(): z.ZodObject<
  Properties<RenameSkillTagInput>
> {
  return z.object({
    from: z.string(),
    to: z.string(),
  });
}

export function ReorderPlanTasksInputSchema(): z.ZodObject<
  Properties<ReorderPlanTasksInput>
> {
  return z.object({
    planId: z.string(),
    taskIds: z.array(z.string()),
  });
}

export function RepeatableJobsInputSchema(): z.ZodObject<
  Properties<RepeatableJobsInput>
> {
  return z.object({
    asc: z.boolean().nullish(),
    end: z.number().nullish(),
    queueName: z.string(),
    start: z.number().nullish(),
  });
}

export function RetryJobInputSchema(): z.ZodObject<Properties<RetryJobInput>> {
  return z.object({
    jobId: z.string(),
    queueName: z.string(),
  });
}

export function ReviewCycleTimeInputSchema(): z.ZodObject<
  Properties<ReviewCycleTimeInput>
> {
  return z.object({
    maxPrs: z.number().nullish(),
    owner: z.string(),
    period: z.string().nullish(),
    repo: z.string(),
  });
}

export function SearchInputSchema(): z.ZodObject<Properties<SearchInput>> {
  return z.object({
    limit: z.number().nullish(),
    query: z.string(),
  });
}

export function SearchPlansInputSchema(): z.ZodObject<
  Properties<SearchPlansInput>
> {
  return z.object({
    limit: z.number().nullish(),
    query: z.string(),
  });
}

export function SetPlanStatusInputSchema(): z.ZodObject<
  Properties<SetPlanStatusInput>
> {
  return z.object({
    planId: z.string(),
    status: z.string(),
  });
}

export function SetWorkspaceLocalRepositoryProjectInputSchema(): z.ZodObject<
  Properties<SetWorkspaceLocalRepositoryProjectInput>
> {
  return z.object({
    id: z.string(),
    projectId: z.string().nullish(),
  });
}

export function SkillAvailabilityRuleInputSchema(): z.ZodObject<
  Properties<SkillAvailabilityRuleInput>
> {
  return z.object({
    environment: z.string().nullish(),
    slugAllow: z.array(z.string()),
    slugDeny: z.array(z.string()),
    tagAllow: z.array(z.string()),
    tagDeny: z.array(z.string()),
  });
}

export function StartConversationStreamInputSchema(): z.ZodObject<
  Properties<StartConversationStreamInput>
> {
  return z.object({
    backend: z.string().nullish(),
    baseUrl: z.string().nullish(),
    conversationId: z.string().nullish(),
    message: z.string(),
    modelId: z.string().nullish(),
    personaId: z.string().nullish(),
    repositoryId: z.string().nullish(),
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
    toolName: z.string(),
    toolVersion: z.string().nullish(),
  });
}

export function TaskEmbeddingsByTaskInputSchema(): z.ZodObject<
  Properties<TaskEmbeddingsByTaskInput>
> {
  return z.object({
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    taskId: z.string(),
  });
}

export function TasksByPlanIdInputSchema(): z.ZodObject<
  Properties<TasksByPlanIdInput>
> {
  return z.object({
    planId: z.string(),
  });
}

export function TasksByProjectIdInputSchema(): z.ZodObject<
  Properties<TasksByProjectIdInput>
> {
  return z.object({
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    projectId: z.string(),
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
    conversationId: z.string(),
    title: z.string(),
  });
}

export function UpdateCustomPromptInputSchema(): z.ZodObject<
  Properties<UpdateCustomPromptInput>
> {
  return z.object({
    content: z.string().nullish(),
    description: z.string().nullish(),
    filePath: z.string().nullish(),
    id: z.string(),
    labels: z.array(z.string()).nullish(),
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
    id: z.string(),
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
    id: z.string(),
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
    id: z.string(),
    name: z.string().nullish(),
    nxProjectName: z.string().nullish(),
  });
}

export function UpdateRoleInputSchema(): z.ZodObject<
  Properties<UpdateRoleInput>
> {
  return z.object({
    description: z.string().nullish(),
    id: z.string(),
    name: z.string().nullish(),
  });
}

export function UpdateServiceAccountInputSchema(): z.ZodObject<
  Properties<UpdateServiceAccountInput>
> {
  return z.object({
    description: z.string().nullish(),
    id: z.string(),
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
    id: z.string(),
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
    id: z.string(),
  });
}

export function UpdateWorkspaceLocalRepositoryInputSchema(): z.ZodObject<
  Properties<UpdateWorkspaceLocalRepositoryInput>
> {
  return z.object({
    displayName: z.string().nullish(),
    gitDefaultBranch: z.string().nullish(),
    gitRemoteUrl: z.string().nullish(),
    id: z.string(),
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
  });
}

export function UpsertTagActionRuleInputSchema(): z.ZodObject<
  Properties<UpsertTagActionRuleInput>
> {
  return z.object({
    actionPayloadJson: z.string(),
    actionType: z.string(),
    enabled: z.boolean().default(true).nullish(),
    environment: z.string().nullish(),
    id: z.string().nullish(),
    projectId: z.string().nullish(),
    status: z.string().nullish(),
    tagAll: z.array(z.string()),
    title: z.string(),
  });
}

export function WorkArtifactsByPlanInputSchema(): z.ZodObject<
  Properties<WorkArtifactsByPlanInput>
> {
  return z.object({
    planId: z.string(),
  });
}

export function WorkArtifactsBySessionInputSchema(): z.ZodObject<
  Properties<WorkArtifactsBySessionInput>
> {
  return z.object({
    sessionId: z.string(),
  });
}

export function WorkArtifactsByTaskInputSchema(): z.ZodObject<
  Properties<WorkArtifactsByTaskInput>
> {
  return z.object({
    taskId: z.string(),
  });
}

export function WorkSessionsByPlanInputSchema(): z.ZodObject<
  Properties<WorkSessionsByPlanInput>
> {
  return z.object({
    planId: z.string(),
  });
}
