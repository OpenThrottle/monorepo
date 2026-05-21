/**
 * @description Registers commit link tool: link_commit. Exposes commit link via GraphQL only.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type { LinkCommitMutation } from '../__generated__/graphql.js';
import { LinkCommitDocument } from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.js';
import { getAuthToken } from '../auth/get-auth-token.js';
import { invalidArgsContent } from '../utils/errors.js';
import { runTool } from '../utils/tool-result.js';

type LinkCommitResult = GenericResult<{
  link: LinkCommitMutation['linkCommit'];
}>;

export const linkCommitToolParameters = z.object({
  message: z.string().nullable().optional(),
  planId: z.string().uuid(),
  repo: z.string().min(1),
  sha: z.string().min(1),
  taskId: z.string().uuid().nullable().optional(),
});

export const linkCommitToolDescription =
  'Associate a git commit with a plan (and optionally a task). Requires planId, repo, sha; optional taskId, message. Use after PR merge with squash SHA.';

export async function linkCommitToolHandler(
  args: z.infer<typeof linkCommitToolParameters>,
): Promise<LinkCommitResult> {
  const parsed = linkCommitToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  const input = {
    message: parsed.data.message ?? null,
    planId: parsed.data.planId,
    repo: parsed.data.repo,
    sha: parsed.data.sha,
    taskId: parsed.data.taskId ?? null,
  };

  return runTool<{ link: LinkCommitMutation['linkCommit'] }>(
    'link_commit',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, LinkCommitDocument, {
        input,
      });

      const link = result?.linkCommit ?? null;
      if (!link) return null;

      const text = `Linked commit ${input.repo}@${input.sha} to plan ${input.planId}${input.taskId ? ` and task ${input.taskId}` : ''}.\n${JSON.stringify(link, null, 2)}`;

      return { structuredContent: { link }, text };
    },
  );
}

export function registerCommitTools(server: McpServer): void {
  server.registerTool(
    'link_commit',
    {
      description: linkCommitToolDescription,
      inputSchema: linkCommitToolParameters,
    },
    linkCommitToolHandler,
  );
}
