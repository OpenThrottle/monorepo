import { describe, expect, it } from 'vitest';

import {
  newPoolWithMockQuery,
  queryResult,
} from '../../../../tests/db/fake-pool.ts';
import type { CapabilityProbe, MetricContext } from '../../../types/index.ts';
import { planRunsMetricQuery } from '../agent-runs.ts';
import { plansMetricQuery } from '../plans.ts';
import { tasksMetricQuery } from '../tasks.ts';

const NO_DAILY_STATS: CapabilityProbe = {
  hasColumns: () => false,
  hasTable: () => false,
  tables: new Set(),
};

async function runAndRecord(query: {
  run: (context: MetricContext) => Promise<unknown>;
}): Promise<readonly string[]> {
  const { pool, query: mockQuery } = newPoolWithMockQuery();
  mockQuery.mockResolvedValue(queryResult([]));

  await query.run({
    client: pool,
    probe: NO_DAILY_STATS,
    window: {
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-01-08T00:00:00.000Z',
    },
  });

  return mockQuery.mock.calls.map(([sql]) => {
    return String(sql);
  });
}

describe('plans and tasks metrics read live rows only', () => {
  it('filters every plans and tasks statement on deleted_at', async () => {
    const statements = [
      ...(await runAndRecord(plansMetricQuery)),
      ...(await runAndRecord(tasksMetricQuery)),
    ].filter((sql) => {
      return /\b(?:FROM|JOIN)\s+(?:plans|tasks)\b/.test(sql);
    });

    expect(statements.length).toBeGreaterThan(0);
    for (const sql of statements) {
      expect(sql).toContain('deleted_at IS NULL');
    }
  });

  it('counts a plan without live tasks as a zero-task plan', async () => {
    const statements = await runAndRecord(plansMetricQuery);
    const zeroTask = statements.find((sql) => {
      return sql.includes('NOT EXISTS');
    });

    expect(zeroTask).toContain('p.deleted_at IS NULL');
    expect(zeroTask).toContain('t.plan_id = p.id AND t.deleted_at IS NULL');
  });

  it('keeps soft-deleted tasks out of the tasks-per-plan spread via the join', async () => {
    const statements = await runAndRecord(tasksMetricQuery);
    const perPlan = statements.find((sql) => {
      return sql.includes('LEFT JOIN tasks t');
    });

    expect(perPlan).toContain(
      'LEFT JOIN tasks t ON t.plan_id = p.id AND t.deleted_at IS NULL',
    );
    expect(perPlan).toContain('WHERE p.deleted_at IS NULL');
  });

  it('keeps soft-deleted plans out of the runs-per-plan spread', async () => {
    const statements = await runAndRecord(planRunsMetricQuery);
    const perPlan = statements.find((sql) => {
      return sql.includes('LEFT JOIN plan_runs r');
    });

    expect(perPlan).toContain('WHERE p.deleted_at IS NULL');
  });

  it('requires the deleted_at column, so an unmigrated database reports the metric unavailable', () => {
    expect(plansMetricQuery.requires.columns?.plans).toContain('deleted_at');
    expect(plansMetricQuery.requires.columns?.tasks).toContain('deleted_at');
    expect(tasksMetricQuery.requires.columns?.tasks).toContain('deleted_at');
    expect(planRunsMetricQuery.requires.columns?.plans).toContain('deleted_at');
  });
});
