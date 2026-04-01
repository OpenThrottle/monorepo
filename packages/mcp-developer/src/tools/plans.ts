/**
 * @description Registers plan CRUD tools: list_plans_by_status, create_plan, get_plan, update_plan, delete_plan.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  CreatePlanDocument,
  DeletePlanDocument,
  GetPlanDocument,
  ListPlansByStatusDocument,
  UpdatePlanDocument,
} from '../__generated__/graphql.js';
import type {
  CreatePlanMutation,
  GetPlanQuery,
  ListPlansByStatusQuery,
  UpdatePlanMutation,
} from '../__generated__/graphql.js';
import {
  CreatePlanInputSchema,
  DeletePlanInputSchema,
  ListPlansByStatusInputSchema,
  UpdatePlanInputSchema,
} from '../__generated__/schemas.js';
import type { GenericResult } from '../types/index.js';
import { getAuthToken } from '../auth/index.js';
import { invalidArgsContent } from '../utils/errors.js';
import { runTool } from '../utils/tool-result.js';

type CreatePlanResult = GenericResult<{
  plan: CreatePlanMutation['createPlan'];
}>;

type DeletePlanResult = GenericResult<{
  deleted: boolean;
}>;

type GetPlanResult = GenericResult<{
  plan: GetPlanQuery['plan'];
}>;

type ListPlansByStatusResult = GenericResult<{
  plans: ListPlansByStatusQuery['listPlansByStatus']['plans'];
  totalCount: number;
}>;

type UpdatePlanResult = GenericResult<{
  plan: UpdatePlanMutation['updatePlan'];
}>;

const createPlanSchema = CreatePlanInputSchema();
const deletePlanSchema = DeletePlanInputSchema();
const getPlanSchema = z.object({ id: z.string().min(1) });
const listPlansByStatusSchema = ListPlansByStatusInputSchema();
const updatePlanSchema = UpdatePlanInputSchema();

async function listPlansByStatusHandler(
  args: z.infer<typeof listPlansByStatusSchema>,
): Promise<ListPlansByStatusResult> {
  const parsed = listPlansByStatusSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{
    plans: ListPlansByStatusQuery['listPlansByStatus']['plans'];
    totalCount: number;
  }>('list_plans_by_status', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      ListPlansByStatusDocument,
      { input: parsed.data },
    );

    const listResult = result?.listPlansByStatus;
    if (!listResult) return null;

    const { plans, totalCount } = listResult;
    const text =
      plans.length === 0
        ? `No plans found (totalCount: ${totalCount}).`
        : `Plans (${plans.length} of ${totalCount}):\n${JSON.stringify(plans, null, 2)}`;

    return { structuredContent: { plans, totalCount }, text };
  });
}

async function createPlanHandler(
  args: z.infer<typeof createPlanSchema>,
): Promise<CreatePlanResult> {
  const parsed = createPlanSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ plan: CreatePlanMutation['createPlan'] }>(
    'create_plan',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, CreatePlanDocument, {
        input: parsed.data,
      });

      const plan = result?.createPlan;
      if (!plan) return null;

      const text = `Created plan: ${plan.id}\n${JSON.stringify(plan, null, 2)}`;
      return { structuredContent: { plan }, text };
    },
  );
}

async function getPlanHandler(
  args: z.infer<typeof getPlanSchema>,
): Promise<GetPlanResult> {
  const parsed = getPlanSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ plan: GetPlanQuery['plan'] }>('get_plan', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, GetPlanDocument, {
      id: parsed.data.id,
    });

    const plan = result?.plan;
    if (!plan) return null;

    const text = `Plan: ${plan.id}\n${JSON.stringify(plan, null, 2)}`;
    return { structuredContent: { plan }, text };
  });
}

async function updatePlanHandler(
  args: z.infer<typeof updatePlanSchema>,
): Promise<UpdatePlanResult> {
  const parsed = updatePlanSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ plan: UpdatePlanMutation['updatePlan'] }>(
    'update_plan',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, UpdatePlanDocument, {
        input: parsed.data,
      });

      const plan = result?.updatePlan;
      if (!plan) return null;

      const text = `Updated plan: ${plan.id}\n${JSON.stringify(plan, null, 2)}`;
      return { structuredContent: { plan }, text };
    },
  );
}

async function deletePlanHandler(
  args: z.infer<typeof deletePlanSchema>,
): Promise<DeletePlanResult> {
  const parsed = deletePlanSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ deleted: boolean }>('delete_plan', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, DeletePlanDocument, {
      input: parsed.data,
    });

    const deleted = result?.deletePlan ?? false;
    const text = deleted
      ? `Deleted plan: ${parsed.data.id}`
      : `Plan not found or already deleted: ${parsed.data.id}`;

    return { structuredContent: { deleted }, text };
  });
}

export function registerPlanTools(server: McpServer): void {
  server.registerTool(
    'create_plan',
    {
      description: `Create a plan in Cortex. Required: title, author (e.g. GitHub username), category. Optional: description, status, assignee, project, projectId, summary.`,
      inputSchema: createPlanSchema,
    },
    createPlanHandler,
  );

  server.registerTool(
    'delete_plan',
    {
      description: `Delete a plan by id. Returns whether a row was deleted.`,
      inputSchema: deletePlanSchema,
    },
    deletePlanHandler,
  );

  server.registerTool(
    'get_plan',
    {
      description: `Fetch a plan by id (UUID). Returns the plan row or not found.`,
      inputSchema: getPlanSchema,
    },
    getPlanHandler,
  );

  server.registerTool(
    'list_plans_by_status',
    {
      description: `List plans in Cortex by status. Pass statuses (e.g. ["pending"], ["in_progress"], ["completed"]) and optional limit/offset, project, assignees, titleSubstring. Use for /cortex/pending or list by status.`,
      inputSchema: listPlansByStatusSchema,
    },
    listPlansByStatusHandler,
  );

  server.registerTool(
    'update_plan',
    {
      description: `Update a plan by id. Pass id and any of: title, description, status, author, assignee, category, project, projectId, summary.`,
      inputSchema: updatePlanSchema,
    },
    updatePlanHandler,
  );
}
