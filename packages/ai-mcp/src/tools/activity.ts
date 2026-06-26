/**
 * @description Registers activity tools: get_activity_by_date, get_last_activity.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPostgresConfig } from '../config.ts';
import type { LastActivityResult as CortexLastActivityResult } from '../cortex-client.ts';
import {
  getActivityByDateRange as cortexGetActivityByDateRange,
  getLastActivityForPlanOrTask as cortexGetLastActivityForPlanOrTask,
} from '../cortex-client.ts';
import {
  getActivityByDateInputSchema,
  getLastActivityInputSchema,
} from '../schemas.ts';

type ActivityByDateResult = {
  content: { text: string; type: 'text' }[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

type GetLastActivityResult =
  | { content: { text: string; type: 'text' }[]; isError: true }
  | {
      content: { text: string; type: 'text' }[];
      structuredContent: { result: CortexLastActivityResult | null };
    };

async function handleGetActivityByDate(args: {
  date?: string;
  daysBack?: number;
}): Promise<ActivityByDateResult> {
  const parsed = getActivityByDateInputSchema.safeParse(args);
  if (!parsed.success) {
    const text = `Invalid arguments: ${parsed.error.message}`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
    };
  }

  const config = getPostgresConfig();
  if (!config) {
    const text = `Cortex Postgres is not configured.`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
    };
  }

  const data = parsed.data;

  let startIso: string;
  let endIso: string;

  if (data.date != null) {
    const [y, m, d] = data.date.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));

    startIso = `${data.date}T00:00:00.000Z`;
    endIso = next.toISOString();
  } else {
    const n = data.daysBack ?? 7;
    const endDate = new Date();
    const startDate = new Date(endDate);

    startDate.setUTCDate(startDate.getUTCDate() - n);

    startIso = startDate.toISOString();
    endIso = endDate.toISOString();
  }
  try {
    const activity = await cortexGetActivityByDateRange(startIso, endIso);

    const lines: string[] = [
      `Activity from ${startIso} to ${endIso}:`,
      '',
      `Commits (${activity.commits.length}):`,
      ...(activity.commits.length === 0
        ? ['  (none)']
        : activity.commits.map(
            (c) =>
              `  ${c.createdAt} | ${c.planTitle}${c.taskTitle ? ` / ${c.taskTitle}` : ''} | ${c.repo} ${c.sha.slice(0, 7)} | ${c.message ?? '(no message)'}`,
          )),
      '',
      `Plan output chunks (${activity.outputChunks.length}):`,
      ...(activity.outputChunks.length === 0
        ? ['  (none)']
        : activity.outputChunks.map(
            (o) =>
              `  ${o.createdAt} | ${o.planTitle} | ${o.content.slice(0, 80)}${o.content.length > 80 ? '…' : ''}`,
          )),
      '',
      `Tasks updated (${activity.tasksUpdated.length}):`,
      ...(activity.tasksUpdated.length === 0
        ? ['  (none)']
        : activity.tasksUpdated.map(
            (t) =>
              `  ${t.updatedAt} | ${t.planTitle} | ${t.title} → ${t.status}`,
          )),
    ];

    const text = lines.join('\n');

    return {
      content: [{ text, type: 'text' as const }],
      structuredContent: activity as unknown as Record<string, unknown>,
    };
  } catch (error: unknown) {
    const isError = error instanceof Error;
    const message = isError ? (error as Error).message : String(error);
    const text = `get_activity_by_date failed: ${message}`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
    };
  }
}

async function handleGetLastActivity(args: {
  planId: string;
  taskId?: string;
}): Promise<GetLastActivityResult> {
  const parsed = getLastActivityInputSchema.safeParse(args);
  if (!parsed.success) {
    const text = `Invalid arguments: ${parsed.error.message}`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
    };
  }

  const config = getPostgresConfig();
  if (!config) {
    const text = `Cortex Postgres is not configured.`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
    };
  }

  try {
    const { planId, taskId } = parsed.data;
    const activityResult = await cortexGetLastActivityForPlanOrTask(
      planId,
      taskId,
    );

    const text =
      activityResult === null
        ? 'No activity found for this plan or task.'
        : JSON.stringify(activityResult, null, 2);

    return {
      content: [{ text, type: 'text' as const }],
      structuredContent: { result: activityResult },
    };
  } catch (error: unknown) {
    const isError = error instanceof Error;
    const message = isError ? (error as Error).message : String(error);
    const text = `get_last_activity failed: ${message}`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
    };
  }
}

export function registerActivityTools(server: McpServer): void {
  server.registerTool(
    'get_activity_by_date',
    {
      description: `Fetch activity (commits, plan output chunks, tasks updated) for "worked on / shipped on X date or X days ago" answers. Provide either date (YYYY-MM-DD) for that day, or daysBack (1–365) for the last N days. Uses commit_links, plan_output_stream, and task updated_at.`,
      inputSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
          .optional(),
        daysBack: z.number().int().min(1).max(365).optional(),
      },
    },
    handleGetActivityByDate,
  );

  server.registerTool(
    'get_last_activity',
    {
      description: `Answer "What was the last thing we did for <plan> or <task>?" Returns the single most recent activity: last commit (commit_links), last plan output chunk, or last task update. Provide planId; optionally taskId to scope to that task.`,
      inputSchema: {
        planId: z.uuid(),
        taskId: z.uuid().optional(),
      },
    },
    handleGetLastActivity,
  );
}
