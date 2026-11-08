import 'reflect-metadata';

import { createMock } from '@golevelup/ts-vitest';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import {
  HEARTBEAT_INTERVAL_MS,
  PLAN_RUN_STATUS,
  PlanOutputStreamService,
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { WORKTREE_TRACKER_TOKEN } from '@openthrottle/nestjs-worktrees';
import type {
  ChildProcessMetrics,
  WallClockMetrics,
} from '@openthrottle/openthrottle-agentic-utils';
import type { ChildProcess } from 'child_process';
import { spawn as nodeSpawn } from 'child_process';
import type { Readable } from 'stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanEnqueueService } from '../../graphql/plans/plan-enqueue/plan-enqueue.service.ts';
import { PlanStatusService } from '../../graphql/plans/plan-status.service.ts';
import { SettleRunLedgerService } from '../../graphql/work-ledger/settle-run-ledger.service.ts';
import { StatusChangeSystemAccountService } from '../../graphql/work-ledger/status-change-system-account.service.ts';
import { ProcessMetricsService } from '../../metrics/process-metrics.service.ts';
import type { EnhancedTaskRunMetrics } from '../../metrics/process-metrics.types.ts';
import { NotificationsService } from '../../notifications/notifications.service.ts';
import { PlanRunWorktreeCleanupService } from '../../services/plan-run-worktree-cleanup/plan-run-worktree-cleanup.service.ts';
import { AgenticRalphOrchestratorService } from '../agentic-ralph/agentic-ralph-orchestrator.service.ts';
import { BullMqRunOutputRetentionService } from '../bullmq-run-output-retention.service.ts';
import { WorkflowLifecycleDispatcherFactory } from '../plan-lifecycle-hooks/workflow-lifecycle-dispatcher.service.ts';
import { PlanRunCancellationService } from './plan-run-cancellation.service.ts';
import {
  PLANS_QUEUE_NAME,
  PLANS_WORKER_LOCK_DURATION_MS,
  PLANS_WORKER_MAX_STALLED_COUNT,
  PLANS_WORKER_STALLED_INTERVAL_MS,
} from './plans.constants.ts';
import { PlansProcessor } from './plans.processor.ts';
import type { PlanRunJobResult, RunPlanJob } from './plans.types.ts';
import { ScheduledPlanRunService } from './scheduled-plan-run.service.ts';
import { UsageLimitResumeService } from './usage-limit-resume/usage-limit-resume.service.ts';
import { WorkLedgerRunService } from './work-ledger-run.service.ts';

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

const mockFindPlanIdsWithLiveDetachedRun = vi
  .fn()
  .mockResolvedValue(new Set<string>());
const mockRecordHeartbeatByJob = vi.fn().mockResolvedValue(1);
const mockSettleRunByJob = vi.fn().mockResolvedValue(null);
const mockSettleUnsettledRunByJob = vi.fn().mockResolvedValue(true);
const mockTransitionScheduledRun = vi.fn().mockResolvedValue(true);
const mockRecordSettledRunArtifacts = vi.fn().mockResolvedValue(undefined);
/** Default: no plan_runs row for the job (a legacy job), so admission lets it run as it always did. */
const mockFindByQueueNameAndBullmqJobId = vi.fn().mockResolvedValue(null);
const mockMarkRunStarted = vi.fn().mockResolvedValue(0);
const mockFindScheduledRunsWithJob = vi.fn().mockResolvedValue([]);
const mockFindEarliestScheduledForByPlanIds = vi
  .fn()
  .mockResolvedValue(new Map());
const mockFireScheduledRun = vi.fn().mockResolvedValue({ kind: 'fire' });
const mockReprojectScheduledRun = vi
  .fn()
  .mockResolvedValue({ jobId: 'scheduled-plan-run-x' });
const mockEmitQueueJobCompleted = vi.fn();
const mockWorktreeCleanupAfterRun = vi.fn().mockResolvedValue({
  detail: 'the run worked in the base checkout',
  kind: 'skipped',
  skip: 'no-worktree',
});
const mockHandleUsageLimited = vi.fn().mockResolvedValue({
  message: `Plan paused: usage limit reached — resumes at 2026-11-01T17:01:00.000Z`,
  outcome: 'resumed',
});

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
/** Default: the plan has no tasks, so every reconcile keeps its pre-BLOCKED behaviour. */
const mockTaskRepoFind = vi.fn().mockResolvedValue([]);
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
      find: mockTaskRepoFind,
      findOne: mockTaskRepoFindOne,
    }),
});

// The plans.status write chokepoint and the background-writer service-account lookup, both now
// injected into PlansProcessor in place of the old direct repo.update/TasksService.syncParentPlanStatus
// writes. Mocked wholesale here — PlanStatusService's own race/capture behaviour is covered by
// plan-status.service.test.ts.
const mockPromoteParentPlanToInProgress = vi.fn().mockResolvedValue(false);
const mockWriteGuardedStatus = vi.fn().mockResolvedValue(true);
const mockPlanStatusService = createMock<PlanStatusService>({
  promoteParentPlanToInProgress: mockPromoteParentPlanToInProgress,
  writeGuardedStatus: mockWriteGuardedStatus,
});
const mockResolveStatusChangeSystemAccountId = vi
  .fn()
  .mockResolvedValue('status-change-system-account-id');
const mockStatusChangeSystemAccountService =
  createMock<StatusChangeSystemAccountService>({
    resolveId: mockResolveStatusChangeSystemAccountId,
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
  let planRunCancellation: PlanRunCancellationService;
  let mockJob: RunPlanJob;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFindByQueueNameAndBullmqJobId.mockResolvedValue(null);
    mockMarkRunStarted.mockResolvedValue(0);
    mockFindScheduledRunsWithJob.mockResolvedValue([]);
    mockFindEarliestScheduledForByPlanIds.mockResolvedValue(new Map());
    mockTaskRepoFind.mockResolvedValue([]);
    mockFireScheduledRun.mockResolvedValue({ kind: 'fire' });
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
          useValue: createMock<NotificationsService>({
            emitQueueJobCompleted: mockEmitQueueJobCompleted,
          }),
        },
        // The real fire-time/boot-reconcile service, over a mocked enqueue pipeline: the processor
        // tests below see the whole fire path (decision -> notification -> no side effects).
        ScheduledPlanRunService,
        {
          provide: PlanEnqueueService,
          useValue: createMock<PlanEnqueueService>({
            fireScheduledRun: mockFireScheduledRun,
            reprojectScheduledRun: mockReprojectScheduledRun,
          }),
        },
        {
          provide: PlanRunsService,
          useValue: createMock<PlanRunsService>({
            clearRunLocation: vi.fn().mockResolvedValue(0),
            findByQueueNameAndBullmqJobId: mockFindByQueueNameAndBullmqJobId,
            findEarliestScheduledForByPlanIds:
              mockFindEarliestScheduledForByPlanIds,
            findPlanIdsWithLiveDetachedRun: mockFindPlanIdsWithLiveDetachedRun,
            findScheduledRunsWithJob: mockFindScheduledRunsWithJob,
            markRunStarted: mockMarkRunStarted,
            recordHeartbeatByJob: mockRecordHeartbeatByJob,
            settleRunByJob: mockSettleRunByJob,
            settleUnsettledRunByJob: mockSettleUnsettledRunByJob,
            transitionScheduledRun: mockTransitionScheduledRun,
          }),
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
        {
          provide: PlanStatusService,
          useValue: mockPlanStatusService,
        },
        {
          provide: StatusChangeSystemAccountService,
          useValue: mockStatusChangeSystemAccountService,
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
          provide: PlanRunWorktreeCleanupService,
          useValue: createMock<PlanRunWorktreeCleanupService>({
            afterRun: mockWorktreeCleanupAfterRun,
          }),
        },
        {
          provide: UsageLimitResumeService,
          useValue: createMock<UsageLimitResumeService>({
            handle: mockHandleUsageLimited,
          }),
        },
        {
          provide: WorkLedgerRunService,
          useValue: createMock<WorkLedgerRunService>({
            closeRalphSession: vi.fn().mockResolvedValue(undefined),
            openRalphSession: vi.fn().mockResolvedValue(null),
          }),
        },
        {
          provide: SettleRunLedgerService,
          useValue: createMock<SettleRunLedgerService>({
            recordSettledRunArtifacts: mockRecordSettledRunArtifacts,
          }),
        },
      ],
    }).compile();

    processor = mod.get(PlansProcessor);
    planRunCancellation = mod.get(PlanRunCancellationService);
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

    // Routed through the applyStatusChange chokepoint (PlanStatusService), attributed to the
    // status-change-system service account, in place of the old bare repo.update.
    expect(mockPromoteParentPlanToInProgress).toHaveBeenCalledTimes(1);
    expect(mockPromoteParentPlanToInProgress).toHaveBeenCalledWith(
      mockJob.data.planId,
      {
        actorKind: 'service_account',
        actorSub: 'status-change-system-account-id',
      },
      false,
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

  describe('plan_runs status settle on the three processOrchestrator exits', () => {
    it('settles the row to COMPLETED on orchestrator success', async () => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        reason: 'workflow_tasks_exhausted',
        status: 'finished',
      });

      await processor.process(mockJob);

      expect(mockSettleRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
        PLAN_RUN_STATUS.COMPLETED,
      );
    });

    it('settles COMPLETED (not FAILED) when the outcome is workflow_complete_handoff_owed and keeps the reason visible', async () => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        reason: 'workflow_complete_handoff_owed',
        status: 'finished',
      });

      await processor.process(mockJob);

      expect(mockSettleRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
        PLAN_RUN_STATUS.COMPLETED,
      );

      const notifications = getProcessorNotifications(processor);
      expect(notifications.emitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('workflow_complete_handoff_owed'),
          severity: 'warning',
        }),
      );
    });

    it('records settle-run ledger artifacts when the orchestrator returns headSha and prNumber', async () => {
      const settledRun = {
        id: 'plan-run-1',
        status: PLAN_RUN_STATUS.COMPLETED,
      };
      mockSettleRunByJob.mockResolvedValueOnce(settledRun);
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        headSha: 'deadbeef',
        prNumber: 42,
        reason: 'workflow_complete',
        status: 'finished',
      });

      await processor.process(mockJob);

      expect(mockSettleRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
        PLAN_RUN_STATUS.COMPLETED,
      );
      expect(mockRecordSettledRunArtifacts).toHaveBeenCalledWith({
        headSha: 'deadbeef',
        planRun: settledRun,
        prNumber: 42,
      });
    });

    it('settles the row to FAILED when the orchestrator outcome is failed', async () => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 1,
        reason: 'workflow_error',
        status: 'failed',
      });

      await processor.process(mockJob);

      expect(mockSettleRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
        PLAN_RUN_STATUS.FAILED,
      );
    });

    it('settles the row to CANCELLED when the orchestrator outcome is cancelled', async () => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        reason: 'workflow_cancelled',
        status: 'finished',
      });

      await processor.process(mockJob);

      expect(mockSettleRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
        PLAN_RUN_STATUS.CANCELLED,
      );
    });

    it('never writes STALE from the processor', async () => {
      await processor.process(mockJob);

      for (const call of mockSettleRunByJob.mock.calls) {
        expect(call[2]).not.toBe(PLAN_RUN_STATUS.STALE);
      }
    });

    it('stops the heartbeat timer before the terminal settle write lands', async () => {
      vi.useFakeTimers();
      mockRecordHeartbeatByJob.mockClear();
      mockSettleRunByJob.mockClear();

      // Delay the after-run-hooks/notify pipeline (which runs after the terminal
      // settle write) so a heartbeat tick landing in that window would prove the
      // timer was still armed when the terminal write happened.
      let resolveHooks!: () => void;
      mockRunAfterRunHooksThenNotify.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveHooks = resolve;
          }),
      );

      const run = processor.process(mockJob);

      // Let the orchestrator promise (resolved synchronously) settle the row, then
      // advance well past a heartbeat interval while the hooks pipeline is stalled.
      await vi.advanceTimersByTimeAsync(0);
      expect(mockSettleRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
        PLAN_RUN_STATUS.COMPLETED,
      );

      mockRecordHeartbeatByJob.mockClear();
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2 + 50);
      expect(mockRecordHeartbeatByJob).not.toHaveBeenCalled();

      resolveHooks();
      await run;
      vi.useRealTimers();
    });
  });

  describe('usage-limited outcome (orchestrator path)', () => {
    const usageLimit = {
      rateLimitType: 'five_hour',
      resetsAt: '2026-11-01T17:00:00.000Z',
    };

    beforeEach(() => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        reason: 'workflow_usage_limited',
        status: 'finished',
        usageLimit,
      });
    });

    it('hands the limit to the usage-limit service (which settles USAGE_LIMITED) instead of settling COMPLETED', async () => {
      await processor.process(mockJob);

      expect(mockHandleUsageLimited).toHaveBeenCalledExactlyOnceWith({
        jobData: mockJob.data,
        jobId: 'job-1',
        limit: usageLimit,
        planId: '2794d106-95f9-427e-904d-e0f9b5cbe734',
      });
      expect(mockSettleRunByJob).not.toHaveBeenCalled();
      // Paused, not finished: the BLOCKED backstop must not touch the plan.
      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
    });

    it('emits the service message as a warning, skips after-run hooks, and resolves normally (no BullMQ retry)', async () => {
      const result = await processor.process(mockJob);

      const notifications = getProcessorNotifications(processor);
      expect(notifications.emitQueueJobCompleted).toHaveBeenCalledWith({
        jobType: 'plans',
        message: `Plan paused: usage limit reached — resumes at 2026-11-01T17:01:00.000Z`,
        planId: '2794d106-95f9-427e-904d-e0f9b5cbe734',
        severity: 'warning',
      });
      expect(mockRunAfterRunHooksThenNotify).not.toHaveBeenCalled();
      expect(result.taskRunMetrics).toBeDefined();
    });
  });

  describe('finished outcome → plan status and notification (orchestrator path)', () => {
    const planId = '2794d106-95f9-427e-904d-e0f9b5cbe734';
    const task = (status: string): Record<string, unknown> => {
      return {
        hookRole: null,
        hookSource: null,
        parentTaskId: null,
        planId,
        status,
      };
    };

    /** First findOne is the job-start plan read; the second is the post-run status read. */
    const givenPlanStatusAfterRun = (status: string): void => {
      mockRepoFindOne
        .mockResolvedValueOnce({ status: 'QUEUED', title: 'Test Plan' })
        .mockResolvedValueOnce({ status });
    };

    it('workflow_tasks_blocked: warns how many tasks need attention, links the draft PR, settles the run COMPLETED', async () => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        headSha: 'abc123',
        prNumber: 42,
        reason: 'workflow_tasks_blocked',
        status: 'finished',
      });
      givenPlanStatusAfterRun('BLOCKED');
      mockTaskRepoFind.mockResolvedValueOnce([
        task('COMPLETED'),
        task('COMPLETED'),
        task('BLOCKED'),
      ]);

      await processor.process(mockJob);

      // The orchestrator already wrote BLOCKED, so the backstop has nothing to do.
      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
      expect(mockSettleRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
        PLAN_RUN_STATUS.COMPLETED,
      );
      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
        jobType: 'plans',
        message: expect.stringContaining(
          'Plan blocked: 1 task(s) need attention',
        ),
        planId,
        severity: 'warning',
      });
      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('PR #42'),
        }),
      );
    });

    it.each([
      { label: 'iteration limit', reason: 'workflow_max_iterations' },
      { label: 'time budget', reason: 'workflow_budget_exhausted' },
    ])(
      '$reason with work left and the plan still IN_PROGRESS: backstop writes BLOCKED and the warning names the $label',
      async ({ label, reason }) => {
        mockRunPlanOrchestratorJob.mockResolvedValueOnce({
          exitCode: 0,
          reason,
          status: 'finished',
        });
        givenPlanStatusAfterRun('IN_PROGRESS');
        mockTaskRepoFind.mockResolvedValueOnce([
          task('COMPLETED'),
          task('PENDING'),
          task('BLOCKED'),
        ]);

        await processor.process(mockJob);

        expect(mockWriteGuardedStatus).toHaveBeenCalledWith(planId, {
          actorKind: 'service_account',
          actorSub: 'status-change-system-account-id',
          captureFailureIsFatal: false,
          guardCurrentStatus: 'IN_PROGRESS',
          requestedStatus: 'BLOCKED',
          throwOnForbiddenInProgress: false,
        });
        const notifications = getProcessorNotifications(processor);
        expect(notifications.emitPlanStatusChanged).toHaveBeenCalledWith({
          planId,
          status: 'BLOCKED',
        });
        expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
          jobType: 'plans',
          message: expect.stringContaining(`Plan hit its ${label}`),
          planId,
          severity: 'warning',
        });
        expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(
              '1 task(s) still pending, 1 blocked',
            ),
          }),
        );
      },
    );

    it('workflow_max_iterations where the last iteration finished the plan: success, no backstop write', async () => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        reason: 'workflow_max_iterations',
        status: 'finished',
      });
      givenPlanStatusAfterRun('COMPLETED');

      await processor.process(mockJob);

      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Plan run finished'),
          planId,
          severity: 'success',
        }),
      );
    });

    it('workflow_tasks_exhausted with the plan left IN_PROGRESS and nothing remaining: backstop writes COMPLETED', async () => {
      givenPlanStatusAfterRun('IN_PROGRESS');
      mockTaskRepoFind.mockResolvedValueOnce([
        task('COMPLETED'),
        task('SKIPPED'),
      ]);

      await processor.process(mockJob);

      expect(mockWriteGuardedStatus).toHaveBeenCalledWith(
        planId,
        expect.objectContaining({
          guardCurrentStatus: 'IN_PROGRESS',
          requestedStatus: 'COMPLETED',
        }),
      );
      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('backstop leaves a QUEUED plan alone when another job for it is waiting (re-enqueued during the run)', async () => {
      givenPlanStatusAfterRun('QUEUED');
      mockTaskRepoFind.mockResolvedValueOnce([task('BLOCKED')]);
      mockGetJobs.mockResolvedValueOnce([
        { data: { planId }, id: 'job-1' },
        { data: { planId }, id: 'job-2' },
      ]);

      await processor.process(mockJob);

      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
    });

    it('backstop writes BLOCKED for a QUEUED plan whose only queued job is this one', async () => {
      givenPlanStatusAfterRun('QUEUED');
      mockTaskRepoFind.mockResolvedValueOnce([task('BLOCKED')]);
      mockGetJobs.mockResolvedValueOnce([{ data: { planId }, id: 'job-1' }]);

      await processor.process(mockJob);

      expect(mockWriteGuardedStatus).toHaveBeenCalledWith(
        planId,
        expect.objectContaining({
          guardCurrentStatus: 'QUEUED',
          requestedStatus: 'BLOCKED',
        }),
      );
    });

    it.each([
      { reason: 'workflow_cancelled', status: 'finished' },
      { reason: 'workflow_agent_error', status: 'failed' },
    ])(
      '$reason never runs the BLOCKED backstop',
      async ({ reason, status }) => {
        mockRunPlanOrchestratorJob.mockResolvedValueOnce({
          exitCode: 1,
          reason,
          status,
        });
        givenPlanStatusAfterRun('IN_PROGRESS');
        mockTaskRepoFind.mockResolvedValueOnce([task('BLOCKED')]);

        await processor.process(mockJob);

        expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
      },
    );
  });

  describe('worktree teardown after the run (orchestrator path)', () => {
    const worktree = {
      baseCheckoutPath: '/repo',
      worktreePath: '/root/acme/monorepo/plan-2794d106',
    };

    /** The orchestrator reports the worktree it provisioned, then returns `result`. */
    const orchestratorProvisions = (result: Record<string, unknown>): void => {
      mockRunPlanOrchestratorJob.mockImplementationOnce(
        async (params: {
          readonly onWorktreeProvisioned?: (value: typeof worktree) => void;
        }) => {
          params.onWorktreeProvisioned?.(worktree);
          return result;
        },
      );
    };

    beforeEach(() => {
      mockWorktreeCleanupAfterRun.mockClear();
    });

    it('hands a finished run with a PR to the cleanup policy, after settle and afterAll hooks', async () => {
      orchestratorProvisions({
        exitCode: 0,
        headSha: 'deadbeef',
        prNumber: 42,
        reason: 'workflow_complete',
        status: 'finished',
      });

      await processor.process(mockJob);

      expect(mockWorktreeCleanupAfterRun).toHaveBeenCalledExactlyOnceWith({
        planId: mockJob.data.planId,
        prNumber: 42,
        reason: 'workflow_complete',
        worktree,
      });
      const cleanupOrder =
        mockWorktreeCleanupAfterRun.mock.invocationCallOrder[0] ?? 0;
      const hooksOrder =
        mockRunAfterRunHooksThenNotify.mock.invocationCallOrder.at(-1) ?? 0;
      const settleOrder =
        mockSettleRunByJob.mock.invocationCallOrder.at(-1) ?? 0;
      expect(hooksOrder).toBeGreaterThan(settleOrder);
      expect(cleanupOrder).toBeGreaterThan(hooksOrder);
    });

    it('passes a null worktree when the run worked in the base checkout', async () => {
      mockRunPlanOrchestratorJob.mockResolvedValueOnce({
        exitCode: 0,
        prNumber: 42,
        reason: 'workflow_complete',
        status: 'finished',
      });

      await processor.process(mockJob);

      expect(mockWorktreeCleanupAfterRun).toHaveBeenCalledWith(
        expect.objectContaining({ worktree: null }),
      );
    });

    it('reports a failed run to the policy with no PR, so the worktree is kept and logged', async () => {
      orchestratorProvisions({
        exitCode: 1,
        reason: 'workflow_error',
        status: 'failed',
      });

      await processor.process(mockJob);

      expect(mockSettleRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
        PLAN_RUN_STATUS.FAILED,
      );
      expect(mockWorktreeCleanupAfterRun).toHaveBeenCalledExactlyOnceWith({
        planId: mockJob.data.planId,
        prNumber: undefined,
        reason: 'workflow_error',
        worktree,
      });
    });

    it('reports a cancelled run to the policy', async () => {
      orchestratorProvisions({
        exitCode: 0,
        reason: 'workflow_cancelled',
        status: 'finished',
      });

      await processor.process(mockJob);

      expect(mockWorktreeCleanupAfterRun).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'workflow_cancelled', worktree }),
      );
    });

    it('leaves a usage-limited run alone: the continuation reuses the worktree', async () => {
      orchestratorProvisions({
        exitCode: 0,
        reason: 'workflow_usage_limited',
        status: 'finished',
        usageLimit: { rateLimitType: 'five_hour', resetsAt: null },
      });

      await processor.process(mockJob);

      expect(mockWorktreeCleanupAfterRun).not.toHaveBeenCalled();
    });
  });

  describe('admission: fire-time policy, settled rows and the guarded claim', () => {
    const planId = '2794d106-95f9-427e-904d-e0f9b5cbe734';
    const scheduledFor = new Date('2026-11-01T12:00:00.000Z');
    const scheduledRun = createMock<PlanRun>({
      bullmqJobId: 'job-1',
      id: 'run-scheduled',
      planId,
      queueName: PLANS_QUEUE_NAME,
      scheduledFor,
      status: 'SCHEDULED',
    });

    beforeEach(() => {
      // The Worker is only created by the BullMQ explorer at bootstrap; give the claim a worker id so
      // markRunStarted is actually reached (otherwise the stamp fails best-effort before calling it).
      Object.defineProperty(processor, 'worker', {
        configurable: true,
        value: { id: 'worker-x' },
      });
    });

    /** Every side effect a started run has; a run that is not admitted must have none of them. */
    const expectNoRunSideEffects = (attach: unknown): void => {
      expect(attach).not.toHaveBeenCalled();
      expect(mockMarkRunStarted).not.toHaveBeenCalled();
      expect(mockRecordHeartbeatByJob).not.toHaveBeenCalled();
      expect(mockPromoteParentPlanToInProgress).not.toHaveBeenCalled();
      expect(mockRunBeforeRunHooksAndHandleBlock).not.toHaveBeenCalled();
      expect(mockRunPlanOrchestratorJob).not.toHaveBeenCalled();
      expect(mockSettleRunByJob).not.toHaveBeenCalled();
    };

    it("checks the job's working directory at fire time: a worktree removed since scheduling reaches the policy as a workspace error", async () => {
      const gone = '/nonexistent/ot-scheduled-run-worktree-removed';
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(scheduledRun);
      mockFireScheduledRun.mockResolvedValueOnce({
        kind: 'workspace_missing',
        reason: `workingDirectory does not exist: ${gone}`,
      });

      await processor.process(
        createMock<RunPlanJob>({
          data: { planId, runKind: 'orchestrator', workingDirectory: gone },
          id: 'job-1',
        }),
      );

      expect(mockFireScheduledRun).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceError: `workingDirectory does not exist: ${gone}`,
        }),
      );
      expect(mockRunPlanOrchestratorJob).not.toHaveBeenCalled();
    });

    it('fires a due scheduled run: the policy claims it (plan/tasks QUEUED) before the worker claims it IN_PROGRESS, then the run proceeds', async () => {
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(scheduledRun);
      mockMarkRunStarted.mockResolvedValueOnce(1);

      const result = await processor.process(mockJob);

      expect(mockFindByQueueNameAndBullmqJobId).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
      );
      expect(mockFireScheduledRun).toHaveBeenCalledWith({
        actorKind: 'service_account',
        actorSub: 'status-change-system-account-id',
        now: expect.any(Date),
        planId,
        planRunId: 'run-scheduled',
        workspaceError: null,
      });
      // fireScheduledRun is where the SCHEDULED -> QUEUED claim and the plan/task QUEUED flip
      // happen (plan-enqueue.service.test.ts); markRunStarted (QUEUED -> IN_PROGRESS) only after.
      const [fireOrder] = mockFireScheduledRun.mock.invocationCallOrder;
      const [claimOrder] = mockMarkRunStarted.mock.invocationCallOrder;
      expect(fireOrder).toBeLessThan(claimOrder ?? 0);
      expect(mockPromoteParentPlanToInProgress).toHaveBeenCalledTimes(1);
      expect(mockRunPlanOrchestratorJob).toHaveBeenCalledTimes(1);
      expect(mockEmitQueueJobCompleted).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Scheduled plan run'),
        }),
      );
      expect(result).toHaveProperty('taskRunMetrics');
    });

    it.each([
      {
        kind: 'missed',
        message: 'Scheduled plan run missed',
        reason: 'it was 90 minutes late, past the 60-minute grace window',
      },
      {
        kind: 'superseded',
        message: 'Scheduled plan run superseded',
        reason: 'the plan already had an active run',
      },
      {
        kind: 'workspace_missing',
        message: 'Scheduled plan run failed to start',
        reason: 'workingDirectory does not exist: /gone/worktree',
      },
    ] as const)(
      '$kind: the run is settled by the policy, the user is warned, and nothing else happens',
      async ({ kind, message, reason }) => {
        const attach = vi.spyOn(planRunCancellation, 'attach');
        mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(scheduledRun);
        mockFireScheduledRun.mockResolvedValueOnce({ kind, reason });

        const result = await processor.process(mockJob);

        expect(mockFireScheduledRun).toHaveBeenCalledTimes(1);
        expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
          jobType: 'plans',
          message: expect.stringContaining(message),
          planId,
          severity: 'warning',
        });
        expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining(reason) }),
        );
        expectNoRunSideEffects(attach);
        expect(result).toEqual({
          taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
        });
      },
    );

    it('nothing to run: settled, notified as info, and not started', async () => {
      const attach = vi.spyOn(planRunCancellation, 'attach');
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(scheduledRun);
      mockFireScheduledRun.mockResolvedValueOnce({
        kind: 'nothing_to_run',
        reason: 'the plan had no tasks left to run',
      });

      await processor.process(mockJob);

      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Scheduled plan run skipped'),
          severity: 'info',
        }),
      );
      expectNoRunSideEffects(attach);
    });

    it('cancel won the race (the conditional SCHEDULED update matched nothing): backs off without starting or notifying', async () => {
      const attach = vi.spyOn(planRunCancellation, 'attach');
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(scheduledRun);
      mockFireScheduledRun.mockResolvedValueOnce({ kind: 'not_scheduled' });

      await processor.process(mockJob);

      expect(mockEmitQueueJobCompleted).not.toHaveBeenCalled();
      expectNoRunSideEffects(attach);
    });

    it.each(['CANCELLED', 'MISSED', 'SUPERSEDED', 'STALE', 'COMPLETED'])(
      'a job whose row is already %s is never reopened: no policy call, no claim, no run',
      async (status) => {
        const attach = vi.spyOn(planRunCancellation, 'attach');
        mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
          createMock<PlanRun>({ id: 'run-settled', planId, status }),
        );

        await processor.process(mockJob);

        expect(mockFireScheduledRun).not.toHaveBeenCalled();
        expectNoRunSideEffects(attach);
      },
    );

    it('backs off when the guarded claim matches nothing although a row exists (settled between read and claim)', async () => {
      const attach = vi.spyOn(planRunCancellation, 'attach');
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
        createMock<PlanRun>({ id: 'run-queued', planId, status: 'QUEUED' }),
      );
      mockMarkRunStarted.mockResolvedValueOnce(0);

      await processor.process(mockJob);

      expect(mockMarkRunStarted).toHaveBeenCalledTimes(1);
      expect(attach).not.toHaveBeenCalled();
      expect(mockPromoteParentPlanToInProgress).not.toHaveBeenCalled();
      expect(mockRunPlanOrchestratorJob).not.toHaveBeenCalled();
    });

    it.each(['QUEUED', 'IN_PROGRESS'])(
      'runs a %s row once the claim succeeds (first pickup, or a BullMQ retry / stall recovery)',
      async (status) => {
        mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
          createMock<PlanRun>({ id: 'run-1', planId, status }),
        );
        mockMarkRunStarted.mockResolvedValueOnce(1);

        await processor.process(mockJob);

        expect(mockFireScheduledRun).not.toHaveBeenCalled();
        expect(mockRunPlanOrchestratorJob).toHaveBeenCalledTimes(1);
      },
    );

    it('still runs when the claim write itself fails (best-effort stamp, as before)', async () => {
      mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
        createMock<PlanRun>({ id: 'run-1', planId, status: 'QUEUED' }),
      );
      mockMarkRunStarted.mockRejectedValueOnce(new Error('db blip'));

      await processor.process(mockJob);

      expect(mockRunPlanOrchestratorJob).toHaveBeenCalledTimes(1);
    });

    it('runs a legacy job with no plan_runs row, as it always did', async () => {
      await processor.process(mockJob);

      expect(mockMarkRunStarted).toHaveBeenCalledTimes(1);
      expect(mockRunPlanOrchestratorJob).toHaveBeenCalledTimes(1);
    });
  });

  describe('Plan status reconciliation on startup', () => {
    beforeEach(() => {
      vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', '');
      vi.stubEnv('OT_WORKTREE_DB', '');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('a shared-DB worktree skips every reconcile — its own queue prefix sees no active jobs', async () => {
      vi.stubEnv('OT_WORKTREE_DB', 'shared');

      await processor.onModuleInit();

      expect(mockRepoFind).not.toHaveBeenCalled();
      expect(mockGetJobs).not.toHaveBeenCalled();
      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
      expect(mockPromoteParentPlanToInProgress).not.toHaveBeenCalled();
      // Nor the scheduled-run reconcile: it would see every delayed job as missing in its own prefix.
      expect(mockFindScheduledRunsWithJob).not.toHaveBeenCalled();
      expect(mockReprojectScheduledRun).not.toHaveBeenCalled();
    });

    it('the owner re-projects a SCHEDULED run whose delayed job is missing, with the time still left', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-01T12:00:00.000Z'));
      const run = createMock<PlanRun>({
        bullmqJobId: 'scheduled-plan-run-lost',
        id: 'run-lost',
        planId: 'plan-x',
        scheduledFor: new Date('2026-11-01T13:00:00.000Z'),
        status: 'SCHEDULED',
      });
      mockFindScheduledRunsWithJob.mockResolvedValueOnce([run]);

      try {
        await processor.onModuleInit();
      } finally {
        vi.useRealTimers();
      }

      expect(mockGetJob).toHaveBeenCalledWith('scheduled-plan-run-lost');
      expect(mockReprojectScheduledRun).toHaveBeenCalledWith({
        delayMs: 60 * 60 * 1_000,
        run,
      });
    });

    it('resets IN_PROGRESS plans that have no active job to QUEUED', async () => {
      const stuckPlanId = 'a1b2c3d4-in-progress-no-job';
      mockRepoFind.mockResolvedValueOnce([
        { id: stuckPlanId, status: 'IN_PROGRESS', title: 'Stuck' },
      ]);
      mockGetJobs.mockResolvedValueOnce([]);

      await processor.onModuleInit();

      // Routed through the applyStatusChange chokepoint (PlanStatusService.writeGuardedStatus),
      // attributed to the status-change-system service account, in place of the old bare
      // repo.update.
      expect(mockWriteGuardedStatus).toHaveBeenCalledWith(stuckPlanId, {
        actorKind: 'service_account',
        actorSub: 'status-change-system-account-id',
        captureFailureIsFatal: false,
        guardCurrentStatus: 'IN_PROGRESS',
        requestedStatus: 'QUEUED',
        throwOnForbiddenInProgress: false,
      });
      expect(mockWriteGuardedStatus).toHaveBeenCalledTimes(1);
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

      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
    });

    it('leaves an IN_PROGRESS plan alone when its newest run is a live interactive run', async () => {
      // An /ot-loop run (register_plan_run) never has a BullMQ job, so "no active job" says
      // nothing about it. Resetting here flipped a live loop's plan to QUEUED on every restart
      // (reproduced in OT plan d279cccb task 1).
      const interactivePlanId = 'plan-with-live-interactive-run';
      mockRepoFind.mockResolvedValueOnce([
        { id: interactivePlanId, status: 'IN_PROGRESS', title: 'Looping' },
      ]);
      mockGetJobs.mockResolvedValueOnce([]);
      mockFindPlanIdsWithLiveDetachedRun.mockResolvedValueOnce(
        new Set([interactivePlanId]),
      );

      await processor.onModuleInit();

      expect(mockFindPlanIdsWithLiveDetachedRun).toHaveBeenCalledWith([
        interactivePlanId,
      ]);
      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
      const notifications = getProcessorNotifications(processor);
      expect(notifications.emitPlanStatusChanged).not.toHaveBeenCalled();
    });

    it('still resets a queued-run plan with no active job alongside a live interactive one', async () => {
      const interactivePlanId = 'plan-with-live-interactive-run';
      const queuedRunPlanId = 'plan-whose-queued-job-died';
      mockRepoFind.mockResolvedValueOnce([
        { id: interactivePlanId, status: 'IN_PROGRESS', title: 'Looping' },
        { id: queuedRunPlanId, status: 'IN_PROGRESS', title: 'Interrupted' },
      ]);
      mockGetJobs.mockResolvedValueOnce([]);
      mockFindPlanIdsWithLiveDetachedRun.mockResolvedValueOnce(
        new Set([interactivePlanId]),
      );

      await processor.onModuleInit();

      expect(mockWriteGuardedStatus).toHaveBeenCalledTimes(1);
      expect(mockWriteGuardedStatus).toHaveBeenCalledWith(
        queuedRunPlanId,
        expect.objectContaining({
          guardCurrentStatus: 'IN_PROGRESS',
          requestedStatus: 'QUEUED',
        }),
      );
      const notifications = getProcessorNotifications(processor);
      expect(notifications.emitPlanStatusChanged).toHaveBeenCalledTimes(1);
      expect(notifications.emitPlanStatusChanged).toHaveBeenCalledWith({
        planId: queuedRunPlanId,
        status: 'QUEUED',
      });
    });

    it('does nothing when no plans are IN_PROGRESS', async () => {
      mockRepoFind.mockResolvedValueOnce([]);

      await processor.onModuleInit();

      expect(mockGetJobs).not.toHaveBeenCalled();
      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
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
      mockPromoteParentPlanToInProgress.mockResolvedValueOnce(true);

      await processor.onModuleInit();

      expect(mockPromoteParentPlanToInProgress).toHaveBeenCalledWith(
        divergedPlanId,
        {
          actorKind: 'service_account',
          actorSub: 'status-change-system-account-id',
        },
        false,
      );
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
      mockPromoteParentPlanToInProgress.mockResolvedValueOnce(false);

      await processor.onModuleInit();

      expect(mockPromoteParentPlanToInProgress).toHaveBeenCalledWith(
        divergedPlanId,
        {
          actorKind: 'service_account',
          actorSub: 'status-change-system-account-id',
        },
        false,
      );
      const notifications = getProcessorNotifications(processor);
      expect(notifications.emitPlanStatusChanged).not.toHaveBeenCalled();
    });

    it('leaves a QUEUED plan alone when its BullMQ job is delayed (usage-limit resume)', async () => {
      const pausedPlanId = 'queued-plan-delayed-resume';
      mockRepoFind
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: pausedPlanId, status: 'QUEUED', title: 'Paused' },
        ]);
      mockGetJobs.mockImplementation(async (states: readonly string[]) =>
        states.includes('delayed') ? [{ data: { planId: pausedPlanId } }] : [],
      );

      await processor.onModuleInit();

      // The delayed-job guard short-circuits before the IN_PROGRESS-task lookup.
      expect(mockTaskRepoFindOne).not.toHaveBeenCalled();
      expect(mockPromoteParentPlanToInProgress).not.toHaveBeenCalled();
      mockGetJobs.mockReset();
      mockGetJobs.mockResolvedValue([]);
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

      expect(mockPromoteParentPlanToInProgress).not.toHaveBeenCalled();
    });

    describe('plans no run can progress settle BLOCKED, not QUEUED', () => {
      const task = (
        planId: string,
        status: string,
      ): Record<string, unknown> => {
        return {
          hookRole: null,
          hookSource: null,
          parentTaskId: null,
          planId,
          status,
        };
      };

      it('moves an IN_PROGRESS plan with no job and only BLOCKED tasks left to BLOCKED (the 5aad07f6 shape)', async () => {
        const blockedPlanId = 'in-progress-only-blocked';
        mockRepoFind.mockResolvedValueOnce([
          { id: blockedPlanId, status: 'IN_PROGRESS', title: 'Visual pass' },
        ]);
        mockTaskRepoFind.mockResolvedValue([
          task(blockedPlanId, 'COMPLETED'),
          task(blockedPlanId, 'COMPLETED'),
          task(blockedPlanId, 'BLOCKED'),
        ]);

        await processor.onModuleInit();

        expect(mockWriteGuardedStatus).toHaveBeenCalledWith(blockedPlanId, {
          actorKind: 'service_account',
          actorSub: 'status-change-system-account-id',
          captureFailureIsFatal: false,
          guardCurrentStatus: 'IN_PROGRESS',
          requestedStatus: 'BLOCKED',
          throwOnForbiddenInProgress: false,
        });
        expect(mockWriteGuardedStatus).not.toHaveBeenCalledWith(
          blockedPlanId,
          expect.objectContaining({ requestedStatus: 'QUEUED' }),
        );
        const notifications = getProcessorNotifications(processor);
        expect(notifications.emitPlanStatusChanged).toHaveBeenCalledWith({
          planId: blockedPlanId,
          status: 'BLOCKED',
        });
      });

      it('moves an IN_PROGRESS plan with no job and every task terminal to COMPLETED', async () => {
        const donePlanId = 'in-progress-all-done';
        mockRepoFind.mockResolvedValueOnce([
          { id: donePlanId, status: 'IN_PROGRESS', title: 'Done' },
        ]);
        mockTaskRepoFind.mockResolvedValue([
          task(donePlanId, 'COMPLETED'),
          task(donePlanId, 'CANCELED'),
        ]);

        await processor.onModuleInit();

        expect(mockWriteGuardedStatus).toHaveBeenCalledWith(
          donePlanId,
          expect.objectContaining({
            guardCurrentStatus: 'IN_PROGRESS',
            requestedStatus: 'COMPLETED',
          }),
        );
      });

      it('still resets an IN_PROGRESS plan with a workable task to QUEUED', async () => {
        const workablePlanId = 'in-progress-with-pending';
        mockRepoFind.mockResolvedValueOnce([
          { id: workablePlanId, status: 'IN_PROGRESS', title: 'Interrupted' },
        ]);
        mockTaskRepoFind.mockResolvedValue([
          task(workablePlanId, 'BLOCKED'),
          task(workablePlanId, 'PENDING'),
        ]);

        await processor.onModuleInit();

        expect(mockWriteGuardedStatus).toHaveBeenCalledTimes(1);
        expect(mockWriteGuardedStatus).toHaveBeenCalledWith(
          workablePlanId,
          expect.objectContaining({ requestedStatus: 'QUEUED' }),
        );
      });

      it('repairs a stranded QUEUED plan (no job, no scheduled run, only BLOCKED tasks) to BLOCKED', async () => {
        const strandedPlanId = 'queued-stranded';
        mockRepoFind
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { id: strandedPlanId, status: 'QUEUED', title: 'Stranded' },
          ])
          .mockResolvedValueOnce([
            { id: strandedPlanId, status: 'QUEUED', title: 'Stranded' },
          ]);
        mockTaskRepoFind.mockResolvedValue([
          task(strandedPlanId, 'COMPLETED'),
          task(strandedPlanId, 'BLOCKED'),
        ]);

        await processor.onModuleInit();

        expect(mockWriteGuardedStatus).toHaveBeenCalledExactlyOnceWith(
          strandedPlanId,
          {
            actorKind: 'service_account',
            actorSub: 'status-change-system-account-id',
            captureFailureIsFatal: false,
            guardCurrentStatus: 'QUEUED',
            requestedStatus: 'BLOCKED',
            throwOnForbiddenInProgress: false,
          },
        );
        const notifications = getProcessorNotifications(processor);
        expect(notifications.emitPlanStatusChanged).toHaveBeenCalledWith({
          planId: strandedPlanId,
          status: 'BLOCKED',
        });
      });

      it('leaves a QUEUED plan with only BLOCKED tasks alone when it has a delayed job', async () => {
        const delayedPlanId = 'queued-blocked-with-delayed-job';
        mockRepoFind
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { id: delayedPlanId, status: 'QUEUED', title: 'Delayed' },
          ])
          .mockResolvedValueOnce([
            { id: delayedPlanId, status: 'QUEUED', title: 'Delayed' },
          ]);
        mockTaskRepoFind.mockResolvedValue([task(delayedPlanId, 'BLOCKED')]);
        const delayedJob = { data: { planId: delayedPlanId } };
        mockGetJobs.mockImplementation(async (states: readonly string[]) =>
          states.includes('delayed') ? [delayedJob] : [],
        );

        try {
          await processor.onModuleInit();
        } finally {
          mockGetJobs.mockReset();
          mockGetJobs.mockResolvedValue([]);
        }

        expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
      });

      it('leaves a QUEUED plan with only BLOCKED tasks alone when a run is scheduled for it', async () => {
        const scheduledPlanId = 'queued-blocked-with-scheduled-run';
        mockRepoFind
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { id: scheduledPlanId, status: 'QUEUED', title: 'Scheduled' },
          ])
          .mockResolvedValueOnce([
            { id: scheduledPlanId, status: 'QUEUED', title: 'Scheduled' },
          ]);
        mockTaskRepoFind.mockResolvedValue([task(scheduledPlanId, 'BLOCKED')]);
        mockFindEarliestScheduledForByPlanIds.mockResolvedValueOnce(
          new Map([
            [
              scheduledPlanId,
              { id: 'run-s', scheduledFor: new Date('2026-12-01T00:00:00Z') },
            ],
          ]),
        );

        await processor.onModuleInit();

        expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
      });

      it('leaves a QUEUED plan with a workable task alone (it is waiting for a run, not stranded)', async () => {
        const waitingPlanId = 'queued-with-queued-task';
        mockRepoFind
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { id: waitingPlanId, status: 'QUEUED', title: 'Waiting' },
          ])
          .mockResolvedValueOnce([
            { id: waitingPlanId, status: 'QUEUED', title: 'Waiting' },
          ]);
        mockTaskRepoFind.mockResolvedValue([
          task(waitingPlanId, 'BLOCKED'),
          task(waitingPlanId, 'QUEUED'),
        ]);

        await processor.onModuleInit();

        expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
      });
    });
  });

  describe('Worker events (failed / stalled)', () => {
    it('onPlanJobFailed resets plan status to QUEUED', async () => {
      const planId = 'plan-failed-id';

      await processor.onPlanJobFailed({
        error: new Error('Job failed'),
        job: createMock<RunPlanJob>({ data: { planId }, id: 'job-1' }),
      });

      // Routed through the applyStatusChange chokepoint (PlanStatusService.writeGuardedStatus),
      // attributed to the status-change-system service account, in place of the old bare
      // repo.update.
      expect(mockWriteGuardedStatus).toHaveBeenCalledWith(planId, {
        actorKind: 'service_account',
        actorSub: 'status-change-system-account-id',
        captureFailureIsFatal: false,
        guardCurrentStatus: undefined,
        requestedStatus: 'QUEUED',
        throwOnForbiddenInProgress: false,
      });
    });

    it('onPlanJobFailed does nothing when job has no planId', async () => {
      await processor.onPlanJobFailed({
        error: new Error('Job failed'),
        job: createMock<RunPlanJob>({ data: {}, id: 'job-1' }),
      });

      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
    });

    it('a non-final failed attempt leaves the plan_runs row IN_PROGRESS (no settle write)', async () => {
      const planId = 'plan-retrying';
      mockSettleUnsettledRunByJob.mockClear();

      await processor.onPlanJobFailed({
        error: new Error('Job failed'),
        job: createMock<RunPlanJob>({
          attemptsMade: 1,
          data: { planId },
          id: 'job-retry-1',
          opts: { attempts: 3 },
        }),
      });

      expect(mockSettleUnsettledRunByJob).not.toHaveBeenCalled();
    });

    it('the final failed attempt settles the plan_runs row to FAILED', async () => {
      const planId = 'plan-exhausted';
      mockSettleUnsettledRunByJob.mockClear();

      await processor.onPlanJobFailed({
        error: new Error('Job failed'),
        job: createMock<RunPlanJob>({
          attemptsMade: 3,
          data: { planId },
          id: 'job-retry-1',
          opts: { attempts: 3 },
        }),
      });

      expect(mockSettleUnsettledRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-retry-1',
        PLAN_RUN_STATUS.FAILED,
      );
    });

    it('treats a job with no configured attempts as final (settles to FAILED)', async () => {
      const planId = 'plan-no-retry-config';
      mockSettleUnsettledRunByJob.mockClear();

      await processor.onPlanJobFailed({
        error: new Error('Job failed'),
        job: createMock<RunPlanJob>({
          attemptsMade: 1,
          data: { planId },
          id: 'job-single-attempt',
          opts: {},
        }),
      });

      expect(mockSettleUnsettledRunByJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-single-attempt',
        PLAN_RUN_STATUS.FAILED,
      );
    });

    describe('guarded on the job plan_runs row', () => {
      const exhaustedJob = (planId: string): RunPlanJob => {
        return createMock<RunPlanJob>({
          attemptsMade: 1,
          data: { planId },
          id: 'job-guarded',
          opts: { attempts: 1 },
        });
      };
      const runWithStatus = (status: string): PlanRun => {
        return createMock<PlanRun>({
          bullmqJobId: 'job-guarded',
          id: `run-${status}`,
          planId: 'plan-guarded',
          status,
        });
      };

      beforeEach(() => {
        mockSettleUnsettledRunByJob.mockClear();
        mockTransitionScheduledRun.mockClear();
        mockWriteGuardedStatus.mockClear();
      });

      it('SCHEDULED (admission threw before the claim): the plan is not reset, and the exhausted run settles FAILED under the SCHEDULED guard', async () => {
        mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
          runWithStatus('SCHEDULED'),
        );

        await processor.onPlanJobFailed({
          error: new Error('db down during fire'),
          job: exhaustedJob('plan-guarded'),
        });

        expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
        expect(mockSettleUnsettledRunByJob).not.toHaveBeenCalled();
        expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
          'run-SCHEDULED',
          PLAN_RUN_STATUS.FAILED,
        );
      });

      it('SCHEDULED with retries left: nothing is written, so the retry fires the policy again', async () => {
        mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
          runWithStatus('SCHEDULED'),
        );

        await processor.onPlanJobFailed({
          error: new Error('db down during fire'),
          job: createMock<RunPlanJob>({
            attemptsMade: 1,
            data: { planId: 'plan-guarded' },
            id: 'job-guarded',
            opts: { attempts: 3 },
          }),
        });

        expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
        expect(mockTransitionScheduledRun).not.toHaveBeenCalled();
        expect(mockSettleUnsettledRunByJob).not.toHaveBeenCalled();
      });

      it.each(['MISSED', 'SUPERSEDED', 'CANCELLED', 'COMPLETED', 'FAILED'])(
        'an already-settled %s row is left as is, and the plan is not reset',
        async (status) => {
          mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
            runWithStatus(status),
          );

          await processor.onPlanJobFailed({
            error: new Error('late failure'),
            job: exhaustedJob('plan-guarded'),
          });

          expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
          expect(mockSettleUnsettledRunByJob).not.toHaveBeenCalled();
          expect(mockTransitionScheduledRun).not.toHaveBeenCalled();
        },
      );

      it.each(['QUEUED', 'IN_PROGRESS'])(
        'an unsettled %s row resets the plan and settles FAILED through the guarded write',
        async (status) => {
          mockFindByQueueNameAndBullmqJobId.mockResolvedValueOnce(
            runWithStatus(status),
          );

          await processor.onPlanJobFailed({
            error: new Error('run failed'),
            job: exhaustedJob('plan-guarded'),
          });

          expect(mockWriteGuardedStatus).toHaveBeenCalledWith(
            'plan-guarded',
            expect.objectContaining({ requestedStatus: 'QUEUED' }),
          );
          expect(mockSettleUnsettledRunByJob).toHaveBeenCalledWith(
            PLANS_QUEUE_NAME,
            'job-guarded',
            PLAN_RUN_STATUS.FAILED,
          );
        },
      );
    });

    it('onPlanJobStalled resets plan status to QUEUED when job has planId', async () => {
      const planId = 'plan-stalled-id';
      mockGetJob.mockResolvedValueOnce({
        data: { planId },
        id: 'job-stalled-1',
      });

      await processor.onPlanJobStalled('job-stalled-1');

      expect(mockGetJob).toHaveBeenCalledWith('job-stalled-1');
      expect(mockWriteGuardedStatus).toHaveBeenCalledWith(planId, {
        actorKind: 'service_account',
        actorSub: 'status-change-system-account-id',
        captureFailureIsFatal: false,
        guardCurrentStatus: undefined,
        requestedStatus: 'QUEUED',
        throwOnForbiddenInProgress: false,
      });
    });

    it('onPlanJobStalled does nothing when job is missing or has no planId', async () => {
      mockGetJob.mockReset();
      mockGetJob.mockResolvedValue(null);

      await processor.onPlanJobStalled('missing-job');

      expect(mockGetJob).toHaveBeenCalledWith('missing-job');
      expect(mockWriteGuardedStatus).not.toHaveBeenCalled();
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
