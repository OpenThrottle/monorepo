import {
  embedQuery,
  getChunkById,
  getCortexPostgresConfig,
  listSources,
  runSemanticSearch,
} from '@openthrottle/ai-mcp/src/cortex-server';
import { Test } from '@nestjs/testing';
import { describe, expect, test, beforeAll, vi } from 'vitest';
import { SearchResolver } from './search.resolver';

vi.mock('@openthrottle/ai-mcp/src/cortex-server', () => ({
  embedQuery: vi.fn(),
  getChunkById: vi.fn(),
  getCortexPostgresConfig: vi.fn(),
  listSources: vi.fn(),
  runSemanticSearch: vi.fn(),
}));

describe('SearchResolver', () => {
  let resolver: SearchResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [SearchResolver],
    }).compile();

    resolver = app.get<SearchResolver>(SearchResolver);
  });

  describe('search', () => {
    test('returns empty chunks when Cortex config is missing', async () => {
      vi.mocked(getCortexPostgresConfig).mockReturnValue(undefined);

      const result = await resolver.search({
        limit: null,
        query: 'find plans about auth',
      });

      expect(result).toEqual({ chunks: [] });
      expect(embedQuery).not.toHaveBeenCalled();
      expect(runSemanticSearch).not.toHaveBeenCalled();
    });

    test('returns empty chunks when query is empty after trim', async () => {
      vi.mocked(getCortexPostgresConfig).mockReturnValue({
        connectionString: 'postgresql://localhost/cortex',
      });

      const result = await resolver.search({
        limit: null,
        query: '   ',
      });

      expect(result).toEqual({ chunks: [] });
      expect(embedQuery).not.toHaveBeenCalled();
    });

    test('returns empty chunks when embedQuery returns undefined', async () => {
      vi.mocked(getCortexPostgresConfig).mockReturnValue({
        connectionString: 'postgresql://localhost/cortex',
      });
      vi.mocked(embedQuery).mockResolvedValue(undefined);

      const result = await resolver.search({
        limit: 10,
        query: 'test',
      });

      expect(result).toEqual({ chunks: [] });
      expect(embedQuery).toHaveBeenCalledWith('test');
      expect(runSemanticSearch).not.toHaveBeenCalled();
    });

    test('returns mapped chunks when config, embed, and search succeed', async () => {
      const config = {
        connectionString: 'postgresql://localhost/cortex',
      };
      vi.mocked(getCortexPostgresConfig).mockReturnValue(config);
      vi.mocked(embedQuery).mockResolvedValue([0.1, 0.2]);
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

      expect(embedQuery).toHaveBeenCalledWith('find plans about auth');
      expect(runSemanticSearch).toHaveBeenCalledWith(config, [0.1, 0.2], 5);
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

    test('clamps limit to max 50', async () => {
      const config = {
        connectionString: 'postgresql://localhost/cortex',
      };
      vi.mocked(getCortexPostgresConfig).mockReturnValue(config);
      vi.mocked(embedQuery).mockResolvedValue([0.1]);
      vi.mocked(runSemanticSearch).mockResolvedValue([]);

      await resolver.search({
        limit: 100,
        query: 'test',
      });

      expect(runSemanticSearch).toHaveBeenCalledWith(config, [0.1], 50);
    });

    test('uses default limit 20 when limit is null', async () => {
      const config = {
        connectionString: 'postgresql://localhost/cortex',
      };
      vi.mocked(getCortexPostgresConfig).mockReturnValue(config);
      vi.mocked(embedQuery).mockResolvedValue([0.1]);
      vi.mocked(runSemanticSearch).mockResolvedValue([]);

      await resolver.search({
        limit: null,
        query: 'test',
      });

      expect(runSemanticSearch).toHaveBeenCalledWith(config, [0.1], 20);
    });

    test('maps documentation chunks with sourcePath, sourceRepo, sourceSha', async () => {
      const config = {
        connectionString: 'postgresql://localhost/cortex',
      };
      vi.mocked(getCortexPostgresConfig).mockReturnValue(config);
      vi.mocked(embedQuery).mockResolvedValue([0.1]);
      vi.mocked(runSemanticSearch).mockResolvedValue([
        {
          content: 'Doc chunk text',
          id: 'doc-chunk-uuid',
          metadata: {},
          path: 'docs/openthrottle/desktop-notifications-testing.md',
          repo: 'visormatt/monorepo',
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
        sourceRepo: 'visormatt/monorepo',
        sourceSha: 'abc123def',
      });
      expect(result.chunks[0].planId).toBeNull();
      expect(result.chunks[0].taskId).toBeNull();
    });

    test('sets sourcePath/sourceRepo/sourceSha to null for non-documentation chunks', async () => {
      const config = {
        connectionString: 'postgresql://localhost/cortex',
      };
      vi.mocked(getCortexPostgresConfig).mockReturnValue(config);
      vi.mocked(embedQuery).mockResolvedValue([0.1]);
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

      expect(result.chunks[0].sourcePath).toBeNull();
      expect(result.chunks[0].sourceRepo).toBeNull();
      expect(result.chunks[0].sourceSha).toBeNull();
    });
  });

  describe('getDocument', () => {
    test('returns null when Cortex config is missing', async () => {
      vi.mocked(getCortexPostgresConfig).mockReturnValue(undefined);

      const result = await resolver.getDocument('chunk-uuid');

      expect(result).toBeNull();
      expect(getChunkById).not.toHaveBeenCalled();
    });

    test('returns null when chunk not found', async () => {
      vi.mocked(getCortexPostgresConfig).mockReturnValue({
        connectionString: 'postgresql://localhost/cortex',
      });
      vi.mocked(getChunkById).mockResolvedValue(null);

      const result = await resolver.getDocument('missing-uuid');

      expect(result).toBeNull();
      expect(getChunkById).toHaveBeenCalledWith(
        expect.any(Object),
        'missing-uuid',
      );
    });

    test('returns mapped chunk when found', async () => {
      vi.mocked(getCortexPostgresConfig).mockReturnValue({
        connectionString: 'postgresql://localhost/cortex',
      });
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
    test('returns empty sources and plans when Cortex config is missing', async () => {
      vi.mocked(getCortexPostgresConfig).mockReturnValue(undefined);

      const result = await resolver.listSources();

      expect(result).toEqual({ plans: [], sources: [] });
      expect(listSources).not.toHaveBeenCalled();
    });

    test('returns mapped sources and plans when config present', async () => {
      vi.mocked(getCortexPostgresConfig).mockReturnValue({
        connectionString: 'postgresql://localhost/cortex',
      });
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
