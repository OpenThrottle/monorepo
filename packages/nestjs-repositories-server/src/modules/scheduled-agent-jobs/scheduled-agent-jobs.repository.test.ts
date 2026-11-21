import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import { ScheduledAgentJobsRepository } from './scheduled-agent-jobs.repository.ts';
import { schedulerKeyForJob } from './scheduler-key/scheduler-key.utils.ts';

type JobRepo = {
  count: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  merge: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  softDelete: ReturnType<typeof vi.fn>;
  target: typeof ScheduledAgentJob;
  update: ReturnType<typeof vi.fn>;
};

describe('ScheduledAgentJobsRepository', () => {
  let repository: ScheduledAgentJobsRepository;
  let jobRepo: JobRepo;

  beforeEach(async () => {
    jobRepo = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn((input: Partial<ScheduledAgentJob>) => ({ ...input })),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      merge: vi.fn((target: object, patch: object) =>
        Object.assign(target, patch),
      ),
      // First save assigns an id (simulating INSERT); later saves echo the row.
      save: vi.fn((row: ScheduledAgentJob) =>
        Promise.resolve(row.id ? row : { ...row, id: 'job-1' }),
      ),
      softDelete: vi.fn().mockResolvedValue({ affected: 1 }),
      target: ScheduledAgentJob,
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ScheduledAgentJobsRepository,
        { provide: getRepositoryToken(ScheduledAgentJob), useValue: jobRepo },
      ],
    }).compile();

    repository = moduleRef.get(ScheduledAgentJobsRepository);
  });

  describe('countJobsForOwner', () => {
    it('counts the owner’s live jobs', async () => {
      jobRepo.count.mockResolvedValue(7);

      await expect(repository.countJobsForOwner('user-1')).resolves.toBe(7);
      expect(jobRepo.count).toHaveBeenCalledWith({
        where: { ownerUserId: 'user-1' },
      });
    });

    it('narrows to one creating surface', async () => {
      await repository.countJobsForOwner('user-1', 'mcp');

      expect(jobRepo.count).toHaveBeenCalledWith({
        where: { createdVia: 'mcp', ownerUserId: 'user-1' },
      });
    });
  });

  describe('findJobByIdempotencyKey', () => {
    it('looks a job up by owner and key', async () => {
      await repository.findJobByIdempotencyKey('user-1', 'key-1');

      expect(jobRepo.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey: 'key-1', ownerUserId: 'user-1' },
      });
    });
  });

  describe('createJob', () => {
    it('persists the agent guardrail columns when supplied', async () => {
      await repository.createJob({
        approvalState: 'pending',
        createdVia: 'mcp',
        cronPattern: '0 * * * *',
        driverId: 'claude',
        idempotencyKey: 'key-1',
        name: 'n',
        prompt: 'p',
      });
      const draft = jobRepo.create.mock.calls[0]?.[0];

      expect(draft).toMatchObject({
        approvalState: 'pending',
        createdVia: 'mcp',
        idempotencyKey: 'key-1',
      });
    });

    it('leaves createdVia and approvalState to the column defaults, with no idempotency key', async () => {
      await repository.createJob({
        cronPattern: '0 * * * *',
        driverId: 'claude',
        name: 'n',
        prompt: 'p',
      });
      const draft = jobRepo.create.mock.calls[0]?.[0];

      expect('createdVia' in draft).toBe(false);
      expect('approvalState' in draft).toBe(false);
      expect(draft.idempotencyKey).toBeNull();
    });

    it('saves the draft, then persists the id-derived scheduler key', async () => {
      const job = await repository.createJob({
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

    it('inserts the draft under a unique placeholder key', async () => {
      await repository.createJob({
        cronPattern: '0 * * * *',
        driverId: 'claude',
        name: 'a',
        prompt: 'p',
      });
      await repository.createJob({
        cronPattern: '0 * * * *',
        driverId: 'claude',
        name: 'b',
        prompt: 'p',
      });

      const draftKeys = jobRepo.create.mock.calls.map((call) => {
        return call[0].schedulerKey;
      });
      expect(draftKeys[0]).toMatch(/^pending:/u);
      expect(draftKeys[0]).not.toBe(draftKeys[1]);
    });

    it('round-trips the targeted repository checkout, defaulting it to null', async () => {
      const targeted = await repository.createJob({
        cronPattern: '0 * * * *',
        driverId: 'claude',
        name: 'nightly',
        prompt: 'do the thing',
        repositoryCheckoutId: 'checkout-1',
      });
      expect(targeted.repositoryCheckoutId).toBe('checkout-1');

      const untargeted = await repository.createJob({
        cronPattern: '0 * * * *',
        driverId: 'claude',
        name: 'nightly',
        prompt: 'do the thing',
      });
      expect(untargeted.repositoryCheckoutId).toBeNull();
    });

    it('omits the misfire and schedule-kind columns when not supplied so the defaults apply', async () => {
      await repository.createJob({
        cronPattern: '0 * * * *',
        driverId: 'claude',
        name: 'nightly',
        prompt: 'p',
      });
      const draft = jobRepo.create.mock.calls[0]?.[0];
      expect('misfirePolicy' in draft).toBe(false);
      expect('misfireThresholdMs' in draft).toBe(false);
      expect('scheduleKind' in draft).toBe(false);
    });
  });

  describe('findJobById', () => {
    it('looks up a live row by id', async () => {
      jobRepo.findOne.mockResolvedValueOnce({ id: 'job-1' });

      await expect(repository.findJobById('job-1')).resolves.toEqual({
        id: 'job-1',
      });
      expect(jobRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'job-1' },
      });
    });

    it('resolves null on a miss instead of throwing', async () => {
      await expect(repository.findJobById('missing')).resolves.toBeNull();
    });
  });

  describe('listJobs', () => {
    it('lists live rows newest first', async () => {
      await repository.listJobs();
      expect(jobRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('scopes to an owner when given', async () => {
      await repository.listJobs('user-1');
      expect(jobRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { ownerUserId: 'user-1' },
      });
    });
  });

  describe('listEnabledJobs', () => {
    it('filters to live enabled rows (reconciler source of truth)', async () => {
      await repository.listEnabledJobs();
      expect(jobRepo.find).toHaveBeenCalledWith({
        where: { enabled: true },
      });
    });
  });

  describe('updateJob', () => {
    it('returns null when the row is absent or deleted', async () => {
      await expect(
        repository.updateJob('missing', { name: 'x' }),
      ).resolves.toBeNull();
      expect(jobRepo.save).not.toHaveBeenCalled();
    });

    it('can retarget the repository checkout, and clear it back to null', async () => {
      jobRepo.findOne.mockResolvedValue({
        id: 'job-1',
        repositoryCheckoutId: null,
      });
      const retargeted = await repository.updateJob('job-1', {
        repositoryCheckoutId: 'checkout-2',
      });
      expect(retargeted?.repositoryCheckoutId).toBe('checkout-2');

      jobRepo.findOne.mockResolvedValue({
        id: 'job-1',
        repositoryCheckoutId: 'checkout-2',
      });
      const cleared = await repository.updateJob('job-1', {
        repositoryCheckoutId: null,
      });
      expect(cleared?.repositoryCheckoutId).toBeNull();
    });
  });

  describe('setJobEnabled', () => {
    it('toggles enablement through updateJob', async () => {
      jobRepo.findOne.mockResolvedValue({ enabled: true, id: 'job-1' });

      const job = await repository.setJobEnabled('job-1', false);

      expect(job?.enabled).toBe(false);
    });

    it('returns null when the row is absent', async () => {
      await expect(
        repository.setJobEnabled('missing', true),
      ).resolves.toBeNull();
    });
  });

  describe('updateNextRunAt', () => {
    it('writes only live rows', async () => {
      const nextRunAt = new Date('2026-11-02T09:00:00Z');

      await repository.updateNextRunAt('job-1', nextRunAt);

      expect(jobRepo.update).toHaveBeenCalledWith(
        { deletedAt: IsNull(), id: 'job-1' },
        { nextRunAt },
      );
    });
  });

  describe('deleteJob', () => {
    it('soft deletes a live row and reports it', async () => {
      await expect(repository.deleteJob('job-1')).resolves.toBe(true);
      expect(jobRepo.softDelete).toHaveBeenCalledWith({
        deletedAt: IsNull(),
        id: 'job-1',
      });
      expect(jobRepo.softDelete).toHaveBeenCalledTimes(1);
    });

    it('reports false when no live row matched (absent or already deleted)', async () => {
      jobRepo.softDelete.mockResolvedValueOnce({ affected: 0 });

      await expect(repository.deleteJob('missing')).resolves.toBe(false);
    });
  });
});
