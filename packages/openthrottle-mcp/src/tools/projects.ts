/**
 * @description Project tool handler + schema: delete_project. Wired up via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type { z } from 'zod';

import { DeleteProjectDocument } from '../__generated__/graphql.js';
import { DeleteProjectInputSchema } from '../__generated__/schemas.ts';
import { getAuthToken } from '../auth/getAuthToken.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/runTool.ts';

type DeleteProjectResult = GenericResult<{
  deleted: boolean;
}>;

export const deleteProjectToolParameters = DeleteProjectInputSchema().strict();

export const deleteProjectToolDescription = `Soft-delete an OpenThrottle project by id. Returns whether a live project was deleted. The row is kept: plans, tasks and repository links keep their project_id and read as no project while the project is deleted.`;

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
