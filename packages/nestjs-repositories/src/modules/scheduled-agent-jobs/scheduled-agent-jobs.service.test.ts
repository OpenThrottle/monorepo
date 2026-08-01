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
    expect(runRepo.update).toHaveBeenCalledWith(
      { id: 'run-1' },
      expect.objectContaining({ bullmqJobId: 'bull-9', status: 'running' }),
    );
    const patch = runRepo.update.mock.calls[0]?.[1];
    expect(patch.startedAt).toBeInstanceOf(Date);
  });

  it('markRunFinished maps a terminal status with exit code + finishedAt', async () => {
    await service.markRunFinished('run-1', { exitCode: 1, status: 'failed' });
    expect(runRepo.update).toHaveBeenCalledWith(
      { id: 'run-1' },
      expect.objectContaining({ exitCode: 1, status: 'failed' }),
    );
    const patch = runRepo.update.mock.calls[0]?.[1];
    expect(patch.finishedAt).toBeInstanceOf(Date);
  });

  it('deleteJob reports whether a row was removed', async () => {
    expect(await service.deleteJob('job-1')).toBe(true);
    jobRepo.delete.mockResolvedValueOnce({ affected: 0 });
    expect(await service.deleteJob('missing')).toBe(false);
  });
});
