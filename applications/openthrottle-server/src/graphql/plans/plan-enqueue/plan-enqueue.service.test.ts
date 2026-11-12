import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRun,
  PlanRunsService,
  PlansService,
  RepositoryCheckoutsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import {
  type Plan,
  PlanRun as PlanRunEntity,
  type RepositoryCheckout,
  Task,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { isRecord } from '@openthrottle/nodejs-utils';
import type { Queue } from 'bullmq';
import { GraphQLError } from 'graphql';
import { In, QueryFailedError } from 'typeorm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { NotificationsService } from '../../../notifications/notifications.service.ts';
import type {
  RunPlanJobData,
  RunPlanOrchestratorJobData,
} from '../../../queues/plans/plans.types.ts';
import type { QueuesService } from '../../queues/queues-service/queues-service.service.ts';
import type { WorkLedgerCaptureService } from '../../work-ledger/work-ledger-capture/work-ledger-capture.service.ts';
import { buildRunPlanOrchestratorJobData } from '../enqueue-plan-ralph-tuning/enqueue-plan-ralph-tuning.utils.ts';
import { buildPlanRunConfigSnapshotFromJobData } from '../enqueue-plan-run-config-snapshot/enqueue-plan-run-config-snapshot.utils.ts';
import type { PlanStatusService } from '../plan-status/plan-status.service.ts';
import { PlanEnqueueService } from './plan-enqueue.service.ts';

// `runConfig` is a plain stored shell (no runner), not an auto-mocked proxy: the enqueue reads
// `runConfig.runner` and `runConfig.otLoop`, and a proxy would answer with a function.
const mockPlan = createMock<Plan>({
  id: '80864bba-630a-451d-bfd2-4b25ec202381',
  jobRunHooks: { hooks: [] },
  runConfig: asMock<Plan['runConfig']>({
    otLoop: undefined,
    runner: undefined,
    version: 1,
  }),
  status: 'PENDING',
});

describe('PlanEnqueueService', () => {
  const mockAdd = vi.fn().mockResolvedValue({ id: 'job-1', name: 'run-plan' });
  const mockGetWaitingCount = vi.fn().mockResolvedValue(1);
  const mockGetJobs = vi
    .fn()
    .mockResolvedValue([{ id: 'job-1', name: 'run-plan' }]);

  const mockGetJob = vi.fn().mockResolvedValue(undefined);
  const mockPlansQueue = createMock<Queue<RunPlanJobData, void>>({
    add: mockAdd,
    getJob: mockGetJob,
    getJobs: mockGetJobs,
    getWaitingCount: mockGetWaitingCount,
  });

  // updateMatchingTasksAndEmitStatusChanged (via applyBulkTaskStatusChange) selects the plan's
  // matching tasks under a pessimistic write lock (mockTaskSelectGetMany drives which rows are
  // "affected", and each row's own status is what gets captured as `from`), then updates them by
  // id (mockTaskUpdateExecute).
  const mockTaskSelectGetMany = vi.fn().mockResolvedValue([]);
  const mockTaskUpdateExecute = vi
    .fn()
    .mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] });
  const mockTaskUpdateQueryBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    execute: mockTaskUpdateExecute,
    getMany: mockTaskSelectGetMany,
    returning: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    setLock: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const taskRepo = {
    count: vi.fn().mockResolvedValue(1),
    createQueryBuilder: vi.fn(() => mockTaskUpdateQueryBuilder),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
  };

  // plan_runs reads inside a transaction (the fire-time re-read of the scheduled row).
  const planRunRepo = {
    findOne: vi.fn().mockResolvedValue(null),
  };

  const repo = {
    findOne: vi.fn().mockResolvedValue(mockPlan),
    manager: {
      // Non-transactional reads (the runnable-task guard in prepareOrchestratorRun).
      getRepository: vi.fn((entity: unknown) =>
        entity === Task ? taskRepo : repo,
      ),
      transaction: vi.fn(
        async (
          cb: (manager: {
            getRepository: (entity: unknown) => unknown;
          }) => unknown,
        ) =>
          cb({
            getRepository: (entity: unknown) => {
              if (entity === Task) {
                return taskRepo;
              }
              if (entity === PlanRunEntity) {
                return planRunRepo;
              }
              return repo;
            },
          }),
      ),
    },
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  };

  const mockEmitTaskStatusChanged = vi.fn();
  const mockEmitPlanEnqueued = vi.fn();
  const mockNotificationsService = createMock<NotificationsService>({
    emitPlanEnqueued: mockEmitPlanEnqueued,
    emitTaskStatusChanged: mockEmitTaskStatusChanged,
  });

  const mockRecordQueuedRun = vi.fn().mockResolvedValue({});
  const mockFindByQueueNameAndBullmqJobId = vi.fn().mockResolvedValue(null);
  const mockHasActiveRun = vi.fn().mockResolvedValue(false);
  const mockTransitionScheduledRun = vi.fn().mockResolvedValue(true);
  const mockFindRunById = vi.fn().mockResolvedValue(null);
  const mockRescheduleScheduledRun = vi.fn().mockResolvedValue(true);
  const mockCancelScheduledRunsForPlan = vi.fn().mockResolvedValue([]);
  const mockPlanRunsService = createMock<PlanRunsService>({
    cancelScheduledRunsForPlan: mockCancelScheduledRunsForPlan,
    findById: mockFindRunById,
    findByQueueNameAndBullmqJobId: mockFindByQueueNameAndBullmqJobId,
    hasActiveRun: mockHasActiveRun,
    recordQueuedRun: mockRecordQueuedRun,
    rescheduleScheduledRun: mockRescheduleScheduledRun,
    transitionScheduledRun: mockTransitionScheduledRun,
  });

  const mockEnqueuePlanRalphOrchestrator = vi
    .fn()
    .mockResolvedValue({ jobId: 'job-orch-1' });
  const mockQueuesService = createMock<QueuesService>({
    enqueuePlanRalphOrchestrator: mockEnqueuePlanRalphOrchestrator,
  });

  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue(repo),
  });

  // The plans.status write chokepoint, in place of the old direct repo.update({ status: 'QUEUED' })
  // — mocked wholesale here; its own mutate/capture/race behaviour is covered by
  // plan-status.service.test.ts. Deliberately does NOT mutate `params.entity`: `mockPlan` is a
  // single shared object reused (not cloned) across this file's tests via `repo.findOne`, so
  // mutating it here would leak status changes across unrelated tests.
  const mockApplyStatusChange = vi.fn().mockResolvedValue({
    applied: true,
    fromStatus: 'PENDING',
    toStatus: 'QUEUED',
  });
  const mockReconcileAfterScheduledRunSettled = vi
    .fn()
    .mockResolvedValue(false);
  const mockReleaseScheduledPlan = vi.fn().mockResolvedValue(true);
  const mockRemoveScheduledRunJobs = vi.fn().mockResolvedValue(undefined);
  const mockReleaseScheduledPlanStandalone = vi.fn().mockResolvedValue(true);
  const mockPlanStatusService = createMock<PlanStatusService>({
    applyStatusChange: mockApplyStatusChange,
    reconcileAfterScheduledRunSettled: mockReconcileAfterScheduledRunSettled,
    releaseScheduledPlan: mockReleaseScheduledPlan,
    releaseScheduledPlanStandalone: mockReleaseScheduledPlanStandalone,
    removeScheduledRunJobs: mockRemoveScheduledRunJobs,
  });

  const mockGetPlanHooks = vi.fn().mockResolvedValue({ after: [], before: [] });
  const mockTasksService = createMock<TasksService>({
    getPlanHooks: mockGetPlanHooks,
  });

  const mockFindByIdForUser = vi.fn().mockResolvedValue(null);
  const mockFindByRepositoryIdForUser = vi.fn().mockResolvedValue([]);
  const mockRepositoryCheckoutsService = createMock<RepositoryCheckoutsService>(
    {
      findByIdForUser: mockFindByIdForUser,
      findByRepositoryIdForUser: mockFindByRepositoryIdForUser,
    },
  );

  const mockLogger = createMock<LoggerService>();
  const mockRecordStatusChange = vi.fn().mockResolvedValue(undefined);
  const mockResolveSessionId = vi.fn().mockResolvedValue('session-1');
  const mockWorkLedgerCapture = createMock<WorkLedgerCaptureService>({
    recordStatusChange: mockRecordStatusChange,
    resolveSessionId: mockResolveSessionId,
  });

  const service = new PlanEnqueueService(
    mockLogger,
    mockNotificationsService,
    mockPlanRunsService,
    mockPlansService,
    mockPlanStatusService,
    mockQueuesService,
    mockRepositoryCheckoutsService,
    mockTasksService,
    mockWorkLedgerCapture,
    mockPlansQueue,
  );

  beforeEach(() => {
    repo.findOne.mockResolvedValue(mockPlan);
    repo.save.mockReset().mockResolvedValue(undefined);
    repo.update.mockResolvedValue(undefined);
    mockApplyStatusChange.mockReset().mockResolvedValue({
      applied: true,
      fromStatus: 'PENDING',
      toStatus: 'QUEUED',
    });
    mockAdd.mockClear();
    mockAdd.mockResolvedValue({ id: 'job-1', name: 'run-plan' });
    mockGetJobs.mockResolvedValue([{ id: 'job-1', name: 'run-plan' }]);
    mockGetWaitingCount.mockResolvedValue(1);
    mockRecordQueuedRun.mockClear();
    mockFindByQueueNameAndBullmqJobId.mockReset().mockResolvedValue(null);
    mockEnqueuePlanRalphOrchestrator.mockClear();
    mockEnqueuePlanRalphOrchestrator.mockResolvedValue({ jobId: 'job-orch-1' });
    mockEmitTaskStatusChanged.mockClear();
    mockEmitPlanEnqueued.mockClear();
    mockTaskUpdateExecute.mockResolvedValue({
      affected: 0,
      generatedMaps: [],
      raw: [],
    });
    mockTaskSelectGetMany.mockReset().mockResolvedValue([]);
    mockTaskUpdateQueryBuilder.set.mockClear();
    mockTaskUpdateQueryBuilder.andWhere.mockClear();
    mockRecordStatusChange.mockReset().mockResolvedValue(undefined);
    mockResolveSessionId.mockReset().mockResolvedValue('session-1');
    planRunRepo.findOne.mockReset().mockResolvedValue(null);
    taskRepo.count.mockReset().mockResolvedValue(1);
    mockHasActiveRun.mockReset().mockResolvedValue(false);
    mockTransitionScheduledRun.mockReset().mockResolvedValue(true);
    mockReleaseScheduledPlan.mockReset().mockResolvedValue(true);
    mockReleaseScheduledPlanStandalone.mockReset().mockResolvedValue(true);
    mockRemoveScheduledRunJobs.mockReset().mockResolvedValue(undefined);
    mockCancelScheduledRunsForPlan.mockReset().mockResolvedValue([]);
  });

  /** Asserts `promise` rejects with a D8 conflict GraphQLError and returns its extensions. */
  const expectScheduleConflict = async (
    promise: Promise<unknown>,
  ): Promise<Record<string, unknown>> => {
    const error: unknown = await promise.catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(GraphQLError);
    if (!(error instanceof GraphQLError)) return {};
    return error.extensions;
  };

  describe('enqueueSpawn (delegates to the orchestrator path)', () => {
    // The nested-workflow-ralph spawn worker was removed (OT plan 2ab62876): enqueueSpawn now always
    // routes to the in-process orchestrator. There is no spawn queue.add and no
    // OPENTHROTTLE_DEFAULT_RUN_KIND rollback anymore.
    test('routes to the orchestrator path (no spawn add)', async () => {
      const result = await service.enqueueSpawn({
        branch: 'feature/test',
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledTimes(1);
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          jobData: expect.objectContaining({
            planId: mockPlan.id,
            runKind: 'orchestrator',
          }),
        }),
      );
      expect(mockAdd).not.toHaveBeenCalled();
      expect(result.jobId).toBe('job-orch-1');
    });

    test('throws NotFoundException when plan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.enqueueSpawn({
          branch: 'feature/test',
          planId: 'non-existent-id',
          priority: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockAdd).not.toHaveBeenCalled();
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });
  });

  describe('workspace resolution (checkoutId → repositoryId → workingDirectory)', () => {
    // process.cwd() is a real existing directory so the resolved path survives the reused
    // validateWorkingDirectory existence check in buildRunPlanOrchestratorJobData.
    const existingDir = process.cwd();
    const checkout = createMock<RepositoryCheckout>({
      filesystemPath: existingDir,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      repositoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });

    const snapshotWorkspace = (): Record<string, unknown> => {
      const call = mockRecordQueuedRun.mock.calls[0]?.[0];
      const snapshot = isRecord(call) ? call.runConfigSnapshot : undefined;
      const workspace = isRecord(snapshot) ? snapshot.workspace : undefined;
      return isRecord(workspace) ? workspace : {};
    };

    beforeEach(() => {
      mockFindByIdForUser.mockReset();
      mockFindByRepositoryIdForUser.mockReset();
    });

    test('resolves checkoutId to its filesystem path and snapshots both ids', async () => {
      mockFindByIdForUser.mockResolvedValue(checkout);

      await service.enqueueOrchestrator({
        actorUserId: 'user-1',
        branch: 'feature/test',
        checkoutId: checkout.id,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: null,
      });

      expect(mockFindByIdForUser).toHaveBeenCalledWith(checkout.id, 'user-1');
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          jobData: expect.objectContaining({ workingDirectory: existingDir }),
        }),
      );
      expect(snapshotWorkspace()).toMatchObject({
        checkoutId: checkout.id,
        repositoryId: checkout.repositoryId,
        workingDirectory: existingDir,
      });
    });

    test('resolves repositoryId to the user single checkout', async () => {
      mockFindByRepositoryIdForUser.mockResolvedValue([checkout]);

      await service.enqueueOrchestrator({
        actorUserId: 'user-1',
        branch: 'feature/test',
        mode: null,
        planId: mockPlan.id,
        priority: null,
        repositoryId: checkout.repositoryId,
        taskId: null,
        workingDirectory: null,
      });

      expect(mockFindByRepositoryIdForUser).toHaveBeenCalledWith(
        checkout.repositoryId,
        'user-1',
      );
      expect(snapshotWorkspace()).toMatchObject({
        checkoutId: checkout.id,
        repositoryId: checkout.repositoryId,
        workingDirectory: existingDir,
      });
    });

    test('rejects a repositoryId with no checkout for the user', async () => {
      mockFindByRepositoryIdForUser.mockResolvedValue([]);

      await expect(
        service.enqueueOrchestrator({
          actorUserId: 'user-1',
          branch: 'feature/test',
          mode: null,
          planId: mockPlan.id,
          priority: null,
          repositoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('rejects an ambiguous repositoryId with multiple checkouts', async () => {
      mockFindByRepositoryIdForUser.mockResolvedValue([checkout, checkout]);

      await expect(
        service.enqueueOrchestrator({
          actorUserId: 'user-1',
          branch: 'feature/test',
          mode: null,
          planId: mockPlan.id,
          priority: null,
          repositoryId: checkout.repositoryId,
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('rejects an unknown checkoutId', async () => {
      mockFindByIdForUser.mockResolvedValue(null);

      await expect(
        service.enqueueOrchestrator({
          actorUserId: 'user-1',
          branch: 'feature/test',
          checkoutId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          mode: null,
          planId: mockPlan.id,
          priority: null,
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('uses the raw workingDirectory escape hatch when no ids are given', async () => {
      await service.enqueueOrchestrator({
        actorUserId: 'user-1',
        branch: 'feature/test',
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: existingDir,
      });

      expect(mockFindByIdForUser).not.toHaveBeenCalled();
      expect(mockFindByRepositoryIdForUser).not.toHaveBeenCalled();
      const workspace = snapshotWorkspace();
      expect(workspace.workingDirectory).toBe(existingDir);
      expect(workspace.checkoutId).toBeUndefined();
      expect(workspace.repositoryId).toBeUndefined();
    });
  });

  describe('enqueueOrchestrator on a plan with a scheduled run (D6)', () => {
    const SCHEDULED_FOR = new Date('2026-12-01T09:00:00.000Z');
    const runNow = (
      cancelScheduled: boolean | null,
    ): ReturnType<PlanEnqueueService['enqueueOrchestrator']> => {
      return service.enqueueOrchestrator({
        branch: 'feature/test',
        cancelScheduled,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: null,
      });
    };

    beforeEach(() => {
      planRunRepo.findOne.mockResolvedValue({
        id: 'run-scheduled',
        scheduledFor: SCHEDULED_FOR,
      });
    });

    test('without cancelScheduled: rejects with PLAN_ALREADY_SCHEDULED naming the run, and writes nothing', async () => {
      const extensions = await expectScheduleConflict(runNow(null));

      expect(extensions).toMatchObject({
        code: 'PLAN_ALREADY_SCHEDULED',
        planRunId: 'run-scheduled',
        scheduledFor: SCHEDULED_FOR.toISOString(),
      });
      expect(mockRecordQueuedRun).not.toHaveBeenCalled();
      expect(mockCancelScheduledRunsForPlan).not.toHaveBeenCalled();
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('with cancelScheduled: cancels the scheduled run in the commit, removes its job, then enqueues', async () => {
      mockCancelScheduledRunsForPlan.mockResolvedValue([
        { bullmqJobId: 'scheduled-plan-run-x', id: 'run-scheduled' },
      ]);

      await runNow(true);

      expect(mockCancelScheduledRunsForPlan).toHaveBeenCalledWith(
        mockPlan.id,
        expect.anything(),
      );
      expect(mockRecordQueuedRun).toHaveBeenCalledOnce();
      expect(mockApplyStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ requestedStatus: 'QUEUED' }),
      );
      expect(mockRemoveScheduledRunJobs).toHaveBeenCalledWith([
        'scheduled-plan-run-x',
      ]);
      // The scheduled run is cancelled (and its job removed) before the new job is added.
      const [cancelOrder] =
        mockCancelScheduledRunsForPlan.mock.invocationCallOrder;
      const [addOrder] =
        mockEnqueuePlanRalphOrchestrator.mock.invocationCallOrder;
      expect(cancelOrder).toBeLessThan(addOrder ?? 0);
    });

    test('a plan with no scheduled run enqueues normally either way', async () => {
      planRunRepo.findOne.mockResolvedValue(null);

      await runNow(null);

      expect(mockCancelScheduledRunsForPlan).not.toHaveBeenCalled();
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledOnce();
    });
  });

  describe('enqueueOrchestrator', () => {
    test('rejects a missing/blank branch before touching the plan (fail fast)', async () => {
      await expect(
        service.enqueueOrchestrator({
          branch: '   ',
          mode: null,
          planId: mockPlan.id,
          priority: null,
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      // Fails at the input boundary — never looks up the plan or enqueues.
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('throws NotFoundException when plan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.enqueueOrchestrator({
          branch: 'feature/test',
          mode: null,
          planId: 'non-existent-id',
          priority: null,
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    describe('runnable-task guard', () => {
      const runNow = {
        branch: 'feature/test',
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      };

      test('rejects a whole-plan run with no runnable tasks before writing anything', async () => {
        taskRepo.count.mockResolvedValue(0);

        await expect(
          service.enqueueOrchestrator({
            ...runNow,
            mode: 'plan',
            taskId: null,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockRecordQueuedRun).not.toHaveBeenCalled();
        expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      });

      test('enqueueSpawn (Run now) is guarded the same way', async () => {
        taskRepo.count.mockResolvedValue(0);

        await expect(
          service.enqueueSpawn({
            branch: 'feature/test',
            planId: mockPlan.id,
            priority: null,
            workingDirectory: null,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      });

      test('proceeds with one runnable task', async () => {
        taskRepo.count.mockResolvedValue(1);

        await expect(
          service.enqueueOrchestrator({ ...runNow, mode: null, taskId: null }),
        ).resolves.toMatchObject({ jobId: 'job-orch-1' });
      });

      test('a task-targeted run is exempt: it is not counted and proceeds', async () => {
        taskRepo.count.mockResolvedValue(0);

        await expect(
          service.enqueueOrchestrator({
            ...runNow,
            mode: 'task',
            taskId: '5f2b6c0e-3a1d-4c55-9b0e-7d3c1a2b4e66',
          }),
        ).resolves.toMatchObject({ jobId: 'job-orch-1' });
      });
    });

    test('records an orchestrator run and delegates to QueuesService', async () => {
      const result = await service.enqueueOrchestrator({
        branch: 'feature/test',
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: null,
      });

      expect(result.executionBackend).toBe('cursor');
      expect(result.jobId).toBe('job-orch-1');
      const enqueueArg = mockEnqueuePlanRalphOrchestrator.mock.calls[0]?.[0];
      let idempotencyKey: string | undefined;
      if (
        isRecord(enqueueArg) &&
        typeof enqueueArg.idempotencyKey === 'string'
      ) {
        idempotencyKey = enqueueArg.idempotencyKey;
      }
      expect(idempotencyKey).toEqual(expect.any(String));
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith({
        idempotencyKey,
        jobData: {
          executionBackend: 'cursor',
          planId: mockPlan.id,
          // Server-side defaults: a worktree OpenThrottle names itself, plus verbose logging,
          // even though this caller sent no `ralph` input at all.
          ralph: { debug: 'verbose', worktree: 'plan-80864bba' },
          runKind: 'orchestrator',
        },
        priority: 10,
      });
      expect(mockRecordQueuedRun).toHaveBeenCalledWith(
        expect.objectContaining({
          bullmqJobId: idempotencyKey,
          planId: mockPlan.id,
          runKind: 'orchestrator',
        }),
        expect.anything(),
      );
      expect(mockAdd).not.toHaveBeenCalled();
    });

    test('records the injected worktree and verbose on the run config snapshot', async () => {
      await service.enqueueOrchestrator({
        branch: 'feature/test',
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: null,
      });

      const recorded = mockRecordQueuedRun.mock.calls[0]?.[0];
      expect(recorded).toMatchObject({
        runConfigSnapshot: {
          ralph: { debug: 'verbose', worktree: 'plan-80864bba' },
        },
      });
    });

    test('threads ralph.effort into job data and the run config snapshot', async () => {
      await service.enqueueOrchestrator({
        branch: 'feature/test',
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        ralph: { effort: 'extraHigh' },
        taskId: null,
        workingDirectory: null,
      });

      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          jobData: expect.objectContaining({
            ralph: expect.objectContaining({ effort: 'extraHigh' }),
          }),
        }),
      );
      expect(mockRecordQueuedRun.mock.calls[0]?.[0]).toMatchObject({
        runConfigSnapshot: { ralph: { effort: 'extraHigh' } },
      });
    });

    test('rejects an unknown ralph.effort as a BadRequest naming the accepted set', async () => {
      await expect(
        service.enqueueOrchestrator({
          branch: 'feature/test',
          idempotencyKey: null,
          mode: null,
          planId: mockPlan.id,
          priority: null,
          ralph: { effort: 'turbo' },
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toThrow(/ralph\.effort must be one of: .*ultra/);
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      expect(mockRecordQueuedRun).not.toHaveBeenCalled();
    });

    test('passes resolved task mode and taskId into job data', async () => {
      await service.enqueueOrchestrator({
        branch: 'feature/test',
        idempotencyKey: null,
        mode: 'task',
        planId: mockPlan.id,
        priority: null,
        taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
        workingDirectory: null,
      });

      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          jobData: expect.objectContaining({
            mode: 'task',
            runKind: 'orchestrator',
            taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
          }),
        }),
      );
    });

    test('routes the plans.status write through applyStatusChange with the request-principal actor', async () => {
      await service.enqueueOrchestrator({
        actorKind: 'user',
        actorSub: 'user-42',
        branch: 'feature/test',
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: null,
      });

      expect(mockApplyStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorKind: 'user',
          actorSub: 'user-42',
          captureFailureIsFatal: true,
          requestedStatus: 'QUEUED',
          throwOnForbiddenInProgress: false,
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(mockPlan);
    });

    test("captures a status_change for each task the QUEUED reset affects, with that task's own prior status as `from`", async () => {
      // ENQUEUE_TASK_STATUSES_TO_RESET spans six different current statuses; the two rows below
      // prove the ledgered `from` is each row's own status, not a shared guess.
      mockTaskSelectGetMany.mockResolvedValue([
        { id: 'task-a', status: 'PENDING' },
        { id: 'task-b', status: 'BLOCKED' },
      ]);

      await service.enqueueOrchestrator({
        actorKind: 'user',
        actorSub: 'user-42',
        branch: 'feature/test',
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: null,
      });

      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorKind: 'user',
          actorSub: 'user-42',
          entity: 'task',
          from: 'PENDING',
          taskId: 'task-a',
          to: 'QUEUED',
        }),
      );
      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorKind: 'user',
          actorSub: 'user-42',
          entity: 'task',
          from: 'BLOCKED',
          taskId: 'task-b',
          to: 'QUEUED',
        }),
      );
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledWith({
        planId: mockPlan.id,
        status: 'QUEUED',
        taskId: 'task-a',
      });
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledWith({
        planId: mockPlan.id,
        status: 'QUEUED',
        taskId: 'task-b',
      });
    });

    test('re-enqueues a BLOCKED plan: plan → QUEUED, its BLOCKED tasks → QUEUED, job added', async () => {
      // A run that could make no further progress ended the plan BLOCKED; nothing re-queues it
      // automatically, so this explicit enqueue is the only way back in.
      const blockedPlan = { ...mockPlan, status: 'BLOCKED' };
      repo.findOne.mockResolvedValue(blockedPlan);
      mockApplyStatusChange.mockResolvedValueOnce({
        applied: true,
        fromStatus: 'BLOCKED',
        toStatus: 'QUEUED',
      });
      mockTaskSelectGetMany.mockResolvedValue([
        { id: 'task-blocked', status: 'BLOCKED' },
      ]);

      const result = await service.enqueueOrchestrator({
        actorKind: 'user',
        actorSub: 'user-42',
        branch: 'feature/test',
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: null,
      });

      expect(mockApplyStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: blockedPlan,
          requestedStatus: 'QUEUED',
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(blockedPlan);
      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: 'task',
          from: 'BLOCKED',
          taskId: 'task-blocked',
          to: 'QUEUED',
        }),
      );
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ jobId: 'job-orch-1' }));
    });

    test('the QUEUED reset leaves COMPLETED and PROMOTED tasks alone', async () => {
      await service.enqueueOrchestrator({
        actorKind: 'user',
        actorSub: 'user-42',
        branch: 'feature/test',
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: null,
      });

      const statusFilter = mockTaskUpdateQueryBuilder.andWhere.mock.calls.find(
        ([clause]) => clause === 'task.status IN (:...fromStatuses)',
      );
      expect(statusFilter?.[1]).toEqual({
        fromStatuses: expect.not.arrayContaining(['COMPLETED']),
      });
      expect(statusFilter?.[1]).toEqual({
        fromStatuses: expect.not.arrayContaining(['PROMOTED']),
      });
    });

    test('a fatal task-status capture failure rolls back the enqueue transaction', async () => {
      mockTaskSelectGetMany.mockResolvedValue([
        { id: 'task-a', status: 'PENDING' },
      ]);
      mockRecordStatusChange.mockRejectedValueOnce(new Error('ledger down'));

      await expect(
        service.enqueueOrchestrator({
          branch: 'feature/test',
          idempotencyKey: null,
          mode: null,
          planId: mockPlan.id,
          priority: null,
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toThrow('ledger down');
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('a DB failure during the transaction rolls back and never enqueues', async () => {
      // repo.save is the plans.status write's persistence call now (via the applyStatusChange
      // chokepoint), in place of the old bare repo.update.
      repo.save.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.enqueueOrchestrator({
          branch: 'feature/test',
          idempotencyKey: null,
          mode: null,
          planId: mockPlan.id,
          priority: null,
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toThrow('db down');
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('throws BadRequestException when QueuesService returns an error', async () => {
      mockEnqueuePlanRalphOrchestrator.mockResolvedValueOnce({
        error: 'queue rejected',
      });

      await expect(
        service.enqueueOrchestrator({
          branch: 'feature/test',
          idempotencyKey: null,
          mode: null,
          planId: mockPlan.id,
          priority: null,
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
  describe('runner selection (OT Loop)', () => {
    let dir: string;
    const otLoopPlan = (
      runConfig: Record<string, unknown>,
    ): ReturnType<typeof createMock<Plan>> => {
      return createMock<Plan>({
        id: mockPlan.id,
        jobRunHooks: { hooks: [] },
        runConfig: asMock<Plan['runConfig']>({ version: 1, ...runConfig }),
        status: 'PENDING',
      });
    };
    const enqueue = (
      overrides: Record<string, unknown> = {},
    ): ReturnType<PlanEnqueueService['enqueueOrchestrator']> => {
      return service.enqueueOrchestrator({
        branch: 'feature/test',
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        taskId: null,
        workingDirectory: dir,
        ...overrides,
      });
    };
    const writeConfig = async (body: string): Promise<void> => {
      await mkdir(join(dir, '.openthrottle'), { recursive: true });
      await writeFile(join(dir, '.openthrottle', 'ot-loop.json'), body);
    };
    const enqueuedJobData = (): unknown => {
      return mockEnqueuePlanRalphOrchestrator.mock.calls[0]?.[0]?.jobData;
    };

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'ot-loop-enqueue-'));
    });

    afterEach(async () => {
      await rm(dir, { force: true, recursive: true });
    });

    test('enqueues under the one job name with runner ot-loop and records it on the snapshot', async () => {
      await writeConfig(
        JSON.stringify({ validation: { commands: ['pnpm test'] } }),
      );

      await enqueue({ runner: 'ot-loop' });

      expect(enqueuedJobData()).toMatchObject({
        runKind: 'orchestrator',
        runner: 'ot-loop',
      });
      expect(mockRecordQueuedRun.mock.calls[0]?.[0]).toMatchObject({
        runConfigSnapshot: { runner: 'ot-loop' },
      });
    });

    test('carries the plan otLoop tuning onto the job and the snapshot', async () => {
      const otLoop = {
        maxRetries: 1,
        validationCommands: ['pnpm nx run x:test'],
      };
      repo.findOne.mockResolvedValue(otLoopPlan({ otLoop, runner: 'ot-loop' }));

      await enqueue();

      expect(enqueuedJobData()).toMatchObject({ otLoop, runner: 'ot-loop' });
      expect(mockRecordQueuedRun.mock.calls[0]?.[0]).toMatchObject({
        runConfigSnapshot: { otLoop, runner: 'ot-loop' },
      });
    });

    test('takes the runner from the stored plan config when the request names none', async () => {
      await writeConfig(
        JSON.stringify({ validation: { commands: ['pnpm test'] } }),
      );
      repo.findOne.mockResolvedValue(otLoopPlan({ runner: 'ot-loop' }));

      await enqueue();

      expect(enqueuedJobData()).toMatchObject({ runner: 'ot-loop' });
    });

    test('a request for ralph overrides a stored ot-loop and skips every OT Loop check', async () => {
      repo.findOne.mockResolvedValue(otLoopPlan({ runner: 'ot-loop' }));

      await enqueue({ ralph: { disableWorktree: true }, runner: 'ralph' });

      expect(enqueuedJobData()).toMatchObject({ runner: 'ralph' });
    });

    test('leaves the payload untouched (Ralph, no runner key) when neither the request nor the plan names one', async () => {
      await enqueue();

      expect(enqueuedJobData()).not.toHaveProperty('runner');
      expect(enqueuedJobData()).not.toHaveProperty('otLoop');
    });

    test('ignores a stored otLoop block on a Ralph run', async () => {
      repo.findOne.mockResolvedValue(
        otLoopPlan({ otLoop: { maxRetries: 3 }, runner: 'ralph' }),
      );

      await enqueue();

      expect(enqueuedJobData()).not.toHaveProperty('otLoop');
    });

    test('rejects an unknown runner as a BadRequest naming the accepted set, enqueuing nothing', async () => {
      await expect(enqueue({ runner: 'turbo' })).rejects.toThrow(
        /Invalid runner: turbo \(expected one of: ralph, ot-loop\)/,
      );
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      expect(mockRecordQueuedRun).not.toHaveBeenCalled();
    });

    test('rejects an OT Loop run that opted out of a worktree, before recording anything', async () => {
      await writeConfig(
        JSON.stringify({ validation: { commands: ['pnpm test'] } }),
      );

      await expect(
        enqueue({ ralph: { disableWorktree: true }, runner: 'ot-loop' }),
      ).rejects.toThrow(/OT Loop needs a worktree/);
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      expect(mockRecordQueuedRun).not.toHaveBeenCalled();
    });

    test('rejects an OT Loop run when no validation command resolves, with the documented message', async () => {
      await expect(enqueue({ runner: 'ot-loop' })).rejects.toThrow(
        'OT Loop needs a validation command: set otLoop.validationCommands on the plan or add .openthrottle/ot-loop.json',
      );
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      expect(mockRecordQueuedRun).not.toHaveBeenCalled();
    });

    test('rejects an OT Loop run whose committed config is invalid, naming the problem', async () => {
      await writeConfig('{ not json');

      await expect(enqueue({ runner: 'ot-loop' })).rejects.toThrow(
        /\.openthrottle\/ot-loop\.json is invalid/,
      );
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('accepts the Nx default when the checkout has an nx.json', async () => {
      await writeFile(join(dir, 'nx.json'), '{}');

      await enqueue({ runner: 'ot-loop' });

      expect(enqueuedJobData()).toMatchObject({ runner: 'ot-loop' });
    });

    test('accepts a validation override on the plan with no repo config', async () => {
      repo.findOne.mockResolvedValue(
        otLoopPlan({
          otLoop: { validationCommands: ['make check'] },
          runner: 'ot-loop',
        }),
      );

      await enqueue();

      expect(enqueuedJobData()).toMatchObject({ runner: 'ot-loop' });
    });

    test('enqueueSpawn (the enqueuePlanRun mutation) forwards the runner', async () => {
      await writeConfig(
        JSON.stringify({ validation: { commands: ['pnpm test'] } }),
      );

      await service.enqueueSpawn({
        branch: 'feature/test',
        planId: mockPlan.id,
        runner: 'ot-loop',
        workingDirectory: dir,
      });

      expect(enqueuedJobData()).toMatchObject({ runner: 'ot-loop' });
    });

    test('schedulePlanRun applies the same runner and the same rejections', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-01T12:00:00.000Z'));
      mockRecordQueuedRun.mockResolvedValue({ id: 'run-scheduled-1' });

      try {
        await expect(
          service.schedulePlanRun({
            branch: 'feature/test',
            planId: mockPlan.id,
            runner: 'ot-loop',
            scheduledFor: new Date('2026-11-01T14:00:00.000Z'),
            workingDirectory: dir,
          }),
        ).rejects.toThrow(/OT Loop needs a validation command/);

        await writeConfig(
          JSON.stringify({ validation: { commands: ['pnpm test'] } }),
        );
        await service.schedulePlanRun({
          branch: 'feature/test',
          planId: mockPlan.id,
          runner: 'ot-loop',
          scheduledFor: new Date('2026-11-01T14:00:00.000Z'),
          workingDirectory: dir,
        });

        expect(enqueuedJobData()).toMatchObject({ runner: 'ot-loop' });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('enqueueUsageLimitResume', () => {
    const limitedRun = createMock<PlanRun>({
      actorUserId: 'user-1',
      branch: 'feature/limited',
      checkoutId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      executionBackend: 'claude',
      id: '11111111-1111-4111-8111-111111111111',
      model: 'claude-fable-5',
      planId: mockPlan.id,
      runConfigSnapshot: null,
    });
    const jobData: RunPlanOrchestratorJobData = {
      executionBackend: 'claude',
      mode: 'plan',
      planId: mockPlan.id,
      runKind: 'orchestrator',
    };
    const actor = {
      actorKind: 'service_account',
      actorSub: 'status-change-system-account-id',
    };

    test('records a QUEUED continuation row linked to the limited run, then adds a delayed job under a deterministic jobId', async () => {
      const result = await service.enqueueUsageLimitResume({
        ...actor,
        delayMs: 3_660_000,
        jobData,
        limitedRun,
      });

      expect(mockRecordQueuedRun).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'user-1',
          branch: 'feature/limited',
          bullmqJobId: `usage-limit-resume-11111111-1111-4111-8111-111111111111`,
          checkoutId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          executionBackend: 'claude',
          model: 'claude-fable-5',
          planId: mockPlan.id,
          resumeOfRunId: '11111111-1111-4111-8111-111111111111',
          runKind: 'orchestrator',
        }),
        expect.anything(),
      );
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          delayMs: 3_660_000,
          idempotencyKey: `usage-limit-resume-11111111-1111-4111-8111-111111111111`,
          jobData,
        }),
      );
      expect(result).toEqual({ jobId: 'job-orch-1' });
    });

    test('sets the plan QUEUED through the status chokepoint, attributed to the given actor', async () => {
      await service.enqueueUsageLimitResume({
        ...actor,
        delayMs: 60_000,
        jobData,
        limitedRun,
      });

      expect(mockApplyStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...actor,
          requestedStatus: 'QUEUED',
        }),
      );
    });

    test('re-queues only PENDING and IN_PROGRESS tasks, leaving BLOCKED/SKIPPED/CANCELED alone', async () => {
      await service.enqueueUsageLimitResume({
        ...actor,
        delayMs: 60_000,
        jobData,
        limitedRun,
      });

      expect(mockTaskUpdateQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fromStatuses: ['PENDING', 'IN_PROGRESS'] }),
      );
    });

    test('throws when the queue add fails so the caller can fall back to parking the plan', async () => {
      mockEnqueuePlanRalphOrchestrator.mockResolvedValueOnce({
        error: 'queue rejected',
      });

      await expect(
        service.enqueueUsageLimitResume({
          ...actor,
          delayMs: 60_000,
          jobData,
          limitedRun,
        }),
      ).rejects.toThrow('queue rejected');
    });
  });

  describe('schedulePlanRun', () => {
    // A fixed clock: every delay and horizon assertion below is exact, never "roughly".
    const NOW = new Date('2026-11-01T12:00:00.000Z');
    const HOUR_MS = 60 * 60 * 1_000;
    const DAY_MS = 24 * HOUR_MS;
    const baseParams = {
      actorKind: 'user',
      actorSub: 'user-1',
      actorUserId: 'user-1',
      branch: 'feature/scheduled',
      planId: mockPlan.id,
    };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      mockRecordQueuedRun.mockResolvedValue({ id: 'run-scheduled-1' });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('scheduledFor validation', () => {
      test('rejects an instant in the past before touching anything', async () => {
        await expect(
          service.schedulePlanRun({
            ...baseParams,
            scheduledFor: new Date(NOW.getTime() - 1_000),
          }),
        ).rejects.toThrow('scheduledFor must be in the future');

        expect(mockRecordQueuedRun).not.toHaveBeenCalled();
        expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      });

      test('rejects "now" (not strictly in the future)', async () => {
        await expect(
          service.schedulePlanRun({ ...baseParams, scheduledFor: NOW }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      test('rejects an invalid date', async () => {
        await expect(
          service.schedulePlanRun({
            ...baseParams,
            scheduledFor: new Date('not a date'),
          }),
        ).rejects.toThrow('scheduledFor must be a valid date-time');
      });

      test('rejects an instant beyond the 30-day horizon, naming the cap constant', async () => {
        const beyond = new Date(NOW.getTime() + 30 * DAY_MS + 1);

        await expect(
          service.schedulePlanRun({ ...baseParams, scheduledFor: beyond }),
        ).rejects.toThrow(
          /within 30 days from now \(SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS/,
        );

        expect(mockRecordQueuedRun).not.toHaveBeenCalled();
        expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      });

      test('accepts exactly the 30-day horizon', async () => {
        await service.schedulePlanRun({
          ...baseParams,
          scheduledFor: new Date(NOW.getTime() + 30 * DAY_MS),
        });

        expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
          expect.objectContaining({ delayMs: 30 * DAY_MS }),
        );
      });

      test('rejects a blank branch like every other enqueue', async () => {
        await expect(
          service.schedulePlanRun({
            ...baseParams,
            branch: '  ',
            scheduledFor: new Date(NOW.getTime() + HOUR_MS),
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      test('rejects an idempotency key that makes the prefixed job id too long', async () => {
        await expect(
          service.schedulePlanRun({
            ...baseParams,
            idempotencyKey: 'k'.repeat(120),
            scheduledFor: new Date(NOW.getTime() + HOUR_MS),
          }),
        ).rejects.toThrow('at most 128 characters');

        // Rejected BEFORE the commit: no SCHEDULED row is stranded without a job.
        expect(mockRecordQueuedRun).not.toHaveBeenCalled();
      });
    });

    describe('runnable-task guard', () => {
      test('rejects with BadRequestException when the plan has no runnable tasks, writing nothing', async () => {
        taskRepo.count.mockResolvedValue(0);

        await expect(
          service.schedulePlanRun({
            ...baseParams,
            scheduledFor: new Date(NOW.getTime() + HOUR_MS),
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockRecordQueuedRun).not.toHaveBeenCalled();
        expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      });

      test('schedules with one runnable task', async () => {
        taskRepo.count.mockResolvedValue(1);

        await expect(
          service.schedulePlanRun({
            ...baseParams,
            scheduledFor: new Date(NOW.getTime() + HOUR_MS),
          }),
        ).resolves.toMatchObject({ planRunId: 'run-scheduled-1' });
      });
    });

    test('records a SCHEDULED row with scheduled_for and a frozen runConfigSnapshot', async () => {
      const scheduledFor = new Date(NOW.getTime() + 2 * HOUR_MS);

      await service.schedulePlanRun({
        ...baseParams,
        ralph: { iterations: 7, model: 'claude-fable-5' },
        scheduledFor,
      });

      expect(mockRecordQueuedRun).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'user-1',
          branch: 'feature/scheduled',
          bullmqJobId: `scheduled-plan-run-${mockPlan.id}-${scheduledFor.getTime()}`,
          model: 'claude-fable-5',
          planId: mockPlan.id,
          runConfigSnapshot: expect.objectContaining({
            ralph: expect.objectContaining({
              iterations: 7,
              model: 'claude-fable-5',
            }),
          }),
          runKind: 'orchestrator',
          scheduledFor,
          status: 'SCHEDULED',
        }),
        expect.anything(),
      );
    });

    test('adds a delayed job with the exact delay and the same deterministic jobId', async () => {
      const scheduledFor = new Date(NOW.getTime() + 90 * 60 * 1_000);

      const result = await service.schedulePlanRun({
        ...baseParams,
        priority: 5,
        scheduledFor,
      });

      const jobId = `scheduled-plan-run-${mockPlan.id}-${scheduledFor.getTime()}`;
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith({
        delayMs: 90 * 60 * 1_000,
        idempotencyKey: jobId,
        jobData: expect.objectContaining({
          planId: mockPlan.id,
          runKind: 'orchestrator',
        }),
        priority: 5,
      });
      expect(mockRecordQueuedRun).toHaveBeenCalledWith(
        expect.objectContaining({ bullmqJobId: jobId }),
        expect.anything(),
      );
      expect(result).toEqual({
        executionBackend: 'cursor',
        jobId: 'job-orch-1',
        planId: mockPlan.id,
        planRunId: 'run-scheduled-1',
        scheduledFor,
      });
      // A scheduled run has no queue position: it is not waiting, it is delayed.
      expect(mockEmitPlanEnqueued).not.toHaveBeenCalled();
    });

    test('uses the client idempotency key (prefixed) as the jobId', async () => {
      await service.schedulePlanRun({
        ...baseParams,
        idempotencyKey: 'nightly-1',
        scheduledFor: new Date(NOW.getTime() + HOUR_MS),
      });

      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'scheduled-plan-run-nightly-1',
        }),
      );
    });

    test('moves a PENDING plan to SCHEDULED and leaves its tasks exactly as they are', async () => {
      // Plan/task QUEUED happens at fire time; scheduling only marks the plan SCHEDULED (D1).
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'PENDING' });
      mockTaskSelectGetMany.mockResolvedValue([
        { id: 'task-pending', status: 'PENDING' },
      ]);

      await service.schedulePlanRun({
        ...baseParams,
        scheduledFor: new Date(NOW.getTime() + HOUR_MS),
      });

      expect(mockRecordQueuedRun).toHaveBeenCalledOnce();
      expect(mockApplyStatusChange).toHaveBeenCalledOnce();
      expect(mockApplyStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ requestedStatus: 'SCHEDULED' }),
      );
      expect(repo.save).toHaveBeenCalledOnce();
      expect(mockTaskUpdateQueryBuilder.set).not.toHaveBeenCalled();
      expect(mockEmitTaskStatusChanged).not.toHaveBeenCalled();
    });

    test('schedules a BACKLOG plan', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'BACKLOG' });

      await service.schedulePlanRun({
        ...baseParams,
        scheduledFor: new Date(NOW.getTime() + HOUR_MS),
      });

      expect(mockRecordQueuedRun).toHaveBeenCalledOnce();
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledOnce();
    });

    describe.each([
      ['QUEUED', 'PLAN_ACTIVE'],
      ['IN_PROGRESS', 'PLAN_ACTIVE'],
      ['BLOCKED', 'PLAN_NOT_SCHEDULABLE'],
      ['COMPLETED', 'PLAN_NOT_SCHEDULABLE'],
      ['CANCELED', 'PLAN_NOT_SCHEDULABLE'],
      ['SKIPPED', 'PLAN_NOT_SCHEDULABLE'],
      ['PROMOTED', 'PLAN_NOT_SCHEDULABLE'],
      ['SCHEDULED', 'PLAN_ALREADY_SCHEDULED'],
    ])('a %s plan (D2)', (status, code) => {
      test(`is rejected with ${code} and writes nothing`, async () => {
        repo.findOne.mockResolvedValue({ ...mockPlan, status });
        const existingScheduledFor = new Date(NOW.getTime() + 2 * HOUR_MS);
        planRunRepo.findOne.mockResolvedValue(
          status === 'SCHEDULED'
            ? { id: 'run-existing', scheduledFor: existingScheduledFor }
            : null,
        );

        const error: unknown = await service
          .schedulePlanRun({
            ...baseParams,
            scheduledFor: new Date(NOW.getTime() + HOUR_MS),
          })
          .catch((thrown: unknown) => thrown);

        expect(error).toBeInstanceOf(GraphQLError);
        if (!(error instanceof GraphQLError)) return;
        expect(error.extensions).toMatchObject({
          code,
          planRunId: status === 'SCHEDULED' ? 'run-existing' : null,
          scheduledFor:
            status === 'SCHEDULED' ? existingScheduledFor.toISOString() : null,
        });
        expect(mockRecordQueuedRun).not.toHaveBeenCalled();
        expect(mockApplyStatusChange).not.toHaveBeenCalled();
        expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
      });
    });

    describe('replaceScheduled (D5)', () => {
      const OLD_FOR = new Date(NOW.getTime() + 2 * HOUR_MS);

      beforeEach(() => {
        repo.findOne.mockResolvedValue({ ...mockPlan, status: 'SCHEDULED' });
        planRunRepo.findOne.mockResolvedValue({
          id: 'run-old',
          scheduledFor: OLD_FOR,
        });
      });

      test('without it, a second schedule is PLAN_ALREADY_SCHEDULED naming the existing run', async () => {
        const extensions = await expectScheduleConflict(
          service.schedulePlanRun({
            ...baseParams,
            scheduledFor: new Date(NOW.getTime() + HOUR_MS),
          }),
        );

        expect(extensions).toMatchObject({
          code: 'PLAN_ALREADY_SCHEDULED',
          planRunId: 'run-old',
          scheduledFor: OLD_FOR.toISOString(),
        });
        expect(mockRecordQueuedRun).not.toHaveBeenCalled();
      });

      test('with it, cancels the old run and records the new one in one transaction; the plan stays SCHEDULED', async () => {
        mockCancelScheduledRunsForPlan.mockResolvedValue([
          { bullmqJobId: 'scheduled-plan-run-old', id: 'run-old' },
        ]);
        repo.manager.transaction.mockClear();

        const result = await service.schedulePlanRun({
          ...baseParams,
          replaceScheduled: true,
          scheduledFor: new Date(NOW.getTime() + HOUR_MS),
        });

        expect(result.planRunId).toBe('run-scheduled-1');
        expect(repo.manager.transaction).toHaveBeenCalledOnce();
        expect(mockCancelScheduledRunsForPlan).toHaveBeenCalledWith(
          mockPlan.id,
          expect.anything(),
        );
        expect(mockRecordQueuedRun).toHaveBeenCalledOnce();
        expect(mockApplyStatusChange).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ requestedStatus: 'SCHEDULED' }),
        );
        expect(mockRemoveScheduledRunJobs).toHaveBeenCalledWith([
          'scheduled-plan-run-old',
        ]);
        expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledOnce();
      });
    });

    test('maps a one-scheduled-run index violation (the race path) to PLAN_ALREADY_SCHEDULED', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'PENDING' });
      mockRecordQueuedRun.mockRejectedValueOnce(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), {
            code: '23505',
            constraint: 'plan_runs_one_scheduled_per_plan_idx',
          }),
        ),
      );

      const extensions = await expectScheduleConflict(
        service.schedulePlanRun({
          ...baseParams,
          scheduledFor: new Date(NOW.getTime() + HOUR_MS),
        }),
      );

      expect(extensions).toMatchObject({ code: 'PLAN_ALREADY_SCHEDULED' });
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('is idempotent: an existing SCHEDULED run for the same job id is returned unchanged', async () => {
      const scheduledFor = new Date(NOW.getTime() + HOUR_MS);
      mockFindByQueueNameAndBullmqJobId.mockResolvedValue({
        executionBackend: 'claude',
        id: 'run-existing',
        scheduledFor,
        status: 'SCHEDULED',
      });

      const result = await service.schedulePlanRun({
        ...baseParams,
        idempotencyKey: 'dup',
        scheduledFor,
      });

      expect(result).toEqual({
        executionBackend: 'claude',
        jobId: 'scheduled-plan-run-dup',
        planId: mockPlan.id,
        planRunId: 'run-existing',
        scheduledFor,
      });
      expect(mockRecordQueuedRun).not.toHaveBeenCalled();
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('reschedules over a settled run with the same job id (cancel, then schedule again)', async () => {
      mockFindByQueueNameAndBullmqJobId.mockResolvedValue({
        executionBackend: 'cursor',
        id: 'run-cancelled',
        scheduledFor: new Date(NOW.getTime() + HOUR_MS),
        status: 'CANCELLED',
      });

      await service.schedulePlanRun({
        ...baseParams,
        scheduledFor: new Date(NOW.getTime() + HOUR_MS),
      });

      expect(mockRecordQueuedRun).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SCHEDULED' }),
        expect.anything(),
      );
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledOnce();
    });

    test('throws NotFoundException when the plan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.schedulePlanRun({
          ...baseParams,
          scheduledFor: new Date(NOW.getTime() + HOUR_MS),
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('surfaces a queue add failure as a BadRequestException', async () => {
      mockEnqueuePlanRalphOrchestrator.mockResolvedValueOnce({
        error: 'queue rejected',
      });

      await expect(
        service.schedulePlanRun({
          ...baseParams,
          scheduledFor: new Date(NOW.getTime() + HOUR_MS),
        }),
      ).rejects.toThrow('queue rejected');
    });
  });

  describe('fireScheduledRun', () => {
    // A fixed clock; the run is due exactly now unless a test says otherwise.
    const NOW = new Date('2026-11-01T12:00:00.000Z');
    const HOUR_MS = 60 * 60 * 1_000;
    const actor = {
      actorKind: 'service_account',
      actorSub: 'status-change-system-account-id',
    };
    const scheduledRun = (overrides: Partial<PlanRun> = {}): PlanRun => {
      return createMock<PlanRun>({
        id: 'run-scheduled',
        planId: mockPlan.id,
        scheduledFor: NOW,
        status: 'SCHEDULED',
        ...overrides,
      });
    };
    const fire = (
      now: Date = NOW,
      workspaceError: string | null = null,
    ): ReturnType<PlanEnqueueService['fireScheduledRun']> => {
      return service.fireScheduledRun({
        ...actor,
        now,
        planId: mockPlan.id,
        planRunId: 'run-scheduled',
        workspaceError,
      });
    };
    const expectNoPlanOrTaskWrites = (): void => {
      expect(mockApplyStatusChange).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
      expect(mockTaskUpdateQueryBuilder.set).not.toHaveBeenCalled();
      expect(mockEmitTaskStatusChanged).not.toHaveBeenCalled();
    };
    /** Every non-fire settle returns a SCHEDULED plan to PENDING (D4), as a background writer. */
    const expectPlanReleased = (): void => {
      expect(mockReleaseScheduledPlan).toHaveBeenCalledWith(expect.anything(), {
        ...actor,
        captureFailureIsFatal: false,
        planId: mockPlan.id,
      });
    };

    beforeEach(() => {
      planRunRepo.findOne.mockResolvedValue(scheduledRun());
    });

    test('fires: claims the row QUEUED, then flips the plan and its tasks QUEUED through the shared enqueue writes', async () => {
      mockTaskSelectGetMany.mockResolvedValue([
        { id: 'task-a', status: 'PENDING' },
      ]);

      const outcome = await fire();

      expect(outcome).toEqual({ kind: 'fire' });
      expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
        'run-scheduled',
        'QUEUED',
        expect.anything(),
        undefined,
      );
      expect(mockApplyStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...actor,
          // A background writer: a ledger hiccup must not fail the fire.
          captureFailureIsFatal: false,
          requestedStatus: 'QUEUED',
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(mockPlan);
      // Same task reset as an immediate enqueue (ENQUEUE_TASK_STATUSES_TO_RESET).
      expect(mockTaskUpdateQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status IN (:...fromStatuses)',
        {
          fromStatuses: [
            'PENDING',
            'IN_PROGRESS',
            'BLOCKED',
            'BACKLOG',
            'SKIPPED',
            'CANCELED',
          ],
        },
      );
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledWith({
        planId: mockPlan.id,
        status: 'QUEUED',
        taskId: 'task-a',
      });
      expect(mockReleaseScheduledPlan).not.toHaveBeenCalled();
      // The claim is the race point: the plan/task writes happen only after it won.
      const [claimOrder] = mockTransitionScheduledRun.mock.invocationCallOrder;
      const [planWriteOrder] = mockApplyStatusChange.mock.invocationCallOrder;
      expect(claimOrder).toBeLessThan(planWriteOrder ?? 0);
    });

    test('locks the plan row, so two scheduled runs of one plan firing at once serialize', async () => {
      await fire();

      expect(repo.findOne).toHaveBeenCalledWith({
        lock: { mode: 'pessimistic_write' },
        where: { id: mockPlan.id },
      });
    });

    test('fires a run that is late but inside the grace window', async () => {
      expect(await fire(new Date(NOW.getTime() + HOUR_MS - 1))).toEqual({
        kind: 'fire',
      });
    });

    test('MISSED: a run an hour or more late is settled MISSED with no plan or task write', async () => {
      const outcome = await fire(new Date(NOW.getTime() + HOUR_MS));

      expect(outcome.kind).toBe('missed');
      expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
        'run-scheduled',
        'MISSED',
        expect.anything(),
        expect.any(String),
      );
      expectNoPlanOrTaskWrites();
      expectPlanReleased();
    });

    test('SUPERSEDED: another active run on the plan holds the scheduled run, with no plan or task write', async () => {
      mockHasActiveRun.mockResolvedValue(true);

      const outcome = await fire();

      expect(outcome.kind).toBe('superseded');
      // The firing row itself is excluded from "active", inside the same transaction.
      expect(mockHasActiveRun).toHaveBeenCalledWith(
        mockPlan.id,
        'run-scheduled',
        expect.anything(),
      );
      expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
        'run-scheduled',
        'SUPERSEDED',
        expect.anything(),
        expect.any(String),
      );
      expectNoPlanOrTaskWrites();
      expectPlanReleased();
    });

    test('a run both late and colliding reports MISSED (lateness takes precedence)', async () => {
      mockHasActiveRun.mockResolvedValue(true);

      const outcome = await fire(new Date(NOW.getTime() + 2 * HOUR_MS));

      expect(outcome.kind).toBe('missed');
      expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
        'run-scheduled',
        'MISSED',
        expect.anything(),
        expect.any(String),
      );
    });

    test('a COMPLETED plan with no runnable tasks: the run settles SKIPPED with its reason; the release is guarded on SCHEDULED, so the plan stays COMPLETED', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'COMPLETED' });
      taskRepo.count.mockResolvedValue(0);

      const outcome = await fire();

      expect(outcome.kind).toBe('nothing_to_run');
      expect(taskRepo.count).toHaveBeenCalledWith({
        where: {
          planId: mockPlan.id,
          status: In([
            'PENDING',
            'IN_PROGRESS',
            'BLOCKED',
            'BACKLOG',
            'SKIPPED',
            'CANCELED',
            'QUEUED',
          ]),
        },
      });
      expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
        'run-scheduled',
        'SKIPPED',
        expect.anything(),
        expect.stringMatching(/\S/),
      );
      expectNoPlanOrTaskWrites();
      expectPlanReleased();
    });

    test('a SKIPPED settle re-runs the plan auto-close, after the transaction; other outcomes do not', async () => {
      mockReconcileAfterScheduledRunSettled.mockClear();
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'PENDING' });
      taskRepo.count.mockResolvedValue(0);

      await fire();

      expect(mockReconcileAfterScheduledRunSettled).toHaveBeenCalledWith(
        mockPlan.id,
        actor,
      );

      mockReconcileAfterScheduledRunSettled.mockClear();
      taskRepo.count.mockResolvedValue(2);

      await fire();

      expect(mockReconcileAfterScheduledRunSettled).not.toHaveBeenCalled();
    });

    test('a missing workspace settles the run FAILED with no plan or task write', async () => {
      taskRepo.count.mockResolvedValue(2);

      const outcome = await fire(
        NOW,
        'workingDirectory does not exist: /gone/worktree',
      );

      expect(outcome).toEqual({
        kind: 'workspace_missing',
        reason: 'workingDirectory does not exist: /gone/worktree',
      });
      expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
        'run-scheduled',
        'FAILED',
        expect.anything(),
        'workingDirectory does not exist: /gone/worktree',
      );
      expectNoPlanOrTaskWrites();
    });

    test('a COMPLETED plan that still has runnable tasks fires like "Run now": the plan goes QUEUED', async () => {
      const completedPlan = { ...mockPlan, status: 'COMPLETED' };
      repo.findOne.mockResolvedValue(completedPlan);
      taskRepo.count.mockResolvedValue(2);

      const outcome = await fire();

      expect(outcome).toEqual({ kind: 'fire' });
      expect(mockApplyStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: completedPlan,
          requestedStatus: 'QUEUED',
        }),
      );
    });

    test('cancel won the race: the conditional SCHEDULED update matches nothing, so nothing else is written', async () => {
      mockTransitionScheduledRun.mockResolvedValue(false);

      const outcome = await fire();

      expect(outcome).toEqual({ kind: 'not_scheduled' });
      expectNoPlanOrTaskWrites();
      expect(mockReleaseScheduledPlan).not.toHaveBeenCalled();
    });

    test('a row that is no longer SCHEDULED is left alone (no transition attempted)', async () => {
      planRunRepo.findOne.mockResolvedValue(
        scheduledRun({ status: 'CANCELLED' }),
      );

      const outcome = await fire();

      expect(outcome).toEqual({ kind: 'not_scheduled' });
      expect(mockTransitionScheduledRun).not.toHaveBeenCalled();
      expectNoPlanOrTaskWrites();
    });

    test('a plan that no longer exists is left alone', async () => {
      repo.findOne.mockResolvedValue(null);

      const outcome = await fire();

      expect(outcome).toEqual({ kind: 'not_scheduled' });
      expect(mockTransitionScheduledRun).not.toHaveBeenCalled();
    });
  });

  describe('reschedulePlanRun', () => {
    const NOW = new Date('2026-11-01T12:00:00.000Z');
    const LATER = new Date('2026-11-02T09:00:00.000Z');
    const DELAY_MS = LATER.getTime() - NOW.getTime();
    const scheduledRun = (overrides: Partial<PlanRun> = {}): PlanRun => {
      return createMock<PlanRun>({
        bullmqJobId: 'scheduled-plan-run-x',
        executionBackend: 'claude',
        id: 'run-scheduled',
        planId: mockPlan.id,
        scheduledFor: new Date('2026-11-01T18:00:00.000Z'),
        status: 'SCHEDULED',
        ...overrides,
      });
    };
    const reschedule = (
      scheduledFor: Date = LATER,
    ): ReturnType<PlanEnqueueService['reschedulePlanRun']> => {
      return service.reschedulePlanRun({
        planId: mockPlan.id,
        planRunId: 'run-scheduled',
        scheduledFor,
      });
    };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      mockFindRunById.mockReset();
      mockGetJob.mockReset();
      mockRescheduleScheduledRun.mockReset().mockResolvedValue(true);
      mockEnqueuePlanRalphOrchestrator.mockClear();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('re-delays the job first, then moves the row under the SCHEDULED guard', async () => {
      const changeDelay = vi.fn().mockResolvedValue(undefined);
      mockFindRunById.mockResolvedValue(scheduledRun());
      mockGetJob.mockResolvedValue({
        changeDelay,
        getState: vi.fn().mockResolvedValue('delayed'),
      });

      const outcome = await reschedule();

      expect(changeDelay).toHaveBeenCalledWith(DELAY_MS);
      expect(mockRescheduleScheduledRun).toHaveBeenCalledWith(
        'run-scheduled',
        LATER,
      );
      const [delayOrder] = changeDelay.mock.invocationCallOrder;
      const [rowOrder] = mockRescheduleScheduledRun.mock.invocationCallOrder;
      expect(delayOrder).toBeLessThan(rowOrder ?? 0);
      expect(outcome).toEqual({
        executionBackend: 'claude',
        jobId: 'scheduled-plan-run-x',
        planId: mockPlan.id,
        planRunId: 'run-scheduled',
        scheduledFor: LATER,
      });
    });

    test('recreates a job lost from Redis with the new delay', async () => {
      const jobData = buildRunPlanOrchestratorJobData({
        mode: null,
        planId: mockPlan.id,
        ralph: { backend: 'claude', iterations: 4 },
        taskId: null,
        workingDirectory: null,
      });
      mockFindRunById.mockResolvedValue(
        scheduledRun({
          runConfigSnapshot: buildPlanRunConfigSnapshotFromJobData(jobData),
        }),
      );
      mockGetJob.mockResolvedValue(undefined);
      mockEnqueuePlanRalphOrchestrator.mockResolvedValueOnce({
        jobId: 'scheduled-plan-run-x',
      });

      await reschedule();

      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          delayMs: DELAY_MS,
          idempotencyKey: 'scheduled-plan-run-x',
        }),
      );
      expect(mockRescheduleScheduledRun).toHaveBeenCalledTimes(1);
    });

    test('rejects a job a worker already took, without moving the row', async () => {
      const changeDelay = vi.fn();
      mockFindRunById.mockResolvedValue(scheduledRun());
      mockGetJob.mockResolvedValue({
        changeDelay,
        getState: vi.fn().mockResolvedValue('active'),
      });

      await expect(reschedule()).rejects.toThrow(/already starting/);
      expect(changeDelay).not.toHaveBeenCalled();
      expect(mockRescheduleScheduledRun).not.toHaveBeenCalled();
    });

    test.each(['QUEUED', 'IN_PROGRESS', 'CANCELLED', 'MISSED'])(
      'rejects a %s run',
      async (status) => {
        mockFindRunById.mockResolvedValue(scheduledRun({ status }));

        await expect(reschedule()).rejects.toThrow(/not SCHEDULED/);
        expect(mockGetJob).not.toHaveBeenCalled();
      },
    );

    test('rejects a run of another plan', async () => {
      mockFindRunById.mockResolvedValue(scheduledRun({ planId: 'other' }));

      await expect(reschedule()).rejects.toThrow(/not found/);
    });

    test('applies the scheduling rule to the new instant (past, beyond the horizon)', async () => {
      await expect(reschedule(new Date(NOW.getTime() - 1))).rejects.toThrow(
        /in the future/,
      );
      await expect(
        reschedule(new Date(NOW.getTime() + 31 * 24 * 60 * 60 * 1_000)),
      ).rejects.toThrow(/within 30 days/);
      expect(mockFindRunById).not.toHaveBeenCalled();
    });

    test('reports a run cancelled while it was being rescheduled', async () => {
      mockFindRunById.mockResolvedValue(scheduledRun());
      mockGetJob.mockResolvedValue({
        changeDelay: vi.fn().mockResolvedValue(undefined),
        getState: vi.fn().mockResolvedValue('delayed'),
      });
      mockRescheduleScheduledRun.mockResolvedValue(false);

      await expect(reschedule()).rejects.toThrow(/cancelled or started/);
    });
  });

  describe('reprojectScheduledRun', () => {
    const jobData = buildRunPlanOrchestratorJobData({
      mode: null,
      planId: mockPlan.id,
      ralph: { backend: 'claude', iterations: 4 },
      taskId: null,
      workingDirectory: null,
    });
    const run = createMock<PlanRun>({
      bullmqJobId: 'scheduled-plan-run-nightly',
      id: 'run-scheduled',
      planId: mockPlan.id,
      runConfigSnapshot: buildPlanRunConfigSnapshotFromJobData(jobData),
      status: 'SCHEDULED',
    });

    test('re-adds the delayed job under the run own job id, with the payload rebuilt from the frozen snapshot', async () => {
      mockEnqueuePlanRalphOrchestrator.mockResolvedValueOnce({
        jobId: 'scheduled-plan-run-nightly',
      });
      const transactionsBefore = repo.manager.transaction.mock.calls.length;

      const result = await service.reprojectScheduledRun({
        delayMs: 1_800_000,
        run,
      });

      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith({
        delayMs: 1_800_000,
        idempotencyKey: 'scheduled-plan-run-nightly',
        jobData,
        priority: 10,
      });
      expect(result).toEqual({ jobId: 'scheduled-plan-run-nightly' });
      // Writes nothing: the row is already SCHEDULED.
      expect(mockRecordQueuedRun).not.toHaveBeenCalled();
      expect(repo.manager.transaction.mock.calls).toHaveLength(
        transactionsBefore,
      );
    });

    test('keeps an OT Loop run an OT Loop run: runner and otLoop survive the reproject', async () => {
      const otLoop = {
        maxRetries: 1,
        validationCommands: ['pnpm nx run x:test'],
      };
      const otLoopJobData = buildRunPlanOrchestratorJobData({
        mode: null,
        otLoop,
        planId: mockPlan.id,
        ralph: { backend: 'claude' },
        runner: 'ot-loop',
        taskId: null,
        workingDirectory: null,
      });
      mockEnqueuePlanRalphOrchestrator.mockResolvedValueOnce({
        jobId: 'scheduled-plan-run-otloop',
      });

      await service.reprojectScheduledRun({
        delayMs: 0,
        run: createMock<PlanRun>({
          bullmqJobId: 'scheduled-plan-run-otloop',
          id: 'run-otloop',
          planId: mockPlan.id,
          runConfigSnapshot:
            buildPlanRunConfigSnapshotFromJobData(otLoopJobData),
          status: 'SCHEDULED',
        }),
      });

      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          jobData: expect.objectContaining({ otLoop, runner: 'ot-loop' }),
        }),
      );
    });

    test('throws for a run with no snapshot to rebuild from', async () => {
      await expect(
        service.reprojectScheduledRun({
          delayMs: 0,
          run: createMock<PlanRun>({
            bullmqJobId: 'scheduled-plan-run-x',
            id: 'run-x',
            planId: mockPlan.id,
            runConfigSnapshot: null,
          }),
        }),
      ).rejects.toThrow('no job id or config snapshot');
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });

    test('throws when the queue add fails', async () => {
      mockEnqueuePlanRalphOrchestrator.mockResolvedValueOnce({
        error: 'redis down',
      });

      await expect(
        service.reprojectScheduledRun({ delayMs: 0, run }),
      ).rejects.toThrow('redis down');
    });
  });
});
