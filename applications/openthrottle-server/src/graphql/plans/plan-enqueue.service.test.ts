import { createMock } from '@golevelup/ts-vitest';
import {
  PlansService,
  PlanRunsService,
  RepositoryCheckoutsService,
  Task,
  TasksService,
  type Plan,
  type RepositoryCheckout,
} from '@openthrottle/nestjs-repositories';
import { isRecord } from '@openthrottle/nodejs-utils';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Queue } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import { QueuesService } from '../queues/queues.service';
import { PlanEnqueueService } from './plan-enqueue.service';

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

  // updateMatchingTasksAndEmitStatusChanged runs a single `UPDATE ... RETURNING id` query builder;
  // mock the chain and drive what RETURNING yields via mockTaskUpdateExecute.
  const mockTaskUpdateExecute = vi
    .fn()
    .mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] });
  const mockTaskUpdateQueryBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    execute: mockTaskUpdateExecute,
    returning: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
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

  const service = new PlanEnqueueService(
    mockNotificationsService,
    mockPlanRunsService,
    mockPlansService,
    mockQueuesService,
    mockRepositoryCheckoutsService,
    mockTasksService,
    mockPlansQueue,
  );

  beforeEach(() => {
    repo.findOne.mockResolvedValue(mockPlan);
    repo.update.mockResolvedValue(undefined);
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
    mockTaskUpdateQueryBuilder.set.mockClear();
    mockTaskUpdateQueryBuilder.andWhere.mockClear();
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

    test('a DB failure during the transaction rolls back and never enqueues', async () => {
      repo.update.mockRejectedValueOnce(new Error('db down'));

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
