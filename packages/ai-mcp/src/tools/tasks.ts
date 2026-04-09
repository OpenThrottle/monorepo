/**
 * @description Registers task CRUD tools: create_task, create_tasks, get_task, get_tasks_by_plan_id, get_remaining_tasks_for_plan, list_tasks_by_category, update_task, delete_task.
 */

/* eslint-disable no-await-in-loop */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPostgresConfig, getDefaultGitHubUser } from '../config.js';
import type { TaskRow } from '../cortex-client.js';
import {
  createTask as cortexCreateTask,
  deleteTask as cortexDeleteTask,
  deleteTaskEmbeddings as cortexDeleteTaskEmbeddings,
  getCommitLinksByTaskId as cortexGetCommitLinksByTaskId,
  getRemainingTasksByPlanId as cortexGetRemainingTasksByPlanId,
  getTaskById as cortexGetTaskById,
  getTasksByPlanId as cortexGetTasksByPlanId,
  insertTaskEmbedding as cortexInsertTaskEmbedding,
  listTasksByCategory as cortexListTasksByCategory,
  updateTask as cortexUpdateTask,
} from '../cortex-client.js';
import { embedQuery } from '../embedding.js';
import { buildTaskContentForEmbedding } from '../embedding-content.js';
import {
  createTaskInputSchema,
  createTasksInputSchema,
  deleteTaskInputSchema,
  getRemainingTasksForPlanInputSchema,
  getTaskInputSchema,
  getTasksByPlanIdInputSchema,
  listTasksByCategoryInputSchema,
  updateTaskInputSchema,
} from '../schemas.js';
import { configMissingContent, invalidArgsContent } from './errors.js';

type CreateTasksResult =
  | { content: { text: string; type: 'text' }[]; isError: true }
  | {
      content: { text: string; type: 'text' }[];
      structuredContent: { created: { id: string; title: string }[] };
    };

type GetRemainingTasksForPlanResult =
  | { content: { text: string; type: 'text' }[]; isError: true }
  | {
      content: { text: string; type: 'text' }[];
      structuredContent: { tasks: readonly TaskRow[] };
    };

async function createTasksHandler(
  args: z.infer<typeof createTasksInputSchema>,
): Promise<CreateTasksResult> {
  const parsed = createTasksInputSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  const config = getPostgresConfig();
  if (!config) {
    return configMissingContent();
  }

  const data = parsed.data;
  const results: { id: string; title: string }[] = [];

  try {
    const defaultGh = getDefaultGitHubUser();
    for (const item of data.tasks) {
      const task = await cortexCreateTask(config, {
        assignee: defaultGh ?? item.assignee ?? null,
        category: item.category ?? null,
        description: item.description ?? null,
        planId: data.planId,
        project: item.project ?? null,
        requirements: item.requirements ?? [],
        status: (item.status ?? 'PENDING').toUpperCase(),
        summary: item.summary ?? null,
        title: item.title,
      });

      results.push({ id: task.id, title: task.title });

      const content = buildTaskContentForEmbedding(task);
      if (content.trim()) {
        const embedding = await embedQuery(content);

        if (embedding) {
          await cortexInsertTaskEmbedding(
            config,
            task.id,
            content,
            embedding as number[],
          );
        }
      }
    }
    const text = `Created ${results.length} task(s):\n${results.map((r) => ` - ${r.id} ${r.title}`).join('\n')}`;

    return {
      content: [{ text, type: 'text' as const }],
      structuredContent: { created: results },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? (err as Error).message : String(err);
    const text = `create_tasks failed: ${message}`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
    };
  }
}

async function handleGetRemainingTasksForPlan(args: {
  planId: string;
}): Promise<GetRemainingTasksForPlanResult> {
  const parsed = getRemainingTasksForPlanInputSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  const config = getPostgresConfig();
  if (!config) {
    return configMissingContent();
  }

  try {
    const { planId } = parsed.data;

    const tasks = await cortexGetRemainingTasksByPlanId(config, planId);
    const isEmpty = tasks.length === 0;
    const text = isEmpty
      ? 'No remaining tasks for this plan.'
      : JSON.stringify(tasks, null, 2);

    return {
      content: [{ text, type: 'text' as const }],
      structuredContent: { tasks },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? (err as Error).message : String(err);
    const text = `get_remaining_tasks_for_plan failed: ${message}`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
    };
  }
}

export function registerTaskTools(server: McpServer): void {
  server.registerTool(
    'create_task',
    {
      description: `Create a new task in Cortex. Requires planId and title; optional description, category, status (default: pending), requirements (array), summary (per-task wrap-up: actions, usage notes, or why blocked), assignee (GitHub username), project (NX project name from the project graph).`,
      inputSchema: {
        assignee: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        planId: z.uuid(),
        project: z.string().nullable().optional(),
        requirements: z.array(z.unknown()).optional(),
        status: z.string().min(1).optional(),
        summary: z.string().nullable().optional(),
        title: z.string().min(1),
      },
    },
    async (args: z.infer<typeof createTaskInputSchema>) => {
      const parsed = createTaskInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      const config = getPostgresConfig();
      if (!config) {
        return configMissingContent();
      }

      try {
        const defaultGh = getDefaultGitHubUser();
        const taskInput = {
          ...parsed.data,
          assignee: defaultGh ?? parsed.data.assignee ?? null,
        };

        const task = await cortexCreateTask(config, taskInput);
        const content = buildTaskContentForEmbedding(task);

        if (content.trim()) {
          const embedding = await embedQuery(content);
          if (embedding) {
            await cortexInsertTaskEmbedding(
              config,
              task.id,
              content,
              embedding,
            );
          }
        }

        const text = `Created task: ${task.id}\n${JSON.stringify(task, null, 2)}`;
        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { task },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const text = `create_task failed: ${message}`;

        return {
          content: [{ text, type: 'text' as const }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'create_tasks',
    {
      description: `Create multiple tasks for a plan in one call. Requires planId and tasks (array of objects with title; optional description, category, status, requirements, summary, assignee, project (NX project name)). Returns created task ids and summaries.`,
      inputSchema: {
        planId: createTasksInputSchema.shape.planId,
        tasks: createTasksInputSchema.shape.tasks,
      },
    },
    createTasksHandler,
  );

  server.registerTool(
    'get_task',
    {
      description: `Fetch a task by id (UUID). Returns the task row or not found.`,
      inputSchema: { id: z.uuid() },
    },
    async (args: z.infer<typeof getTaskInputSchema>) => {
      const parsed = getTaskInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      const config = getPostgresConfig();
      if (!config) {
        return configMissingContent();
      }

      try {
        const task = await cortexGetTaskById(config, parsed.data.id);
        if (!task) {
          return {
            content: [
              {
                text: `No task found for id: ${parsed.data.id}`,
                type: 'text' as const,
              },
            ],
            isError: true,
          };
        }

        const relatedCommits = await cortexGetCommitLinksByTaskId(
          config,
          task.id,
        );
        const payload = { relatedCommits: [...relatedCommits], task };

        return {
          content: [
            { text: JSON.stringify(payload, null, 2), type: 'text' as const },
          ],
          structuredContent: payload,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const text = `get_task failed: ${message}`;

        return {
          content: [{ text, type: 'text' as const }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'get_tasks_by_plan_id',
    {
      description: `Fetch all tasks for a plan by plan id (UUID). Ordered by created_at.`,
      inputSchema: { planId: z.uuid() },
    },
    async (args: z.infer<typeof getTasksByPlanIdInputSchema>) => {
      const parsed = getTasksByPlanIdInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      const config = getPostgresConfig();
      if (!config) {
        return configMissingContent();
      }

      try {
        const tasks = await cortexGetTasksByPlanId(config, parsed.data.planId);
        const text =
          tasks.length === 0
            ? 'No tasks for this plan.'
            : JSON.stringify(tasks, null, 2);

        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { tasks },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const text = `get_tasks_by_plan_id failed: ${message}`;

        return {
          content: [{ text, type: 'text' as const }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'get_remaining_tasks_for_plan',
    {
      description: `Fetch tasks for a plan that are not completed or skipped (i.e. status is BACKLOG, BLOCKED, IN_PROGRESS, or PENDING). Use for "What tasks remain for <plan>?" Ordered by created_at.`,
      inputSchema: { planId: z.uuid() },
    },
    handleGetRemainingTasksForPlan,
  );

  server.registerTool(
    'list_tasks_by_category',
    {
      description: `List tasks filtered by category (e.g. infra, documentation). Requires category; optional status, planId, limit (1–200). Use when you need tasks across plans for a given category. Ordered by created_at. Returns task list with planId on each task.`,
      inputSchema: {
        category: listTasksByCategoryInputSchema.shape.category,
        limit: listTasksByCategoryInputSchema.shape.limit,
        planId: listTasksByCategoryInputSchema.shape.planId,
        status: listTasksByCategoryInputSchema.shape.status,
      },
    },
    async (args: z.infer<typeof listTasksByCategoryInputSchema>) => {
      const parsed = listTasksByCategoryInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      const config = getPostgresConfig();
      if (!config) {
        return configMissingContent();
      }

      try {
        const tasks = await cortexListTasksByCategory(config, parsed.data);
        const text =
          tasks.length === 0
            ? `No tasks found for category "${parsed.data.category}".`
            : JSON.stringify(tasks, null, 2);

        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { tasks },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const text = `list_tasks_by_category failed: ${message}`;

        return {
          content: [{ text, type: 'text' as const }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'update_task',
    {
      description: `Update a task by id. Pass id and any of: title, description, category, status, planId, requirements, summary, assignee, project (NX project name from the project graph).`,
      inputSchema: {
        assignee: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        id: z.uuid(),
        planId: z.uuid().optional(),
        project: z.string().nullable().optional(),
        requirements: z.array(z.unknown()).optional(),
        status: z.string().min(1).optional(),
        summary: z.string().nullable().optional(),
        title: z.string().min(1).optional(),
      },
    },
    async (args: z.infer<typeof updateTaskInputSchema>) => {
      const parsed = updateTaskInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      const config = getPostgresConfig();
      if (!config) {
        return configMissingContent();
      }

      try {
        const { id, ...rest } = parsed.data;
        const defaultGh = getDefaultGitHubUser();

        if (
          defaultGh !== undefined &&
          rest.assignee !== undefined &&
          rest.assignee !== null
        ) {
          rest.assignee = defaultGh;
        }

        const task = await cortexUpdateTask(config, id, rest);
        if (!task) {
          const text = `No task found for id: ${id}`;

          return {
            content: [{ text, type: 'text' as const }],
            isError: true,
          };
        }

        const content = buildTaskContentForEmbedding(task);
        if (content.trim()) {
          const embedding = await embedQuery(content);

          if (embedding) {
            await cortexDeleteTaskEmbeddings(config, task.id);
            await cortexInsertTaskEmbedding(
              config,
              task.id,
              content,
              embedding,
            );
          }
        }

        const text = JSON.stringify(task, null, 2);

        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { task },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        return {
          content: [
            { text: `update_task failed: ${message}`, type: 'text' as const },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'delete_task',
    {
      description: `Delete a task by id. Returns whether a row was deleted.`,
      inputSchema: { id: z.uuid() },
    },
    async (args: z.infer<typeof deleteTaskInputSchema>) => {
      const parsed = deleteTaskInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      const config = getPostgresConfig();
      if (!config) {
        return configMissingContent();
      }

      try {
        const deleted = await cortexDeleteTask(config, parsed.data.id);
        const text = deleted
          ? `Task ${parsed.data.id} deleted.`
          : `No task found for id: ${parsed.data.id}.`;

        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { deleted },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        return {
          content: [
            { text: `delete_task failed: ${message}`, type: 'text' as const },
          ],
          isError: true,
        };
      }
    },
  );
}
