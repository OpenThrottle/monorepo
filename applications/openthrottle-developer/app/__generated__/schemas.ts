import { z } from 'zod/v3';
import {
  ActivityByDateInput,
  ActivityByDateRangeInput,
  AgentsRunChatTurnInput,
  AppendPlanOutputInput,
  CancelPlanRunInput,
  CommitCortexDocumentIngestInput,
  CommitLinksByPlanIdInput,
  CommitLinksByTaskIdInput,
  CommitsPerPrInput,
  CreateCustomPromptInput,
  CreateNoteInput,
  CreatePlanInput,
  CreateProjectInput,
  CreateQueueInput,
  CreateTaskInput,
  CreateUserInput,
  CustomPromptType,
  DeletePlanInput,
  DeleteProjectInput,
  DeleteTaskInput,
  DuplicateJobInput,
  EnqueueDocIngestionInput,
  EnqueuePlanRalphOrchestratorInput,
  EnqueuePlanRunInput,
  GetCommitLinkInput,
  GetGeneratorInput,
  GetPlanEmbeddingInput,
  GetPlanOutputStreamChunkInput,
  GetPullInput,
  GetTaskEmbeddingInput,
  GitHubRepoInput,
  LastActivityInput,
  LinesAddedDeletedInput,
  LinkCommitInput,
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
  PreviewCortexDocumentIngestInput,
  PrsMergedPerPeriodInput,
  QueueDetailsInput,
  RalphNestedDebugCli,
  RalphPlanRunTuningInput,
  RegisterInput,
  RemainingTasksByPlanIdInput,
  RemoveRepeatableJobInput,
  RepeatableJobsInput,
  RetryJobInput,
  ReviewCycleTimeInput,
  SearchInput,
  SearchPlansInput,
  SetPlanStatusInput,
  TaskEmbeddingsByTaskInput,
  TasksByPlanIdInput,
  TasksByProjectIdInput,
  UpdateCustomPromptInput,
  UpdateNoteInput,
  UpdatePlanInput,
  UpdateProjectInput,
  UpdateTaskInput,
  UpdateUserInput,
  WallClockInterpretation,
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

export const RalphNestedDebugCliSchema = z.nativeEnum(RalphNestedDebugCli);

export const WallClockInterpretationSchema = z.nativeEnum(
  WallClockInterpretation,
);

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

export function AgentsRunChatTurnInputSchema(): z.ZodObject<
  Properties<AgentsRunChatTurnInput>
> {
  return z.object({
    conversationId: z.string().nullish(),
    message: z.string(),
  });
}

export function AppendPlanOutputInputSchema(): z.ZodObject<
  Properties<AppendPlanOutputInput>
> {
  return z.object({
    content: z.string(),
    iteration: z.number().nullish(),
    planId: z.string(),
  });
}

export function CancelPlanRunInputSchema(): z.ZodObject<
  Properties<CancelPlanRunInput>
> {
  return z.object({
    planId: z.string(),
  });
}

export function CommitCortexDocumentIngestInputSchema(): z.ZodObject<
  Properties<CommitCortexDocumentIngestInput>
> {
  return z.object({
    fileBase64: z.string(),
    mimeType: z.string().nullish(),
    originalFilename: z.string().nullish(),
    plan: z.lazy(() => CreatePlanInputSchema()),
  });
}

export function CommitLinksByPlanIdInputSchema(): z.ZodObject<
  Properties<CommitLinksByPlanIdInput>
> {
  return z.object({
    planId: z.string(),
  });
}

export function CommitLinksByTaskIdInputSchema(): z.ZodObject<
  Properties<CommitLinksByTaskIdInput>
> {
  return z.object({
    taskId: z.string(),
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
    status: z.string().nullish(),
    summary: z.string().nullish(),
    title: z.string(),
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

export function DeleteTaskInputSchema(): z.ZodObject<
  Properties<DeleteTaskInput>
> {
  return z.object({
    id: z.string(),
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
    planId: z.string(),
    priority: z.number().nullish(),
    ralph: z.lazy(() => RalphPlanRunTuningInputSchema().nullish()),
    workingDirectory: z.string().nullish(),
  });
}

export function GetCommitLinkInputSchema(): z.ZodObject<
  Properties<GetCommitLinkInput>
> {
  return z.object({
    id: z.string(),
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

export function LinkCommitInputSchema(): z.ZodObject<
  Properties<LinkCommitInput>
> {
  return z.object({
    message: z.string().nullish(),
    planId: z.string(),
    repo: z.string(),
    sha: z.string(),
    taskId: z.string().nullish(),
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

export function PreviewCortexDocumentIngestInputSchema(): z.ZodObject<
  Properties<PreviewCortexDocumentIngestInput>
> {
  return z.object({
    fileBase64: z.string(),
    mimeType: z.string().nullish(),
    originalFilename: z.string().nullish(),
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

export function RemoveRepeatableJobInputSchema(): z.ZodObject<
  Properties<RemoveRepeatableJobInput>
> {
  return z.object({
    key: z.string(),
    queueName: z.string(),
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

export function TaskEmbeddingsByTaskInputSchema(): z.ZodObject<
  Properties<TaskEmbeddingsByTaskInput>
> {
  return z.object({
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
    project: z.string().nullish(),
    projectId: z.string().nullish(),
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
