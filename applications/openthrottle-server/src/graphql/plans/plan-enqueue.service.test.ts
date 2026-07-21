import { createMock } from '@golevelup/ts-vitest';
import {
  PlansService,
  PlanRunsService,
  Task,
  TasksService,
  type Plan,
} from '@openthrottle/nestjs-repositories';
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

  const service = new PlanEnqueueService(
    mockNotificationsService,
    mockPlanRunsService,
    mockPlansService,
    mockQueuesService,
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
          planId: 'non-existent-id',
          priority: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockAdd).not.toHaveBeenCalled();
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });
  });

  describe('enqueueOrchestrator', () => {
    test('throws NotFoundException when plan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.enqueueOrchestrator({
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

    test('passes resolved task mode and taskId into job data', async () => {
      await service.enqueueOrchestrator({
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
