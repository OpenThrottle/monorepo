/**
 * @description Plan output tool handlers + schemas: append_plan_output, get_plan_output. Wired up via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  type AppendPlanOutputMutation,
  type DeletePlanOutputMutation,
  type GetPlanOutputStreamChunksQuery,
  AppendPlanOutputDocument,
  DeletePlanOutputDocument,
  GetPlanOutputStreamChunksDocument,
} from '../__generated__/graphql.js';
import {
  AppendPlanOutputInputSchema,
  DeletePlanOutputInputSchema,
  ListPlanOutputStreamChunksInputSchema,
} from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

type AppendPlanOutputResult = GenericResult<{
  chunk: AppendPlanOutputMutation['appendPlanOutput'];
}>;

type GetPlanOutputResult = GenericResult<{
  chunks: GetPlanOutputStreamChunksQuery['planOutputStreamChunks'];
}>;

type DeletePlanOutputResult = GenericResult<{
  deletedCount: DeletePlanOutputMutation['deletePlanOutput']['deletedCount'];
}>;

export const appendPlanOutputToolParameters = AppendPlanOutputInputSchema();

export const appendPlanOutputToolDescription = `Append a chunk of streaming output (e.g. agent iteration log) to a plan. Requires planId and content; optional iteration number and taskId (attribute the chunk to the task you are actively working, for task-scoped output).`;

export async function appendPlanOutputToolHandler(
  args: z.infer<typeof appendPlanOutputToolParameters>,
): Promise<AppendPlanOutputResult> {
  const parsed = appendPlanOutputToolParameters.safeParse(args);
  if (!parsed.success) {
    // The generated schema enforces a non-empty `content` (`.min(1)` via the
    // shared codegen `notAllowEmptyString`), so empty input is rejected here.
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ chunk: AppendPlanOutputMutation['appendPlanOutput'] }>(
    'append_plan_output',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        AppendPlanOutputDocument,
        {
          input: {
            content: parsed.data.content,
            iteration: parsed.data.iteration ?? null,
            planId: parsed.data.planId,
            taskId: parsed.data.taskId ?? null,
          },
        },
      );

      const chunk = result?.appendPlanOutput ?? null;
      if (!chunk) return null;

      const text = `Appended output chunk to plan ${parsed.data.planId}.\n${JSON.stringify(chunk, null, 2)}`;
      return { structuredContent: { chunk }, text };
    },
  );
}

export const getPlanOutputToolParameters =
  ListPlanOutputStreamChunksInputSchema();

export const getPlanOutputToolDescription =
  'Fetch all streaming output chunks for a plan, ordered by created_at ascending (stream order).';

export async function getPlanOutputToolHandler(
  args: z.infer<typeof getPlanOutputToolParameters>,
): Promise<GetPlanOutputResult> {
  const parsed = getPlanOutputToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{
    chunks: GetPlanOutputStreamChunksQuery['planOutputStreamChunks'];
  }>('get_plan_output', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      GetPlanOutputStreamChunksDocument,
      { input: { planId: parsed.data.planId } },
    );

    const chunks = result?.planOutputStreamChunks ?? [];
    const text =
      chunks.length === 0
        ? 'No output chunks for this plan.'
        : JSON.stringify(chunks, null, 2);

    return { structuredContent: { chunks }, text };
  });
}

export const deletePlanOutputToolParameters = DeletePlanOutputInputSchema();

export const deletePlanOutputToolDescription =
  'Delete plan output stream chunks. With chunkId, delete that single chunk (it must belong to planId). Without chunkId, clear all chunks for planId, optionally scoped to taskId. Returns the number of chunks deleted. Use to remove stale or incorrect output (e.g. when resetting a plan back to PENDING). GraphQL-only: delegates to the deletePlanOutput mutation.';

export async function deletePlanOutputToolHandler(
  args: z.infer<typeof deletePlanOutputToolParameters>,
): Promise<DeletePlanOutputResult> {
  const parsed = deletePlanOutputToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ deletedCount: number }>('delete_plan_output', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      DeletePlanOutputDocument,
      {
        input: {
          chunkId: parsed.data.chunkId ?? null,
          planId: parsed.data.planId,
          taskId: parsed.data.taskId ?? null,
        },
      },
    );

    const deletedCount = result?.deletePlanOutput?.deletedCount ?? null;
    if (deletedCount === null) return null;

    const scope = parsed.data.chunkId
      ? `chunk ${parsed.data.chunkId} (plan ${parsed.data.planId})`
      : parsed.data.taskId
        ? `task ${parsed.data.taskId} on plan ${parsed.data.planId}`
        : `plan ${parsed.data.planId}`;
    const text = `Deleted ${deletedCount} plan output chunk(s) for ${scope}.`;
    return { structuredContent: { deletedCount }, text };
  });
}
