/**
 * @description Registers task CRUD tools: create_task, create_tasks, get_task, get_tasks_by_plan_id, get_remaining_tasks_for_plan, list_tasks_by_category, update_task, delete_task.
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
  type UpdateTaskMutation,
  CreateTaskDocument,
  DeleteTaskDocument,
  GetRemainingTasksByPlanIdDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  GetTasksDocument,
  UpdateTaskDocument,
} from '../__generated__/graphql.js';
import {
  CreateTaskInputSchema,
  DeleteTaskInputSchema,
  RemainingTasksByPlanIdInputSchema,
  TasksByPlanIdInputSchema,
  UpdateTaskInputSchema,
} from '../__generated__/schemas.js';
import type { GenericResult } from '../types/index.js';
import { filterTasksByCategory } from '../utils/filters.js';
import { getAuthToken } from '../auth/index.js';
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

type UpdateTaskResult = GenericResult<{
  task: UpdateTaskMutation['updateTask'];
}>;

const createTaskSchema = CreateTaskInputSchema();
const deleteTaskSchema = DeleteTaskInputSchema();
const getRemainingTasksForPlanSchema = RemainingTasksByPlanIdInputSchema();
const getTasksByPlanIdSchema = TasksByPlanIdInputSchema();
const getTaskSchema = z.object({ id: z.string().min(1) });
const updateTaskSchema = UpdateTaskInputSchema();

const createTasksItemSchema = z.object({
  assignee: z.string().nullish(),
  category: z.string().nullish(),
  description: z.string().nullish(),
  project: z.string().nullish(),
  projectId: z.string().uuid().nullish(),
  requirements: z.array(z.unknown()).optional(),
  status: z.string().nullish(),
  summary: z.string().nullish(),
  title: z.string().min(1),
});

const createTasksSchema = z.object({
  planId: z.string().uuid(),
  tasks: z.array(createTasksItemSchema).min(1),
});

const listTasksByCategorySchema = z.object({
  category: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional(),
  planId: z.string().uuid().optional(),
  status: z.string().min(1).optional(),
});

async function createTaskHandler(
  args: z.infer<typeof createTaskSchema>,
): Promise<CreateTaskResult> {
  const parsed = createTaskSchema.safeParse(args);
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

async function createTasksHandler(
  args: z.infer<typeof createTasksSchema>,
): Promise<CreateTasksResult> {
  const parsed = createTasksSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  const { planId, tasks: items } = parsed.data;
  const created: { id: string; title: string }[] = [];
  const token = getAuthToken();

  return runTool<{ created: readonly { id: string; title: string }[] }>(
    'create_tasks',
    async () => {
      for (const item of items) {
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

async function deleteTaskHandler(
  args: z.infer<typeof deleteTaskSchema>,
): Promise<DeleteTaskResult> {
  const parsed = deleteTaskSchema.safeParse(args);
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

async function getTaskHandler(
  args: z.infer<typeof getTaskSchema>,
): Promise<GetTaskResult> {
  const parsed = getTaskSchema.safeParse(args);
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

async function getTasksByPlanIdHandler(
  args: z.infer<typeof getTasksByPlanIdSchema>,
): Promise<GetTasksByPlanIdResult> {
  const parsed = getTasksByPlanIdSchema.safeParse(args);
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

async function getRemainingTasksForPlanHandler(
  args: z.infer<typeof getRemainingTasksForPlanSchema>,
): Promise<GetRemainingTasksForPlanResult> {
  const parsed = getRemainingTasksForPlanSchema.safeParse(args);
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

async function listTasksByCategoryHandler(
  args: z.infer<typeof listTasksByCategorySchema>,
): Promise<ListTasksByCategoryResult> {
  const parsed = listTasksByCategorySchema.safeParse(args);
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

async function updateTaskHandler(
  args: z.infer<typeof updateTaskSchema>,
): Promise<UpdateTaskResult> {
  const parsed = updateTaskSchema.safeParse(args);
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
      description: `Create a new task in Cortex. Requires planId and title; optional description, category, status (default: PENDING), requirements (JSON string), summary, assignee (e.g. GitHub username), project, projectId.`,
      inputSchema: createTaskSchema,
    },
    createTaskHandler,
  );

  server.registerTool(
    'create_tasks',
    {
      description: `Create multiple tasks for a plan in one call. Requires planId and tasks (array of objects with title; optional description, category, status, requirements, summary, assignee, project, projectId). Returns created task ids and titles.`,
      inputSchema: createTasksSchema,
    },
    createTasksHandler,
  );

  server.registerTool(
    'delete_task',
    {
      description: `Delete a task by id. Returns whether a row was deleted.`,
      inputSchema: deleteTaskSchema,
    },
    deleteTaskHandler,
  );

  server.registerTool(
    'get_task',
    {
      description: `Fetch a task by id (UUID). Returns the task row or not found.`,
      inputSchema: getTaskSchema,
    },
    getTaskHandler,
  );

  server.registerTool(
    'get_tasks_by_plan_id',
    {
      description: `Fetch all tasks for a plan by plan id (UUID). Ordered by createdAt.`,
      inputSchema: getTasksByPlanIdSchema,
    },
    getTasksByPlanIdHandler,
  );

  server.registerTool(
    'get_remaining_tasks_for_plan',
    {
      description: `Fetch remaining tasks for a plan (status PENDING, IN_PROGRESS, BLOCKED). Use for "What tasks remain for this plan?".`,
      inputSchema: getRemainingTasksForPlanSchema,
    },
    getRemainingTasksForPlanHandler,
  );

  server.registerTool(
    'list_tasks_by_category',
    {
      description: `List tasks filtered by category (e.g. infra, documentation). Optional: planId (UUID), status, limit (1–200). Returns tasks ordered by createdAt.`,
      inputSchema: listTasksByCategorySchema,
    },
    listTasksByCategoryHandler,
  );

  server.registerTool(
    'update_task',
    {
      description: `Update a task by id. Pass id and any of: title, description, status, category, assignee, planId, project, projectId, requirements, summary.`,
      inputSchema: updateTaskSchema,
    },
    updateTaskHandler,
  );
}
