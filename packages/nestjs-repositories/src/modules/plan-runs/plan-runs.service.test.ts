import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanRun } from './plan-run.entity';
import { PlanRunsService } from './plan-runs.service';

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
    runConfigSnapshot: null,
    runKind: 'orchestrator',
    status: 'QUEUED',
    updatedAt: new Date('2026-07-21T00:00:00Z'),
    workerId: null,
  };

  return { ...run, ...overrides };
};

describe('PlanRunsService', () => {
  let service: PlanRunsService;
  let repo: {
    create: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let qbGetMany: ReturnType<typeof vi.fn>;
  let qbExecute: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    qbGetMany = vi.fn().mockResolvedValue([]);
    // Chainable QueryBuilder stub: every builder method returns the same object
    // so .where().andWhere().orderBy().take().getMany() resolves through.
    const qb: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of [
      'andWhere',
      'orderBy',
      'set',
      'take',
      'update',
      'where',
    ]) {
      qb[method] = vi.fn(() => qb);
    }
    qb.getMany = qbGetMany;
    qbExecute = vi.fn().mockResolvedValue({ affected: 0 });
    qb.execute = qbExecute;

    repo = {
      create: vi.fn((input: Partial<PlanRun>) => buildRun(input)),
      createQueryBuilder: vi.fn(() => qb),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
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

      const result = await service.settleCliRun('run-cli', 'CANCELLED');

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-cli' },
        { hostname: null, pid: null, status: 'CANCELLED', workerId: null },
      );
      expect(result?.status).toBe('CANCELLED');
    });

    it('settleCliRun returns null when no row matched the id', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      expect(await service.settleCliRun('missing', 'COMPLETED')).toBeNull();
    });
  });

  describe('run-location lifecycle', () => {
    it('markRunStarted stamps hostname/pid/worker_id by (queue, job)', async () => {
      await service.markRunStarted({
        bullmqJobId: 'job-1',
        hostname: 'host-a',
        pid: 4242,
        queueName: 'plans',
        workerId: 'worker-x',
      });

      expect(repo.update).toHaveBeenCalledWith(
        { bullmqJobId: 'job-1', queueName: 'plans' },
        expect.objectContaining({
          hostname: 'host-a',
          lastHeartbeatAt: expect.any(Date),
          pid: 4242,
          workerId: 'worker-x',
        }),
      );
    });

    it('clearRunLocation nulls the location columns but not the marker', async () => {
      await service.clearRunLocation('plans', 'job-1');

      expect(repo.update).toHaveBeenCalledWith(
        { bullmqJobId: 'job-1', queueName: 'plans' },
        { hostname: null, pid: null, workerId: null },
      );
    });
  });

  describe('cancel marker', () => {
    it('stampCancelRequested marks the newest run row', async () => {
      repo.findOne.mockResolvedValueOnce(buildRun({ id: 'run-newest' }));

      const runId = await service.stampCancelRequested('plan-1', 'user-9');

      expect(runId).toBe('run-newest');
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
          where: { planId: 'plan-1' },
        }),
      );
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'run-newest' },
        expect.objectContaining({ cancelRequestedBy: 'user-9' }),
      );
    });

    it('stampCancelRequested returns null when the plan has no run row', async () => {
      repo.findOne.mockResolvedValue(null);

      const runId = await service.stampCancelRequested('plan-1', null);

      expect(runId).toBeNull();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('readCancelRequested returns the newest run marker when set', async () => {
      const at = new Date('2026-07-21T01:00:00Z');
      repo.findOne.mockResolvedValueOnce(
        buildRun({ cancelRequestedAt: at, cancelRequestedBy: 'user-9' }),
      );

      const marker = await service.readCancelRequested('plan-1');

      expect(marker).toEqual({
        cancelRequestedAt: at,
        cancelRequestedBy: 'user-9',
      });
    });

    it('readCancelRequested returns null when the newest run has no marker (no stale bleed)', async () => {
      // A fresh run (newest row, marker unset) must not inherit an older run's cancel.
      repo.findOne.mockResolvedValueOnce(buildRun({ cancelRequestedAt: null }));

      expect(await service.readCancelRequested('plan-1')).toBeNull();
    });

    it('readCancelRequested returns null when the plan has no run row', async () => {
      repo.findOne.mockResolvedValueOnce(null);

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
      const result = await service.findLiveRunsByCheckoutIds([], new Date());

      expect(result).toEqual([]);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('findStaleInProgressRuns excludes runs that do not heartbeat', async () => {
      // The sweeper this feeds does not merely settle the run — reconcileStrandedPlan
      // resets the plan and its IN_PROGRESS tasks to PENDING. A run with no timer must
      // never be a candidate, so the exclusion is a WHERE clause, not a post-filter.
      await service.findStaleInProgressRuns(new Date(), 200);
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
});
