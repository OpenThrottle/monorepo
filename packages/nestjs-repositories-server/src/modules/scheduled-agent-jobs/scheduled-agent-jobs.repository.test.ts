import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduledAgentJobWebhookTrigger } from '../scheduled-agent-job-webhook-triggers/scheduled-agent-job-webhook-trigger.entity.ts';
import { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import { ScheduledAgentJobsRepository } from './scheduled-agent-jobs.repository.ts';
import { schedulerKeyForJob } from './scheduler-key/scheduler-key.utils.ts';

type JobRepo = {
  count: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  manager: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
  };
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
    const create = vi.fn((input: Partial<ScheduledAgentJob>) => ({ ...input }));
    // First save assigns an id (simulating INSERT); later saves echo the row.
    const save = vi.fn((row: ScheduledAgentJob) =>
      Promise.resolve(row.id ? row : { ...row, id: 'job-1' }),
    );
    jobRepo = {
      count: vi.fn().mockResolvedValue(0),
      create,
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      // The manager writes through the same create/save mocks, so createJob assertions read them.
      manager: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn((_entity: unknown, input: Partial<ScheduledAgentJob>) => {
          return create(input);
        }),
        query: vi.fn().mockResolvedValue([]),
        save: vi.fn((row: ScheduledAgentJob) => {
          return save(row);
        }),
        transaction: vi.fn(),
      },
      merge: vi.fn((target: object, patch: object) =>
        Object.assign(target, patch),
      ),
      save,
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

  describe('createJobWithinOwnerCaps', () => {
    const input = {
      createdVia: 'mcp' as const,
      cronPattern: '0 * * * *',
      driverId: 'claude' as const,
      name: 'n',
      ownerUserId: 'user-1',
      prompt: 'p',
    };
    const caps = { maxMcpPerOwner: 10, maxPerOwner: 25 };

    beforeEach(() => {
      jobRepo.manager.transaction.mockImplementation(
        async (work: (m: typeof jobRepo.manager) => Promise<unknown>) => {
          return work(jobRepo.manager);
        },
      );
    });

    it('takes the owner’s advisory lock before it counts', async () => {
      await repository.createJobWithinOwnerCaps(input, caps);

      expect(jobRepo.manager.query).toHaveBeenCalledWith(
        `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
        ['scheduled_agent_jobs.owner_caps', 'user-1'],
      );
      const lockOrder = jobRepo.manager.query.mock.invocationCallOrder[0] ?? 0;
      const countOrder = jobRepo.manager.count.mock.invocationCallOrder[0] ?? 0;
      expect(lockOrder).toBeLessThan(countOrder);
    });

    it('inserts in the same transaction when under both caps', async () => {
      jobRepo.manager.count.mockResolvedValueOnce(24).mockResolvedValueOnce(9);

      const result = await repository.createJobWithinOwnerCaps(input, caps);

      expect(result).toMatchObject({ job: { id: 'job-1' }, ok: true });
      expect(jobRepo.manager.save).toHaveBeenCalled();
    });

    it('refuses at the total cap without inserting', async () => {
      jobRepo.manager.count.mockResolvedValueOnce(25);

      await expect(
        repository.createJobWithinOwnerCaps(input, caps),
      ).resolves.toStrictEqual({
        count: 25,
        limit: 25,
        ok: false,
        scope: 'all',
      });
      expect(jobRepo.manager.save).not.toHaveBeenCalled();
    });

    it('refuses an agent-created job at the mcp cap', async () => {
      jobRepo.manager.count.mockResolvedValueOnce(12).mockResolvedValueOnce(10);

      await expect(
        repository.createJobWithinOwnerCaps(input, caps),
      ).resolves.toStrictEqual({
        count: 10,
        limit: 10,
        ok: false,
        scope: 'mcp',
      });
    });

    it('does not apply the mcp cap to a UI create', async () => {
      jobRepo.manager.count.mockResolvedValueOnce(12);

      const result = await repository.createJobWithinOwnerCaps(
        { ...input, createdVia: 'ui' },
        caps,
      );

      expect(result.ok).toBe(true);
      expect(jobRepo.manager.count).toHaveBeenCalledTimes(1);
    });
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
    const buildManager = (affected: number) => {
      return {
        delete: vi.fn().mockResolvedValue({ affected: 1 }),
        softDelete: vi.fn().mockResolvedValue({ affected }),
      };
    };

    const useManager = (manager: ReturnType<typeof buildManager>) => {
      jobRepo.manager.transaction.mockImplementation(
        async (work: (m: typeof manager) => Promise<unknown>) => {
          return work(manager);
        },
      );
    };

    it('soft deletes a live row and removes its webhook trigger in one transaction', async () => {
      const manager = buildManager(1);
      useManager(manager);

      await expect(repository.deleteJob('job-1')).resolves.toBe(true);
      expect(jobRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(manager.softDelete).toHaveBeenCalledWith(ScheduledAgentJob, {
        deletedAt: IsNull(),
        id: 'job-1',
      });
      expect(manager.delete).toHaveBeenCalledWith(
        ScheduledAgentJobWebhookTrigger,
        { scheduledAgentJobId: 'job-1' },
      );
    });

    it('reports false and touches no trigger when no live row matched (absent or already deleted)', async () => {
      const manager = buildManager(0);
      useManager(manager);

      await expect(repository.deleteJob('missing')).resolves.toBe(false);
      expect(manager.delete).not.toHaveBeenCalled();
    });
  });
});
