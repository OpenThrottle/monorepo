import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createMock } from '@golevelup/ts-vitest';
import {
  PlansService,
  PlanRunsService,
  Task,
  TasksService,
  type Plan,
} from '@openthrottle/nestjs-repositories';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Queue } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
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

  let prevDefaultRunKind: string | undefined;

  beforeEach(() => {
    prevDefaultRunKind = process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
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

  afterEach(() => {
    if (prevDefaultRunKind === undefined) {
      delete process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
    } else {
      process.env.OPENTHROTTLE_DEFAULT_RUN_KIND = prevDefaultRunKind;
    }
  });

  describe('enqueueSpawn (forced spawn path)', () => {
    beforeEach(() => {
      // Force spawn so the orchestrator-by-default flip does not reroute these assertions.
      process.env.OPENTHROTTLE_DEFAULT_RUN_KIND = 'spawn';
    });

    test('records the queued run, adds the BullMQ job, and returns queue position', async () => {
      const result = await service.enqueueSpawn({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      const addOpts = mockAdd.mock.calls[0]?.[2];
      const addJobId =
        isRecord(addOpts) && typeof addOpts.jobId === 'string'
          ? addOpts.jobId
          : undefined;
      expect(result.executionBackend).toBe('cursor');
      expect(result.jobId).toBe(addJobId);
      expect(result.planId).toBe(mockPlan.id);
      expect(result.queuePosition).toBe(1);
      expect(result.queueTotal).toBe(1);
      expect(mockRecordQueuedRun).toHaveBeenCalledWith(
        expect.objectContaining({
          bullmqJobId: addJobId,
          executionBackend: 'cursor',
          planId: mockPlan.id,
          queueName: PLANS_QUEUE_NAME,
          runKind: 'spawn',
        }),
        expect.anything(),
      );
      expect(mockEmitPlanEnqueued).toHaveBeenCalledWith({
        planId: mockPlan.id,
        queuePosition: 1,
        queueTotal: 1,
      });
    });

    test('uses the caller idempotency key as the BullMQ jobId so re-enqueue dedupes', async () => {
      const first = await service.enqueueSpawn({
        idempotencyKey: 'plan-run-key-1',
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });
      const second = await service.enqueueSpawn({
        idempotencyKey: 'plan-run-key-1',
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(first.jobId).toBe('plan-run-key-1');
      expect(second.jobId).toBe('plan-run-key-1');
      expect(mockAdd).toHaveBeenNthCalledWith(
        1,
        'run-plan',
        expect.objectContaining({ planId: mockPlan.id }),
        expect.objectContaining({ jobId: 'plan-run-key-1' }),
      );
    });

    test('rejects an invalid idempotency key before any enqueue', async () => {
      await expect(
        service.enqueueSpawn({
          idempotencyKey: 'bad key with spaces',
          planId: mockPlan.id,
          priority: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockAdd).not.toHaveBeenCalled();
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
    });

    test('resets non-completed tasks to QUEUED and emits per task', async () => {
      mockTaskUpdateExecute.mockResolvedValueOnce({
        affected: 2,
        generatedMaps: [],
        raw: [{ id: 'task-a' }, { id: 'task-b' }],
      });

      await service.enqueueSpawn({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(mockTaskUpdateQueryBuilder.set).toHaveBeenCalledWith({
        status: 'QUEUED',
      });
      expect(mockTaskUpdateQueryBuilder.andWhere).toHaveBeenCalledWith(
        'status IN (:...fromStatuses)',
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
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledTimes(2);
    });

    test('does not reset COMPLETED tasks', async () => {
      await service.enqueueSpawn({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      const andWhereArgs =
        mockTaskUpdateQueryBuilder.andWhere.mock.calls[0]?.[1];
      const fromStatuses =
        isRecord(andWhereArgs) && Array.isArray(andWhereArgs.fromStatuses)
          ? andWhereArgs.fromStatuses
          : [];
      expect(fromStatuses).not.toContain('COMPLETED');
    });

    test('passes provided priority to queue.add', async () => {
      await service.enqueueSpawn({
        planId: mockPlan.id,
        priority: 1,
        workingDirectory: null,
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        { executionBackend: 'cursor', planId: mockPlan.id },
        expect.objectContaining({ priority: 1 }),
      );
    });

    test('uses default priority (10) when priority is null', async () => {
      await service.enqueueSpawn({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        { executionBackend: 'cursor', planId: mockPlan.id },
        expect.objectContaining({ priority: 10 }),
      );
    });

    test('omits ralph from job data when ralph is not provided', async () => {
      await service.enqueueSpawn({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      const jobData = mockAdd.mock.calls[0]?.[1];
      expect(jobData).toEqual({
        executionBackend: 'cursor',
        planId: mockPlan.id,
      });
    });

    test('passes ralph tuning into job data when provided', async () => {
      await service.enqueueSpawn({
        planId: mockPlan.id,
        priority: null,
        ralph: {
          backend: 'cursor',
          iterationTimeoutSeconds: 120,
          iterations: 5,
          model: null,
          project: 'applications/openthrottle-server',
          prompt: null,
          promptFile: null,
          ralphDebugCli: 'verbose',
          skipWorktreeSetup: null,
          worktree: 'target-one',
          worktreeBase: null,
        },
        workingDirectory: null,
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        expect.objectContaining({
          ralph: expect.objectContaining({
            backend: 'cursor',
            iterations: 5,
          }),
        }),
        expect.objectContaining({ priority: 10 }),
      );
    });

    test('includes an external workingDirectory in job data', async () => {
      const externalDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'ot-external-wd-'),
      );
      try {
        await service.enqueueSpawn({
          planId: mockPlan.id,
          priority: null,
          workingDirectory: externalDir,
        });

        expect(mockAdd).toHaveBeenCalledWith(
          'run-plan',
          {
            executionBackend: 'cursor',
            planId: mockPlan.id,
            workingDirectory: externalDir,
          },
          expect.objectContaining({ priority: 10 }),
        );
      } finally {
        fs.rmSync(externalDir, { force: true, recursive: true });
      }
    });

    test('throws BadRequestException when ralph tuning is invalid', async () => {
      await expect(
        service.enqueueSpawn({
          planId: mockPlan.id,
          priority: null,
          ralph: {
            backend: 'not-a-real-backend',
            iterationTimeoutSeconds: null,
            iterations: null,
            model: null,
            project: null,
            prompt: null,
            promptFile: null,
            ralphDebugCli: null,
          },
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('a DB failure during the transaction rolls back and never enqueues', async () => {
      repo.update.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.enqueueSpawn({
          planId: mockPlan.id,
          priority: null,
          workingDirectory: null,
        }),
      ).rejects.toThrow('db down');
      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  describe('enqueueSpawn (orchestrator by default)', () => {
    beforeEach(() => {
      delete process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
    });

    test('routes to the orchestrator path (no spawn add) when default is orchestrator', async () => {
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

    test('OPENTHROTTLE_DEFAULT_RUN_KIND=spawn reverts to the spawn path', async () => {
      process.env.OPENTHROTTLE_DEFAULT_RUN_KIND = 'spawn';

      await service.enqueueSpawn({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(mockAdd).toHaveBeenCalledTimes(1);
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
