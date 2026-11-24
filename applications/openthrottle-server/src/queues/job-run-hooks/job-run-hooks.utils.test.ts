/**
 * @description Unit tests for plan job-run hook executor wiring (mocked phase runner).
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanOutputStreamRepository,
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlanOutputStreamRepositoryMock,
  createPlansRepositoryMock,
  createTasksRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { JobRunHooksConfig } from '@openthrottle/openthrottle-agentic-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanStatusService } from '../../graphql/plans/plan-status/plan-status.service.ts';
import type { StatusChangeSystemAccountService } from '../../graphql/work-ledger/status-change-system-account/status-change-system-account.service.ts';

const mockExecuteJobRunHooksPhase = vi.fn();
const mockRunDriverAsync = vi.fn();

vi.mock('@openthrottle/openthrottle-drivers', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/openthrottle-drivers')>();

  return {
    ...actual,
    runDriverAsync: (...args: Parameters<typeof mockRunDriverAsync>) =>
      mockRunDriverAsync(...args),
  };
});

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();

  return {
    ...actual,
    executeJobRunHooksPhase: (
      ...args: Parameters<typeof mockExecuteJobRunHooksPhase>
    ) => mockExecuteJobRunHooksPhase(...args),
  };
});

import {
  executePlanJobRunHooks,
  runAfterRunHooksThenNotify,
  runBeforeRunHooksAndHandleBlock,
} from './job-run-hooks.utils.ts';

const planId = '2794d106-95f9-427e-904d-e0f9b5cbe734';

const namedBeforeHook: JobRunHooksConfig = {
  hooks: [
    {
      kind: 'prompt_profile',
      onFailure: 'block',
      phase: 'beforeAll',
      prompt: '/agents/plan-run',
      promptDelivery: 'named',
    },
  ],
};

const mockLogger = createMock<LoggerService>({
  warn: vi.fn(),
});

const mockPlanFindOne = vi.fn();
const mockTaskFind = vi.fn().mockResolvedValue([]);
const mockPlansRepository = asMock<PlansRepository>({
  ...createPlansRepositoryMock(),
  findOne: mockPlanFindOne,
});

// The plans.status write chokepoint and the background-writer service-account lookup, in place
// of the old direct repo.update({ status: 'BLOCKED' }) — mocked wholesale here; their own
// race/capture behaviour is covered by plan-status.service.test.ts.
const mockWriteGuardedStatus = vi.fn().mockResolvedValue(true);
const mockPlanStatusService = createMock<PlanStatusService>({
  writeGuardedStatus: mockWriteGuardedStatus,
});
const mockResolveStatusChangeSystemAccountId = vi
  .fn()
  .mockResolvedValue('status-change-system-account-id');
const mockStatusChangeSystemAccountService =
  createMock<StatusChangeSystemAccountService>({
    resolveId: mockResolveStatusChangeSystemAccountId,
  });

const mockTasksRepository = asMock<TasksRepository>({
  ...createTasksRepositoryMock(),
  findBy: mockTaskFind,
});

const mockPlanOutputCreate = vi.fn().mockResolvedValue(undefined);
const mockPlanOutputStreamRepository = asMock<PlanOutputStreamRepository>({
  ...createPlanOutputStreamRepositoryMock(),
  create: mockPlanOutputCreate,
});

const baseJobData = {
  planId,
  runKind: 'orchestrator' as const,
};

describe('executePlanJobRunHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteJobRunHooksPhase.mockResolvedValue({
      blocked: false,
      results: [],
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
      phase: 'beforeAll',
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      plansRepository: mockPlansRepository,
      tasksRepository: mockTasksRepository,
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
      phase: 'beforeAll',
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      plansRepository: mockPlansRepository,
      tasksRepository: mockTasksRepository,
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
        driver: 'claude',
        tuning: { model: 'gpt-4' },
      },
      logLabel: 'PlansProcessor',
      logger: mockLogger,
      phase: 'beforeAll',
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      plansRepository: mockPlansRepository,
      tasksRepository: mockTasksRepository,
    });

    expect(mockPlanFindOne).toHaveBeenCalledWith({ where: { id: planId } });
    expect(mockTaskFind).toHaveBeenCalledWith({
      order: { createdAt: 'ASC', sortOrder: 'ASC' },
      where: { planId },
    });
    expect(mockExecuteJobRunHooksPhase).toHaveBeenCalledTimes(1);

    const call = mockExecuteJobRunHooksPhase.mock.calls[0]?.[0];
    expect(call?.phase).toBe('beforeAll');
    expect(call?.planId).toBe(planId);
    expect(call?.runKind).toBe('orchestrator');
    expect(call?.hooks).toEqual(namedBeforeHook);
    expect(call?.planContextBlock).toContain('Test plan');
    expect(call?.layer1Suffix).toContain('preflight');
    expect(call?.deps.runHookAgent).toEqual(expect.any(Function));
  });

  it('runs each hook agent through runDriverAsync with the plan driver, model, signal and timeout', async () => {
    const controller = new AbortController();
    mockRunDriverAsync.mockImplementation(async (_driver, _config, options) => {
      options.onExit(0);

      return 'hook output';
    });

    await executePlanJobRunHooks({
      hooks: namedBeforeHook,
      jobData: {
        ...baseJobData,
        driver: 'claude',
        tuning: { model: 'sonnet' },
      },
      logLabel: 'PlansProcessor',
      logger: mockLogger,
      phase: 'beforeAll',
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      plansRepository: mockPlansRepository,
      tasksRepository: mockTasksRepository,
    });

    const deps = mockExecuteJobRunHooksPhase.mock.calls[0]?.[0]?.deps;
    const result = await deps.runHookAgent({
      agentPrompt: 'do the hook',
      hookIndex: 2,
      signal: controller.signal,
      timeoutMs: 5000,
    });

    expect(result).toEqual({ ok: true, output: 'hook output' });
    expect(mockRunDriverAsync).toHaveBeenCalledTimes(1);

    const [driver, config] = mockRunDriverAsync.mock.calls[0] ?? [];
    expect(driver.id).toBe('claude');
    expect(config).toMatchObject({
      iteration: 2,
      model: 'sonnet',
      prompt: 'do the hook',
      signal: controller.signal,
      timeoutMs: 5000,
    });
  });

  it('appends phase-runner output lines to plan output without a task or iteration tag', async () => {
    await executePlanJobRunHooks({
      hooks: namedBeforeHook,
      jobData: baseJobData,
      logLabel: 'test',
      logger: mockLogger,
      phase: 'beforeAll',
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      plansRepository: mockPlansRepository,
      tasksRepository: mockTasksRepository,
    });

    const deps = mockExecuteJobRunHooksPhase.mock.calls[0]?.[0]?.deps;
    await deps.appendPlanOutput('hook line\n', null);

    expect(mockPlanOutputCreate).toHaveBeenCalledWith({
      content: 'hook line\n',
      iteration: null,
      planId,
    });
  });

  it('uses orchestrator runKind when job data is orchestrator', async () => {
    await executePlanJobRunHooks({
      hooks: namedBeforeHook,
      jobData: { planId, runKind: 'orchestrator' },
      logLabel: 'test',
      logger: mockLogger,
      mainRunStarted: true,
      mainRunSucceeded: true,
      phase: 'afterAll',
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      plansRepository: mockPlansRepository,
      tasksRepository: mockTasksRepository,
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
    mockWriteGuardedStatus.mockReset().mockResolvedValue(true);
    mockResolveStatusChangeSystemAccountId
      .mockReset()
      .mockResolvedValue('status-change-system-account-id');
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
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      planStatusService: mockPlanStatusService,
      plansRepository: mockPlansRepository,
      statusChangeSystemAccount: mockStatusChangeSystemAccountService,
      tasksRepository: mockTasksRepository,
    });

    expect(blocked).toBe(false);
    expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
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
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      planStatusService: mockPlanStatusService,
      plansRepository: mockPlansRepository,
      statusChangeSystemAccount: mockStatusChangeSystemAccountService,
      tasksRepository: mockTasksRepository,
    });

    expect(blocked).toBe(true);
    expect(mockExecuteJobRunHooksPhase).toHaveBeenCalledTimes(2);
    expect(mockExecuteJobRunHooksPhase.mock.calls[1]?.[0]?.phase).toBe(
      'afterAll',
    );
    expect(mockExecuteJobRunHooksPhase.mock.calls[1]?.[0]?.mainRunStarted).toBe(
      false,
    );
    // Routed through the applyStatusChange chokepoint (PlanStatusService.writeGuardedStatus),
    // attributed to the status-change-system service account, in place of the old bare
    // repo.update.
    expect(mockWriteGuardedStatus).toHaveBeenCalledWith(planId, {
      actorKind: 'service_account',
      actorSub: 'status-change-system-account-id',
      captureFailureIsFatal: false,
      guardCurrentStatus: undefined,
      requestedStatus: 'BLOCKED',
      throwOnForbiddenInProgress: false,
    });
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
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      plansRepository: mockPlansRepository,
      tasksRepository: mockTasksRepository,
    });

    expect(mockExecuteJobRunHooksPhase).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'afterAll' }),
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
      planOutputStreamRepository: mockPlanOutputStreamRepository,
      plansRepository: mockPlansRepository,
      tasksRepository: mockTasksRepository,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('afterAll hook failed'),
      'PlansProcessor',
    );
    expect(emitQueueJobCompleted).toHaveBeenCalled();
  });
});
