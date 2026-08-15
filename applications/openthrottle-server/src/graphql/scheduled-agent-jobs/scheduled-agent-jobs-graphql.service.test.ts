import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import type { Queue } from 'bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  ScheduledAgentJobsService,
  type ScheduledAgentJob,
  type ScheduledAgentJobRun,
} from '@openthrottle/nestjs-repositories';
import { ScheduledAgentJobCancellationService } from '../../queues/scheduled-agent-jobs/scheduled-agent-job-cancellation.service';
import { ScheduledAgentJobSchedulerService } from '../../queues/scheduled-agent-jobs/scheduled-agent-job-scheduler.service';
import type { ScheduledAgentJobPayload } from '../../queues/scheduled-agent-jobs/scheduled-agent-jobs.types';
import { ScheduledAgentJobsGraphqlService } from './scheduled-agent-jobs-graphql.service';

const jobFixture = (
  overrides: Partial<ScheduledAgentJob> = {},
): ScheduledAgentJob =>
  createMock<ScheduledAgentJob>({
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

describe('ScheduledAgentJobsGraphqlService', () => {
  let jobsService: ScheduledAgentJobsService;
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
    scheduler = createMock<ScheduledAgentJobSchedulerService>({
      removeScheduler: vi.fn().mockResolvedValue(undefined),
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

  it('delete removes the scheduler then the row', async () => {
    const ok = await service.delete('j1');
    expect(scheduler.removeScheduler).toHaveBeenCalledWith('scheduled-job:j1');
    expect(jobsService.deleteJob).toHaveBeenCalledWith('j1');
    expect(ok).toBe(true);
  });

  it('disabling removes the scheduler and clears next run', async () => {
    vi.mocked(jobsService.setJobEnabled).mockResolvedValue(
      jobFixture({ enabled: false }),
    );
    await service.setEnabled('j1', false);
    expect(scheduler.removeScheduler).toHaveBeenCalledWith('scheduled-job:j1');
    expect(jobsService.updateNextRunAt).toHaveBeenCalledWith('j1', null);
  });
});
