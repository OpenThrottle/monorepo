import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  ScheduledAgentJobCheckoutPathService,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import {
  type ScheduledAgentJob,
  type ScheduledAgentJobRun,
} from '@openthrottle/nestjs-repositories';
import type { Job, Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduledAgentJobCancellationService } from '../../queues/scheduled-agent-jobs/scheduled-agent-job-cancellation.service.ts';
import type { ScheduledAgentJobSchedulerService } from '../../queues/scheduled-agent-jobs/scheduled-agent-job-scheduler.service.ts';
import type { ScheduledAgentJobPayload } from '../../queues/scheduled-agent-jobs/scheduled-agent-jobs.types.ts';
import { ScheduledAgentJobsGraphqlService } from './scheduled-agent-jobs-graphql.service.ts';

const jobFixture = (
  overrides: Partial<ScheduledAgentJob> = {},
): ScheduledAgentJob => {
  return createMock<ScheduledAgentJob>({
    cronPattern: '0 9 * * *',
    cwd: null,
    driverId: 'claude',
    enabled: true,
    id: 'j1',
    model: 'opus',
    prompt: 'go',
    schedulerKey: 'scheduled-job:j1',
    settings: {},
    timeoutMs: null,
    timezone: null,
    ...overrides,
  });
};

describe('ScheduledAgentJobsGraphqlService', () => {
  let jobsService: ScheduledAgentJobsService;
  let checkoutPaths: ScheduledAgentJobCheckoutPathService;
  let scheduler: ScheduledAgentJobSchedulerService;
  let cancellation: ScheduledAgentJobCancellationService;
  let queue: Queue<ScheduledAgentJobPayload, void>;
  let service: ScheduledAgentJobsGraphqlService;

  beforeEach(() => {
    jobsService = createMock<ScheduledAgentJobsService>({
      createJob: vi.fn().mockResolvedValue(jobFixture()),
      createRun: vi
        .fn()
        .mockResolvedValue(
          createMock<ScheduledAgentJobRun>({ id: 'run-1', status: 'queued' }),
        ),
      deleteJob: vi.fn().mockResolvedValue(true),
      findJobById: vi.fn().mockResolvedValue(jobFixture()),
      setJobEnabled: vi.fn(),
      updateJob: vi.fn().mockResolvedValue(jobFixture()),
      updateNextRunAt: vi.fn().mockResolvedValue(undefined),
    });
    checkoutPaths = createMock<ScheduledAgentJobCheckoutPathService>({
      resolve: vi.fn().mockResolvedValue({ path: '/repos/monorepo' }),
    });
    scheduler = createMock<ScheduledAgentJobSchedulerService>({
      removeScheduler: vi.fn().mockResolvedValue(undefined),
      unschedule: vi.fn().mockResolvedValue(undefined),
      upsertScheduler: vi
        .fn()
        .mockResolvedValue(new Date('2026-07-01T09:00:00Z')),
    });
    cancellation = createMock<ScheduledAgentJobCancellationService>();
    queue = createMock<Queue<ScheduledAgentJobPayload, void>>({
      add: vi.fn().mockResolvedValue({}),
    });
    service = new ScheduledAgentJobsGraphqlService(
      createMock<LoggerService>(),
      jobsService,
      checkoutPaths,
      scheduler,
      cancellation,
      queue,
    );
  });

  it('creates a schedule, then projects the scheduler and stores next run', async () => {
    await service.create({
      cronPattern: '0 9 * * *',
      driverId: 'claude',
      name: 'nightly',
      ownerUserId: 'user-1',
      prompt: 'audit',
      settingsJson: null,
    });

    expect(jobsService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ driverId: 'claude', ownerUserId: 'user-1' }),
    );
    expect(scheduler.upsertScheduler).toHaveBeenCalled();
    expect(jobsService.updateNextRunAt).toHaveBeenCalledWith(
      'j1',
      new Date('2026-07-01T09:00:00Z'),
    );
  });

  it('persists a validated repository checkout, scoped to the new owner', async () => {
    await service.create({
      cronPattern: '0 9 * * *',
      driverId: 'claude',
      name: 'nightly',
      ownerUserId: 'user-1',
      prompt: 'audit',
      repositoryCheckoutId: 'checkout-1',
    });

    expect(checkoutPaths.resolve).toHaveBeenCalledWith({
      checkoutId: 'checkout-1',
      ownerUserId: 'user-1',
    });
    expect(jobsService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryCheckoutId: 'checkout-1' }),
    );
  });

  it('rejects a foreign or unknown checkout at write time', async () => {
    vi.mocked(checkoutPaths.resolve).mockResolvedValue({ error: 'not-found' });

    await expect(
      service.create({
        cronPattern: '0 9 * * *',
        driverId: 'claude',
        name: 'nightly',
        ownerUserId: 'user-1',
        prompt: 'audit',
        repositoryCheckoutId: 'someone-elses',
      }),
    ).rejects.toThrow('Repository not found.');
    expect(jobsService.createJob).not.toHaveBeenCalled();
  });

  it('accepts a checkout alongside a cwd — the ladder makes the checkout win', async () => {
    await service.create({
      cronPattern: '0 9 * * *',
      cwd: '/legacy/path',
      driverId: 'claude',
      name: 'nightly',
      ownerUserId: 'user-1',
      prompt: 'audit',
      repositoryCheckoutId: 'checkout-1',
    });

    expect(jobsService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: '/legacy/path',
        repositoryCheckoutId: 'checkout-1',
      }),
    );
  });

  it('never validates a checkout for a legacy cwd-only write', async () => {
    await service.create({
      cronPattern: '0 9 * * *',
      cwd: '/legacy/path',
      driverId: 'claude',
      name: 'nightly',
      ownerUserId: 'user-1',
      prompt: 'audit',
    });

    expect(checkoutPaths.resolve).not.toHaveBeenCalled();
    expect(jobsService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryCheckoutId: null }),
    );
  });

  it('validates an updated checkout against the existing owner, not the caller', async () => {
    vi.mocked(jobsService.findJobById).mockResolvedValue(
      jobFixture({ ownerUserId: 'owner-9' }),
    );

    await service.update('j1', { repositoryCheckoutId: 'checkout-2' });

    expect(checkoutPaths.resolve).toHaveBeenCalledWith({
      checkoutId: 'checkout-2',
      ownerUserId: 'owner-9',
    });
    expect(jobsService.updateJob).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({ repositoryCheckoutId: 'checkout-2' }),
    );
  });

  it('rejects an update to a checkout the owner does not have', async () => {
    vi.mocked(checkoutPaths.resolve).mockResolvedValue({ error: 'not-found' });

    await expect(
      service.update('j1', { repositoryCheckoutId: 'nope' }),
    ).rejects.toThrow('Repository not found.');
    expect(jobsService.updateJob).not.toHaveBeenCalled();
  });

  describe('misfire policy', () => {
    const base = {
      cronPattern: '0 9 * * *',
      driverId: 'claude',
      name: 'nightly',
      ownerUserId: 'user-1',
      prompt: 'audit',
    };

    it('persists a valid policy and threshold on create', async () => {
      await service.create({
        ...base,
        misfirePolicy: 'catch_up_once',
        misfireThresholdMs: 30 * 60_000,
      });

      expect(jobsService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          misfirePolicy: 'catch_up_once',
          misfireThresholdMs: 30 * 60_000,
        }),
      );
    });

    it('leaves both to the column defaults when omitted', async () => {
      await service.create(base);

      expect(jobsService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          misfirePolicy: undefined,
          misfireThresholdMs: undefined,
        }),
      );
    });

    it('rejects an unknown policy', async () => {
      await expect(
        service.create({ ...base, misfirePolicy: 'run_all' }),
      ).rejects.toThrow(/Unknown misfire policy/);
      expect(jobsService.createJob).not.toHaveBeenCalled();
    });

    it('rejects a threshold under a minute', async () => {
      await expect(
        service.create({ ...base, misfireThresholdMs: 59_999 }),
      ).rejects.toThrow(/at least 60000/);
    });

    it('updates only the misfire fields it is given', async () => {
      await service.update('j1', { misfirePolicy: 'skip' });

      expect(jobsService.updateJob).toHaveBeenCalledWith(
        'j1',
        expect.objectContaining({
          misfirePolicy: 'skip',
          misfireThresholdMs: undefined,
        }),
      );
    });
  });

  it('rejects an unknown driver id', async () => {
    await expect(
      service.create({
        cronPattern: '0 9 * * *',
        driverId: 'bogus',
        name: 'x',
        ownerUserId: null,
        prompt: 'p',
      }),
    ).rejects.toThrow(/Unknown driver/);
  });

  it('rejects an every-minute cron', async () => {
    await expect(
      service.create({
        cronPattern: '* * * * *',
        driverId: 'claude',
        name: 'x',
        ownerUserId: null,
        prompt: 'p',
      }),
    ).rejects.toThrow(/every minute/);
  });

  it('rejects endpoint.apiKey in settings', async () => {
    await expect(
      service.create({
        cronPattern: '0 9 * * *',
        driverId: 'codex',
        name: 'x',
        ownerUserId: null,
        prompt: 'p',
        settingsJson: JSON.stringify({
          endpoint: { apiKey: 'sk-secret', baseUrl: 'http://x/v1' },
        }),
      }),
    ).rejects.toThrow(/apiKey is not allowed/);
  });

  it('rejects an endpoint on a driver without custom base URL support', async () => {
    await expect(
      service.create({
        cronPattern: '0 9 * * *',
        driverId: 'claude', // supportsCustomBaseUrl: false
        name: 'x',
        ownerUserId: null,
        prompt: 'p',
        settingsJson: JSON.stringify({ endpoint: { baseUrl: 'http://x/v1' } }),
      }),
    ).rejects.toThrow(/custom endpoint/);
  });

  it('rejects an unknown settings key', async () => {
    await expect(
      service.create({
        cronPattern: '0 9 * * *',
        driverId: 'claude',
        name: 'x',
        ownerUserId: null,
        prompt: 'p',
        settingsJson: JSON.stringify({ nope: true }),
      }),
    ).rejects.toThrow(/Unknown settings key/);
  });

  it('update forwards prompt to jobsService.updateJob', async () => {
    await service.update('j1', { prompt: 'a new prompt' });

    expect(jobsService.updateJob).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({ prompt: 'a new prompt' }),
    );
  });

  it('update leaves prompt undefined (no-op) when not supplied', async () => {
    await service.update('j1', { name: 'renamed' });

    expect(jobsService.updateJob).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({ name: 'renamed', prompt: undefined }),
    );
  });

  it('runNow pre-creates a manual run and enqueues with jobId = runId', async () => {
    const run = await service.runNow('j1');

    expect(jobsService.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledAgentJobId: 'j1',
        status: 'queued',
        trigger: 'manual',
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'scheduled-agent-job',
      expect.objectContaining({ runId: 'run-1', scheduleId: 'j1' }),
      expect.objectContaining({ attempts: 1, jobId: 'run-1' }),
    );
    expect(run.id).toBe('run-1');
  });

  it('getRun returns the run when found', async () => {
    vi.mocked(jobsService.findRunById).mockResolvedValue(
      createMock<ScheduledAgentJobRun>({ id: 'run-1', status: 'running' }),
    );
    const run = await service.getRun('run-1');
    expect(jobsService.findRunById).toHaveBeenCalledWith('run-1');
    expect(run?.id).toBe('run-1');
  });

  it('getRun returns null when the run is missing', async () => {
    vi.mocked(jobsService.findRunById).mockResolvedValue(null);
    expect(await service.getRun('nope')).toBeNull();
  });

  it('delete unschedules every kind of fire, then removes the row', async () => {
    const ok = await service.delete('j1');
    expect(scheduler.unschedule).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'j1' }),
    );
    expect(jobsService.deleteJob).toHaveBeenCalledWith('j1');
    expect(ok).toBe(true);
  });

  it('disabling unschedules the job and clears next run', async () => {
    vi.mocked(jobsService.setJobEnabled).mockResolvedValue(
      jobFixture({ enabled: false }),
    );
    await service.setEnabled('j1', false);
    expect(scheduler.unschedule).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'j1' }),
    );
    expect(jobsService.updateNextRunAt).toHaveBeenCalledWith('j1', null);
  });

  describe('schedule kinds', () => {
    describe('when creating an interval schedule', () => {
      it('persists the interval with no cron pattern', async () => {
        await service.create({
          driverId: 'claude',
          intervalMs: 15 * 60_000,
          name: 'poll',
          ownerUserId: 'user-1',
          prompt: 'check',
          scheduleKind: 'interval',
        });

        expect(jobsService.createJob).toHaveBeenCalledWith(
          expect.objectContaining({
            cronPattern: null,
            intervalMs: 15 * 60_000,
            runAt: null,
            scheduleKind: 'interval',
          }),
        );
      });
    });

    describe('when creating a once schedule in the past', () => {
      it('is rejected before anything is written', async () => {
        await expect(
          service.create({
            driverId: 'claude',
            name: 'once',
            ownerUserId: 'user-1',
            prompt: 'go',
            runAt: '2020-01-01T00:00:00Z',
            scheduleKind: 'once',
          }),
        ).rejects.toThrow(BadRequestException);
        expect(jobsService.createJob).not.toHaveBeenCalled();
      });
    });

    describe('when switching a cron schedule to run once', () => {
      it('writes the new kind and clears the cron pattern', async () => {
        await service.update('j1', {
          runAt: '2099-01-01T09:00:00+01:00',
          scheduleKind: 'once',
        });

        expect(jobsService.updateJob).toHaveBeenCalledWith(
          'j1',
          expect.objectContaining({
            cronPattern: null,
            runAt: new Date('2099-01-01T08:00:00Z'),
            scheduleKind: 'once',
          }),
        );
      });
    });
  });

  describe('cancelRun on a queued run', () => {
    const queuedRun = (
      overrides: Partial<ScheduledAgentJobRun> = {},
    ): ScheduledAgentJobRun => {
      return createMock<ScheduledAgentJobRun>({
        bullmqJobId: null,
        id: 'run-1',
        status: 'queued',
        ...overrides,
      });
    };
    const bullJob = (state: string): Job<ScheduledAgentJobPayload, void> => {
      return createMock<Job<ScheduledAgentJobPayload, void>>({
        getState: vi.fn().mockResolvedValue(state),
        remove: vi.fn().mockResolvedValue(undefined),
      });
    };

    it('removes a delayed usage-limit resume job by the run bullmqJobId and records the run cancelled', async () => {
      const job = bullJob('delayed');
      vi.mocked(jobsService.findRunById).mockResolvedValue(
        queuedRun({ bullmqJobId: 'usage-limit-resume-run-0' }),
      );
      vi.mocked(queue.getJob).mockResolvedValue(job);

      await service.cancelRun('run-1');

      expect(jobsService.requestRunCancel).toHaveBeenCalledWith('run-1');
      expect(queue.getJob).toHaveBeenCalledWith('usage-limit-resume-run-0');
      expect(job.remove).toHaveBeenCalledOnce();
      expect(jobsService.markRunFinished).toHaveBeenCalledWith('run-1', {
        errorMessage: 'Run cancelled',
        exitCode: null,
        status: 'cancelled',
      });
    });

    it('falls back to the run id for a run-now job (jobId = runId)', async () => {
      const job = bullJob('waiting');
      vi.mocked(jobsService.findRunById).mockResolvedValue(queuedRun());
      vi.mocked(queue.getJob).mockResolvedValue(job);

      await service.cancelRun('run-1');

      expect(queue.getJob).toHaveBeenCalledWith('run-1');
      expect(job.remove).toHaveBeenCalledOnce();
    });

    it('records the run cancelled even when its job is already gone', async () => {
      vi.mocked(jobsService.findRunById).mockResolvedValue(queuedRun());
      vi.mocked(queue.getJob).mockResolvedValue(undefined);

      await service.cancelRun('run-1');

      expect(jobsService.markRunFinished).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'cancelled' }),
      );
    });

    it('leaves a job a worker has already picked up to the processor', async () => {
      const job = bullJob('active');
      vi.mocked(jobsService.findRunById).mockResolvedValue(queuedRun());
      vi.mocked(queue.getJob).mockResolvedValue(job);

      await service.cancelRun('run-1');

      expect(job.remove).not.toHaveBeenCalled();
      expect(jobsService.markRunFinished).not.toHaveBeenCalled();
    });

    it('does not touch the queue for a run that is already running', async () => {
      vi.mocked(jobsService.findRunById).mockResolvedValue(
        queuedRun({ status: 'running' }),
      );

      await service.cancelRun('run-1');

      expect(queue.getJob).not.toHaveBeenCalled();
      expect(jobsService.requestRunCancel).toHaveBeenCalledWith('run-1');
    });

    it('never throws when Redis fails, leaving the durable marker', async () => {
      vi.mocked(jobsService.findRunById).mockResolvedValue(queuedRun());
      vi.mocked(queue.getJob).mockRejectedValue(new Error('redis down'));

      await expect(service.cancelRun('run-1')).resolves.toBeDefined();
      expect(jobsService.requestRunCancel).toHaveBeenCalledWith('run-1');
      expect(jobsService.markRunFinished).not.toHaveBeenCalled();
    });
  });
});
