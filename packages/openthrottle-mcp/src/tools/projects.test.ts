/**
 * @description Handler tests for the delete_project MCP tool (destructive/mutating) with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteProjectToolHandler } from './projects.js';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const projectId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const serviceAccountToken = 'ot_sa_testprefix_testsecret';

describe('deleteProjectToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await deleteProjectToolHandler(
        {} as Parameters<typeof deleteProjectToolHandler>[0],
      );

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/Invalid arguments[\s\S]*id/i) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL deletes the project', () => {
    it('returns deleted: true and maps the input through', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deleteProject: true,
      });

      const result = await deleteProjectToolHandler({ id: projectId });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/Deleted project/) }],
        structuredContent: { deleted: true },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { id: projectId } },
      );
    });
  });

  describe('when no row was deleted', () => {
    it('returns deleted: false with a not-found message', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deleteProject: false,
      });

      const result = await deleteProjectToolHandler({ id: projectId });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/not found/) }],
        structuredContent: { deleted: false },
      });
    });
  });
});
