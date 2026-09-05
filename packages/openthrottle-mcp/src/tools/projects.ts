/**
 * @description Project tool handler + schema: delete_project. Wired up via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import type { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { DeleteProjectDocument } from '../__generated__/graphql.js';
import { DeleteProjectInputSchema } from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

type DeleteProjectResult = GenericResult<{
  deleted: boolean;
}>;

export const deleteProjectToolParameters = DeleteProjectInputSchema();

export const deleteProjectToolDescription = `Delete a OpenThrottle project by id. Returns whether a row was deleted. Plans and tasks that referenced this project have project_id cleared.`;

export async function deleteProjectToolHandler(
  args: z.infer<typeof deleteProjectToolParameters>,
): Promise<DeleteProjectResult> {
  const parsed = deleteProjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
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
