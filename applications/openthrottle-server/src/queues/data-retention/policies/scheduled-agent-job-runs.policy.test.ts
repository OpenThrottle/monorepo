import { createMock } from '@golevelup/ts-vitest';
import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { scheduledAgentJobRunsPolicy } from './scheduled-agent-job-runs.policy.ts';

const makeDataSource = (result: unknown): DataSource => {
  return createMock<DataSource>({ query: vi.fn().mockResolvedValue(result) });
};

describe('scheduledAgentJobRunsPolicy', () => {
  it('counts expired runs without deleting anything', async () => {
    const dataSource = makeDataSource([{ count: '5' }]);

    const count = await scheduledAgentJobRunsPolicy.countExpired(dataSource);

    expect(count).toBe(5);
    const [sql, params] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).not.toContain('DELETE');
    expect(params).toStrictEqual([['queued', 'running'], 180]);
  });

  it('reports zero when the count query returns nothing', async () => {
    expect(
      await scheduledAgentJobRunsPolicy.countExpired(makeDataSource([])),
    ).toBe(0);
  });

  it('excludes in-flight runs and keeps each job newest run', async () => {
    const dataSource = makeDataSource([{ count: '0' }]);

    await scheduledAgentJobRunsPolicy.countExpired(dataSource);

    const [sql] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('r.status <> ALL($1::text[])');
    expect(sql).toContain(
      'newer.scheduled_agent_job_id = r.scheduled_agent_job_id',
    );
  });

  it('deletes a bounded batch', async () => {
    const dataSource = makeDataSource([{ id: 'a' }, { id: 'b' }]);

    const deleted = await scheduledAgentJobRunsPolicy.deleteBatch(
      dataSource,
      1000,
    );

    expect(deleted).toBe(2);
    const [sql, params] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('DELETE FROM scheduled_agent_job_runs');
    expect(sql).toContain('LIMIT $3');
    expect(params).toStrictEqual([['queued', 'running'], 180, 1000]);
  });
});
