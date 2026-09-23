import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { Queue } from 'bullmq';
import type { EntityManager } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { NotificationsService } from '../../notifications/notifications.service.ts';
import type { PlanCancelChannelService } from '../../queues/plans/plan-cancel-channel.service.ts';
import type { PlanRunCancellationService } from '../../queues/plans/plan-run-cancellation.service.ts';
import type { RunPlanJobData } from '../../queues/plans/plans.types.ts';
import type { WorkLedgerCaptureService } from '../work-ledger/work-ledger-capture.service.ts';
import type { StatusChangeActor } from './plan-status.service.ts';
import {
  PlanStatusService,
  WORK_LEDGER_CAPTURE_FAILED_MARKER,
} from './plan-status.service.ts';

const IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE =
  'Cannot transition to IN_PROGRESS: only PENDING, QUEUED, or already IN_PROGRESS plans may enter this state.';

const mockPlan = createMock<Plan>({
  id: '80864bba-630a-451d-bfd2-4b25ec202381',
  status: 'PENDING',
  title: 'Test plan',
});

/** A generic request-principal actor for tests that only need attribution to be well-formed. */
const testActor: StatusChangeActor = { actorKind: 'user', actorSub: 'user-1' };

describe('PlanStatusService', () => {
  const mockGetJobs = vi.fn().mockResolvedValue([]);
  const mockPlansQueue = createMock<Queue<RunPlanJobData, void>>({
    getJobs: mockGetJobs,
  });

  // applyBulkTaskStatusChange (behind updateMatchingTasksAndEmitStatusChanged) selects the plan's
  // matching tasks under a pessimistic write lock (mockTaskSelectGetMany drives which rows are
  // "affected", and each row's own status is captured as `from`), then updates them by id
  // (mockTaskUpdateExecute), all inside its own manager.transaction.
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
    manager: {
      transaction: vi.fn(
        async (
          cb: (manager: { getRepository: () => typeof taskRepo }) => unknown,
        ) => cb({ getRepository: () => taskRepo }),
      ),
    },
  };

  const repo = {
    findOne: vi.fn(),
    manager: {
      transaction: vi.fn(),
    },
    save: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };

  const mockEmitTaskStatusChanged = vi.fn();
  const mockNotificationsService = createMock<NotificationsService>({
    emitTaskStatusChanged: mockEmitTaskStatusChanged,
  });

  const mockPlanRunCancellationAbort = vi.fn().mockReturnValue(false);
  const mockPublishCancel = vi.fn().mockResolvedValue(undefined);
  const mockStampCancelRequested = vi.fn().mockResolvedValue(null);
  // The stamped run, read back so cancelRun can tell a run that polls the cancel
  // marker from one that has no loop to poll it. Defaults to a supervised run so
  // every pre-existing case keeps asserting today's behaviour.
  const mockFindById = vi.fn().mockResolvedValue({ heartbeatExpected: true });
  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue(repo),
  });
  const mockHasRemainingTasks = vi.fn().mockResolvedValue(false);
  const mockTasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue(taskRepo),
    hasRemainingTasks: mockHasRemainingTasks,
  });

  const mockLoggerWarn = vi.fn();
  const mockLoggerError = vi.fn();
  const mockLogger = createMock<LoggerService>({
    error: mockLoggerError,
    warn: mockLoggerWarn,
  });
  const mockRecordStatusChange = vi.fn().mockResolvedValue(undefined);
  const mockResolveSessionId = vi.fn().mockResolvedValue('session-1');
  const mockWorkLedgerCapture = createMock<WorkLedgerCaptureService>({
    recordStatusChange: mockRecordStatusChange,
    resolveSessionId: mockResolveSessionId,
  });
  const manager = createMock<EntityManager>();

  const service = new PlanStatusService(
    mockLogger,
    mockNotificationsService,
    createMock<PlanCancelChannelService>({
      publishCancel: mockPublishCancel,
    }),
    createMock<PlanRunCancellationService>({
      abort: mockPlanRunCancellationAbort,
    }),
    createMock<PlanRunsService>({
      findById: mockFindById,
      stampCancelRequested: mockStampCancelRequested,
    }),
    mockPlansService,
    mockTasksService,
    mockWorkLedgerCapture,
    mockPlansQueue,
  );

  beforeEach(() => {
    repo.findOne.mockReset();
    repo.save.mockReset();
    repo.update.mockReset();
    repo.update.mockResolvedValue(undefined);
    repo.manager.transaction.mockReset();
    // Mirrors repo.manager.transaction: runs the callback with a manager whose getRepository(Plan)
    // routes back to `repo` — the only entity these tests transact against — so existing
    // `expect(repo.findOne/save)` assertions still hold.
    repo.manager.transaction.mockImplementation(
      async (cb: (manager: { getRepository: () => typeof repo }) => unknown) =>
        cb({ getRepository: () => repo }),
    );
    mockGetJobs.mockReset();
    mockGetJobs.mockResolvedValue([]);
    mockPlanRunCancellationAbort.mockReturnValue(false);
    mockPublishCancel.mockClear();
    mockPublishCancel.mockResolvedValue(undefined);
    mockStampCancelRequested.mockClear();
    mockStampCancelRequested.mockResolvedValue(null);
    mockFindById.mockClear();
    mockFindById.mockResolvedValue({ heartbeatExpected: true });
    mockEmitTaskStatusChanged.mockClear();
    mockTaskSelectGetMany.mockReset().mockResolvedValue([]);
    mockTaskUpdateExecute.mockResolvedValue({
      affected: 0,
      generatedMaps: [],
      raw: [],
    });
    mockTaskUpdateQueryBuilder.set.mockClear();
    taskRepo.manager.transaction.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
    mockRecordStatusChange.mockReset();
    mockRecordStatusChange.mockResolvedValue(undefined);
    mockResolveSessionId.mockReset();
    mockResolveSessionId.mockResolvedValue('session-1');
    mockHasRemainingTasks.mockReset();
    mockHasRemainingTasks.mockResolvedValue(false);
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

  describe('applyStatusChange', () => {
    const baseParams = {
      actorKind: 'user',
      actorSub: 'user-1',
      captureFailureIsFatal: true,
      throwOnForbiddenInProgress: false,
    };

    test('a valid transition mutates the entity and captures a status_change with the correct from/to', async () => {
      const entity = { ...mockPlan, completedAt: null, status: 'PENDING' };

      const result = await service.applyStatusChange(manager, {
        ...baseParams,
        entity,
        requestedStatus: 'COMPLETED',
      });

      expect(result).toEqual({
        applied: true,
        fromStatus: 'PENDING',
        toStatus: 'COMPLETED',
      });
      expect(entity.status).toBe('COMPLETED');
      expect(entity.completedAt).toBeInstanceOf(Date);
      expect(mockRecordStatusChange).toHaveBeenCalledWith(manager, {
        actorKind: 'user',
        actorSub: 'user-1',
        entity: 'plan',
        from: 'PENDING',
        id: mockPlan.id,
        planId: mockPlan.id,
        taskId: null,
        to: 'COMPLETED',
      });
    });

    test('a no-op transition (current === requested) captures nothing', async () => {
      const entity = { ...mockPlan, status: 'COMPLETED' };

      const result = await service.applyStatusChange(manager, {
        ...baseParams,
        entity,
        requestedStatus: 'completed',
      });

      expect(result).toEqual({ applied: false });
      expect(entity.status).toBe('COMPLETED');
      expect(mockRecordStatusChange).not.toHaveBeenCalled();
    });

    test('a forbidden IN_PROGRESS transition silently no-ops when throwOnForbiddenInProgress is false', async () => {
      const entity = { ...mockPlan, status: 'COMPLETED' };

      const result = await service.applyStatusChange(manager, {
        ...baseParams,
        entity,
        requestedStatus: 'IN_PROGRESS',
        throwOnForbiddenInProgress: false,
      });

      expect(result).toEqual({ applied: false });
      expect(entity.status).toBe('COMPLETED');
      expect(mockRecordStatusChange).not.toHaveBeenCalled();
    });

    test('a forbidden IN_PROGRESS transition throws when throwOnForbiddenInProgress is true', async () => {
      const entity = { ...mockPlan, status: 'COMPLETED' };

      await expect(
        service.applyStatusChange(manager, {
          ...baseParams,
          entity,
          requestedStatus: 'IN_PROGRESS',
          throwOnForbiddenInProgress: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(entity.status).toBe('COMPLETED');
      expect(mockRecordStatusChange).not.toHaveBeenCalled();
    });

    test('a capture failure is fatal when captureFailureIsFatal is true', async () => {
      const entity = { ...mockPlan, status: 'PENDING' };
      mockRecordStatusChange.mockRejectedValue(new Error('ledger down'));

      await expect(
        service.applyStatusChange(manager, {
          ...baseParams,
          captureFailureIsFatal: true,
          entity,
          requestedStatus: 'COMPLETED',
        }),
      ).rejects.toThrow('ledger down');
      // The entity was mutated before the capture attempt; the caller's transaction
      // (which this rejection propagates into) is what actually rolls that back.
      expect(entity.status).toBe('COMPLETED');
    });

    test('a capture failure is non-fatal when captureFailureIsFatal is false: logs and still applies', async () => {
      const entity = { ...mockPlan, status: 'PENDING' };
      mockRecordStatusChange.mockRejectedValue(new Error('ledger down'));

      const result = await service.applyStatusChange(manager, {
        ...baseParams,
        captureFailureIsFatal: false,
        entity,
        requestedStatus: 'COMPLETED',
      });

      expect(result).toEqual({
        applied: true,
        fromStatus: 'PENDING',
        toStatus: 'COMPLETED',
      });
      expect(entity.status).toBe('COMPLETED');
      expect(mockLoggerError).toHaveBeenCalledTimes(1);
      expect(mockLoggerWarn).not.toHaveBeenCalled();
    });

    test('the non-fatal capture failure log carries the greppable marker, plan id, from and to', async () => {
      const entity = { ...mockPlan, status: 'IN_PROGRESS' };
      mockRecordStatusChange.mockRejectedValue(new Error('ledger down'));

      await service.applyStatusChange(manager, {
        ...baseParams,
        captureFailureIsFatal: false,
        entity,
        requestedStatus: 'PENDING',
      });

      // An alert can only match these lines if the marker is a fixed, unpunctuated token and
      // the three facts needed to reconstruct the missing row are all present.
      expect(mockLoggerError).toHaveBeenCalledTimes(1);

      const [message, context] = mockLoggerError.mock.calls[0] ?? [];

      expect(message).toContain(WORK_LEDGER_CAPTURE_FAILED_MARKER);
      expect(message).toContain(`id=${mockPlan.id}`);
      expect(message).toContain('from=IN_PROGRESS');
      expect(message).toContain('to=PENDING');
      expect(context).toBe('PlanStatusService');
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

      const result = await service.setStatus(
        mockPlan.id,
        'COMPLETED',
        testActor,
      );

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

      await service.setStatus(mockPlan.id, 'COMPLETED', testActor);

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

      const result = await service.setStatus(
        mockPlan.id,
        'completed',
        testActor,
      );

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
      await service.setStatus(mockPlan.id, 'PENDING', testActor);

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

      const result = await service.setStatus(
        mockPlan.id,
        'in_progress',
        testActor,
      );

      expect(result?.status).toBe('IN_PROGRESS');
    });

    test('transitions QUEUED to IN_PROGRESS', async () => {
      const queued = { ...mockPlan, status: 'QUEUED' };
      repo.findOne.mockResolvedValue(queued);
      repo.save.mockImplementation(async (e) => e);

      const result = await service.setStatus(
        mockPlan.id,
        'IN_PROGRESS',
        testActor,
      );

      expect(result?.status).toBe('IN_PROGRESS');
    });

    test('throws when a COMPLETED plan requests IN_PROGRESS', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'COMPLETED' });

      await expect(
        service.setStatus(mockPlan.id, 'IN_PROGRESS', testActor),
      ).rejects.toMatchObject({
        message: IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE,
      });
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('returns the plan unchanged (no save) for an idempotent status', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'COMPLETED' });

      const result = await service.setStatus(
        mockPlan.id,
        'completed',
        testActor,
      );

      expect(result?.status).toBe('COMPLETED');
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('returns null when the plan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.setStatus(
        'missing-id',
        'COMPLETED',
        testActor,
      );

      expect(result).toBeNull();
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('captures a status_change with the correct from/to (newly routed through applyStatusChange)', async () => {
      const planToUpdate = {
        ...mockPlan,
        completedAt: null,
        status: 'PENDING',
      };
      repo.findOne.mockResolvedValue(planToUpdate);
      repo.save.mockImplementation(async (e) => e);

      await service.setStatus(mockPlan.id, 'IN_PROGRESS', testActor);

      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorKind: testActor.actorKind,
          actorSub: testActor.actorSub,
          entity: 'plan',
          from: 'PENDING',
          to: 'IN_PROGRESS',
        }),
      );
    });

    test('a capture failure still fails the mutation (user-facing paths keep the coupling)', async () => {
      // The counterpart to the sweeper's log-and-continue: here the user sees the error and
      // retries, so nothing is silently unrecorded. Widening non-fatal capture to this path
      // would reintroduce exactly the defect this service exists to close.
      const planToUpdate = {
        ...mockPlan,
        completedAt: null,
        status: 'PENDING',
      };
      repo.findOne.mockResolvedValue(planToUpdate);
      repo.save.mockImplementation(async (e) => e);
      mockRecordStatusChange.mockRejectedValue(new Error('ledger down'));

      await expect(
        service.setStatus(mockPlan.id, 'COMPLETED', testActor),
      ).rejects.toThrow('ledger down');

      expect(mockLoggerError).not.toHaveBeenCalled();
    });
  });

  describe('writeGuardedStatus', () => {
    test('applies and persists when the freshly-locked row matches guardCurrentStatus', async () => {
      const entity = { ...mockPlan, completedAt: null, status: 'IN_PROGRESS' };
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockImplementation(async (e) => e);

      const applied = await service.writeGuardedStatus(mockPlan.id, {
        actorKind: testActor.actorKind,
        actorSub: testActor.actorSub,
        captureFailureIsFatal: true,
        guardCurrentStatus: 'IN_PROGRESS',
        requestedStatus: 'PENDING',
        throwOnForbiddenInProgress: false,
      });

      expect(applied).toBe(true);
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
          where: { id: mockPlan.id },
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING' }),
      );
      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ from: 'IN_PROGRESS', to: 'PENDING' }),
      );
    });

    test('skips the write when the freshly-locked row no longer matches guardCurrentStatus', async () => {
      // The row lock's own fresh read is the real guard — this simulates another writer having
      // already moved the plan off IN_PROGRESS between the caller's earlier check and this call.
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'COMPLETED' });

      const applied = await service.writeGuardedStatus(mockPlan.id, {
        actorKind: testActor.actorKind,
        actorSub: testActor.actorSub,
        captureFailureIsFatal: true,
        guardCurrentStatus: 'IN_PROGRESS',
        requestedStatus: 'PENDING',
        throwOnForbiddenInProgress: false,
      });

      expect(applied).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
      expect(mockRecordStatusChange).not.toHaveBeenCalled();
    });

    test('returns false when the plan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const applied = await service.writeGuardedStatus(mockPlan.id, {
        actorKind: testActor.actorKind,
        actorSub: testActor.actorSub,
        captureFailureIsFatal: true,
        guardCurrentStatus: undefined,
        requestedStatus: 'PENDING',
        throwOnForbiddenInProgress: false,
      });

      expect(applied).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('promoteParentPlanToInProgress', () => {
    test('promotes a PENDING plan and captures a status_change', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'PENDING' });
      repo.save.mockImplementation(async (e) => e);

      const promoted = await service.promoteParentPlanToInProgress(
        mockPlan.id,
        testActor,
        false,
      );

      expect(promoted).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'IN_PROGRESS' }),
      );
      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ from: 'PENDING', to: 'IN_PROGRESS' }),
      );
    });

    test('does not resurrect a CANCELED plan to IN_PROGRESS (tightens the old ad hoc guard)', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'CANCELED' });

      const promoted = await service.promoteParentPlanToInProgress(
        mockPlan.id,
        testActor,
        false,
      );

      expect(promoted).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('a capture failure is non-fatal when captureFailureIsFatal is false: the row still commits', async () => {
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'PENDING' });
      repo.save.mockImplementation(async (e) => e);
      mockRecordStatusChange.mockRejectedValueOnce(new Error('ledger down'));

      const promoted = await service.promoteParentPlanToInProgress(
        mockPlan.id,
        { actorKind: undefined, actorSub: undefined },
        false,
      );

      expect(promoted).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'IN_PROGRESS' }),
      );
    });
  });

  describe('completeParentPlanIfTasksDone', () => {
    test('completes an IN_PROGRESS plan with no remaining tasks and captures a status_change', async () => {
      mockHasRemainingTasks.mockResolvedValue(false);
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'IN_PROGRESS' });
      repo.save.mockImplementation(async (e) => e);

      const completed = await service.completeParentPlanIfTasksDone(
        mockPlan.id,
        testActor,
      );

      expect(completed).toBe(true);
      expect(mockHasRemainingTasks).toHaveBeenCalledWith(mockPlan.id);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' }),
      );
      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ from: 'IN_PROGRESS', to: 'COMPLETED' }),
      );
    });

    test('does not complete while tasks remain (never reaches the plan row)', async () => {
      mockHasRemainingTasks.mockResolvedValue(true);

      const completed = await service.completeParentPlanIfTasksDone(
        mockPlan.id,
        testActor,
      );

      expect(completed).toBe(false);
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('does not complete a plan that is no longer IN_PROGRESS under the row lock (avoids resurrecting CANCELED/PENDING/BACKLOG)', async () => {
      mockHasRemainingTasks.mockResolvedValue(false);
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'CANCELED' });

      const completed = await service.completeParentPlanIfTasksDone(
        mockPlan.id,
        testActor,
      );

      expect(completed).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('cancelRun', () => {
    test('throws NotFoundException when the plan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.cancelRun('missing-id', null, testActor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('returns NO_ACTIVE_RUN when there is no job and the plan is not cancelable', async () => {
      // A PENDING plan has no live run; cancel is a no-op and must not stamp/publish.
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'PENDING' });
      mockGetJobs.mockResolvedValue([]);

      const result = await service.cancelRun(mockPlan.id, null, testActor);

      expect(result.noMatchingJob).toBe(true);
      expect(result.outcome).toBe('NO_ACTIVE_RUN');
      expect(result.cancelRequested).toBe(false);
      expect(result.planStatusAfter).toBeNull();
      expect(result.signaledActiveRunToStop).toBe(false);
      expect(mockStampCancelRequested).not.toHaveBeenCalled();
      expect(mockPublishCancel).not.toHaveBeenCalled();
    });

    test('signals an active (IN_PROGRESS) run cross-process and reports RUN_STOPPING', async () => {
      // No local controller and no removable job, but the plan is executing: the durable marker +
      // pub/sub reach a run owned by another process/host (the cross-process guarantee).
      repo.findOne
        .mockResolvedValueOnce({ ...mockPlan, status: 'IN_PROGRESS' })
        .mockResolvedValueOnce({ ...mockPlan, status: 'PENDING' });
      mockGetJobs.mockResolvedValue([]);
      mockPlanRunCancellationAbort.mockReturnValue(false);
      mockStampCancelRequested.mockResolvedValue('run-1');

      const result = await service.cancelRun(mockPlan.id, 'user-42', testActor);

      expect(mockStampCancelRequested).toHaveBeenCalledWith(
        mockPlan.id,
        'user-42',
      );
      expect(mockPublishCancel).toHaveBeenCalledWith(mockPlan.id);
      expect(result.cancelRequested).toBe(true);
      expect(result.outcome).toBe('RUN_STOPPING');
      expect(result.planStatusAfter).toBe('PENDING');
    });

    test('reports RUN_STOPPING when the local controller aborts (same process)', async () => {
      repo.findOne
        .mockResolvedValueOnce({ ...mockPlan, status: 'IN_PROGRESS' })
        .mockResolvedValueOnce({ ...mockPlan, status: 'PENDING' });
      mockGetJobs.mockResolvedValue([]);
      mockPlanRunCancellationAbort.mockReturnValue(true);
      mockStampCancelRequested.mockResolvedValue('run-1');

      const result = await service.cancelRun(mockPlan.id, null, testActor);

      expect(result.signaledActiveRunToStop).toBe(true);
      expect(result.outcome).toBe('RUN_STOPPING');
    });

    test('an unsupervised run yields CANCELLATION_REQUESTED and never resets the plan', async () => {
      // The regression guard. A run whose owner has no timer also has no iteration
      // boundary at which to poll the marker, so RUN_STOPPING would be a claim the
      // server cannot back: it resets the plan and its QUEUED tasks to PENDING while
      // the agent keeps working and later writes COMPLETED over the reset. The stamp
      // is still made and still published — it is a request, not a stop.
      repo.findOne.mockResolvedValue({ ...mockPlan, status: 'IN_PROGRESS' });
      mockGetJobs.mockResolvedValue([]);
      mockPlanRunCancellationAbort.mockReturnValue(false);
      mockStampCancelRequested.mockResolvedValue('run-interactive');
      mockFindById.mockResolvedValue({ heartbeatExpected: false });

      const result = await service.cancelRun(mockPlan.id, 'user-42', testActor);

      expect(mockStampCancelRequested).toHaveBeenCalledWith(
        mockPlan.id,
        'user-42',
      );
      expect(mockPublishCancel).toHaveBeenCalledWith(mockPlan.id);
      expect(result.cancelRequested).toBe(true);
      expect(result.outcome).toBe('CANCELLATION_REQUESTED');
      // The point of the guard: the plan is left exactly as it was.
      expect(result.planStatusAfter).toBeNull();
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
      expect(mockEmitTaskStatusChanged).not.toHaveBeenCalled();
    });

    test('a local abort still reports RUN_STOPPING even for an unsupervised run', async () => {
      // Channel 0 aborting a controller this process owns is a proven stop, not a
      // request — so it earns RUN_STOPPING regardless of what the stamped row says.
      repo.findOne
        .mockResolvedValueOnce({ ...mockPlan, status: 'IN_PROGRESS' })
        .mockResolvedValueOnce({ ...mockPlan, status: 'PENDING' });
      mockGetJobs.mockResolvedValue([]);
      mockPlanRunCancellationAbort.mockReturnValue(true);
      mockStampCancelRequested.mockResolvedValue('run-interactive');
      mockFindById.mockResolvedValue({ heartbeatExpected: false });

      const result = await service.cancelRun(mockPlan.id, null, testActor);

      expect(result.outcome).toBe('RUN_STOPPING');
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
      mockTaskSelectGetMany.mockResolvedValueOnce([
        { id: 'task-queued', status: 'QUEUED' },
      ]);

      const result = await service.cancelRun(mockPlan.id, null, testActor);

      expect(remove).toHaveBeenCalledOnce();
      expect(result.removedJobIds).toEqual(['job-99']);
      expect(result.outcome).toBe('RUN_CANCELLED');
      expect(result.planStatusAfter).toBe('PENDING');
      // Routed through the applyStatusChange chokepoint: the row now persists via
      // manager.getRepository(Plan).save(...) (repo.save here) instead of the old bare
      // repo.update — same resulting row, different write API.
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ completedAt: null, status: 'PENDING' }),
      );
      expect(mockTaskUpdateQueryBuilder.set).toHaveBeenCalledWith({
        status: 'PENDING',
      });
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledWith({
        planId: mockPlan.id,
        status: 'PENDING',
        taskId: 'task-queued',
      });
      // New coverage: the bulk task-status write now captures a status_change per affected
      // task too, attributed to the request principal (cancelRun is user-initiated, fatal).
      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorKind: testActor.actorKind,
          actorSub: testActor.actorSub,
          entity: 'task',
          from: 'QUEUED',
          taskId: 'task-queued',
          to: 'PENDING',
        }),
      );
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

      const result = await service.cancelRun(mockPlan.id, null, testActor);

      expect(result.removedJobIds).toEqual([]);
      expect(result.activeJobIdsCouldNotCancel).toEqual(['job-a']);
      expect(result.planStatusAfter).toBeNull();
      expect(mockPlanRunCancellationAbort).toHaveBeenCalledWith(mockPlan.id);
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
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
        .mockResolvedValueOnce({ ...mockPlan, status: 'IN_PROGRESS' })
        .mockResolvedValueOnce({ ...mockPlan, status: 'PENDING' });
      mockTaskSelectGetMany.mockResolvedValueOnce([
        { id: 'task-queued', status: 'QUEUED' },
      ]);

      const result = await service.cancelRun(mockPlan.id, null, testActor);

      expect(result.activeJobIdsCouldNotCancel).toEqual(['job-a']);
      expect(result.signaledActiveRunToStop).toBe(true);
      expect(result.planStatusAfter).toBe('PENDING');
      // Routed through the applyStatusChange chokepoint: repo.save replaces the old bare
      // repo.update for this write.
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ completedAt: null, status: 'PENDING' }),
      );
      // New coverage: the chokepoint captures a status_change with the correct from/to for this
      // newly-routed write.
      expect(mockRecordStatusChange).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: 'plan',
          from: 'IN_PROGRESS',
          to: 'PENDING',
        }),
      );
    });
  });
});
