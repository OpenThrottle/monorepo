import { Test } from '@nestjs/testing';
import type { SemanticSearchChunk } from '@openthrottle/node-client';
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
        mode: null,
        offset: null,
        query: '   ',
      });

      expect(result).toEqual({
        chunks: [],
        mode: 'hybrid',
        reason: null,
        total: 0,
      });
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
        mode: null,
        offset: null,
        query: 'test',
      });

      expect(result.mode).toBe('lexical');
      expect(result.reason).toBe('embedder_unconfigured');
      expect(result.chunks).toEqual([
        expect.objectContaining({ id: 'plan-1', planTitle: 'Plan One' }),
      ]);
      expect(embed).toHaveBeenCalledWith(['test'], 'query');
      expect(runLexicalSearch).toHaveBeenCalledWith('test', 100);
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
        mode: 'semantic',
        offset: null,
        query: 'find plans about auth',
      });

      expect(embed).toHaveBeenCalledWith(['find plans about auth'], 'query');
      expect(runSemanticSearch).toHaveBeenCalledWith(
        [0.1, 0.2],
        100,
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

      const result = await resolver.search({
        limit: 5,
        mode: null,
        offset: null,
        query: 'anything',
      });

      expect(result).toEqual({
        chunks: [],
        mode: 'lexical',
        reason: 'no_embeddings',
        total: 0,
      });
    });

    describe('paging', () => {
      const ranked: SemanticSearchChunk[] = Array.from(
        { length: 120 },
        (_, index) => {
          return {
            content: `chunk ${index}`,
            id: `chunk-${index}`,
            metadata: {},
            planId: `plan-${index}`,
            planTitle: 'Plan',
            similarity: 1 - index / 1000,
            source: 'plan',
          };
        },
      );

      test('ranks one 100-candidate window regardless of limit', async () => {
        embed.mockResolvedValue(embedded([0.1]));
        vi.mocked(runSemanticSearch).mockResolvedValue([]);

        await resolver.search({
          limit: 5,
          mode: 'semantic',
          offset: null,
          query: 'test',
        });

        expect(runSemanticSearch).toHaveBeenCalledWith(
          [0.1],
          100,
          'nomic-embed-text-v1.5',
        );
      });

      test('clamps limit to max 50 and defaults it to 20', async () => {
        embed.mockResolvedValue(embedded([0.1]));
        vi.mocked(runSemanticSearch).mockResolvedValue(ranked);

        const clamped = await resolver.search({
          limit: 100,
          mode: 'semantic',
          offset: null,
          query: 'test',
        });
        const defaulted = await resolver.search({
          limit: null,
          mode: 'semantic',
          offset: null,
          query: 'test',
        });

        expect(clamped.chunks).toHaveLength(50);
        expect(defaulted.chunks).toHaveLength(20);
      });

      test('returns consecutive pages with no overlap or gap, and the capped total', async () => {
        embed.mockResolvedValue(embedded([0.1]));
        vi.mocked(runSemanticSearch).mockResolvedValue(ranked);

        const first = await resolver.search({
          limit: 10,
          mode: 'semantic',
          offset: 0,
          query: 'test',
        });
        const second = await resolver.search({
          limit: 10,
          mode: 'semantic',
          offset: 10,
          query: 'test',
        });

        expect(first.total).toBe(100);
        expect(first.chunks.map((chunk) => chunk.id)).toEqual(
          ranked.slice(0, 10).map((chunk) => chunk.id),
        );
        expect(second.chunks.map((chunk) => chunk.id)).toEqual(
          ranked.slice(10, 20).map((chunk) => chunk.id),
        );
      });

      test('pages the hybrid ranking without overlap', async () => {
        embed.mockResolvedValue(embedded([0.1]));
        vi.mocked(runSemanticSearch).mockResolvedValue(ranked.slice(0, 30));
        vi.mocked(runLexicalSearch).mockResolvedValue(ranked.slice(0, 30));

        const first = await resolver.search({
          limit: 10,
          mode: null,
          offset: 0,
          query: 'test',
        });
        const second = await resolver.search({
          limit: 10,
          mode: null,
          offset: 10,
          query: 'test',
        });
        const firstIds = first.chunks.map((chunk) => chunk.id);
        const secondIds = second.chunks.map((chunk) => chunk.id);

        expect(first.total).toBe(30);
        expect(firstIds).toHaveLength(10);
        expect(secondIds).toHaveLength(10);
        expect(firstIds.filter((id) => secondIds.includes(id))).toEqual([]);
      });

      test('pages the lexical fallback the same way', async () => {
        embed.mockResolvedValue({
          detail: 'no weights',
          ok: false,
          reason: 'unconfigured',
        });
        vi.mocked(runLexicalSearch).mockResolvedValue(ranked.slice(0, 15));

        const result = await resolver.search({
          limit: 10,
          mode: null,
          offset: 10,
          query: 'test',
        });

        expect(result.mode).toBe('lexical');
        expect(result.total).toBe(15);
        expect(result.chunks.map((chunk) => chunk.id)).toEqual(
          ranked.slice(10, 15).map((chunk) => chunk.id),
        );
      });

      test('returns no chunks for an offset past the total', async () => {
        embed.mockResolvedValue(embedded([0.1]));
        vi.mocked(runSemanticSearch).mockResolvedValue(ranked.slice(0, 5));

        const result = await resolver.search({
          limit: 10,
          mode: 'semantic',
          offset: 40,
          query: 'test',
        });

        expect(result.chunks).toEqual([]);
        expect(result.total).toBe(5);
      });
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
        mode: 'semantic',
        offset: null,
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
        mode: 'semantic',
        offset: null,
        query: 'plan',
      });

      expect(result.chunks[0]?.sourcePath).toBeNull();
      expect(result.chunks[0]?.sourceRepo).toBeNull();
      expect(result.chunks[0]?.sourceSha).toBeNull();
    });

    describe('when the mode is hybrid (the default)', () => {
      test('fuses vector and full-text hits by entity over one candidate window', async () => {
        embed.mockResolvedValue(embedded([0.1]));
        vi.mocked(runSemanticSearch).mockResolvedValue([
          {
            content: 'Plan A chunk 1',
            id: 'pe-a-1',
            metadata: {},
            planId: 'plan-a',
            planTitle: 'A',
            similarity: 0.9,
            source: 'plan',
          },
          {
            content: 'Plan A chunk 2',
            id: 'pe-a-2',
            metadata: {},
            planId: 'plan-a',
            planTitle: 'A',
            similarity: 0.85,
            source: 'plan',
          },
          {
            content: 'Plan B chunk',
            id: 'pe-b',
            metadata: {},
            planId: 'plan-b',
            planTitle: 'B',
            similarity: 0.8,
            source: 'plan',
          },
        ]);
        vi.mocked(runLexicalSearch).mockResolvedValue([
          {
            content: 'Plan B row',
            id: 'plan-b',
            metadata: {},
            planId: 'plan-b',
            planTitle: 'B',
            similarity: 0.5,
            source: 'plan',
          },
        ]);

        const result = await resolver.search({
          limit: 5,
          mode: null,
          offset: null,
          query: 'B-only identifier',
        });

        expect(runSemanticSearch).toHaveBeenCalledWith(
          [0.1],
          100,
          'nomic-embed-text-v1.5',
        );
        expect(runLexicalSearch).toHaveBeenCalledWith('B-only identifier', 100);
        expect(result.mode).toBe('hybrid');
        expect(result.reason).toBeNull();
        expect(result.chunks.map((chunk) => chunk.id)).toEqual([
          'pe-b',
          'pe-a-1',
        ]);
        expect(result.chunks[0]?.fusedScore).toBeCloseTo(1 / 62 + 1 / 61);
      });
    });

    describe('when the mode is unknown', () => {
      test('rejects it as bad user input', async () => {
        await expect(
          resolver.search({
            limit: 5,
            mode: 'lexical',
            offset: null,
            query: 'q',
          }),
        ).rejects.toMatchObject({
          extensions: { code: 'BAD_USER_INPUT' },
        });
        expect(embed).not.toHaveBeenCalled();
      });
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
