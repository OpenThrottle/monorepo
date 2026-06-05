/**
 * @description Tests for Ralph CLI: max-iterations cleanup (reset current task to PENDING when work remains).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowRalphConfig } from '../../utils/cortex-ralph';
import type { PlanRow, TaskRow } from '../../utils/cortex-ralph';

const PLAN_ID = '970aecc7-c647-4948-aa20-410e1bd090fc';
const TASK_ID = '9e4453e3-8b98-4df2-8cc5-d06afed67222';

const mockConfig: WorkflowRalphConfig = {
  connectionString: 'postgres://localhost/cortex',
  transport: 'postgres-direct',
};

const mockPlan: PlanRow = {
  author: 'test',
  category: 'test',
  createdAt: new Date().toISOString(),
  description: null,
  id: PLAN_ID,
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: new Date().toISOString(),
};

const mockTask: TaskRow = {
  category: null,
  createdAt: new Date().toISOString(),
  description: null,
  id: TASK_ID,
  planId: PLAN_ID,
  requirements: [],
  status: 'IN_PROGRESS',
  title: 'Document current behavior',
  updatedAt: new Date().toISOString(),
};

const mockTasks: TaskRow[] = [mockTask];

const { updateTaskStatusMock, runIterationMock, getNxProjectNamesMock } =
  vi.hoisted(() => ({
    getNxProjectNamesMock: vi.fn().mockResolvedValue([]),
    runIterationMock: vi.fn().mockReturnValue('agent output'),
    updateTaskStatusMock: vi.fn().mockResolvedValue({}),
  }));

vi.mock('../../utils/cortex-ralph', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../utils/cortex-ralph')>();
  return {
    ...actual,
    ensureDatabaseReachableOrExit: vi.fn().mockResolvedValue(undefined),
    getCortexConfigOrExit: vi.fn(() => mockConfig),
    getPlanById: vi.fn().mockResolvedValue(mockPlan),
    getTasksByPlanId: vi.fn().mockResolvedValue(mockTasks),
    promotePlanToInProgressIfNeeded: vi.fn().mockResolvedValue(true),
    updatePlanStatus: vi.fn().mockResolvedValue(undefined),
    updateTaskStatus: updateTaskStatusMock,
  };
});

vi.mock('../../utils/parsers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/parsers')>();
  return {
    ...actual,
    parseRalphArgs: vi.fn(() => ({
      backend: 'cursor',
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

vi.mock('../../utils/projects', () => ({
  getNxProjectNames: (...args: unknown[]) => getNxProjectNamesMock(...args),
}));

vi.mock('../run-iteration', () => ({
  runIteration: (...args: unknown[]) => runIterationMock(...args),
  runIterationAsync: vi.fn().mockResolvedValue('agent output'),
}));

describe('Ralph main (max-iterations cleanup)', () => {
  const originalStdinIsTTY = process.stdin.isTTY;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as typeof process.exit);
    updateTaskStatusMock.mockClear();
    runIterationMock.mockReturnValue('agent output');
    process.stdin.isTTY = true;
  });

  afterEach(() => {
    process.stdin.isTTY = originalStdinIsTTY;
    exitSpy.mockRestore();
  });

  it('calls updateTaskStatus with PENDING for current task when msax iterations reached and task was not completed', async () => {
    const { main } = await import('../ralph.js');

    await main();

    const pendingCalls = updateTaskStatusMock.mock.calls.filter(
      (value: unknown[]) => value.length === 3 && value[2] === 'PENDING',
    );
    expect(pendingCalls.length).toBe(1);
    expect(pendingCalls[0]).toEqual([mockConfig, TASK_ID, 'PENDING']);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('does not call updateTaskStatus with PENDING when task was completed in last iteration', async () => {
    runIterationMock.mockReturnValue(
      `<ralph:task-complete>${TASK_ID}</ralph:task-complete>`,
    );
    const { main } = await import('../ralph.js');

    await main();

    const pendingCalls = updateTaskStatusMock.mock.calls.filter(
      (value: unknown[]) => value.length === 3 && value[2] === 'PENDING',
    );
    expect(pendingCalls.length).toBe(0);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe('Ralph main (Cortex before NX project graph)', () => {
  const originalStdinIsTTY = process.stdin.isTTY;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as typeof process.exit);
    getNxProjectNamesMock.mockClear();
    getNxProjectNamesMock.mockResolvedValue(['my-app']);
    process.stdin.isTTY = true;
  });

  afterEach(() => {
    process.stdin.isTTY = originalStdinIsTTY;
    exitSpy.mockRestore();
    vi.resetModules();
  });

  it('resolves Cortex config before NX project validation when --project is set', async () => {
    const callOrder: string[] = [];
    const cortexRalph = await import('../../utils/cortex-ralph.js');
    const parsers = await import('../../utils/parsers.js');

    vi.mocked(cortexRalph.getCortexConfigOrExit).mockImplementation(() => {
      callOrder.push('cortex');
      return mockConfig;
    });
    vi.mocked(parsers.parseRalphArgs).mockReturnValue({
      backend: 'cursor',
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
      worktree: undefined,
      worktreeBase: undefined,
    });
    getNxProjectNamesMock.mockImplementation(async () => {
      callOrder.push('nx');
      return ['my-app'];
    });

    const { main } = await import('../ralph.js');
    await main();

    expect(callOrder).toEqual(['cortex', 'nx']);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe('Ralph main (Cortex before NX project graph)', () => {
  const originalStdinIsTTY = process.stdin.isTTY;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as typeof process.exit);
    getNxProjectNamesMock.mockClear();
    getNxProjectNamesMock.mockResolvedValue(['my-app']);
    process.stdin.isTTY = true;
  });

  afterEach(() => {
    process.stdin.isTTY = originalStdinIsTTY;
    exitSpy.mockRestore();
    vi.resetModules();
  });

  it('resolves Cortex config before NX project validation when --project is set', async () => {
    const callOrder: string[] = [];
    const cortexRalph = await import('../../utils/cortex-ralph.js');
    const parsers = await import('../../utils/parsers.js');

    vi.mocked(cortexRalph.getCortexConfigOrExit).mockImplementation(() => {
      callOrder.push('cortex');
      return mockConfig;
    });
    vi.mocked(parsers.parseRalphArgs).mockReturnValue({
      backend: 'cursor',
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
      worktree: undefined,
      worktreeBase: undefined,
    });
    getNxProjectNamesMock.mockImplementation(async () => {
      callOrder.push('nx');
      return ['my-app'];
    });

    const { main } = await import('../ralph.js');
    await main();

    expect(callOrder).toEqual(['cortex', 'nx']);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
