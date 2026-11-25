/**
 * @description Handler tests for the code_search MCP tool with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureCallerWorkspacePath } from '../../config/workspace-path.ts';
import { codeSearchToolHandler } from '../code-search.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const serviceAccountToken = 'ot_sa_test_token';
const repositoryId = '00000000-0000-4000-8000-000000000001';
const workspace = '/Users/dev/repo';

const match = (path: string, score: number, content = 'const x = 1;') => {
  return { content, endLine: 12, path, score, startLine: 3 };
};

const mockSearch = (available: boolean, matches: unknown[]): void => {
  vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
    codeSemanticSearch: { available, matches },
  });
};

const sentInput = (): unknown => {
  return vi.mocked(executeGraphqlWithAuth).mock.calls[0]?.[2];
};

describe('codeSearchToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
    captureCallerWorkspacePath(workspace);
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    captureCallerWorkspacePath(null);
  });

  describe('when query is invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await codeSearchToolHandler({ query: '' });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when no repository can be named', () => {
    it('returns an invalid-args error on a surface with no workspace', async () => {
      captureCallerWorkspacePath(null);

      const result = await codeSearchToolHandler({ query: 'parseDate' });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when no repositoryId is passed', () => {
    it('sends the captured workspace and the default limit', async () => {
      mockSearch(true, []);

      await codeSearchToolHandler({ query: 'parseDate' });

      expect(sentInput()).toEqual({
        input: {
          limit: 8,
          query: 'parseDate',
          repositoryId: null,
          workspacePath: workspace,
        },
      });
    });
  });

  describe('when a repositoryId is passed', () => {
    it('sends it instead of the workspace', async () => {
      mockSearch(true, []);

      await codeSearchToolHandler({
        limit: 3,
        query: 'parseDate',
        repositoryId,
      });

      expect(sentInput()).toEqual({
        input: {
          limit: 3,
          query: 'parseDate',
          repositoryId,
          workspacePath: null,
        },
      });
    });
  });

  describe('when the server returns matches', () => {
    it('returns them best first with a clipped snippet', async () => {
      const longBody = Array.from({ length: 10 }, (_, i) => `line ${i}`).join(
        '\n',
      );
      mockSearch(true, [match('b.ts', 0.4), match('a.ts', 0.9, longBody)]);

      const result = await codeSearchToolHandler({ query: 'parseDate' });

      expect('structuredContent' in result).toBe(true);
      if (!('structuredContent' in result)) return;
      const { matches } = result.structuredContent;
      expect(matches.map((hit) => hit.path)).toEqual(['a.ts', 'b.ts']);
      expect(matches[0]?.snippet.split('\n')).toHaveLength(7);
      expect(result.content[0]?.text).toMatch(/^a\.ts:3-12 \(score: 0\.900\)/);
    });
  });

  describe('when code search is unavailable', () => {
    it('says so instead of returning an empty list', async () => {
      mockSearch(false, []);

      const result = await codeSearchToolHandler({ query: 'parseDate' });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/unavailable/) }],
        structuredContent: { available: false, matches: [] },
      });
    });
  });

  describe('when nothing matches', () => {
    it('returns a not-found message', async () => {
      mockSearch(true, []);

      const result = await codeSearchToolHandler({ query: 'parseDate' });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/No matching code/) }],
      });
    });
  });
});
