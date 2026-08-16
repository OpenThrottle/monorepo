/**
 * @description Handler tests for plan output MCP tools (append_plan_output, get_plan_output) — core Ralph traceability — with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendPlanOutputToolHandler,
  deletePlanOutputToolHandler,
  getPlanOutputToolHandler,
} from './output.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const planId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const serviceAccountToken = '***REMOVED-OT-TOKEN***';

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
        content: [
          {
            text: expect.stringMatching(
              /Invalid arguments[\s\S]*content is required/i,
            ),
          },
        ],
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
        {
          input: {
            content: 'iteration log',
            iteration: null,
            planId,
            taskId: null,
          },
        },
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
        { input: { content: 'log', iteration: 7, planId, taskId: null } },
      );
    });

    it('forwards taskId when provided (task-scoped output)', async () => {
      const taskId = 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7';
      const chunk = { content: 'task log', id: 'chunk-3', planId, taskId };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        appendPlanOutput: chunk,
      });

      await appendPlanOutputToolHandler({
        content: 'task log',
        planId,
        taskId,
      });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { content: 'task log', iteration: null, planId, taskId } },
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

describe('deletePlanOutputToolHandler', () => {
  const chunkId = 'c1a2b3c4-d5e6-4789-a0b1-c2d3e4f5a6b7';
  const taskId = 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7';

  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await deletePlanOutputToolHandler({});

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when deleting a single chunk by id', () => {
    it('forwards chunkId and surfaces the deleted count', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deletePlanOutput: { deletedCount: 1 },
      });

      const result = await deletePlanOutputToolHandler({ chunkId, planId });

      expect(result).toMatchObject({ structuredContent: { deletedCount: 1 } });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { chunkId, planId, taskId: null } },
      );
    });
  });

  describe('when clearing all chunks for a plan', () => {
    it('sends null chunkId/taskId and surfaces the count', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deletePlanOutput: { deletedCount: 4 },
      });

      const result = await deletePlanOutputToolHandler({ planId });

      expect(result).toMatchObject({ structuredContent: { deletedCount: 4 } });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { chunkId: null, planId, taskId: null } },
      );
    });
  });

  describe('when clearing a plan scoped to a task', () => {
    it('forwards taskId with a null chunkId', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deletePlanOutput: { deletedCount: 2 },
      });

      await deletePlanOutputToolHandler({ planId, taskId });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { chunkId: null, planId, taskId } },
      );
    });
  });

  describe('when nothing is deleted', () => {
    it('surfaces a deleted count of zero', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deletePlanOutput: { deletedCount: 0 },
      });

      const result = await deletePlanOutputToolHandler({ planId });

      expect(result).toMatchObject({ structuredContent: { deletedCount: 0 } });
    });
  });

  describe('when GraphQL returns no result', () => {
    it('returns a no-result error', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deletePlanOutput: null,
      });

      const result = await deletePlanOutputToolHandler({ planId });

      expect(result).toEqual({
        content: [
          { text: 'delete_plan_output returned no result', type: 'text' },
        ],
        isError: true,
      });
    });
  });
});
