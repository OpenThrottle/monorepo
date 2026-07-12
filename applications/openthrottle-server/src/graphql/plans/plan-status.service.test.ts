import { createMock } from '@golevelup/ts-vitest';
import {
  Plan,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Queue } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { PlanRunCancellationService } from '../../queues/plans/plan-run-cancellation.service';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import { PlanStatusService } from './plan-status.service';

const IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE =
  'Cannot transition to IN_PROGRESS: only PENDING, QUEUED, or already IN_PROGRESS plans may enter this state.';

const mockPlan = createMock<Plan>({
  id: '80864bba-630a-451d-bfd2-4b25ec202381',
  status: 'PENDING',
  title: 'Test plan',
});

describe('PlanStatusService', () => {
  const mockGetJobs = vi.fn().mockResolvedValue([]);
  const mockPlansQueue = createMock<Queue<RunPlanJobData, void>>({
    getJobs: mockGetJobs,
  });

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
  };

  const repo = {
    findOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };

  const mockEmitTaskStatusChanged = vi.fn();
  const mockNotificationsService = createMock<NotificationsService>({
    emitTaskStatusChanged: mockEmitTaskStatusChanged,
  });

  const mockPlanRunCancellationAbort = vi.fn().mockReturnValue(false);
  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue(repo),
  });
  const mockTasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue(taskRepo),
  });

  const service = new PlanStatusService(
    mockNotificationsService,
    createMock<PlanRunCancellationService>({
      abort: mockPlanRunCancellationAbort,
    }),
    mockPlansService,
    mockTasksService,
    mockPlansQueue,
  );

  beforeEach(() => {
    repo.findOne.mockReset();
    repo.save.mockReset();
    repo.update.mockReset();
    repo.update.mockResolvedValue(undefined);
    mockGetJobs.mockReset();
    mockGetJobs.mockResolvedValue([]);
    mockPlanRunCancellationAbort.mockReturnValue(false);
    mockEmitTaskStatusChanged.mockClear();
    mockTaskUpdateExecute.mockResolvedValue({
      affected: 0,
      generatedMaps: [],
      raw: [],
    });
    mockTaskUpdateQueryBuilder.set.mockClear();
  });

  describe('isInProgressBlocked', () => {
    test('true when COMPLETED plan requests IN_PROGRESS', () => {
      expect(service.isInProgressBlocked('COMPLETED', 'IN_PROGRESS')).toBe(
        true,
      );
    });

    test('false when PENDING plan requests IN_PROGRESS', () => {
      expect(service.isInProgressBlocked('PENDING', 'IN_PROGRESS')).toBe(false);
    });

    test('false when no status is requested', () => {
      expect(service.isInProgressBlocked('COMPLETED', null)).toBe(false);
      expect(service.isInProgressBlocked('COMPLETED', undefined)).toBe(false);
    });
  });

  describe('resolveStatusChange', () => {
    test('returns the next status for PENDING → IN_PROGRESS', () => {
      expect(service.resolveStatusChange('PENDING', 'in_progress')).toEqual({
        nextStatus: 'IN_PROGRESS',
      });
    });

    test('returns null for a forbidden COMPLETED → IN_PROGRESS', () => {
      expect(
        service.resolveStatusChange('COMPLETED', 'IN_PROGRESS'),
      ).toBeNull();
    });

    test('returns null for an idempotent same-status change', () => {
      expect(
        service.resolveStatusChange('IN_PROGRESS', 'IN_PROGRESS'),
      ).toBeNull();
    });

    test('returns the next status for a normal change', () => {
      expect(service.resolveStatusChange('PENDING', 'completed')).toEqual({
        nextStatus: 'COMPLETED',
      });
    });
  });

  describe('setStatus', () => {
    test('persists and returns the updated plan', async () => {
      const planToUpdate = {
        ...mockPlan,
        completedAt: null,
        status: 'PENDING',
      };
      const saved = {
        ...planToUpdate,
        completedAt: new Date('2026-07-10T12:00:00.000Z'),
        status: 'COMPLETED',
      };
      repo.findOne.mockResolvedValue(planToUpdate);
      repo.save.mockResolvedValue(saved);

      const result = await service.setStatus(mockPlan.id, 'COMPLETED');

      expect(result?.status).toBe('COMPLETED');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expect.any(Date),
          id: mockPlan.id,
          status: 'COMPLETED',
        }),
      );
    });

    test('stamps completedAt when transitioning into COMPLETED', async () => {
      const planToUpdate = {
        ...mockPlan,
        completedAt: null,
        status: 'IN_PROGRESS',
      };
      repo.findOne.mockResolvedValue(planToUpdate);
      repo.save.mockImplementation(async (e) => e);

      await service.setStatus(mockPlan.id, 'COMPLETED');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expect.any(Date),
          status: 'COMPLETED',
        }),
      );
    });

    test('does not overwrite completedAt on idempotent COMPLETED status', async () => {
      const existingCompletedAt = new Date('2026-06-01T08:00:00.000Z');
      repo.findOne.mockResolvedValue({
        ...mockPlan,
        completedAt: existingCompletedAt,
        status: 'COMPLETED',
      });

      const result = await service.setStatus(mockPlan.id, 'completed');

      expect(result?.completedAt).toBe(existingCompletedAt);
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('clears completedAt when leaving COMPLETED', async () => {
      const existingCompletedAt = new Date('2026-06-01T08:00:00.000Z');
      const planToUpdate = {
        ...mockPlan,
        completedAt: existingCompletedAt,
        status: 'COMPLETED',
      };
      repo.findOne.mockResolvedValue(planToUpdate);
      repo.save.mockImplementation(async (e) => e);

      // PENDING is allowed from COMPLETED via setStatus (IN_PROGRESS is not).
      await service.setStatus(mockPlan.id, 'PENDING');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: null,
          status: 'PENDING',
        }),
      );
    });

    test('normalizes the requested status to uppercase', async () => {
      const planToUpdate = { ...mockPlan, status: 'pending' };
      repo.findOne.mockResolvedValue(planToUpdate);
      repo.save.mockImplementation(async (e) => e);

      const result = await service.setStatus(mockPlan.id, 'in_progress');

      expect(result?.status).toBe('IN_PROGRESS');
    });

    test('transitions QUEUED to IN_PROGRESS', async () => {
      const queued = { ...mockPlan, status: 'QUEUED' };
      repo.findOne.mockResolvedValue(queued);
      repo.save.mockImplementation(async (e) => e);

      const result = await service.setStatus(mockPlan.id, 'IN_PROGRESS');

      expect(result?.status).toBe('IN_PROGRESS');
    });

    test('throws when a COMPLETED plan requests IN_PROGRESS', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'COMPLETED' });

      await expect(
        service.setStatus(mockPlan.id, 'IN_PROGRESS'),
      ).rejects.toMatchObject({
        message: IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE,
      });
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('returns the plan unchanged (no save) for an idempotent status', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'COMPLETED' });

      const result = await service.setStatus(mockPlan.id, 'completed');

      expect(result?.status).toBe('COMPLETED');
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('returns null when the plan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.setStatus('missing-id', 'COMPLETED');

      expect(result).toBeNull();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('cancelRun', () => {
    test('throws NotFoundException when the plan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.cancelRun('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    test('returns noMatchingJob when the queue has no matching jobs', async () => {
      repo.findOne.mockResolvedValue(mockPlan);
      mockGetJobs.mockResolvedValue([]);

      const result = await service.cancelRun(mockPlan.id);

      expect(result.noMatchingJob).toBe(true);
      expect(result.removedJobIds).toEqual([]);
      expect(result.planStatusAfter).toBeNull();
      expect(result.signaledActiveRunToStop).toBe(false);
    });

    test('removes a waiting job and sets plan and tasks to PENDING', async () => {
      const remove = vi.fn().mockResolvedValue(undefined);
      mockGetJobs.mockResolvedValue([
        {
          data: { planId: mockPlan.id },
          getState: vi.fn(),
          id: 'job-99',
          name: 'run-plan',
          remove,
        },
      ]);
      repo.findOne
        .mockResolvedValueOnce(mockPlan)
        .mockResolvedValueOnce({ ...mockPlan, status: 'PENDING' });
      mockTaskUpdateExecute.mockResolvedValueOnce({
        affected: 1,
        generatedMaps: [],
        raw: [{ id: 'task-queued' }],
      });

      const result = await service.cancelRun(mockPlan.id);

      expect(remove).toHaveBeenCalledOnce();
      expect(result.removedJobIds).toEqual(['job-99']);
      expect(result.planStatusAfter).toBe('PENDING');
      expect(repo.update).toHaveBeenCalledWith(
        { id: mockPlan.id },
        { completedAt: null, status: 'PENDING' },
      );
      expect(mockTaskUpdateQueryBuilder.set).toHaveBeenCalledWith({
        status: 'PENDING',
      });
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledWith({
        planId: mockPlan.id,
        status: 'PENDING',
        taskId: 'task-queued',
      });
    });

    test('reports active job ids when remove fails for a locked job', async () => {
      const remove = vi.fn().mockRejectedValue(new Error('locked'));
      mockGetJobs.mockResolvedValue([
        {
          data: { planId: mockPlan.id },
          getState: vi.fn().mockResolvedValue('active'),
          id: 'job-a',
          name: 'run-plan',
          remove,
        },
      ]);
      repo.findOne.mockResolvedValue(mockPlan);

      const result = await service.cancelRun(mockPlan.id);

      expect(result.removedJobIds).toEqual([]);
      expect(result.activeJobIdsCouldNotCancel).toEqual(['job-a']);
      expect(result.planStatusAfter).toBeNull();
      expect(mockPlanRunCancellationAbort).toHaveBeenCalledWith(mockPlan.id);
      expect(repo.update).not.toHaveBeenCalled();
    });

    test('sets plan PENDING when an active job cannot be removed but abort succeeds', async () => {
      mockPlanRunCancellationAbort.mockReturnValue(true);
      const remove = vi.fn().mockRejectedValue(new Error('locked'));
      mockGetJobs.mockResolvedValue([
        {
          data: { planId: mockPlan.id },
          getState: vi.fn().mockResolvedValue('active'),
          id: 'job-a',
          name: 'run-plan',
          remove,
        },
      ]);
      repo.findOne
        .mockResolvedValueOnce(mockPlan)
        .mockResolvedValueOnce({ ...mockPlan, status: 'PENDING' });
      mockTaskUpdateExecute.mockResolvedValueOnce({
        affected: 1,
        generatedMaps: [],
        raw: [{ id: 'task-queued' }],
      });

      const result = await service.cancelRun(mockPlan.id);

      expect(result.activeJobIdsCouldNotCancel).toEqual(['job-a']);
      expect(result.signaledActiveRunToStop).toBe(true);
      expect(result.planStatusAfter).toBe('PENDING');
      expect(repo.update).toHaveBeenCalledWith(
        { id: mockPlan.id },
        { completedAt: null, status: 'PENDING' },
      );
    });
  });
});
