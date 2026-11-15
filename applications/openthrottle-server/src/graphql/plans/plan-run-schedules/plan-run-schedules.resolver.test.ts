import { BadRequestException } from '@nestjs/common';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import type {
  PlanRun,
  PlanRunSchedule,
  PlanRunSchedulesService,
  PlanRunsService,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanRunScheduleService } from '../../../queues/plans/plan-run-schedule/plan-run-schedule.service.ts';
import type { PlansLoaders } from '../loaders/loaders.service.ts';
import type { PlanStatusService } from '../plan-status/plan-status.service.ts';
import { PlanRunSchedulesResolver } from './plan-run-schedules.resolver.ts';

const NOW = new Date('2026-11-14T12:00:00Z');

const buildSchedule = (
  overrides: Partial<PlanRunSchedule> = {},
): PlanRunSchedule => {
  return asMock<PlanRunSchedule>({
    createdAt: NOW,
    createdBy: 'visormatt',
    cronPattern: '0 9 * * 1',
    enabled: true,
    id: 'schedule-1',
    misfirePolicy: 'skip',
    planId: 'plan-1',
    runOverrides: {},
    scheduleKind: 'cron',
    timezone: null,
    updatedAt: NOW,
    ...overrides,
  });
};

describe('PlanRunSchedulesResolver', () => {
  const create = vi.fn();
  const findById = vi.fn();
  const setEnabled = vi.fn();
  const update = vi.fn();
  const findScheduledByScheduleId = vi.fn();
  const materializeNext = vi.fn();
  const cancelRun = vi.fn();
  const loadScheduledRun = vi.fn();

  const resolver = new PlanRunSchedulesResolver(
    asMock<PlansLoaders>({
      scheduledRunByScheduleIdLoader: { load: loadScheduledRun },
    }),
    asMock<PlanRunScheduleService>({ materializeNext }),
    asMock<PlanRunSchedulesService>({
      create,
      findById,
      setEnabled,
      update,
    }),
    asMock<PlanRunsService>({ findScheduledByScheduleId }),
    asMock<PlanStatusService>({ cancelRun }),
  );

  beforeEach(() => {
    vi.resetAllMocks();
    materializeNext.mockResolvedValue({ kind: 'disabled' });
    cancelRun.mockResolvedValue({});
  });

  describe('createPlanRunSchedule', () => {
    it('rejects a cron the scheduler cannot honour with the reason', async () => {
      await expect(
        resolver.createPlanRunSchedule(
          { cronPattern: '* * * * *', planId: 'plan-1' },
          'visormatt',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(create).not.toHaveBeenCalled();
    });

    it('rejects an unknown timezone, misfire policy and disallowed overrides', async () => {
      await expect(
        resolver.createPlanRunSchedule({
          cronPattern: '0 9 * * 1',
          planId: 'plan-1',
          timezone: 'Mars/Base',
        }),
      ).rejects.toThrow(/timezone/i);
      await expect(
        resolver.createPlanRunSchedule({
          cronPattern: '0 9 * * 1',
          misfirePolicy: 'always',
          planId: 'plan-1',
        }),
      ).rejects.toThrow(/misfirePolicy/);
      await expect(
        resolver.createPlanRunSchedule({
          cronPattern: '0 9 * * 1',
          planId: 'plan-1',
          runOverridesJson: '{"workingDirectory":"/tmp"}',
        }),
      ).rejects.toThrow(/workingDirectory/);
      await expect(
        resolver.createPlanRunSchedule({
          cronPattern: '0 9 * * 1',
          planId: 'plan-1',
          runOverridesJson: '[1]',
        }),
      ).rejects.toThrow(/object/);
      expect(create).not.toHaveBeenCalled();
    });

    it('creates with the actor as createdBy and materializes the first occurrence', async () => {
      const schedule = buildSchedule({
        misfirePolicy: 'run_once',
        runOverrides: { model: 'opus' },
        timezone: 'America/New_York',
      });
      create.mockResolvedValue(schedule);

      const result = await resolver.createPlanRunSchedule(
        {
          cronPattern: ' 0 9 * * 1 ',
          misfirePolicy: 'run_once',
          planId: 'plan-1',
          runOverridesJson: '{"model":"opus"}',
          timezone: 'America/New_York',
        },
        'visormatt',
      );

      expect(create).toHaveBeenCalledWith({
        createdBy: 'visormatt',
        cronPattern: '0 9 * * 1',
        enabled: true,
        misfirePolicy: 'run_once',
        planId: 'plan-1',
        runOverrides: { model: 'opus' },
        timezone: 'America/New_York',
      });
      expect(materializeNext).toHaveBeenCalledWith(schedule);
      expect(result.runOverridesJson).toBe('{"model":"opus"}');
      expect(result.id).toBe('schedule-1');
    });
  });

  describe('updatePlanRunSchedule', () => {
    it('re-materializes when the cron changed: cancels the pending run first', async () => {
      const updated = buildSchedule({ cronPattern: '0 10 * * 1' });
      findById.mockResolvedValue(buildSchedule());
      update.mockResolvedValue(updated);
      findScheduledByScheduleId.mockResolvedValue(
        asMock<PlanRun>({ id: 'run-1' }),
      );

      await resolver.updatePlanRunSchedule(
        { cronPattern: '0 10 * * 1', id: 'schedule-1' },
        'user-1',
        AUTH_PRINCIPAL_KIND_USER,
      );

      expect(cancelRun).toHaveBeenCalledWith(
        'plan-1',
        'user-1',
        { actorKind: AUTH_PRINCIPAL_KIND_USER, actorSub: 'user-1' },
        'run-1',
      );
      expect(materializeNext).toHaveBeenCalledWith(updated);
      expect(cancelRun.mock.invocationCallOrder[0]).toBeLessThan(
        materializeNext.mock.invocationCallOrder[0] ?? 0,
      );
    });

    it('leaves the pending run alone when only the misfire policy changed', async () => {
      findById.mockResolvedValue(buildSchedule());
      update.mockResolvedValue(buildSchedule({ misfirePolicy: 'run_once' }));

      await resolver.updatePlanRunSchedule({
        id: 'schedule-1',
        misfirePolicy: 'run_once',
      });

      expect(cancelRun).not.toHaveBeenCalled();
      expect(materializeNext).not.toHaveBeenCalled();
    });

    it('validates the merged rule', async () => {
      findById.mockResolvedValue(buildSchedule());

      await expect(
        resolver.updatePlanRunSchedule({
          id: 'schedule-1',
          timezone: 'Mars/Base',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });

    it('404s for a missing schedule', async () => {
      findById.mockResolvedValue(null);

      await expect(
        resolver.updatePlanRunSchedule({ id: 'missing' }),
      ).rejects.toThrow(/not found/);
    });
  });

  describe('setPlanRunScheduleEnabled', () => {
    it('disable cancels the pending occurrence and does not re-materialize', async () => {
      findById.mockResolvedValue(buildSchedule());
      setEnabled.mockResolvedValue(buildSchedule({ enabled: false }));
      findScheduledByScheduleId.mockResolvedValue(
        asMock<PlanRun>({ id: 'run-1' }),
      );

      const result = await resolver.setPlanRunScheduleEnabled({
        enabled: false,
        id: 'schedule-1',
      });

      expect(setEnabled).toHaveBeenCalledWith('schedule-1', false);
      expect(cancelRun).toHaveBeenCalledTimes(1);
      expect(materializeNext).not.toHaveBeenCalled();
      expect(result.enabled).toBe(false);
    });

    it('disable with no pending occurrence is a no-op cancel', async () => {
      findById.mockResolvedValue(buildSchedule());
      setEnabled.mockResolvedValue(buildSchedule({ enabled: false }));
      findScheduledByScheduleId.mockResolvedValue(null);

      await resolver.setPlanRunScheduleEnabled({
        enabled: false,
        id: 'schedule-1',
      });

      expect(cancelRun).not.toHaveBeenCalled();
    });

    it('enable materializes the next slot', async () => {
      const enabled = buildSchedule({ enabled: true });
      findById.mockResolvedValue(buildSchedule({ enabled: false }));
      setEnabled.mockResolvedValue(enabled);

      await resolver.setPlanRunScheduleEnabled({
        enabled: true,
        id: 'schedule-1',
      });

      expect(materializeNext).toHaveBeenCalledWith(enabled);
      expect(cancelRun).not.toHaveBeenCalled();
    });
  });

  describe('occurrence fields', () => {
    it('resolve from the pending run, null when none is waiting', async () => {
      const parent = asMock<Parameters<typeof resolver.nextOccurrenceAt>[0]>({
        id: 'schedule-1',
      });
      loadScheduledRun.mockResolvedValueOnce({
        id: 'run-1',
        scheduledFor: NOW,
      });
      await expect(resolver.nextOccurrenceAt(parent)).resolves.toBe(NOW);

      loadScheduledRun.mockResolvedValueOnce({
        id: 'run-1',
        scheduledFor: NOW,
      });
      await expect(resolver.pendingPlanRunId(parent)).resolves.toBe('run-1');

      loadScheduledRun.mockResolvedValue(null);
      await expect(resolver.nextOccurrenceAt(parent)).resolves.toBeNull();
      await expect(resolver.pendingPlanRunId(parent)).resolves.toBeNull();
    });
  });
});
