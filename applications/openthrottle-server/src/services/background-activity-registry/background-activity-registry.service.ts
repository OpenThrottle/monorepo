/**
 * @description The background-activity registry (OT plan 5767e798): long-running work a person
 * would otherwise not know is happening (an embeddings backfill today, an app update later)
 * reports its progress here, and `backgroundActivities` serves it.
 *
 * Stored in Redis, not process memory, because the server can run as separate `api` and
 * `worker` processes: the producers are BullMQ processors (worker) and the query is GraphQL
 * (api). Reads are O(activities) — one SMEMBERS, then HGETALL + LRANGE per activity — and never
 * count database rows, so polling it is cheap. Every write is one Lua script, so concurrent
 * workers never lose an increment, and refreshes {@link BACKGROUND_ACTIVITY_TTL_MS}, so an
 * activity whose producer died expires by itself.
 *
 * Best-effort throughout: without Redis, or when Redis errors, writes are no-ops and reads are
 * empty. Progress reporting must never be the reason real work fails.
 */

import { Inject, Injectable } from '@nestjs/common';
import { resolveQueuePrefix } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { REDIS_CLIENT } from '@openthrottle/nestjs-redis';
import { toErrorMessage } from '@openthrottle/nodejs-utils';
import type { Redis } from 'ioredis';

import {
  BACKGROUND_ACTIVITY_KEY_SUFFIX,
  BACKGROUND_ACTIVITY_MAX_SAMPLES,
  BACKGROUND_ACTIVITY_TTL_MS,
} from './background-activity-registry.constants.ts';
import type {
  BackgroundActivityProgress,
  BackgroundActivitySnapshot,
  StartBackgroundActivityInput,
} from './background-activity-registry.types.ts';
import {
  parseBackgroundActivityRecord,
  parseBackgroundActivitySamples,
  toBackgroundActivitySnapshot,
} from './background-activity-registry.utils.ts';

/**
 * Creates the activity when absent (startedAt = now, done = 0, one baseline sample), then
 * refreshes its label and every expiry. An existing activity keeps startedAt, done and total.
 * KEYS: hash, samples, index. ARGV: id, kind, label, total ('' = unknown), now, ttl.
 * Returns 1 when it created the activity.
 */
const START_SCRIPT = `
local created = 0
if redis.call('exists', KEYS[1]) == 0 then
  redis.call('hset', KEYS[1], 'id', ARGV[1], 'kind', ARGV[2], 'startedAt', ARGV[5], 'progressedAt', ARGV[5], 'done', '0', 'total', ARGV[4])
  redis.call('del', KEYS[2])
  redis.call('lpush', KEYS[2], ARGV[5] .. ':0')
  created = 1
end
redis.call('hset', KEYS[1], 'label', ARGV[3])
redis.call('sadd', KEYS[3], ARGV[1])
redis.call('pexpire', KEYS[1], ARGV[6])
redis.call('pexpire', KEYS[2], ARGV[6])
redis.call('pexpire', KEYS[3], ARGV[6])
return created
`;

/**
 * Adds to a known total. KEYS: hash. ARGV: by, ttl. Returns 0 when the activity is absent or
 * its total is unknown.
 */
const GROW_SCRIPT = `
if redis.call('exists', KEYS[1]) == 0 or redis.call('hget', KEYS[1], 'total') == '' then
  return 0
end
redis.call('hincrby', KEYS[1], 'total', ARGV[1])
redis.call('pexpire', KEYS[1], ARGV[2])
return 1
`;

/**
 * Sets total = done + remaining, for a producer that re-measured what is left.
 * KEYS: hash. ARGV: remaining, ttl. Returns 0 when the activity is absent.
 */
const REBASE_SCRIPT = `
if redis.call('exists', KEYS[1]) == 0 then
  return 0
end
local done = tonumber(redis.call('hget', KEYS[1], 'done')) or 0
redis.call('hset', KEYS[1], 'total', done + tonumber(ARGV[1]))
redis.call('pexpire', KEYS[1], ARGV[2])
return 1
`;

/**
 * Adds to done and records a sample. KEYS: hash, samples, index. ARGV: by, now, ttl, last
 * sample index. Returns nil when the activity is absent, else { done, total ('' = unknown) }.
 */
const PROGRESS_SCRIPT = `
if redis.call('exists', KEYS[1]) == 0 then
  return nil
end
local done = redis.call('hincrby', KEYS[1], 'done', ARGV[1])
redis.call('hset', KEYS[1], 'progressedAt', ARGV[2])
redis.call('lpush', KEYS[2], ARGV[2] .. ':' .. done)
redis.call('ltrim', KEYS[2], 0, ARGV[4])
redis.call('pexpire', KEYS[1], ARGV[3])
redis.call('pexpire', KEYS[2], ARGV[3])
redis.call('pexpire', KEYS[3], ARGV[3])
return { done, redis.call('hget', KEYS[1], 'total') }
`;

function readProgressReply(reply: unknown): BackgroundActivityProgress | null {
  if (!Array.isArray(reply)) {
    return null;
  }

  const [done, total]: unknown[] = reply;
  const totalValue = Number(total);

  if (typeof done !== 'number') {
    return null;
  }

  return {
    done,
    total: total === '' || !Number.isFinite(totalValue) ? null : totalValue,
  };
}

@Injectable()
export class BackgroundActivityRegistryService {
  private readonly prefix = `${resolveQueuePrefix()}:${BACKGROUND_ACTIVITY_KEY_SUFFIX}`;

  constructor(
    private readonly logger: LoggerService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
  ) {}

  /**
   * @description Opens an activity, or re-touches one already running (keeping its startedAt,
   * done and total). Idempotent, so a producer may call it every cycle.
   * @returns true when this call created the activity.
   */
  async start(input: StartBackgroundActivityInput): Promise<boolean> {
    const { id, kind, label, total } = input;
    const reply = await this.run('start', (redis) => {
      return redis.eval(
        START_SCRIPT,
        3,
        this.hashKey(id),
        this.samplesKey(id),
        this.indexKey(),
        id,
        kind,
        label,
        total === null ? '' : String(total),
        Date.now(),
        BACKGROUND_ACTIVITY_TTL_MS,
      );
    });

    return reply === 1;
  }

  /** @description Adds `by` units to a known total; a no-op for an unknown or absent one. */
  async grow(id: string, by: number): Promise<void> {
    if (by <= 0) {
      return;
    }

    await this.run('grow', (redis) => {
      return redis.eval(
        GROW_SCRIPT,
        1,
        this.hashKey(id),
        by,
        BACKGROUND_ACTIVITY_TTL_MS,
      );
    });
  }

  /** @description Re-measures what is left: total becomes done + `remaining`. */
  async rebase(id: string, remaining: number): Promise<void> {
    await this.run('rebase', (redis) => {
      return redis.eval(
        REBASE_SCRIPT,
        1,
        this.hashKey(id),
        Math.max(0, remaining),
        BACKGROUND_ACTIVITY_TTL_MS,
      );
    });
  }

  /**
   * @description Reports `by` more units done.
   * @returns done and total after the report; null when the activity is not tracked (never
   * started, finished, or expired) or Redis is unavailable.
   */
  async progress(
    id: string,
    by: number,
  ): Promise<BackgroundActivityProgress | null> {
    const reply = await this.run('progress', (redis) => {
      return redis.eval(
        PROGRESS_SCRIPT,
        3,
        this.hashKey(id),
        this.samplesKey(id),
        this.indexKey(),
        by,
        Date.now(),
        BACKGROUND_ACTIVITY_TTL_MS,
        BACKGROUND_ACTIVITY_MAX_SAMPLES - 1,
      );
    });

    return readProgressReply(reply);
  }

  /** @description Clears an activity; the bar disappears on the next read. */
  async finish(id: string): Promise<void> {
    await this.run('finish', (redis) => {
      return Promise.all([
        redis.del(this.hashKey(id), this.samplesKey(id)),
        redis.srem(this.indexKey(), id),
      ]);
    });
  }

  /** @description Every live activity, oldest first. Expired ones are dropped from the index. */
  async list(): Promise<BackgroundActivitySnapshot[]> {
    const snapshots = await this.run('list', async (redis) => {
      const ids = await redis.smembers(this.indexKey());
      const now = Date.now();
      const entries = await Promise.all(
        ids.map(async (id) => {
          const [hash, samples] = await Promise.all([
            redis.hgetall(this.hashKey(id)),
            redis.lrange(this.samplesKey(id), 0, -1),
          ]);

          return { hash, id, samples };
        }),
      );
      const expired: string[] = [];
      const live = entries.flatMap(({ hash, id, samples }) => {
        const record = parseBackgroundActivityRecord(hash);

        if (!record) {
          expired.push(id);

          return [];
        }

        return [
          toBackgroundActivitySnapshot(
            record,
            parseBackgroundActivitySamples(samples),
            now,
          ),
        ];
      });

      if (expired.length > 0) {
        await redis.srem(this.indexKey(), ...expired);
      }

      return live.sort((left, right) => {
        return left.startedAt.getTime() - right.startedAt.getTime();
      });
    });

    return snapshots ?? [];
  }

  private async run<TResult>(
    operation: string,
    work: (redis: Redis) => Promise<TResult>,
  ): Promise<TResult | undefined> {
    if (!this.redis) {
      return undefined;
    }

    try {
      return await work(this.redis);
    } catch (error: unknown) {
      this.logger.warn(
        `Background activity ${operation} failed: ${toErrorMessage(error)}`,
        BackgroundActivityRegistryService.name,
      );

      return undefined;
    }
  }

  private indexKey(): string {
    return `${this.prefix}:index`;
  }

  private hashKey(id: string): string {
    return `${this.prefix}:activity:${id}`;
  }

  private samplesKey(id: string): string {
    return `${this.prefix}:samples:${id}`;
  }
}
