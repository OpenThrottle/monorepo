/**
 * @description Tests for the minimal OpenThrottle Postgres client: reachability check, task
 * listing, and plan status update. `pg` is fully mocked — no real network/database access.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenThrottleRalphConfig } from '../openthrottle-client';

const mockConfig: OpenThrottleRalphConfig = {
  connectionString: 'postgres://localhost/openthrottle',
};

interface TaskRowFixture {
  readonly category: string | null;
  readonly created_at: string;
  readonly description: string | null;
  readonly id: string;
  readonly plan_id: string;
  readonly requirements: unknown;
  readonly sort_order: number;
  readonly status: string;
  readonly title: string;
  readonly updated_at: string;
}

interface PlanRowFixture {
  readonly author: string;
  readonly category: string;
  readonly created_at: string;
  readonly description: string | null;
  readonly id: string;
  readonly status: string;
  readonly summary: string | null;
  readonly title: string;
  readonly updated_at: string;
}

const mockState: {
  connectRejection: unknown;
  endCalls: number;
  planRow: PlanRowFixture | undefined;
  queryLog: string[];
  taskRows: TaskRowFixture[];
} = {
  connectRejection: undefined,
  endCalls: 0,
  planRow: {
    author: 'visormatt',
    category: 'infra',
    created_at: '2026-01-01T00:00:00.000Z',
    description: null,
    id: 'plan-1',
    status: 'IN_PROGRESS',
    summary: null,
    title: 'Test plan',
    updated_at: '2026-01-02T00:00:00.000Z',
  },
  queryLog: [],
  taskRows: [],
};

vi.mock('pg', () => ({
  default: {
    Client: class {
      connect(): Promise<void> {
        return mockState.connectRejection !== undefined
          ? Promise.reject(mockState.connectRejection)
          : Promise.resolve();
      }

      end(): Promise<void> {
        mockState.endCalls += 1;
        return Promise.resolve();
      }

      query(sql: string): Promise<{ rows: unknown[] }> {
        mockState.queryLog.push(sql);

        if (sql.includes('FROM tasks WHERE plan_id')) {
          return Promise.resolve({ rows: mockState.taskRows });
        }

        if (sql.includes('UPDATE plans SET status')) {
          return Promise.resolve({
            rows: mockState.planRow ? [mockState.planRow] : [],
          });
        }

        return Promise.resolve({ rows: [] });
      }
    },
  },
}));

describe('ensureOpenThrottleReachable', () => {
  beforeEach(() => {
    mockState.connectRejection = undefined;
    mockState.endCalls = 0;
  });

  it('resolves when connect and SELECT 1 succeed, and always closes the client', async () => {
    const { ensureOpenThrottleReachable } =
      await import('../openthrottle-client');

    await expect(
      ensureOpenThrottleReachable(mockConfig),
    ).resolves.toBeUndefined();
    expect(mockState.endCalls).toBe(1);
  });

  it('throws a clear message when connection fails, and still closes the client', async () => {
    mockState.connectRejection = new Error('Connection refused');
    const { ensureOpenThrottleReachable } =
      await import('../openthrottle-client');

    await expect(ensureOpenThrottleReachable(mockConfig)).rejects.toThrow(
      /Postgres database is unreachable/,
    );
    await expect(ensureOpenThrottleReachable(mockConfig)).rejects.toThrow(
      /Connection refused/,
    );
    expect(mockState.endCalls).toBe(2);
  });

  it('wraps a non-Error rejection using String() in the thrown message', async () => {
    mockState.connectRejection = 'raw string rejection';
    const { ensureOpenThrottleReachable } =
      await import('../openthrottle-client');

    await expect(ensureOpenThrottleReachable(mockConfig)).rejects.toThrow(
      /raw string rejection/,
    );
  });
});

describe('getTasksByPlanId', () => {
  beforeEach(() => {
    mockState.connectRejection = undefined;
    mockState.queryLog = [];
    mockState.taskRows = [];
  });

  it('queries by plan id ordered by sortOrder then createdAt', async () => {
    const { getTasksByPlanId } = await import('../openthrottle-client');

    await getTasksByPlanId(mockConfig, 'plan-1');

    expect(mockState.queryLog).toHaveLength(1);
    expect(mockState.queryLog[0]).toContain('WHERE plan_id = $1');
    expect(mockState.queryLog[0]).toContain(
      'ORDER BY sort_order ASC, created_at ASC',
    );
  });

  it('maps snake_case rows to camelCase TaskRow shape', async () => {
    mockState.taskRows = [
      {
        category: 'infra',
        created_at: '2026-01-01T00:00:00.000Z',
        description: 'do the thing',
        id: 'task-1',
        plan_id: 'plan-1',
        requirements: ['req-a'],
        sort_order: 1000,
        status: 'PENDING',
        title: 'Task 1',
        updated_at: '2026-01-02T00:00:00.000Z',
      },
    ];
    const { getTasksByPlanId } = await import('../openthrottle-client');

    const tasks = await getTasksByPlanId(mockConfig, 'plan-1');

    expect(tasks).toEqual([
      {
        category: 'infra',
        createdAt: '2026-01-01T00:00:00.000Z',
        description: 'do the thing',
        id: 'task-1',
        planId: 'plan-1',
        requirements: ['req-a'],
        sortOrder: 1000,
        status: 'PENDING',
        title: 'Task 1',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
  });

  it('coerces a non-array requirements value to an empty array', async () => {
    mockState.taskRows = [
      {
        category: null,
        created_at: '2026-01-01T00:00:00.000Z',
        description: null,
        id: 'task-1',
        plan_id: 'plan-1',
        requirements: null,
        sort_order: 1000,
        status: 'PENDING',
        title: 'Task 1',
        updated_at: '2026-01-02T00:00:00.000Z',
      },
    ];
    const { getTasksByPlanId } = await import('../openthrottle-client');

    const tasks = await getTasksByPlanId(mockConfig, 'plan-1');

    expect(tasks[0]?.requirements).toEqual([]);
  });

  it('returns an empty array when there are no matching tasks', async () => {
    const { getTasksByPlanId } = await import('../openthrottle-client');

    const tasks = await getTasksByPlanId(mockConfig, 'plan-none');

    expect(tasks).toEqual([]);
  });
});

describe('updatePlanStatus', () => {
  beforeEach(() => {
    mockState.connectRejection = undefined;
    mockState.queryLog = [];
    mockState.planRow = {
      author: 'visormatt',
      category: 'infra',
      created_at: '2026-01-01T00:00:00.000Z',
      description: null,
      id: 'plan-1',
      status: 'IN_PROGRESS',
      summary: null,
      title: 'Test plan',
      updated_at: '2026-01-02T00:00:00.000Z',
    };
  });

  it('sends the new status and plan id as query parameters', async () => {
    const { updatePlanStatus } = await import('../openthrottle-client');

    await updatePlanStatus(mockConfig, 'plan-1', 'COMPLETED');

    expect(mockState.queryLog[0]).toContain('UPDATE plans SET status = $1');
    expect(mockState.queryLog[0]).toContain('WHERE id = $2');
  });

  it('maps the returned row to camelCase PlanRow shape', async () => {
    mockState.planRow = {
      author: 'visormatt',
      category: 'infra',
      created_at: '2026-01-01T00:00:00.000Z',
      description: 'a plan',
      id: 'plan-1',
      status: 'COMPLETED',
      summary: 'summary text',
      title: 'Test plan',
      updated_at: '2026-01-02T00:00:00.000Z',
    };
    const { updatePlanStatus } = await import('../openthrottle-client');

    const plan = await updatePlanStatus(mockConfig, 'plan-1', 'COMPLETED');

    expect(plan).toEqual({
      author: 'visormatt',
      category: 'infra',
      createdAt: '2026-01-01T00:00:00.000Z',
      description: 'a plan',
      id: 'plan-1',
      status: 'COMPLETED',
      summary: 'summary text',
      title: 'Test plan',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('returns null when no plan row matches', async () => {
    mockState.planRow = undefined;
    const { updatePlanStatus } = await import('../openthrottle-client');

    const plan = await updatePlanStatus(
      mockConfig,
      'plan-missing',
      'COMPLETED',
    );

    expect(plan).toBeNull();
  });
});
