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
import { getAuthToken } from '../auth/get-auth-token.js';
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

export const createPlanToolParameters = CreatePlanInputSchema();
export const deletePlanToolParameters = DeletePlanInputSchema();
export const getPlanToolParameters = z.object({ id: z.string().min(1) });
export const listPlansByStatusToolParameters = ListPlansByStatusInputSchema();
export const updatePlanToolParameters = UpdatePlanInputSchema();

export const createPlanToolDescription = `Create a plan in Cortex. Required: title, author (e.g. GitHub username), category. Optional: description, status, assignee, project, projectId, summary.`;

export const deletePlanToolDescription = `Delete a plan by id. Returns whether a row was deleted.`;

export const getPlanToolDescription = `Fetch a plan by id (UUID). Returns the plan row or not found.`;

export const listPlansByStatusToolDescription = `List plans in Cortex by status. Pass statuses (e.g. ["pending"], ["in_progress"], ["completed"]) and optional limit/offset, project, assignees, titleSubstring. Use for /cortex/pending or list by status.`;

export const updatePlanToolDescription = `Update a plan by id. Pass id and any of: title, description, status, author, assignee, category, project, projectId, summary.`;

export async function listPlansByStatusToolHandler(
  args: z.infer<typeof listPlansByStatusToolParameters>,
): Promise<ListPlansByStatusResult> {
  const parsed = listPlansByStatusToolParameters.safeParse(args);
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

export async function createPlanToolHandler(
  args: z.infer<typeof createPlanToolParameters>,
): Promise<CreatePlanResult> {
  const parsed = createPlanToolParameters.safeParse(args);
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

export async function getPlanToolHandler(
  args: z.infer<typeof getPlanToolParameters>,
): Promise<GetPlanResult> {
  const parsed = getPlanToolParameters.safeParse(args);
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

export async function updatePlanToolHandler(
  args: z.infer<typeof updatePlanToolParameters>,
): Promise<UpdatePlanResult> {
  const parsed = updatePlanToolParameters.safeParse(args);
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

export async function deletePlanToolHandler(
  args: z.infer<typeof deletePlanToolParameters>,
): Promise<DeletePlanResult> {
  const parsed = deletePlanToolParameters.safeParse(args);
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
      description: createPlanToolDescription,
      inputSchema: createPlanToolParameters,
    },
    createPlanToolHandler,
  );

  server.registerTool(
    'delete_plan',
    {
      description: deletePlanToolDescription,
      inputSchema: deletePlanToolParameters,
    },
    deletePlanToolHandler,
  );

  server.registerTool(
    'get_plan',
    {
      description: getPlanToolDescription,
      inputSchema: getPlanToolParameters,
    },
    getPlanToolHandler,
  );

  server.registerTool(
    'list_plans_by_status',
    {
      description: listPlansByStatusToolDescription,
      inputSchema: listPlansByStatusToolParameters,
    },
    listPlansByStatusToolHandler,
  );

  server.registerTool(
    'update_plan',
    {
      description: updatePlanToolDescription,
      inputSchema: updatePlanToolParameters,
    },
    updatePlanToolHandler,
  );
}
