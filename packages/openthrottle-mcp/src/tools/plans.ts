/**
 * @description Plan CRUD tool handlers + schemas: list_plans_by_status, create_plan, create_plans, get_plan, update_plan, delete_plan. Wired up via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
// zod/v3 to match the generated *InputSchema (src/__generated__/schemas.ts imports
// from zod/v3): `.extend` on a generated schema only keeps its type in the same major.
import { z } from 'zod/v3';

import type {
  CreatePlanInput,
  CreatePlanMutation,
  CreatePlansMutation,
  GetPlanQuery,
  ListPlansByStatusQuery,
  UpdatePlanMutation,
} from '../__generated__/graphql.js';
import {
  AddPlanTagDocument,
  CreatePlanDocument,
  CreatePlansDocument,
  DeletePlanDocument,
  GetPlanDocument,
  ListPlansByStatusDocument,
  PlanTaskStatus,
  UpdatePlanDocument,
} from '../__generated__/graphql.js';
import {
  CreatePlanInputSchema,
  CreatePlansInputSchema,
  DeletePlanInputSchema,
  ListPlansByStatusInputSchema,
  UpdatePlanInputSchema,
} from '../__generated__/schemas.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { resolveWorkspacePathArgument } from '../config/workspace-path.ts';
import { ambientSessionOptions } from '../session/session-headers.ts';
import type { GenericResult } from '../types/index.ts';
import {
  invalidArgsContent,
  toSanitizedClientMessage,
} from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

interface PlanTagFailure {
  readonly reason: string;
  readonly tag: string;
}

interface PlanTagging {
  readonly tagFailures: readonly PlanTagFailure[];
  readonly tags: readonly string[];
}

type CreatePlanResult = GenericResult<{
  plan: CreatePlanMutation['createPlan'];
  tagFailures: readonly PlanTagFailure[];
  tags: readonly string[];
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

/**
 * @description `tags` is MCP-only: the GraphQL CreatePlanInput has no tags, so the handler applies
 * them with addPlanTag right after the create. It exists so filing a follow-up and tagging it are
 * one call — a separate add_plan_tag step was skipped in practice (OT bca92f52).
 */
export const createPlanToolParameters = CreatePlanInputSchema()
  .extend({
    tags: z.array(z.string().min(1)).optional(),
  })
  .strict();
export const createPlansToolParameters = CreatePlansInputSchema().strict();
export const deletePlanToolParameters = DeletePlanInputSchema().strict();
export const getPlanToolParameters = z
  .object({ id: z.string().min(1) })
  .strict();
export const listPlansByStatusToolParameters =
  ListPlansByStatusInputSchema().strict();
export const updatePlanToolParameters = UpdatePlanInputSchema().strict();

/**
 * Canonical plan/task status labels, derived from the generated PlanTaskStatus
 * GraphQL enum (the SSOT) so these tool descriptions never carry a stale,
 * hand-maintained status list. QUEUED is plans-only.
 */
const PLAN_TASK_STATUS_VALUES = Object.values(PlanTaskStatus).join(', ');

/** Shared tail: the workspace the plan is recorded against. Identical wording on both tools. */
const WORKSPACE_PATH_GUIDANCE = `On stdio, the folder you are working in is sent automatically as workspacePath and resolved to the repository behind it, so the plan opens pre-selected in its Configuration tab — you do NOT need to pass it, and this works the same for OpenThrottle and for any other registered checkout. Pass workspacePath to name a different absolute path, or an empty string to opt out. It is only ever a hint: the server resolves it against your own registered checkouts and ignores anything else, and it never overrides a workspace already named in runConfigJson. The repository link lives in runConfigJson.workspace.repositoryId — the free-text project field is an unrelated label and does NOT link a plan to a repo.`;

export const createPlanToolDescription = `Create a plan in OpenThrottle. Required: title, author (e.g. GitHub username), category. Optional: description, status (one of: ${PLAN_TASK_STATUS_VALUES}; uppercase), assignee, project, projectId, summary, runConfigJson, workspacePath, tags. tags are attached right after the create, best-effort: a tag that fails is reported in tagFailures and never undoes the plan. Filing a follow-up you identified (out-of-scope work, a later fix, a separate PR)? Create it PENDING with tags: ["follow-up"], then author its tasks in ONE create_tasks call with sortOrder and wave set per task. ${WORKSPACE_PATH_GUIDANCE}`;

export const createPlansToolDescription = `Create multiple plans in OpenThrottle atomically in one call. Pass plans (array of objects, each with title, author (e.g. GitHub username), and category; optional description, status (one of: ${PLAN_TASK_STATUS_VALUES}; uppercase), assignee, project, projectId, summary, runConfigJson, workspacePath). Either all plans are created or none (a single invalid input or DB failure rolls back the whole batch). Returns the created plans and totalCount. ${WORKSPACE_PATH_GUIDANCE}`;

export const deletePlanToolDescription = `Delete a plan by id. Returns whether a row was deleted.`;

export const getPlanToolDescription = `Fetch a plan by id (UUID). Returns the plan row, including its tags (tag, dimension, source), or not found.`;

export const listPlansByStatusToolDescription = `List plans in OpenThrottle by status. Valid statuses (uppercase): ${PLAN_TASK_STATUS_VALUES}. Pass statuses (e.g. ["IN_PROGRESS","PENDING"]); an empty array or "all" means no status filter. Unknown values are rejected with the valid set. Optional: limit/offset, project, assignees, titleSubstring. Each plan carries its tags (tag, dimension, source), so a follow-up plan reads as tagged follow-up. Use for /openthrottle/pending or list by status.`;

export const updatePlanToolDescription = `Update a plan by id. Pass id and any of: title, description, status (one of: ${PLAN_TASK_STATUS_VALUES}; uppercase), author, assignee, category, project, projectId, summary, jobRunHooksJson, runConfigJson. jobRunHooksJson and runConfigJson replace the whole stored value, so read the current one back from get_plan first and merge — a partial object silently drops the keys you omitted. Pass null to reset either to its default shell; omit to leave unchanged. The plan-to-repository link lives in runConfigJson.workspace.repositoryId — the free-text project field is an unrelated label and does NOT link a plan to a repo.`;

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

/**
 * @description Stamps the create input with the workspace the server was launched in, unless the
 * caller named one (or opted out with an empty string). Nothing is sent on the HTTP surface, where
 * no workspace was ever captured.
 */
const withWorkspacePath = (input: CreatePlanInput): CreatePlanInput => {
  const { workspacePath, ...rest } = input;
  const resolved = resolveWorkspacePathArgument(workspacePath);

  return resolved === undefined ? rest : { ...rest, workspacePath: resolved };
};

/**
 * @description Attaches each tag to a just-created plan. A rejected tag is collected rather than
 * thrown, because the plan already exists and failing the call would hide its id from the caller.
 */
const tagCreatedPlan = async (
  token: string,
  planId: string,
  tags: readonly string[],
): Promise<PlanTagging> => {
  const settled = await Promise.allSettled(
    tags.map(async (tag) =>
      executeGraphqlWithAuth(token, AddPlanTagDocument, {
        input: { planId, tag },
      }),
    ),
  );

  return settled.reduce<PlanTagging>(
    (tagging, outcome, index) => {
      const tag = tags[index] ?? '';
      if (outcome.status === 'fulfilled' && outcome.value?.addPlanTag) {
        return { ...tagging, tags: [...tagging.tags, tag] };
      }
      const reason =
        outcome.status === 'rejected'
          ? toSanitizedClientMessage('add_plan_tag', outcome.reason)
          : 'addPlanTag returned no result';
      return {
        ...tagging,
        tagFailures: [...tagging.tagFailures, { reason, tag }],
      };
    },
    { tagFailures: [], tags: [] },
  );
};

export async function createPlanToolHandler(
  args: z.infer<typeof createPlanToolParameters>,
): Promise<CreatePlanResult> {
  const parsed = createPlanToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  const { tags = [], ...input } = parsed.data;

  return runTool<{
    plan: CreatePlanMutation['createPlan'];
    tagFailures: readonly PlanTagFailure[];
    tags: readonly string[];
  }>('create_plan', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      CreatePlanDocument,
      {
        input: withWorkspacePath(input),
      },
      await ambientSessionOptions(token),
    );

    const plan = result?.createPlan;
    if (!plan) return null;

    const tagging = await tagCreatedPlan(token, plan.id, tags);
    const tagLines = [
      ...(tagging.tags.length > 0
        ? [`Tagged: ${tagging.tags.join(', ')}`]
        : []),
      ...tagging.tagFailures.map(
        (failure) => `Could not tag "${failure.tag}": ${failure.reason}`,
      ),
    ];
    const text = [
      `Created plan: ${plan.id}`,
      ...tagLines,
      JSON.stringify(plan, null, 2),
    ].join('\n');
    return { structuredContent: { plan, ...tagging }, text };
  });
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
    const result = await executeGraphqlWithAuth(
      token,
      CreatePlansDocument,
      {
        input: { plans: parsed.data.plans.map(withWorkspacePath) },
      },
      await ambientSessionOptions(token),
    );

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
      const result = await executeGraphqlWithAuth(
        token,
        UpdatePlanDocument,
        {
          input: parsed.data,
        },
        await ambientSessionOptions(token),
      );

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
    const result = await executeGraphqlWithAuth(
      token,
      DeletePlanDocument,
      {
        input: parsed.data,
      },
      await ambientSessionOptions(token),
    );

    const deleted = result?.deletePlan ?? false;
    const text = deleted
      ? `Deleted plan: ${parsed.data.id}`
      : `Plan not found or already deleted: ${parsed.data.id}`;

    return { structuredContent: { deleted }, text };
  });
}
