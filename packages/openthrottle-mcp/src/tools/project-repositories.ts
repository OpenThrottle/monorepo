/**
 * @description Project-repository link tool handlers + schemas: link_project_repository and
 * unlink_project_repository. Mirrors the linkProjectRepository / unlinkProjectRepository
 * mutations via GraphQL only. A project can span several repositories and a repository can
 * belong to several projects.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type { z } from 'zod';

import {
  LinkProjectRepositoryDocument,
  UnlinkProjectRepositoryDocument,
} from '../__generated__/graphql.js';
import {
  LinkProjectRepositoryInputSchema,
  UnlinkProjectRepositoryInputSchema,
} from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { getAuthToken } from '../utils/getAuthToken.ts';
import { runTool } from '../utils/runTool.ts';

type ProjectRepositoryLink = {
  createdAt: string;
  id: string;
  projectId: string;
  repositoryId: string;
};

// ── link_project_repository ──────────────────────────────────────────────────

export const linkProjectRepositoryToolParameters =
  LinkProjectRepositoryInputSchema().strict();

export const linkProjectRepositoryToolDescription = `Link a repository to a project via the linkProjectRepository GraphQL mutation. Many-to-many: a project can span several repositories and a repository can belong to several projects. Idempotent; fails when the project or repository does not exist.`;

export async function linkProjectRepositoryToolHandler(
  args: z.infer<typeof linkProjectRepositoryToolParameters>,
): Promise<GenericResult<{ link: ProjectRepositoryLink }>> {
  const parsed = linkProjectRepositoryToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ link: ProjectRepositoryLink }>(
    'link_project_repository',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        LinkProjectRepositoryDocument,
        { input: parsed.data },
      );
      const linked = result?.linkProjectRepository;
      if (!linked) {
        return null;
      }

      const link: ProjectRepositoryLink = {
        createdAt: linked.createdAt,
        id: linked.id,
        projectId: linked.projectId,
        repositoryId: linked.repositoryId,
      };
      return {
        structuredContent: { link },
        text: `Linked repository ${link.repositoryId} to project ${link.projectId}`,
      };
    },
  );
}

// ── unlink_project_repository ────────────────────────────────────────────────

export const unlinkProjectRepositoryToolParameters =
  UnlinkProjectRepositoryInputSchema().strict();

export const unlinkProjectRepositoryToolDescription = `Remove a repository's link to a project via the unlinkProjectRepository GraphQL mutation. Returns whether a link was removed (false when the pair was not linked). Neither the project nor the repository is deleted.`;

export async function unlinkProjectRepositoryToolHandler(
  args: z.infer<typeof unlinkProjectRepositoryToolParameters>,
): Promise<GenericResult<{ unlinked: boolean }>> {
  const parsed = unlinkProjectRepositoryToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ unlinked: boolean }>(
    'unlink_project_repository',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        UnlinkProjectRepositoryDocument,
        { input: parsed.data },
      );

      const unlinked = result?.unlinkProjectRepository ?? false;
      const text = unlinked
        ? `Unlinked repository ${parsed.data.repositoryId} from project ${parsed.data.projectId}`
        : `Repository ${parsed.data.repositoryId} was not linked to project ${parsed.data.projectId}`;

      return { structuredContent: { unlinked }, text };
    },
  );
}
