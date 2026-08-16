/**
 * @description Plan CRUD tool handlers + schemas: list_plans_by_status, create_plan, create_plans, get_plan, update_plan, delete_plan. Wired up via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  CreatePlanDocument,
  CreatePlansDocument,
  DeletePlanDocument,
  GetPlanDocument,
  ListPlansByStatusDocument,
  PlanTaskStatus,
  UpdatePlanDocument,
} from '../__generated__/graphql.js';
import type {
  CreatePlanMutation,
  CreatePlansMutation,
  GetPlanQuery,
  ListPlansByStatusQuery,
  UpdatePlanMutation,
} from '../__generated__/graphql.js';
import {
  CreatePlanInputSchema,
  CreatePlansInputSchema,
  DeletePlanInputSchema,
  ListPlansByStatusInputSchema,
  UpdatePlanInputSchema,
} from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

type CreatePlanResult = GenericResult<{
  plan: CreatePlanMutation['createPlan'];
}>;

type CreatePlansResult = GenericResult<{
  plans: CreatePlansMutation['createPlans']['plans'];
  totalCount: number;
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
export const createPlansToolParameters = CreatePlansInputSchema();
export const deletePlanToolParameters = DeletePlanInputSchema();
export const getPlanToolParameters = z.object({ id: z.string().min(1) });
export const listPlansByStatusToolParameters = ListPlansByStatusInputSchema();
export const updatePlanToolParameters = UpdatePlanInputSchema();

/**
 * Canonical plan/task status labels, derived from the generated PlanTaskStatus
 * GraphQL enum (the SSOT) so these tool descriptions never carry a stale,
 * hand-maintained status list. QUEUED is plans-only.
 */
const PLAN_TASK_STATUS_VALUES = Object.values(PlanTaskStatus).join(', ');

export const createPlanToolDescription = `Create a plan in OpenThrottle. Required: title, author (e.g. GitHub username), category. Optional: description, status (one of: ${PLAN_TASK_STATUS_VALUES}; uppercase), assignee, project, projectId, summary.`;

export const createPlansToolDescription = `Create multiple plans in OpenThrottle atomically in one call. Pass plans (array of objects, each with title, author (e.g. GitHub username), and category; optional description, status (one of: ${PLAN_TASK_STATUS_VALUES}; uppercase), assignee, project, projectId, summary, runConfigJson). Either all plans are created or none (a single invalid input or DB failure rolls back the whole batch). Returns the created plans and totalCount.`;

export const deletePlanToolDescription = `Delete a plan by id. Returns whether a row was deleted.`;

export const getPlanToolDescription = `Fetch a plan by id (UUID). Returns the plan row or not found.`;

export const listPlansByStatusToolDescription = `List plans in OpenThrottle by status. Valid statuses (uppercase): ${PLAN_TASK_STATUS_VALUES}. Pass statuses (e.g. ["IN_PROGRESS","PENDING"]); an empty array or "all" means no status filter. Unknown values are rejected with the valid set. Optional: limit/offset, project, assignees, titleSubstring. Use for /openthrottle/pending or list by status.`;

export const updatePlanToolDescription = `Update a plan by id. Pass id and any of: title, description, status (one of: ${PLAN_TASK_STATUS_VALUES}; uppercase), author, assignee, category, project, projectId, summary.`;

export async function listPlansByStatusToolHandler(
  args: z.infer<typeof listPlansByStatusToolParameters>,
): Promise<ListPlansByStatusResult> {
  const parsed = listPlansByStatusToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
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
    return invalidArgsContent(parsed.error);
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

export async function createPlansToolHandler(
  args: z.infer<typeof createPlansToolParameters>,
): Promise<CreatePlansResult> {
  const parsed = createPlansToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{
    plans: CreatePlansMutation['createPlans']['plans'];
    totalCount: number;
  }>('create_plans', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, CreatePlansDocument, {
      input: parsed.data,
    });

    const createResult = result?.createPlans;
    if (!createResult) return null;

    const { plans, totalCount } = createResult;
    const text =
      plans.length === 0
        ? 'create_plans: no plans were created.'
        : `Created ${plans.length} plan(s):\n${JSON.stringify(plans, null, 2)}`;

    return { structuredContent: { plans, totalCount }, text };
  });
}

export async function getPlanToolHandler(
  args: z.infer<typeof getPlanToolParameters>,
): Promise<GetPlanResult> {
  const parsed = getPlanToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
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
    return invalidArgsContent(parsed.error);
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
    return invalidArgsContent(parsed.error);
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
