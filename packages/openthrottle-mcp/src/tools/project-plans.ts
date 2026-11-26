/**
 * @description Ordered plan membership in a project: add_plan_to_project,
 * remove_plan_from_project, reorder_project_plans and get_project_plans. Mirrors the
 * addPlanToProject / removePlanFromProject / reorderProjectPlans mutations and the projectPlans
 * query via GraphQL only. A plan belongs to at most one project and carries a gap-based
 * projectSortOrder (1000, 2000, …).
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import type { ProjectPlanFragment } from '../__generated__/graphql.js';
import {
  AddPlanToProjectDocument,
  ProjectPlansDocument,
  RemovePlanFromProjectDocument,
  ReorderProjectPlansDocument,
} from '../__generated__/graphql.js';
import {
  AddPlanToProjectInputSchema,
  RemovePlanFromProjectInputSchema,
  ReorderProjectPlansInputSchema,
} from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { getAuthToken } from '../utils/getAuthToken.ts';
import { runTool } from '../utils/runTool.ts';

// ── add_plan_to_project ──────────────────────────────────────────────────────

export const addPlanToProjectToolParameters =
  AddPlanToProjectInputSchema().strict();

export const addPlanToProjectToolDescription = `Add a plan to a project via the addPlanToProject GraphQL mutation. The plan is appended after the project's last plan (projectSortOrder = highest + 1000); a plan already in another project moves and lands at the end of this one. Also links the plan's workspace repository (runConfigJson.workspace.repositoryId) to the project when it is set and not yet linked; that link never blocks. Idempotent for a plan already in the project. Fails when the plan or project does not exist.`;

export async function addPlanToProjectToolHandler(
  args: z.infer<typeof addPlanToProjectToolParameters>,
): Promise<GenericResult<{ plan: ProjectPlanFragment }>> {
  const parsed = addPlanToProjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ plan: ProjectPlanFragment }>(
    'add_plan_to_project',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        AddPlanToProjectDocument,
        { input: parsed.data },
      );
      const plan = result?.addPlanToProject;
      if (!plan) {
        return null;
      }

      return {
        structuredContent: { plan },
        text: `Added plan ${plan.id} to project ${parsed.data.projectId} at position ${String(plan.projectSortOrder)}`,
      };
    },
  );
}

// ── remove_plan_from_project ─────────────────────────────────────────────────

export const removePlanFromProjectToolParameters =
  RemovePlanFromProjectInputSchema().strict();

export const removePlanFromProjectToolDescription = `Remove a plan from its project via the removePlanFromProject GraphQL mutation, clearing both projectId and projectSortOrder. The project's repository links stay. A plan with no project is returned unchanged.`;

export async function removePlanFromProjectToolHandler(
  args: z.infer<typeof removePlanFromProjectToolParameters>,
): Promise<
  GenericResult<{
    plan: ProjectPlanFragment;
  }>
> {
  const parsed = removePlanFromProjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{
    plan: ProjectPlanFragment;
  }>('remove_plan_from_project', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      RemovePlanFromProjectDocument,
      { input: parsed.data },
    );
    const plan = result?.removePlanFromProject;
    if (!plan) {
      return null;
    }

    return {
      structuredContent: { plan },
      text: `Removed plan ${plan.id} from its project`,
    };
  });
}

// ── reorder_project_plans ────────────────────────────────────────────────────

export const reorderProjectPlansToolParameters =
  ReorderProjectPlansInputSchema().strict();

export const reorderProjectPlansToolDescription = `Reorder the plans of a project via the reorderProjectPlans GraphQL mutation. Requires projectId and planIds (plan UUIDs in desired order, no duplicates, all in the project). Listed plans reorder among their own positions; unlisted plans stay put. Atomic. Returns every plan of the project in the new order. Prefer this over removing and re-adding plans.`;

export async function reorderProjectPlansToolHandler(
  args: z.infer<typeof reorderProjectPlansToolParameters>,
): Promise<GenericResult<{ plans: ProjectPlanFragment[] }>> {
  const parsed = reorderProjectPlansToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{
    plans: ProjectPlanFragment[];
  }>('reorder_project_plans', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      ReorderProjectPlansDocument,
      { input: parsed.data },
    );
    const plans = result?.reorderProjectPlans ?? [];

    return {
      structuredContent: { plans },
      text: `Reordered ${plans.length} plan(s) in project ${parsed.data.projectId}:\n${JSON.stringify(plans, null, 2)}`,
    };
  });
}

// ── get_project_plans ────────────────────────────────────────────────────────

export const getProjectPlansToolParameters = z
  .object({
    projectId: z.string().min(1).describe(`Project UUID`),
  })
  .strict();

export const getProjectPlansToolDescription = `List the plans of a project in project order (projectSortOrder ascending) via the projectPlans GraphQL query. Requires projectId. Each entry carries id, title, status and projectSortOrder.`;

export async function getProjectPlansToolHandler(
  args: z.infer<typeof getProjectPlansToolParameters>,
): Promise<GenericResult<{ plans: ProjectPlanFragment[] }>> {
  const parsed = getProjectPlansToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ plans: ProjectPlanFragment[] }>(
    'get_project_plans',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, ProjectPlansDocument, {
        projectId: parsed.data.projectId,
      });
      const plans = result?.projectPlans ?? [];
      const isEmpty = plans.length === 0;
      const emptyText = `Project ${parsed.data.projectId} has no plans.`;
      const listText = `Plans in project ${parsed.data.projectId} (${plans.length}):\n${JSON.stringify(plans, null, 2)}`;
      const text = isEmpty ? emptyText : listText;

      return { structuredContent: { plans }, text };
    },
  );
}
