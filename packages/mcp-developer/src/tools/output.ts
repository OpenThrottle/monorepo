/**
 * @description Registers plan output tools: append_plan_output, get_plan_output.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  type AppendPlanOutputMutation,
  type GetPlanOutputStreamChunksQuery,
  AppendPlanOutputDocument,
  GetPlanOutputStreamChunksDocument,
} from '../__generated__/graphql.js';
import {
  AppendPlanOutputInputSchema,
  ListPlanOutputStreamChunksInputSchema,
} from '../__generated__/schemas.js';
import type { GenericResult } from '../types/index.js';
import { getAuthToken } from '../auth/index.js';
import { invalidArgsContent } from '../utils/errors.js';
import { runTool } from '../utils/tool-result.js';

type AppendPlanOutputResult = GenericResult<{
  chunk: AppendPlanOutputMutation['appendPlanOutput'];
}>;

type GetPlanOutputResult = GenericResult<{
  chunks: GetPlanOutputStreamChunksQuery['planOutputStreamChunks'];
}>;

export const appendPlanOutputToolParameters = AppendPlanOutputInputSchema();

export const appendPlanOutputToolDescription =
  'Append a chunk of streaming output (e.g. agent iteration log) to a plan. Requires planId and content; optional iteration number.';

export async function appendPlanOutputToolHandler(
  args: z.infer<typeof appendPlanOutputToolParameters>,
): Promise<AppendPlanOutputResult> {
  const parsed = appendPlanOutputToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }
  if (parsed.data.content.length === 0) {
    return invalidArgsContent('content must be non-empty');
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

export function registerOutputTools(server: McpServer): void {
  server.registerTool(
    'append_plan_output',
    {
      description: appendPlanOutputToolDescription,
      inputSchema: appendPlanOutputToolParameters,
    },
    appendPlanOutputToolHandler,
  );

  server.registerTool(
    'get_plan_output',
    {
      description: getPlanOutputToolDescription,
      inputSchema: getPlanOutputToolParameters,
    },
    getPlanOutputToolHandler,
  );
}
