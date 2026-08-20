/**
 * @description Tests for the advisory per-directory lock. The behaviours that matter here are the
 * failure modes, not the happy path: this lock exists to prevent a git-index race, so every way it can
 * go wrong must still let the scheduled run happen, and a killed worker must not hold a directory
 * hostage past the TTL.
 */

import type { Redis } from 'ioredis';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ScheduledAgentJobDirectoryLockService,
  SCHEDULED_AGENT_JOB_LOCK_RENEW_MS,
  SCHEDULED_AGENT_JOB_LOCK_TTL_MS,
} from './scheduled-agent-job-directory-lock.service';
import { SCHEDULED_AGENT_JOBS_LOCK_KEY_PREFIX } from './scheduled-agent-jobs.constants';

/**
 * Minimal in-memory stand-in for the two Redis operations the lock uses: `SET NX PX` and the two Lua
 * scripts. Ignores TTL expiry (no test needs a wall-clock expiry; the renew/release token checks are
 * what the scripts actually guard).
 */
const fakeRedis = (): {
  evals: string[];
  redis: Redis;
  set: ReturnType<typeof vi.fn>;
  store: Map<string, string>;
} => {
  const store = new Map<string, string>();
  const evals: string[] = [];

  const set = vi.fn(
    async (key: string, token: string): Promise<'OK' | null> => {
      if (store.has(key)) {
        return null;
      }
      store.set(key, token);

      return 'OK';
    },
  );

  const evalFn = vi.fn(
    async (
      script: string,
      _numKeys: number,
      key: string,
      token: string,
    ): Promise<number> => {
      const isRelease = script.includes('del');
      evals.push(isRelease ? 'release' : 'renew');

      if (store.get(key) !== token) {
        return 0;
      }
      if (isRelease) {
        store.delete(key);
      }

      return 1;
    },
  );

  return {
    evals,
    redis: asMock<Redis>({ eval: evalFn, set }),
    set,
    store,
  };
};

const fakeLogger = (): LoggerService =>
  asMock<LoggerService>({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  });

describe('ScheduledAgentJobDirectoryLockService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('acquire', () => {
    it('takes the lock with a unique fencing token under the namespaced key', async () => {
      const { redis, set, store } = fakeRedis();
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        redis,
      );

      const result = await service.acquire('/repos/monorepo', {
        timeoutMs: 1_000,
      });

      expect(result.status).toBe('held');
      expect(set).toHaveBeenCalledTimes(1);

      const [redisKey, token, px, ttl, nx] = set.mock.calls[0] ?? [];
      expect(redisKey).toMatch(
        new RegExp(
          `^${SCHEDULED_AGENT_JOBS_LOCK_KEY_PREFIX}[0-9a-f]{64}$`,
          'u',
        ),
      );
      expect(px).toBe('PX');
      expect(ttl).toBe(SCHEDULED_AGENT_JOB_LOCK_TTL_MS);
      expect(nx).toBe('NX');
      expect(token).toEqual(expect.any(String));
      expect(store.get(String(redisKey))).toBe(token);
    });

    it('gives two different keys two different locks, so unrelated directories overlap', async () => {
      const { redis, store } = fakeRedis();
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        redis,
      );

      const first = await service.acquire('/repos/a', { timeoutMs: 1_000 });
      const second = await service.acquire('/repos/b', { timeoutMs: 1_000 });

      expect(first.status).toBe('held');
      expect(second.status).toBe('held');
      expect(store.size).toBe(2);
    });

    it('serialises one key: the second caller waits and wins once the first releases', async () => {
      const { redis } = fakeRedis();
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        redis,
      );

      const first = await service.acquire('/repos/monorepo', {
        timeoutMs: 1_000,
      });
      if (first.status !== 'held') throw new Error('expected the first hold');

      const onWait = vi.fn();
      const contender = service.acquire('/repos/monorepo', {
        onWait,
        timeoutMs: 60_000,
      });

      // Let the contender fail its first SET and enter the poll loop before the holder releases.
      await vi.waitFor(() => expect(onWait).toHaveBeenCalledTimes(1));
      await first.lock.release();

      expect((await contender).status).toBe('held');
      expect(onWait).toHaveBeenCalledTimes(1);
    });

    it('reports a timeout rather than waiting forever on a held directory', async () => {
      const { redis } = fakeRedis();
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        redis,
      );

      await service.acquire('/repos/monorepo', { timeoutMs: 1_000 });
      const result = await service.acquire('/repos/monorepo', {
        timeoutMs: 0,
      });

      expect(result.status).toBe('timeout');
    });

    it('stops waiting when the run is cancelled', async () => {
      const { redis } = fakeRedis();
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        redis,
      );
      const controller = new AbortController();

      await service.acquire('/repos/monorepo', { timeoutMs: 1_000 });
      const onWait = vi.fn();
      const contender = service.acquire('/repos/monorepo', {
        onWait,
        signal: controller.signal,
        timeoutMs: 60_000,
      });

      await vi.waitFor(() => expect(onWait).toHaveBeenCalledTimes(1));
      controller.abort();

      expect((await contender).status).toBe('timeout');
    });

    it('is a no-op for a null key, so a per-run worktree never waits', async () => {
      const { redis, set } = fakeRedis();
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        redis,
      );

      const result = await service.acquire(null, { timeoutMs: 1_000 });

      expect(result.status).toBe('held');
      expect(result.status === 'held' && result.lock.held).toBe(false);
      expect(set).not.toHaveBeenCalled();
    });

    it('proceeds unlocked when Redis is unconfigured', async () => {
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        null,
      );

      const result = await service.acquire('/repos/monorepo', {
        timeoutMs: 1_000,
      });

      expect(result.status).toBe('held');
      expect(result.status === 'held' && result.lock.held).toBe(false);
    });

    it('proceeds unlocked when Redis errors, rather than failing the run', async () => {
      const logger = fakeLogger();
      const redis = asMock<Redis>({
        eval: vi.fn(),
        set: vi.fn().mockRejectedValue(new Error('READONLY')),
      });
      const service = new ScheduledAgentJobDirectoryLockService(logger, redis);

      const result = await service.acquire('/repos/monorepo', {
        timeoutMs: 1_000,
      });

      expect(result.status).toBe('held');
      expect(result.status === 'held' && result.lock.held).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('running without it'),
        ScheduledAgentJobDirectoryLockService.name,
      );
    });
  });

  describe('the held lock', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('renews the TTL while the run is in flight and stops on release', async () => {
      const { evals, redis } = fakeRedis();
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        redis,
      );

      const result = await service.acquire('/repos/monorepo', {
        timeoutMs: 1_000,
      });
      if (result.status !== 'held') throw new Error('expected a hold');

      await vi.advanceTimersByTimeAsync(SCHEDULED_AGENT_JOB_LOCK_RENEW_MS * 2);
      expect(evals.filter((entry) => entry === 'renew')).toHaveLength(2);

      await result.lock.release();
      await vi.advanceTimersByTimeAsync(SCHEDULED_AGENT_JOB_LOCK_RENEW_MS * 3);

      // No further renewals: a released lock must be free for the TTL to matter.
      expect(evals.filter((entry) => entry === 'renew')).toHaveLength(2);
    });

    it('releases idempotently', async () => {
      const { evals, redis, store } = fakeRedis();
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        redis,
      );

      const result = await service.acquire('/repos/monorepo', {
        timeoutMs: 1_000,
      });
      if (result.status !== 'held') throw new Error('expected a hold');

      await result.lock.release();
      await result.lock.release();

      expect(evals.filter((entry) => entry === 'release')).toHaveLength(1);
      expect(store.size).toBe(0);
    });

    it('never deletes a lock another worker took after ours expired', async () => {
      const { evals, redis, store } = fakeRedis();
      const service = new ScheduledAgentJobDirectoryLockService(
        fakeLogger(),
        redis,
      );

      const result = await service.acquire('/repos/monorepo', {
        timeoutMs: 1_000,
      });
      if (result.status !== 'held') throw new Error('expected a hold');

      // Simulate our TTL expiring and a second worker legitimately claiming the directory.
      const [redisKey] = [...store.keys()];
      store.set(String(redisKey), 'another-workers-token');

      await result.lock.release();

      expect(evals.filter((entry) => entry === 'release')).toHaveLength(1);
      expect(store.get(String(redisKey))).toBe('another-workers-token');
    });

    it('logs and survives a failing release', async () => {
      const logger = fakeLogger();
      const redis = asMock<Redis>({
        eval: vi.fn().mockRejectedValue(new Error('CONNRESET')),
        set: vi.fn().mockResolvedValue('OK'),
      });
      const service = new ScheduledAgentJobDirectoryLockService(logger, redis);

      const result = await service.acquire('/repos/monorepo', {
        timeoutMs: 1_000,
      });
      if (result.status !== 'held') throw new Error('expected a hold');

      await expect(result.lock.release()).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to release'),
        ScheduledAgentJobDirectoryLockService.name,
      );
    });
  });
});
