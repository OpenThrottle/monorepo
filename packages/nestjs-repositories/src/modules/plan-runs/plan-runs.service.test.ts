import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { EntityManager } from 'typeorm';
import { In, Not } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanRun } from './plan-run.entity.ts';
import { PlanRunsService } from './plan-runs.service.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

const buildRun = (overrides: Partial<PlanRun> = {}): PlanRun => {
  const run: PlanRun = {
    actorUserId: null,
    branch: null,
    bullmqJobId: 'job-1',
    cancelRequestedAt: null,
    cancelRequestedBy: null,
    checkoutId: null,
    createdAt: new Date('2026-07-21T00:00:00Z'),
    executionBackend: 'claude',
    heartbeatExpected: true,
    hostname: null,
    id: 'run-1',
    lastHeartbeatAt: null,
    model: null,
    pid: null,
    planId: 'plan-1',
    queueName: 'plans',
    resumeOfRunId: null,
    runConfigSnapshot: null,
    runKind: 'orchestrator',
    scheduledFor: null,
    settledReason: null,
    status: 'QUEUED',
    updatedAt: new Date('2026-07-21T00:00:00Z'),
    usageLimitResetsAt: null,
    usageLimitType: null,
    workerId: null,
  };

  return { ...run, ...overrides };
};

describe('PlanRunsService', () => {
  let service: PlanRunsService;
  let repo: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let qbGetMany: ReturnType<typeof vi.fn>;
  let qbGetOne: ReturnType<typeof vi.fn>;
  let qbGetRawMany: ReturnType<typeof vi.fn>;
  let qbExecute: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    qbGetMany = vi.fn().mockResolvedValue([]);
    // Chainable QueryBuilder stub: every builder method returns the same object
    // so .where().andWhere().orderBy().take().getMany() resolves through.
    const qb: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of [
      'addOrderBy',
      'addSelect',
      'andWhere',
      'distinctOn',
      'groupBy',
      'orderBy',
      'select',
      'set',
      'take',
      'update',
      'where',
    ]) {
      qb[method] = vi.fn(() => qb);
    }
    qb.getMany = qbGetMany;
    qbGetRawMany = vi.fn().mockResolvedValue([]);
    qb.getRawMany = qbGetRawMany;
    qbGetOne = vi.fn().mockResolvedValue(null);
    qb.getOne = qbGetOne;
    qbExecute = vi.fn().mockResolvedValue({ affected: 0 });
    qb.execute = qbExecute;

    repo = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn((input: Partial<PlanRun>) => buildRun(input)),
      createQueryBuilder: vi.fn(() => qb),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      query: vi.fn().mockResolvedValue([{ count: 0 }]),
      save: vi.fn((row: PlanRun) => Promise.resolve(row)),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    const app = await Test.createTestingModule({
      providers: [
        PlanRunsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(PlanRun),
          useValue: repo,
        },
      ],
    }).compile();

    service = app.get(PlanRunsService);
  });

  const enqueueInput = {
    bullmqJobId: 'job-1',
    executionBackend: 'claude' as const,
    planId: 'plan-1',
    queueName: 'plans',
    runKind: 'orchestrator' as const,
  };

  describe('recordQueuedRun', () => {
    it('inserts a new row when none exists (save, not upsert)', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await service.recordQueuedRun(enqueueInput);

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('updates the existing row idempotently instead of inserting', async () => {
      const existing = buildRun({ id: 'run-existing' });
      repo.findOne
        .mockResolvedValueOnce(existing) // existence probe
        .mockResolvedValueOnce({ ...existing, status: 'QUEUED' }); // re-fetch

      const result = await service.recordQueuedRun(enqueueInput);

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-existing' },
        expect.objectContaining({ bullmqJobId: 'job-1', planId: 'plan-1' }),
      );
      expect(repo.save).not.toHaveBeenCalled();
      expect(result.id).toBe('run-existing');
    });

    it('persists branch, model, and checkoutId provenance at insert', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await service.recordQueuedRun({
        ...enqueueInput,
        branch: 'ot/run-provenance',
        checkoutId: '44444444-4444-4444-8444-444444444444',
        model: 'claude-fable-5',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: 'ot/run-provenance',
          checkoutId: '44444444-4444-4444-8444-444444444444',
          model: 'claude-fable-5',
        }),
      );
    });

    it('persists resumeOfRunId on a usage-limit continuation row and defaults it to null', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.recordQueuedRun({
        ...enqueueInput,
        resumeOfRunId: 'run-limited',
      });
      await service.recordQueuedRun(enqueueInput);

      expect(repo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ resumeOfRunId: 'run-limited' }),
      );
      expect(repo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ resumeOfRunId: null }),
      );
    });

    it('records a SCHEDULED run with its scheduled_for instant, and defaults to QUEUED with no instant', async () => {
      repo.findOne.mockResolvedValue(null);
      const scheduledFor = new Date('2026-07-22T09:00:00Z');

      await service.recordQueuedRun({
        ...enqueueInput,
        scheduledFor,
        status: 'SCHEDULED',
      });
      await service.recordQueuedRun(enqueueInput);

      expect(repo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ scheduledFor, status: 'SCHEDULED' }),
      );
      expect(repo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ scheduledFor: null, status: 'QUEUED' }),
      );
    });

    it('defaults provenance fields to null when omitted', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await service.recordQueuedRun(enqueueInput);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: null,
          checkoutId: null,
          model: null,
        }),
      );
    });
  });

  describe('detached-CLI run lifecycle', () => {
    it('registerCliRun inserts a null-job-id orchestrator row IN_PROGRESS with location cols', async () => {
      const result = await service.registerCliRun({
        executionBackend: 'claude',
        hostname: 'laptop-1',
        pid: 9999,
        planId: 'plan-1',
        workerId: 'cli-abc',
      });

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: null,
          bullmqJobId: null,
          executionBackend: 'claude',
          hostname: 'laptop-1',
          pid: 9999,
          planId: 'plan-1',
          runKind: 'orchestrator',
          status: 'IN_PROGRESS',
          workerId: 'cli-abc',
        }),
      );
      expect(result.runKind).toBe('orchestrator');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('registerCliRun persists a present branch verbatim', async () => {
      await service.registerCliRun({
        branch: '  capture-branch-name  ',
        executionBackend: 'claude',
        hostname: 'laptop-1',
        pid: 9999,
        planId: 'plan-1',
        workerId: 'cli-abc',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ branch: '  capture-branch-name  ' }),
      );
    });

    it('registerCliRun stores null when branch is omitted', async () => {
      await service.registerCliRun({
        executionBackend: 'cursor',
        hostname: null,
        pid: null,
        planId: 'plan-1',
        workerId: null,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ branch: null }),
      );
    });

    it('registerCliRun stores null when branch is explicitly null', async () => {
      await service.registerCliRun({
        branch: null,
        executionBackend: 'cursor',
        hostname: null,
        pid: null,
        planId: 'plan-1',
        workerId: null,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ branch: null }),
      );
    });

    it('registerCliRun defaults actorUserId to null when omitted', async () => {
      await service.registerCliRun({
        executionBackend: 'cursor',
        hostname: null,
        pid: null,
        planId: 'plan-1',
        workerId: null,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ actorUserId: null }),
      );
    });

    it('settleCliRun sets terminal status by id and clears location columns', async () => {
      repo.findOne.mockResolvedValueOnce(
        buildRun({ id: 'run-cli', status: 'CANCELLED' }),
      );

      const result = await service.settleCliRun('run-cli', 'CANCELLED', null);

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-cli' },
        { hostname: null, pid: null, status: 'CANCELLED', workerId: null },
      );
      expect(result?.status).toBe('CANCELLED');
    });

    it('settleCliRun records the usage limit when settling USAGE_LIMITED', async () => {
      const resetsAt = new Date('2026-07-22T05:00:00.000Z');
      repo.findOne.mockResolvedValueOnce(
        buildRun({ id: 'run-cli', status: 'USAGE_LIMITED' }),
      );

      await service.settleCliRun('run-cli', 'USAGE_LIMITED', {
        resetsAt,
        type: 'seven_day',
      });

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-cli' },
        {
          hostname: null,
          pid: null,
          status: 'USAGE_LIMITED',
          usageLimitResetsAt: resetsAt,
          usageLimitType: 'seven_day',
          workerId: null,
        },
      );
    });

    it('settleCliRun leaves the usage-limit columns alone on any other status', async () => {
      repo.findOne.mockResolvedValueOnce(
        buildRun({ id: 'run-cli', status: 'FAILED' }),
      );

      await service.settleCliRun('run-cli', 'FAILED', {
        resetsAt: new Date('2026-07-22T05:00:00.000Z'),
        type: 'seven_day',
      });

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-cli' },
        { hostname: null, pid: null, status: 'FAILED', workerId: null },
      );
    });

    it('settleCliRun returns null when no row matched the id', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      expect(
        await service.settleCliRun('missing', 'COMPLETED', null),
      ).toBeNull();
    });
  });

  describe('run-location lifecycle', () => {
    const location = {
      bullmqJobId: 'job-1',
      hostname: 'host-a',
      pid: 4242,
      queueName: 'plans',
      workerId: 'worker-x',
    };

    it('markRunStarted stamps hostname/pid/worker_id and IN_PROGRESS in ONE conditional update by (queue, job)', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 1 });

      const affected = await service.markRunStarted(location);

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.update).toHaveBeenCalledTimes(1);
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'host-a',
          lastHeartbeatAt: expect.any(Date),
          pid: 4242,
          status: 'IN_PROGRESS',
          workerId: 'worker-x',
        }),
      );
      expect(qb.where).toHaveBeenCalledWith('bullmq_job_id = :bullmqJobId', {
        bullmqJobId: 'job-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('queue_name = :queueName', {
        queueName: 'plans',
      });
      expect(affected).toBe(1);
    });

    it('markRunStarted only claims a QUEUED (first pickup) or IN_PROGRESS (retry / stall recovery) row', async () => {
      await service.markRunStarted(location);

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        'status IN (:...startableStatuses)',
        { startableStatuses: ['IN_PROGRESS', 'QUEUED'] },
      );
    });

    it.each([
      'CANCELLED',
      'COMPLETED',
      'FAILED',
      'MISSED',
      'SCHEDULED',
      'STALE',
      'SUPERSEDED',
      'USAGE_LIMITED',
    ])(
      'markRunStarted never reopens or skips the gate for a %s row (guard rejects, returns 0)',
      async (status) => {
        // The guard is in the WHERE, so the DB matches no row for any status outside the startable
        // pair; a SCHEDULED row has to be claimed QUEUED by the fire-time policy first.
        qbExecute.mockResolvedValueOnce({ affected: 0 });

        const affected = await service.markRunStarted(location);

        const qb = repo.createQueryBuilder.mock.results[0]?.value;
        expect(affected).toBe(0);
        expect(qb.andWhere).toHaveBeenCalledWith(
          'status IN (:...startableStatuses)',
          {
            startableStatuses: expect.not.arrayContaining([status]),
          },
        );
      },
    );

    it('clearRunLocation nulls the location columns but not the marker', async () => {
      await service.clearRunLocation('plans', 'job-1');

      expect(repo.update).toHaveBeenCalledWith(
        { bullmqJobId: 'job-1', queueName: 'plans' },
        { hostname: null, pid: null, workerId: null },
      );
    });
  });

  describe('settleRunByJob', () => {
    it('sets terminal status by (queueName, bullmqJobId) and clears location columns', async () => {
      repo.findOne.mockResolvedValueOnce(
        buildRun({ bullmqJobId: 'job-42', status: 'COMPLETED' }),
      );

      const result = await service.settleRunByJob(
        'plans',
        'job-42',
        'COMPLETED',
      );

      expect(repo.update).toHaveBeenCalledWith(
        { bullmqJobId: 'job-42', queueName: 'plans' },
        { hostname: null, pid: null, status: 'COMPLETED', workerId: null },
      );
      expect(result?.status).toBe('COMPLETED');
    });

    it('returns null when no row matches the (queueName, bullmqJobId) pair', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      expect(
        await service.settleRunByJob('plans', 'missing-job', 'FAILED'),
      ).toBeNull();
    });
  });

  describe('findRunHistoryByPlanId', () => {
    it('adds every SCHEDULED run to the newest non-SCHEDULED runs, newest createdAt first', async () => {
      const old = buildRun({
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        id: 'scheduled-long-ago',
        status: 'SCHEDULED',
      });
      const recent = buildRun({
        createdAt: new Date('2026-11-05T00:00:00.000Z'),
        id: 'recent-completed',
        status: 'COMPLETED',
      });
      repo.find.mockResolvedValueOnce([recent]).mockResolvedValueOnce([old]);

      const result = await service.findRunHistoryByPlanId('plan-1', 25, 100);

      expect(repo.find).toHaveBeenNthCalledWith(1, {
        order: { createdAt: 'DESC' },
        take: 25,
        where: { planId: 'plan-1', status: Not('SCHEDULED') },
      });
      expect(repo.find).toHaveBeenNthCalledWith(2, {
        order: { scheduledFor: 'ASC' },
        take: 100,
        where: { planId: 'plan-1', status: 'SCHEDULED' },
      });
      expect(result.map((run) => run.id)).toEqual([
        'recent-completed',
        'scheduled-long-ago',
      ]);
    });
  });

  describe('rescheduleScheduledRun', () => {
    it('moves scheduled_for only while the row is SCHEDULED', async () => {
      const scheduledFor = new Date('2026-11-02T09:00:00.000Z');
      qbExecute.mockResolvedValueOnce({ affected: 1 });

      expect(await service.rescheduleScheduledRun('run-1', scheduledFor)).toBe(
        true,
      );

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.set).toHaveBeenCalledWith({ scheduledFor });
      expect(qb.where).toHaveBeenCalledWith('id = :planRunId', {
        planRunId: 'run-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('status = :status', {
        status: 'SCHEDULED',
      });
    });

    it('reports false when the run is no longer SCHEDULED', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 0 });

      expect(await service.rescheduleScheduledRun('run-1', FIXED_NOW)).toBe(
        false,
      );
    });
  });

  describe('settleUnsettledRunByJob', () => {
    it('settles by (queueName, bullmqJobId) only while the row is QUEUED or IN_PROGRESS', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 1 });

      expect(
        await service.settleUnsettledRunByJob('plans', 'job-42', 'FAILED'),
      ).toBe(true);

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.set).toHaveBeenCalledWith({
        hostname: null,
        pid: null,
        status: 'FAILED',
        workerId: null,
      });
      expect(qb.where).toHaveBeenCalledWith('bullmq_job_id = :bullmqJobId', {
        bullmqJobId: 'job-42',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('queue_name = :queueName', {
        queueName: 'plans',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'status IN (:...startableStatuses)',
        { startableStatuses: ['IN_PROGRESS', 'QUEUED'] },
      );
    });

    it('reports false when the guard matched nothing (a settled or SCHEDULED row)', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 0 });

      expect(
        await service.settleUnsettledRunByJob('plans', 'job-42', 'FAILED'),
      ).toBe(false);
    });
  });

  describe('settleScheduledRunsCancelled', () => {
    it('settles the plan SCHEDULED rows to CANCELLED, guarded on status SCHEDULED, keeping scheduled_for', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 2 });

      const settled = await service.settleScheduledRunsCancelled('plan-1');

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.set).toHaveBeenCalledWith({
        hostname: null,
        pid: null,
        status: 'CANCELLED',
        workerId: null,
      });
      expect(qb.where).toHaveBeenCalledWith('plan_id = :planId', {
        planId: 'plan-1',
      });
      // The guard is what makes cancel idempotent: a fired (IN_PROGRESS) or settled row never matches.
      expect(qb.andWhere).toHaveBeenCalledWith('status = :status', {
        status: 'SCHEDULED',
      });
      expect(settled).toBe(2);
    });

    it('returns 0 when nothing is SCHEDULED (repeat cancel, or the run already fired)', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 0 });

      expect(await service.settleScheduledRunsCancelled('plan-1')).toBe(0);
    });

    it('excludes the rows of jobs a worker holds locked', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 0 });

      await service.settleScheduledRunsCancelled('plan-1', ['job-firing']);

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('NOT IN (:...exceptBullmqJobIds)'),
        { exceptBullmqJobIds: ['job-firing'] },
      );
    });
  });

  describe('settleQueuedRunsCancelledByJobIds', () => {
    it('settles the rows of removed jobs to CANCELLED, guarded on status QUEUED', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 1 });

      const settled = await service.settleQueuedRunsCancelledByJobIds('plans', [
        'usage-limit-resume-run-1',
      ]);

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.set).toHaveBeenCalledWith({
        hostname: null,
        pid: null,
        status: 'CANCELLED',
        workerId: null,
      });
      expect(qb.where).toHaveBeenCalledWith('queue_name = :queueName', {
        queueName: 'plans',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'bullmq_job_id IN (:...bullmqJobIds)',
        { bullmqJobIds: ['usage-limit-resume-run-1'] },
      );
      // The guard keeps a row whose job already started (IN_PROGRESS) or settled untouched.
      expect(qb.andWhere).toHaveBeenCalledWith('status = :status', {
        status: 'QUEUED',
      });
      expect(settled).toBe(1);
    });

    it('writes nothing when no job was removed', async () => {
      expect(await service.settleQueuedRunsCancelledByJobIds('plans', [])).toBe(
        0,
      );
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('cancelScheduledRunsForPlan', () => {
    it('settles the plan SCHEDULED rows CANCELLED, guarded on status, and returns their job ids', async () => {
      repo.find.mockResolvedValueOnce([
        { bullmqJobId: 'scheduled-plan-run-a', id: 'run-a' },
      ]);
      qbExecute.mockResolvedValueOnce({ affected: 1 });

      const cancelled = await service.cancelScheduledRunsForPlan('plan-1');

      expect(repo.find).toHaveBeenCalledWith({
        select: { bullmqJobId: true, id: true },
        where: { planId: 'plan-1', status: 'SCHEDULED' },
      });
      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.set).toHaveBeenCalledWith({
        hostname: null,
        pid: null,
        status: 'CANCELLED',
        workerId: null,
      });
      expect(qb.where).toHaveBeenCalledWith('id IN (:...ids)', {
        ids: ['run-a'],
      });
      expect(qb.andWhere).toHaveBeenCalledWith('status = :status', {
        status: 'SCHEDULED',
      });
      expect(cancelled).toEqual([
        { bullmqJobId: 'scheduled-plan-run-a', id: 'run-a' },
      ]);
    });

    it('writes nothing when the plan has no SCHEDULED run', async () => {
      repo.find.mockResolvedValueOnce([]);

      expect(await service.cancelScheduledRunsForPlan('plan-1')).toEqual([]);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('findScheduledByPlanId', () => {
    it('reads only the plan SCHEDULED rows', async () => {
      repo.find.mockResolvedValueOnce([buildRun({ status: 'SCHEDULED' })]);

      const rows = await service.findScheduledByPlanId('plan-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { planId: 'plan-1', status: 'SCHEDULED' },
      });
      expect(rows).toHaveLength(1);
    });
  });

  describe('settleScheduledRunCancelled', () => {
    it('settles exactly one run, guarded on id and status SCHEDULED', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 1 });

      const settled = await service.settleScheduledRunCancelled('run-9');

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.set).toHaveBeenCalledWith({
        hostname: null,
        pid: null,
        status: 'CANCELLED',
        workerId: null,
      });
      expect(qb.where).toHaveBeenCalledWith('id = :planRunId', {
        planRunId: 'run-9',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('status = :status', {
        status: 'SCHEDULED',
      });
      expect(settled).toBe(true);
    });

    it('returns false when the run already fired or settled (idempotent)', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 0 });

      expect(await service.settleScheduledRunCancelled('run-9')).toBe(false);
    });
  });

  describe('transitionScheduledRun', () => {
    it.each(['QUEUED', 'MISSED', 'SUPERSEDED', 'SKIPPED'] as const)(
      'moves one SCHEDULED run to %s in a conditional update guarded on id AND status SCHEDULED',
      async (toStatus) => {
        qbExecute.mockResolvedValueOnce({ affected: 1 });

        const won = await service.transitionScheduledRun('run-9', toStatus);

        const qb = repo.createQueryBuilder.mock.results[0]?.value;
        expect(qb.set).toHaveBeenCalledWith({
          hostname: null,
          pid: null,
          status: toStatus,
          workerId: null,
        });
        expect(qb.where).toHaveBeenCalledWith('id = :planRunId', {
          planRunId: 'run-9',
        });
        expect(qb.andWhere).toHaveBeenCalledWith('status = :status', {
          status: 'SCHEDULED',
        });
        expect(won).toBe(true);
      },
    );

    it('persists the settled reason on the settle, and writes none on a plain claim', async () => {
      qbExecute.mockResolvedValue({ affected: 1 });

      await service.transitionScheduledRun(
        'run-9',
        'SKIPPED',
        undefined,
        'the plan had no tasks left to run',
      );
      await service.transitionScheduledRun('run-9', 'QUEUED');

      const [skipped, queued] = repo.createQueryBuilder.mock.results.map(
        (result) => result.value,
      );
      expect(skipped.set).toHaveBeenCalledWith({
        hostname: null,
        pid: null,
        settledReason: 'the plan had no tasks left to run',
        status: 'SKIPPED',
        workerId: null,
      });
      expect(queued.set).toHaveBeenCalledWith({
        hostname: null,
        pid: null,
        status: 'QUEUED',
        workerId: null,
      });
    });

    it('returns false when a concurrent cancel already settled the row (the loser backs off)', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 0 });

      expect(await service.transitionScheduledRun('run-9', 'QUEUED')).toBe(
        false,
      );
    });

    it('enlists in a caller-owned transaction when given a manager', async () => {
      const txQb = {
        andWhere: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ affected: 1 }),
        set: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };
      const txRepo = { createQueryBuilder: vi.fn(() => txQb) };
      const manager = createMock<EntityManager>({
        getRepository: vi.fn().mockReturnValue(txRepo),
      });

      await service.transitionScheduledRun('run-9', 'QUEUED', manager);

      expect(txQb.execute).toHaveBeenCalledTimes(1);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('hasActiveRun', () => {
    it('counts the plan QUEUED/IN_PROGRESS rows other than the firing run', async () => {
      repo.count.mockResolvedValueOnce(1);

      const active = await service.hasActiveRun('plan-1', 'run-firing');

      expect(active).toBe(true);
      expect(repo.count).toHaveBeenCalledWith({
        where: {
          id: Not('run-firing'),
          planId: 'plan-1',
          status: In(['IN_PROGRESS', 'QUEUED']),
        },
      });
    });

    it('is false when no other run holds the plan', async () => {
      repo.count.mockResolvedValueOnce(0);

      expect(await service.hasActiveRun('plan-1', 'run-firing')).toBe(false);
    });
  });

  describe('hasUnsettledRun', () => {
    it('counts the plan QUEUED/IN_PROGRESS/SCHEDULED rows', async () => {
      repo.count.mockResolvedValueOnce(1);

      expect(await service.hasUnsettledRun('plan-1')).toBe(true);
      expect(repo.count).toHaveBeenCalledWith({
        where: {
          planId: 'plan-1',
          status: In(['IN_PROGRESS', 'QUEUED', 'SCHEDULED']),
        },
      });
    });

    it('is false when every run of the plan is settled', async () => {
      repo.count.mockResolvedValueOnce(0);

      expect(await service.hasUnsettledRun('plan-1')).toBe(false);
    });
  });

  describe('findScheduledRunsWithJob', () => {
    it('reads SCHEDULED rows that carry a job id and an instant, soonest first, capped', async () => {
      qbGetMany.mockResolvedValueOnce([buildRun({ status: 'SCHEDULED' })]);

      const rows = await service.findScheduledRunsWithJob(50);

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.where).toHaveBeenCalledWith('run.status = :status', {
        status: 'SCHEDULED',
      });
      // A jobless row (detached CLI, interactive /ot-loop) can never look like a lost delayed job.
      expect(qb.andWhere).toHaveBeenCalledWith('run.bullmq_job_id IS NOT NULL');
      expect(qb.andWhere).toHaveBeenCalledWith('run.scheduled_for IS NOT NULL');
      expect(qb.orderBy).toHaveBeenCalledWith('run.scheduled_for', 'ASC');
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(rows).toHaveLength(1);
    });
  });

  describe('settleRunUsageLimited', () => {
    const resetsAt = new Date('2026-07-21T05:00:00Z');

    it('writes USAGE_LIMITED with the limit, guarded to a QUEUED/IN_PROGRESS row, and returns the row', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 1 });
      const settled = buildRun({
        status: 'USAGE_LIMITED',
        usageLimitResetsAt: resetsAt,
        usageLimitType: 'five_hour',
      });
      repo.findOne.mockResolvedValueOnce(settled);

      const result = await service.settleRunUsageLimited('plans', 'job-1', {
        resetsAt,
        type: 'five_hour',
      });

      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.set).toHaveBeenCalledWith({
        hostname: null,
        pid: null,
        status: 'USAGE_LIMITED',
        usageLimitResetsAt: resetsAt,
        usageLimitType: 'five_hour',
        workerId: null,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('status IN (:...statuses)', {
        statuses: ['IN_PROGRESS', 'QUEUED'],
      });
      expect(result).toBe(settled);
    });

    it('returns null without re-reading when the guard matched no row (already settled elsewhere)', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 0 });

      const result = await service.settleRunUsageLimited('plans', 'job-1', {
        resetsAt: null,
        type: null,
      });

      expect(result).toBeNull();
      expect(repo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('countUsageLimitedInChain', () => {
    it('walks the resume chain with a depth-bounded recursive query and returns the count', async () => {
      repo.query.mockResolvedValueOnce([{ count: 2 }]);

      const count = await service.countUsageLimitedInChain('run-3', 5);

      expect(count).toBe(2);
      const [sql, params] = repo.query.mock.calls[0] ?? [];
      expect(sql).toContain('WITH RECURSIVE');
      expect(sql).toContain('chain.depth < $2');
      expect(params).toEqual(['run-3', 5, 'USAGE_LIMITED']);
    });

    it('coerces a string count and treats an empty result as zero', async () => {
      repo.query.mockResolvedValueOnce([{ count: '3' }]);
      expect(await service.countUsageLimitedInChain('run-1', 5)).toBe(3);

      repo.query.mockResolvedValueOnce([]);
      expect(await service.countUsageLimitedInChain('run-1', 5)).toBe(0);
    });
  });

  describe('cancel marker', () => {
    const expectSkipsNeverStartedScheduledRuns = (): void => {
      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      expect(qb.where).toHaveBeenCalledWith('run.plan_id = :planId', {
        planId: 'plan-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'NOT (run.scheduled_for IS NOT NULL AND run.last_heartbeat_at IS NULL AND run.status NOT IN (:...startableStatuses))',
        { startableStatuses: ['IN_PROGRESS', 'QUEUED'] },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('run.created_at', 'DESC');
    };

    it('stampCancelRequested marks the newest run row', async () => {
      qbGetOne.mockResolvedValueOnce(buildRun({ id: 'run-newest' }));

      const runId = await service.stampCancelRequested('plan-1', 'user-9');

      expect(runId).toBe('run-newest');
      expectSkipsNeverStartedScheduledRuns();
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-newest' },
        expect.objectContaining({ cancelRequestedBy: 'user-9' }),
      );
    });

    it('stampCancelRequested skips a newer SCHEDULED row so the marker lands on the live run', async () => {
      // The DB applies the predicate: of [SCHEDULED run-scheduled (newer), IN_PROGRESS run-live],
      // only run-live survives it, so the newest-first read returns the live run.
      qbGetOne.mockResolvedValueOnce(
        buildRun({ id: 'run-live', status: 'IN_PROGRESS' }),
      );

      const runId = await service.stampCancelRequested('plan-1', 'user-9');

      expectSkipsNeverStartedScheduledRuns();
      expect(runId).toBe('run-live');
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-live' },
        expect.objectContaining({ cancelRequestedBy: 'user-9' }),
      );
    });

    it('stampCancelRequested returns null when the plan has no run row', async () => {
      qbGetOne.mockResolvedValue(null);

      const runId = await service.stampCancelRequested('plan-1', null);

      expect(runId).toBeNull();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('readCancelRequested returns the newest run marker when set', async () => {
      const at = new Date('2026-07-21T01:00:00Z');
      qbGetOne.mockResolvedValueOnce(
        buildRun({ cancelRequestedAt: at, cancelRequestedBy: 'user-9' }),
      );

      const marker = await service.readCancelRequested('plan-1');

      expect(marker).toEqual({
        cancelRequestedAt: at,
        cancelRequestedBy: 'user-9',
      });
    });

    it('readCancelRequested reads past a newer SCHEDULED row, agreeing with the stamp', async () => {
      const at = new Date('2026-07-21T01:00:00Z');
      qbGetOne.mockResolvedValueOnce(
        buildRun({
          cancelRequestedAt: at,
          cancelRequestedBy: 'user-9',
          id: 'run-live',
          status: 'IN_PROGRESS',
        }),
      );

      const marker = await service.readCancelRequested('plan-1');

      expectSkipsNeverStartedScheduledRuns();
      expect(marker?.cancelRequestedAt).toBe(at);
    });

    it('readCancelRequested returns null when the newest run has no marker (no stale bleed)', async () => {
      // A fresh run (newest row, marker unset) must not inherit an older run's cancel.
      qbGetOne.mockResolvedValueOnce(buildRun({ cancelRequestedAt: null }));

      expect(await service.readCancelRequested('plan-1')).toBeNull();
    });

    it('readCancelRequested returns null when the plan has no run row', async () => {
      qbGetOne.mockResolvedValueOnce(null);

      expect(await service.readCancelRequested('plan-1')).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the run for an id, or null when none matches', async () => {
      repo.findOne.mockResolvedValueOnce(buildRun({ id: 'run-x' }));
      expect((await service.findById('run-x'))?.id).toBe('run-x');

      repo.findOne.mockResolvedValueOnce(null);
      expect(await service.findById('missing')).toBeNull();
    });
  });

  describe('heartbeat + staleness', () => {
    it('registerCliRun stamps an initial heartbeat so a fresh run is immediately alive', async () => {
      await service.registerCliRun({
        executionBackend: 'claude',
        hostname: 'laptop-1',
        pid: 1,
        planId: 'plan-1',
        workerId: 'cli-abc',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lastHeartbeatAt: expect.any(Date) }),
      );
    });

    it('recordHeartbeatById bumps last_heartbeat_at by run id and returns affected', async () => {
      repo.update.mockResolvedValueOnce({ affected: 1 });

      const affected = await service.recordHeartbeatById('run-cli');

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-cli' },
        { lastHeartbeatAt: expect.any(Date) },
      );
      expect(affected).toBe(1);
    });

    it('recordHeartbeatById returns 0 for an unknown id', async () => {
      repo.update.mockResolvedValueOnce({ affected: 0 });

      expect(await service.recordHeartbeatById('missing')).toBe(0);
    });

    it('recordHeartbeatByJob bumps last_heartbeat_at by (queue, job)', async () => {
      repo.update.mockResolvedValueOnce({ affected: 1 });

      const affected = await service.recordHeartbeatByJob('plans', 'job-1');

      expect(repo.update).toHaveBeenCalledWith(
        { bullmqJobId: 'job-1', queueName: 'plans' },
        { lastHeartbeatAt: expect.any(Date) },
      );
      expect(affected).toBe(1);
    });

    it('findStaleInProgressRuns filters IN_PROGRESS + COALESCE(heartbeat, created) < cutoff, oldest first', async () => {
      const stale = buildRun({ id: 'run-stale', status: 'IN_PROGRESS' });
      qbGetMany.mockResolvedValueOnce([stale]);
      const cutoff = new Date('2026-07-21T00:02:00Z');

      const result = await service.findStaleInProgressRuns(cutoff, 200);
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.where).toHaveBeenCalledWith('run.status = :status', {
        status: 'IN_PROGRESS',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(run.last_heartbeat_at, run.created_at) < :cutoff',
        { cutoff },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('run.created_at', 'ASC');
      expect(qb.take).toHaveBeenCalledWith(200);
      expect(result).toEqual([stale]);
    });

    it('findLiveRunsByCheckoutIds filters IN_PROGRESS + COALESCE(heartbeat, created) >= cutoff, newest first', async () => {
      const live = buildRun({ id: 'run-live', status: 'IN_PROGRESS' });
      qbGetMany.mockResolvedValueOnce([live]);
      const cutoff = new Date('2026-07-21T00:02:00Z');

      const result = await service.findLiveRunsByCheckoutIds(
        ['checkout-a', 'checkout-b'],
        cutoff,
      );
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.where).toHaveBeenCalledWith('run.status = :status', {
        status: 'IN_PROGRESS',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'run.checkout_id IN (:...checkoutIds)',
        { checkoutIds: ['checkout-a', 'checkout-b'] },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(NOT run.heartbeat_expected OR COALESCE(run.last_heartbeat_at, run.created_at) >= :cutoff)',
        { cutoff },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('run.created_at', 'DESC');
      expect(result).toEqual([live]);
    });

    it('findLiveRunsByCheckoutIds short-circuits on an empty id list', async () => {
      const result = await service.findLiveRunsByCheckoutIds(
        [],
        new Date(FIXED_NOW),
      );

      expect(result).toEqual([]);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('findPlanIdsWithLiveDetachedRun reads only the newest run per plan', async () => {
      await service.findPlanIdsWithLiveDetachedRun(
        ['plan-a', 'plan-b'],
        new Date('2026-07-21T00:01:00Z'),
      );
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.distinctOn).toHaveBeenCalledWith(['run.plan_id']);
      expect(qb.where).toHaveBeenCalledWith('run.plan_id IN (:...planIds)', {
        planIds: ['plan-a', 'plan-b'],
      });
      expect(qb.orderBy).toHaveBeenCalledWith('run.plan_id', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('run.created_at', 'DESC');
    });

    it('findPlanIdsWithLiveDetachedRun skips never-started scheduled rows when picking the newest run', async () => {
      // A run scheduled while an interactive loop is live is the NEWER row; without the predicate it
      // would stand in for the loop and hand the live plan back to the startup reconcile.
      await service.findPlanIdsWithLiveDetachedRun(
        ['plan-a'],
        new Date('2026-07-21T00:01:00Z'),
      );
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.andWhere).toHaveBeenCalledWith(
        'NOT (run.scheduled_for IS NOT NULL AND run.last_heartbeat_at IS NULL AND run.status NOT IN (:...startableStatuses))',
        { startableStatuses: ['IN_PROGRESS', 'QUEUED'] },
      );
    });

    it('findPlanIdsWithLiveDetachedRun keeps a live interactive run and drops a queued one', async () => {
      const now = new Date('2026-07-21T09:00:00Z');
      qbGetMany.mockResolvedValueOnce([
        // /ot-loop: no job, no timer, 9h old — live (under the 12h age cutoff).
        buildRun({
          bullmqJobId: null,
          heartbeatExpected: false,
          planId: 'plan-interactive',
          status: 'IN_PROGRESS',
        }),
        // A queued run has a job; whether it is live is the active-job check's call, not this.
        buildRun({
          bullmqJobId: 'job-9',
          planId: 'plan-queued',
          status: 'IN_PROGRESS',
        }),
        // Already settled by its owner.
        buildRun({
          bullmqJobId: null,
          heartbeatExpected: false,
          planId: 'plan-settled',
          status: 'COMPLETED',
        }),
      ]);

      const result = await service.findPlanIdsWithLiveDetachedRun(
        ['plan-interactive', 'plan-queued', 'plan-settled'],
        now,
      );

      expect(result).toEqual(new Set(['plan-interactive']));
    });

    it('findPlanIdsWithLiveDetachedRun applies the same cutoffs as the sweepers', async () => {
      const createdAt = new Date('2026-07-21T00:00:00Z');
      qbGetMany.mockResolvedValueOnce([
        // Unsupervised, past the 12h age cutoff: the age sweep would settle it, so it is dead.
        buildRun({
          bullmqJobId: null,
          createdAt,
          heartbeatExpected: false,
          planId: 'plan-abandoned-loop',
          status: 'IN_PROGRESS',
        }),
        // Detached CLI heartbeating 30s ago: live.
        buildRun({
          bullmqJobId: null,
          createdAt,
          heartbeatExpected: true,
          lastHeartbeatAt: new Date('2026-07-21T12:00:30Z'),
          planId: 'plan-live-cli',
          status: 'IN_PROGRESS',
        }),
        // Detached CLI silent for 3 minutes: past the 120s cutoff, dead.
        buildRun({
          bullmqJobId: null,
          createdAt,
          heartbeatExpected: true,
          lastHeartbeatAt: new Date('2026-07-21T11:58:00Z'),
          planId: 'plan-dead-cli',
          status: 'IN_PROGRESS',
        }),
      ]);

      const result = await service.findPlanIdsWithLiveDetachedRun(
        ['plan-abandoned-loop', 'plan-live-cli', 'plan-dead-cli'],
        new Date('2026-07-21T12:01:00Z'),
      );

      expect(result).toEqual(new Set(['plan-live-cli']));
    });

    it('findPlanIdsWithLiveDetachedRun short-circuits on an empty id list', async () => {
      await expect(service.findPlanIdsWithLiveDetachedRun([])).resolves.toEqual(
        new Set(),
      );
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('findUnsettledRunsByCheckoutIds matches QUEUED and IN_PROGRESS with no liveness cutoff', async () => {
      const stranded = buildRun({ id: 'run-stranded', status: 'IN_PROGRESS' });
      qbGetMany.mockResolvedValueOnce([stranded]);

      const result = await service.findUnsettledRunsByCheckoutIds([
        'checkout-a',
      ]);
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.where).toHaveBeenCalledWith('run.status IN (:...statuses)', {
        statuses: ['QUEUED', 'IN_PROGRESS'],
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'run.checkout_id IN (:...checkoutIds)',
        { checkoutIds: ['checkout-a'] },
      );
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('heartbeat'),
        expect.anything(),
      );
      expect(result).toEqual([stranded]);
    });

    it('findUnsettledRunsByCheckoutIds short-circuits on an empty id list', async () => {
      await expect(service.findUnsettledRunsByCheckoutIds([])).resolves.toEqual(
        [],
      );
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('findStaleInProgressRuns excludes runs that do not heartbeat', async () => {
      // The sweeper this feeds does not merely settle the run — reconcileStrandedPlan
      // resets the plan and its IN_PROGRESS tasks to PENDING. A run with no timer must
      // never be a candidate, so the exclusion is a WHERE clause, not a post-filter.
      await service.findStaleInProgressRuns(new Date(FIXED_NOW), 200);
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.andWhere).toHaveBeenCalledWith('run.heartbeat_expected');
    });

    it('findLiveRunsByCheckoutIds treats a non-heartbeating IN_PROGRESS run as live', async () => {
      // No timer means IN_PROGRESS is the only liveness signal there is; applying the
      // cutoff would report a healthy interactive loop's worktree idle two minutes in.
      const unsupervised = buildRun({
        heartbeatExpected: false,
        id: 'run-unsupervised',
        lastHeartbeatAt: new Date('2026-07-21T00:00:00Z'),
        status: 'IN_PROGRESS',
      });
      qbGetMany.mockResolvedValueOnce([unsupervised]);

      const result = await service.findLiveRunsByCheckoutIds(
        ['checkout-a'],
        new Date('2026-07-21T09:00:00Z'),
      );
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('NOT run.heartbeat_expected OR'),
        expect.anything(),
      );
      expect(result).toEqual([unsupervised]);
    });

    it('findStaleUnsupervisedRuns is the exact complement of findStaleInProgressRuns', async () => {
      // Between them the two finders must cover every IN_PROGRESS row: heartbeat_expected
      // rows go to the 120s sweep, NOT heartbeat_expected rows go here. A row matching
      // neither would have no janitor at all, which is the debt this closes.
      const abandoned = buildRun({
        heartbeatExpected: false,
        id: 'run-abandoned',
        status: 'IN_PROGRESS',
      });
      qbGetMany.mockResolvedValueOnce([abandoned]);
      const cutoff = new Date('2026-07-21T12:00:00Z');

      const result = await service.findStaleUnsupervisedRuns(cutoff, 200);
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.where).toHaveBeenCalledWith('run.status = :status', {
        status: 'IN_PROGRESS',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('NOT run.heartbeat_expected');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(run.last_heartbeat_at, run.created_at) < :cutoff',
        { cutoff },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('run.created_at', 'ASC');
      expect(qb.take).toHaveBeenCalledWith(200);
      expect(result).toEqual([abandoned]);
    });

    it('settleSupersededUnsupervisedRuns settles only unsupervised IN_PROGRESS rows on the plan', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 2 });

      const affected = await service.settleSupersededUnsupervisedRuns('plan-1');
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.set).toHaveBeenCalledWith({
        hostname: null,
        pid: null,
        status: 'STALE',
        workerId: null,
      });
      expect(qb.where).toHaveBeenCalledWith('plan_id = :planId', {
        planId: 'plan-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('status = :status', {
        status: 'IN_PROGRESS',
      });
      // A queued or detached-CLI run has a timer and a sweeper of its own — never collateral.
      expect(qb.andWhere).toHaveBeenCalledWith('NOT heartbeat_expected');
      expect(affected).toBe(2);
    });

    it('registerCliRun settles a superseded unsupervised run before inserting the new one', async () => {
      // Ordering matters: settle first, then insert, so the brand-new row can never be
      // caught by its own supersede pass.
      const calls: string[] = [];
      repo.createQueryBuilder.mockImplementation(() => {
        calls.push('supersede');
        const qb: Record<string, ReturnType<typeof vi.fn>> = {};
        for (const method of ['andWhere', 'set', 'update', 'where']) {
          qb[method] = vi.fn(() => qb);
        }
        qb.execute = vi.fn().mockResolvedValue({ affected: 1 });

        return qb;
      });
      repo.save.mockImplementation(async (run: PlanRun) => {
        calls.push('save');

        return run;
      });

      await service.registerCliRun({
        executionBackend: 'claude',
        heartbeatExpected: false,
        hostname: null,
        pid: null,
        planId: 'plan-1',
        workerId: null,
      });

      expect(calls).toEqual(['supersede', 'save']);
    });

    it('registerCliRun does NOT supersede when the new run heartbeats', async () => {
      // A heartbeating run is the 120s sweep's business; registering one says nothing
      // about an unrelated unsupervised row.
      await service.registerCliRun({
        executionBackend: 'claude',
        hostname: null,
        pid: null,
        planId: 'plan-1',
        workerId: null,
      });

      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('forceSettleUnsupervisedRun guards on IN_PROGRESS AND not-heartbeating', async () => {
      // Both guards matter. Without the status guard a human could re-settle a COMPLETED run;
      // without the heartbeat guard they could kill a genuinely live heartbeating run that has
      // a sweeper of its own.
      qbExecute.mockResolvedValueOnce({ affected: 1 });
      repo.findOne.mockResolvedValueOnce(
        buildRun({ heartbeatExpected: false, id: 'run-1', status: 'STALE' }),
      );

      const result = await service.forceSettleUnsupervisedRun('run-1');
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.where).toHaveBeenCalledWith('id = :planRunId', {
        planRunId: 'run-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('status = :status', {
        status: 'IN_PROGRESS',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('NOT heartbeat_expected');
      // STALE, never COMPLETED/CANCELLED/FAILED: a human knows contact was lost, not
      // how the work ended.
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'STALE' }),
      );
      expect(result?.status).toBe('STALE');
    });

    it('forceSettleUnsupervisedRun returns null without reading the row back when nothing matched', async () => {
      qbExecute.mockResolvedValueOnce({ affected: 0 });

      const result = await service.forceSettleUnsupervisedRun('run-live');

      expect(result).toBeNull();
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('registerCliRun defaults heartbeatExpected to true so the CLI is untouched', async () => {
      await service.registerCliRun({
        executionBackend: 'claude',
        hostname: null,
        pid: null,
        planId: 'plan-1',
        workerId: null,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ heartbeatExpected: true }),
      );
    });

    it('registerCliRun persists an explicit heartbeatExpected false', async () => {
      await service.registerCliRun({
        executionBackend: 'claude',
        heartbeatExpected: false,
        hostname: null,
        pid: null,
        planId: 'plan-1',
        workerId: null,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ heartbeatExpected: false }),
      );
    });

    it('registerCliRun persists model, defaulting to null when omitted', async () => {
      await service.registerCliRun({
        executionBackend: 'claude',
        hostname: null,
        model: 'claude-opus-5',
        pid: null,
        planId: 'plan-1',
        workerId: null,
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-5' }),
      );

      repo.create.mockClear();
      await service.registerCliRun({
        executionBackend: 'claude',
        hostname: null,
        pid: null,
        planId: 'plan-1',
        workerId: null,
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: null }),
      );
    });

    it('settleStaleRun sets STALE + clears location, guarded on status IN_PROGRESS', async () => {
      repo.findOne.mockResolvedValueOnce(
        buildRun({ id: 'run-stale', status: 'STALE' }),
      );

      const result = await service.settleStaleRun('run-stale');

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-stale', status: 'IN_PROGRESS' },
        { hostname: null, pid: null, status: 'STALE', workerId: null },
      );
      expect(result?.status).toBe('STALE');
    });

    it('settleStaleRun is a no-op returning the row when it already reached a terminal status', async () => {
      // The status-guarded update matches 0 rows; the row is re-fetched as-is (e.g. COMPLETED).
      repo.update.mockResolvedValueOnce({ affected: 0 });
      repo.findOne.mockResolvedValueOnce(
        buildRun({ id: 'run-done', status: 'COMPLETED' }),
      );

      const result = await service.settleStaleRun('run-done');

      expect(result?.status).toBe('COMPLETED');
    });
  });

  describe('setCheckoutIdIfNull', () => {
    it('updates only when checkout_id is still NULL and returns the refreshed row', async () => {
      const updated = buildRun({
        checkoutId: '44444444-4444-4444-8444-444444444444',
      });
      repo.findOne.mockResolvedValueOnce(updated);

      const result = await service.setCheckoutIdIfNull(
        'run-1',
        '44444444-4444-4444-8444-444444444444',
      );

      expect(repo.update).toHaveBeenCalledWith(
        { checkoutId: expect.anything(), id: 'run-1' },
        { checkoutId: '44444444-4444-4444-8444-444444444444' },
      );
      expect(result?.checkoutId).toBe('44444444-4444-4444-8444-444444444444');
    });
  });

  describe('setCheckoutAndBranch', () => {
    it('overwrites checkout_id and branch on the run row', async () => {
      const updated = buildRun({
        branch: 'openthrottle/plan-abcdef12',
        checkoutId: '44444444-4444-4444-8444-444444444444',
      });
      repo.findOne.mockResolvedValueOnce(updated);

      const result = await service.setCheckoutAndBranch('run-1', {
        branch: 'openthrottle/plan-abcdef12',
        checkoutId: '44444444-4444-4444-8444-444444444444',
      });

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-1' },
        {
          branch: 'openthrottle/plan-abcdef12',
          checkoutId: '44444444-4444-4444-8444-444444444444',
        },
      );
      expect(result).toEqual(
        expect.objectContaining({
          branch: 'openthrottle/plan-abcdef12',
          checkoutId: '44444444-4444-4444-8444-444444444444',
        }),
      );
    });

    it('updates only checkout_id when branch is blank or null', async () => {
      const updated = buildRun({
        checkoutId: '44444444-4444-4444-8444-444444444444',
      });
      repo.findOne.mockResolvedValueOnce(updated);

      await service.setCheckoutAndBranch('run-1', {
        branch: null,
        checkoutId: '44444444-4444-4444-8444-444444444444',
      });

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-1' },
        { checkoutId: '44444444-4444-4444-8444-444444444444' },
      );
    });
  });

  describe('setRunConfigSnapshotWorkspace', () => {
    const snapshot = {
      ralph: { executionBackend: 'cursor' as const },
      target: { mode: 'plan' as const, taskId: '' },
      version: 1 as const,
      workspace: { workingDirectory: '/Users/matt/Development/openthrottle' },
    };

    it('re-points the snapshot workspace at the resolved worktree', async () => {
      repo.findOne.mockResolvedValueOnce(
        buildRun({ runConfigSnapshot: snapshot }),
      );
      repo.findOne.mockResolvedValueOnce(
        buildRun({ runConfigSnapshot: snapshot }),
      );

      await service.setRunConfigSnapshotWorkspace('run-1', {
        checkoutId: '44444444-4444-4444-8444-444444444444',
        workingDirectory: '/wt/plan-abcdef12',
      });

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-1' },
        {
          runConfigSnapshot: {
            ...snapshot,
            workspace: {
              checkoutId: '44444444-4444-4444-8444-444444444444',
              workingDirectory: '/wt/plan-abcdef12',
            },
          },
        },
      );
    });

    it('leaves a run without a snapshot alone', async () => {
      repo.findOne.mockResolvedValueOnce(buildRun({ runConfigSnapshot: null }));

      await service.setRunConfigSnapshotWorkspace('run-1', {
        workingDirectory: '/wt/plan-abcdef12',
      });

      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('findEarliestScheduledForByPlanIds', () => {
    it('reads the soonest SCHEDULED run per plan in one query and keys id plus instant by plan id', async () => {
      qbGetRawMany.mockResolvedValueOnce([
        {
          id: 'run-a',
          plan_id: 'plan-a',
          scheduled_for: new Date('2026-08-01T09:00:00Z'),
        },
        // pg may hand back a timestamptz as an ISO string depending on the driver config.
        {
          id: 'run-b',
          plan_id: 'plan-b',
          scheduled_for: '2026-08-02T10:30:00.000Z',
        },
      ]);

      const result = await service.findEarliestScheduledForByPlanIds([
        'plan-a',
        'plan-b',
        'plan-none',
      ]);
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(repo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(qb.distinctOn).toHaveBeenCalledWith(['run.plan_id']);
      expect(qb.addSelect).toHaveBeenCalledWith('run.id', 'id');
      expect(qb.addSelect).toHaveBeenCalledWith(
        'run.scheduled_for',
        'scheduled_for',
      );
      expect(qb.where).toHaveBeenCalledWith('run.status = :status', {
        status: 'SCHEDULED',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('run.plan_id IN (:...planIds)', {
        planIds: ['plan-a', 'plan-b', 'plan-none'],
      });
      expect(result).toEqual(
        new Map([
          [
            'plan-a',
            { id: 'run-a', scheduledFor: new Date('2026-08-01T09:00:00Z') },
          ],
          [
            'plan-b',
            { id: 'run-b', scheduledFor: new Date('2026-08-02T10:30:00Z') },
          ],
        ]),
      );
    });

    it('breaks a tie on scheduled_for by id so the pick is deterministic', async () => {
      await service.findEarliestScheduledForByPlanIds(['plan-a']);
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.orderBy).toHaveBeenCalledWith('run.plan_id', 'ASC');
      expect(qb.addOrderBy.mock.calls).toEqual([
        ['run.scheduled_for', 'ASC'],
        ['run.id', 'ASC'],
      ]);
    });

    it('short-circuits on an empty id list', async () => {
      await expect(
        service.findEarliestScheduledForByPlanIds([]),
      ).resolves.toEqual(new Map());
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('SCHEDULED rows do not act like live runs', () => {
    // A SCHEDULED run is an unsettled plan_runs row (up to 30 days out) that has not started. Every
    // finder below answers "what is live / stale / holding a worktree" and must never see it. The
    // status filter is the whole guard, so pin it: widening any of these to a broader set of
    // statuses has to be a deliberate change that fails here first.
    const SCHEDULED = 'SCHEDULED';

    /** Every bound parameter value of every builder call, flattened, so no SCHEDULED can hide in one. */
    const boundValues = (): unknown[] => {
      const qb = repo.createQueryBuilder.mock.results[0]?.value;
      const calls: unknown[][] = [
        ...qb.where.mock.calls,
        ...qb.andWhere.mock.calls,
      ];

      return calls.flatMap(([, params]) => {
        if (typeof params !== 'object' || params === null) {
          return [];
        }
        return Object.values(params).flatMap((value) => {
          if (Array.isArray(value)) {
            return value;
          }
          return [value];
        });
      });
    };

    it('the 120s stale sweep (findStaleInProgressRuns) never selects a SCHEDULED run', async () => {
      await service.findStaleInProgressRuns(new Date(FIXED_NOW), 200);
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.where).toHaveBeenCalledWith('run.status = :status', {
        status: 'IN_PROGRESS',
      });
      expect(boundValues()).not.toContain(SCHEDULED);
    });

    it('the unsupervised age sweep (findStaleUnsupervisedRuns) never selects a SCHEDULED run', async () => {
      await service.findStaleUnsupervisedRuns(new Date(FIXED_NOW), 200);
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.where).toHaveBeenCalledWith('run.status = :status', {
        status: 'IN_PROGRESS',
      });
      expect(boundValues()).not.toContain(SCHEDULED);
    });

    it('a worktree is not busy for a pending SCHEDULED run (findLiveRunsByCheckoutIds)', async () => {
      await service.findLiveRunsByCheckoutIds(
        ['checkout-a'],
        new Date(FIXED_NOW),
      );
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.where).toHaveBeenCalledWith('run.status = :status', {
        status: 'IN_PROGRESS',
      });
      expect(boundValues()).not.toContain(SCHEDULED);
    });

    it('a worktree is not busy for a pending SCHEDULED run (findUnsettledRunsByCheckoutIds)', async () => {
      await service.findUnsettledRunsByCheckoutIds(['checkout-a']);
      const qb = repo.createQueryBuilder.mock.results[0]?.value;

      expect(qb.where).toHaveBeenCalledWith('run.status IN (:...statuses)', {
        statuses: ['QUEUED', 'IN_PROGRESS'],
      });
      expect(boundValues()).not.toContain(SCHEDULED);
    });

    it('a SCHEDULED row never counts as a live detached run, even as the newest row', async () => {
      // Belt and braces on top of the SQL predicate: should a SCHEDULED row ever come back as the
      // newest, it is still not IN_PROGRESS and so is not live.
      qbGetMany.mockResolvedValueOnce([
        buildRun({
          bullmqJobId: null,
          createdAt: new Date('2026-07-21T12:00:00Z'),
          planId: 'plan-scheduled',
          scheduledFor: new Date('2026-07-28T12:00:00Z'),
          status: SCHEDULED,
        }),
      ]);

      const result = await service.findPlanIdsWithLiveDetachedRun(
        ['plan-scheduled'],
        new Date('2026-07-21T12:00:30Z'),
      );

      expect(result).toEqual(new Set());
    });
  });
});
