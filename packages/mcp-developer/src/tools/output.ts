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

const appendPlanOutputSchema = AppendPlanOutputInputSchema();

async function appendPlanOutputHandler(
  args: z.infer<typeof appendPlanOutputSchema>,
): Promise<AppendPlanOutputResult> {
  const parsed = appendPlanOutputSchema.safeParse(args);
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

const getPlanOutputSchema = ListPlanOutputStreamChunksInputSchema();

async function getPlanOutputHandler(
  args: z.infer<typeof getPlanOutputSchema>,
): Promise<GetPlanOutputResult> {
  const parsed = getPlanOutputSchema.safeParse(args);
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
      description: `Append a chunk of streaming output (e.g. agent iteration log) to a plan. Requires planId and content; optional iteration number.`,
      inputSchema: appendPlanOutputSchema,
    },
    appendPlanOutputHandler,
  );

  server.registerTool(
    'get_plan_output',
    {
      description: `Fetch all streaming output chunks for a plan, ordered by created_at ascending (stream order).`,
      inputSchema: getPlanOutputSchema,
    },
    getPlanOutputHandler,
  );
}
