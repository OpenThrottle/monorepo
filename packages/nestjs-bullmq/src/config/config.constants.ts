import { registerAs } from '@nestjs/config';
import Joi from 'joi';

import { resolveQueuePrefix, resolveRedisConnection } from './config.utils.ts';

/**
 * @external https://docs.nestjs.com/techniques/configuration
 *
 * @description 🚨 🚨 🚨
 * There is lots to read up on here, we should be able to lock
 * down our environment variables per-package.
 */
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('production'),
  OT_CONTAINER_PREFIX: Joi.string().allow(''),
  OT_QUEUE_PREFIX: Joi.string().allow(''),
  REDIS_DB: Joi.number().min(0),
  REDIS_FAMILY: Joi.number().valid(0, 4, 6),
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PASSWORD: Joi.string(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_TLS: Joi.boolean(),
  REDIS_USERNAME: Joi.string(),
});
/**
 * @description The `redis` config namespace: {@link resolveRedisConnection}
 * plus the checkout's {@link resolveQueuePrefix}. Throws at bootstrap when
 * `REDIS_HOST` is unset.
 */
export const redisConfig = registerAs('redis', () => {
  const connection = resolveRedisConnection();
  if (!connection) throw new Error('REDIS_HOST is not set');

  return { ...connection, queuePrefix: resolveQueuePrefix() };
});
/** When a job is detected stalled, move back to waiting (retry). After this many stalls it moves to failed. */
const DEFAULT_MAX_STALLED_COUNT = 1;

/** How often (ms) the worker checks for stalled jobs. */
const DEFAULT_STALLED_INTERVAL_MS = 30_000;

/**
 * @description Default BullMQ Worker options for job recovery after server restart.
 * Queues that use these (or extend them) get stalled-job detection: after a restart,
 * active jobs become stalled when the lock expires and re-enter the waiting queue.
 *
 * Use in @Processor(queueName, { ...defaultWorkerOptions, concurrency: 1 }).
 * Plans queue uses longer lockDuration via its own constants; other queues can import these.
 */

/** Lock TTL in Redis (ms). Worker renews every lockDuration/2. After process exit, lock expires and job can be detected as stalled. */
const DEFAULT_LOCK_DURATION_MS = 60_000;

/**
 * @description Default Worker options for stalled-job recovery. Spread into @Processor options.
 */
export const defaultWorkerOptions = {
  lockDuration: DEFAULT_LOCK_DURATION_MS,
  maxStalledCount: DEFAULT_MAX_STALLED_COUNT,
  stalledInterval: DEFAULT_STALLED_INTERVAL_MS,
} as const;
