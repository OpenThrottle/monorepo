/**
 * @description Handler tests for the link_project_repository and unlink_project_repository MCP
 * tools with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  linkProjectRepositoryToolHandler,
  unlinkProjectRepositoryToolHandler,
} from '../project-repositories.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const projectId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const repositoryId = '0f6b5f0e-7d3f-4f43-9c0e-0d3f1f3b6a11';
const serviceAccountToken = '***REMOVED-OT-TOKEN***';

describe('project repository link tools', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('linkProjectRepositoryToolHandler', () => {
    describe('when args are invalid', () => {
      it('returns an invalid-args error without calling GraphQL', async () => {
        const result = await linkProjectRepositoryToolHandler({
          projectId,
        });

        expect(result).toMatchObject({
          content: [
            {
              text: expect.stringMatching(
                /Invalid arguments[\s\S]*repository/i,
              ),
            },
          ],
          isError: true,
        });
        expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
      });
    });

    describe('when GraphQL links the pair', () => {
      it('maps the input through and returns the link', async () => {
        vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
          linkProjectRepository: {
            createdAt: '2026-11-20T00:00:00.000Z',
            id: 'link-1',
            projectId,
            repositoryId,
          },
        });

        const result = await linkProjectRepositoryToolHandler({
          projectId,
          repositoryId,
        });

        expect(result).toMatchObject({
          content: [{ text: expect.stringMatching(/Linked repository/) }],
          structuredContent: {
            link: { id: 'link-1', projectId, repositoryId },
          },
        });
        expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
          serviceAccountToken,
          expect.anything(),
          { input: { projectId, repositoryId } },
        );
      });
    });
  });

  describe('unlinkProjectRepositoryToolHandler', () => {
    describe('when args are invalid', () => {
      it('returns an invalid-args error without calling GraphQL', async () => {
        const result = await unlinkProjectRepositoryToolHandler({});

        expect(result).toMatchObject({ isError: true });
        expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
      });
    });

    describe('when a link was removed', () => {
      it('returns unlinked: true', async () => {
        vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
          unlinkProjectRepository: true,
        });

        const result = await unlinkProjectRepositoryToolHandler({
          projectId,
          repositoryId,
        });

        expect(result).toMatchObject({
          content: [{ text: expect.stringMatching(/Unlinked repository/) }],
          structuredContent: { unlinked: true },
        });
        expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
          serviceAccountToken,
          expect.anything(),
          { input: { projectId, repositoryId } },
        );
      });
    });

    describe('when the pair was not linked', () => {
      it('returns unlinked: false', async () => {
        vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
          unlinkProjectRepository: false,
        });

        const result = await unlinkProjectRepositoryToolHandler({
          projectId,
          repositoryId,
        });

        expect(result).toMatchObject({
          content: [{ text: expect.stringMatching(/was not linked/) }],
          structuredContent: { unlinked: false },
        });
      });
    });
  });
});
