/**
 * @description Registers project tools: delete_project.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { DeleteProjectDocument } from '../__generated__/graphql.js';
import { DeleteProjectInputSchema } from '../__generated__/schemas.js';
import type { GenericResult } from '../types/index.js';
import { getAuthToken } from '../auth/get-auth-token.js';
import { invalidArgsContent } from '../utils/errors.js';
import { runTool } from '../utils/tool-result.js';

type DeleteProjectResult = GenericResult<{
  deleted: boolean;
}>;

export const deleteProjectToolParameters = DeleteProjectInputSchema();

export const deleteProjectToolDescription =
  'Delete a Cortex project by id. Returns whether a row was deleted. Plans and tasks that referenced this project have project_id cleared.';

export async function deleteProjectToolHandler(
  args: z.infer<typeof deleteProjectToolParameters>,
): Promise<DeleteProjectResult> {
  const parsed = deleteProjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ deleted: boolean }>('delete_project', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, DeleteProjectDocument, {
      input: parsed.data,
    });

    const deleted = result?.deleteProject ?? false;
    const text = deleted
      ? `Deleted project: ${parsed.data.id}`
      : `Project not found or already deleted: ${parsed.data.id}`;

    return { structuredContent: { deleted }, text };
  });
}

export function registerProjectTools(server: McpServer): void {
  server.registerTool(
    'delete_project',
    {
      description: deleteProjectToolDescription,
      inputSchema: deleteProjectToolParameters,
    },
    deleteProjectToolHandler,
  );
}
