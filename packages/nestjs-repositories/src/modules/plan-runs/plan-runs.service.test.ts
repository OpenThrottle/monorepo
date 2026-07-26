import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PlanRun } from './plan-run.entity';
import { PlanRunsService } from './plan-runs.service';

const buildRun = (overrides: Partial<PlanRun> = {}): PlanRun => {
  const run: PlanRun = {
    actorUserId: null,
    bullmqJobId: 'job-1',
    cancelRequestedAt: null,
    cancelRequestedBy: null,
    createdAt: new Date('2026-07-21T00:00:00Z'),
    executionBackend: 'claude',
    hostname: null,
    id: 'run-1',
    lastHeartbeatAt: null,
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

  beforeEach(async () => {
    qbGetMany = vi.fn().mockResolvedValue([]);
    // Chainable QueryBuilder stub: every builder method returns the same object
    // so .where().andWhere().orderBy().take().getMany() resolves through.
    const qb: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ['where', 'andWhere', 'orderBy', 'take']) {
      qb[method] = vi.fn(() => qb);
    }
    qb.getMany = qbGetMany;

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
});
