import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRunsService,
  PlansService,
  RepositoryCheckoutsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import {
  type Plan,
  type RepositoryCheckout,
  Task,
} from '@openthrottle/nestjs-repositories';
import { isRecord } from '@openthrottle/nodejs-utils';
import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { NotificationsService } from '../../notifications/notifications.service.ts';
import type { RunPlanJobData } from '../../queues/plans/plans.types.ts';
import type { QueuesService } from '../queues/queues.service.ts';
import type { WorkLedgerCaptureService } from '../work-ledger/work-ledger-capture.service.ts';
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
    createQueryBuilder: vi.fn(() => mockTaskUpdateQueryBuilder),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
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
              entity === Task ? taskRepo : repo,
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
  const mockPlanRunsService = createMock<PlanRunsService>({
    recordQueuedRun: mockRecordQueuedRun,
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
});
