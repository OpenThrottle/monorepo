/**
 * @description Unit tests for plan job-run hook executor wiring (mocked phase runner).
 */

import { createMock } from '@golevelup/ts-vitest';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanOutputStreamService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import {
  type Plan,
  type PlanOutputStreamChunk,
  type Task,
} from '@openthrottle/nestjs-repositories';
import type { WorkflowLifecycleDispatcher } from '@openthrottle/openthrottle-agentic-workflow';
import type { JobRunHooksConfig } from '@tools/workflows';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture.service.ts';

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
  runBeforeAllHooksWithDispatcher,
  runBeforeRunHooksAndHandleBlock,
} from './execute-plan-job-run-hooks.ts';

const planId = '2794d106-95f9-427e-904d-e0f9b5cbe734';

const namedBeforeHook: JobRunHooksConfig = {
  hooks: [
    {
      kind: 'prompt_profile',
      onFailure: 'block',
      phase: 'beforeAll',
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

// The BLOCKED-transition capture opens its own transaction (repo.manager.transaction) and reads/
// updates the plan through the transactional EntityManager's repository, not the outer `repo`
// directly — so the transactional repo gets its own findOne/update mocks, distinct from the ones
// `executePlanJobRunHooks` uses for its (non-transactional) plan/task load.
const mockTransactionPlanFindOne = vi.fn();
const mockTransactionPlanUpdate = vi.fn().mockResolvedValue(undefined);
const transactionPlanRepo = createMock<Repository<Plan>>({
  findOne: mockTransactionPlanFindOne,
  update: mockTransactionPlanUpdate,
});
const mockManagerTransaction = vi.fn(
  async (
    work: (manager: {
      getRepository: () => typeof transactionPlanRepo;
    }) => unknown,
  ) => work({ getRepository: () => transactionPlanRepo }),
);
const mockPlansService = createMock<PlansService>({
  getRepository: () =>
    createMock<Repository<Plan>>({
      findOne: mockPlanFindOne,
      manager: { transaction: mockManagerTransaction },
      update: mockRepoUpdate,
    }),
});

const mockRecordStatusChange = vi.fn().mockResolvedValue(undefined);
const mockWorkLedgerCapture = createMock<WorkLedgerCaptureService>({
  recordStatusChange: mockRecordStatusChange,
});

const mockResolveActor = vi.fn().mockResolvedValue('workflow-ralph-sa-1');

const mockTasksService = createMock<TasksService>({
  getRepository: () =>
    createMock<Repository<Task>>({
      find: mockTaskFind,
    }),
});

const mockPlanOutputSave = vi.fn().mockResolvedValue(undefined);
const mockPlanOutputStreamService = createMock<PlanOutputStreamService>({
  getRepository: () =>
    createMock<Repository<PlanOutputStreamChunk>>({
      create: vi.fn(),
      save: mockPlanOutputSave,
    }),
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
      phase: 'beforeAll',
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
      phase: 'beforeAll',
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
      phase: 'beforeAll',
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
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
      phase: 'afterAll',
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
    mockTransactionPlanFindOne.mockResolvedValue({
      id: planId,
      status: 'IN_PROGRESS',
      title: 'Test plan',
    });
    mockRecordStatusChange.mockResolvedValue(undefined);
    mockResolveActor.mockResolvedValue('workflow-ralph-sa-1');
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
      resolveActor: mockResolveActor,
      tasksService: mockTasksService,
      workLedgerCapture: mockWorkLedgerCapture,
    });

    expect(blocked).toBe(false);
    expect(mockResolveActor).not.toHaveBeenCalled();
    expect(mockManagerTransaction).not.toHaveBeenCalled();
    expect(mockTransactionPlanUpdate).not.toHaveBeenCalled();
    expect(emitQueueJobCompleted).not.toHaveBeenCalled();
    expect(mockExecuteJobRunHooksPhase).toHaveBeenCalledTimes(1);
  });

  it('runs after_run, sets BLOCKED, records an honest `from` on the ledger, and notifies when before_run blocks', async () => {
    mockExecuteJobRunHooksPhase
      .mockResolvedValueOnce({ blocked: true, results: [] })
      .mockResolvedValueOnce({ blocked: false, results: [] });
    // The plan was QUEUED (not IN_PROGRESS) going into this beforeAll hook — the capture must read
    // this rather than assume the completion cascade's IN_PROGRESS guard.
    mockTransactionPlanFindOne.mockResolvedValue({
      id: planId,
      status: 'QUEUED',
      title: 'Test plan',
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
      resolveActor: mockResolveActor,
      tasksService: mockTasksService,
      workLedgerCapture: mockWorkLedgerCapture,
    });

    expect(blocked).toBe(true);
    expect(mockExecuteJobRunHooksPhase).toHaveBeenCalledTimes(2);
    expect(mockExecuteJobRunHooksPhase.mock.calls[1]?.[0]?.phase).toBe(
      'afterAll',
    );
    expect(mockExecuteJobRunHooksPhase.mock.calls[1]?.[0]?.mainRunStarted).toBe(
      false,
    );
    expect(mockResolveActor).toHaveBeenCalledTimes(1);
    expect(mockTransactionPlanFindOne).toHaveBeenCalledWith({
      where: { id: planId },
    });
    expect(mockTransactionPlanUpdate).toHaveBeenCalledWith(
      { id: planId },
      { status: 'BLOCKED' },
    );
    expect(mockRecordStatusChange).toHaveBeenCalledWith(expect.anything(), {
      actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
      actorSub: 'workflow-ralph-sa-1',
      entity: 'plan',
      from: 'QUEUED',
      id: planId,
      planId,
      taskId: null,
      to: 'BLOCKED',
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

  it('propagates when the ledger capture throws, so the row update never commits on its own', async () => {
    mockExecuteJobRunHooksPhase
      .mockResolvedValueOnce({ blocked: true, results: [] })
      .mockResolvedValueOnce({ blocked: false, results: [] });
    mockRecordStatusChange.mockRejectedValueOnce(
      new Error(
        'Cannot record work-ledger status change: unresolved authentication principal.',
      ),
    );

    await expect(
      runBeforeRunHooksAndHandleBlock({
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
        resolveActor: mockResolveActor,
        tasksService: mockTasksService,
        workLedgerCapture: mockWorkLedgerCapture,
      }),
    ).rejects.toThrow('unresolved authentication principal');

    // The failing capture ran inside the same manager.transaction callback as the row update: a real
    // Postgres transaction rolls both back together when the callback rejects. Here we assert the
    // caller never sees a committed BLOCKED — no status-changed / queue-completed notification fires.
    expect(emitPlanStatusChanged).not.toHaveBeenCalled();
    expect(emitQueueJobCompleted).not.toHaveBeenCalled();
  });
});

describe('runBeforeAllHooksWithDispatcher', () => {
  const emitPlanStatusChanged = vi.fn();
  const emitQueueJobCompleted = vi.fn();
  const mockDispatcherRunPlan = vi.fn();
  const mockDispatcher = createMock<WorkflowLifecycleDispatcher>({
    runPlan: mockDispatcherRunPlan,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionPlanFindOne.mockResolvedValue({
      id: planId,
      status: 'IN_PROGRESS',
      title: 'Test plan',
    });
    mockRecordStatusChange.mockResolvedValue(undefined);
    mockResolveActor.mockResolvedValue('workflow-ralph-sa-1');
  });

  it('returns false without touching the plan row when beforeAll does not block', async () => {
    mockDispatcherRunPlan.mockResolvedValueOnce({ blocked: false });

    const blocked = await runBeforeAllHooksWithDispatcher({
      dispatcher: mockDispatcher,
      hooks: namedBeforeHook,
      jobData: baseJobData,
      logLabel: 'test',
      logger: mockLogger,
      notifications: { emitPlanStatusChanged, emitQueueJobCompleted },
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      resolveActor: mockResolveActor,
      tasksService: mockTasksService,
      workLedgerCapture: mockWorkLedgerCapture,
    });

    expect(blocked).toBe(false);
    expect(mockResolveActor).not.toHaveBeenCalled();
    expect(mockTransactionPlanUpdate).not.toHaveBeenCalled();
  });

  it('sets BLOCKED and records the ledger fact with an honest `from` when beforeAll blocks', async () => {
    mockDispatcherRunPlan
      .mockResolvedValueOnce({ blocked: true })
      .mockResolvedValueOnce({ blocked: false });

    const blocked = await runBeforeAllHooksWithDispatcher({
      dispatcher: mockDispatcher,
      hooks: namedBeforeHook,
      jobData: baseJobData,
      logLabel: 'test',
      logger: mockLogger,
      notifications: { emitPlanStatusChanged, emitQueueJobCompleted },
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      resolveActor: mockResolveActor,
      tasksService: mockTasksService,
      workLedgerCapture: mockWorkLedgerCapture,
    });

    expect(blocked).toBe(true);
    expect(mockDispatcherRunPlan).toHaveBeenNthCalledWith(2, {
      mainRunStarted: false,
      mainRunSucceeded: false,
      phase: 'afterAll',
    });
    expect(mockTransactionPlanUpdate).toHaveBeenCalledWith(
      { id: planId },
      { status: 'BLOCKED' },
    );
    expect(mockRecordStatusChange).toHaveBeenCalledWith(expect.anything(), {
      actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
      actorSub: 'workflow-ralph-sa-1',
      entity: 'plan',
      from: 'IN_PROGRESS',
      id: planId,
      planId,
      taskId: null,
      to: 'BLOCKED',
    });
    expect(emitPlanStatusChanged).toHaveBeenCalledWith({
      planId,
      status: 'BLOCKED',
    });
  });

  it('propagates when the ledger capture throws', async () => {
    mockDispatcherRunPlan
      .mockResolvedValueOnce({ blocked: true })
      .mockResolvedValueOnce({ blocked: false });
    mockRecordStatusChange.mockRejectedValueOnce(
      new Error('unresolved authentication principal'),
    );

    await expect(
      runBeforeAllHooksWithDispatcher({
        dispatcher: mockDispatcher,
        hooks: namedBeforeHook,
        jobData: baseJobData,
        logLabel: 'test',
        logger: mockLogger,
        notifications: { emitPlanStatusChanged, emitQueueJobCompleted },
        planOutputStreamService: mockPlanOutputStreamService,
        plansService: mockPlansService,
        resolveActor: mockResolveActor,
        tasksService: mockTasksService,
        workLedgerCapture: mockWorkLedgerCapture,
      }),
    ).rejects.toThrow('unresolved authentication principal');

    expect(emitPlanStatusChanged).not.toHaveBeenCalled();
    expect(emitQueueJobCompleted).not.toHaveBeenCalled();
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
      planOutputStreamService: mockPlanOutputStreamService,
      plansService: mockPlansService,
      tasksService: mockTasksService,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('afterAll hook failed'),
      'PlansProcessor',
    );
    expect(emitQueueJobCompleted).toHaveBeenCalled();
  });
});
