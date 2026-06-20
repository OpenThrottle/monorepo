import { createMock } from '@golevelup/ts-vitest';
import type { WorkspaceFileHash } from '@openthrottle/openthrottle-ide';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeSnapshotStore } from './code-snapshot-store';

const WORKSPACE = '/Users/dev/repo';
const SNAPSHOT: WorkspaceFileHash[] = [
  { hash: 'h-a', path: 'a.ts' },
  { hash: 'h-b', path: 'b.ts' },
];

describe('CodeSnapshotStore', () => {
  let dataSource: DataSource;
  let store: CodeSnapshotStore;

  function queryMock(): ReturnType<typeof vi.mocked<DataSource['query']>> {
    return vi.mocked(dataSource.query);
  }

  beforeEach(() => {
    dataSource = createMock<DataSource>();
    store = new CodeSnapshotStore(dataSource);
  });

  describe('load', () => {
    it('returns the persisted snapshot scoped to the workspace', async () => {
      queryMock().mockResolvedValue([{ snapshot: SNAPSHOT }]);

      const out = await store.load(WORKSPACE);

      const [sql, params] = queryMock().mock.calls[0];
      expect(sql).toContain('FROM code_index_snapshots');
      expect(sql).toContain('workspace_root = $1');
      expect(params).toEqual([WORKSPACE]);
      expect(out).toEqual(SNAPSHOT);
    });

    it('returns null when no snapshot row exists', async () => {
      queryMock().mockResolvedValue([]);
      expect(await store.load(WORKSPACE)).toBeNull();
    });
  });

  describe('save', () => {
    it('upserts the snapshot as JSONB keyed by workspace_root', async () => {
      queryMock().mockResolvedValue([]);

      await store.save(WORKSPACE, SNAPSHOT);

      const [sql, params] = queryMock().mock.calls[0];
      expect(sql).toContain('INSERT INTO code_index_snapshots');
      expect(sql).toContain('ON CONFLICT (workspace_root) DO UPDATE');
      expect(params).toEqual([WORKSPACE, JSON.stringify(SNAPSHOT)]);
    });
  });
});
