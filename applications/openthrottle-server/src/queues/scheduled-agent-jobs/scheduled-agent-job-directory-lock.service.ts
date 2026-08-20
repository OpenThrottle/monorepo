/**
 * @description Advisory per-directory lock that makes scheduled-agent-jobs worker concurrency > 1
 * safe. Two agent CLIs in one checkout fight over the git index, so runs sharing a resolved directory
 * must serialise even while unrelated directories overlap freely.
 *
 * BullMQ's group / rate-limit-by-key facilities are the natural fit, but they are **BullMQ Pro**
 * features and this workspace pins OSS `bullmq`, so the plan's documented fallback is what ships: an
 * application-level lock in Redis, keyed by {@link resolveScheduledAgentJobConcurrencyKey}.
 *
 * Advisory, not authoritative — by design. The lock is an optimisation against a git-index race, not a
 * correctness gate, so every failure mode (Redis unconfigured, Redis erroring, acquisition timing out)
 * resolves toward *running the job* rather than failing it. Never let this be the reason a scheduled
 * run does not happen.
 */

import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { REDIS_CLIENT } from '@openthrottle/nestjs-redis';
import type { Redis } from 'ioredis';
import { SCHEDULED_AGENT_JOBS_LOCK_KEY_PREFIX } from './scheduled-agent-jobs.constants';

/**
 * Lock TTL. Deliberately far SHORTER than a run (runs default to 15m), because the TTL is the only
 * thing that frees a directory abandoned by a killed worker — a TTL sized to cover the longest run
 * would block that directory for the same span. The heartbeat below is what keeps a live run's lock
 * from expiring under it.
 */
export const SCHEDULED_AGENT_JOB_LOCK_TTL_MS = 30_000;

/** Renewal cadence — a third of the TTL, so two consecutive missed beats still do not expire a lock. */
export const SCHEDULED_AGENT_JOB_LOCK_RENEW_MS = 10_000;

/** Poll interval while waiting on a held lock. */
const SCHEDULED_AGENT_JOB_LOCK_POLL_MS = 500;

/**
 * Release handle returned by {@link ScheduledAgentJobDirectoryLockService.acquire}. `held` is false for
 * a no-op handle (no key, Redis unconfigured, or acquisition abandoned) so callers can log honestly;
 * `release` is always safe to call, exactly once or more.
 */
export interface ScheduledAgentJobDirectoryLock {
  readonly held: boolean;
  readonly release: () => Promise<void>;
}

/** Outcome of an acquisition attempt: the lock, or why the caller should stop waiting. */
export type ScheduledAgentJobDirectoryLockResult =
  | { readonly lock: ScheduledAgentJobDirectoryLock; readonly status: 'held' }
  | { readonly status: 'timeout'; readonly waitedMs: number };

/**
 * Compare-and-delete. Releasing with a bare `DEL` would be a correctness bug rather than a style
 * nit: if this worker's lock already expired (a long GC pause, a stalled `git` call) and another
 * worker legitimately took the directory, a bare `DEL` would hand a THIRD run the same directory
 * concurrently. Deleting only our own fencing token makes a lost lock merely lost.
 */
const RELEASE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
`;

/** Renew only while we still own the key, so a lost lock stops being extended. */
const RENEW_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('pexpire', KEYS[1], ARGV[2])
end
return 0
`;

/** A no-op handle: nothing was locked, so nothing needs releasing. */
const UNLOCKED: ScheduledAgentJobDirectoryLock = {
  held: false,
  release: (): Promise<void> => Promise.resolve(),
};

@Injectable()
export class ScheduledAgentJobDirectoryLockService {
  constructor(
    private readonly logger: LoggerService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
  ) {}

  /**
   * @description Takes the lock for `key`, waiting up to `timeoutMs` for a current holder to finish.
   *
   * Returns `status: 'held'` with a release handle once the directory is ours, or `status: 'timeout'`
   * when the wait was exhausted or aborted — the caller decides what a timeout means for the run.
   * A null `key` (a per-run worktree needs no serialisation) and an unconfigured Redis both short
   * circuit to a no-op `held` result, so a Redis-less deployment behaves exactly as it did before this
   * lock existed.
   */
  async acquire(
    key: string | null,
    options: {
      readonly onWait?: (waitedMs: number) => void;
      readonly signal?: AbortSignal;
      readonly timeoutMs: number;
    },
  ): Promise<ScheduledAgentJobDirectoryLockResult> {
    if (key === null || this.redis === null) {
      return { lock: UNLOCKED, status: 'held' };
    }

    const redis = this.redis;
    const redisKey = this.redisKeyFor(key);
    const token = `${process.pid}:${createHash('sha256')
      .update(`${key}:${Date.now()}:${Math.random()}`)
      .digest('hex')
      .slice(0, 24)}`;

    const startedAt = Date.now();
    let notified = false;

    /* eslint-disable no-await-in-loop -- a poll loop is sequential by definition: each attempt has to
       observe the previous one's result before deciding whether to sleep again. */
    for (;;) {
      // A Redis blip must not take scheduled jobs down, so an erroring SET is treated as "the lock is
      // unavailable as a mechanism" and the run proceeds unlocked rather than waiting or failing.
      let acquired: 'OK' | null;
      try {
        acquired = await redis.set(
          redisKey,
          token,
          'PX',
          SCHEDULED_AGENT_JOB_LOCK_TTL_MS,
          'NX',
        );
      } catch (error) {
        this.logger.warn(
          `Directory lock unavailable for ${key} (${error instanceof Error ? error.message : String(error)}); running without it`,
          ScheduledAgentJobDirectoryLockService.name,
        );

        return { lock: UNLOCKED, status: 'held' };
      }

      if (acquired === 'OK') {
        return {
          lock: this.holdLock(redis, redisKey, token, key),
          status: 'held',
        };
      }

      const waitedMs = Date.now() - startedAt;
      if (options.signal?.aborted === true || waitedMs >= options.timeoutMs) {
        return { status: 'timeout', waitedMs };
      }

      // Report contention once, on the first failed attempt, so a queued run reads as "waiting on a
      // directory" in its log rather than as a mysteriously slow agent.
      if (!notified) {
        notified = true;
        options.onWait?.(waitedMs);
      }

      await this.sleep(
        Math.min(
          SCHEDULED_AGENT_JOB_LOCK_POLL_MS,
          Math.max(0, options.timeoutMs - waitedMs),
        ),
        options.signal,
      );
    }
    /* eslint-enable no-await-in-loop */
  }

  /**
   * @description Wraps an acquired key in a handle whose heartbeat extends the TTL while the run is in
   * flight. The interval is `unref`'d so it can never hold the process open, and cleared on the first
   * release so a double release cannot resurrect it.
   */
  private holdLock(
    redis: Redis,
    redisKey: string,
    token: string,
    key: string,
  ): ScheduledAgentJobDirectoryLock {
    const heartbeat = setInterval((): void => {
      void redis
        .eval(
          RENEW_SCRIPT,
          1,
          redisKey,
          token,
          String(SCHEDULED_AGENT_JOB_LOCK_TTL_MS),
        )
        .catch((error: unknown): void => {
          this.logger.warn(
            `Failed to renew the directory lock for ${key}: ${error instanceof Error ? error.message : String(error)}`,
            ScheduledAgentJobDirectoryLockService.name,
          );
        });
    }, SCHEDULED_AGENT_JOB_LOCK_RENEW_MS);
    heartbeat.unref?.();

    let released = false;

    return {
      held: true,
      release: async (): Promise<void> => {
        if (released) {
          return;
        }
        released = true;
        clearInterval(heartbeat);

        try {
          await redis.eval(RELEASE_SCRIPT, 1, redisKey, token);
        } catch (error) {
          // Nothing to do but log: the TTL will free the directory shortly regardless.
          this.logger.warn(
            `Failed to release the directory lock for ${key}: ${error instanceof Error ? error.message : String(error)}`,
            ScheduledAgentJobDirectoryLockService.name,
          );
        }
      },
    };
  }

  /**
   * @description Hashes the key into the Redis keyspace. A resolved cwd is an absolute path of
   * unbounded length that can contain any byte, so it is digested rather than embedded — and the
   * plaintext key travels in log lines instead, where it is actually readable.
   */
  private redisKeyFor(key: string): string {
    return `${SCHEDULED_AGENT_JOBS_LOCK_KEY_PREFIX}${createHash('sha256').update(key).digest('hex')}`;
  }

  /** @description Sleep that resolves early when the run is cancelled, so an abort is not swallowed. */
  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve): void => {
      const timer = setTimeout((): void => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      timer.unref?.();

      function onAbort(): void {
        clearTimeout(timer);
        resolve();
      }

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
