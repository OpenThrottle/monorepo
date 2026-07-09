/**
 * @description Handler tests for plan output MCP tools (append_plan_output, get_plan_output) — core Ralph traceability — with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendPlanOutputToolHandler,
  getPlanOutputToolHandler,
} from './output.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const planId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const serviceAccountToken = 'ot_sa_testprefix_testsecret';

describe('appendPlanOutputToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await appendPlanOutputToolHandler({});

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when content is empty', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await appendPlanOutputToolHandler({
        content: '',
        planId,
      });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/content must be non-empty/) }],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL appends the chunk', () => {
    it('maps the input through and defaults iteration to null', async () => {
      const chunk = { content: 'iteration log', id: 'chunk-1', planId };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        appendPlanOutput: chunk,
      });

      const result = await appendPlanOutputToolHandler({
        content: 'iteration log',
        planId,
      });

      expect(result).toMatchObject({ structuredContent: { chunk } });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { content: 'iteration log', iteration: null, planId } },
      );
    });

    it('passes an explicit iteration through', async () => {
      const chunk = { content: 'log', id: 'chunk-2', planId };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        appendPlanOutput: chunk,
      });

      await appendPlanOutputToolHandler({
        content: 'log',
        iteration: 7,
        planId,
      });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { content: 'log', iteration: 7, planId } },
      );
    });
  });

  describe('when GraphQL returns no chunk', () => {
    it('returns a no-result error', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        appendPlanOutput: null,
      });

      const result = await appendPlanOutputToolHandler({
        content: 'log',
        planId,
      });

      expect(result).toEqual({
        content: [
          { text: 'append_plan_output returned no result', type: 'text' },
        ],
        isError: true,
      });
    });
  });
});

describe('getPlanOutputToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await getPlanOutputToolHandler({});

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns chunks', () => {
    it('returns structured chunks and maps the input through', async () => {
      const chunks = [{ content: 'log', id: 'chunk-1', planId }];
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        planOutputStreamChunks: chunks,
      });

      const result = await getPlanOutputToolHandler({ planId });

      expect(result).toMatchObject({ structuredContent: { chunks } });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { planId } },
      );
    });
  });

  describe('when GraphQL returns no chunks', () => {
    it('returns an empty chunk list', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        planOutputStreamChunks: [],
      });

      const result = await getPlanOutputToolHandler({ planId });

      expect(result).toMatchObject({
        content: [{ text: 'No output chunks for this plan.' }],
        structuredContent: { chunks: [] },
      });
    });
  });
});
