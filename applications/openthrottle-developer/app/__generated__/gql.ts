/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  'fragment HealthCard on ServerHealthObject {\n  api\n  database\n  redis\n  websocket\n}\n\nmutation register($input: RegisterInput!) {\n  register(input: $input) {\n    accessToken\n    email\n    id\n  }\n}\n\nmutation login($input: LoginInput!) {\n  login(input: $input) {\n    accessToken\n  }\n}\n\nquery getRootHealth {\n  serverHealth {\n    ...HealthCard\n  }\n}\n\nfragment RootMetrics on ServerMetricsObject {\n  cpuSystemMs\n  cpuUserMs\n  externalMb\n  heapTotalMb\n  heapUsedMb\n  rssMb\n}\n\nquery getRootMetrics {\n  serverMetrics {\n    ...RootMetrics\n  }\n}\n\nquery getMyUser {\n  me {\n    createdAt\n    disabledAt\n    email\n    githubUsername\n    id\n    updatedAt\n  }\n}\n\nmutation sendAgentMessage($input: AgentsRunChatTurnInput!) {\n  agentsRunChatTurn(input: $input) {\n    assistantText\n    conversationId\n    errorMessage\n    mcpTool\n    readOnlyAgentsChat\n    routingConfidence\n    routingReason\n    structuredPayloadJson\n    toolMetadataJson\n  }\n}': typeof types.HealthCardFragmentDoc;
  'fragment DashboardActivityCard on ActivityByDateResultObject {\n  commits {\n    createdAt\n    id\n    message\n    planId\n    planTitle\n    repo\n    sha\n    taskId\n    taskTitle\n  }\n  hasNext\n  outputChunks {\n    content\n    createdAt\n    id\n    iteration\n    planId\n    planTitle\n  }\n  tasksUpdated {\n    id\n    planId\n    planTitle\n    status\n    title\n    updatedAt\n  }\n  totalCount\n}\n\nfragment DashboardQueueStatsCard on QueueStatsObject {\n  activeCount\n  completedCount\n  delayedCount\n  failedCount\n  name\n  waitingCount\n}\n\nfragment DashboardDailyStatsCard on DailyStatsObject {\n  date\n  plansCompleted\n  plansCreated\n  plansUpdated\n  tasksCompleted\n  tasksCreated\n  tasksUpdated\n}\n\nquery getDashboard($input: ActivityByDateInput!, $start: String!, $end: String!) {\n  activityByDate(input: $input) {\n    ...DashboardActivityCard\n  }\n  dailyStatsRange(start: $start, end: $end) {\n    items {\n      ...DashboardDailyStatsCard\n    }\n  }\n  queues {\n    ...DashboardQueueStatsCard\n  }\n}\n\nquery getDashboardGithubStats($owner: String!, $repo: String!) {\n  openPrCountByAuthor: openPrCountByAuthor(\n    input: {owner: $owner, repo: $repo, state: "open"}\n  ) {\n    author\n    openCount\n  }\n  closedPrCountByAuthor: openPrCountByAuthor(\n    input: {owner: $owner, repo: $repo, state: "closed"}\n  ) {\n    author\n    openCount\n  }\n  prTimeInStateSummary(input: {owner: $owner, repo: $repo, state: "open"}) {\n    state\n    count\n    avgDaysInState\n  }\n}\n\nmutation triggerNotification {\n  triggerWebsocketNotification\n}': typeof types.DashboardActivityCardFragmentDoc;
  'fragment GeneratorDetailCard on GeneratorDetailObject {\n  description\n  name\n  schemaJson\n}\n\nquery getGeneratorByName($name: String!) {\n  generator(input: {name: $name}) {\n    ...GeneratorDetailCard\n  }\n}': typeof types.GeneratorDetailCardFragmentDoc;
  'fragment GeneratorCard on GeneratorObject {\n  description\n  name\n}\n\nquery getGenerators {\n  generators {\n    description\n    name\n  }\n}': typeof types.GeneratorCardFragmentDoc;
  'query getNoteById($id: ID!) {\n  note(id: $id) {\n    ...NoteCard\n  }\n}\n\nmutation updateNote($input: UpdateNoteInput!) {\n  updateNote(input: $input) {\n    ...NoteCard\n  }\n}': typeof types.GetNoteByIdDocument;
  'fragment NoteCard on NoteObject {\n  author\n  content\n  createdAt\n  id\n  updatedAt\n}\n\nquery getNotes {\n  notes {\n    ...NoteCard\n  }\n}': typeof types.NoteCardFragmentDoc;
  'mutation createNote($input: CreateNoteInput!) {\n  createNote(input: $input) {\n    ...NoteCard\n  }\n}': typeof types.CreateNoteDocument;
  'fragment PlanTaskRow on TaskObject {\n  assignee\n  category\n  createdAt\n  description\n  id\n  planId\n  projectRelation {\n    id\n    name\n  }\n  requirementsJson\n  status\n  summary\n  title\n  updatedAt\n}\n\nfragment ProjectDetails on ProjectObject {\n  id\n  name\n}\n\nfragment PlanDetails on PlanObject {\n  assignee\n  author\n  category\n  createdAt\n  description\n  id\n  projectId\n  projectRelation {\n    ...ProjectDetails\n  }\n  status\n  summary\n  title\n  updatedAt\n}\n\nquery getPlanById($id: ID!) {\n  plan(id: $id) {\n    ...PlanDetails\n  }\n}\n\nquery getTasksByPlanId($input: TasksByPlanIdInput!) {\n  tasksByPlanId(input: $input) {\n    ...PlanTaskRow\n  }\n}\n\nmutation PlanDetailEnqueuePlanRun($input: EnqueuePlanRunInput!) {\n  enqueuePlanRun(input: $input) {\n    executionBackend\n    jobId\n    planId\n    queuePosition\n    queueTotal\n  }\n}\n\nmutation PlanDetailCancelPlanRun($input: CancelPlanRunInput!) {\n  cancelPlanRun(input: $input) {\n    activeJobIdsCouldNotCancel\n    noMatchingJob\n    planId\n    planStatusAfter\n    removedJobIds\n    signaledActiveRunToStop\n  }\n}\n\nmutation PlanDetailSetPlanStatus($input: SetPlanStatusInput!) {\n  setPlanStatus(input: $input) {\n    id\n    status\n    title\n    updatedAt\n  }\n}\n\nmutation PlanDetailUpdateTask($input: UpdateTaskInput!) {\n  updateTask(input: $input) {\n    ...PlanTaskRow\n  }\n}\n\nquery PlanDetailIndexLoader($planId: ID!) {\n  plan(id: $planId) {\n    ...PlanDetails\n  }\n  tasksByPlanId(input: {planId: $planId}) {\n    ...PlanTaskRow\n  }\n  planOutputStreamChunks(input: {planId: $planId}) {\n    id\n    content\n    createdAt\n    iteration\n    planId\n  }\n  metrics {\n    recentPlanRunsMetrics(planId: $planId, limit: 25) {\n      executionBackend\n      finishedOn\n      jobId\n      taskRunMetrics {\n        atEnd {\n          rssMb\n        }\n      }\n    }\n  }\n}': typeof types.PlanTaskRowFragmentDoc;
  'mutation updatePlan($input: UpdatePlanInput!) {\n  updatePlan(input: $input) {\n    assignee\n    author\n    category\n    createdAt\n    description\n    id\n    projectId\n    status\n    summary\n    title\n    updatedAt\n  }\n}': typeof types.UpdatePlanDocument;
  'query getTaskById($id: ID!) {\n  task(id: $id) {\n    assignee\n    category\n    createdAt\n    description\n    id\n    planId\n    projectRelation {\n      id\n      name\n    }\n    requirementsJson\n    status\n    summary\n    title\n    updatedAt\n  }\n}': typeof types.GetTaskByIdDocument;
  'query getTaskForEditById($id: ID!) {\n  task(id: $id) {\n    assignee\n    category\n    createdAt\n    description\n    id\n    planId\n    projectRelation {\n      id\n      name\n    }\n    requirementsJson\n    status\n    summary\n    title\n    updatedAt\n  }\n}\n\nmutation updateTask($input: UpdateTaskInput!) {\n  updateTask(input: $input) {\n    id\n    title\n    planId\n    status\n    assignee\n    category\n    description\n    summary\n    createdAt\n    updatedAt\n  }\n}': typeof types.GetTaskForEditByIdDocument;
  'mutation createTask($input: CreateTaskInput!) {\n  createTask(input: $input) {\n    id\n    title\n    planId\n    status\n    assignee\n    category\n    description\n    summary\n    createdAt\n    updatedAt\n  }\n}': typeof types.CreateTaskDocument;
  'fragment PlanCard on PlanObject {\n  assignee\n  author\n  category\n  createdAt\n  description\n  id\n  projectRelation {\n    id\n    name\n  }\n  status\n  summary\n  taskCount\n  title\n  updatedAt\n}\n\nquery getPlanAssigneeOptions {\n  listDistinctAuthorsAndAssignees\n}\n\nquery getPlanCountsByStatus {\n  planCountsByStatus {\n    count\n    status\n  }\n}\n\nquery getPlansByStatus($input: ListPlansByStatusInput!) {\n  allPlansCount: listPlansByStatus(input: {statuses: []}) {\n    totalCount\n  }\n  queuedPlansCount: listPlansByStatus(input: {statuses: ["QUEUED"]}) {\n    totalCount\n  }\n  listPlansByStatus(input: $input) {\n    plans {\n      ...PlanCard\n    }\n    totalCount\n  }\n}': typeof types.PlanCardFragmentDoc;
  'mutation createPlan($input: CreatePlanInput!) {\n  createPlan(input: $input) {\n    id\n    title\n    author\n    category\n    status\n    createdAt\n    updatedAt\n    description\n    assignee\n    project\n    projectId\n    summary\n  }\n}': typeof types.CreatePlanDocument;
  'mutation TestWorkflow($input: EnqueuePlanRunInput!) {\n  enqueuePlanRun(input: $input) {\n    executionBackend\n    jobId\n    planId\n  }\n}': typeof types.TestWorkflowDocument;
  'fragment ProjectPageDetails on ProjectObject {\n  createdAt\n  description\n  id\n  name\n  nxProjectName\n  updatedAt\n}\n\nquery getProjectById($id: ID!, $limit: Float, $offset: Float) {\n  project(id: $id) {\n    ...ProjectPageDetails\n  }\n  projectTasksResult: tasksByProjectId(\n    input: {projectId: $id, limit: $limit, offset: $offset}\n  ) {\n    tasks {\n      assignee\n      requirementsJson\n      summary\n      title\n      updatedAt\n      category\n      createdAt\n      description\n      id\n      planId\n    }\n    totalCount\n  }\n}': typeof types.ProjectPageDetailsFragmentDoc;
  'fragment ProjectCard on ProjectObject {\n  createdAt\n  description\n  id\n  name\n  nxProjectName\n  plans {\n    title\n  }\n  tasks {\n    title\n  }\n  updatedAt\n}\n\nquery getProjects {\n  projects {\n    ...ProjectCard\n  }\n}': typeof types.ProjectCardFragmentDoc;
  'mutation createProject($input: CreateProjectInput!) {\n  createProject(input: $input) {\n    id\n    name\n    description\n    nxProjectName\n    createdAt\n    updatedAt\n  }\n}': typeof types.CreateProjectDocument;
  'query getPrompt($id: ID!) {\n  customPrompt(id: $id) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    projectId\n    promptType\n    title\n    updatedAt\n    userId\n  }\n}\n\nmutation updatePrompt($input: UpdateCustomPromptInput!) {\n  updateCustomPrompt(input: $input) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    promptType\n    title\n    updatedAt\n  }\n}\n\nmutation deletePrompt($id: ID!) {\n  deleteCustomPrompt(id: $id)\n}\n\nmutation writePromptToFileSystem($id: ID!) {\n  writeCustomPromptToFileSystem(id: $id)\n}': typeof types.GetPromptDocument;
  'fragment PromptCard on CustomPromptObject {\n  content\n  createdAt\n  description\n  filePath\n  id\n  labels\n  promptType\n  title\n  updatedAt\n}\n\nquery getPrompts($input: ListCustomPromptsInput) {\n  customPrompts(input: $input) {\n    ...PromptCard\n  }\n}': typeof types.PromptCardFragmentDoc;
  'mutation createPrompt($input: CreateCustomPromptInput!) {\n  createCustomPrompt(input: $input) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    promptType\n    title\n    updatedAt\n  }\n}': typeof types.CreatePromptDocument;
  'query getPullRequestDetail($input: GetPullInput!) {\n  pull(input: $input) {\n    author\n    baseRef\n    createdAt\n    headRef\n    headSha\n    htmlUrl\n    mergedAt\n    number\n    state\n    title\n    updatedAt\n  }\n}': typeof types.GetPullRequestDetailDocument;
  'fragment PullRequestCard on PullListItemObject {\n  author\n  baseRef\n  createdAt\n  headRef\n  headSha\n  htmlUrl\n  mergedAt\n  number\n  state\n  title\n  updatedAt\n}\n\nquery getPullRequests($input: ListPullsInput!) {\n  pulls(input: $input) {\n    ...PullRequestCard\n  }\n}': typeof types.PullRequestCardFragmentDoc;
  'fragment JobDetailsCard on JobObject {\n  data\n  executionBackend\n  failedReason\n  finishedOn\n  id\n  name\n  processedOn\n  progress\n  returnvalue\n  state\n  taskRunMetrics {\n    atEnd {\n      heapUsedMb\n      rssMb\n    }\n    atStart {\n      heapUsedMb\n      rssMb\n    }\n  }\n  timestamp\n}\n\nquery getQueueJobDetails($jobId: ID!, $queueName: String!) {\n  job(jobId: $jobId, queueName: $queueName) {\n    ...JobDetailsCard\n  }\n}\n\nmutation QueueJobDetailRetry($input: RetryJobInput!) {\n  retryJob(input: $input) {\n    error\n    jobId\n    success\n  }\n}\n\nmutation QueueJobDetailCancelPlanRun($input: CancelPlanRunInput!) {\n  cancelPlanRun(input: $input) {\n    activeJobIdsCouldNotCancel\n    noMatchingJob\n    planId\n    planStatusAfter\n    removedJobIds\n    signaledActiveRunToStop\n  }\n}': typeof types.JobDetailsCardFragmentDoc;
  'query getQueue($input: QueueDetailsInput!) {\n  queue(input: $input) {\n    activeCount\n    completedCount\n    delayedCount\n    failedCount\n    jobs {\n      hasNext\n      jobs {\n        data\n        failedReason\n        finishedOn\n        id\n        name\n        processedOn\n        progress\n        returnvalue\n        state\n        timestamp\n      }\n    }\n    name\n    waitingCount\n  }\n}': typeof types.GetQueueDocument;
  'fragment QueueCard on QueueStatsObject {\n  activeCount\n  completedCount\n  delayedCount\n  failedCount\n  name\n  waitingCount\n}\n\nquery getQueues {\n  queues {\n    ...QueueCard\n  }\n}': typeof types.QueueCardFragmentDoc;
  'mutation createQueue($input: CreateQueueInput!) {\n  createQueue(input: $input) {\n    success\n    queueName\n    error\n  }\n}': typeof types.CreateQueueDocument;
  'query getSearchResults($input: SearchInput!) {\n  search(input: $input) {\n    chunks {\n      content\n      id\n      planId\n      planTitle\n      similarity\n      source\n      sourcePath\n      sourceRepo\n      sourceSha\n      taskId\n      taskTitle\n    }\n  }\n}': typeof types.GetSearchResultsDocument;
  'fragment UsageDailyStatsRow on DailyStatsObject {\n  date\n  plansCompleted\n  plansCreated\n  plansUpdated\n  tasksCompleted\n  tasksCreated\n  tasksUpdated\n}\n\nquery getUsageDailyStats($start: String!, $end: String!) {\n  dailyStatsRange(start: $start, end: $end) {\n    items {\n      ...UsageDailyStatsRow\n    }\n  }\n}': typeof types.UsageDailyStatsRowFragmentDoc;
};
const documents: Documents = {
  'fragment HealthCard on ServerHealthObject {\n  api\n  database\n  redis\n  websocket\n}\n\nmutation register($input: RegisterInput!) {\n  register(input: $input) {\n    accessToken\n    email\n    id\n  }\n}\n\nmutation login($input: LoginInput!) {\n  login(input: $input) {\n    accessToken\n  }\n}\n\nquery getRootHealth {\n  serverHealth {\n    ...HealthCard\n  }\n}\n\nfragment RootMetrics on ServerMetricsObject {\n  cpuSystemMs\n  cpuUserMs\n  externalMb\n  heapTotalMb\n  heapUsedMb\n  rssMb\n}\n\nquery getRootMetrics {\n  serverMetrics {\n    ...RootMetrics\n  }\n}\n\nquery getMyUser {\n  me {\n    createdAt\n    disabledAt\n    email\n    githubUsername\n    id\n    updatedAt\n  }\n}\n\nmutation sendAgentMessage($input: AgentsRunChatTurnInput!) {\n  agentsRunChatTurn(input: $input) {\n    assistantText\n    conversationId\n    errorMessage\n    mcpTool\n    readOnlyAgentsChat\n    routingConfidence\n    routingReason\n    structuredPayloadJson\n    toolMetadataJson\n  }\n}':
    types.HealthCardFragmentDoc,
  'fragment DashboardActivityCard on ActivityByDateResultObject {\n  commits {\n    createdAt\n    id\n    message\n    planId\n    planTitle\n    repo\n    sha\n    taskId\n    taskTitle\n  }\n  hasNext\n  outputChunks {\n    content\n    createdAt\n    id\n    iteration\n    planId\n    planTitle\n  }\n  tasksUpdated {\n    id\n    planId\n    planTitle\n    status\n    title\n    updatedAt\n  }\n  totalCount\n}\n\nfragment DashboardQueueStatsCard on QueueStatsObject {\n  activeCount\n  completedCount\n  delayedCount\n  failedCount\n  name\n  waitingCount\n}\n\nfragment DashboardDailyStatsCard on DailyStatsObject {\n  date\n  plansCompleted\n  plansCreated\n  plansUpdated\n  tasksCompleted\n  tasksCreated\n  tasksUpdated\n}\n\nquery getDashboard($input: ActivityByDateInput!, $start: String!, $end: String!) {\n  activityByDate(input: $input) {\n    ...DashboardActivityCard\n  }\n  dailyStatsRange(start: $start, end: $end) {\n    items {\n      ...DashboardDailyStatsCard\n    }\n  }\n  queues {\n    ...DashboardQueueStatsCard\n  }\n}\n\nquery getDashboardGithubStats($owner: String!, $repo: String!) {\n  openPrCountByAuthor: openPrCountByAuthor(\n    input: {owner: $owner, repo: $repo, state: "open"}\n  ) {\n    author\n    openCount\n  }\n  closedPrCountByAuthor: openPrCountByAuthor(\n    input: {owner: $owner, repo: $repo, state: "closed"}\n  ) {\n    author\n    openCount\n  }\n  prTimeInStateSummary(input: {owner: $owner, repo: $repo, state: "open"}) {\n    state\n    count\n    avgDaysInState\n  }\n}\n\nmutation triggerNotification {\n  triggerWebsocketNotification\n}':
    types.DashboardActivityCardFragmentDoc,
  'fragment GeneratorDetailCard on GeneratorDetailObject {\n  description\n  name\n  schemaJson\n}\n\nquery getGeneratorByName($name: String!) {\n  generator(input: {name: $name}) {\n    ...GeneratorDetailCard\n  }\n}':
    types.GeneratorDetailCardFragmentDoc,
  'fragment GeneratorCard on GeneratorObject {\n  description\n  name\n}\n\nquery getGenerators {\n  generators {\n    description\n    name\n  }\n}':
    types.GeneratorCardFragmentDoc,
  'query getNoteById($id: ID!) {\n  note(id: $id) {\n    ...NoteCard\n  }\n}\n\nmutation updateNote($input: UpdateNoteInput!) {\n  updateNote(input: $input) {\n    ...NoteCard\n  }\n}':
    types.GetNoteByIdDocument,
  'fragment NoteCard on NoteObject {\n  author\n  content\n  createdAt\n  id\n  updatedAt\n}\n\nquery getNotes {\n  notes {\n    ...NoteCard\n  }\n}':
    types.NoteCardFragmentDoc,
  'mutation createNote($input: CreateNoteInput!) {\n  createNote(input: $input) {\n    ...NoteCard\n  }\n}':
    types.CreateNoteDocument,
  'fragment PlanTaskRow on TaskObject {\n  assignee\n  category\n  createdAt\n  description\n  id\n  planId\n  projectRelation {\n    id\n    name\n  }\n  requirementsJson\n  status\n  summary\n  title\n  updatedAt\n}\n\nfragment ProjectDetails on ProjectObject {\n  id\n  name\n}\n\nfragment PlanDetails on PlanObject {\n  assignee\n  author\n  category\n  createdAt\n  description\n  id\n  projectId\n  projectRelation {\n    ...ProjectDetails\n  }\n  status\n  summary\n  title\n  updatedAt\n}\n\nquery getPlanById($id: ID!) {\n  plan(id: $id) {\n    ...PlanDetails\n  }\n}\n\nquery getTasksByPlanId($input: TasksByPlanIdInput!) {\n  tasksByPlanId(input: $input) {\n    ...PlanTaskRow\n  }\n}\n\nmutation PlanDetailEnqueuePlanRun($input: EnqueuePlanRunInput!) {\n  enqueuePlanRun(input: $input) {\n    executionBackend\n    jobId\n    planId\n    queuePosition\n    queueTotal\n  }\n}\n\nmutation PlanDetailCancelPlanRun($input: CancelPlanRunInput!) {\n  cancelPlanRun(input: $input) {\n    activeJobIdsCouldNotCancel\n    noMatchingJob\n    planId\n    planStatusAfter\n    removedJobIds\n    signaledActiveRunToStop\n  }\n}\n\nmutation PlanDetailSetPlanStatus($input: SetPlanStatusInput!) {\n  setPlanStatus(input: $input) {\n    id\n    status\n    title\n    updatedAt\n  }\n}\n\nmutation PlanDetailUpdateTask($input: UpdateTaskInput!) {\n  updateTask(input: $input) {\n    ...PlanTaskRow\n  }\n}\n\nquery PlanDetailIndexLoader($planId: ID!) {\n  plan(id: $planId) {\n    ...PlanDetails\n  }\n  tasksByPlanId(input: {planId: $planId}) {\n    ...PlanTaskRow\n  }\n  planOutputStreamChunks(input: {planId: $planId}) {\n    id\n    content\n    createdAt\n    iteration\n    planId\n  }\n  metrics {\n    recentPlanRunsMetrics(planId: $planId, limit: 25) {\n      executionBackend\n      finishedOn\n      jobId\n      taskRunMetrics {\n        atEnd {\n          rssMb\n        }\n      }\n    }\n  }\n}':
    types.PlanTaskRowFragmentDoc,
  'mutation updatePlan($input: UpdatePlanInput!) {\n  updatePlan(input: $input) {\n    assignee\n    author\n    category\n    createdAt\n    description\n    id\n    projectId\n    status\n    summary\n    title\n    updatedAt\n  }\n}':
    types.UpdatePlanDocument,
  'query getTaskById($id: ID!) {\n  task(id: $id) {\n    assignee\n    category\n    createdAt\n    description\n    id\n    planId\n    projectRelation {\n      id\n      name\n    }\n    requirementsJson\n    status\n    summary\n    title\n    updatedAt\n  }\n}':
    types.GetTaskByIdDocument,
  'query getTaskForEditById($id: ID!) {\n  task(id: $id) {\n    assignee\n    category\n    createdAt\n    description\n    id\n    planId\n    projectRelation {\n      id\n      name\n    }\n    requirementsJson\n    status\n    summary\n    title\n    updatedAt\n  }\n}\n\nmutation updateTask($input: UpdateTaskInput!) {\n  updateTask(input: $input) {\n    id\n    title\n    planId\n    status\n    assignee\n    category\n    description\n    summary\n    createdAt\n    updatedAt\n  }\n}':
    types.GetTaskForEditByIdDocument,
  'mutation createTask($input: CreateTaskInput!) {\n  createTask(input: $input) {\n    id\n    title\n    planId\n    status\n    assignee\n    category\n    description\n    summary\n    createdAt\n    updatedAt\n  }\n}':
    types.CreateTaskDocument,
  'fragment PlanCard on PlanObject {\n  assignee\n  author\n  category\n  createdAt\n  description\n  id\n  projectRelation {\n    id\n    name\n  }\n  status\n  summary\n  taskCount\n  title\n  updatedAt\n}\n\nquery getPlanAssigneeOptions {\n  listDistinctAuthorsAndAssignees\n}\n\nquery getPlanCountsByStatus {\n  planCountsByStatus {\n    count\n    status\n  }\n}\n\nquery getPlansByStatus($input: ListPlansByStatusInput!) {\n  allPlansCount: listPlansByStatus(input: {statuses: []}) {\n    totalCount\n  }\n  queuedPlansCount: listPlansByStatus(input: {statuses: ["QUEUED"]}) {\n    totalCount\n  }\n  listPlansByStatus(input: $input) {\n    plans {\n      ...PlanCard\n    }\n    totalCount\n  }\n}':
    types.PlanCardFragmentDoc,
  'mutation createPlan($input: CreatePlanInput!) {\n  createPlan(input: $input) {\n    id\n    title\n    author\n    category\n    status\n    createdAt\n    updatedAt\n    description\n    assignee\n    project\n    projectId\n    summary\n  }\n}':
    types.CreatePlanDocument,
  'mutation TestWorkflow($input: EnqueuePlanRunInput!) {\n  enqueuePlanRun(input: $input) {\n    executionBackend\n    jobId\n    planId\n  }\n}':
    types.TestWorkflowDocument,
  'fragment ProjectPageDetails on ProjectObject {\n  createdAt\n  description\n  id\n  name\n  nxProjectName\n  updatedAt\n}\n\nquery getProjectById($id: ID!, $limit: Float, $offset: Float) {\n  project(id: $id) {\n    ...ProjectPageDetails\n  }\n  projectTasksResult: tasksByProjectId(\n    input: {projectId: $id, limit: $limit, offset: $offset}\n  ) {\n    tasks {\n      assignee\n      requirementsJson\n      summary\n      title\n      updatedAt\n      category\n      createdAt\n      description\n      id\n      planId\n    }\n    totalCount\n  }\n}':
    types.ProjectPageDetailsFragmentDoc,
  'fragment ProjectCard on ProjectObject {\n  createdAt\n  description\n  id\n  name\n  nxProjectName\n  plans {\n    title\n  }\n  tasks {\n    title\n  }\n  updatedAt\n}\n\nquery getProjects {\n  projects {\n    ...ProjectCard\n  }\n}':
    types.ProjectCardFragmentDoc,
  'mutation createProject($input: CreateProjectInput!) {\n  createProject(input: $input) {\n    id\n    name\n    description\n    nxProjectName\n    createdAt\n    updatedAt\n  }\n}':
    types.CreateProjectDocument,
  'query getPrompt($id: ID!) {\n  customPrompt(id: $id) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    projectId\n    promptType\n    title\n    updatedAt\n    userId\n  }\n}\n\nmutation updatePrompt($input: UpdateCustomPromptInput!) {\n  updateCustomPrompt(input: $input) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    promptType\n    title\n    updatedAt\n  }\n}\n\nmutation deletePrompt($id: ID!) {\n  deleteCustomPrompt(id: $id)\n}\n\nmutation writePromptToFileSystem($id: ID!) {\n  writeCustomPromptToFileSystem(id: $id)\n}':
    types.GetPromptDocument,
  'fragment PromptCard on CustomPromptObject {\n  content\n  createdAt\n  description\n  filePath\n  id\n  labels\n  promptType\n  title\n  updatedAt\n}\n\nquery getPrompts($input: ListCustomPromptsInput) {\n  customPrompts(input: $input) {\n    ...PromptCard\n  }\n}':
    types.PromptCardFragmentDoc,
  'mutation createPrompt($input: CreateCustomPromptInput!) {\n  createCustomPrompt(input: $input) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    promptType\n    title\n    updatedAt\n  }\n}':
    types.CreatePromptDocument,
  'query getPullRequestDetail($input: GetPullInput!) {\n  pull(input: $input) {\n    author\n    baseRef\n    createdAt\n    headRef\n    headSha\n    htmlUrl\n    mergedAt\n    number\n    state\n    title\n    updatedAt\n  }\n}':
    types.GetPullRequestDetailDocument,
  'fragment PullRequestCard on PullListItemObject {\n  author\n  baseRef\n  createdAt\n  headRef\n  headSha\n  htmlUrl\n  mergedAt\n  number\n  state\n  title\n  updatedAt\n}\n\nquery getPullRequests($input: ListPullsInput!) {\n  pulls(input: $input) {\n    ...PullRequestCard\n  }\n}':
    types.PullRequestCardFragmentDoc,
  'fragment JobDetailsCard on JobObject {\n  data\n  executionBackend\n  failedReason\n  finishedOn\n  id\n  name\n  processedOn\n  progress\n  returnvalue\n  state\n  taskRunMetrics {\n    atEnd {\n      heapUsedMb\n      rssMb\n    }\n    atStart {\n      heapUsedMb\n      rssMb\n    }\n  }\n  timestamp\n}\n\nquery getQueueJobDetails($jobId: ID!, $queueName: String!) {\n  job(jobId: $jobId, queueName: $queueName) {\n    ...JobDetailsCard\n  }\n}\n\nmutation QueueJobDetailRetry($input: RetryJobInput!) {\n  retryJob(input: $input) {\n    error\n    jobId\n    success\n  }\n}\n\nmutation QueueJobDetailCancelPlanRun($input: CancelPlanRunInput!) {\n  cancelPlanRun(input: $input) {\n    activeJobIdsCouldNotCancel\n    noMatchingJob\n    planId\n    planStatusAfter\n    removedJobIds\n    signaledActiveRunToStop\n  }\n}':
    types.JobDetailsCardFragmentDoc,
  'query getQueue($input: QueueDetailsInput!) {\n  queue(input: $input) {\n    activeCount\n    completedCount\n    delayedCount\n    failedCount\n    jobs {\n      hasNext\n      jobs {\n        data\n        failedReason\n        finishedOn\n        id\n        name\n        processedOn\n        progress\n        returnvalue\n        state\n        timestamp\n      }\n    }\n    name\n    waitingCount\n  }\n}':
    types.GetQueueDocument,
  'fragment QueueCard on QueueStatsObject {\n  activeCount\n  completedCount\n  delayedCount\n  failedCount\n  name\n  waitingCount\n}\n\nquery getQueues {\n  queues {\n    ...QueueCard\n  }\n}':
    types.QueueCardFragmentDoc,
  'mutation createQueue($input: CreateQueueInput!) {\n  createQueue(input: $input) {\n    success\n    queueName\n    error\n  }\n}':
    types.CreateQueueDocument,
  'query getSearchResults($input: SearchInput!) {\n  search(input: $input) {\n    chunks {\n      content\n      id\n      planId\n      planTitle\n      similarity\n      source\n      sourcePath\n      sourceRepo\n      sourceSha\n      taskId\n      taskTitle\n    }\n  }\n}':
    types.GetSearchResultsDocument,
  'fragment UsageDailyStatsRow on DailyStatsObject {\n  date\n  plansCompleted\n  plansCreated\n  plansUpdated\n  tasksCompleted\n  tasksCreated\n  tasksUpdated\n}\n\nquery getUsageDailyStats($start: String!, $end: String!) {\n  dailyStatsRange(start: $start, end: $end) {\n    items {\n      ...UsageDailyStatsRow\n    }\n  }\n}':
    types.UsageDailyStatsRowFragmentDoc,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment HealthCard on ServerHealthObject {\n  api\n  database\n  redis\n  websocket\n}\n\nmutation register($input: RegisterInput!) {\n  register(input: $input) {\n    accessToken\n    email\n    id\n  }\n}\n\nmutation login($input: LoginInput!) {\n  login(input: $input) {\n    accessToken\n  }\n}\n\nquery getRootHealth {\n  serverHealth {\n    ...HealthCard\n  }\n}\n\nfragment RootMetrics on ServerMetricsObject {\n  cpuSystemMs\n  cpuUserMs\n  externalMb\n  heapTotalMb\n  heapUsedMb\n  rssMb\n}\n\nquery getRootMetrics {\n  serverMetrics {\n    ...RootMetrics\n  }\n}\n\nquery getMyUser {\n  me {\n    createdAt\n    disabledAt\n    email\n    githubUsername\n    id\n    updatedAt\n  }\n}\n\nmutation sendAgentMessage($input: AgentsRunChatTurnInput!) {\n  agentsRunChatTurn(input: $input) {\n    assistantText\n    conversationId\n    errorMessage\n    mcpTool\n    readOnlyAgentsChat\n    routingConfidence\n    routingReason\n    structuredPayloadJson\n    toolMetadataJson\n  }\n}',
): (typeof documents)['fragment HealthCard on ServerHealthObject {\n  api\n  database\n  redis\n  websocket\n}\n\nmutation register($input: RegisterInput!) {\n  register(input: $input) {\n    accessToken\n    email\n    id\n  }\n}\n\nmutation login($input: LoginInput!) {\n  login(input: $input) {\n    accessToken\n  }\n}\n\nquery getRootHealth {\n  serverHealth {\n    ...HealthCard\n  }\n}\n\nfragment RootMetrics on ServerMetricsObject {\n  cpuSystemMs\n  cpuUserMs\n  externalMb\n  heapTotalMb\n  heapUsedMb\n  rssMb\n}\n\nquery getRootMetrics {\n  serverMetrics {\n    ...RootMetrics\n  }\n}\n\nquery getMyUser {\n  me {\n    createdAt\n    disabledAt\n    email\n    githubUsername\n    id\n    updatedAt\n  }\n}\n\nmutation sendAgentMessage($input: AgentsRunChatTurnInput!) {\n  agentsRunChatTurn(input: $input) {\n    assistantText\n    conversationId\n    errorMessage\n    mcpTool\n    readOnlyAgentsChat\n    routingConfidence\n    routingReason\n    structuredPayloadJson\n    toolMetadataJson\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment DashboardActivityCard on ActivityByDateResultObject {\n  commits {\n    createdAt\n    id\n    message\n    planId\n    planTitle\n    repo\n    sha\n    taskId\n    taskTitle\n  }\n  hasNext\n  outputChunks {\n    content\n    createdAt\n    id\n    iteration\n    planId\n    planTitle\n  }\n  tasksUpdated {\n    id\n    planId\n    planTitle\n    status\n    title\n    updatedAt\n  }\n  totalCount\n}\n\nfragment DashboardQueueStatsCard on QueueStatsObject {\n  activeCount\n  completedCount\n  delayedCount\n  failedCount\n  name\n  waitingCount\n}\n\nfragment DashboardDailyStatsCard on DailyStatsObject {\n  date\n  plansCompleted\n  plansCreated\n  plansUpdated\n  tasksCompleted\n  tasksCreated\n  tasksUpdated\n}\n\nquery getDashboard($input: ActivityByDateInput!, $start: String!, $end: String!) {\n  activityByDate(input: $input) {\n    ...DashboardActivityCard\n  }\n  dailyStatsRange(start: $start, end: $end) {\n    items {\n      ...DashboardDailyStatsCard\n    }\n  }\n  queues {\n    ...DashboardQueueStatsCard\n  }\n}\n\nquery getDashboardGithubStats($owner: String!, $repo: String!) {\n  openPrCountByAuthor: openPrCountByAuthor(\n    input: {owner: $owner, repo: $repo, state: "open"}\n  ) {\n    author\n    openCount\n  }\n  closedPrCountByAuthor: openPrCountByAuthor(\n    input: {owner: $owner, repo: $repo, state: "closed"}\n  ) {\n    author\n    openCount\n  }\n  prTimeInStateSummary(input: {owner: $owner, repo: $repo, state: "open"}) {\n    state\n    count\n    avgDaysInState\n  }\n}\n\nmutation triggerNotification {\n  triggerWebsocketNotification\n}',
): (typeof documents)['fragment DashboardActivityCard on ActivityByDateResultObject {\n  commits {\n    createdAt\n    id\n    message\n    planId\n    planTitle\n    repo\n    sha\n    taskId\n    taskTitle\n  }\n  hasNext\n  outputChunks {\n    content\n    createdAt\n    id\n    iteration\n    planId\n    planTitle\n  }\n  tasksUpdated {\n    id\n    planId\n    planTitle\n    status\n    title\n    updatedAt\n  }\n  totalCount\n}\n\nfragment DashboardQueueStatsCard on QueueStatsObject {\n  activeCount\n  completedCount\n  delayedCount\n  failedCount\n  name\n  waitingCount\n}\n\nfragment DashboardDailyStatsCard on DailyStatsObject {\n  date\n  plansCompleted\n  plansCreated\n  plansUpdated\n  tasksCompleted\n  tasksCreated\n  tasksUpdated\n}\n\nquery getDashboard($input: ActivityByDateInput!, $start: String!, $end: String!) {\n  activityByDate(input: $input) {\n    ...DashboardActivityCard\n  }\n  dailyStatsRange(start: $start, end: $end) {\n    items {\n      ...DashboardDailyStatsCard\n    }\n  }\n  queues {\n    ...DashboardQueueStatsCard\n  }\n}\n\nquery getDashboardGithubStats($owner: String!, $repo: String!) {\n  openPrCountByAuthor: openPrCountByAuthor(\n    input: {owner: $owner, repo: $repo, state: "open"}\n  ) {\n    author\n    openCount\n  }\n  closedPrCountByAuthor: openPrCountByAuthor(\n    input: {owner: $owner, repo: $repo, state: "closed"}\n  ) {\n    author\n    openCount\n  }\n  prTimeInStateSummary(input: {owner: $owner, repo: $repo, state: "open"}) {\n    state\n    count\n    avgDaysInState\n  }\n}\n\nmutation triggerNotification {\n  triggerWebsocketNotification\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment GeneratorDetailCard on GeneratorDetailObject {\n  description\n  name\n  schemaJson\n}\n\nquery getGeneratorByName($name: String!) {\n  generator(input: {name: $name}) {\n    ...GeneratorDetailCard\n  }\n}',
): (typeof documents)['fragment GeneratorDetailCard on GeneratorDetailObject {\n  description\n  name\n  schemaJson\n}\n\nquery getGeneratorByName($name: String!) {\n  generator(input: {name: $name}) {\n    ...GeneratorDetailCard\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment GeneratorCard on GeneratorObject {\n  description\n  name\n}\n\nquery getGenerators {\n  generators {\n    description\n    name\n  }\n}',
): (typeof documents)['fragment GeneratorCard on GeneratorObject {\n  description\n  name\n}\n\nquery getGenerators {\n  generators {\n    description\n    name\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query getNoteById($id: ID!) {\n  note(id: $id) {\n    ...NoteCard\n  }\n}\n\nmutation updateNote($input: UpdateNoteInput!) {\n  updateNote(input: $input) {\n    ...NoteCard\n  }\n}',
): (typeof documents)['query getNoteById($id: ID!) {\n  note(id: $id) {\n    ...NoteCard\n  }\n}\n\nmutation updateNote($input: UpdateNoteInput!) {\n  updateNote(input: $input) {\n    ...NoteCard\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment NoteCard on NoteObject {\n  author\n  content\n  createdAt\n  id\n  updatedAt\n}\n\nquery getNotes {\n  notes {\n    ...NoteCard\n  }\n}',
): (typeof documents)['fragment NoteCard on NoteObject {\n  author\n  content\n  createdAt\n  id\n  updatedAt\n}\n\nquery getNotes {\n  notes {\n    ...NoteCard\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation createNote($input: CreateNoteInput!) {\n  createNote(input: $input) {\n    ...NoteCard\n  }\n}',
): (typeof documents)['mutation createNote($input: CreateNoteInput!) {\n  createNote(input: $input) {\n    ...NoteCard\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment PlanTaskRow on TaskObject {\n  assignee\n  category\n  createdAt\n  description\n  id\n  planId\n  projectRelation {\n    id\n    name\n  }\n  requirementsJson\n  status\n  summary\n  title\n  updatedAt\n}\n\nfragment ProjectDetails on ProjectObject {\n  id\n  name\n}\n\nfragment PlanDetails on PlanObject {\n  assignee\n  author\n  category\n  createdAt\n  description\n  id\n  projectId\n  projectRelation {\n    ...ProjectDetails\n  }\n  status\n  summary\n  title\n  updatedAt\n}\n\nquery getPlanById($id: ID!) {\n  plan(id: $id) {\n    ...PlanDetails\n  }\n}\n\nquery getTasksByPlanId($input: TasksByPlanIdInput!) {\n  tasksByPlanId(input: $input) {\n    ...PlanTaskRow\n  }\n}\n\nmutation PlanDetailEnqueuePlanRun($input: EnqueuePlanRunInput!) {\n  enqueuePlanRun(input: $input) {\n    executionBackend\n    jobId\n    planId\n    queuePosition\n    queueTotal\n  }\n}\n\nmutation PlanDetailCancelPlanRun($input: CancelPlanRunInput!) {\n  cancelPlanRun(input: $input) {\n    activeJobIdsCouldNotCancel\n    noMatchingJob\n    planId\n    planStatusAfter\n    removedJobIds\n    signaledActiveRunToStop\n  }\n}\n\nmutation PlanDetailSetPlanStatus($input: SetPlanStatusInput!) {\n  setPlanStatus(input: $input) {\n    id\n    status\n    title\n    updatedAt\n  }\n}\n\nmutation PlanDetailUpdateTask($input: UpdateTaskInput!) {\n  updateTask(input: $input) {\n    ...PlanTaskRow\n  }\n}\n\nquery PlanDetailIndexLoader($planId: ID!) {\n  plan(id: $planId) {\n    ...PlanDetails\n  }\n  tasksByPlanId(input: {planId: $planId}) {\n    ...PlanTaskRow\n  }\n  planOutputStreamChunks(input: {planId: $planId}) {\n    id\n    content\n    createdAt\n    iteration\n    planId\n  }\n  metrics {\n    recentPlanRunsMetrics(planId: $planId, limit: 25) {\n      executionBackend\n      finishedOn\n      jobId\n      taskRunMetrics {\n        atEnd {\n          rssMb\n        }\n      }\n    }\n  }\n}',
): (typeof documents)['fragment PlanTaskRow on TaskObject {\n  assignee\n  category\n  createdAt\n  description\n  id\n  planId\n  projectRelation {\n    id\n    name\n  }\n  requirementsJson\n  status\n  summary\n  title\n  updatedAt\n}\n\nfragment ProjectDetails on ProjectObject {\n  id\n  name\n}\n\nfragment PlanDetails on PlanObject {\n  assignee\n  author\n  category\n  createdAt\n  description\n  id\n  projectId\n  projectRelation {\n    ...ProjectDetails\n  }\n  status\n  summary\n  title\n  updatedAt\n}\n\nquery getPlanById($id: ID!) {\n  plan(id: $id) {\n    ...PlanDetails\n  }\n}\n\nquery getTasksByPlanId($input: TasksByPlanIdInput!) {\n  tasksByPlanId(input: $input) {\n    ...PlanTaskRow\n  }\n}\n\nmutation PlanDetailEnqueuePlanRun($input: EnqueuePlanRunInput!) {\n  enqueuePlanRun(input: $input) {\n    executionBackend\n    jobId\n    planId\n    queuePosition\n    queueTotal\n  }\n}\n\nmutation PlanDetailCancelPlanRun($input: CancelPlanRunInput!) {\n  cancelPlanRun(input: $input) {\n    activeJobIdsCouldNotCancel\n    noMatchingJob\n    planId\n    planStatusAfter\n    removedJobIds\n    signaledActiveRunToStop\n  }\n}\n\nmutation PlanDetailSetPlanStatus($input: SetPlanStatusInput!) {\n  setPlanStatus(input: $input) {\n    id\n    status\n    title\n    updatedAt\n  }\n}\n\nmutation PlanDetailUpdateTask($input: UpdateTaskInput!) {\n  updateTask(input: $input) {\n    ...PlanTaskRow\n  }\n}\n\nquery PlanDetailIndexLoader($planId: ID!) {\n  plan(id: $planId) {\n    ...PlanDetails\n  }\n  tasksByPlanId(input: {planId: $planId}) {\n    ...PlanTaskRow\n  }\n  planOutputStreamChunks(input: {planId: $planId}) {\n    id\n    content\n    createdAt\n    iteration\n    planId\n  }\n  metrics {\n    recentPlanRunsMetrics(planId: $planId, limit: 25) {\n      executionBackend\n      finishedOn\n      jobId\n      taskRunMetrics {\n        atEnd {\n          rssMb\n        }\n      }\n    }\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation updatePlan($input: UpdatePlanInput!) {\n  updatePlan(input: $input) {\n    assignee\n    author\n    category\n    createdAt\n    description\n    id\n    projectId\n    status\n    summary\n    title\n    updatedAt\n  }\n}',
): (typeof documents)['mutation updatePlan($input: UpdatePlanInput!) {\n  updatePlan(input: $input) {\n    assignee\n    author\n    category\n    createdAt\n    description\n    id\n    projectId\n    status\n    summary\n    title\n    updatedAt\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query getTaskById($id: ID!) {\n  task(id: $id) {\n    assignee\n    category\n    createdAt\n    description\n    id\n    planId\n    projectRelation {\n      id\n      name\n    }\n    requirementsJson\n    status\n    summary\n    title\n    updatedAt\n  }\n}',
): (typeof documents)['query getTaskById($id: ID!) {\n  task(id: $id) {\n    assignee\n    category\n    createdAt\n    description\n    id\n    planId\n    projectRelation {\n      id\n      name\n    }\n    requirementsJson\n    status\n    summary\n    title\n    updatedAt\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query getTaskForEditById($id: ID!) {\n  task(id: $id) {\n    assignee\n    category\n    createdAt\n    description\n    id\n    planId\n    projectRelation {\n      id\n      name\n    }\n    requirementsJson\n    status\n    summary\n    title\n    updatedAt\n  }\n}\n\nmutation updateTask($input: UpdateTaskInput!) {\n  updateTask(input: $input) {\n    id\n    title\n    planId\n    status\n    assignee\n    category\n    description\n    summary\n    createdAt\n    updatedAt\n  }\n}',
): (typeof documents)['query getTaskForEditById($id: ID!) {\n  task(id: $id) {\n    assignee\n    category\n    createdAt\n    description\n    id\n    planId\n    projectRelation {\n      id\n      name\n    }\n    requirementsJson\n    status\n    summary\n    title\n    updatedAt\n  }\n}\n\nmutation updateTask($input: UpdateTaskInput!) {\n  updateTask(input: $input) {\n    id\n    title\n    planId\n    status\n    assignee\n    category\n    description\n    summary\n    createdAt\n    updatedAt\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation createTask($input: CreateTaskInput!) {\n  createTask(input: $input) {\n    id\n    title\n    planId\n    status\n    assignee\n    category\n    description\n    summary\n    createdAt\n    updatedAt\n  }\n}',
): (typeof documents)['mutation createTask($input: CreateTaskInput!) {\n  createTask(input: $input) {\n    id\n    title\n    planId\n    status\n    assignee\n    category\n    description\n    summary\n    createdAt\n    updatedAt\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment PlanCard on PlanObject {\n  assignee\n  author\n  category\n  createdAt\n  description\n  id\n  projectRelation {\n    id\n    name\n  }\n  status\n  summary\n  taskCount\n  title\n  updatedAt\n}\n\nquery getPlanAssigneeOptions {\n  listDistinctAuthorsAndAssignees\n}\n\nquery getPlanCountsByStatus {\n  planCountsByStatus {\n    count\n    status\n  }\n}\n\nquery getPlansByStatus($input: ListPlansByStatusInput!) {\n  allPlansCount: listPlansByStatus(input: {statuses: []}) {\n    totalCount\n  }\n  queuedPlansCount: listPlansByStatus(input: {statuses: ["QUEUED"]}) {\n    totalCount\n  }\n  listPlansByStatus(input: $input) {\n    plans {\n      ...PlanCard\n    }\n    totalCount\n  }\n}',
): (typeof documents)['fragment PlanCard on PlanObject {\n  assignee\n  author\n  category\n  createdAt\n  description\n  id\n  projectRelation {\n    id\n    name\n  }\n  status\n  summary\n  taskCount\n  title\n  updatedAt\n}\n\nquery getPlanAssigneeOptions {\n  listDistinctAuthorsAndAssignees\n}\n\nquery getPlanCountsByStatus {\n  planCountsByStatus {\n    count\n    status\n  }\n}\n\nquery getPlansByStatus($input: ListPlansByStatusInput!) {\n  allPlansCount: listPlansByStatus(input: {statuses: []}) {\n    totalCount\n  }\n  queuedPlansCount: listPlansByStatus(input: {statuses: ["QUEUED"]}) {\n    totalCount\n  }\n  listPlansByStatus(input: $input) {\n    plans {\n      ...PlanCard\n    }\n    totalCount\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation createPlan($input: CreatePlanInput!) {\n  createPlan(input: $input) {\n    id\n    title\n    author\n    category\n    status\n    createdAt\n    updatedAt\n    description\n    assignee\n    project\n    projectId\n    summary\n  }\n}',
): (typeof documents)['mutation createPlan($input: CreatePlanInput!) {\n  createPlan(input: $input) {\n    id\n    title\n    author\n    category\n    status\n    createdAt\n    updatedAt\n    description\n    assignee\n    project\n    projectId\n    summary\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation TestWorkflow($input: EnqueuePlanRunInput!) {\n  enqueuePlanRun(input: $input) {\n    executionBackend\n    jobId\n    planId\n  }\n}',
): (typeof documents)['mutation TestWorkflow($input: EnqueuePlanRunInput!) {\n  enqueuePlanRun(input: $input) {\n    executionBackend\n    jobId\n    planId\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment ProjectPageDetails on ProjectObject {\n  createdAt\n  description\n  id\n  name\n  nxProjectName\n  updatedAt\n}\n\nquery getProjectById($id: ID!, $limit: Float, $offset: Float) {\n  project(id: $id) {\n    ...ProjectPageDetails\n  }\n  projectTasksResult: tasksByProjectId(\n    input: {projectId: $id, limit: $limit, offset: $offset}\n  ) {\n    tasks {\n      assignee\n      requirementsJson\n      summary\n      title\n      updatedAt\n      category\n      createdAt\n      description\n      id\n      planId\n    }\n    totalCount\n  }\n}',
): (typeof documents)['fragment ProjectPageDetails on ProjectObject {\n  createdAt\n  description\n  id\n  name\n  nxProjectName\n  updatedAt\n}\n\nquery getProjectById($id: ID!, $limit: Float, $offset: Float) {\n  project(id: $id) {\n    ...ProjectPageDetails\n  }\n  projectTasksResult: tasksByProjectId(\n    input: {projectId: $id, limit: $limit, offset: $offset}\n  ) {\n    tasks {\n      assignee\n      requirementsJson\n      summary\n      title\n      updatedAt\n      category\n      createdAt\n      description\n      id\n      planId\n    }\n    totalCount\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment ProjectCard on ProjectObject {\n  createdAt\n  description\n  id\n  name\n  nxProjectName\n  plans {\n    title\n  }\n  tasks {\n    title\n  }\n  updatedAt\n}\n\nquery getProjects {\n  projects {\n    ...ProjectCard\n  }\n}',
): (typeof documents)['fragment ProjectCard on ProjectObject {\n  createdAt\n  description\n  id\n  name\n  nxProjectName\n  plans {\n    title\n  }\n  tasks {\n    title\n  }\n  updatedAt\n}\n\nquery getProjects {\n  projects {\n    ...ProjectCard\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation createProject($input: CreateProjectInput!) {\n  createProject(input: $input) {\n    id\n    name\n    description\n    nxProjectName\n    createdAt\n    updatedAt\n  }\n}',
): (typeof documents)['mutation createProject($input: CreateProjectInput!) {\n  createProject(input: $input) {\n    id\n    name\n    description\n    nxProjectName\n    createdAt\n    updatedAt\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query getPrompt($id: ID!) {\n  customPrompt(id: $id) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    projectId\n    promptType\n    title\n    updatedAt\n    userId\n  }\n}\n\nmutation updatePrompt($input: UpdateCustomPromptInput!) {\n  updateCustomPrompt(input: $input) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    promptType\n    title\n    updatedAt\n  }\n}\n\nmutation deletePrompt($id: ID!) {\n  deleteCustomPrompt(id: $id)\n}\n\nmutation writePromptToFileSystem($id: ID!) {\n  writeCustomPromptToFileSystem(id: $id)\n}',
): (typeof documents)['query getPrompt($id: ID!) {\n  customPrompt(id: $id) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    projectId\n    promptType\n    title\n    updatedAt\n    userId\n  }\n}\n\nmutation updatePrompt($input: UpdateCustomPromptInput!) {\n  updateCustomPrompt(input: $input) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    promptType\n    title\n    updatedAt\n  }\n}\n\nmutation deletePrompt($id: ID!) {\n  deleteCustomPrompt(id: $id)\n}\n\nmutation writePromptToFileSystem($id: ID!) {\n  writeCustomPromptToFileSystem(id: $id)\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment PromptCard on CustomPromptObject {\n  content\n  createdAt\n  description\n  filePath\n  id\n  labels\n  promptType\n  title\n  updatedAt\n}\n\nquery getPrompts($input: ListCustomPromptsInput) {\n  customPrompts(input: $input) {\n    ...PromptCard\n  }\n}',
): (typeof documents)['fragment PromptCard on CustomPromptObject {\n  content\n  createdAt\n  description\n  filePath\n  id\n  labels\n  promptType\n  title\n  updatedAt\n}\n\nquery getPrompts($input: ListCustomPromptsInput) {\n  customPrompts(input: $input) {\n    ...PromptCard\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation createPrompt($input: CreateCustomPromptInput!) {\n  createCustomPrompt(input: $input) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    promptType\n    title\n    updatedAt\n  }\n}',
): (typeof documents)['mutation createPrompt($input: CreateCustomPromptInput!) {\n  createCustomPrompt(input: $input) {\n    content\n    createdAt\n    description\n    filePath\n    id\n    labels\n    promptType\n    title\n    updatedAt\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query getPullRequestDetail($input: GetPullInput!) {\n  pull(input: $input) {\n    author\n    baseRef\n    createdAt\n    headRef\n    headSha\n    htmlUrl\n    mergedAt\n    number\n    state\n    title\n    updatedAt\n  }\n}',
): (typeof documents)['query getPullRequestDetail($input: GetPullInput!) {\n  pull(input: $input) {\n    author\n    baseRef\n    createdAt\n    headRef\n    headSha\n    htmlUrl\n    mergedAt\n    number\n    state\n    title\n    updatedAt\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment PullRequestCard on PullListItemObject {\n  author\n  baseRef\n  createdAt\n  headRef\n  headSha\n  htmlUrl\n  mergedAt\n  number\n  state\n  title\n  updatedAt\n}\n\nquery getPullRequests($input: ListPullsInput!) {\n  pulls(input: $input) {\n    ...PullRequestCard\n  }\n}',
): (typeof documents)['fragment PullRequestCard on PullListItemObject {\n  author\n  baseRef\n  createdAt\n  headRef\n  headSha\n  htmlUrl\n  mergedAt\n  number\n  state\n  title\n  updatedAt\n}\n\nquery getPullRequests($input: ListPullsInput!) {\n  pulls(input: $input) {\n    ...PullRequestCard\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment JobDetailsCard on JobObject {\n  data\n  executionBackend\n  failedReason\n  finishedOn\n  id\n  name\n  processedOn\n  progress\n  returnvalue\n  state\n  taskRunMetrics {\n    atEnd {\n      heapUsedMb\n      rssMb\n    }\n    atStart {\n      heapUsedMb\n      rssMb\n    }\n  }\n  timestamp\n}\n\nquery getQueueJobDetails($jobId: ID!, $queueName: String!) {\n  job(jobId: $jobId, queueName: $queueName) {\n    ...JobDetailsCard\n  }\n}\n\nmutation QueueJobDetailRetry($input: RetryJobInput!) {\n  retryJob(input: $input) {\n    error\n    jobId\n    success\n  }\n}\n\nmutation QueueJobDetailCancelPlanRun($input: CancelPlanRunInput!) {\n  cancelPlanRun(input: $input) {\n    activeJobIdsCouldNotCancel\n    noMatchingJob\n    planId\n    planStatusAfter\n    removedJobIds\n    signaledActiveRunToStop\n  }\n}',
): (typeof documents)['fragment JobDetailsCard on JobObject {\n  data\n  executionBackend\n  failedReason\n  finishedOn\n  id\n  name\n  processedOn\n  progress\n  returnvalue\n  state\n  taskRunMetrics {\n    atEnd {\n      heapUsedMb\n      rssMb\n    }\n    atStart {\n      heapUsedMb\n      rssMb\n    }\n  }\n  timestamp\n}\n\nquery getQueueJobDetails($jobId: ID!, $queueName: String!) {\n  job(jobId: $jobId, queueName: $queueName) {\n    ...JobDetailsCard\n  }\n}\n\nmutation QueueJobDetailRetry($input: RetryJobInput!) {\n  retryJob(input: $input) {\n    error\n    jobId\n    success\n  }\n}\n\nmutation QueueJobDetailCancelPlanRun($input: CancelPlanRunInput!) {\n  cancelPlanRun(input: $input) {\n    activeJobIdsCouldNotCancel\n    noMatchingJob\n    planId\n    planStatusAfter\n    removedJobIds\n    signaledActiveRunToStop\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query getQueue($input: QueueDetailsInput!) {\n  queue(input: $input) {\n    activeCount\n    completedCount\n    delayedCount\n    failedCount\n    jobs {\n      hasNext\n      jobs {\n        data\n        failedReason\n        finishedOn\n        id\n        name\n        processedOn\n        progress\n        returnvalue\n        state\n        timestamp\n      }\n    }\n    name\n    waitingCount\n  }\n}',
): (typeof documents)['query getQueue($input: QueueDetailsInput!) {\n  queue(input: $input) {\n    activeCount\n    completedCount\n    delayedCount\n    failedCount\n    jobs {\n      hasNext\n      jobs {\n        data\n        failedReason\n        finishedOn\n        id\n        name\n        processedOn\n        progress\n        returnvalue\n        state\n        timestamp\n      }\n    }\n    name\n    waitingCount\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment QueueCard on QueueStatsObject {\n  activeCount\n  completedCount\n  delayedCount\n  failedCount\n  name\n  waitingCount\n}\n\nquery getQueues {\n  queues {\n    ...QueueCard\n  }\n}',
): (typeof documents)['fragment QueueCard on QueueStatsObject {\n  activeCount\n  completedCount\n  delayedCount\n  failedCount\n  name\n  waitingCount\n}\n\nquery getQueues {\n  queues {\n    ...QueueCard\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'mutation createQueue($input: CreateQueueInput!) {\n  createQueue(input: $input) {\n    success\n    queueName\n    error\n  }\n}',
): (typeof documents)['mutation createQueue($input: CreateQueueInput!) {\n  createQueue(input: $input) {\n    success\n    queueName\n    error\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query getSearchResults($input: SearchInput!) {\n  search(input: $input) {\n    chunks {\n      content\n      id\n      planId\n      planTitle\n      similarity\n      source\n      sourcePath\n      sourceRepo\n      sourceSha\n      taskId\n      taskTitle\n    }\n  }\n}',
): (typeof documents)['query getSearchResults($input: SearchInput!) {\n  search(input: $input) {\n    chunks {\n      content\n      id\n      planId\n      planTitle\n      similarity\n      source\n      sourcePath\n      sourceRepo\n      sourceSha\n      taskId\n      taskTitle\n    }\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment UsageDailyStatsRow on DailyStatsObject {\n  date\n  plansCompleted\n  plansCreated\n  plansUpdated\n  tasksCompleted\n  tasksCreated\n  tasksUpdated\n}\n\nquery getUsageDailyStats($start: String!, $end: String!) {\n  dailyStatsRange(start: $start, end: $end) {\n    items {\n      ...UsageDailyStatsRow\n    }\n  }\n}',
): (typeof documents)['fragment UsageDailyStatsRow on DailyStatsObject {\n  date\n  plansCompleted\n  plansCreated\n  plansUpdated\n  tasksCompleted\n  tasksCreated\n  tasksUpdated\n}\n\nquery getUsageDailyStats($start: String!, $end: String!) {\n  dailyStatsRange(start: $start, end: $end) {\n    items {\n      ...UsageDailyStatsRow\n    }\n  }\n}'];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
