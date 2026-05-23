/**
 * @description Handler tests for search MCP tools with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocumentToolHandler, semanticSearchToolHandler } from './search.js';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const serviceAccountToken = 'ot_sa_testprefix_testsecret';
const chunkId = '00000000-0000-4000-8000-000000000001';

describe('semanticSearchToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.MCP_DEVELOPER_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.MCP_DEVELOPER_AUTH_TOKEN;
  });

  describe('when query is invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await semanticSearchToolHandler({ query: '' });

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/Invalid arguments[\s\S]*query/i) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns chunks', () => {
    it('returns structured search results', async () => {
      const chunks = [
        {
          content: 'Improve test coverage and CI test execution',
          id: chunkId,
          planTitle: 'Improve test coverage',
          similarity: 0.912,
          source: 'plan',
          taskTitle: null,
        },
      ];
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        search: { chunks },
      });

      const result = await semanticSearchToolHandler({
        limit: 5,
        query: 'test coverage',
      });

      expect(result).toMatchObject({
        structuredContent: { chunks },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { limit: 5, query: 'test coverage' } },
      );
    });
  });

  describe('when GraphQL returns no chunks', () => {
    it('returns an empty result message', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        search: { chunks: [] },
      });

      const result = await semanticSearchToolHandler({
        query: 'missing topic',
      });

      expect(result).toMatchObject({
        content: [{ text: 'No matching chunks found.' }],
        structuredContent: { chunks: [] },
      });
    });
  });
});

describe('getDocumentToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.MCP_DEVELOPER_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.MCP_DEVELOPER_AUTH_TOKEN;
  });

  describe('when GraphQL returns a chunk', () => {
    it('returns structured document content', async () => {
      const chunk = {
        content: 'Plan details for test coverage work',
        id: chunkId,
        planTitle: 'Improve test coverage',
        source: 'plan',
        taskTitle: null,
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        getDocument: chunk,
      });

      const result = await getDocumentToolHandler({ id: chunkId });

      expect(result).toMatchObject({
        structuredContent: { chunk },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { id: chunkId },
      );
    });
  });

  describe('when GraphQL returns no chunk', () => {
    it('returns a not-found error', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        getDocument: null,
      });

      const result = await getDocumentToolHandler({ id: chunkId });

      expect(result).toEqual({
        content: [
          {
            text: `get_document failed: No document found for id: ${chunkId}`,
            type: 'text',
          },
        ],
        isError: true,
      });
    });
  });
});
