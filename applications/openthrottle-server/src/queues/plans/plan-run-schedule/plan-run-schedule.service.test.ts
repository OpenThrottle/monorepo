import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanOutputStreamService,
  PlanRun,
  PlanRunSchedule,
  PlanRunSchedulesService,
  PlanRunsService,
} from '@openthrottle/nestjs-repositories';
import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanEnqueueService } from '../../../graphql/plans/plan-enqueue/plan-enqueue.service.ts';
import type { StatusChangeSystemAccountService } from '../../../graphql/work-ledger/status-change-system-account/status-change-system-account.service.ts';
import type { NotificationsService } from '../../../notifications/notifications.service.ts';
import type { PlanRunJobResult, RunPlanJobData } from '../plans.types.ts';
import { ScheduledPlanRunService } from '../scheduled-plan-run/scheduled-plan-run.service.ts';
import { PlanRunScheduleService } from './plan-run-schedule.service.ts';

const NOW = new Date('2026-11-14T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1_000;
// 0 9 * * * in UTC: the slot before NOW is 11-14 09:00, the one after is 11-15 09:00.
const NEXT_SLOT = new Date('2026-11-15T09:00:00.000Z');
const PREVIOUS_SLOT = new Date('2026-11-14T09:00:00.000Z');

const buildSchedule = (
  overrides: Partial<PlanRunSchedule> = {},
): PlanRunSchedule => {
  return {
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    createdBy: null,
    cronPattern: '0 9 * * *',
    enabled: true,
    id: 'schedule-1',
    misfirePolicy: 'skip',
    planId: 'plan-1',
    runOverrides: {},
    scheduleKind: 'cron',
    timezone: null,
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  };
};

describe('PlanRunScheduleService', () => {
  const mockMaterialize = vi.fn();
  const mockFindScheduledByScheduleId = vi.fn();
  const mockServedFindOne = vi.fn();
  const mockFindByPlanId = vi.fn();
  const mockFindById = vi.fn();
  const mockListEnabled = vi.fn();
  const mockSetEnabled = vi.fn();

  const service = new PlanRunScheduleService(
    createMock<LoggerService>(),
    createMock<PlanEnqueueService>({
      materializeScheduleOccurrence: mockMaterialize,
    }),
    createMock<PlanRunSchedulesService>({
      findById: mockFindById,
      findByPlanId: mockFindByPlanId,
      listEnabled: mockListEnabled,
      setEnabled: mockSetEnabled,
    }),
    createMock<PlanRunsService>({
      findScheduledByScheduleId: mockFindScheduledByScheduleId,
      getRepository: vi.fn().mockReturnValue({ findOne: mockServedFindOne }),
    }),
    createMock<StatusChangeSystemAccountService>({
      resolveId: vi.fn().mockResolvedValue('system-account-id'),
    }),
  );

  const materializedScheduledFor = (call = 0): Date | undefined => {
    return mockMaterialize.mock.calls[call]?.[0]?.scheduledFor;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMaterialize.mockResolvedValue({
      jobId: 'job',
      kind: 'materialized',
      planStatusMoved: false,
    });
    mockFindScheduledByScheduleId.mockResolvedValue(null);
    mockServedFindOne.mockResolvedValue(null);
    mockFindByPlanId.mockResolvedValue([]);
    mockFindById.mockResolvedValue(null);
    mockListEnabled.mockResolvedValue([]);
    mockSetEnabled.mockResolvedValue(null);
  });

  describe('materializeNext', () => {
    it('materializes the first slot strictly after now, as the system account', async () => {
      const schedule = buildSchedule();

      const result = await service.materializeNext(schedule, NOW);

      expect(result.kind).toBe('attempted');
      expect(mockMaterialize).toHaveBeenCalledWith({
        actorKind: 'service_account',
        actorSub: 'system-account-id',
        now: NOW,
        schedule,
        scheduledFor: NEXT_SLOT,
      });
    });

    it('computes the slot in the schedule timezone (09:00 New York is 14:00Z in November)', async () => {
      await service.materializeNext(
        buildSchedule({ timezone: 'America/New_York' }),
        NOW,
      );

      expect(materializedScheduledFor()).toEqual(
        new Date('2026-11-14T14:00:00.000Z'),
      );
    });

    it('is a no-op while the schedule already has a SCHEDULED occurrence (never two at once)', async () => {
      mockFindScheduledByScheduleId.mockResolvedValue({ id: 'run-existing' });

      await expect(
        service.materializeNext(buildSchedule(), NOW),
      ).resolves.toEqual({
        kind: 'occurrence_exists',
        planRunId: 'run-existing',
      });
      expect(mockMaterialize).not.toHaveBeenCalled();
    });

    it('does nothing for a disabled schedule', async () => {
      await expect(
        service.materializeNext(buildSchedule({ enabled: false }), NOW),
      ).resolves.toEqual({ kind: 'disabled' });
      expect(mockMaterialize).not.toHaveBeenCalled();
    });

    it('loads a schedule by id, and reports a missing one', async () => {
      await expect(service.materializeNext('gone', NOW)).resolves.toEqual({
        kind: 'schedule_not_found',
      });

      mockFindById.mockResolvedValueOnce(buildSchedule());
      await service.materializeNext('schedule-1', NOW);

      expect(mockMaterialize).toHaveBeenCalledTimes(1);
    });

    it('computes the slot after the settled slot when that is later than now (an early-firing job)', async () => {
      await service.materializeNext(
        buildSchedule(),
        new Date('2026-11-14T08:59:59.990Z'),
        PREVIOUS_SLOT,
      );

      expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
    });

    it('reports an invalid pattern as no_next_slot', async () => {
      await expect(
        service.materializeNext(buildSchedule({ cronPattern: 'bogus' }), NOW),
      ).resolves.toEqual({ kind: 'no_next_slot' });
    });

    it('never throws: an unexpected error is returned as failed', async () => {
      mockMaterialize.mockRejectedValue(new Error('db down'));

      await expect(
        service.materializeNext(buildSchedule(), NOW),
      ).resolves.toEqual({ kind: 'failed', reason: 'db down' });
    });
  });

  describe('onScheduledRunSettled', () => {
    it('continues every enabled schedule of the plan and skips disabled ones', async () => {
      mockFindByPlanId.mockResolvedValue([
        buildSchedule({ id: 'a' }),
        buildSchedule({ enabled: false, id: 'b' }),
        buildSchedule({ cronPattern: '0 10 * * *', id: 'c' }),
      ]);

      const results = await service.onScheduledRunSettled('plan-1', NOW);

      expect(results).toHaveLength(2);
      expect(mockMaterialize).toHaveBeenCalledTimes(2);
    });

    it('does nothing for a plan with no schedule', async () => {
      await expect(
        service.onScheduledRunSettled('plan-1', NOW),
      ).resolves.toEqual([]);
      expect(mockMaterialize).not.toHaveBeenCalled();
    });

    it('a run_once schedule fires one catch-up 5 seconds out after its own occurrence was missed', async () => {
      mockFindByPlanId.mockResolvedValue([
        buildSchedule({ misfirePolicy: 'run_once' }),
      ]);

      await service.onScheduledRunSettled('plan-1', NOW, {
        missedRunScheduleId: 'schedule-1',
        settledSlot: PREVIOUS_SLOT,
      });

      expect(materializedScheduledFor()).toEqual(
        new Date(NOW.getTime() + 5_000),
      );
    });

    it('a skip schedule just materializes the next future slot after a miss', async () => {
      mockFindByPlanId.mockResolvedValue([buildSchedule()]);

      await service.onScheduledRunSettled('plan-1', NOW, {
        missedRunScheduleId: 'schedule-1',
        settledSlot: PREVIOUS_SLOT,
      });

      expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
    });

    it('a run_once schedule does not catch up for another schedule miss', async () => {
      mockFindByPlanId.mockResolvedValue([
        buildSchedule({ misfirePolicy: 'run_once' }),
      ]);

      await service.onScheduledRunSettled('plan-1', NOW, {
        missedRunScheduleId: 'schedule-other',
        settledSlot: null,
      });

      expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
    });

    it('never throws into the settle path when the schedules cannot be read', async () => {
      mockFindByPlanId.mockRejectedValue(new Error('db down'));

      await expect(
        service.onScheduledRunSettled('plan-1', NOW),
      ).resolves.toEqual([]);
    });

    it('a failing schedule does not stop the others', async () => {
      mockFindByPlanId.mockResolvedValue([
        buildSchedule({ id: 'a' }),
        buildSchedule({ id: 'b' }),
      ]);
      mockMaterialize.mockRejectedValueOnce(new Error('boom'));

      const results = await service.onScheduledRunSettled('plan-1', NOW);

      expect(results.map((result) => result.kind)).toEqual([
        'failed',
        'attempted',
      ]);
    });
  });

  describe('onPlanStatusChangedCancellingOccurrence', () => {
    it('continues the chain when a non-terminal status change cancelled the occurrence', async () => {
      mockFindByPlanId.mockResolvedValue([buildSchedule()]);

      await service.onPlanStatusChangedCancellingOccurrence(
        'plan-1',
        'PENDING',
        ['run-1'],
      );

      expect(mockMaterialize).toHaveBeenCalledTimes(1);
      expect(mockSetEnabled).not.toHaveBeenCalled();
    });

    it.each(['CANCELED', 'COMPLETED'])(
      'disables every enabled schedule and materializes nothing when the target is %s',
      async (status) => {
        mockFindByPlanId.mockResolvedValue([
          buildSchedule({ id: 'schedule-1' }),
          buildSchedule({ enabled: false, id: 'schedule-2' }),
          buildSchedule({ id: 'schedule-3' }),
        ]);

        await service.onPlanStatusChangedCancellingOccurrence(
          'plan-1',
          status,
          ['run-1'],
        );

        expect(mockSetEnabled).toHaveBeenCalledTimes(2);
        expect(mockSetEnabled).toHaveBeenCalledWith('schedule-1', false);
        expect(mockSetEnabled).toHaveBeenCalledWith('schedule-3', false);
        expect(mockMaterialize).not.toHaveBeenCalled();
      },
    );

    it('does nothing when the status change cancelled no scheduled run', async () => {
      mockFindByPlanId.mockResolvedValue([buildSchedule()]);

      await service.onPlanStatusChangedCancellingOccurrence(
        'plan-1',
        'CANCELED',
        [],
      );

      expect(mockFindByPlanId).not.toHaveBeenCalled();
      expect(mockSetEnabled).not.toHaveBeenCalled();
      expect(mockMaterialize).not.toHaveBeenCalled();
    });

    it('swallows an error instead of failing the status mutation', async () => {
      mockFindByPlanId.mockRejectedValue(new Error('db down'));

      await expect(
        service.onPlanStatusChangedCancellingOccurrence('plan-1', 'CANCELED', [
          'run-1',
        ]),
      ).resolves.toBeUndefined();
    });
  });

  describe('reconcileOnStartup', () => {
    it('materializes the next slot for a schedule with no occurrence', async () => {
      mockListEnabled.mockResolvedValue([buildSchedule()]);

      await service.reconcileOnStartup(NOW);

      expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
    });

    it('leaves a schedule that already has its occurrence alone', async () => {
      mockListEnabled.mockResolvedValue([buildSchedule()]);
      mockFindScheduledByScheduleId.mockResolvedValue({ id: 'run-1' });

      await expect(service.reconcileOnStartup(NOW)).resolves.toEqual([
        { kind: 'occurrence_exists', planRunId: 'run-1' },
      ]);
      expect(mockMaterialize).not.toHaveBeenCalled();
    });

    describe('run_once', () => {
      const runOnce = buildSchedule({ misfirePolicy: 'run_once' });

      beforeEach(() => {
        mockListEnabled.mockResolvedValue([runOnce]);
      });

      it('fires one catch-up when the most recent past slot is unserved', async () => {
        await service.reconcileOnStartup(NOW);

        expect(mockMaterialize).toHaveBeenCalledTimes(1);
        expect(materializedScheduledFor()).toEqual(
          new Date(NOW.getTime() + 5_000),
        );
        expect(mockServedFindOne).toHaveBeenCalledWith({
          where: {
            planRunScheduleId: 'schedule-1',
            scheduledFor: expect.objectContaining({ _type: 'moreThanOrEqual' }),
          },
        });
      });

      it('does not catch up a slot a run (a MISSED or catch-up row included) already covers', async () => {
        mockServedFindOne.mockResolvedValue({ id: 'covers' });

        await service.reconcileOnStartup(NOW);

        expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
      });

      it('does not catch up a slot older than the schedule last edit', async () => {
        mockListEnabled.mockResolvedValue([
          buildSchedule({
            misfirePolicy: 'run_once',
            updatedAt: new Date(PREVIOUS_SLOT.getTime() + HOUR_MS),
          }),
        ]);

        await service.reconcileOnStartup(NOW);

        expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
        expect(mockServedFindOne).not.toHaveBeenCalled();
      });

      it('does not catch up a slot more than a week old', async () => {
        // Monthly on the 1st: the latest past slot (11-01) is 13 days old at NOW.
        mockListEnabled.mockResolvedValue([
          buildSchedule({
            cronPattern: '0 9 1 * *',
            misfirePolicy: 'run_once',
          }),
        ]);

        await service.reconcileOnStartup(NOW);

        expect(materializedScheduledFor()).toEqual(
          new Date('2026-12-01T09:00:00.000Z'),
        );
      });
    });

    it('skip schedules never catch up, even with an unserved past slot', async () => {
      mockListEnabled.mockResolvedValue([buildSchedule()]);

      await service.reconcileOnStartup(NOW);

      expect(mockServedFindOne).not.toHaveBeenCalled();
      expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
    });

    it('is best-effort per schedule and never throws', async () => {
      mockListEnabled.mockResolvedValue([
        buildSchedule({ id: 'a' }),
        buildSchedule({ id: 'b' }),
      ]);
      mockFindScheduledByScheduleId.mockRejectedValueOnce(new Error('boom'));

      const results = await service.reconcileOnStartup(NOW);

      expect(results.map((result) => result.kind)).toEqual([
        'failed',
        'attempted',
      ]);

      mockListEnabled.mockRejectedValue(new Error('db down'));
      await expect(service.reconcileOnStartup(NOW)).resolves.toEqual([]);
    });
  });

  // The chain through the real ScheduledPlanRunService settle hooks: every way an occurrence can
  // settle materializes the next future slot, and only a cancel-raced `not_scheduled` leaves it to
  // the cancel path.
  describe('chain continues after every settle path (through ScheduledPlanRunService)', () => {
    const mockFireScheduledRun = vi.fn();
    const mockTransitionScheduledRun = vi.fn();
    const mockFindScheduledRunsWithJob = vi.fn();
    const mockGetJob = vi.fn();

    const scheduled = new ScheduledPlanRunService(
      createMock<LoggerService>(),
      createMock<NotificationsService>(),
      createMock<PlanEnqueueService>({
        fireScheduledRun: mockFireScheduledRun,
        releaseScheduledPlan: vi.fn().mockResolvedValue(true),
      }),
      createMock<PlanOutputStreamService>({
        getRepository: vi.fn().mockReturnValue({
          create: vi.fn((chunk: object) => chunk),
          save: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      service,
      createMock<PlanRunsService>({
        findScheduledRunsWithJob: mockFindScheduledRunsWithJob,
        transitionScheduledRun: mockTransitionScheduledRun,
      }),
      createMock<Queue<RunPlanJobData, PlanRunJobResult | void>>({
        getJob: mockGetJob,
      }),
      createMock<StatusChangeSystemAccountService>({
        resolveId: vi.fn().mockResolvedValue('system-account-id'),
      }),
    );

    const occurrence = (scheduledFor: Date): PlanRun => {
      return createMock<PlanRun>({
        bullmqJobId: 'scheduled-plan-run-sched-schedule-1-1',
        id: 'run-1',
        planId: 'plan-1',
        planRunScheduleId: 'schedule-1',
        scheduledFor,
        status: 'SCHEDULED',
      });
    };

    beforeEach(() => {
      mockFindByPlanId.mockResolvedValue([buildSchedule()]);
      mockTransitionScheduledRun.mockResolvedValue(true);
      mockGetJob.mockResolvedValue(undefined);
    });

    it.each([
      ['fire', { kind: 'fire' }],
      ['missed', { kind: 'missed', reason: 'it was 75 minutes late' }],
      ['superseded', { kind: 'superseded', reason: 'plan already active' }],
      ['nothing_to_run', { kind: 'nothing_to_run', reason: 'no tasks left' }],
      [
        'workspace_missing',
        { kind: 'workspace_missing', reason: 'workingDirectory is gone' },
      ],
    ])('%s: the next future slot is materialized', async (_name, outcome) => {
      mockFireScheduledRun.mockResolvedValue(outcome);

      await scheduled.fire({
        now: PREVIOUS_SLOT,
        run: occurrence(PREVIOUS_SLOT),
        workingDirectory: undefined,
      });

      expect(mockMaterialize).toHaveBeenCalledTimes(1);
      expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
    });

    it('not_scheduled (cancel-raced): the fire path leaves the chain to the cancel path', async () => {
      mockFireScheduledRun.mockResolvedValue({ kind: 'not_scheduled' });

      await scheduled.fire({
        now: PREVIOUS_SLOT,
        run: occurrence(PREVIOUS_SLOT),
        workingDirectory: undefined,
      });

      expect(mockMaterialize).not.toHaveBeenCalled();
    });

    it('cancel: PlansResolver.cancelPlanRun calls onScheduledRunSettled, which materializes the next slot', async () => {
      await service.onScheduledRunSettled('plan-1', NOW);

      expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
    });

    it('boot MISSED: the lost job is settled MISSED and the next slot is materialized', async () => {
      mockFindScheduledRunsWithJob.mockResolvedValue([
        occurrence(new Date(NOW.getTime() - 2 * HOUR_MS)),
      ]);

      await scheduled.reconcileOnStartup(NOW);

      expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
        'run-1',
        'MISSED',
        undefined,
        expect.any(String),
      );
      expect(materializedScheduledFor()).toEqual(NEXT_SLOT);
    });

    it('boot MISSED on a run_once schedule: one catch-up instead of the next slot', async () => {
      mockFindByPlanId.mockResolvedValue([
        buildSchedule({ misfirePolicy: 'run_once' }),
      ]);
      mockFindScheduledRunsWithJob.mockResolvedValue([
        occurrence(new Date(NOW.getTime() - 2 * HOUR_MS)),
      ]);

      await scheduled.reconcileOnStartup(NOW);

      expect(mockMaterialize).toHaveBeenCalledTimes(1);
      expect(materializedScheduledFor()).toEqual(
        new Date(NOW.getTime() + 5_000),
      );
    });
  });
});
