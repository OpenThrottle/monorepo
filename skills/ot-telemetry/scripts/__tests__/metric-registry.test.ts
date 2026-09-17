import pg from 'pg';
import { describe, expect, it } from 'vitest';

import type { CapabilityProbe } from '../lib/capability-probe.ts';
import type { MetricContext, MetricQuery } from '../lib/metric-registry.ts';
import {
  describeUnmetRequirement,
  runMetricQueries,
} from '../lib/metric-registry.ts';

function fakeProbe(
  tables: Readonly<Record<string, readonly string[]>>,
): CapabilityProbe {
  return {
    hasColumns: (table, columns = []) => {
      const present = tables[table];
      if (!present) return false;
      return columns.every((column) => present.includes(column));
    },
    hasTable: (table) => table in tables,
    tables: new Set(Object.keys(tables)),
  };
}

describe('describeUnmetRequirement', () => {
  it('is undefined when every table and column is present', () => {
    const probe = fakeProbe({ plans: ['id', 'title'] });
    expect(
      describeUnmetRequirement(probe, {
        columns: { plans: ['title'] },
        tables: ['plans'],
      }),
    ).toBeUndefined();
  });

  it('names every missing table', () => {
    const probe = fakeProbe({ plans: ['id'] });
    expect(
      describeUnmetRequirement(probe, { tables: ['plans', 'tasks'] }),
    ).toBe('missing table(s): tasks');
  });

  it('names missing columns only after tables are confirmed present', () => {
    const probe = fakeProbe({ plans: ['id'] });
    expect(
      describeUnmetRequirement(probe, {
        columns: { plans: ['id', 'title'] },
        tables: ['plans'],
      }),
    ).toBe('missing column(s): plans(title)');
  });
});

describe('runMetricQueries', () => {
  const context: MetricContext = {
    // A real, never-connecting Pool — every `run` below ignores `client`, so
    // this only needs to satisfy the type, never actually query anything.
    client: new pg.Pool({
      connectionString: 'postgresql://placeholder@localhost:1/placeholder',
    }),
    probe: fakeProbe({ plans: ['id'] }),
    window: {
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-02-01T00:00:00.000Z',
    },
  };

  it('runs a satisfiable query and skips an unsatisfiable one, without either throwing', async () => {
    const runnable: MetricQuery<string> = {
      name: 'runnable',
      requires: { tables: ['plans'] },
      run: () => Promise.resolve('ok'),
    };
    const unsatisfiable: MetricQuery<string> = {
      name: 'unsatisfiable',
      requires: { tables: ['skill_usage_events'] },
      run: () => Promise.resolve('should not run'),
    };

    const result = await runMetricQueries([runnable, unsatisfiable], context);

    expect(result.metrics).toEqual({ runnable: 'ok' });
    expect(result.skipped).toEqual([
      {
        name: 'unsatisfiable',
        reason: 'missing table(s): skill_usage_events',
      },
    ]);
  });

  it('never invokes `run` for a skipped query', async () => {
    let invoked = false;
    const query: MetricQuery<undefined> = {
      name: 'never-runs',
      requires: { tables: ['missing_table'] },
      run: () => {
        invoked = true;
        return Promise.resolve(undefined);
      },
    };

    await runMetricQueries([query], context);

    expect(invoked).toBe(false);
  });
});
