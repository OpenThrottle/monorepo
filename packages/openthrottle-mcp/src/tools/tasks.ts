/**
 * @description Task CRUD tool handlers + schemas: create_task, create_tasks, get_task, get_tasks_by_plan_id, get_remaining_tasks_for_plan, list_tasks_by_category, reorder_plan_tasks, update_task, promote_task, delete_task. Wired up via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  type CreateTaskMutation,
  type CreateTasksMutation,
  type GetRemainingTasksByPlanIdQuery,
  type GetTaskQuery,
  type GetTasksByPlanIdQuery,
  type GetTasksQuery,
  type PromoteTaskToPlanMutation,
  type ReorderPlanTasksMutation,
  type UpdateTaskMutation,
  CreateTaskDocument,
  CreateTasksDocument,
  DeleteTaskDocument,
  GetRemainingTasksByPlanIdDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  GetTasksDocument,
  PromoteTaskToPlanDocument,
  ReorderPlanTasksDocument,
  UpdateTaskDocument,
} from '../__generated__/graphql.js';
import {
  CreateTaskInputSchema,
  DeleteTaskInputSchema,
  PromoteTaskToPlanInputSchema,
  RemainingTasksByPlanIdInputSchema,
  ReorderPlanTasksInputSchema,
  TasksByPlanIdInputSchema,
  UpdateTaskInputSchema,
} from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { filterTasksByCategory } from '../utils/filters.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

export type TaskListItem = GetTasksQuery['tasks'][number];

/**
 * Upper bound requested from the capped root tasks() query when fetching the
 * full list to filter client-side. Matches the server-side MAX_TASKS_LIMIT so
 * we get as many rows as the query allows in one round trip.
 */
const GET_TASKS_FETCH_LIMIT = 500;

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

type PromoteTaskResult = GenericResult<{
  promotion: PromoteTaskToPlanMutation['promoteTaskToPlan'];
}>;

export const createTaskToolParameters = CreateTaskInputSchema();
export const deleteTaskToolParameters = DeleteTaskInputSchema();
export const getRemainingTasksForPlanToolParameters =
  RemainingTasksByPlanIdInputSchema();
export const getTasksByPlanIdToolParameters = TasksByPlanIdInputSchema();
export const getTaskToolParameters = z.object({ id: z.string().min(1) });
export const promoteTaskToolParameters = PromoteTaskToPlanInputSchema();
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

export const createTaskToolDescription = `Create a new task in OpenThrottle. Requires planId and title; optional description, category, status (default: PENDING), requirements (JSON string), summary, assignee (e.g. GitHub username), project, projectId, sortOrder (execution order within plan; auto-assigned when omitted).`;

export const createTasksToolDescription = `Create multiple tasks for a plan in one call. Requires planId and tasks (array of objects with title; optional description, category, status, requirements, summary, assignee, project, projectId, sortOrder). When sortOrder is omitted per item, tasks append after the plan max sortOrder (1000, 2000, …) preserving array order. Explicit sortOrder per item is respected. Returns created task ids and titles.`;

export const deleteTaskToolDescription = `Delete a task by id. Returns whether a row was deleted.`;

export const getTaskToolDescription = `Fetch a task by id (UUID). Returns the task row or not found.`;

export const getTasksByPlanIdToolDescription = `Fetch all tasks for a plan by plan id (UUID). Ordered by sortOrder ASC, then createdAt ASC.`;

export const getRemainingTasksForPlanToolDescription = `Fetch remaining tasks for a plan (status PENDING, IN_PROGRESS, BLOCKED). Ordered by sortOrder ASC, then createdAt ASC. Use for "What tasks remain for this plan?".`;

export const listTasksByCategoryToolDescription = `List tasks filtered by category (e.g. infra, documentation). Optional: planId (UUID), status, limit (1–200). Returns tasks ordered by sortOrder ASC within each plan, then createdAt ASC.`;

export const reorderPlanTasksToolDescription = `Reorder tasks within a plan. Requires planId and taskIds (array of task UUIDs in desired order). Renumbers sortOrder to 1000, 2000, … atomically. Prefer this over delete-and-recreate when fixing task execution order.`;

export const updateTaskToolDescription = `Update a task by id. Pass id and any of: title, description, status, category, assignee, planId, project, projectId, requirements, summary, sortOrder (execution order within plan; gap-based insert e.g. 1500 between 1000 and 2000).`;

export const promoteTaskToolDescription = `Promote a task into a new, first-class plan. Validates the task is promotable (exists, not a lifecycle hook, not already promoted) then enqueues an async promotion job: it creates a new plan from the task (carrying its title, description, and tags), seeds an initial "Break down and scope this plan" task, and closes out the source task (status SKIPPED + \`promoted\` tag). Requires taskId; optional idempotencyKey (re-submitting the same key enqueues at most one job). Returns the accepted job id; the new plan is created asynchronously.`;

export async function createTaskToolHandler(
  args: z.infer<typeof createTaskToolParameters>,
): Promise<CreateTaskResult> {
  const parsed = createTaskToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
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
    return invalidArgsContent(parsed.error);
  }

  const { planId, tasks: items } = parsed.data;

  return runTool<{ created: readonly { id: string; title: string }[] }>(
    'create_tasks',
    async () => {
      const token = getAuthToken();
      // Single atomic round trip: the server's createTasks mutation inserts all tasks in one
      // transaction and computes MAX+1000 sortOrder stepping (explicit per-item sortOrder respected).
      const input = {
        planId,
        tasks: items.map((item) => ({
          assignee: item.assignee ?? null,
          category: item.category ?? null,
          description: item.description ?? null,
          project: item.project ?? null,
          projectId: item.projectId ?? null,
          requirements:
            item.requirements != null
              ? JSON.stringify(item.requirements)
              : null,
          sortOrder: item.sortOrder ?? null,
          status: item.status ?? null,
          summary: item.summary ?? null,
          title: item.title,
        })),
      };

      const result = await executeGraphqlWithAuth(token, CreateTasksDocument, {
        input,
      });

      const tasks: CreateTasksMutation['createTasks']['tasks'] =
        result?.createTasks?.tasks ?? [];
      const created = tasks.map((task) => ({ id: task.id, title: task.title }));

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
    return invalidArgsContent(parsed.error);
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
    return invalidArgsContent(parsed.error);
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
    return invalidArgsContent(parsed.error);
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
    return invalidArgsContent(parsed.error);
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
    return invalidArgsContent(parsed.error);
  }

  const { category, planId, status, limit } = parsed.data;

  return runTool<{ tasks: readonly TaskListItem[] }>(
    'list_tasks_by_category',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, GetTasksDocument, {
        limit: GET_TASKS_FETCH_LIMIT,
      });

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
    return invalidArgsContent(parsed.error);
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
    return invalidArgsContent(parsed.error);
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

export async function promoteTaskToolHandler(
  args: z.infer<typeof promoteTaskToolParameters>,
): Promise<PromoteTaskResult> {
  const parsed = promoteTaskToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{
    promotion: PromoteTaskToPlanMutation['promoteTaskToPlan'];
  }>('promote_task', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      PromoteTaskToPlanDocument,
      { input: parsed.data },
    );

    const promotion = result?.promoteTaskToPlan;
    if (!promotion) return null;

    if (!promotion.success) {
      throw new Error(promotion.error ?? 'Failed to promote task to a plan.');
    }

    const text = `Queued promotion of task ${parsed.data.taskId} (job ${promotion.jobId ?? 'unknown'}). The new plan is created asynchronously.`;
    return { structuredContent: { promotion }, text };
  });
}
