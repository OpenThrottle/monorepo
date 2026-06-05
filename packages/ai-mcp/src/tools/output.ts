/**
 * @description Registers plan output tools: append_plan_output, get_plan_output.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPostgresConfig } from '../config.js';
import {
  createPlanOutputChunk as cortexCreatePlanOutputChunk,
  getPlanOutputByPlanId as cortexGetPlanOutputByPlanId,
} from '../cortex-client.js';
import {
  appendPlanOutputInputSchema,
  getPlanOutputInputSchema,
} from '../schemas.js';
import { configMissingContent, invalidArgsContent } from './errors.js';

export function registerOutputTools(server: McpServer): void {
  server.registerTool(
    'append_plan_output',
    {
      description: `Append a chunk of streaming output (e.g. agent iteration log) to a plan. Requires planId and content; optional iteration number.`,
      inputSchema: {
        content: z.string().min(1),
        iteration: z.number().int().optional(),
        planId: z.uuid(),
      },
    },
    async (args: z.infer<typeof appendPlanOutputInputSchema>) => {
      const parsed = appendPlanOutputInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }
      const config = getPostgresConfig();
      if (!config) {
        return configMissingContent();
      }
      try {
        const chunk = await cortexCreatePlanOutputChunk({
          content: parsed.data.content,
          iteration: parsed.data.iteration ?? null,
          planId: parsed.data.planId,
        });
        const text = `Appended output chunk to plan ${parsed.data.planId}.\n${JSON.stringify(chunk, null, 2)}`;
        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { chunk },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              text: `append_plan_output failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'get_plan_output',
    {
      description: `Fetch all streaming output chunks for a plan, ordered by created_at ascending (stream order).`,
      inputSchema: { planId: z.uuid() },
    },
    async (args: z.infer<typeof getPlanOutputInputSchema>) => {
      const parsed = getPlanOutputInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }
      const config = getPostgresConfig();
      if (!config) {
        return configMissingContent();
      }
      try {
        const chunks = await cortexGetPlanOutputByPlanId(parsed.data.planId);
        const text =
          chunks.length === 0
            ? 'No output chunks for this plan.'
            : JSON.stringify(chunks, null, 2);
        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { chunks },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              text: `get_plan_output failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
