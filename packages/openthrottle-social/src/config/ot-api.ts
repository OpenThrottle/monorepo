/** @description Env keys for the OpenThrottle GraphQL endpoint and token, as the hooks and MCP read them. */
export const OT_ENV_KEYS = {
  authToken: 'OPENTHROTTLE_MCP_AUTH_TOKEN',
  graphqlUrl: 'OPENTHROTTLE_GRAPHQL_URL',
  socialPlanId: 'OPENTHROTTLE_SOCIAL_PLAN_ID',
} as const;

export type OtEnvKeysKey = keyof typeof OT_ENV_KEYS;
export type OtEnvKeysValue = (typeof OT_ENV_KEYS)[OtEnvKeysKey];

/** @description The task fields the social scripts read. */
export const OT_TASK_SELECTION = `id requirementsJson sortOrder status summary title updatedAt completedAt`;

/** @description Lists a plan's tasks in sortOrder. */
export const OT_TASKS_BY_PLAN_QUERY = `query socialTasksByPlanId($input: TasksByPlanIdInput!) { tasksByPlanId(input: $input) { ${OT_TASK_SELECTION} } }`;

/** @description Updates one task. */
export const OT_UPDATE_TASK_MUTATION = `mutation socialUpdateTask($input: UpdateTaskInput!) { updateTask(input: $input) { ${OT_TASK_SELECTION} } }`;

/** @description Appends a line to the plan's output stream. */
export const OT_APPEND_OUTPUT_MUTATION = `mutation socialAppendPlanOutput($input: AppendPlanOutputInput!) { appendPlanOutput(input: $input) { id } }`;
