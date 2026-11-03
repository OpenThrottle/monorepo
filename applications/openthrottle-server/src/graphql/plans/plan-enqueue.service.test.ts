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
import { isRecord } from '@openthrottle/nodejs-utils';
import type { Queue } from 'bullmq';
import { In } from 'typeorm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { NotificationsService } from '../../notifications/notifications.service.ts';
import type {
  RunPlanJobData,
  RunPlanOrchestratorJobData,
} from '../../queues/plans/plans.types.ts';
import type { QueuesService } from '../queues/queues.service.ts';
import type { WorkLedgerCaptureService } from '../work-ledger/work-ledger-capture.service.ts';
import { buildRunPlanOrchestratorJobData } from './enqueue-plan-ralph-tuning.ts';
import { buildPlanRunConfigSnapshotFromJobData } from './enqueue-plan-run-config-snapshot.ts';
import { PlanEnqueueService } from './plan-enqueue.service.ts';
import type { PlanStatusService } from './plan-status.service.ts';

const mockPlan = createMock<Plan>({
  id: '80864bba-630a-451d-bfd2-4b25ec202381',
  jobRunHooks: { hooks: [] },
  status: 'PENDING',
});

describe('PlanEnqueueService', () => {
  const mockAdd = vi.fn().mockResolvedValue({ id: 'job-1', name: 'run-plan' });
  const mockGetWaitingCount = vi.fn().mockResolvedValue(1);
  const mockGetJobs = vi
    .fn()
    .mockResolvedValue([{ id: 'job-1', name: 'run-plan' }]);

  const mockPlansQueue = createMock<Queue<RunPlanJobData, void>>({
    add: mockAdd,
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
      transaction: vi.fn(
        async (
          cb: (manager: {
            getRepository: (entity: unknown) => unknown;
          }) => unknown,
        ) =>
          cb({
            getRepository: (entity: unknown) =>
              entity === Task
                ? taskRepo
                : entity === PlanRunEntity
                  ? planRunRepo
                  : repo,
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
  const mockPlanRunsService = createMock<PlanRunsService>({
    findByQueueNameAndBullmqJobId: mockFindByQueueNameAndBullmqJobId,
    hasActiveRun: mockHasActiveRun,
    recordQueuedRun: mockRecordQueuedRun,
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
  const mockPlanStatusService = createMock<PlanStatusService>({
    applyStatusChange: mockApplyStatusChange,
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
  });

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
      const idempotencyKey =
        isRecord(enqueueArg) && typeof enqueueArg.idempotencyKey === 'string'
          ? enqueueArg.idempotencyKey
          : undefined;
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

    test('writes only the run row: an IN_PROGRESS plan and its tasks are left exactly as they are', async () => {
      // Another run is live on this plan, with an IN_PROGRESS task. Scheduling must not flip the
      // plan to QUEUED or reset that task: plan/task QUEUED happens at fire time.
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'IN_PROGRESS' });
      mockTaskSelectGetMany.mockResolvedValue([
        { id: 'task-live', status: 'IN_PROGRESS' },
      ]);

      await service.schedulePlanRun({
        ...baseParams,
        scheduledFor: new Date(NOW.getTime() + HOUR_MS),
      });

      expect(mockRecordQueuedRun).toHaveBeenCalledOnce();
      expect(mockApplyStatusChange).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
      expect(mockTaskUpdateQueryBuilder.set).not.toHaveBeenCalled();
      expect(mockEmitTaskStatusChanged).not.toHaveBeenCalled();
      expect(mockRecordStatusChange).not.toHaveBeenCalled();
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
    const scheduledRun = (overrides: Partial<PlanRun> = {}): PlanRun =>
      createMock<PlanRun>({
        id: 'run-scheduled',
        planId: mockPlan.id,
        scheduledFor: NOW,
        status: 'SCHEDULED',
        ...overrides,
      });
    const fire = (
      now: Date = NOW,
    ): ReturnType<PlanEnqueueService['fireScheduledRun']> =>
      service.fireScheduledRun({
        ...actor,
        now,
        planId: mockPlan.id,
        planRunId: 'run-scheduled',
      });
    const expectNoPlanOrTaskWrites = (): void => {
      expect(mockApplyStatusChange).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
      expect(mockTaskUpdateQueryBuilder.set).not.toHaveBeenCalled();
      expect(mockEmitTaskStatusChanged).not.toHaveBeenCalled();
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
      );
      expectNoPlanOrTaskWrites();
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
      );
      expectNoPlanOrTaskWrites();
    });

    test('a run both late and colliding reports MISSED (lateness takes precedence)', async () => {
      mockHasActiveRun.mockResolvedValue(true);

      const outcome = await fire(new Date(NOW.getTime() + 2 * HOUR_MS));

      expect(outcome.kind).toBe('missed');
      expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
        'run-scheduled',
        'MISSED',
        expect.anything(),
      );
    });

    test('a COMPLETED plan with no runnable tasks: the run settles COMPLETED and the plan stays COMPLETED', async () => {
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
        'COMPLETED',
        expect.anything(),
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
