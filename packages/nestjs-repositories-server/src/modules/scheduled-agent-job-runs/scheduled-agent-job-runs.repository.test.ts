import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduledAgentJob } from '../scheduled-agent-jobs/scheduled-agent-job.entity.ts';
import { ScheduledAgentJobRun } from './scheduled-agent-job-run.entity.ts';
import { SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES } from './scheduled-agent-job-runs.constants.ts';
import { ScheduledAgentJobRunsRepository } from './scheduled-agent-job-runs.repository.ts';

const LIVE_JOB_JOIN = `job.id = run.scheduled_agent_job_id AND job.deleted_at IS NULL`;

interface QueryBuilderMock {
  readonly addSelect: ReturnType<typeof vi.fn>;
  readonly andWhere: ReturnType<typeof vi.fn>;
  readonly getCount: ReturnType<typeof vi.fn>;
  readonly getMany: ReturnType<typeof vi.fn>;
  readonly getRawMany: ReturnType<typeof vi.fn>;
  readonly getRawOne: ReturnType<typeof vi.fn>;
  readonly groupBy: ReturnType<typeof vi.fn>;
  readonly innerJoin: ReturnType<typeof vi.fn>;
  readonly limit: ReturnType<typeof vi.fn>;
  readonly orderBy: ReturnType<typeof vi.fn>;
  readonly select: ReturnType<typeof vi.fn>;
  readonly where: ReturnType<typeof vi.fn>;
}

type RunRepo = {
  create: ReturnType<typeof vi.fn>;
  createQueryBuilder: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  target: typeof ScheduledAgentJobRun;
  update: ReturnType<typeof vi.fn>;
};

describe('ScheduledAgentJobRunsRepository', () => {
  let repository: ScheduledAgentJobRunsRepository;
  let queryBuilder: QueryBuilderMock;
  let runRepo: RunRepo;

  beforeEach(async () => {
    // Chainable QueryBuilder stub: every builder method returns the same object.
    const chain = (): ReturnType<typeof vi.fn> => {
      return vi.fn(() => {
        return queryBuilder;
      });
    };
    queryBuilder = {
      addSelect: chain(),
      andWhere: chain(),
      getCount: vi.fn().mockResolvedValue(0),
      getMany: vi.fn().mockResolvedValue([]),
      getRawMany: vi.fn().mockResolvedValue([]),
      getRawOne: vi.fn().mockResolvedValue(undefined),
      groupBy: chain(),
      innerJoin: chain(),
      limit: chain(),
      orderBy: chain(),
      select: chain(),
      where: chain(),
    };

    runRepo = {
      create: vi.fn((input: Partial<ScheduledAgentJobRun>) => ({ ...input })),
      createQueryBuilder: vi.fn(() => queryBuilder),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      query: vi.fn().mockResolvedValue([]),
      save: vi.fn((row: ScheduledAgentJobRun) => Promise.resolve(row)),
      target: ScheduledAgentJobRun,
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ScheduledAgentJobRunsRepository,
        {
          provide: getRepositoryToken(ScheduledAgentJobRun),
          useValue: runRepo,
        },
      ],
    }).compile();

    repository = moduleRef.get(ScheduledAgentJobRunsRepository);
  });

  describe('createRun', () => {
    it('defaults status to queued', async () => {
      await repository.createRun({
        driverId: 'cursor',
        scheduledAgentJobId: 'job-1',
        trigger: 'manual',
      });
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'queued', trigger: 'manual' }),
      );
    });

    it('persists the settings snapshot on the new run row', async () => {
      await repository.createRun({
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

    it('snapshots the checkout and resolved cwd, defaulting both to null', async () => {
      await repository.createRun({
        driverId: 'cursor',
        repositoryCheckoutId: 'checkout-1',
        resolvedCwd: '/repos/monorepo',
        scheduledAgentJobId: 'job-1',
        trigger: 'schedule',
      });
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          repositoryCheckoutId: 'checkout-1',
          resolvedCwd: '/repos/monorepo',
        }),
      );

      await repository.createRun({
        driverId: 'cursor',
        scheduledAgentJobId: 'job-1',
        trigger: 'schedule',
      });
      expect(runRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          repositoryCheckoutId: null,
          resolvedCwd: null,
        }),
      );
    });

    it('records the run it continues (resume_of_run_id) and defaults it to null', async () => {
      await repository.createRun({
        driverId: 'claude',
        resumeOfRunId: 'run-limited',
        scheduledAgentJobId: 'job-1',
        trigger: 'resume',
      });
      expect(runRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          resumeOfRunId: 'run-limited',
          trigger: 'resume',
        }),
      );

      await repository.createRun({
        driverId: 'claude',
        scheduledAgentJobId: 'job-1',
        trigger: 'manual',
      });
      expect(runRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ resumeOfRunId: null }),
      );
    });
  });

  describe('findRunById', () => {
    it('looks a run up by id and resolves null on a miss', async () => {
      runRepo.findOne.mockResolvedValueOnce({ id: 'run-1' });

      await expect(repository.findRunById('run-1')).resolves.toEqual({
        id: 'run-1',
      });
      expect(runRepo.findOne).toHaveBeenCalledWith({ where: { id: 'run-1' } });
      await expect(repository.findRunById('missing')).resolves.toBeNull();
    });
  });

  describe('listRunsForJob', () => {
    it('lists a schedule runs newest first, capped at 50 by default', async () => {
      await repository.listRunsForJob('job-1');
      expect(runRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 50,
        where: { scheduledAgentJobId: 'job-1' },
      });
    });

    it('honours an explicit limit', async () => {
      await repository.listRunsForJob('job-1', 5);
      expect(runRepo.find.mock.calls[0]?.[0].take).toBe(5);
    });
  });

  it('SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES is the single definition of "in flight"', () => {
    expect(SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES).toEqual([
      'queued',
      'running',
    ]);
  });

  describe('listInFlightRuns', () => {
    it('filters to queued + running oldest-first, joined to live schedules only', async () => {
      await repository.listInFlightRuns();

      expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
        ScheduledAgentJob,
        'job',
        LIVE_JOB_JOIN,
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'run.status IN (:...statuses)',
        { statuses: ['queued', 'running'] },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('run.createdAt', 'ASC');
    });

    it('caps the result set, honouring an explicit limit', async () => {
      await repository.listInFlightRuns();
      expect(queryBuilder.limit).toHaveBeenLastCalledWith(50);

      await repository.listInFlightRuns(5);
      expect(queryBuilder.limit).toHaveBeenLastCalledWith(5);
    });
  });

  describe('countInFlightRunsByStatus', () => {
    it('groups the in-flight runs of live schedules by status', async () => {
      queryBuilder.getRawMany.mockResolvedValue([
        { count: '2', status: 'running' },
      ]);

      const counts = await repository.countInFlightRunsByStatus();

      expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
        ScheduledAgentJob,
        'job',
        LIVE_JOB_JOIN,
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'run.status IN (:...statuses)',
        { statuses: ['queued', 'running'] },
      );
      expect(queryBuilder.groupBy).toHaveBeenCalledWith('run.status');
      expect(counts).toEqual([{ count: 2, status: 'running' }]);
    });
  });

  describe('countRunsByStatusSince', () => {
    it('issues one grouped aggregate query over live schedules', async () => {
      const since = new Date('2026-08-21T00:00:00.000Z');
      queryBuilder.getRawMany.mockResolvedValue([
        { count: '3', status: 'succeeded' },
        { count: '1', status: 'no_op' },
      ]);

      const counts = await repository.countRunsByStatusSince(since);

      expect(runRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
        ScheduledAgentJob,
        'job',
        LIVE_JOB_JOIN,
      );
      expect(queryBuilder.select).toHaveBeenCalledWith('run.status', 'status');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('COUNT(*)', 'count');
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'run.created_at >= :since',
        { since },
      );
      expect(queryBuilder.groupBy).toHaveBeenCalledWith('run.status');
      // Postgres returns COUNT(*) as a string; it is normalized to a number.
      expect(counts).toEqual([
        { count: 3, status: 'succeeded' },
        { count: 1, status: 'no_op' },
      ]);
    });
  });

  describe('markRunStarted', () => {
    it('stamps running + startedAt + bullmq job id', async () => {
      await repository.markRunStarted('run-1', 'bull-9');
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          bullmqJobId: 'bull-9',
          id: 'run-1',
          status: 'running',
        }),
      );
      const patch = runRepo.save.mock.calls[0]?.[0];
      expect(patch.startedAt).toBeInstanceOf(Date);
      // No snapshot supplied → the columns are left untouched (not set to null).
      expect('settingsSnapshot' in patch).toBe(false);
      expect('repositoryCheckoutId' in patch).toBe(false);
      expect('resolvedCwd' in patch).toBe(false);
    });

    it('backfills the settings snapshot when supplied', async () => {
      await repository.markRunStarted('run-1', 'bull-9', {
        settingsSnapshot: { driverId: 'claude', model: 'opus' },
      });
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settingsSnapshot: { driverId: 'claude', model: 'opus' },
        }),
      );
    });

    it('backfills the run cwd provenance when supplied', async () => {
      await repository.markRunStarted('run-1', 'bull-9', {
        repositoryCheckoutId: 'checkout-1',
        resolvedCwd: '/repos/monorepo',
      });
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          repositoryCheckoutId: 'checkout-1',
          resolvedCwd: '/repos/monorepo',
        }),
      );
    });
  });

  describe('markRunFinished', () => {
    it('maps a terminal status with exit code + finishedAt', async () => {
      await repository.markRunFinished('run-1', {
        exitCode: 1,
        status: 'failed',
      });
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ exitCode: 1, id: 'run-1', status: 'failed' }),
      );
      const patch = runRepo.save.mock.calls[0]?.[0];
      expect(patch.finishedAt).toBeInstanceOf(Date);
      // Usage fields omitted → not written, so the columns stay null.
      expect('inputTokens' in patch).toBe(false);
      expect('rawUsage' in patch).toBe(false);
    });

    it('persists token counts, cost, and raw usage when supplied', async () => {
      await repository.markRunFinished('run-1', {
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

    it('persists the usage limit that stopped the run when supplied', async () => {
      const resetsAt = new Date('2026-11-01T17:00:00.000Z');
      await repository.markRunFinished('run-1', {
        status: 'usage_limited',
        usageLimitResetsAt: resetsAt,
        usageLimitType: 'five_hour',
      });
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'usage_limited',
          usageLimitResetsAt: resetsAt,
          usageLimitType: 'five_hour',
        }),
      );
    });

    it('leaves the usage-limit columns unwritten when omitted', async () => {
      await repository.markRunFinished('run-1', { status: 'failed' });
      const patch = runRepo.save.mock.calls[0]?.[0];
      expect('usageLimitResetsAt' in patch).toBe(false);
      expect('usageLimitType' in patch).toBe(false);
    });
  });

  describe('findRunResumingFrom', () => {
    it('looks the continuation up by resume_of_run_id', async () => {
      runRepo.findOne.mockResolvedValueOnce({ id: 'run-next' });

      expect(await repository.findRunResumingFrom('run-limited')).toEqual({
        id: 'run-next',
      });
      expect(runRepo.findOne).toHaveBeenCalledWith({
        where: { resumeOfRunId: 'run-limited' },
      });
    });
  });

  describe('countUsageLimitedInChain', () => {
    it('walks the resume chain with a depth-bounded recursive query and returns the count', async () => {
      runRepo.query.mockResolvedValueOnce([{ count: 2 }]);

      const count = await repository.countUsageLimitedInChain('run-3', 5);

      expect(count).toBe(2);
      const [sql, params] = runRepo.query.mock.calls[0] ?? [];
      expect(sql).toContain('WITH RECURSIVE');
      expect(sql).toContain('FROM scheduled_agent_job_runs');
      expect(sql).toContain('chain.depth < $2');
      expect(sql).toContain("status = 'usage_limited'");
      expect(params).toEqual(['run-3', 5]);
    });

    it('coerces a string count and treats an empty result as zero', async () => {
      runRepo.query.mockResolvedValueOnce([{ count: '3' }]);
      expect(await repository.countUsageLimitedInChain('run-1', 5)).toBe(3);

      runRepo.query.mockResolvedValueOnce([]);
      expect(await repository.countUsageLimitedInChain('run-1', 5)).toBe(0);
    });
  });

  describe('updateRunErrorMessage', () => {
    it('rewrites only the error message', async () => {
      await repository.updateRunErrorMessage('run-1', 'why');
      expect(runRepo.update).toHaveBeenCalledWith(
        { id: 'run-1' },
        { errorMessage: 'why' },
      );
    });
  });

  describe('requestRunCancel', () => {
    it('stamps cancelRequestedAt on the run', async () => {
      await repository.requestRunCancel('run-1');
      expect(runRepo.update).toHaveBeenCalledWith(
        { id: 'run-1' },
        { cancelRequestedAt: expect.any(Date) },
      );
    });
  });

  describe('slot accounting', () => {
    const SLOT = new Date('2026-11-02T09:00:00Z');

    /** An `INSERT ... ON CONFLICT DO NOTHING RETURNING id` chain resolving to `raw`. */
    const givenInsertReturning = (
      raw: unknown,
    ): { readonly values: ReturnType<typeof vi.fn> } => {
      const insertBuilder = {
        execute: vi.fn().mockResolvedValue({ raw }),
        insert: vi.fn(() => insertBuilder),
        into: vi.fn(() => insertBuilder),
        orIgnore: vi.fn(() => insertBuilder),
        returning: vi.fn(() => insertBuilder),
        values: vi.fn(() => insertBuilder),
      };
      runRepo.createQueryBuilder.mockReturnValue(insertBuilder);

      return insertBuilder;
    };

    describe('claimScheduledSlot', () => {
      it('returns the new run when the slot was free', async () => {
        const insert = givenInsertReturning([{ id: 'run-9' }]);
        runRepo.findOne.mockResolvedValue({ id: 'run-9' });

        const claimed = await repository.claimScheduledSlot({
          bullmqJobId: 'repeat:k:1',
          driverId: 'claude',
          scheduledAgentJobId: 'job-1',
          scheduledFor: SLOT,
          status: 'running',
        });

        expect(claimed).toEqual({ id: 'run-9' });
        expect(insert.values).toHaveBeenCalledWith(
          expect.objectContaining({
            scheduledFor: SLOT,
            status: 'running',
            trigger: 'schedule',
          }),
        );
      });

      it('returns null when the slot already had a row', async () => {
        givenInsertReturning([]);

        const claimed = await repository.claimScheduledSlot({
          driverId: 'claude',
          scheduledAgentJobId: 'job-1',
          scheduledFor: SLOT,
        });

        expect(claimed).toBeNull();
        expect(runRepo.findOne).not.toHaveBeenCalled();
      });
    });

    describe('recordMissedRuns', () => {
      it('inserts one terminal missed row per slot and counts the inserted ones', async () => {
        const insert = givenInsertReturning([{ id: 'm-1' }]);

        const inserted = await repository.recordMissedRuns({
          driverId: 'claude',
          errorMessage: 'Missed: down',
          model: null,
          scheduledAgentJobId: 'job-1',
          slots: [SLOT, new Date('2026-11-02T10:00:00Z')],
        });

        expect(inserted).toBe(1);
        const rows: unknown = insert.values.mock.calls[0]?.[0];
        expect(rows).toEqual([
          expect.objectContaining({
            finishedAt: expect.any(Date),
            scheduledFor: SLOT,
            status: 'missed',
            trigger: 'schedule',
          }),
          expect.objectContaining({ status: 'missed' }),
        ]);
      });

      it('does not touch the database for no slots', async () => {
        const inserted = await repository.recordMissedRuns({
          driverId: 'claude',
          errorMessage: 'Missed: down',
          model: null,
          scheduledAgentJobId: 'job-1',
          slots: [],
        });

        expect(inserted).toBe(0);
        expect(runRepo.createQueryBuilder).not.toHaveBeenCalled();
      });
    });

    describe('findLatestScheduledFor', () => {
      it('returns the latest slot as a Date, or null when none', async () => {
        queryBuilder.getRawOne.mockResolvedValueOnce({
          latest: '2026-11-02T09:00:00.000Z',
        });
        await expect(
          repository.findLatestScheduledFor('job-1', SLOT),
        ).resolves.toEqual(SLOT);

        queryBuilder.getRawOne.mockResolvedValueOnce({ latest: null });
        await expect(
          repository.findLatestScheduledFor('job-1', SLOT),
        ).resolves.toBeNull();
      });
    });

    describe('hasLateRunSince', () => {
      it('is true when a real run was opened for an overdue slot', async () => {
        queryBuilder.getCount.mockResolvedValueOnce(1);
        await expect(repository.hasLateRunSince('job-1', SLOT)).resolves.toBe(
          true,
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          `run.status <> 'missed'`,
        );

        await expect(repository.hasLateRunSince('job-1', SLOT)).resolves.toBe(
          false,
        );
      });
    });

    describe('hasRunForSlot', () => {
      it('is true when the slot already has a schedule-trigger row', async () => {
        queryBuilder.getCount.mockResolvedValueOnce(1);
        await expect(repository.hasRunForSlot('job-1', SLOT)).resolves.toBe(
          true,
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'run.scheduled_for = :slot',
          { slot: SLOT },
        );

        await expect(repository.hasRunForSlot('job-1', SLOT)).resolves.toBe(
          false,
        );
      });
    });

    describe('hasLiveScheduledRun', () => {
      it('excludes the given run id and restricts to in-flight rows since the boot', async () => {
        queryBuilder.getCount.mockResolvedValueOnce(1);

        await expect(
          repository.hasLiveScheduledRun({
            createdSince: SLOT,
            excludeRunId: 'run-1',
            scheduledAgentJobId: 'job-1',
          }),
        ).resolves.toBe(true);
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'run.status IN (:...statuses)',
          { statuses: ['queued', 'running'] },
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'run.id <> :excludeRunId',
          { excludeRunId: 'run-1' },
        );
      });

      it('adds no exclusion when excludeRunId is null', async () => {
        await expect(
          repository.hasLiveScheduledRun({
            createdSince: SLOT,
            excludeRunId: null,
            scheduledAgentJobId: 'job-1',
          }),
        ).resolves.toBe(false);
        expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
          'run.id <> :excludeRunId',
          expect.anything(),
        );
      });
    });
  });
});
