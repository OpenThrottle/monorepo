import type { ChildProcess } from 'child_process';
import { spawn as nodeSpawn } from 'child_process';
import type { Readable } from 'stream';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { createMock } from '@golevelup/ts-vitest';
import { WORKTREE_TRACKER_TOKEN } from '@openthrottle/nestjs-worktrees';
import type {
  ChildProcessMetrics,
  WallClockMetrics,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  HEARTBEAT_INTERVAL_MS,
  PlanOutputStreamService,
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import 'reflect-metadata';
import type { EnhancedTaskRunMetrics } from '../../metrics/process-metrics.types';
import { ProcessMetricsService } from '../../metrics/process-metrics.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AgenticRalphOrchestratorService } from '../agentic-ralph/agentic-ralph-orchestrator.service';
import { BullMqRunOutputRetentionService } from '../bullmq-run-output-retention.service';
import type { PlanRunJobResult, RunPlanJob } from './plans.types';
import {
  PLANS_QUEUE_NAME,
  PLANS_WORKER_LOCK_DURATION_MS,
  PLANS_WORKER_MAX_STALLED_COUNT,
  PLANS_WORKER_STALLED_INTERVAL_MS,
} from './plans.constants';
import { PlanRunCancellationService } from './plan-run-cancellation.service';
import { WorkLedgerRunService } from './work-ledger-run.service';
import { PlansProcessor } from './plans.processor';
import { WorkflowLifecycleDispatcherFactory } from '../plan-lifecycle-hooks/workflow-lifecycle-dispatcher.service';

/** @nestjs/bullmq Worker options metadata key (from bull.constants WORKER_METADATA). Used to assert stalled-job recovery options. */
const WORKER_METADATA_KEY = 'bullmq:worker_metadata';

/**
 * Type-guard helpers for reaching PlansProcessor's private `notifications` field and
 * `buildEnhancedMetrics` method from tests without an `as` cast. Narrowing must start from
 * `unknown` (not the class type) so TS doesn't collapse the private-member intersection to `never`.
 */
function isNotificationsHolder(
  value: unknown,
): value is { notifications: NotificationsService } {
  return (
    typeof value === 'object' && value !== null && 'notifications' in value
  );
}

function getProcessorNotifications(instance: unknown): NotificationsService {
  if (!isNotificationsHolder(instance)) {
    throw new Error('Expected processor to expose notifications');
  }

  return instance.notifications;
}

function isEnhancedMetricsBuilder(value: unknown): value is {
  buildEnhancedMetrics: (result: PlanRunJobResult) => EnhancedTaskRunMetrics;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'buildEnhancedMetrics' in value
  );
}

function getBuildEnhancedMetrics(
  instance: unknown,
): (result: PlanRunJobResult) => EnhancedTaskRunMetrics {
  if (!isEnhancedMetricsBuilder(instance)) {
    throw new Error('Expected processor to expose buildEnhancedMetrics');
  }

  return instance.buildEnhancedMetrics.bind(instance);
}

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();

  return {
    ...actual,
    spawn: vi.fn(),
  };
});

const mockRunBeforeRunHooksAndHandleBlock = vi.fn().mockResolvedValue(false);
const mockRunBeforeAllHooksWithDispatcher = vi.fn().mockResolvedValue(false);
const mockRunAfterRunHooksThenNotify = vi.fn().mockImplementation(
  async (params: {
    notification: {
      jobType: string;
      message: string;
      planId: string;
      severity: 'error' | 'info' | 'success' | 'warning';
    };
    notifications: {
      emitQueueJobCompleted: (payload: {
        jobType: string;
        message: string;
        planId: string;
        severity: 'error' | 'info' | 'success' | 'warning';
      }) => void;
    };
  }) => {
    params.notifications.emitQueueJobCompleted(params.notification);
  },
);

vi.mock('../job-run-hooks/execute-plan-job-run-hooks', () => ({
  runAfterAllHooksWithDispatcherThenNotify: vi.fn(),
  runAfterRunHooksThenNotify: (
    ...args: unknown[]
  ): ReturnType<typeof mockRunAfterRunHooksThenNotify> =>
    mockRunAfterRunHooksThenNotify(...args),
  runBeforeAllHooksWithDispatcher: (
    ...args: unknown[]
  ): ReturnType<typeof mockRunBeforeAllHooksWithDispatcher> =>
    mockRunBeforeAllHooksWithDispatcher(...args),
  runBeforeRunHooksAndHandleBlock: (
    ...args: unknown[]
  ): ReturnType<typeof mockRunBeforeRunHooksAndHandleBlock> =>
    mockRunBeforeRunHooksAndHandleBlock(...args),
}));

const mockRunPlanOrchestratorJob = vi.fn().mockResolvedValue({
  exitCode: 0,
  reason: 'workflow_tasks_exhausted',
  status: 'finished',
});

const mockRecordHeartbeatByJob = vi.fn().mockResolvedValue(1);

const mockSpawn = vi.mocked(nodeSpawn);

/** In-memory tracker with no targets so processor uses legacy in-process cwd path. */
const mockWorktreeTracker = {
  acquire: () => ({ ok: false as const, reason: 'no_targets' as const }),
  getAvailableTarget: () => undefined,
  hasAvailableTarget: () => false,
  listTargets: () => [] as const,
  release: () => ({ ok: false as const }),
};

const mockRepoUpdate = vi.fn().mockResolvedValue(undefined);
const mockRepoFind = vi.fn().mockResolvedValue([]);
const mockTaskRepoFindOne = vi.fn().mockResolvedValue(null);
const mocksyncParentPlanStatus = vi.fn().mockResolvedValue(false);
/** Default: plan is COMPLETED so job completed message is success. Override to { status: 'IN_PROGRESS' } to test iteration-limit notification. */
const mockRepoFindOne = vi.fn().mockResolvedValue({ status: 'COMPLETED' });
const mockPlansService = createMock<PlansService>({
  getRepository: () =>
    createMock<ReturnType<PlansService['getRepository']>>({
      find: mockRepoFind,
      findOne: mockRepoFindOne,
      update: mockRepoUpdate,
    }),
});

const mockTasksService = createMock<TasksService>({
  getRepository: () =>
    createMock<ReturnType<TasksService['getRepository']>>({
      find: vi.fn().mockResolvedValue([]),
      findOne: mockTaskRepoFindOne,
    }),
  syncParentPlanStatus: mocksyncParentPlanStatus,
});

const snapshotStub = {
  cpuSystemMs: 10,
  cpuUserMs: 100,
  externalMb: 1,
  heapTotalMb: 30,
  heapUsedMb: 20,
  rssMb: 50,
};
const mockProcessMetrics = createMock<ProcessMetricsService>({
  getCurrentSnapshot: vi.fn().mockReturnValue(snapshotStub),
});

const mockSave = vi.fn().mockResolvedValue(undefined);
const mockCreate = vi.fn();
const mockPlanOutputStreamService = createMock<PlanOutputStreamService>({
  getRepository: () =>
    createMock<ReturnType<PlanOutputStreamService['getRepository']>>({
      create: mockCreate,
      save: mockSave,
    }),
});

const mockGetJobs = vi.fn().mockResolvedValue([]);
const mockGetJob = vi.fn().mockResolvedValue(null);
const mockPlansQueue = {
  getJob: mockGetJob,
  getJobs: mockGetJobs,
};

describe('PlansProcessor', () => {
  let processor: PlansProcessor;
  let mockJob: RunPlanJob;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS = 'false';
    mockJob = createMock<RunPlanJob>({
      data: {
        planId: '2794d106-95f9-427e-904d-e0f9b5cbe734',
        runKind: 'orchestrator',
      },
      id: 'job-1',
    });

    mockSpawn.mockImplementation(() => {
      const stub = createMock<ChildProcess>({
        pid: 42,
        stderr: createMock<Readable>(),
        stdout: createMock<Readable>(),
      });

      // Annotate params explicitly: ChildProcess['on'] is overloaded and its last
      // overload is `on(event: 'spawn', listener: () => void)`, so an un-annotated
      // implementation infers `event: 'spawn'` / `listener: () => void`, which breaks
      // both the `=== 'close'` compare and the two-arg listener invocation below.
      stub.on.mockImplementation(
        (event: string, listener: (...args: unknown[]) => void) => {
          if (event === 'close') {
            setImmediate(() => listener(0, null));
          }

          return stub;
        },
      );

      return stub;
    });

    const mod = await Test.createTestingModule({
      providers: [
        PlanRunCancellationService,
        PlansProcessor,
        {
          provide: AgenticRalphOrchestratorService,
          useValue: {
            runPlanOrchestratorJob: mockRunPlanOrchestratorJob,
          },
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NotificationsService,
          useValue: createMock<NotificationsService>(),
        },
        {
          provide: PlanRunsService,
          useValue: createMock<PlanRunsService>({
            clearRunLocation: vi.fn().mockResolvedValue(0),
            markRunStarted: vi.fn().mockResolvedValue(0),
            recordHeartbeatByJob: mockRecordHeartbeatByJob,
          }),
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: WORKTREE_TRACKER_TOKEN,
          useValue: mockWorktreeTracker,
        },
        {
          provide: PlanOutputStreamService,
          useValue: mockPlanOutputStreamService,
        },
        {
          provide: ProcessMetricsService,
          useValue: mockProcessMetrics,
        },
        {
          provide: getQueueToken(PLANS_QUEUE_NAME),
          useValue: mockPlansQueue,
        },
        {
          provide: BullMqRunOutputRetentionService,
          useValue: createMock<BullMqRunOutputRetentionService>({
            maybePruneAfterJobClose: vi.fn(),
          }),
        },
        {
          provide: WorkflowLifecycleDispatcherFactory,
          useValue: createMock<WorkflowLifecycleDispatcherFactory>({
            create: vi.fn(),
          }),
        },
        {
          provide: WorkLedgerRunService,
          useValue: createMock<WorkLedgerRunService>({
            closeRalphSession: vi.fn().mockResolvedValue(undefined),
            openRalphSession: vi.fn().mockResolvedValue(null),
          }),
        },
      ],
    }).compile();

    processor = mod.get(PlansProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process a run-plan job and return task-run metrics', async () => {
    const result = await processor.process(mockJob);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('taskRunMetrics');
    expect(result?.taskRunMetrics).toMatchObject({
      atEnd: snapshotStub,
      atStart: snapshotStub,
    });
  });

  it('should set plan status to IN_PROGRESS when job starts', async () => {
    await processor.process(mockJob);

    expect(mockRepoUpdate).toHaveBeenCalledTimes(1);
    expect(mockRepoUpdate).toHaveBeenCalledWith(
      { id: mockJob.data.planId },
      { status: 'IN_PROGRESS' },
    );
  });

  it('runs after_run hooks on orchestrator success before queue notification', async () => {
    mockJob = createMock<RunPlanJob>({
      data: {
        planId: '2794d106-95f9-427e-904d-e0f9b5cbe734',
        runKind: 'orchestrator',
      },
      id: 'job-1',
    });

    await processor.process(mockJob);

    expect(mockRunAfterRunHooksThenNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        mainRunStarted: true,
        mainRunSucceeded: true,
        notification: expect.objectContaining({
          planId: mockJob.data.planId,
          severity: 'success',
        }),
      }),
    );
  });

  it('should skip main run when before_run hook blocks', async () => {
    mockRunBeforeRunHooksAndHandleBlock.mockResolvedValueOnce(true);
    // `runBeforeRunHooksAndHandleBlock` is fully mocked above, so the hook's `phase`
    // value is never inspected; `beforeAll` is used here (rather than the legacy
    // 'before_run' wire value) so this literal satisfies JobRunHookPhase directly.
    mockJob = createMock<RunPlanJob>({
      data: {
        jobRunHooks: {
          hooks: [
            {
              kind: 'prompt_profile',
              onFailure: 'block',
              phase: 'beforeAll',
              prompt: '/agents/ralph',
              promptDelivery: 'named',
            },
          ],
        },
        planId: '2794d106-95f9-427e-904d-e0f9b5cbe734',
        runKind: 'orchestrator',
      },
      id: 'job-1',
    });

    await processor.process(mockJob);

    expect(mockRunBeforeRunHooksAndHandleBlock).toHaveBeenCalled();
    expect(mockRunPlanOrchestratorJob).not.toHaveBeenCalled();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('should call runPlanOrchestratorJob and not spawn when runKind is orchestrator', async () => {
    mockJob = createMock<RunPlanJob>({
      data: {
        planId: '2794d106-95f9-427e-904d-e0f9b5cbe734',
        runKind: 'orchestrator',
      },
      id: 'job-1',
    });

    const result = await processor.process(mockJob);

    expect(mockRunPlanOrchestratorJob).toHaveBeenCalledTimes(1);
    const orchestratorCall = mockRunPlanOrchestratorJob.mock.calls[0]?.[0];
    expect(orchestratorCall).toMatchObject({
      correlation: {
        correlationId: 'job-1',
        queueJobId: 'job-1',
        queueName: PLANS_QUEUE_NAME,
      },
      jobData: mockJob.data,
    });
    expect(orchestratorCall?.signal).toBeInstanceOf(AbortSignal);
    expect(mockSpawn).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      taskRunMetrics: {
        atEnd: snapshotStub,
        atStart: snapshotStub,
      },
    });
  });

  it('should capture metrics at start and end (getCurrentSnapshot called at least twice)', async () => {
    await processor.process(mockJob);

    expect(mockProcessMetrics.getCurrentSnapshot).toHaveBeenCalled();
    const callCount = mockProcessMetrics.getCurrentSnapshot.mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('should append task-run metrics summary to plan output stream', async () => {
    await processor.process(mockJob);

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Task run metrics:'),
        iteration: null,
        planId: mockJob.data.planId,
      }),
    );
    const content = mockCreate.mock.calls[0]?.[0]?.content;
    expect(content).toMatch(/RSS .+ MB, heap .+ MB, CPU user .+ ms/);
  });

  describe('liveness heartbeat', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('bumps the heartbeat on a wall-clock timer during the run and clears it on completion', async () => {
      vi.useFakeTimers();
      mockRecordHeartbeatByJob.mockClear();

      // Hold the orchestrator open so the wall-clock heartbeat timer can fire mid-run.
      let resolveOrchestrator!: (value: {
        exitCode: number;
        reason: string;
        status: string;
      }) => void;
      mockRunPlanOrchestratorJob.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOrchestrator = resolve;
        }),
      );

      const run = processor.process(mockJob);

      // Advance past two heartbeat intervals while the run is in flight.
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2 + 50);

      expect(mockRecordHeartbeatByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
      );
      const bumpsWhileRunning = mockRecordHeartbeatByJob.mock.calls.length;
      expect(bumpsWhileRunning).toBeGreaterThanOrEqual(2);

      resolveOrchestrator({
        exitCode: 0,
        reason: 'workflow_tasks_exhausted',
        status: 'finished',
      });
      await run;

      // Timer cleared in finally: no further bumps after completion.
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3);
      expect(mockRecordHeartbeatByJob.mock.calls.length).toBe(
        bumpsWhileRunning,
      );
    });

    it('swallows a heartbeat bump failure without failing the job', async () => {
      vi.useFakeTimers();
      mockRecordHeartbeatByJob.mockClear();
      mockRecordHeartbeatByJob.mockRejectedValue(new Error('db blip'));

      let resolveOrchestrator!: (value: {
        exitCode: number;
        reason: string;
        status: string;
      }) => void;
      mockRunPlanOrchestratorJob.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOrchestrator = resolve;
        }),
      );

      const run = processor.process(mockJob);
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS + 50);
      resolveOrchestrator({
        exitCode: 0,
        reason: 'workflow_tasks_exhausted',
        status: 'finished',
      });

      // The rejected heartbeat is caught internally; the job resolves normally.
      await expect(run).resolves.toBeDefined();
      mockRecordHeartbeatByJob.mockResolvedValue(1);
    });
  });

  describe('orchestrator path + cancel', () => {
    it('emits cancel notification (info) when orchestrator outcome is cancelled', async () => {
      mockJob = createMock<RunPlanJob>({
        data: {
          planId: '2794d106-95f9-427e-904d-e0f9b5cbe734',
          runKind: 'orchestrator',
        },
        id: 'job-1',
      });

      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        reason: 'workflow_cancelled',
        status: 'finished',
      });

      await processor.process(mockJob);

      const notifications = getProcessorNotifications(processor);

      expect(notifications.emitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          jobType: 'plans',
          message: expect.stringMatching(/[Cc]ancelled/),
          planId: mockJob.data.planId,
          severity: 'info',
        }),
      );
    });
  });

  describe('iteration limit notification (orchestrator path)', () => {
    it('emits warning when Ralph hits max iterations but plan is still IN_PROGRESS', async () => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        reason: 'workflow_max_iterations',
        status: 'finished',
      });
      mockRepoFindOne
        .mockResolvedValueOnce({ status: 'QUEUED', title: 'Test Plan' })
        .mockResolvedValueOnce({ status: 'IN_PROGRESS' });

      await processor.process(mockJob);

      expect(mockRepoFindOne).toHaveBeenCalledWith({
        where: { id: mockJob.data.planId },
      });
      const notifications = getProcessorNotifications(processor);
      expect(notifications.emitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          jobType: 'plans',
          message: expect.stringContaining('hit iteration limit'),
          planId: mockJob.data.planId,
          severity: 'warning',
        }),
      );
    });

    it('emits success when Ralph hits max iterations and plan is COMPLETED', async () => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        reason: 'workflow_max_iterations',
        status: 'finished',
      });
      mockRepoFindOne
        .mockResolvedValueOnce({ status: 'QUEUED', title: 'Test Plan' })
        .mockResolvedValueOnce({ status: 'COMPLETED' });

      await processor.process(mockJob);

      const notifications = getProcessorNotifications(processor);
      expect(notifications.emitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Plan run finished'),
          planId: mockJob.data.planId,
          severity: 'success',
        }),
      );
    });
  });

  describe('Plan status reconciliation on startup', () => {
    it('resets IN_PROGRESS plans that have no active job to QUEUED', async () => {
      const stuckPlanId = 'a1b2c3d4-in-progress-no-job';
      mockRepoFind.mockResolvedValueOnce([
        { id: stuckPlanId, status: 'IN_PROGRESS', title: 'Stuck' },
      ]);
      mockGetJobs.mockResolvedValueOnce([]);

      await processor.onModuleInit();

      expect(mockRepoUpdate).toHaveBeenCalledWith(
        { id: stuckPlanId },
        { status: 'QUEUED' },
      );
      expect(mockRepoUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not reset IN_PROGRESS plan when it has an active job', async () => {
      const planIdWithJob = 'plan-with-active-job';
      mockRepoFind.mockResolvedValueOnce([
        { id: planIdWithJob, status: 'IN_PROGRESS', title: 'Running' },
      ]);
      mockGetJobs.mockResolvedValueOnce([
        { data: { planId: planIdWithJob }, id: 'job-1' },
      ]);

      await processor.onModuleInit();

      expect(mockRepoUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when no plans are IN_PROGRESS', async () => {
      mockRepoFind.mockResolvedValueOnce([]);

      await processor.onModuleInit();

      expect(mockGetJobs).not.toHaveBeenCalled();
      expect(mockRepoUpdate).not.toHaveBeenCalled();
    });

    it('promotes QUEUED plans that have an IN_PROGRESS task and emits plan status changed', async () => {
      const divergedPlanId = 'queued-plan-with-in-progress-task';
      mockRepoFind
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: divergedPlanId, status: 'QUEUED', title: 'Diverged' },
        ]);
      mockTaskRepoFindOne.mockResolvedValueOnce({
        id: 'task-in-progress',
        planId: divergedPlanId,
        status: 'IN_PROGRESS',
      });
      mocksyncParentPlanStatus.mockResolvedValueOnce(true);

      await processor.onModuleInit();

      expect(mocksyncParentPlanStatus).toHaveBeenCalledWith(divergedPlanId);
      const notifications = getProcessorNotifications(processor);
      expect(notifications.emitPlanStatusChanged).toHaveBeenCalledWith({
        planId: divergedPlanId,
        status: 'IN_PROGRESS',
      });
    });

    it('does not emit when QUEUED plan has IN_PROGRESS task but sync is a no-op', async () => {
      const divergedPlanId = 'queued-plan-sync-noop';
      mockRepoFind
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: divergedPlanId, status: 'QUEUED', title: 'Diverged' },
        ]);
      mockTaskRepoFindOne.mockResolvedValueOnce({
        id: 'task-in-progress',
        planId: divergedPlanId,
        status: 'IN_PROGRESS',
      });
      mocksyncParentPlanStatus.mockResolvedValueOnce(false);

      await processor.onModuleInit();

      expect(mocksyncParentPlanStatus).toHaveBeenCalledWith(divergedPlanId);
      const notifications = getProcessorNotifications(processor);
      expect(notifications.emitPlanStatusChanged).not.toHaveBeenCalled();
    });

    it('skips QUEUED plans with no IN_PROGRESS tasks', async () => {
      const queuedPlanId = 'queued-plan-idle';
      mockRepoFind
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: queuedPlanId, status: 'QUEUED', title: 'Waiting' },
        ]);
      mockTaskRepoFindOne.mockResolvedValueOnce(null);

      await processor.onModuleInit();

      expect(mocksyncParentPlanStatus).not.toHaveBeenCalled();
    });
  });

  describe('Worker events (failed / stalled)', () => {
    it('onPlanJobFailed resets plan status to QUEUED', async () => {
      const planId = 'plan-failed-id';

      await processor.onPlanJobFailed({
        error: new Error('Job failed'),
        job: createMock<RunPlanJob>({ data: { planId }, id: 'job-1' }),
      });

      expect(mockRepoUpdate).toHaveBeenCalledWith(
        { id: planId },
        { status: 'QUEUED' },
      );
    });

    it('onPlanJobFailed does nothing when job has no planId', async () => {
      await processor.onPlanJobFailed({
        error: new Error('Job failed'),
        job: createMock<RunPlanJob>({ data: {}, id: 'job-1' }),
      });

      expect(mockRepoUpdate).not.toHaveBeenCalled();
    });

    it('onPlanJobStalled resets plan status to QUEUED when job has planId', async () => {
      const planId = 'plan-stalled-id';
      mockGetJob.mockResolvedValueOnce({
        data: { planId },
        id: 'job-stalled-1',
      });

      await processor.onPlanJobStalled('job-stalled-1');

      expect(mockGetJob).toHaveBeenCalledWith('job-stalled-1');
      expect(mockRepoUpdate).toHaveBeenCalledWith(
        { id: planId },
        { status: 'QUEUED' },
      );
    });

    it('onPlanJobStalled does nothing when job is missing or has no planId', async () => {
      mockGetJob.mockReset();
      mockGetJob.mockResolvedValue(null);

      await processor.onPlanJobStalled('missing-job');

      expect(mockGetJob).toHaveBeenCalledWith('missing-job');
      expect(mockRepoUpdate).not.toHaveBeenCalled();
    });
  });

  describe('BullMQ stalled job recovery', () => {
    /**
     * PlansProcessor passes explicit lockDuration, stalledInterval, and maxStalledCount so
     * long-running Ralph jobs are renewed and, after server restart, interrupted jobs become
     * stalled and re-enter the waiting queue. See plans.constants and plans.processor.ts.
     */
    it('passes explicit Worker options for stalled job recovery', () => {
      const workerOptions:
        | {
            concurrency?: number;
            lockDuration?: number;
            maxStalledCount?: number;
            stalledInterval?: number;
          }
        | undefined = Reflect.getMetadata(WORKER_METADATA_KEY, PlansProcessor);

      expect(workerOptions).toBeDefined();
      expect(workerOptions).toHaveProperty('concurrency', 1);
      expect(workerOptions).toHaveProperty(
        'lockDuration',
        PLANS_WORKER_LOCK_DURATION_MS,
      );
      expect(workerOptions).toHaveProperty(
        'stalledInterval',
        PLANS_WORKER_STALLED_INTERVAL_MS,
      );
      expect(workerOptions).toHaveProperty(
        'maxStalledCount',
        PLANS_WORKER_MAX_STALLED_COUNT,
      );
    });

    it('uses plans queue name in Processor metadata', () => {
      const processorMetadata: { name?: string } | undefined =
        Reflect.getMetadata('bullmq:processor_metadata', PlansProcessor);

      expect(processorMetadata).toBeDefined();
      expect(processorMetadata?.name).toBe(PLANS_QUEUE_NAME);
    });
  });

  describe('buildEnhancedMetrics extracts child/wall-clock metrics', () => {
    const validChildProcessMetrics: ChildProcessMetrics = {
      avgCpuPercent: 42.5,
      avgRssMb: 256,
      peakCpuPercent: 85.2,
      peakRssMb: 512,
      pid: 12345,
      pollIntervalMs: 5000,
      sampleCount: 15,
    };

    const validWallClockMetrics: WallClockMetrics = {
      cpuSystemMs: 500,
      cpuTimeMs: 2500,
      cpuUserMs: 2000,
      endTimestamp: 1700000010000,
      interpretation: 'mixed',
      startTimestamp: 1700000000000,
      wallClockMs: 10000,
      wallClockToCpuRatio: 4.0,
    };

    it('extracts childProcessMetrics from PlanRunJobResult when present', () => {
      const result: PlanRunJobResult = {
        acquire: {
          handoff: {
            branchName: 'test',
            targetId: 'wt-1',
            worktreePath: '/path',
          },
          ok: true,
        },
        childProcessMetrics: validChildProcessMetrics,
        loop: { ok: true },
        released: true,
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
        wallClockMetrics: validWallClockMetrics,
      };

      const buildEnhancedMetrics = getBuildEnhancedMetrics(processor);

      const enhanced = buildEnhancedMetrics(result);

      expect(enhanced).toBeDefined();
      expect(enhanced).toHaveProperty(
        'childProcessMetrics',
        validChildProcessMetrics,
      );
    });

    it('extracts wallClockMetrics from PlanRunJobResult when present', () => {
      const result: PlanRunJobResult = {
        acquire: {
          handoff: {
            branchName: 'test',
            targetId: 'wt-1',
            worktreePath: '/path',
          },
          ok: true,
        },
        childProcessMetrics: validChildProcessMetrics,
        loop: { ok: true },
        released: true,
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
        wallClockMetrics: validWallClockMetrics,
      };

      const buildEnhancedMetrics = getBuildEnhancedMetrics(processor);

      const enhanced = buildEnhancedMetrics(result);

      expect(enhanced).toBeDefined();
      expect(enhanced).toHaveProperty(
        'wallClockMetrics',
        validWallClockMetrics,
      );
    });

    it('includes atStart and atEnd from taskRunMetrics', () => {
      const result: PlanRunJobResult = {
        acquire: {
          handoff: {
            branchName: 'test',
            targetId: 'wt-1',
            worktreePath: '/path',
          },
          ok: true,
        },
        childProcessMetrics: validChildProcessMetrics,
        loop: { ok: true },
        released: true,
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
        wallClockMetrics: validWallClockMetrics,
      };

      const buildEnhancedMetrics = getBuildEnhancedMetrics(processor);

      const enhanced = buildEnhancedMetrics(result);

      expect(enhanced).toHaveProperty('atStart', snapshotStub);
      expect(enhanced).toHaveProperty('atEnd', snapshotStub);
    });

    it('handles undefined childProcessMetrics gracefully', () => {
      const result: PlanRunJobResult = {
        acquire: {
          handoff: {
            branchName: 'test',
            targetId: 'wt-1',
            worktreePath: '/path',
          },
          ok: true,
        },
        loop: { ok: true },
        released: true,
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
        wallClockMetrics: validWallClockMetrics,
      };

      const buildEnhancedMetrics = getBuildEnhancedMetrics(processor);

      const enhanced = buildEnhancedMetrics(result);

      expect(enhanced.childProcessMetrics).toBeUndefined();
    });

    it('handles undefined wallClockMetrics gracefully', () => {
      const result: PlanRunJobResult = {
        acquire: {
          handoff: {
            branchName: 'test',
            targetId: 'wt-1',
            worktreePath: '/path',
          },
          ok: true,
        },
        childProcessMetrics: validChildProcessMetrics,
        loop: { ok: true },
        released: true,
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
      };

      const buildEnhancedMetrics = getBuildEnhancedMetrics(processor);

      const enhanced = buildEnhancedMetrics(result);

      expect(enhanced.wallClockMetrics).toBeUndefined();
    });

    it('handles legacy result without worktree fields', () => {
      const result: PlanRunJobResult = {
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
      };

      const buildEnhancedMetrics = getBuildEnhancedMetrics(processor);

      const enhanced = buildEnhancedMetrics(result);

      expect(enhanced.atStart).toEqual(snapshotStub);
      expect(enhanced.atEnd).toEqual(snapshotStub);
      expect(enhanced.childProcessMetrics).toBeUndefined();
      expect(enhanced.wallClockMetrics).toBeUndefined();
    });
  });

  describe('PlanRunJobResult type structure for worktree mode', () => {
    const validChildProcessMetrics: ChildProcessMetrics = {
      avgCpuPercent: 42.5,
      avgRssMb: 256,
      peakCpuPercent: 85.2,
      peakRssMb: 512,
      pid: 12345,
      pollIntervalMs: 5000,
      sampleCount: 15,
    };

    const validWallClockMetrics: WallClockMetrics = {
      cpuSystemMs: 500,
      cpuTimeMs: 2500,
      cpuUserMs: 2000,
      endTimestamp: 1700000010000,
      interpretation: 'mixed',
      startTimestamp: 1700000000000,
      wallClockMs: 10000,
      wallClockToCpuRatio: 4.0,
    };

    it('PlanRunJobResult type accepts childProcessMetrics and wallClockMetrics', () => {
      const result: PlanRunJobResult = {
        acquire: {
          handoff: {
            branchName: 'test',
            targetId: 'wt-1',
            worktreePath: '/path',
          },
          ok: true,
        },
        childProcessMetrics: validChildProcessMetrics,
        loop: { ok: true },
        released: true,
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
        wallClockMetrics: validWallClockMetrics,
      };

      expect(result.childProcessMetrics).toEqual(validChildProcessMetrics);
      expect(result.wallClockMetrics).toEqual(validWallClockMetrics);
      expect(result.taskRunMetrics).toBeDefined();
    });

    it('PlanRunJobResult accepts worktree result with metrics when loop fails', () => {
      const result: PlanRunJobResult = {
        acquire: {
          handoff: {
            branchName: 'test',
            targetId: 'wt-1',
            worktreePath: '/path',
          },
          ok: true,
        },
        childProcessMetrics: validChildProcessMetrics,
        loop: { ok: false, reason: 'Ralph failed' },
        released: true,
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
        wallClockMetrics: validWallClockMetrics,
      };

      expect(result.childProcessMetrics).toEqual(validChildProcessMetrics);
      expect(result.wallClockMetrics).toEqual(validWallClockMetrics);
      expect(result.taskRunMetrics).toBeDefined();
      expect(result.loop).toHaveProperty('ok', false);
    });

    it('PlanRunJobResult accepts acquire failure with metrics', () => {
      const result: PlanRunJobResult = {
        acquire: { ok: false, reason: 'acquire_failed' },
        childProcessMetrics: undefined,
        released: false,
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
        wallClockMetrics: undefined,
      };

      expect(result.taskRunMetrics).toBeDefined();
      expect(result.childProcessMetrics).toBeUndefined();
      expect(result.wallClockMetrics).toBeUndefined();
    });
  });
});
