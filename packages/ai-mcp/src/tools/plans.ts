/**
 * @description Registers plan CRUD tools: create_plan, get_plan, update_plan, delete_plan, list_plans_by_status.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDefaultGitHubUser, resolveActor } from '../config.ts';
import {
  createPlan as cortexCreatePlan,
  deletePlan as cortexDeletePlan,
  deletePlanEmbeddings as cortexDeletePlanEmbeddings,
  getCommitLinksByPlanId as cortexGetCommitLinksByPlanId,
  getPlanById as cortexGetPlanById,
  insertPlanEmbedding as cortexInsertPlanEmbedding,
  listPlansByStatus,
  updatePlan as cortexUpdatePlan,
} from '../cortex-client.ts';
import { embedQuery } from '../embedding.ts';
import { buildPlanContentForEmbedding } from '../embedding-content.ts';
import {
  createPlanInputSchema,
  deletePlanInputSchema,
  getPlanInputSchema,
  listPlansByStatusInputSchema,
  updatePlanInputSchema,
} from '../schemas.ts';
import { invalidArgsContent } from './errors.ts';

export function registerPlanTools(server: McpServer): void {
  server.registerTool(
    'list_plans_by_status',
    {
      description: `List plans in Cortex filtered by status. Status comes from plan JSON metadata (e.g. PENDING, IN_PROGRESS, COMPLETED, BLOCKED, QUEUED, SKIPPED). Use to answer questions like "what plans are pending?". Optional project filters by NX project name (from the project graph). Optional projectId filters by project UUID (FK to projects table).`,
      inputSchema: {
        project: z.string().nullable().optional(),
        projectId: z.uuid().nullable().optional(),
        status: z.string().min(1),
      },
    },
    async (args: z.infer<typeof listPlansByStatusInputSchema>) => {
      const parsed = listPlansByStatusInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      try {
        const result = await listPlansByStatus(
          parsed.data.status,
          undefined,
          parsed.data.project ?? null,
          parsed.data.projectId ?? null,
        );

        const text =
          `Plans with status "${parsed.data.status}":\n` +
          (result.plans.length === 0
            ? '  (none)'
            : result.plans
                .map(
                  (p) =>
                    `  - ${p.id}: ${p.title} (author: ${p.author}, category: ${p.category})`,
                )
                .join('\n'));
        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { plans: result.plans },
        };
      } catch (error) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);

        return {
          content: [
            {
              text: `list_plans_by_status failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'create_plan',
    {
      description: `Create a new plan in Cortex. Requires title, author, category; optional description, status (default: pending), summary (PRD summarization: next actions, usage guides, wrap-up notes), assignee (GitHub username), project (NX project name from the project graph). When GITHUB_USER is set, that value is used for author and assignee (enforcing GitHub username over display name).`,
      inputSchema: {
        assignee: z.string().nullable().optional(),
        author: z.string().min(1),
        category: z.string().min(1),
        description: z.string().nullable().optional(),
        project: z.string().nullable().optional(),
        status: z.string().min(1).optional(),
        summary: z.string().nullable().optional(),
        title: z.string().min(1),
      },
    },
    async (args: z.infer<typeof createPlanInputSchema>) => {
      const parsed = createPlanInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      try {
        const defaultGh = getDefaultGitHubUser();
        const planInput = {
          ...parsed.data,
          assignee: resolveActor(parsed.data.assignee, defaultGh),
          author: defaultGh ?? parsed.data.author,
        };
        const plan = await cortexCreatePlan(planInput);
        const content = buildPlanContentForEmbedding(plan);
        if (content.trim()) {
          const embedding = await embedQuery(content);
          if (embedding) {
            await cortexInsertPlanEmbedding(plan.id, content, embedding);
          }
        }
        const text = `Created plan: ${plan.id}\n${JSON.stringify(plan, null, 2)}`;
        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { plan },
        };
      } catch (error) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);

        return {
          content: [
            {
              text: `create_plan failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'get_plan',
    {
      description: `Fetch a plan by id (UUID). Returns the plan row or not found.`,
      inputSchema: { id: z.uuid() },
    },
    async (args: z.infer<typeof getPlanInputSchema>) => {
      const parsed = getPlanInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      try {
        const plan = await cortexGetPlanById(parsed.data.id);
        if (!plan) {
          return {
            content: [
              {
                text: `No plan found for id: ${parsed.data.id}`,
                type: 'text' as const,
              },
            ],
            isError: true,
          };
        }
        const relatedCommits = await cortexGetCommitLinksByPlanId(plan.id);
        const payload = { plan, relatedCommits: [...relatedCommits] };
        return {
          content: [
            { text: JSON.stringify(payload, null, 2), type: 'text' as const },
          ],
          structuredContent: payload,
        };
      } catch (error) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);

        return {
          content: [
            {
              text: `get_plan failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'update_plan',
    {
      description: `Update a plan by id. Pass id and any of: title, author, category, description, status, summary, assignee, project (NX project name from the project graph).`,
      inputSchema: {
        assignee: z.string().nullable().optional(),
        author: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        id: z.uuid(),
        project: z.string().nullable().optional(),
        status: z.string().min(1).optional(),
        summary: z.string().nullable().optional(),
        title: z.string().min(1).optional(),
      },
    },
    async (args: z.infer<typeof updatePlanInputSchema>) => {
      const parsed = updatePlanInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      try {
        const { id, ...rest } = parsed.data;
        const defaultGh = getDefaultGitHubUser();
        // Uniform precedence (see resolveActor): GITHUB_USER wins when set; otherwise caller value.
        // Only touch fields the caller actually supplied so absent fields stay untouched.
        if (rest.author !== undefined) {
          rest.author = defaultGh ?? rest.author;
        }
        if (rest.assignee !== undefined) {
          rest.assignee = resolveActor(rest.assignee, defaultGh);
        }
        const plan = await cortexUpdatePlan(id, rest);
        if (!plan) {
          return {
            content: [
              { text: `No plan found for id: ${id}`, type: 'text' as const },
            ],
            isError: true,
          };
        }
        const content = buildPlanContentForEmbedding(plan);
        if (content.trim()) {
          const embedding = await embedQuery(content);
          if (embedding) {
            await cortexDeletePlanEmbeddings(plan.id);
            await cortexInsertPlanEmbedding(plan.id, content, embedding);
          }
        }
        return {
          content: [
            {
              text: JSON.stringify(plan, null, 2),
              type: 'text' as const,
            },
          ],
          structuredContent: { plan },
        };
      } catch (error) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);

        return {
          content: [
            {
              text: `update_plan failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'delete_plan',
    {
      description: `Delete a plan by id (cascades to tasks). Returns whether a row was deleted.`,
      inputSchema: { id: z.uuid() },
    },
    async (args: z.infer<typeof deletePlanInputSchema>) => {
      const parsed = deletePlanInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      try {
        const deleted = await cortexDeletePlan(parsed.data.id);
        const text = deleted
          ? `Plan ${parsed.data.id} deleted.`
          : `No plan found for id: ${parsed.data.id}.`;

        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { deleted },
        };
      } catch (error) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);

        return {
          content: [
            {
              text: `delete_plan failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
