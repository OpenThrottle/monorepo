import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { ScheduledAgentJob } from './scheduled-agent-job.entity';
import { ScheduledAgentJobRun } from './scheduled-agent-job-run.entity';
import {
  ScheduledAgentJobsService,
  schedulerKeyForJob,
} from './scheduled-agent-jobs.service';

type JobRepo = {
  create: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  merge: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

type RunRepo = {
  create: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

describe('ScheduledAgentJobsService', () => {
  let service: ScheduledAgentJobsService;
  let jobRepo: JobRepo;
  let runRepo: RunRepo;

  beforeEach(async () => {
    jobRepo = {
      create: vi.fn((input: Partial<ScheduledAgentJob>) => ({ ...input })),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      merge: vi.fn((target: object, patch: object) =>
        Object.assign(target, patch),
      ),
      // First save assigns an id (simulating INSERT); later saves echo the row.
      save: vi.fn((row: ScheduledAgentJob) =>
        Promise.resolve(row.id ? row : { ...row, id: 'job-1' }),
      ),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    runRepo = {
      create: vi.fn((input: Partial<ScheduledAgentJobRun>) => ({ ...input })),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      save: vi.fn((row: ScheduledAgentJobRun) => Promise.resolve(row)),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ScheduledAgentJobsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: getRepositoryToken(ScheduledAgentJob), useValue: jobRepo },
        {
          provide: getRepositoryToken(ScheduledAgentJobRun),
          useValue: runRepo,
        },
      ],
    }).compile();

    service = moduleRef.get(ScheduledAgentJobsService);
  });

  it('derives a stable scheduler key from a job id', () => {
    expect(schedulerKeyForJob('abc-123')).toBe('scheduled-job:abc-123');
  });

  it('createJob saves the draft, then persists the id-derived scheduler key', async () => {
    const job = await service.createJob({
      cronPattern: '0 * * * *',
      driverId: 'claude',
      name: 'nightly',
      prompt: 'do the thing',
    });

    expect(job.schedulerKey).toBe(schedulerKeyForJob('job-1'));
    // Draft insert + key-update save.
    expect(jobRepo.save).toHaveBeenCalledTimes(2);
    // Defaults are applied.
    expect(job.enabled).toBe(true);
    expect(job.settings).toEqual({});
  });

  it('listEnabledJobs filters to enabled rows (reconciler source of truth)', async () => {
    await service.listEnabledJobs();
    expect(jobRepo.find).toHaveBeenCalledWith({ where: { enabled: true } });
  });

  it('createRun defaults status to queued', async () => {
    await service.createRun({
      driverId: 'cursor',
      scheduledAgentJobId: 'job-1',
      trigger: 'manual',
    });
    expect(runRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'queued', trigger: 'manual' }),
    );
  });

  it('markRunStarted stamps running + startedAt + bullmq job id', async () => {
    await service.markRunStarted('run-1', 'bull-9');
    expect(runRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        bullmqJobId: 'bull-9',
        id: 'run-1',
        status: 'running',
      }),
    );
    const patch = runRepo.save.mock.calls[0]?.[0];
    expect(patch.startedAt).toBeInstanceOf(Date);
    // No snapshot supplied → the column is left untouched (not set to null).
    expect('settingsSnapshot' in patch).toBe(false);
  });

  it('markRunStarted backfills the settings snapshot when supplied', async () => {
    await service.markRunStarted('run-1', 'bull-9', {
      driverId: 'claude',
      model: 'opus',
    });
    expect(runRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        settingsSnapshot: { driverId: 'claude', model: 'opus' },
      }),
    );
  });

  it('markRunFinished maps a terminal status with exit code + finishedAt', async () => {
    await service.markRunFinished('run-1', { exitCode: 1, status: 'failed' });
    expect(runRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ exitCode: 1, id: 'run-1', status: 'failed' }),
    );
    const patch = runRepo.save.mock.calls[0]?.[0];
    expect(patch.finishedAt).toBeInstanceOf(Date);
    // Usage fields omitted → not written, so the columns stay null.
    expect('inputTokens' in patch).toBe(false);
    expect('rawUsage' in patch).toBe(false);
  });

  it('markRunFinished persists token counts, cost, and raw usage when supplied', async () => {
    await service.markRunFinished('run-1', {
      cacheReadTokens: 20,
      cacheWriteTokens: 10,
      costUsd: 0.0123,
      inputTokens: 100,
      outputTokens: 50,
      rawUsage: { inputTokens: 100, outputTokens: 50 },
      reasoningTokens: null,
      status: 'succeeded',
      totalTokens: 150,
    });
    expect(runRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheReadTokens: 20,
        cacheWriteTokens: 10,
        costUsd: 0.0123,
        inputTokens: 100,
        outputTokens: 50,
        rawUsage: { inputTokens: 100, outputTokens: 50 },
        reasoningTokens: null,
        totalTokens: 150,
      }),
    );
  });

  it('createRun persists the settings snapshot on the new run row', async () => {
    await service.createRun({
      driverId: 'cursor',
      scheduledAgentJobId: 'job-1',
      settingsSnapshot: { driverId: 'cursor', model: null },
      trigger: 'manual',
    });
    expect(runRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        settingsSnapshot: { driverId: 'cursor', model: null },
      }),
    );
  });

  it('deleteJob reports whether a row was removed', async () => {
    expect(await service.deleteJob('job-1')).toBe(true);
    jobRepo.delete.mockResolvedValueOnce({ affected: 0 });
    expect(await service.deleteJob('missing')).toBe(false);
  });
});
