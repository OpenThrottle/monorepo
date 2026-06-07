/**
 * @description Registers task CRUD tools: create_task, create_tasks, get_task, get_tasks_by_plan_id, get_remaining_tasks_for_plan, list_tasks_by_category, reorder_plan_tasks, update_task, delete_task.
 */

/* eslint-disable no-await-in-loop */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  type CreateTaskMutation,
  type GetRemainingTasksByPlanIdQuery,
  type GetTaskQuery,
  type GetTasksByPlanIdQuery,
  type GetTasksQuery,
  type ReorderPlanTasksMutation,
  type UpdateTaskMutation,
  CreateTaskDocument,
  DeleteTaskDocument,
  GetRemainingTasksByPlanIdDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  GetTasksDocument,
  ReorderPlanTasksDocument,
  UpdateTaskDocument,
} from '../__generated__/graphql.js';
import {
  CreateTaskInputSchema,
  DeleteTaskInputSchema,
  RemainingTasksByPlanIdInputSchema,
  ReorderPlanTasksInputSchema,
  TasksByPlanIdInputSchema,
  UpdateTaskInputSchema,
} from '../__generated__/schemas.js';
import type { GenericResult } from '../types/index.js';
import {
  maxSortOrderFromTasks,
  resolveBatchCreateSortOrders,
} from '../utils/batch-create-sort-order.js';
import { filterTasksByCategory } from '../utils/filters.js';
import { getAuthToken } from '../auth/get-auth-token.js';
import { invalidArgsContent } from '../utils/errors.js';
import { runTool } from '../utils/tool-result.js';

export type TaskListItem = GetTasksQuery['tasks'][number];

type CreateTaskResult = GenericResult<{
  task: CreateTaskMutation['createTask'];
}>;

type CreateTasksResult = GenericResult<{
  created: readonly { id: string; title: string }[];
}>;

type DeleteTaskResult = GenericResult<{
  deleted: boolean;
}>;

type GetTaskResult = GenericResult<{
  task: GetTaskQuery['task'];
}>;

type GetTasksByPlanIdResult = GenericResult<{
  tasks: GetTasksByPlanIdQuery['tasksByPlanId'];
}>;

type GetRemainingTasksForPlanResult = GenericResult<{
  tasks: GetRemainingTasksByPlanIdQuery['remainingTasksByPlanId'];
}>;

type ListTasksByCategoryResult = GenericResult<{
  tasks: readonly TaskListItem[];
}>;

type ReorderPlanTasksResult = GenericResult<{
  tasks: ReorderPlanTasksMutation['reorderPlanTasks'];
}>;

type UpdateTaskResult = GenericResult<{
  task: UpdateTaskMutation['updateTask'];
}>;

export const createTaskToolParameters = CreateTaskInputSchema();
export const deleteTaskToolParameters = DeleteTaskInputSchema();
export const getRemainingTasksForPlanToolParameters =
  RemainingTasksByPlanIdInputSchema();
export const getTasksByPlanIdToolParameters = TasksByPlanIdInputSchema();
export const getTaskToolParameters = z.object({ id: z.string().min(1) });
export const reorderPlanTasksToolParameters = ReorderPlanTasksInputSchema();
export const updateTaskToolParameters = UpdateTaskInputSchema();

const createTasksItemSchema = z.object({
  assignee: z.string().nullish(),
  category: z.string().nullish(),
  description: z.string().nullish(),
  project: z.string().nullish(),
  projectId: z.string().uuid().nullish(),
  requirements: z.array(z.unknown()).optional(),
  sortOrder: z.number().int().nullish(),
  status: z.string().nullish(),
  summary: z.string().nullish(),
  title: z.string().min(1),
});

export const createTasksToolParameters = z.object({
  planId: z.string().uuid(),
  tasks: z.array(createTasksItemSchema).min(1),
});

export const listTasksByCategoryToolParameters = z.object({
  category: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional(),
  planId: z.string().uuid().optional(),
  status: z.string().min(1).optional(),
});

export const createTaskToolDescription = `Create a new task in Cortex. Requires planId and title; optional description, category, status (default: PENDING), requirements (JSON string), summary, assignee (e.g. GitHub username), project, projectId, sortOrder (execution order within plan; auto-assigned when omitted).`;

export const createTasksToolDescription = `Create multiple tasks for a plan in one call. Requires planId and tasks (array of objects with title; optional description, category, status, requirements, summary, assignee, project, projectId, sortOrder). When sortOrder is omitted per item, tasks append after the plan max sortOrder (1000, 2000, …) preserving array order. Explicit sortOrder per item is respected. Returns created task ids and titles.`;

export const deleteTaskToolDescription = `Delete a task by id. Returns whether a row was deleted.`;

export const getTaskToolDescription = `Fetch a task by id (UUID). Returns the task row or not found.`;

export const getTasksByPlanIdToolDescription = `Fetch all tasks for a plan by plan id (UUID). Ordered by sortOrder ASC, then createdAt ASC.`;

export const getRemainingTasksForPlanToolDescription = `Fetch remaining tasks for a plan (status PENDING, IN_PROGRESS, BLOCKED). Ordered by sortOrder ASC, then createdAt ASC. Use for "What tasks remain for this plan?".`;

export const listTasksByCategoryToolDescription = `List tasks filtered by category (e.g. infra, documentation). Optional: planId (UUID), status, limit (1–200). Returns tasks ordered by sortOrder ASC within each plan, then createdAt ASC.`;

export const reorderPlanTasksToolDescription = `Reorder tasks within a plan. Requires planId and taskIds (array of task UUIDs in desired order). Renumbers sortOrder to 1000, 2000, … atomically. Prefer this over delete-and-recreate when fixing task execution order.`;

export const updateTaskToolDescription = `Update a task by id. Pass id and any of: title, description, status, category, assignee, planId, project, projectId, requirements, summary, sortOrder (execution order within plan; gap-based insert e.g. 1500 between 1000 and 2000).`;

export async function createTaskToolHandler(
  args: z.infer<typeof createTaskToolParameters>,
): Promise<CreateTaskResult> {
  const parsed = createTaskToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ task: CreateTaskMutation['createTask'] }>(
    'create_task',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, CreateTaskDocument, {
        input: parsed.data,
      });

      const task = result?.createTask;
      if (!task) return null;

      const text = `Created task: ${task.id}\n${JSON.stringify(task, null, 2)}`;

      return { structuredContent: { task }, text };
    },
  );
}

export async function createTasksToolHandler(
  args: z.infer<typeof createTasksToolParameters>,
): Promise<CreateTasksResult> {
  const parsed = createTasksToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  const { planId, tasks: items } = parsed.data;
  const created: { id: string; title: string }[] = [];
  const token = getAuthToken();

  return runTool<{ created: readonly { id: string; title: string }[] }>(
    'create_tasks',
    async () => {
      const existingResult = await executeGraphqlWithAuth(
        token,
        GetTasksByPlanIdDocument,
        { input: { planId } },
      );
      const existingTasks = existingResult?.tasksByPlanId ?? [];
      const existingMax = maxSortOrderFromTasks(existingTasks);
      const sortOrders = resolveBatchCreateSortOrders(existingMax, items);

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const input = {
          assignee: item.assignee ?? null,
          category: item.category ?? null,
          description: item.description ?? null,
          planId,
          project: item.project ?? null,
          projectId: item.projectId ?? null,
          requirements:
            item.requirements != null
              ? JSON.stringify(item.requirements)
              : null,
          sortOrder: sortOrders[index],
          status: item.status ?? null,
          summary: item.summary ?? null,
          title: item.title,
        };

        const result = await executeGraphqlWithAuth(token, CreateTaskDocument, {
          input,
        });

        const task = result?.createTask;
        if (!task) continue;

        created.push({ id: task.id, title: task.title });
      }

      const text =
        created.length === 0
          ? 'create_tasks: no tasks were created.'
          : `Created ${created.length} task(s):\n${created.map((r) => ` - ${r.id} ${r.title}`).join('\n')}`;

      return { structuredContent: { created }, text };
    },
  );
}

export async function deleteTaskToolHandler(
  args: z.infer<typeof deleteTaskToolParameters>,
): Promise<DeleteTaskResult> {
  const parsed = deleteTaskToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ deleted: boolean }>('delete_task', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, DeleteTaskDocument, {
      input: parsed.data,
    });

    const deleted = result?.deleteTask ?? false;
    const text = deleted
      ? `Deleted task: ${parsed.data.id}`
      : `Task not found or already deleted: ${parsed.data.id}`;
    return { structuredContent: { deleted }, text };
  });
}

export async function getTaskToolHandler(
  args: z.infer<typeof getTaskToolParameters>,
): Promise<GetTaskResult> {
  const parsed = getTaskToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ task: GetTaskQuery['task'] }>('get_task', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, GetTaskDocument, {
      id: parsed.data.id,
    });

    const task = result?.task;
    if (!task) return null;

    const text = `Task: ${task.id}\n${JSON.stringify(task, null, 2)}`;

    return { structuredContent: { task }, text };
  });
}

export async function getTasksByPlanIdToolHandler(
  args: z.infer<typeof getTasksByPlanIdToolParameters>,
): Promise<GetTasksByPlanIdResult> {
  const parsed = getTasksByPlanIdToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{
    tasks: GetTasksByPlanIdQuery['tasksByPlanId'];
  }>('get_tasks_by_plan_id', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      GetTasksByPlanIdDocument,
      { input: parsed.data },
    );

    const tasks = result?.tasksByPlanId ?? [];
    const text =
      tasks.length === 0
        ? 'No tasks for this plan.'
        : `Tasks (${tasks.length}):\n${JSON.stringify(tasks, null, 2)}`;

    return { structuredContent: { tasks }, text };
  });
}

export async function getRemainingTasksForPlanToolHandler(
  args: z.infer<typeof getRemainingTasksForPlanToolParameters>,
): Promise<GetRemainingTasksForPlanResult> {
  const parsed = getRemainingTasksForPlanToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{
    tasks: GetRemainingTasksByPlanIdQuery['remainingTasksByPlanId'];
  }>('get_remaining_tasks_for_plan', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      GetRemainingTasksByPlanIdDocument,
      { input: parsed.data },
    );

    const tasks = result?.remainingTasksByPlanId ?? [];
    const text =
      tasks.length === 0
        ? 'No remaining tasks for this plan.'
        : JSON.stringify(tasks, null, 2);

    return { structuredContent: { tasks }, text };
  });
}

export async function listTasksByCategoryToolHandler(
  args: z.infer<typeof listTasksByCategoryToolParameters>,
): Promise<ListTasksByCategoryResult> {
  const parsed = listTasksByCategoryToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  const { category, planId, status, limit } = parsed.data;

  return runTool<{ tasks: readonly TaskListItem[] }>(
    'list_tasks_by_category',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, GetTasksDocument, {});

      const allTasks = result?.tasks ?? [];
      const tasks = filterTasksByCategory(
        allTasks,
        category,
        planId ?? undefined,
        status ?? undefined,
        limit ?? undefined,
      );

      const text =
        tasks.length === 0
          ? `No tasks found for category "${category}".`
          : `Tasks (${tasks.length}):\n${JSON.stringify(tasks, null, 2)}`;

      return { structuredContent: { tasks }, text };
    },
  );
}

export async function reorderPlanTasksToolHandler(
  args: z.infer<typeof reorderPlanTasksToolParameters>,
): Promise<ReorderPlanTasksResult> {
  const parsed = reorderPlanTasksToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ tasks: ReorderPlanTasksMutation['reorderPlanTasks'] }>(
    'reorder_plan_tasks',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        ReorderPlanTasksDocument,
        { input: parsed.data },
      );

      const tasks = result?.reorderPlanTasks ?? [];

      const text =
        tasks.length === 0
          ? 'reorder_plan_tasks: no tasks were reordered.'
          : `Reordered ${tasks.length} task(s):\n${JSON.stringify(tasks, null, 2)}`;

      return { structuredContent: { tasks }, text };
    },
  );
}

export async function updateTaskToolHandler(
  args: z.infer<typeof updateTaskToolParameters>,
): Promise<UpdateTaskResult> {
  const parsed = updateTaskToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ task: UpdateTaskMutation['updateTask'] }>(
    'update_task',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, UpdateTaskDocument, {
        input: parsed.data,
      });

      const task = result?.updateTask;
      if (!task) return null;

      const text = `Updated task: ${task.id}\n${JSON.stringify(task, null, 2)}`;
      return { structuredContent: { task }, text };
    },
  );
}

export function registerTaskTools(server: McpServer): void {
  server.registerTool(
    'create_task',
    {
      description: createTaskToolDescription,
      inputSchema: createTaskToolParameters,
    },
    createTaskToolHandler,
  );

  server.registerTool(
    'create_tasks',
    {
      description: createTasksToolDescription,
      inputSchema: createTasksToolParameters,
    },
    createTasksToolHandler,
  );

  server.registerTool(
    'delete_task',
    {
      description: deleteTaskToolDescription,
      inputSchema: deleteTaskToolParameters,
    },
    deleteTaskToolHandler,
  );

  server.registerTool(
    'get_task',
    {
      description: getTaskToolDescription,
      inputSchema: getTaskToolParameters,
    },
    getTaskToolHandler,
  );

  server.registerTool(
    'get_tasks_by_plan_id',
    {
      description: getTasksByPlanIdToolDescription,
      inputSchema: getTasksByPlanIdToolParameters,
    },
    getTasksByPlanIdToolHandler,
  );

  server.registerTool(
    'get_remaining_tasks_for_plan',
    {
      description: getRemainingTasksForPlanToolDescription,
      inputSchema: getRemainingTasksForPlanToolParameters,
    },
    getRemainingTasksForPlanToolHandler,
  );

  server.registerTool(
    'list_tasks_by_category',
    {
      description: listTasksByCategoryToolDescription,
      inputSchema: listTasksByCategoryToolParameters,
    },
    listTasksByCategoryToolHandler,
  );

  server.registerTool(
    'reorder_plan_tasks',
    {
      description: reorderPlanTasksToolDescription,
      inputSchema: reorderPlanTasksToolParameters,
    },
    reorderPlanTasksToolHandler,
  );

  server.registerTool(
    'update_task',
    {
      description: updateTaskToolDescription,
      inputSchema: updateTaskToolParameters,
    },
    updateTaskToolHandler,
  );
}
