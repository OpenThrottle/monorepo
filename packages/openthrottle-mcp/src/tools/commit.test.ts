/**
 * @description Handler tests for the link_commit MCP tool (Ralph traceability) with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { linkCommitToolHandler } from './commit.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const planId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const taskId = '27956636-1ab4-4ded-b227-8c52bf888b05';
const serviceAccountToken = '***REMOVED-OT-TOKEN***';

describe('linkCommitToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await linkCommitToolHandler({
        planId: 'not-a-uuid',
        repo: 'openthrottle',
        sha: 'abc123',
      });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/Invalid arguments/i) }],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL links the commit', () => {
    it('maps the input through and defaults message/taskId to null', async () => {
      const link = {
        id: 'link-1',
        planId,
        repo: 'openthrottle',
        sha: 'abc123',
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        linkCommit: link,
      });

      const result = await linkCommitToolHandler({
        planId,
        repo: 'openthrottle',
        sha: 'abc123',
      });

      expect(result).toMatchObject({
        structuredContent: { link },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            message: null,
            planId,
            repo: 'openthrottle',
            sha: 'abc123',
            taskId: null,
          },
        },
      );
    });

    it('passes explicit message and taskId through', async () => {
      const link = {
        id: 'link-2',
        planId,
        repo: 'openthrottle',
        sha: 'def456',
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        linkCommit: link,
      });

      await linkCommitToolHandler({
        message: 'feat: ship it',
        planId,
        repo: 'openthrottle',
        sha: 'def456',
        taskId,
      });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            message: 'feat: ship it',
            planId,
            repo: 'openthrottle',
            sha: 'def456',
            taskId,
          },
        },
      );
    });
  });

  describe('when GraphQL returns no link', () => {
    it('returns a no-result error', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        linkCommit: null,
      });

      const result = await linkCommitToolHandler({
        planId,
        repo: 'openthrottle',
        sha: 'abc123',
      });

      expect(result).toEqual({
        content: [{ text: 'link_commit returned no result', type: 'text' }],
        isError: true,
      });
    });
  });
});
