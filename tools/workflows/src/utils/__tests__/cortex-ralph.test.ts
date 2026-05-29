/**
 * @description Tests for Cortex Ralph client (connectivity check and plan status updates).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = { connectionString: 'postgres://localhost/cortex' };

const mockState = {
  connectReject: undefined as Error | undefined,
  planStatus: 'PENDING' as string,
  queryLog: [] as string[],
};

const planRow = {
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

vi.mock('pg', () => ({
  default: {
    Client: class {
      connect(): Promise<void> {
        return mockState.connectReject
          ? Promise.reject(mockState.connectReject)
          : Promise.resolve();
      }

      end(): Promise<void> {
        return Promise.resolve();
      }

      query(sql: string): Promise<{ rows: unknown[] }> {
        mockState.queryLog.push(sql);

        if (sql.includes("status != 'IN_PROGRESS'")) {
          if (mockState.planStatus === 'IN_PROGRESS') {
            return Promise.resolve({ rows: [] });
          }

          return Promise.resolve({
            rows: [{ ...planRow, status: 'IN_PROGRESS' }],
          });
        }

        if (sql.includes('UPDATE tasks SET status')) {
          return Promise.resolve({
            rows: [
              {
                category: null,
                created_at: '2026-01-01T00:00:00.000Z',
                description: null,
                id: 'task-1',
                plan_id: 'plan-1',
                requirements: [],
                status: 'IN_PROGRESS',
                title: 'Task',
                updated_at: '2026-01-02T00:00:00.000Z',
              },
            ],
          });
        }

        if (sql.includes('UPDATE plans SET status = $1')) {
          return Promise.resolve({
            rows: [{ ...planRow, status: mockState.planStatus }],
          });
        }

        return Promise.resolve({ rows: [{}] });
      }
    },
  },
}));

describe('ensureCortexReachable', () => {
  afterEach(() => {
    mockState.connectReject = undefined;
  });

  it('throws with clear message when connection fails', async () => {
    mockState.connectReject = new Error('Connection refused');
    const { ensureCortexReachable } = await import('../cortex-ralph.js');

    await expect(ensureCortexReachable(mockConfig)).rejects.toThrow(
      /Cortex database is unreachable/,
    );
    await expect(ensureCortexReachable(mockConfig)).rejects.toThrow(
      /Connection refused/,
    );
  });

  it('resolves when connection and SELECT 1 succeed', async () => {
    const { ensureCortexReachable } = await import('../cortex-ralph.js');

    await expect(ensureCortexReachable(mockConfig)).resolves.toBeUndefined();
  });
});

describe('promotePlanToInProgressIfNeeded', () => {
  beforeEach(() => {
    mockState.planStatus = 'PENDING';
    mockState.queryLog = [];
    vi.resetModules();
  });

  it('returns true when plan is promoted from PENDING', async () => {
    const { promotePlanToInProgressIfNeeded } =
      await import('../cortex-ralph.js');

    const promoted = await promotePlanToInProgressIfNeeded(
      mockConfig,
      'plan-1',
    );

    expect(promoted).toBe(true);
    expect(mockState.queryLog[0]).toContain("status != 'IN_PROGRESS'");
  });

  it('returns true when plan is promoted from QUEUED', async () => {
    mockState.planStatus = 'QUEUED';
    const { promotePlanToInProgressIfNeeded } =
      await import('../cortex-ralph.js');

    const promoted = await promotePlanToInProgressIfNeeded(
      mockConfig,
      'plan-1',
    );

    expect(promoted).toBe(true);
  });

  it('returns false when plan is already IN_PROGRESS', async () => {
    mockState.planStatus = 'IN_PROGRESS';
    const { promotePlanToInProgressIfNeeded } =
      await import('../cortex-ralph.js');

    const promoted = await promotePlanToInProgressIfNeeded(
      mockConfig,
      'plan-1',
    );

    expect(promoted).toBe(false);
  });
});

describe('updatePlanStatus', () => {
  beforeEach(() => {
    mockState.planStatus = 'PENDING';
    mockState.queryLog = [];
    vi.resetModules();
  });

  it('promotes PENDING to IN_PROGRESS using status != IN_PROGRESS predicate', async () => {
    const { updatePlanStatus } = await import('../cortex-ralph.js');

    const row = await updatePlanStatus(mockConfig, 'plan-1', 'IN_PROGRESS');

    expect(row?.status).toBe('IN_PROGRESS');
    expect(mockState.queryLog[0]).toContain("status != 'IN_PROGRESS'");
  });

  it('promotes QUEUED to IN_PROGRESS', async () => {
    mockState.planStatus = 'QUEUED';
    const { updatePlanStatus } = await import('../cortex-ralph.js');

    const row = await updatePlanStatus(mockConfig, 'plan-1', 'IN_PROGRESS');

    expect(row?.status).toBe('IN_PROGRESS');
    expect(mockState.queryLog[0]).toContain("status != 'IN_PROGRESS'");
  });

  it('returns null when plan is already IN_PROGRESS', async () => {
    mockState.planStatus = 'IN_PROGRESS';
    const { updatePlanStatus } = await import('../cortex-ralph.js');

    const row = await updatePlanStatus(mockConfig, 'plan-1', 'IN_PROGRESS');

    expect(row).toBeNull();
  });
});

describe('updateTaskStatus', () => {
  beforeEach(() => {
    mockState.planStatus = 'QUEUED';
    mockState.queryLog = [];
    vi.resetModules();
  });

  it('promotes parent plan when task becomes IN_PROGRESS', async () => {
    const { updateTaskStatus } = await import('../cortex-ralph.js');

    await updateTaskStatus(mockConfig, 'task-1', 'IN_PROGRESS');

    expect(mockState.queryLog.some((sql) => sql.includes('UPDATE tasks'))).toBe(
      true,
    );
    expect(
      mockState.queryLog.some((sql) => sql.includes("status != 'IN_PROGRESS'")),
    ).toBe(true);
  });
});
