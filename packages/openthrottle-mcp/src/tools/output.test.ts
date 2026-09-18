/**
 * @description Handler tests for plan output MCP tools (append_plan_output, get_plan_output) — core Ralph traceability — with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AppendPlanOutputDocument,
  GetPlanOutputStreamChunksDocument,
} from '../__generated__/graphql.js';
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

/**
 * The handler tests below mock the GraphQL transport, so they can only prove that
 * whatever the server returns is passed through — never that the document actually
 * asked for a field. `taskId` was stored but never returned precisely because it was
 * missing from these selection sets, and no mocked test could see that. These assert
 * on the generated documents themselves so a future selection-set trim fails here.
 */
function rootFieldNames(document: {
  readonly definitions: readonly unknown[];
}): readonly string[] {
  const operation = document.definitions.find(isOperationDefinition);
  if (!operation) return [];

  const rootField = operation.selectionSet.selections.find(isField);
  return (
    rootField?.selectionSet?.selections
      .filter(isField)
      .map((field) => field.name.value) ?? []
  );
}

interface FieldLike {
  readonly kind: string;
  readonly name: { readonly value: string };
  readonly selectionSet?: { readonly selections: readonly unknown[] };
}

interface OperationDefinitionLike {
  readonly kind: string;
  readonly selectionSet: { readonly selections: readonly unknown[] };
}

function isField(node: unknown): node is FieldLike {
  return (
    typeof node === 'object' &&
    node !== null &&
    'kind' in node &&
    node.kind === 'Field'
  );
}

function isOperationDefinition(node: unknown): node is OperationDefinitionLike {
  return (
    typeof node === 'object' &&
    node !== null &&
    'kind' in node &&
    node.kind === 'OperationDefinition'
  );
}

describe('the generated plan-output documents', () => {
  describe('appendPlanOutput', () => {
    it('selects taskId, so the mutation response can be attributed to a task', () => {
      expect(rootFieldNames(AppendPlanOutputDocument)).toContain('taskId');
    });
  });

  describe('getPlanOutputStreamChunks', () => {
    it('selects taskId, so a reader can tell tagged narration from untagged', () => {
      expect(rootFieldNames(GetPlanOutputStreamChunksDocument)).toContain(
        'taskId',
      );
    });
  });
});

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

      const result = await appendPlanOutputToolHandler({
        content: 'task log',
        planId,
        taskId,
      });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { content: 'task log', iteration: null, planId, taskId } },
      );
      expect(result).toMatchObject({
        structuredContent: { chunk: { taskId } },
      });
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
        { input: { limit: null, offset: null, planId, taskId: null } },
      );
    });

    it('forwards a taskId filter into the GraphQL variables', async () => {
      const outputTaskId = 'b7c8d9e0-f1a2-4b3c-8d4e-5f6a7b8c9d0e';
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        planOutputStreamChunks: [],
      });

      await getPlanOutputToolHandler({ planId, taskId: outputTaskId });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        {
          input: {
            limit: null,
            offset: null,
            planId,
            taskId: outputTaskId,
          },
        },
      );
    });

    // limit/offset were accepted by the generated schema but dropped before the
    // request, so a paged read silently returned the default first page.
    it('forwards limit and offset instead of dropping them', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        planOutputStreamChunks: [],
      });

      await getPlanOutputToolHandler({ limit: 25, offset: 50, planId });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { limit: 25, offset: 50, planId, taskId: null } },
      );
    });

    it('round-trips taskId, keeping tagged and untagged chunks distinguishable', async () => {
      const taskId = 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7';
      const chunks = [
        { content: 'task log', id: 'chunk-1', planId, taskId },
        { content: 'plan log', id: 'chunk-2', planId, taskId: null },
      ];
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        planOutputStreamChunks: chunks,
      });

      const result = await getPlanOutputToolHandler({ planId });

      expect(result).toMatchObject({ structuredContent: { chunks } });
      expect(result.content?.[0]?.text).toContain(taskId);
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

    it('names the task in the empty message when filtering by taskId', async () => {
      const outputTaskId = 'b7c8d9e0-f1a2-4b3c-8d4e-5f6a7b8c9d0e';
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        planOutputStreamChunks: [],
      });

      const result = await getPlanOutputToolHandler({
        planId,
        taskId: outputTaskId,
      });

      expect(result).toMatchObject({
        content: [
          {
            text: `No output chunks attributed to task ${outputTaskId} on this plan.`,
          },
        ],
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
