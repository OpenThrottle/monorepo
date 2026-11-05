import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { ScheduledAgentJobsService } from '@openthrottle/nestjs-repositories';
import { type ScheduledAgentJob } from '@openthrottle/nestjs-repositories';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduledAgentJobFailureNotifierService } from './scheduled-agent-job-failure-notifier.service.ts';
import type { ScheduledAgentJobSchedulerService } from './scheduled-agent-job-scheduler.service.ts';
import { ScheduledAgentJobsReconcileService } from './scheduled-agent-jobs-reconcile.service.ts';

const job = (id: string): ScheduledAgentJob => {
  return createMock<ScheduledAgentJob>({
    id,
    schedulerKey: `scheduled-job:${id}`,
  });
};

describe('ScheduledAgentJobsReconcileService', () => {
  let jobsService: ScheduledAgentJobsService;
  let scheduler: ScheduledAgentJobSchedulerService;
  let failureNotifier: ScheduledAgentJobFailureNotifierService;
  let service: ScheduledAgentJobsReconcileService;

  beforeEach(() => {
    jobsService = createMock<ScheduledAgentJobsService>({
      listEnabledJobs: vi.fn().mockResolvedValue([]),
      updateNextRunAt: vi.fn().mockResolvedValue(undefined),
    });
    scheduler = createMock<ScheduledAgentJobSchedulerService>({
      listOwnedSchedulerIds: vi.fn().mockResolvedValue([]),
      removeScheduler: vi.fn().mockResolvedValue(undefined),
      upsertScheduler: vi
        .fn()
        .mockResolvedValue(new Date('2026-07-01T00:00:00Z')),
    });
    failureNotifier = createMock<ScheduledAgentJobFailureNotifierService>({
      notify: vi.fn().mockResolvedValue(undefined),
    });
    service = new ScheduledAgentJobsReconcileService(
      createMock<LoggerService>(),
      jobsService,
      scheduler,
      failureNotifier,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('upserts each enabled schedule, stores next run, and removes orphans', async () => {
    vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([
      job('a'),
      job('b'),
    ]);
    vi.mocked(scheduler.listOwnedSchedulerIds).mockResolvedValue([
      'scheduled-job:a',
      'scheduled-job:b',
      'scheduled-job:stale', // no enabled row → orphan
    ]);

    await service.reconcile();

    expect(scheduler.upsertScheduler).toHaveBeenCalledTimes(2);
    expect(jobsService.updateNextRunAt).toHaveBeenCalledWith(
      'a',
      new Date('2026-07-01T00:00:00Z'),
    );
    expect(scheduler.removeScheduler).toHaveBeenCalledExactlyOnceWith(
      'scheduled-job:stale',
    );
  });

  it('never touches queued runs or their delayed jobs (it only converges schedulers)', async () => {
    // A usage-limit resume is a queued run row whose BullMQ job is DELAYED under its own jobId
    // (usage-limit-resume-<runId>), not a repeatable scheduler. The reconciler lists only
    // `scheduled-job:`-prefixed schedulers and reads no run rows, so a delayed resume survives.
    vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([job('a')]);
    vi.mocked(scheduler.listOwnedSchedulerIds).mockResolvedValue([
      'scheduled-job:a',
    ]);

    await service.reconcile();

    expect(scheduler.removeScheduler).not.toHaveBeenCalled();
    expect(jobsService.getRunRepository).not.toHaveBeenCalled();
    expect(jobsService.findRunById).not.toHaveBeenCalled();
  });

  it('onModuleInit runs reconcile when this checkout is the boot owner', async () => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');
    const spy = vi.spyOn(service, 'reconcile').mockResolvedValue();

    await service.onModuleInit();

    expect(spy).toHaveBeenCalledOnce();
  });

  it('onModuleInit skips reconcile when this checkout is not the boot owner', async () => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'false');
    const spy = vi.spyOn(service, 'reconcile').mockResolvedValue();

    await service.onModuleInit();

    expect(spy).not.toHaveBeenCalled();
  });

  describe('missed fires', () => {
    // Booted just before noon after a ~3.5h outage; an hourly schedule missed 09:00, 10:00 and 11:00.
    const BOOT = new Date('2026-11-02T11:59:00Z');
    const MISSED = [
      new Date('2026-11-02T09:00:00Z'),
      new Date('2026-11-02T10:00:00Z'),
      new Date('2026-11-02T11:00:00Z'),
    ];

    const hourly = (
      misfirePolicy: ScheduledAgentJob['misfirePolicy'],
      updatedAt = new Date('2026-11-02T08:30:00Z'),
    ): ScheduledAgentJob => {
      return createMock<ScheduledAgentJob>({
        cronPattern: '0 * * * *',
        driverId: 'claude',
        id: 'a',
        misfirePolicy,
        misfireThresholdMs: 10 * 60_000,
        model: null,
        schedulerKey: 'scheduled-job:a',
        timezone: null,
        updatedAt,
      });
    };

    const missedCall = (index: number): unknown => {
      return vi.mocked(jobsService.recordMissedRuns).mock.calls[index]?.[0];
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(BOOT);
      vi.spyOn(process, 'uptime').mockReturnValue(0);
      vi.mocked(jobsService.findLatestScheduledFor).mockResolvedValue(null);
      vi.mocked(jobsService.hasLateRunSince).mockResolvedValue(false);
      vi.mocked(jobsService.recordMissedRuns).mockImplementation(
        async (input) => input.slots.length,
      );
      vi.mocked(scheduler.enqueueCatchUp).mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    describe('when the policy is skip', () => {
      it('records every missed slot as late, runs none, then re-registers', async () => {
        vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([
          hourly('skip'),
        ]);

        await service.reconcile();

        expect(missedCall(0)).toEqual(
          expect.objectContaining({
            errorMessage: expect.stringContaining('more than 10 min late'),
            scheduledAgentJobId: 'a',
            slots: MISSED,
          }),
        );
        expect(missedCall(1)).toEqual(expect.objectContaining({ slots: [] }));
        expect(scheduler.enqueueCatchUp).not.toHaveBeenCalled();
        expect(scheduler.upsertScheduler).toHaveBeenCalledTimes(1);
      });

      it('sends the owner one missed notice covering every recorded slot', async () => {
        vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([
          hourly('skip'),
        ]);

        await service.reconcile();

        expect(failureNotifier.notify).toHaveBeenCalledExactlyOnceWith({
          errorMessage: expect.stringContaining('more than 10 min late'),
          reason: 'missed',
          runCount: MISSED.length,
          runId: undefined,
          scheduledAgentJobId: 'a',
        });
      });
    });

    describe('when the schedule is an interval', () => {
      it('records nothing missed and just re-arms it, so an overdue fire runs once, late', async () => {
        vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([
          createMock<ScheduledAgentJob>({
            cronPattern: null,
            id: 'i',
            intervalMs: 60 * 60_000,
            scheduleKind: 'interval',
            schedulerKey: 'scheduled-job:i',
          }),
        ]);

        await service.reconcile();

        expect(jobsService.recordMissedRuns).not.toHaveBeenCalled();
        expect(scheduler.enqueueCatchUp).not.toHaveBeenCalled();
        expect(scheduler.upsertScheduler).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the policy is catch_up_once', () => {
      it('enqueues one catch-up for the latest slot and supersedes the rest, before re-registering', async () => {
        const schedule = hourly('catch_up_once');
        vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([schedule]);

        await service.reconcile();

        expect(missedCall(1)).toEqual(
          expect.objectContaining({
            errorMessage: expect.stringContaining('at most one late run'),
            slots: MISSED.slice(0, 2),
          }),
        );
        expect(scheduler.enqueueCatchUp).toHaveBeenCalledExactlyOnceWith(
          schedule,
          MISSED[2],
        );
        const enqueuedAt =
          vi.mocked(scheduler.enqueueCatchUp).mock.invocationCallOrder[0] ?? 0;
        const recordedAt =
          vi.mocked(jobsService.recordMissedRuns).mock.invocationCallOrder[1] ??
          Infinity;
        const upsertedAt =
          vi.mocked(scheduler.upsertScheduler).mock.invocationCallOrder[0] ?? 0;
        expect(recordedAt).toBeLessThan(enqueuedAt);
        expect(enqueuedAt).toBeLessThan(upsertedAt);
      });

      it('enqueues nothing when the worker already ran the surviving overdue job', async () => {
        vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([
          hourly('catch_up_once'),
        ]);
        vi.mocked(jobsService.hasLateRunSince).mockResolvedValue(true);

        await service.reconcile();

        expect(scheduler.enqueueCatchUp).not.toHaveBeenCalled();
        expect(missedCall(1)).toEqual(
          expect.objectContaining({ slots: MISSED }),
        );
      });
    });

    describe('when slots are already on record', () => {
      it('starts the window after the newest recorded slot', async () => {
        vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([
          hourly('skip'),
        ]);
        vi.mocked(jobsService.findLatestScheduledFor).mockResolvedValue(
          MISSED[1] ?? null,
        );

        await service.reconcile();

        expect(jobsService.findLatestScheduledFor).toHaveBeenCalledWith(
          'a',
          BOOT,
        );
        expect(missedCall(0)).toEqual(
          expect.objectContaining({ slots: MISSED.slice(2) }),
        );
      });
    });

    describe('when no fire came due while the server was down', () => {
      it('records nothing', async () => {
        vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([
          hourly('skip', new Date('2026-11-02T11:30:00Z')),
        ]);

        await service.reconcile();

        expect(jobsService.recordMissedRuns).not.toHaveBeenCalled();
        expect(failureNotifier.notify).not.toHaveBeenCalled();
        expect(scheduler.upsertScheduler).toHaveBeenCalledTimes(1);
      });
    });

    describe('when settling fails', () => {
      it('still registers the schedule', async () => {
        vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([
          hourly('skip'),
        ]);
        vi.mocked(jobsService.findLatestScheduledFor).mockRejectedValue(
          new Error('db down'),
        );

        await service.reconcile();

        expect(scheduler.upsertScheduler).toHaveBeenCalledTimes(1);
      });
    });
  });
});
