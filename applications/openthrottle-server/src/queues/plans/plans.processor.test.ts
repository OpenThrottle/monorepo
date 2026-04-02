import { spawn as nodeSpawn } from 'child_process';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { createMock } from '@golevelup/ts-vitest';
import { WORKTREE_TRACKER_TOKEN } from '@openthrottle/nestjs-worktrees';
import type { ChildProcessMetrics, WallClockMetrics } from '@tools/workflows';
import {
  PlanOutputStreamService,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import 'reflect-metadata';
import { ProcessMetricsService } from '../../metrics/process-metrics.service';
import { NotificationsService } from '../../notifications/notifications.service';
import type { PlanRunJobResult, RunPlanJob } from './plans.types';
import {
  PLANS_QUEUE_NAME,
  PLANS_WORKER_LOCK_DURATION_MS,
  PLANS_WORKER_MAX_STALLED_COUNT,
  PLANS_WORKER_STALLED_INTERVAL_MS,
  WORKTREE_RETRY_DELAY_MS,
} from './plans.constants';
import { PlanRunCancellationService } from './plan-run-cancellation.service';
import { PlansProcessor } from './plans.processor';

/** @nestjs/bullmq Worker options metadata key (from bull.constants WORKER_METADATA). Used to assert stalled-job recovery options. */
const WORKER_METADATA_KEY = 'bullmq:worker_metadata';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

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
/** Default: plan is COMPLETED so job completed message is success. Override to { status: 'IN_PROGRESS' } to test iteration-limit notification. */
const mockRepoFindOne = vi.fn().mockResolvedValue({ status: 'COMPLETED' });
const mockPlansService = createMock<PlansService>({
  getRepository: () =>
    ({
      find: mockRepoFind,
      findOne: mockRepoFindOne,
      update: mockRepoUpdate,
    }) as unknown as ReturnType<PlansService['getRepository']>,
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
const mockCreate = vi.fn(
  (data: { content: string; iteration: null; planId: string }) => ({ ...data }),
);
const mockPlanOutputStreamService = createMock<PlanOutputStreamService>({
  getRepository: () =>
    ({
      create: mockCreate,
      save: mockSave,
    }) as unknown as ReturnType<PlanOutputStreamService['getRepository']>,
});

const mockGetJobs = vi.fn().mockResolvedValue([]);
const mockGetJob = vi.fn().mockResolvedValue(null);
const mockPlansQueue = {
  getJob: mockGetJob,
  getJobs: mockGetJobs,
};

describe('PlansProcessor', () => {
  let processor: PlansProcessor;
  let testingModule: TestingModule;
  let mockJob: RunPlanJob;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockJob = {
      data: { planId: '2794d106-95f9-427e-904d-e0f9b5cbe734' },
      id: 'job-1',
    } as RunPlanJob;

    mockSpawn.mockImplementation((() => {
      let closeHandler:
        | ((code: number | null, signal: NodeJS.Signals | null) => void)
        | undefined;
      const stub = {
        on: vi.fn((ev: string, fn: (...args: unknown[]) => void) => {
          if (ev === 'close') {
            closeHandler = fn as (
              code: number | null,
              signal: NodeJS.Signals | null,
            ) => void;
            setImmediate(() => closeHandler?.(0, null));
          }
        }),
        pid: 42,
        stderr: { on: vi.fn() },
        stdout: { on: vi.fn() },
      };
      return stub as unknown as ReturnType<typeof nodeSpawn>;
    }) as typeof nodeSpawn);

    const mod = await Test.createTestingModule({
      providers: [
        PlanRunCancellationService,
        PlansProcessor,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NotificationsService,
          useValue: createMock<NotificationsService>(),
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
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
      ],
    }).compile();

    testingModule = mod;
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

  it('should spawn pnpm exec workflow-ralph --plan <planId> and await exit', async () => {
    await processor.process(mockJob);

    expect(mockSpawn).toHaveBeenCalledTimes(1);
    expect(mockSpawn).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'workflow-ralph', '--plan', mockJob.data.planId],
      expect.objectContaining({
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
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
    const content = mockCreate.mock.calls[0]?.[0]?.content as string;
    expect(content).toMatch(/RSS .+ MB, heap .+ MB, CPU user .+ ms/);
  });

  /**
   * @description Cancelled runs complete the BullMQ job successfully (returnvalue has metrics;
   * not `failed`). Plan row is set to PENDING by `cancelPlanRun` when the user cancels; the worker
   * does not mark the plan COMPLETED. Notifications use cancel copy + info severity vs success.
   */
  describe('kill / cancel outcome (legacy path)', () => {
    it('completes the job with cancel notification (info), not success or Bull failed', async () => {
      mockSpawn.mockImplementationOnce((() => {
        const closeListeners: Array<
          (code: number | null, signal: NodeJS.Signals | null) => void
        > = [];

        const fireClose = (
          code: number | null,
          signal: NodeJS.Signals | null,
        ): void => {
          for (const fn of closeListeners) {
            fn(code, signal);
          }
        };

        const stub = {
          kill: vi.fn((_sig?: NodeJS.Signals) => {
            stub.killed = true;
            setImmediate(() => fireClose(null, 'SIGTERM'));
          }),
          killed: false,
          on: vi.fn((ev: string, fn: (...args: unknown[]) => void) => {
            if (ev === 'close') {
              closeListeners.push(
                fn as (
                  code: number | null,
                  signal: NodeJS.Signals | null,
                ) => void,
              );
            }
          }),
          once: vi.fn((ev: string, fn: (...args: unknown[]) => void) => {
            if (ev === 'close') {
              closeListeners.push(
                fn as (
                  code: number | null,
                  signal: NodeJS.Signals | null,
                ) => void,
              );
            }
          }),
          pid: 42,
          stderr: { on: vi.fn() },
          stdout: { on: vi.fn() },
        };
        return stub as unknown as ReturnType<typeof nodeSpawn>;
      }) as typeof nodeSpawn);

      const planRunCancellation = testingModule.get(PlanRunCancellationService);
      const processPromise = processor.process(mockJob);

      await vi.waitFor(() => {
        expect(mockSpawn).toHaveBeenCalled();
      });

      planRunCancellation.abort(mockJob.data.planId);
      const result = await processPromise;

      const notifications = (
        processor as unknown as { notifications: NotificationsService }
      ).notifications;

      expect(notifications.emitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          jobType: 'plans',
          message: expect.stringMatching(/[Cc]ancelled/),
          planId: mockJob.data.planId,
          severity: 'info',
        }),
      );
      expect(notifications.emitQueueJobCompleted).not.toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
      expect(result).toMatchObject({
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
      });
    });
  });

  describe('iteration limit notification (legacy path)', () => {
    it('emits warning when Ralph exits 0 but plan is still IN_PROGRESS', async () => {
      mockRepoFindOne
        .mockResolvedValueOnce({ status: 'QUEUED', title: 'Test Plan' })
        .mockResolvedValueOnce({ status: 'IN_PROGRESS' });

      await processor.process(mockJob);

      expect(mockRepoFindOne).toHaveBeenCalledWith({
        where: { id: mockJob.data.planId },
      });
      const notifications = (
        processor as unknown as { notifications: NotificationsService }
      ).notifications;
      expect(notifications.emitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          jobType: 'plans',
          message: expect.stringContaining('hit iteration limit'),
          planId: mockJob.data.planId,
          severity: 'warning',
        }),
      );
    });

    it('emits success when Ralph exits 0 and plan is COMPLETED', async () => {
      mockRepoFindOne
        .mockResolvedValueOnce({ status: 'QUEUED', title: 'Test Plan' })
        .mockResolvedValueOnce({ status: 'COMPLETED' });

      await processor.process(mockJob);

      const notifications = (
        processor as unknown as { notifications: NotificationsService }
      ).notifications;
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
  });

  describe('Worker events (failed / stalled)', () => {
    it('onPlanJobFailed resets plan status to QUEUED', async () => {
      const planId = 'plan-failed-id';

      await processor.onPlanJobFailed({
        error: new Error('Job failed'),
        job: { data: { planId }, id: 'job-1' } as RunPlanJob,
      });

      expect(mockRepoUpdate).toHaveBeenCalledWith(
        { id: planId },
        { status: 'QUEUED' },
      );
    });

    it('onPlanJobFailed does nothing when job has no planId', async () => {
      await processor.onPlanJobFailed({
        error: new Error('Job failed'),
        job: { data: {}, id: 'job-1' } as RunPlanJob,
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
      const workerOptions = Reflect.getMetadata(
        WORKER_METADATA_KEY,
        PlansProcessor,
      ) as
        | {
            concurrency?: number;
            lockDuration?: number;
            maxStalledCount?: number;
            stalledInterval?: number;
          }
        | undefined;

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
      const processorMetadata = Reflect.getMetadata(
        'bullmq:processor_metadata',
        PlansProcessor,
      ) as { name?: string } | undefined;

      expect(processorMetadata).toBeDefined();
      expect(processorMetadata?.name).toBe(PLANS_QUEUE_NAME);
    });
  });

  describe('Worktree all_locked retry with delay', () => {
    let processorWithWorktrees: PlansProcessor;
    let mockMoveToDelayed: ReturnType<typeof vi.fn>;
    let mockJobWithToken: RunPlanJob;
    let notificationsForWorktrees: NotificationsService;

    /** Tracker that has targets but all are locked. */
    const mockAllLockedTracker = {
      acquire: () => ({ ok: false as const, reason: 'all_locked' as const }),
      getAvailableTarget: () => undefined,
      hasAvailableTarget: () => false,
      listTargets: () =>
        [
          {
            id: 'wt-1',
            lockedBy: 'job-other',
            path: '/path/to/wt1',
            status: 'locked',
          },
        ] as const,
      release: () => ({ ok: false as const, reason: 'not_locked' as const }),
    };

    beforeEach(async () => {
      mockMoveToDelayed = vi.fn().mockResolvedValue(undefined);
      mockJobWithToken = {
        data: { planId: 'plan-waiting-for-worktree' },
        id: 'job-worktree-test',
        moveToDelayed: mockMoveToDelayed,
        token: 'test-token',
      } as unknown as RunPlanJob;

      mockRepoFindOne.mockResolvedValue({
        status: 'QUEUED',
        title: 'Test Plan',
      });

      const mod = await Test.createTestingModule({
        providers: [
          PlanRunCancellationService,
          PlansProcessor,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
          {
            provide: NotificationsService,
            useValue: createMock<NotificationsService>(),
          },
          {
            provide: PlansService,
            useValue: mockPlansService,
          },
          {
            provide: WORKTREE_TRACKER_TOKEN,
            useValue: mockAllLockedTracker,
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
        ],
      }).compile();

      processorWithWorktrees = mod.get(PlansProcessor);
      notificationsForWorktrees = mod.get(NotificationsService);
    });

    it('moves job to delayed when all worktrees are locked', async () => {
      await expect(
        processorWithWorktrees.process(mockJobWithToken),
      ).rejects.toThrow('All worktrees locked, job moved to delayed');

      expect(mockMoveToDelayed).toHaveBeenCalledTimes(1);
      const [timestamp, token] = mockMoveToDelayed.mock.calls[0] as [
        number,
        string,
      ];
      expect(timestamp).toBeGreaterThan(
        Date.now() + WORKTREE_RETRY_DELAY_MS - 1000,
      );
      expect(timestamp).toBeLessThanOrEqual(
        Date.now() + WORKTREE_RETRY_DELAY_MS + 1000,
      );
      expect(token).toBe('test-token');
    });

    it('emits waiting for worktree notification', async () => {
      await expect(
        processorWithWorktrees.process(mockJobWithToken),
      ).rejects.toThrow();

      expect(
        notificationsForWorktrees.emitPlanWaitingForWorktree,
      ).toHaveBeenCalledWith({
        planId: 'plan-waiting-for-worktree',
        retryDelayMs: WORKTREE_RETRY_DELAY_MS,
      });
    });

    it('resets plan status to QUEUED before moving to delayed', async () => {
      await expect(
        processorWithWorktrees.process(mockJobWithToken),
      ).rejects.toThrow();

      expect(mockRepoUpdate).toHaveBeenCalledWith(
        { id: 'plan-waiting-for-worktree' },
        { status: 'QUEUED' },
      );
    });

    it('emits plan status changed notification', async () => {
      await expect(
        processorWithWorktrees.process(mockJobWithToken),
      ).rejects.toThrow();

      expect(
        notificationsForWorktrees.emitPlanStatusChanged,
      ).toHaveBeenCalledWith({
        planId: 'plan-waiting-for-worktree',
        status: 'QUEUED',
      });
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

      const buildEnhancedMetrics = (
        processor as unknown as {
          buildEnhancedMetrics: (r: PlanRunJobResult) => unknown;
        }
      ).buildEnhancedMetrics.bind(processor);

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

      const buildEnhancedMetrics = (
        processor as unknown as {
          buildEnhancedMetrics: (r: PlanRunJobResult) => unknown;
        }
      ).buildEnhancedMetrics.bind(processor);

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

      const buildEnhancedMetrics = (
        processor as unknown as {
          buildEnhancedMetrics: (r: PlanRunJobResult) => unknown;
        }
      ).buildEnhancedMetrics.bind(processor);

      const enhanced = buildEnhancedMetrics(result) as {
        atStart: typeof snapshotStub;
        atEnd: typeof snapshotStub;
      };

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

      const buildEnhancedMetrics = (
        processor as unknown as {
          buildEnhancedMetrics: (r: PlanRunJobResult) => unknown;
        }
      ).buildEnhancedMetrics.bind(processor);

      const enhanced = buildEnhancedMetrics(result) as {
        childProcessMetrics?: ChildProcessMetrics;
      };

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

      const buildEnhancedMetrics = (
        processor as unknown as {
          buildEnhancedMetrics: (r: PlanRunJobResult) => unknown;
        }
      ).buildEnhancedMetrics.bind(processor);

      const enhanced = buildEnhancedMetrics(result) as {
        wallClockMetrics?: WallClockMetrics;
      };

      expect(enhanced.wallClockMetrics).toBeUndefined();
    });

    it('handles legacy result without worktree fields', () => {
      const result: PlanRunJobResult = {
        taskRunMetrics: { atEnd: snapshotStub, atStart: snapshotStub },
      };

      const buildEnhancedMetrics = (
        processor as unknown as {
          buildEnhancedMetrics: (r: PlanRunJobResult) => unknown;
        }
      ).buildEnhancedMetrics.bind(processor);

      const enhanced = buildEnhancedMetrics(result) as {
        atStart: typeof snapshotStub;
        atEnd: typeof snapshotStub;
        childProcessMetrics?: ChildProcessMetrics;
        wallClockMetrics?: WallClockMetrics;
      };

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
