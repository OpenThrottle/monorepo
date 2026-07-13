/**
 * @description Plan/task tag tool handlers + schemas: add_plan_tag,
 * remove_plan_tag, add_task_tag, remove_task_tag. Mirrors the identity-derived
 * tag mutations via GraphQL only — GraphQL-only boundary, no core import, no
 * Nest bootstrap in this process. This MCP's service account writes with
 * source "agent" (derived server-side; never a tool argument). Tags must exist
 * in the caller's skill-tag vocabulary (see list_skill_tags / add_skill_tag).
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type { z } from 'zod';

import {
  AddPlanTagDocument,
  AddTaskTagDocument,
  RemovePlanTagDocument,
  RemoveTaskTagDocument,
} from '../__generated__/graphql.js';
import {
  AddPlanTagInputSchema,
  AddTaskTagInputSchema,
  RemovePlanTagInputSchema,
  RemoveTaskTagInputSchema,
} from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

type PlanTag = {
  confidence: number | null;
  createdAt: string;
  dimension: string;
  id: string;
  planId: string;
  source: string;
  tag: string;
  updatedAt: string;
};

type TaskTag = {
  confidence: number | null;
  createdAt: string;
  dimension: string;
  id: string;
  source: string;
  tag: string;
  taskId: string;
  updatedAt: string;
};

// ── add_plan_tag ─────────────────────────────────────────────────────────────

export const addPlanTagToolParameters = AddPlanTagInputSchema();

export const addPlanTagToolDescription = `Attach a tag to a plan via the addPlanTag GraphQL mutation. The tag must be kebab-case and in the caller's skill-tag vocabulary; source is derived server-side from the caller identity (never an argument). At most one phase tag per plan — an equal-or-lower-provenance phase tag is replaced, a higher one rejects.`;

export async function addPlanTagToolHandler(
  args: z.infer<typeof addPlanTagToolParameters>,
): Promise<GenericResult<{ tag: PlanTag }>> {
  const parsed = addPlanTagToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ tag: PlanTag }>('add_plan_tag', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, AddPlanTagDocument, {
      input: parsed.data,
    });
    const added = result?.addPlanTag;
    if (!added) {
      return null;
    }

    const tag: PlanTag = {
      confidence: added.confidence ?? null,
      createdAt: added.createdAt,
      dimension: added.dimension,
      id: added.id,
      planId: added.planId,
      source: added.source,
      tag: added.tag,
      updatedAt: added.updatedAt,
    };
    return {
      structuredContent: { tag },
      text: `Tagged plan ${tag.planId} with "${tag.tag}" (${tag.dimension}, source=${tag.source})`,
    };
  });
}

// ── remove_plan_tag ──────────────────────────────────────────────────────────

export const removePlanTagToolParameters = RemovePlanTagInputSchema();

export const removePlanTagToolDescription = `Remove a tag from a plan via the removePlanTag GraphQL mutation. The provenance ladder applies (an agent cannot remove a human row). Returns whether a tag was removed.`;

export async function removePlanTagToolHandler(
  args: z.infer<typeof removePlanTagToolParameters>,
): Promise<GenericResult<{ removed: boolean }>> {
  const parsed = removePlanTagToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ removed: boolean }>('remove_plan_tag', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, RemovePlanTagDocument, {
      input: parsed.data,
    });
    const removed = result?.removePlanTag ?? false;
    const text = removed
      ? `Removed tag "${parsed.data.tag}" from plan ${parsed.data.planId}`
      : `Tag "${parsed.data.tag}" not present on plan ${parsed.data.planId}`;
    return { structuredContent: { removed }, text };
  });
}

// ── add_task_tag ─────────────────────────────────────────────────────────────

export const addTaskTagToolParameters = AddTaskTagInputSchema();

export const addTaskTagToolDescription = `Attach a tag to a task via the addTaskTag GraphQL mutation. The tag must be kebab-case and in the caller's skill-tag vocabulary; source is derived server-side from the caller identity (never an argument).`;

export async function addTaskTagToolHandler(
  args: z.infer<typeof addTaskTagToolParameters>,
): Promise<GenericResult<{ tag: TaskTag }>> {
  const parsed = addTaskTagToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ tag: TaskTag }>('add_task_tag', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, AddTaskTagDocument, {
      input: parsed.data,
    });
    const added = result?.addTaskTag;
    if (!added) {
      return null;
    }

    const tag: TaskTag = {
      confidence: added.confidence ?? null,
      createdAt: added.createdAt,
      dimension: added.dimension,
      id: added.id,
      source: added.source,
      tag: added.tag,
      taskId: added.taskId,
      updatedAt: added.updatedAt,
    };
    return {
      structuredContent: { tag },
      text: `Tagged task ${tag.taskId} with "${tag.tag}" (${tag.dimension}, source=${tag.source})`,
    };
  });
}

// ── remove_task_tag ──────────────────────────────────────────────────────────

export const removeTaskTagToolParameters = RemoveTaskTagInputSchema();

export const removeTaskTagToolDescription = `Remove a tag from a task via the removeTaskTag GraphQL mutation. The provenance ladder applies (an agent cannot remove a human row). Returns whether a tag was removed.`;

export async function removeTaskTagToolHandler(
  args: z.infer<typeof removeTaskTagToolParameters>,
): Promise<GenericResult<{ removed: boolean }>> {
  const parsed = removeTaskTagToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ removed: boolean }>('remove_task_tag', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, RemoveTaskTagDocument, {
      input: parsed.data,
    });
    const removed = result?.removeTaskTag ?? false;
    const text = removed
      ? `Removed tag "${parsed.data.tag}" from task ${parsed.data.taskId}`
      : `Tag "${parsed.data.tag}" not present on task ${parsed.data.taskId}`;
    return { structuredContent: { removed }, text };
  });
}
