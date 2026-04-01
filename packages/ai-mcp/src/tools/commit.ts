/**
 * @description Registers commit link tool: link_commit.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCortexPostgresConfig } from '../config.js';
import { createCommitLink as cortexCreateCommitLink } from '../cortex-client.js';
import { linkCommitInputSchema } from '../schemas.js';
import { configMissingContent, invalidArgsContent } from './errors.js';

export function registerCommitTools(server: McpServer): void {
  server.registerTool(
    'link_commit',
    {
      description: `Associate a git commit with a plan (and optionally a task). Requires planId, repo, sha; optional taskId, message.`,
      inputSchema: {
        message: z.string().nullable().optional(),
        planId: z.uuid(),
        repo: z.string().min(1),
        sha: z.string().min(1),
        taskId: z.uuid().nullable().optional(),
      },
    },
    async (args: z.infer<typeof linkCommitInputSchema>) => {
      const parsed = linkCommitInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      const config = getCortexPostgresConfig();
      if (!config) {
        return configMissingContent();
      }

      const data = parsed.data;

      try {
        const link = await cortexCreateCommitLink(config, {
          message: data.message ?? null,
          planId: data.planId,
          repo: data.repo,
          sha: data.sha,
          taskId: data.taskId ?? null,
        });

        const text = `Linked commit ${data.repo}@${data.sha} to plan ${data.planId}${data.taskId ? ` and task ${data.taskId}` : ''}.\n${JSON.stringify(link, null, 2)}`;

        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: { link },
        };
      } catch (error: unknown) {
        const isError = error instanceof Error;
        const isString = typeof error === 'string';
        const message = isError
          ? (error as Error).message
          : isString
            ? (error as string)
            : 'Unknown error';

        const text = `link_commit failed: ${message}`;

        return {
          content: [{ text, type: 'text' as const }],
          isError: true,
        };
      }
    },
  );
}
