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
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      create: vi.fn((input: Partial<PlanRun>) => buildRun(input)),
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
        { hostname: 'host-a', pid: 4242, workerId: 'worker-x' },
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
});
