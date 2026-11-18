import { createMock } from '@golevelup/ts-vitest';
import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { planRunsPolicy } from './plan-runs.policy.ts';

const makeDataSource = (result: unknown): DataSource => {
  return createMock<DataSource>({ query: vi.fn().mockResolvedValue(result) });
};

const readStatuses = (params: unknown): unknown => {
  return Array.isArray(params) ? params[0] : undefined;
};

describe('planRunsPolicy', () => {
  it('counts expired runs without deleting anything', async () => {
    const dataSource = makeDataSource([{ count: '12' }]);

    const count = await planRunsPolicy.countExpired(dataSource);

    expect(count).toBe(12);
    const [sql, params] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).not.toContain('DELETE');
    expect(sql).toContain('updated_at < now() - make_interval(days => $2)');
    expect(Array.isArray(params) ? params[1] : undefined).toBe(180);
  });

  it('reports zero when the count query returns nothing', async () => {
    expect(await planRunsPolicy.countExpired(makeDataSource([]))).toBe(0);
  });

  it('only ever selects terminal statuses', async () => {
    const dataSource = makeDataSource([{ count: '0' }]);

    await planRunsPolicy.countExpired(dataSource);

    const [, params] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    const statuses = readStatuses(params);
    expect(statuses).toStrictEqual(
      expect.arrayContaining(['COMPLETED', 'FAILED', 'CANCELLED', 'STALE']),
    );
    expect(statuses).not.toContain('IN_PROGRESS');
    expect(statuses).not.toContain('QUEUED');
    expect(statuses).not.toContain('SCHEDULED');
  });

  it('keeps each plan newest run and any run with a trajectory', async () => {
    const dataSource = makeDataSource([{ count: '0' }]);

    await planRunsPolicy.countExpired(dataSource);

    const [sql] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('newer.plan_id = r.plan_id');
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('agent_trajectories');
  });

  it('deletes a bounded batch', async () => {
    const dataSource = makeDataSource([{ id: 'a' }]);

    const deleted = await planRunsPolicy.deleteBatch(dataSource, 1000);

    expect(deleted).toBe(1);
    const [sql, params] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('DELETE FROM plan_runs');
    expect(sql).toContain('LIMIT $3');
    expect(Array.isArray(params) ? params.slice(1) : undefined).toStrictEqual([
      180, 1000,
    ]);
  });
});
