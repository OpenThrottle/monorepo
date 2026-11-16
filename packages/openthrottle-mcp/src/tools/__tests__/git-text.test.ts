/**
 * @description Handler tests for the draft_git_text MCP tool with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { draftGitTextToolHandler } from '../git-text.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const planId = 'ea4347bf-5cd4-42b3-9c7e-5c1662c135e2';
const token = 'test-token';

describe('draftGitTextToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = token;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await draftGitTextToolHandler({ planId: 'not-a-uuid' });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when the server drafts the text', () => {
    it('passes nulls for omitted fields and renders every section', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        gitTextDraft: {
          branchName: 'ot/forge-ea4347bf',
          commitMessage: null,
          pullRequestBody: '# Summary',
          pullRequestTitle: 'feat(monorepo): forge',
        },
      });

      const result = await draftGitTextToolHandler({ planId });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        token,
        expect.anything(),
        { input: { planId, scope: null, taskId: null } },
      );
      expect(result).toMatchObject({
        content: [
          {
            text: expect.stringMatching(
              /Branch: ot\/forge-ea4347bf[\s\S]*PR title: feat\(monorepo\): forge[\s\S]*PR body:/,
            ),
          },
        ],
      });
      expect(JSON.stringify(result)).not.toContain('Commit message');
    });
  });
});
