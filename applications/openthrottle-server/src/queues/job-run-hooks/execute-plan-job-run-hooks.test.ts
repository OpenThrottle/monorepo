/**
 * @description Unit tests for plan job-run hook executor wiring (mocked phase runner).
 */

import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlanOutputStreamService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { JobRunHooksConfig } from '@tools/workflows';

const mockExecuteJobRunHooksPhase = vi.fn();
const mockCreateCursorWorkflowRalphIterationRunner = vi.fn();

vi.mock('@tools/workflows', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tools/workflows')>();

  return {
    ...actual,
    createCursorWorkflowRalphIterationRunner: () =>
      mockCreateCursorWorkflowRalphIterationRunner(),
    executeJobRunHooksPhase: (
      ...args: Parameters<typeof mockExecuteJobRunHooksPhase>
    ) => mockExecuteJobRunHooksPhase(...args),
  };
});

import {
  executePlanJobRunHooks,
  runAfterRunHooksThenNotify,
  runBeforeRunHooksAndHandleBlock,
} from './execute-plan-job-run-hooks';

const planId = '2794d106-95f9-427e-904d-e0f9b5cbe734';

const namedBeforeHook: JobRunHooksConfig = {
  hooks: [
    {
      kind: 'prompt_profile',
      onFailure: 'block',
      phase: 'before_run',
      prompt: '/agents/ralph',
      promptDelivery: 'named',
    },
  ],
};

const mockLogger = createMock<LoggerService>({
  warn: vi.fn(),
});

const mockRepoUpdate = vi.fn().mockResolvedValue(undefined);
const mockPlanFindOne = vi.fn();
const mockTaskFind = vi.fn().mockResolvedValue([]);
const mockPlansService = createMock<PlansService>({
  getRepository: () =>
    ({
      findOne: mockPlanFindOne,
      update: mockRepoUpdate,
    }) as unknown as ReturnType<PlansService['getRepository']>,
});

const mockTasksService = createMock<TasksService>({
  getRepository: () =>
    ({
      find: mockTaskFind,
    }) as unknown as ReturnType<TasksService['getRepository']>,
});

const mockPlanOutputSave = vi.fn().mockResolvedValue(undefined);
const mockPlanOutputStreamService = createMock<PlanOutputStreamService>({
  getRepository: () =>
    ({
      create: vi.fn((data: unknown) => data),
      save: mockPlanOutputSave,
    }) as unknown as ReturnType<PlanOutputStreamService['getRepository']>,
});

const baseJobData = {
  planId,
  runKind: 'spawn' as const,
};

describe('executePlanJobRunHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteJobRunHooksPhase.mockResolvedValue({
      blocked: false,
      results: [],
    });
    mockCreateCursorWorkflowRalphIterationRunner.mockReturnValue({
      run: vi.fn(),
    });
    mockPlanFindOne.mockResolvedValue({
      id: planId,
      status: 'IN_PROGRESS',
      title: 'Test plan',
    });
  });

  it('returns early when hooks are undefined', async () => {
    const result = await executePlanJobRunHooks({
      hooks: undefined,
      jobData: baseJobData,
      logLabel: 'test',
      logger: mockLogger,
      phase: 'before_run',
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
    });

    expect(result).toEqual({ blocked: false, results: [] });
    expect(mockExecuteJobRunHooksPhase).not.toHaveBeenCalled();
    expect(mockPlanFindOne).not.toHaveBeenCalled();
  });

  it('returns early when plan is missing', async () => {
    mockPlanFindOne.mockResolvedValueOnce(null);

    const result = await executePlanJobRunHooks({
      hooks: namedBeforeHook,
      jobData: baseJobData,
      logLabel: 'test',
      logger: mockLogger,
      phase: 'before_run',
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
    });

    expect(result).toEqual({ blocked: false, results: [] });
    expect(mockExecuteJobRunHooksPhase).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('plan not found'),
      'test',
    );
  });

  it('loads plan and tasks and delegates to executeJobRunHooksPhase', async () => {
    const tasks = [{ id: 'task-1', planId, title: 'Hook task' }];
    mockTaskFind.mockResolvedValueOnce(tasks);

    await executePlanJobRunHooks({
      hooks: namedBeforeHook,
      jobData: {
        ...baseJobData,
        executionBackend: 'claude',
        ralph: { model: 'gpt-4' },
      },
      logLabel: 'PlansProcessor',
      logger: mockLogger,
      phase: 'before_run',
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
    });

    expect(mockPlanFindOne).toHaveBeenCalledWith({ where: { id: planId } });
    expect(mockTaskFind).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      where: { planId },
    });
    expect(mockExecuteJobRunHooksPhase).toHaveBeenCalledTimes(1);

    const call = mockExecuteJobRunHooksPhase.mock.calls[0]?.[0];
    expect(call?.phase).toBe('before_run');
    expect(call?.planId).toBe(planId);
    expect(call?.runKind).toBe('spawn');
    expect(call?.hooks).toEqual(namedBeforeHook);
    expect(call?.planContextBlock).toContain('Test plan');
    expect(call?.layer1Suffix).toContain('preflight');
    expect(call?.deps.runHookIteration).toEqual(expect.any(Function));
  });

  it('uses orchestrator runKind when job data is orchestrator', async () => {
    await executePlanJobRunHooks({
      hooks: namedBeforeHook,
      jobData: { planId, runKind: 'orchestrator' },
      logLabel: 'test',
      logger: mockLogger,
      mainRunStarted: true,
      mainRunSucceeded: true,
      phase: 'after_run',
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
    });

    expect(mockExecuteJobRunHooksPhase.mock.calls[0]?.[0]?.runKind).toBe(
      'orchestrator',
    );
  });
});

describe('runBeforeRunHooksAndHandleBlock', () => {
  const emitPlanStatusChanged = vi.fn();
  const emitQueueJobCompleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlanFindOne.mockResolvedValue({
      id: planId,
      status: 'IN_PROGRESS',
      title: 'Test plan',
    });
    mockCreateCursorWorkflowRalphIterationRunner.mockReturnValue({
      run: vi.fn(),
    });
  });

  it('returns false when before_run does not block', async () => {
    mockExecuteJobRunHooksPhase.mockResolvedValue({
      blocked: false,
      results: [],
    });

    const blocked = await runBeforeRunHooksAndHandleBlock({
      hooks: namedBeforeHook,
      jobData: baseJobData,
      logLabel: 'test',
      logger: mockLogger,
      notifications: {
        emitPlanStatusChanged,
        emitQueueJobCompleted,
      },
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
    });

    expect(blocked).toBe(false);
    expect(mockRepoUpdate).not.toHaveBeenCalled();
    expect(emitQueueJobCompleted).not.toHaveBeenCalled();
    expect(mockExecuteJobRunHooksPhase).toHaveBeenCalledTimes(1);
  });

  it('runs after_run, sets BLOCKED, and notifies when before_run blocks', async () => {
    mockExecuteJobRunHooksPhase
      .mockResolvedValueOnce({ blocked: true, results: [] })
      .mockResolvedValueOnce({ blocked: false, results: [] });

    const blocked = await runBeforeRunHooksAndHandleBlock({
      hooks: namedBeforeHook,
      jobData: baseJobData,
      logLabel: 'test',
      logger: mockLogger,
      notifications: {
        emitPlanStatusChanged,
        emitQueueJobCompleted,
      },
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
    });

    expect(blocked).toBe(true);
    expect(mockExecuteJobRunHooksPhase).toHaveBeenCalledTimes(2);
    expect(mockExecuteJobRunHooksPhase.mock.calls[1]?.[0]?.phase).toBe(
      'after_run',
    );
    expect(mockExecuteJobRunHooksPhase.mock.calls[1]?.[0]?.mainRunStarted).toBe(
      false,
    );
    expect(mockRepoUpdate).toHaveBeenCalledWith(
      { id: planId },
      { status: 'BLOCKED' },
    );
    expect(emitPlanStatusChanged).toHaveBeenCalledWith({
      planId,
      status: 'BLOCKED',
    });
    expect(emitQueueJobCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('blocked'),
        planId,
        severity: 'error',
      }),
    );
  });
});

describe('runAfterRunHooksThenNotify', () => {
  const emitQueueJobCompleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlanFindOne.mockResolvedValue({
      id: planId,
      status: 'COMPLETED',
      title: 'Test plan',
    });
    mockCreateCursorWorkflowRalphIterationRunner.mockReturnValue({
      run: vi.fn(),
    });
  });

  it('emits notification after after_run phase completes', async () => {
    mockExecuteJobRunHooksPhase.mockResolvedValue({
      blocked: false,
      results: [],
    });

    await runAfterRunHooksThenNotify({
      hooks: namedBeforeHook,
      jobData: baseJobData,
      logLabel: 'test',
      logger: mockLogger,
      mainRunStarted: true,
      mainRunSucceeded: true,
      notification: {
        jobType: 'plans',
        message: 'done',
        planId,
        severity: 'success',
      },
      notifications: { emitQueueJobCompleted },
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
    });

    expect(mockExecuteJobRunHooksPhase).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'after_run' }),
    );
    expect(emitQueueJobCompleted).toHaveBeenCalledWith({
      jobType: 'plans',
      message: 'done',
      planId,
      severity: 'success',
    });
  });

  it('logs after_run hook failures but still emits notification', async () => {
    mockExecuteJobRunHooksPhase.mockResolvedValue({
      blocked: false,
      results: [
        {
          blocked: false,
          entry: namedBeforeHook.hooks[0]!,
          errorMessage: 'hook failed',
          ok: false,
          onFailure: 'warn',
        },
      ],
    });

    await runAfterRunHooksThenNotify({
      hooks: namedBeforeHook,
      jobData: baseJobData,
      logLabel: 'PlansProcessor',
      logger: mockLogger,
      mainRunStarted: true,
      mainRunSucceeded: false,
      notification: {
        jobType: 'plans',
        message: 'failed',
        planId,
        severity: 'error',
      },
      notifications: { emitQueueJobCompleted },
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('after_run hook failed'),
      'PlansProcessor',
    );
    expect(emitQueueJobCompleted).toHaveBeenCalled();
  });
});
