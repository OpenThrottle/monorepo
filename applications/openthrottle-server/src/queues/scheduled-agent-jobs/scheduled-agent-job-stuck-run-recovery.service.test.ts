import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  ScheduledAgentJobRun,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduledAgentJobDirectoryLockService } from './scheduled-agent-job-directory-lock.service.ts';
import type { ScheduledAgentJobFailureNotifierService } from './scheduled-agent-job-failure-notifier.service.ts';
import {
  SCHEDULED_AGENT_JOB_SERVER_RESTARTED_MESSAGE,
  ScheduledAgentJobStuckRunRecoveryService,
} from './scheduled-agent-job-stuck-run-recovery.service.ts';
import type { ScheduledAgentJobPayload } from './scheduled-agent-jobs.types.ts';

const run = (
  id: string,
  overrides: Partial<ScheduledAgentJobRun> = {},
): ScheduledAgentJobRun => {
  return createMock<ScheduledAgentJobRun>({
    bullmqJobId: `job-${id}`,
    driverId: 'claude',
    id,
    resolvedCwd: `/repos/${id}`,
    scheduledAgentJobId: `schedule-${id}`,
    settingsSnapshot: null,
    status: 'running',
    ...overrides,
  });
};

describe('ScheduledAgentJobStuckRunRecoveryService', () => {
  let runRepository: Repository<ScheduledAgentJobRun>;
  let redis: Redis;
  let directoryLock: ScheduledAgentJobDirectoryLockService;
  let failureNotifier: ScheduledAgentJobFailureNotifierService;
  let service: ScheduledAgentJobStuckRunRecoveryService;
  /** BullMQ job ids whose lock key exists, i.e. a worker is processing them. */
  let lockedJobIds: Set<string>;

  beforeEach(() => {
    lockedJobIds = new Set();
    runRepository = createMock<Repository<ScheduledAgentJobRun>>({
      find: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    });
    redis = createMock<Redis>({
      get: vi.fn((key: string) =>
        Promise.resolve(
          [...lockedJobIds].some((id) => key === `bull:q:${id}:lock`)
            ? 'worker-token'
            : null,
        ),
      ),
    });
    directoryLock = createMock<ScheduledAgentJobDirectoryLockService>({
      forceRelease: vi.fn().mockResolvedValue(true),
    });
    failureNotifier = createMock<ScheduledAgentJobFailureNotifierService>({
      notify: vi.fn().mockResolvedValue(undefined),
    });
    const queue = createMock<Queue<ScheduledAgentJobPayload, void>>({
      client: Promise.resolve(redis),
      toKey: (type: string) => `bull:q:${type}`,
    });

    service = new ScheduledAgentJobStuckRunRecoveryService(
      createMock<LoggerService>(),
      createMock<ScheduledAgentJobsService>({
        getRunRepository: () => runRepository,
      }),
      directoryLock,
      queue,
      failureNotifier,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when the run has no live BullMQ job', () => {
    it('marks it failed with the server-restarted reason, guarded on running', async () => {
      vi.mocked(runRepository.find).mockResolvedValue([run('a')]);

      const summary = await service.recover();

      expect(runRepository.update).toHaveBeenCalledExactlyOnceWith(
        { id: 'a', status: 'running' },
        expect.objectContaining({
          errorMessage: SCHEDULED_AGENT_JOB_SERVER_RESTARTED_MESSAGE,
          exitCode: null,
          finishedAt: expect.any(Date),
          status: 'failed',
        }),
      );
      expect(summary).toEqual({
        examined: 1,
        locksReleased: 1,
        recovered: 1,
        skippedLive: 0,
      });
    });

    it('tells the schedule owner the run failed', async () => {
      vi.mocked(runRepository.find).mockResolvedValue([run('a')]);

      await service.recover();

      expect(failureNotifier.notify).toHaveBeenCalledExactlyOnceWith({
        errorMessage: SCHEDULED_AGENT_JOB_SERVER_RESTARTED_MESSAGE,
        reason: 'failed',
        runCount: 1,
        runId: 'a',
        scheduledAgentJobId: 'schedule-a',
      });
    });

    it('sends nothing for a run that finished before the update landed', async () => {
      vi.mocked(runRepository.find).mockResolvedValue([run('a')]);
      vi.mocked(runRepository.update).mockResolvedValue({
        affected: 0,
        generatedMaps: [],
        raw: [],
      });

      await service.recover();

      expect(failureNotifier.notify).not.toHaveBeenCalled();
    });

    it('releases the directory lock the run held', async () => {
      vi.mocked(runRepository.find).mockResolvedValue([run('a')]);

      await service.recover();

      expect(directoryLock.forceRelease).toHaveBeenCalledExactlyOnceWith(
        '/repos/a',
      );
    });

    it('treats a run with no BullMQ job id as abandoned', async () => {
      vi.mocked(runRepository.find).mockResolvedValue([
        run('a', { bullmqJobId: null }),
      ]);

      const summary = await service.recover();

      expect(redis.get).not.toHaveBeenCalled();
      expect(summary.recovered).toBe(1);
    });

    it('only queries running rows', async () => {
      await service.recover();

      expect(runRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'running' } }),
      );
    });
  });

  describe('when a worker still holds the BullMQ job lock', () => {
    it('leaves the run running and its directory locked', async () => {
      lockedJobIds.add('job-a');
      vi.mocked(runRepository.find).mockResolvedValue([run('a')]);

      const summary = await service.recover();

      expect(runRepository.update).not.toHaveBeenCalled();
      expect(directoryLock.forceRelease).not.toHaveBeenCalled();
      expect(summary.skippedLive).toBe(1);
    });

    it('keeps the directory lock when an abandoned run shares the live run directory', async () => {
      lockedJobIds.add('job-live');
      vi.mocked(runRepository.find).mockResolvedValue([
        run('dead', { resolvedCwd: '/repos/shared' }),
        run('live', { resolvedCwd: '/repos/shared/' }),
      ]);

      const summary = await service.recover();

      expect(summary.recovered).toBe(1);
      expect(directoryLock.forceRelease).not.toHaveBeenCalled();
    });
  });

  describe('when the lock check errors', () => {
    it('assumes the run is live rather than failing it', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('redis down'));
      vi.mocked(runRepository.find).mockResolvedValue([run('a')]);

      const summary = await service.recover();

      expect(runRepository.update).not.toHaveBeenCalled();
      expect(summary.skippedLive).toBe(1);
    });
  });

  describe('when the run finished between the read and the write', () => {
    it('does not count it or release its lock', async () => {
      vi.mocked(runRepository.update).mockResolvedValue({
        affected: 0,
        generatedMaps: [],
        raw: [],
      });
      vi.mocked(runRepository.find).mockResolvedValue([run('a')]);

      const summary = await service.recover();

      expect(summary.recovered).toBe(0);
      expect(directoryLock.forceRelease).not.toHaveBeenCalled();
    });
  });

  describe('when the run had no directory lock to hold', () => {
    it('skips the release for a flag-only worktree run', async () => {
      vi.mocked(runRepository.find).mockResolvedValue([
        run('a', {
          settingsSnapshot: { settings: { worktree: { worktree: '' } } },
        }),
      ]);

      await service.recover();

      expect(directoryLock.forceRelease).not.toHaveBeenCalled();
    });

    it('skips the release when no resolved cwd was recorded', async () => {
      vi.mocked(runRepository.find).mockResolvedValue([
        run('a', { resolvedCwd: null }),
      ]);

      await service.recover();

      expect(directoryLock.forceRelease).not.toHaveBeenCalled();
    });

    it('releases the named-worktree key for a named worktree run', async () => {
      vi.mocked(runRepository.find).mockResolvedValue([
        run('a', {
          settingsSnapshot: { settings: { worktree: { worktree: 'nightly' } } },
        }),
      ]);

      await service.recover();

      expect(directoryLock.forceRelease).toHaveBeenCalledExactlyOnceWith(
        '/repos/a#worktree:nightly',
      );
    });
  });

  describe('onApplicationBootstrap', () => {
    it('skips recovery when this checkout does not own repeatables', async () => {
      vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'false');

      await service.onApplicationBootstrap();

      expect(runRepository.find).not.toHaveBeenCalled();
    });

    it('runs recovery when this checkout owns repeatables', async () => {
      vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');

      await service.onApplicationBootstrap();

      expect(runRepository.find).toHaveBeenCalledOnce();
    });

    it('never throws out of boot when recovery fails', async () => {
      vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');
      vi.mocked(runRepository.find).mockRejectedValue(new Error('db down'));

      await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    });
  });
});
