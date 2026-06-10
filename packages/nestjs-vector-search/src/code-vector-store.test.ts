import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { hashContent } from '@openthrottle/openthrottle-ide';
import type { StoredChunk } from '@openthrottle/openthrottle-ide';
import { DataSource } from 'typeorm';
import { CodeVectorStore } from './code-vector-store';

const WORKSPACE = '/Users/dev/repo';

function buildStoredChunk(
  overrides: Partial<StoredChunk['chunk']> = {},
): StoredChunk {
  return {
    chunk: {
      content: 'export const x = 1;',
      endLine: 3,
      id: 'chunk-1',
      path: 'src/a.ts',
      startLine: 1,
      ...overrides,
    },
    embedding: Array.from({ length: 1536 }, (_unused, i) => i / 1536),
  };
}

describe('CodeVectorStore', () => {
  let dataSource: DataSource;
  let store: CodeVectorStore;

  function queryMock(): ReturnType<typeof vi.mocked<DataSource['query']>> {
    return vi.mocked(dataSource.query);
  }

  beforeEach(() => {
    dataSource = createMock<DataSource>();
    queryMock().mockResolvedValue([]);
    store = new CodeVectorStore(dataSource);
  });

  describe('clear', () => {
    it('deletes every chunk scoped to the workspace', async () => {
      await store.clear(WORKSPACE);

      const [sql, params] = queryMock().mock.calls[0];
      expect(sql).toContain(
        'DELETE FROM code_embeddings WHERE workspace_root = $1',
      );
      expect(params).toEqual([WORKSPACE]);
    });
  });

  describe('count', () => {
    it('returns the COUNT(*) for the workspace as a number', async () => {
      queryMock().mockResolvedValueOnce([{ count: '12' }]);
      const total = await store.count(WORKSPACE);

      const [sql, params] = queryMock().mock.calls[0];
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('WHERE workspace_root = $1');
      expect(params).toEqual([WORKSPACE]);
      expect(total).toBe(12);
    });

    it('returns 0 when there are no rows', async () => {
      queryMock().mockResolvedValueOnce([]);
      expect(await store.count(WORKSPACE)).toBe(0);
    });
  });

  describe('deleteByPaths', () => {
    it('deletes only the given paths via ANY()', async () => {
      await store.deleteByPaths(WORKSPACE, ['src/a.ts', 'src/b.ts']);

      const [sql, params] = queryMock().mock.calls[0];
      expect(sql).toContain('path = ANY($2)');
      expect(params).toEqual([WORKSPACE, ['src/a.ts', 'src/b.ts']]);
    });

    it('is a no-op (no query) when paths is empty', async () => {
      await store.deleteByPaths(WORKSPACE, []);
      expect(queryMock()).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('passes the vector literal + topK and maps rows to VectorMatch with [0,1] score', async () => {
      queryMock().mockResolvedValueOnce([
        {
          content: 'hello',
          end_line: '9',
          id: 'c1',
          path: 'src/a.ts',
          similarity: '0.87',
          start_line: '4',
        },
      ]);

      const embedding = [0.1, 0.2, 0.3];
      const matches = await store.query(WORKSPACE, embedding, 5);

      const [sql, params] = queryMock().mock.calls[0];
      expect(sql).toContain('1 - (embedding <=> $1::vector) AS similarity');
      expect(sql).toContain('ORDER BY embedding <=> $1::vector');
      expect(params).toEqual(['[0.1,0.2,0.3]', WORKSPACE, 5]);

      expect(matches).toEqual([
        {
          chunk: {
            content: 'hello',
            endLine: 9,
            id: 'c1',
            path: 'src/a.ts',
            startLine: 4,
          },
          score: 0.87,
        },
      ]);
    });
  });

  describe('upsert', () => {
    it('is a no-op when there are no records', async () => {
      await store.upsert(WORKSPACE, []);
      expect(queryMock()).not.toHaveBeenCalled();
    });

    it('emits an ON CONFLICT (id) upsert with a ::vector cast and computed content_hash', async () => {
      const record = buildStoredChunk();
      await store.upsert(WORKSPACE, [record]);

      const call = queryMock().mock.calls[0];
      const sql = call?.[0] ?? '';
      const params = call?.[1] ?? [];
      expect(sql).toContain('INSERT INTO code_embeddings');
      expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
      expect(sql).toContain('$8::vector');
      // 8 columns for one record.
      expect(params).toHaveLength(8);
      expect(params[0]).toBe('chunk-1');
      expect(params[1]).toBe(WORKSPACE);
      expect(params[6]).toBe(hashContent(record.chunk.content));
      expect(params[7]).toBe(`[${record.embedding.join(',')}]`);
    });

    it('batches large record sets into multiple INSERTs', async () => {
      const records = Array.from({ length: 250 }, (_unused, i) =>
        buildStoredChunk({ id: `chunk-${i}` }),
      );
      await store.upsert(WORKSPACE, records);

      // 250 records with a 200-row batch size => 2 INSERT statements.
      expect(queryMock()).toHaveBeenCalledTimes(2);
      expect(queryMock().mock.calls[0][1]).toHaveLength(200 * 8);
      expect(queryMock().mock.calls[1][1]).toHaveLength(50 * 8);
    });
  });
});
