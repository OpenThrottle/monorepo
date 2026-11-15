import { Test } from '@nestjs/testing';
import {
  getChunkById,
  listSources,
  runLexicalSearch,
  runSemanticSearch,
} from '@openthrottle/node-client';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { EmbedderService } from '../../services/embedder/embedder.service.ts';
import { SearchResolver } from './search.resolver.ts';

vi.mock('@openthrottle/node-client', () => ({
  getChunkById: vi.fn(),
  listSources: vi.fn(),
  runLexicalSearch: vi.fn(),
  runSemanticSearch: vi.fn(),
}));

const embed = vi.fn();

function embedded(vector: number[]): unknown {
  return {
    dims: vector.length,
    model: 'nomic-embed-text-v1.5',
    ok: true,
    vectors: [vector],
  };
}

describe('SearchResolver', () => {
  let resolver: SearchResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SearchResolver,
        { provide: EmbedderService, useValue: { embed } },
      ],
    }).compile();

    resolver = app.get<SearchResolver>(SearchResolver);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    test('returns empty chunks when query is empty after trim', async () => {
      const result = await resolver.search({
        limit: null,
        query: '   ',
      });

      expect(result).toEqual({ chunks: [], mode: 'semantic', reason: null });
      expect(embed).not.toHaveBeenCalled();
    });

    test('answers lexically, with the reason, when the embedder is unconfigured', async () => {
      vi.mocked(runLexicalSearch).mockResolvedValue([
        {
          content: 'Plan body',
          id: 'plan-1',
          metadata: {},
          planId: 'plan-1',
          planTitle: 'Plan One',
          similarity: 0.4,
          source: 'plan',
        },
      ]);
      embed.mockResolvedValue({
        detail: 'no weights',
        ok: false,
        reason: 'unconfigured',
      });

      const result = await resolver.search({
        limit: 10,
        query: 'test',
      });

      expect(result.mode).toBe('lexical');
      expect(result.reason).toBe('embedder_unconfigured');
      expect(result.chunks).toEqual([
        expect.objectContaining({ id: 'plan-1', planTitle: 'Plan One' }),
      ]);
      expect(embed).toHaveBeenCalledWith(['test'], 'query');
      expect(runLexicalSearch).toHaveBeenCalledWith('test', 10);
      expect(runSemanticSearch).not.toHaveBeenCalled();
    });

    test('returns mapped chunks when embed and search succeed', async () => {
      embed.mockResolvedValue(embedded([0.1, 0.2]));
      vi.mocked(runSemanticSearch).mockResolvedValue([
        {
          content: 'Plan chunk text',
          id: 'chunk-plan-uuid',
          metadata: {},
          planId: 'plan-uuid',
          planTitle: 'My Plan',
          similarity: 0.92,
          source: 'plan',
        },
        {
          content: 'Task chunk text',
          id: 'chunk-task-uuid',
          metadata: {},
          planId: 'plan-uuid',
          planTitle: 'My Plan',
          similarity: 0.88,
          source: 'task',
          taskId: 'task-uuid',
          taskTitle: 'My Task',
        },
      ]);

      const result = await resolver.search({
        limit: 5,
        query: 'find plans about auth',
      });

      expect(embed).toHaveBeenCalledWith(['find plans about auth'], 'query');
      expect(runSemanticSearch).toHaveBeenCalledWith(
        [0.1, 0.2],
        5,
        'nomic-embed-text-v1.5',
      );
      expect(result.mode).toBe('semantic');
      expect(result.reason).toBeNull();
      expect(result.chunks).toHaveLength(2);
      expect(result.chunks[0]).toMatchObject({
        content: 'Plan chunk text',
        id: 'chunk-plan-uuid',
        planId: 'plan-uuid',
        planTitle: 'My Plan',
        similarity: 0.92,
        source: 'plan',
        taskId: null,
        taskTitle: null,
      });
      expect(result.chunks[1]).toMatchObject({
        content: 'Task chunk text',
        id: 'chunk-task-uuid',
        planId: 'plan-uuid',
        planTitle: 'My Plan',
        similarity: 0.88,
        source: 'task',
        taskId: 'task-uuid',
        taskTitle: 'My Task',
      });
    });

    test('falls back to lexical with no_embeddings when no vector matches the model', async () => {
      embed.mockResolvedValue(embedded([0.1]));
      vi.mocked(runSemanticSearch).mockResolvedValue([]);
      vi.mocked(runLexicalSearch).mockResolvedValue([]);

      const result = await resolver.search({ limit: 5, query: 'anything' });

      expect(result).toEqual({
        chunks: [],
        mode: 'lexical',
        reason: 'no_embeddings',
      });
    });

    test('clamps limit to max 50', async () => {
      embed.mockResolvedValue(embedded([0.1]));
      vi.mocked(runSemanticSearch).mockResolvedValue([]);

      await resolver.search({
        limit: 100,
        query: 'test',
      });

      expect(runSemanticSearch).toHaveBeenCalledWith(
        [0.1],
        50,
        'nomic-embed-text-v1.5',
      );
    });

    test('uses default limit 20 when limit is null', async () => {
      embed.mockResolvedValue(embedded([0.1]));
      vi.mocked(runSemanticSearch).mockResolvedValue([]);

      await resolver.search({
        limit: null,
        query: 'test',
      });

      expect(runSemanticSearch).toHaveBeenCalledWith(
        [0.1],
        20,
        'nomic-embed-text-v1.5',
      );
    });

    test('maps documentation chunks with sourcePath, sourceRepo, sourceSha', async () => {
      embed.mockResolvedValue(embedded([0.1]));
      vi.mocked(runSemanticSearch).mockResolvedValue([
        {
          content: 'Doc chunk text',
          id: 'doc-chunk-uuid',
          metadata: {},
          path: 'docs/openthrottle/desktop-notifications-testing.md',
          repo: 'openthrottle/monorepo',
          sha: 'abc123def',
          similarity: 0.85,
          source: 'documentation',
        },
      ]);

      const result = await resolver.search({
        limit: 10,
        query: 'notifications',
      });

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]).toMatchObject({
        content: 'Doc chunk text',
        id: 'doc-chunk-uuid',
        similarity: 0.85,
        source: 'documentation',
        sourcePath: 'docs/openthrottle/desktop-notifications-testing.md',
        sourceRepo: 'openthrottle/monorepo',
        sourceSha: 'abc123def',
      });
      expect(result.chunks[0]?.planId).toBeNull();
      expect(result.chunks[0]?.taskId).toBeNull();
    });

    test('sets sourcePath/sourceRepo/sourceSha to null for non-documentation chunks', async () => {
      embed.mockResolvedValue(embedded([0.1]));
      vi.mocked(runSemanticSearch).mockResolvedValue([
        {
          content: 'Plan chunk',
          id: 'plan-chunk',
          metadata: {},
          planId: 'plan-uuid',
          planTitle: 'Plan',
          similarity: 0.9,
          source: 'plan',
        },
      ]);

      const result = await resolver.search({
        limit: 10,
        query: 'plan',
      });

      expect(result.chunks[0]?.sourcePath).toBeNull();
      expect(result.chunks[0]?.sourceRepo).toBeNull();
      expect(result.chunks[0]?.sourceSha).toBeNull();
    });
  });

  describe('getDocument', () => {
    test('returns null when chunk not found', async () => {
      vi.mocked(getChunkById).mockResolvedValue(null);

      const result = await resolver.getDocument('missing-uuid');

      expect(result).toBeNull();
      expect(getChunkById).toHaveBeenCalledWith('missing-uuid');
    });

    test('returns mapped chunk when found', async () => {
      vi.mocked(getChunkById).mockResolvedValue({
        content: 'Chunk content',
        id: 'chunk-uuid',
        metadata: {},
        planId: 'plan-uuid',
        planTitle: 'My Plan',
        similarity: 1,
        source: 'plan',
        taskId: undefined,
        taskTitle: undefined,
      });

      const result = await resolver.getDocument('chunk-uuid');

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        content: 'Chunk content',
        id: 'chunk-uuid',
        planId: 'plan-uuid',
        planTitle: 'My Plan',
        similarity: 1,
        source: 'plan',
      });
    });
  });

  describe('listSources', () => {
    test('returns mapped sources and plans', async () => {
      vi.mocked(listSources).mockResolvedValue({
        plans: [
          { id: 'plan-1', title: 'Plan One' },
          { id: 'plan-2', title: 'Plan Two' },
        ],
        sources: [
          { description: 'Embedded plan content chunks', name: 'plan' },
          { description: 'Embedded task content chunks', name: 'task' },
        ],
      });

      const result = await resolver.listSources();

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0]).toMatchObject({
        description: 'Embedded plan content chunks',
        name: 'plan',
      });
      expect(result.plans).toHaveLength(2);
      expect(result.plans[0]).toMatchObject({
        id: 'plan-1',
        title: 'Plan One',
      });
    });
  });
});
