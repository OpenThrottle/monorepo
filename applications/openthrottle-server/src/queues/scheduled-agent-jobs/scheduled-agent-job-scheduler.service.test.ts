import { createMock } from '@golevelup/ts-vitest';
import type {
  ScheduledAgentJobCheckoutPathService,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import { type ScheduledAgentJob } from '@openthrottle/nestjs-repositories';
import type { Job, Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildScheduledAgentJobPayload,
  ScheduledAgentJobSchedulerService,
} from './scheduled-agent-job-scheduler.service.ts';
import type { ScheduledAgentJobPayload } from './scheduled-agent-jobs.types.ts';

const makeJob = (
  overrides: Partial<ScheduledAgentJob> = {},
): ScheduledAgentJob =>
  createMock<ScheduledAgentJob>({
    cronPattern: '0 9 * * *',
    cwd: null,
    driverId: 'claude',
    id: 'job-1',
    model: 'opus',
    ownerUserId: 'user-1',
    prompt: 'audit deps',
    repositoryCheckoutId: null,
    schedulerKey: 'scheduled-job:job-1',
    settings: {},
    timeoutMs: null,
    timezone: 'America/Los_Angeles',
    ...overrides,
  });

describe('ScheduledAgentJobSchedulerService', () => {
  let checkoutPaths: ScheduledAgentJobCheckoutPathService;
  let jobsService: ScheduledAgentJobsService;
  let queue: Queue<ScheduledAgentJobPayload, void>;
  let service: ScheduledAgentJobSchedulerService;

  beforeEach(() => {
    checkoutPaths = createMock<ScheduledAgentJobCheckoutPathService>({
      resolve: vi.fn().mockResolvedValue({ path: '/repos/monorepo' }),
    });
    queue = createMock<Queue<ScheduledAgentJobPayload, void>>({
      add: vi.fn().mockResolvedValue({}),
      getJobScheduler: vi.fn().mockResolvedValue(undefined),
      getJobSchedulers: vi.fn().mockResolvedValue([]),
      getJobs: vi.fn().mockResolvedValue([]),
      removeJobScheduler: vi.fn().mockResolvedValue(true),
      upsertJobScheduler: vi.fn().mockResolvedValue({}),
    });
    jobsService = createMock<ScheduledAgentJobsService>({
      hasRunForSlot: vi.fn().mockResolvedValue(false),
    });
    service = new ScheduledAgentJobSchedulerService(
      checkoutPaths,
      queue,
      jobsService,
    );
  });

  it('builds a run snapshot with no runId (scheduled fire creates its own row)', () => {
    const payload = buildScheduledAgentJobPayload(makeJob());
    expect(payload).toEqual({
      cwd: null,
      driverId: 'claude',
      model: 'opus',
      prompt: 'audit deps',
      repositoryCheckoutId: null,
      scheduleId: 'job-1',
      settings: {},
      timeoutMs: null,
    });
    expect('runId' in payload).toBe(false);
  });

  it('snapshots the resolved checkout path as the payload cwd, keeping the checkout id', () => {
    const payload = buildScheduledAgentJobPayload(
      makeJob({ repositoryCheckoutId: 'checkout-1' }),
      '/repos/monorepo',
    );
    expect(payload.cwd).toBe('/repos/monorepo');
    expect(payload.repositoryCheckoutId).toBe('checkout-1');
  });

  it('leaves the legacy explicit cwd in place when no checkout is targeted', () => {
    const payload = buildScheduledAgentJobPayload(
      makeJob({ cwd: '/legacy/path' }),
      null,
    );
    expect(payload.cwd).toBe('/legacy/path');
    expect(payload.repositoryCheckoutId).toBeNull();
  });

  it('resolves the targeted checkout for the schedule owner when upserting', async () => {
    await service.upsertScheduler(
      makeJob({ ownerUserId: 'user-1', repositoryCheckoutId: 'checkout-1' }),
    );

    expect(checkoutPaths.resolve).toHaveBeenCalledWith({
      checkoutId: 'checkout-1',
      ownerUserId: 'user-1',
    });
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          cwd: '/repos/monorepo',
          repositoryCheckoutId: 'checkout-1',
        }),
      }),
    );
  });

  it('does not resolve a checkout for a schedule that targets none', async () => {
    await service.upsertScheduler(makeJob({ repositoryCheckoutId: null }));
    expect(checkoutPaths.resolve).not.toHaveBeenCalled();
  });

  it('falls back to the legacy cwd when the targeted checkout no longer resolves', async () => {
    vi.mocked(checkoutPaths.resolve).mockResolvedValue({ error: 'not-found' });

    await service.upsertScheduler(
      makeJob({ cwd: '/legacy/path', repositoryCheckoutId: 'gone' }),
    );

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({ cwd: '/legacy/path' }),
      }),
    );
  });

  it('upserts a scheduler keyed by schedulerKey with pattern + tz and reads back next run', async () => {
    const nextMs = Date.UTC(2026, 6, 1, 16, 0, 0);
    vi.mocked(queue.getJobScheduler).mockResolvedValue({
      key: 'scheduled-job:job-1',
      name: 'scheduled-agent-job',
      next: nextMs,
    });

    const next = await service.upsertScheduler(makeJob());

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
      { pattern: '0 9 * * *', tz: 'America/Los_Angeles' },
      expect.objectContaining({
        data: expect.objectContaining({ scheduleId: 'job-1' }),
        name: 'scheduled-agent-job',
        opts: expect.objectContaining({ attempts: 1 }),
      }),
    );
    expect(next).toEqual(new Date(nextMs));
  });

  it('omits tz when the schedule has no timezone', async () => {
    await service.upsertScheduler(makeJob({ timezone: null }));
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
      { pattern: '0 9 * * *' },
      expect.anything(),
    );
  });

  it('removeScheduler delegates to removeJobScheduler', async () => {
    await service.removeScheduler('scheduled-job:job-1');
    expect(queue.removeJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
    );
  });

  it('lists only owned (scheduled-job:*) scheduler ids', async () => {
    vi.mocked(queue.getJobSchedulers).mockResolvedValue([
      { id: 'scheduled-job:a', key: 'k1', name: 'n' },
      { id: 'database-backup', key: 'k2', name: 'n' },
      { id: 'scheduled-job:b', key: 'k3', name: 'n' },
    ]);

    expect(await service.listOwnedSchedulerIds()).toEqual([
      'scheduled-job:a',
      'scheduled-job:b',
    ]);
  });

  describe('interval and once schedules', () => {
    const MINUTE = 60_000;
    const NOW = Date.UTC(2026, 10, 1, 12, 0, 0);

    /** A pending BullMQ job as `getJobs` returns it, with a spy on `remove`. */
    const pendingJob = (
      data: Partial<ScheduledAgentJobPayload>,
    ): Job<ScheduledAgentJobPayload, void> =>
      createMock<Job<ScheduledAgentJobPayload, void>>({
        data: {
          driverId: 'claude',
          prompt: 'p',
          scheduleId: 'job-1',
          ...data,
        },
        remove: vi.fn().mockResolvedValue(undefined),
      });

    beforeEach(() => {
      vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('when an interval schedule is upserted', () => {
      it('arms one delayed fire an interval after the last run finished, and no cron scheduler', async () => {
        const lastRunAt = new Date(NOW - 10 * MINUTE);

        const next = await service.upsertScheduler(
          makeJob({
            cronPattern: null,
            intervalMs: 30 * MINUTE,
            lastRunAt,
            scheduleKind: 'interval',
          }),
        );

        const slot = new Date(NOW + 20 * MINUTE);
        expect(next).toEqual(slot);
        expect(queue.removeJobScheduler).toHaveBeenCalledWith(
          'scheduled-job:job-1',
        );
        expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
        expect(queue.add).toHaveBeenCalledWith(
          'scheduled-agent-job',
          expect.objectContaining({
            scheduleId: 'job-1',
            slotMs: slot.getTime(),
          }),
          expect.objectContaining({
            delay: 20 * MINUTE,
            jobId: `scheduled-job-fire-job-1-${slot.getTime()}`,
          }),
        );
      });
    });

    describe('when an interval schedule has never run', () => {
      it('counts the interval from now', async () => {
        const next = await service.upsertScheduler(
          makeJob({
            cronPattern: null,
            intervalMs: 30 * MINUTE,
            lastRunAt: null,
            scheduleKind: 'interval',
          }),
        );

        expect(next).toEqual(new Date(NOW + 30 * MINUTE));
      });
    });

    describe('when the interval came due while the server was down', () => {
      it('enqueues the overdue fire with no delay, keeping its slot', async () => {
        const lastRunAt = new Date(NOW - 3 * 60 * MINUTE);

        const next = await service.upsertScheduler(
          makeJob({
            cronPattern: null,
            intervalMs: 60 * MINUTE,
            lastRunAt,
            scheduleKind: 'interval',
          }),
        );

        expect(next).toEqual(new Date(NOW - 2 * 60 * MINUTE));
        expect(queue.add).toHaveBeenCalledWith(
          'scheduled-agent-job',
          expect.anything(),
          expect.objectContaining({ delay: 0 }),
        );
      });
    });

    describe('when the schedule already has a pending fire', () => {
      it('removes it before arming, leaving other schedules alone', async () => {
        const stale = pendingJob({ slotMs: NOW + MINUTE });
        const otherSchedule = pendingJob({
          scheduleId: 'job-2',
          slotMs: NOW + MINUTE,
        });
        const cronFire = pendingJob({});
        vi.mocked(queue.getJobs).mockResolvedValue([
          stale,
          otherSchedule,
          cronFire,
        ]);

        await service.upsertScheduler(
          makeJob({
            cronPattern: null,
            intervalMs: 30 * MINUTE,
            lastRunAt: null,
            scheduleKind: 'interval',
          }),
        );

        expect(stale.remove).toHaveBeenCalled();
        expect(otherSchedule.remove).not.toHaveBeenCalled();
        expect(cronFire.remove).not.toHaveBeenCalled();
      });
    });

    describe('when a once schedule is upserted', () => {
      it('arms its single fire at runAt', async () => {
        const runAt = new Date(NOW + 90 * MINUTE);

        const next = await service.upsertScheduler(
          makeJob({ cronPattern: null, runAt, scheduleKind: 'once' }),
        );

        expect(next).toEqual(runAt);
        expect(queue.add).toHaveBeenCalledWith(
          'scheduled-agent-job',
          expect.objectContaining({ slotMs: runAt.getTime() }),
          expect.objectContaining({ delay: 90 * MINUTE }),
        );
      });
    });

    describe('when a once schedule has already fired', () => {
      it('arms nothing', async () => {
        vi.mocked(jobsService.hasRunForSlot).mockResolvedValue(true);

        const next = await service.upsertScheduler(
          makeJob({
            cronPattern: null,
            runAt: new Date(NOW - MINUTE),
            scheduleKind: 'once',
          }),
        );

        expect(next).toBeNull();
        expect(queue.add).not.toHaveBeenCalled();
      });
    });

    describe('when a schedule changes from interval to cron', () => {
      it('removes the pending interval fire', async () => {
        const stale = pendingJob({ slotMs: NOW + MINUTE });
        vi.mocked(queue.getJobs).mockResolvedValue([stale]);

        await service.upsertScheduler(makeJob({ scheduleKind: 'cron' }));

        expect(stale.remove).toHaveBeenCalled();
        expect(queue.upsertJobScheduler).toHaveBeenCalled();
      });
    });

    describe('unschedule', () => {
      it('removes the cron scheduler and any pending fire', async () => {
        const stale = pendingJob({ slotMs: NOW + MINUTE });
        vi.mocked(queue.getJobs).mockResolvedValue([stale]);

        await service.unschedule(makeJob());

        expect(queue.removeJobScheduler).toHaveBeenCalledWith(
          'scheduled-job:job-1',
        );
        expect(stale.remove).toHaveBeenCalled();
      });
    });
  });
});
