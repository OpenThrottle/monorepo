/**
 * @description Tests for Cortex Ralph client (connectivity check and plan status updates).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = {
  connectionString: 'postgres://localhost/cortex',
  transport: 'postgres-direct' as const,
};

const mockState = {
  connectReject: undefined as Error | undefined,
  planStatus: 'PENDING' as string,
  planTaskStatuses: [] as string[],
  queryLog: [] as string[],
};

const planRow = {
  author: 'visormatt',
  category: 'infra',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: null,
  id: 'plan-1',
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: '2026-01-02T00:00:00.000Z',
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

        if (sql.includes('FROM tasks WHERE plan_id')) {
          return Promise.resolve({
            rows: mockState.planTaskStatuses.map((status, index) => ({
              category: null,
              created_at: '2026-01-01T00:00:00.000Z',
              description: null,
              id: `task-${index + 1}`,
              plan_id: 'plan-1',
              requirements: [],
              sort_order: (index + 1) * 1000,
              status,
              title: `Task ${index + 1}`,
              updated_at: '2026-01-02T00:00:00.000Z',
            })),
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

        if (sql.includes('FROM plans WHERE id')) {
          return Promise.resolve({
            rows: [{ ...planRow, status: mockState.planStatus }],
          });
        }

        return Promise.resolve({ rows: [{}] });
      }
    },
  },
}));

describe('ensureCortexReachable (postgres-direct)', () => {
  beforeEach(() => {
    vi.stubEnv('WORKFLOW_RALPH_TRANSPORT', 'postgres-direct');
  });

  afterEach(() => {
    mockState.connectReject = undefined;
    vi.unstubAllEnvs();
  });

  it('throws with clear message when connection fails', async () => {
    mockState.connectReject = new Error('Connection refused');
    const { ensureCortexReachable } = await import('../openthrottle-ralph.js');

    await expect(ensureCortexReachable(mockConfig)).rejects.toThrow(
      /Cortex database is unreachable/,
    );
    await expect(ensureCortexReachable(mockConfig)).rejects.toThrow(
      /Connection refused/,
    );
  });

  it('resolves when connection and SELECT 1 succeed', async () => {
    const { ensureCortexReachable } = await import('../openthrottle-ralph.js');

    await expect(ensureCortexReachable(mockConfig)).resolves.toBeUndefined();
  });
});

describe('promotePlanToInProgressIfNeeded (postgres-direct)', () => {
  beforeEach(() => {
    mockState.planStatus = 'PENDING';
    mockState.queryLog = [];
    vi.resetModules();
    vi.stubEnv('WORKFLOW_RALPH_TRANSPORT', 'postgres-direct');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true when plan is promoted from PENDING', async () => {
    const { promotePlanToInProgressIfNeeded } =
      await import('../openthrottle-ralph.js');

    const promoted = await promotePlanToInProgressIfNeeded(
      mockConfig,
      'plan-1',
    );

    expect(promoted).toBe(true);
    expect(mockState.queryLog[0]).toContain("status != 'IN_PROGRESS'");
  });

  it('returns false when plan is already IN_PROGRESS', async () => {
    mockState.planStatus = 'IN_PROGRESS';
    const { promotePlanToInProgressIfNeeded } =
      await import('../openthrottle-ralph.js');

    const promoted = await promotePlanToInProgressIfNeeded(
      mockConfig,
      'plan-1',
    );

    expect(promoted).toBe(false);
  });
});

describe('updatePlanStatus (postgres-direct)', () => {
  beforeEach(() => {
    mockState.planStatus = 'PENDING';
    mockState.queryLog = [];
    vi.resetModules();
    vi.stubEnv('WORKFLOW_RALPH_TRANSPORT', 'postgres-direct');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('promotes PENDING to IN_PROGRESS using status != IN_PROGRESS predicate', async () => {
    const { updatePlanStatus } = await import('../openthrottle-ralph.js');

    const row = await updatePlanStatus(mockConfig, 'plan-1', 'IN_PROGRESS');

    expect(row?.status).toBe('IN_PROGRESS');
    expect(mockState.queryLog[0]).toContain("status != 'IN_PROGRESS'");
  });

  it('returns null when plan is already IN_PROGRESS', async () => {
    mockState.planStatus = 'IN_PROGRESS';
    const { updatePlanStatus } = await import('../openthrottle-ralph.js');

    const row = await updatePlanStatus(mockConfig, 'plan-1', 'IN_PROGRESS');

    expect(row).toBeNull();
  });
});

describe('updateTaskStatus (postgres-direct)', () => {
  beforeEach(() => {
    mockState.planStatus = 'QUEUED';
    mockState.queryLog = [];
    vi.resetModules();
    vi.stubEnv('WORKFLOW_RALPH_TRANSPORT', 'postgres-direct');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('promotes parent plan when task becomes IN_PROGRESS', async () => {
    const { updateTaskStatus } = await import('../openthrottle-ralph.js');

    await updateTaskStatus(mockConfig, 'task-1', 'IN_PROGRESS');

    expect(mockState.queryLog.some((sql) => sql.includes('UPDATE tasks'))).toBe(
      true,
    );
    expect(
      mockState.queryLog.some((sql) => sql.includes("status != 'IN_PROGRESS'")),
    ).toBe(true);
  });
});

describe('reconcilePlanCompletionIfAllTasksTerminal (postgres-direct)', () => {
  beforeEach(() => {
    mockState.planStatus = 'IN_PROGRESS';
    mockState.planTaskStatuses = [];
    mockState.queryLog = [];
    vi.resetModules();
    vi.stubEnv('WORKFLOW_RALPH_TRANSPORT', 'postgres-direct');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('marks the plan COMPLETED when all tasks are terminal', async () => {
    mockState.planTaskStatuses = ['COMPLETED', 'SKIPPED'];
    const { reconcilePlanCompletionIfAllTasksTerminal } =
      await import('../openthrottle-ralph.js');

    const reconciled = await reconcilePlanCompletionIfAllTasksTerminal(
      mockConfig,
      'plan-1',
    );

    expect(reconciled).toBe(true);
    expect(
      mockState.queryLog.some((sql) => sql.includes('UPDATE plans SET status')),
    ).toBe(true);
  });

  it('leaves the plan untouched when a task is still pending', async () => {
    mockState.planTaskStatuses = ['COMPLETED', 'PENDING'];
    const { reconcilePlanCompletionIfAllTasksTerminal } =
      await import('../openthrottle-ralph.js');

    const reconciled = await reconcilePlanCompletionIfAllTasksTerminal(
      mockConfig,
      'plan-1',
    );

    expect(reconciled).toBe(false);
    expect(
      mockState.queryLog.some((sql) => sql.includes('UPDATE plans SET status')),
    ).toBe(false);
  });

  it('does not complete a plan with no tasks', async () => {
    mockState.planTaskStatuses = [];
    const { reconcilePlanCompletionIfAllTasksTerminal } =
      await import('../openthrottle-ralph.js');

    const reconciled = await reconcilePlanCompletionIfAllTasksTerminal(
      mockConfig,
      'plan-1',
    );

    expect(reconciled).toBe(false);
  });
});
