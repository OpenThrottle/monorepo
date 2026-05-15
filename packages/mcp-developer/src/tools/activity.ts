/**
 * @description Registers activity tools: get_activity_by_date, get_last_activity.
 * Uses GraphQL only (activityByDate, activityByDateRange, lastActivity).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  type GetActivityByDateQuery,
  type GetLastActivityQuery,
  GetActivityByDateDocument,
  GetLastActivityDocument,
} from '../__generated__/graphql.js';
import {
  ActivityByDateInputSchema,
  LastActivityInputSchema,
} from '../__generated__/schemas.js';
import type { GenericResult } from '../types/index.js';
import { getAuthToken } from '../auth/index.js';
import { invalidArgsContent } from '../utils/errors.js';
import { runTool } from '../utils/tool-result.js';

type GetActivityByDateResult = GenericResult<{
  activity: GetActivityByDateQuery['activityByDate'];
}>;

type GetLastActivityResult = GenericResult<{
  result: GetLastActivityQuery['lastActivity'];
}>;

/** Exactly one of date (YYYY-MM-DD) or daysBack (1–365). */
export const getActivityByDateToolParameters =
  ActivityByDateInputSchema().refine(
    (data) => {
      const hasDate = data.date != null && data.date !== '';
      const hasDaysBack = data.daysBack != null;
      return hasDate !== hasDaysBack;
    },
    { message: 'Provide exactly one of date (YYYY-MM-DD) or daysBack (1–365)' },
  );

export const getLastActivityToolParameters = LastActivityInputSchema();

export const getActivityByDateToolDescription =
  'Fetch activity (commits, plan output chunks, tasks updated) for "worked on / shipped on X date or X days ago" answers. Provide either date (YYYY-MM-DD) for that day, or daysBack (1–365) for the last N days. Uses commit_links, plan_output_stream, and task updated_at.';

export const getLastActivityToolDescription =
  'Answer "What was the last thing we did for <plan> or <task>?" Returns the single most recent activity: last commit (commit_links), last plan output chunk, or last task update. Provide planId; optionally taskId to scope to that task.';

export async function getActivityByDateToolHandler(
  args: z.infer<typeof getActivityByDateToolParameters>,
): Promise<GetActivityByDateResult> {
  const parsed = getActivityByDateToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ activity: GetActivityByDateQuery['activityByDate'] }>(
    'get_activity_by_date',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        GetActivityByDateDocument,
        {
          input: parsed.data,
        },
      );

      const activity = result?.activityByDate;
      if (!activity) return null;

      const lines: string[] = [
        `Activity (totalCount: ${activity.totalCount}, hasNext: ${activity.hasNext}):`,
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
      return { structuredContent: { activity }, text };
    },
  );
}

export async function getLastActivityToolHandler(
  args: z.infer<typeof getLastActivityToolParameters>,
): Promise<GetLastActivityResult> {
  const parsed = getLastActivityToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ result: GetLastActivityQuery['lastActivity'] }>(
    'get_last_activity',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        GetLastActivityDocument,
        {
          input: {
            planId: parsed.data.planId,
            taskId: parsed.data.taskId ?? null,
          },
        },
      );

      const last = result?.lastActivity ?? null;
      const text =
        last === null
          ? 'No activity found for this plan or task.'
          : JSON.stringify(last, null, 2);
      return { structuredContent: { result: last }, text };
    },
  );
}

export function registerActivityTools(server: McpServer): void {
  server.registerTool(
    'get_activity_by_date',
    {
      description: getActivityByDateToolDescription,
      inputSchema: getActivityByDateToolParameters,
    },
    getActivityByDateToolHandler,
  );

  server.registerTool(
    'get_last_activity',
    {
      description: getLastActivityToolDescription,
      inputSchema: getLastActivityToolParameters,
    },
    getLastActivityToolHandler,
  );
}
