/**
 * @description Tests for the postgres-direct CLI-run helpers (register / read cancel marker /
 * settle) in openthrottle-ralph-postgres — the transport twin of the graphql helpers. Verifies the
 * null-job-id INSERT, newest-first marker SELECT, and settle-by-id UPDATE.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = {
  connectionString: 'postgres://localhost/openthrottle',
  transport: 'postgres-direct' as const,
};

interface QueryCall {
  readonly params: readonly unknown[];
  readonly sql: string;
}

const mockState: { calls: QueryCall[]; rowsFor: (sql: string) => unknown[] } = {
  calls: [],
  rowsFor: () => [],
};

vi.mock('pg', () => ({
  default: {
    Client: class {
      connect(): Promise<void> {
        return Promise.resolve();
      }

      end(): Promise<void> {
        return Promise.resolve();
      }

      query(
        sql: string,
        params: readonly unknown[] = [],
      ): Promise<{ rows: unknown[] }> {
        mockState.calls.push({ params, sql });
        return Promise.resolve({ rows: mockState.rowsFor(sql) });
      }
    },
  },
}));

beforeEach(() => {
  mockState.calls = [];
  mockState.rowsFor = () => [];
});

afterEach(() => {
  vi.resetModules();
});

describe('CLI-run postgres helpers', () => {
  it('registerCliPlanRunPostgres inserts a null-job-id orchestrator row and returns the id', async () => {
    mockState.rowsFor = (sql) =>
      sql.includes('INTO plan_runs') ? [{ id: 'cli-run-1' }] : [];

    const { registerCliPlanRunPostgres } =
      await import('../openthrottle-ralph-postgres.js');

    const id = await registerCliPlanRunPostgres(mockConfig, {
      executionBackend: 'claude',
      location: { hostname: 'laptop-1', pid: 4242, workerId: 'cli-abc' },
      planId: 'plan-1',
    });

    expect(id).toBe('cli-run-1');
    const insert = mockState.calls.find((c) =>
      c.sql.includes('INTO plan_runs'),
    );
    expect(insert).toBeDefined();
    // bullmq_job_id NULL, run_kind 'orchestrator', status 'IN_PROGRESS' are literal in the SQL.
    expect(insert?.sql).toContain('bullmq_job_id');
    expect(insert?.sql).toContain('NULL');
    expect(insert?.sql).toContain("'orchestrator'");
    expect(insert?.sql).toContain("'IN_PROGRESS'");
    expect(insert?.sql).toContain('branch');
    expect(insert?.params).toEqual([
      'plan-1',
      'claude',
      null,
      'laptop-1',
      4242,
      'cli-abc',
    ]);
  });

  it('registerCliPlanRunPostgres inserts branch when provided', async () => {
    mockState.rowsFor = (sql) =>
      sql.includes('INTO plan_runs') ? [{ id: 'cli-run-branch' }] : [];

    const { registerCliPlanRunPostgres } =
      await import('../openthrottle-ralph-postgres.js');

    await registerCliPlanRunPostgres(mockConfig, {
      branch: 'capture-branch-name',
      executionBackend: 'cursor',
      location: { hostname: 'laptop-1', pid: 4242, workerId: 'cli-abc' },
      planId: 'plan-1',
    });

    const insert = mockState.calls.find((c) =>
      c.sql.includes('INTO plan_runs'),
    );
    expect(insert?.params).toEqual([
      'plan-1',
      'cursor',
      'capture-branch-name',
      'laptop-1',
      4242,
      'cli-abc',
    ]);
  });

  it('registerCliPlanRunPostgres inserts null when branch is explicitly null', async () => {
    mockState.rowsFor = (sql) =>
      sql.includes('INTO plan_runs') ? [{ id: 'cli-run-null-branch' }] : [];

    const { registerCliPlanRunPostgres } =
      await import('../openthrottle-ralph-postgres.js');

    await registerCliPlanRunPostgres(mockConfig, {
      branch: null,
      executionBackend: 'claude',
      location: { hostname: null, pid: null, workerId: null },
      planId: 'plan-1',
    });

    const insert = mockState.calls.find((c) =>
      c.sql.includes('INTO plan_runs'),
    );
    expect(insert?.params).toEqual([
      'plan-1',
      'claude',
      null,
      null,
      null,
      null,
    ]);
  });

  it('readPlanRunCancelMarkerPostgres returns the newest run (ORDER BY created_at DESC LIMIT 1)', async () => {
    const at = new Date('2026-07-22T00:05:00.000Z');
    mockState.rowsFor = (sql) =>
      sql.includes('FROM plan_runs')
        ? [{ cancel_requested_at: at, id: 'cli-run-2', status: 'IN_PROGRESS' }]
        : [];

    const { readPlanRunCancelMarkerPostgres } =
      await import('../openthrottle-ralph-postgres.js');

    const marker = await readPlanRunCancelMarkerPostgres(mockConfig, 'plan-1');

    expect(marker).toEqual({
      cancelRequestedAt: '2026-07-22T00:05:00.000Z',
      planRunId: 'cli-run-2',
      status: 'IN_PROGRESS',
    });
    const select = mockState.calls.find((c) =>
      c.sql.includes('FROM plan_runs'),
    );
    expect(select?.sql).toContain('ORDER BY created_at DESC');
    expect(select?.sql).toContain('LIMIT 1');
  });

  it('readPlanRunCancelMarkerPostgres returns null when the plan has no run row', async () => {
    mockState.rowsFor = () => [];

    const { readPlanRunCancelMarkerPostgres } =
      await import('../openthrottle-ralph-postgres.js');

    expect(
      await readPlanRunCancelMarkerPostgres(mockConfig, 'plan-1'),
    ).toBeNull();
  });

  it('settleCliPlanRunPostgres updates status + clears location, keyed on run id', async () => {
    const { settleCliPlanRunPostgres } =
      await import('../openthrottle-ralph-postgres.js');

    await settleCliPlanRunPostgres(mockConfig, 'cli-run-1', 'CANCELLED');

    const update = mockState.calls.find((c) =>
      c.sql.includes('UPDATE plan_runs'),
    );
    expect(update).toBeDefined();
    expect(update?.sql).toContain('hostname = NULL');
    expect(update?.sql).toContain('pid = NULL');
    expect(update?.sql).toContain('worker_id = NULL');
    expect(update?.sql).toContain('WHERE id = $1');
    expect(update?.params).toEqual(['cli-run-1', 'CANCELLED']);
  });

  it('bumpCliPlanRunHeartbeatPostgres updates last_heartbeat_at, keyed on run id', async () => {
    const { bumpCliPlanRunHeartbeatPostgres } =
      await import('../openthrottle-ralph-postgres.js');

    await bumpCliPlanRunHeartbeatPostgres(mockConfig, 'cli-run-1');

    const update = mockState.calls.find((c) =>
      c.sql.includes('UPDATE plan_runs'),
    );
    expect(update).toBeDefined();
    expect(update?.sql).toContain('last_heartbeat_at = NOW()');
    expect(update?.sql).toContain('WHERE id = $1');
    expect(update?.params).toEqual(['cli-run-1']);
  });
});
