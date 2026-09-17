import { afterEach, describe, expect, it, vi } from 'vitest';

import { probeCapabilities } from '../lib/capability-probe.ts';
import { newPoolWithMockQuery, queryResult } from './db/fake-pool.ts';

function poolResolvingRows(
  rows: ReadonlyArray<{ column_name: string | null; table_name: string }>,
) {
  const { pool, query } = newPoolWithMockQuery();
  query.mockResolvedValue(queryResult(rows));
  return pool;
}

describe('probeCapabilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports a table present with no columns tracked when column_name is null', async () => {
    const probe = await probeCapabilities(
      poolResolvingRows([{ column_name: null, table_name: 'empty_table' }]),
    );

    expect(probe.hasTable('empty_table')).toBe(true);
    expect(probe.hasColumns('empty_table', ['anything'])).toBe(false);
    expect(probe.hasColumns('empty_table')).toBe(true);
  });

  it('reports a missing table as absent', async () => {
    const probe = await probeCapabilities(poolResolvingRows([]));

    expect(probe.hasTable('plans')).toBe(false);
    expect(probe.hasColumns('plans', ['title'])).toBe(false);
  });

  it('requires every requested column to be present, not just any', async () => {
    const probe = await probeCapabilities(
      poolResolvingRows([
        { column_name: 'id', table_name: 'plans' },
        { column_name: 'title', table_name: 'plans' },
      ]),
    );

    expect(probe.hasColumns('plans', ['id', 'title'])).toBe(true);
    expect(probe.hasColumns('plans', ['id', 'title', 'missing_column'])).toBe(
      false,
    );
  });

  it('collects every distinct table name into `tables`', async () => {
    const probe = await probeCapabilities(
      poolResolvingRows([
        { column_name: 'id', table_name: 'plans' },
        { column_name: 'id', table_name: 'tasks' },
        { column_name: 'title', table_name: 'plans' },
      ]),
    );

    expect([...probe.tables].sort()).toEqual(['plans', 'tasks']);
  });
});
