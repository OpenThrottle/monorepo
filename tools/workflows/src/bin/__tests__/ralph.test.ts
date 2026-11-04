/**
 * @description Tests for Ralph CLI: max-iterations cleanup, blocked-only exit, and plan settle.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowRalphConfig } from '../../utils/openthrottle-ralph';
import type { PlanRow, TaskRow } from '../../utils/openthrottle-ralph';

const PLAN_ID = '970aecc7-c647-4948-aa20-410e1bd090fc';
const TASK_ID = '9e4453e3-8b98-4df2-8cc5-d06afed67222';
const BLOCKED_TASK_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
const FIXED_NOW_ISO = '2026-01-15T12:00:00.000Z';

const mockConfig: WorkflowRalphConfig = {
  connectionString: 'postgres://localhost/openthrottle',
  transport: 'postgres-direct',
};

const mockPlan: PlanRow = {
  author: 'test',
  category: 'test',
  createdAt: FIXED_NOW_ISO,
  description: null,
  id: PLAN_ID,
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: FIXED_NOW_ISO,
};

const mockTask: TaskRow = {
  category: null,
  createdAt: FIXED_NOW_ISO,
  description: null,
  id: TASK_ID,
  planId: PLAN_ID,
  requirements: [],
  sortOrder: 1000,
  status: 'IN_PROGRESS',
  title: 'Document current behavior',
  updatedAt: FIXED_NOW_ISO,
  wave: null,
};

const mockBlockedTask: TaskRow = {
  category: null,
  createdAt: new Date().toISOString(),
  description: null,
  id: BLOCKED_TASK_ID,
  planId: PLAN_ID,
  requirements: [],
  sortOrder: 2000,
  status: 'BLOCKED',
  title: 'Needs human decision',
  updatedAt: new Date().toISOString(),
  wave: null,
};

/**
 * @description Adapts a no-op impl to `process.exit`'s `never` return type so the spy
 * swallows exits without a cast.
 */
function toProcessExit(impl: (code?: number) => void): typeof process.exit;
function toProcessExit(impl: (code?: number) => void): unknown {
  return impl;
}

class ProcessExitError extends Error {
  readonly code: number;

  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

const {
  getNxProjectNamesMock,
  getTasksByPlanIdMock,
  runIterationMock,
  updatePlanStatusMock,
  updateTaskStatusMock,
} = vi.hoisted(() => {
  return {
    getNxProjectNamesMock: vi.fn().mockResolvedValue([]),
    getTasksByPlanIdMock: vi.fn(),
    runIterationMock: vi.fn().mockReturnValue('agent output'),
    updatePlanStatusMock: vi.fn().mockResolvedValue(undefined),
    updateTaskStatusMock: vi.fn().mockResolvedValue({}),
  };
});

vi.mock('../../utils/openthrottle-ralph', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../utils/openthrottle-ralph.ts')>();
  return {
    ...actual,
    ensureDatabaseReachableOrExit: vi.fn().mockResolvedValue(undefined),
    getOpenThrottleConfigOrExit: vi.fn(() => mockConfig),
    getPlanById: vi.fn().mockResolvedValue(mockPlan),
    getTasksByPlanId: getTasksByPlanIdMock,
    promotePlanToInProgressIfNeeded: vi.fn().mockResolvedValue(true),
    updatePlanStatus: updatePlanStatusMock,
    updateTaskStatus: updateTaskStatusMock,
  };
});

vi.mock('../../utils/parsers', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../utils/parsers.ts')>();
  return {
    ...actual,
    parseRalphArgs: vi.fn(() => ({
      backend: 'cursor',
      effort: undefined,
      iterationTimeoutMs: undefined,
      iterations: 2,
      model: 'auto',
      plan: PLAN_ID,
      project: undefined,
      prompt: '/agents/ralph',
      promptProfileKind: 'named',
      promptProfileLabel: '/agents/ralph',
      ralphDebugLevel: 'off',
      task: undefined,
    })),
  };
});

vi.mock('../../utils/projects', () => {
  return {
    getNxProjectNames: (...args: unknown[]) => {
      return getNxProjectNamesMock(...args);
    },
  };
});

vi.mock('../run-iteration', () => {
  return {
    runIteration: (...args: unknown[]) => {
      return runIterationMock(...args);
    },
    runIterationAsync: vi.fn().mockResolvedValue('agent output'),
  };
});

describe('Ralph main (max-iterations cleanup)', () => {
  const originalStdinIsTTY = process.stdin.isTTY;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(toProcessExit(() => {}));
    updateTaskStatusMock.mockClear();
    updatePlanStatusMock.mockClear();
    getTasksByPlanIdMock.mockReset();
    getTasksByPlanIdMock.mockResolvedValue([mockTask]);
    runIterationMock.mockClear();
    runIterationMock.mockReturnValue('agent output');
    process.stdin.isTTY = true;
    vi.resetModules();
  });

  afterEach(() => {
    process.stdin.isTTY = originalStdinIsTTY;
    exitSpy.mockRestore();
  });

  it('resets the in-flight task to PENDING and marks the plan BLOCKED when the iteration cap is hit with work remaining', async () => {
    const { main } = await import('../ralph.js');

    await main();

    const pendingCalls = updateTaskStatusMock.mock.calls.filter(
      (value: unknown[]) => {
        return value.length === 3 && value[2] === 'PENDING';
      },
    );
    expect(pendingCalls.length).toBe(1);
    expect(pendingCalls[0]).toEqual([mockConfig, TASK_ID, 'PENDING']);
    expect(updatePlanStatusMock).toHaveBeenCalledWith(
      mockConfig,
      PLAN_ID,
      'BLOCKED',
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('does not reset to PENDING when the task completed in the last iteration, and marks the plan COMPLETED when nothing remains', async () => {
    runIterationMock.mockReturnValue(
      `<ralph:task-complete>${TASK_ID}</ralph:task-complete>`,
    );
    // initial inject + 2 iteration picks return workable; the post-cap settle sees nothing remaining
    let tasksCalls = 0;
    getTasksByPlanIdMock.mockImplementation(async () => {
      tasksCalls += 1;
      if (tasksCalls >= 4) {
        return [{ ...mockTask, status: 'COMPLETED' }];
      }
      return [mockTask];
    });
    const { main } = await import('../ralph.js');

    await main();

    const pendingCalls = updateTaskStatusMock.mock.calls.filter(
      (value: unknown[]) => {
        return value.length === 3 && value[2] === 'PENDING';
      },
    );
    expect(pendingCalls.length).toBe(0);
    expect(updatePlanStatusMock).toHaveBeenCalledWith(
      mockConfig,
      PLAN_ID,
      'COMPLETED',
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe('Ralph main (blocked-only and no remaining)', () => {
  const originalStdinIsTTY = process.stdin.isTTY;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      toProcessExit((code) => {
        throw new ProcessExitError(code ?? 0);
      }),
    );
    updateTaskStatusMock.mockClear();
    updatePlanStatusMock.mockClear();
    getTasksByPlanIdMock.mockReset();
    runIterationMock.mockClear();
    runIterationMock.mockReturnValue('agent output');
    process.stdin.isTTY = true;
    vi.resetModules();
  });

  afterEach(() => {
    process.stdin.isTTY = originalStdinIsTTY;
    exitSpy.mockRestore();
  });

  it('sets the plan BLOCKED and skips the agent when only BLOCKED tasks remain', async () => {
    getTasksByPlanIdMock.mockResolvedValue([mockBlockedTask]);
    const { main } = await import('../ralph.js');

    await expect(main()).rejects.toBeInstanceOf(ProcessExitError);

    expect(updatePlanStatusMock).toHaveBeenCalledWith(
      mockConfig,
      PLAN_ID,
      'BLOCKED',
    );
    expect(runIterationMock).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('sets the plan COMPLETED and skips the agent when no remaining tasks exist', async () => {
    getTasksByPlanIdMock.mockResolvedValue([
      { ...mockTask, status: 'COMPLETED' },
    ]);
    const { main } = await import('../ralph.js');

    await expect(main()).rejects.toBeInstanceOf(ProcessExitError);

    expect(updatePlanStatusMock).toHaveBeenCalledWith(
      mockConfig,
      PLAN_ID,
      'COMPLETED',
    );
    expect(runIterationMock).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe('Ralph main (OpenThrottle before NX project graph)', () => {
  const originalStdinIsTTY = process.stdin.isTTY;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(toProcessExit(() => {}));
    getNxProjectNamesMock.mockClear();
    getNxProjectNamesMock.mockResolvedValue(['my-app']);
    getTasksByPlanIdMock.mockReset();
    getTasksByPlanIdMock.mockResolvedValue([mockTask]);
    updatePlanStatusMock.mockClear();
    process.stdin.isTTY = true;
    vi.resetModules();
  });

  afterEach(() => {
    process.stdin.isTTY = originalStdinIsTTY;
    exitSpy.mockRestore();
  });

  it('resolves OpenThrottle config before NX project validation when --project is set', async () => {
    const callOrder: string[] = [];
    const openthrottleRalph = await import('../../utils/openthrottle-ralph.js');
    const parsers = await import('../../utils/parsers.js');

    vi.mocked(openthrottleRalph.getOpenThrottleConfigOrExit).mockImplementation(
      () => {
        callOrder.push('openthrottle');
        return mockConfig;
      },
    );
    vi.mocked(parsers.parseRalphArgs).mockReturnValue({
      backend: 'cursor',
      effort: undefined,
      iterationTimeoutMs: undefined,
      iterations: 1,
      model: 'auto',
      plan: PLAN_ID,
      project: 'my-app',
      prompt: '/agents/ralph',
      promptProfileKind: 'named',
      promptProfileLabel: '/agents/ralph',
      ralphDebugLevel: 'off',
      skipWorktreeSetup: undefined,
      task: undefined,
      taskIterations: undefined,
      worktree: undefined,
      worktreeBase: undefined,
    });
    getNxProjectNamesMock.mockImplementation(async () => {
      callOrder.push('nx');
      return ['my-app'];
    });

    const { main } = await import('../ralph.js');
    await main();

    expect(callOrder).toEqual(['openthrottle', 'nx']);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
