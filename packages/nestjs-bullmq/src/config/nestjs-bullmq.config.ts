import { registerAs } from '@nestjs/config';
import Joi from 'joi';

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
 * Truthy env-string check. Accepts `1`, `true`, `yes`, `on` (case-insensitive).
 */
const isEnvTrue = (value: string | undefined): boolean => {
  return (
    value !== undefined &&
    ['1', 'on', 'true', 'yes'].includes(value.toLowerCase())
  );
};

/** BullMQ's default key prefix; the main checkout keeps it so existing Redis state stays reachable. */
const DEFAULT_QUEUE_PREFIX = 'bull';

/**
 * @description Resolves the environment-scoped BullMQ key prefix for this checkout.
 *
 * Worktrees share the host Redis, and BullMQ queue names are static global
 * strings — without a per-checkout prefix, every worker-role process races on
 * the same queues and a plan run can execute against the WRONG checkout. The
 * prefix is the isolation mechanism.
 *
 * Resolution order:
 * 1. `OT_QUEUE_PREFIX` — explicit override.
 * 2. `OT_CONTAINER_PREFIX` (written per-worktree by `setup_worktree.ts`, e.g.
 *    `wt-<slug>-`) → `bull:wt-<slug>` so worktrees are isolated out of the box.
 * 3. `'bull'` — BullMQ's default; the main checkout and self-hosted deploys
 *    keep their existing Redis keys (repeatable jobs, cron state) untouched.
 *
 * Every producer and consumer in one checkout resolves the same value because
 * both read the same env (root `.env` via Nx env loading, or the container
 * environment in docker).
 *
 * @public
 */
export const resolveQueuePrefix = (): string => {
  const explicit = process.env.OT_QUEUE_PREFIX?.trim();
  if (explicit) {
    return explicit;
  }

  const containerPrefix = process.env.OT_CONTAINER_PREFIX?.trim().replace(
    /-+$/,
    '',
  );
  if (containerPrefix) {
    return `${DEFAULT_QUEUE_PREFIX}:${containerPrefix}`;
  }

  return DEFAULT_QUEUE_PREFIX;
};

/**
 * @description ioredis connection options every BullMQ queue in this checkout
 * connects with. Shared by the module's root config and by queues built outside
 * DI (e.g. dynamic queues) so neither can drift from the other — a queue that
 * drops `password`/`username`/`tls`/`db` cannot authenticate, or lands in the
 * wrong database.
 *
 * @public
 */
export interface RedisConnectionOptions {
  readonly db: number | undefined;
  readonly enableReadyCheck: boolean;
  readonly family: number | undefined;
  readonly host: string;
  readonly maxRetriesPerRequest: null;
  readonly password: string | undefined;
  readonly port: number;
  readonly tls: Record<string, never> | undefined;
  readonly username: string | undefined;
}

/**
 * @description Resolves ioredis connection options from REDIS_* env vars, or
 * `null` when `REDIS_HOST` is unset.
 *
 * Required: `REDIS_HOST`. Optional: `REDIS_PORT` (default 6379), `REDIS_DB`,
 * `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_TLS` (enables TLS — required by most
 * managed/cloud Redis), `REDIS_FAMILY` (4 = IPv4, 6 = IPv6; some managed Redis
 * resolve only over IPv6).
 *
 * Client resiliency defaults follow BullMQ requirements: `maxRetriesPerRequest`
 * is `null` and `enableReadyCheck` is `false` so blocking commands work and
 * connections survive transient Redis failovers.
 *
 * @public
 */
export const resolveRedisConnection = (): RedisConnectionOptions | null => {
  const host = process.env.REDIS_HOST;
  if (!host) {
    return null;
  }

  return {
    db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined,
    enableReadyCheck: false,
    family: process.env.REDIS_FAMILY
      ? Number(process.env.REDIS_FAMILY)
      : undefined,
    host,
    maxRetriesPerRequest: null,
    password: process.env.REDIS_PASSWORD || undefined,
    // Coerce REDIS_PORT to a number once here so the connection contract is a
    // typed number, not the raw process.env string. Consumers read `port`
    // directly without re-coercing.
    port: Number(process.env.REDIS_PORT) || 6379,
    tls: isEnvTrue(process.env.REDIS_TLS) ? {} : undefined,
    username: process.env.REDIS_USERNAME || undefined,
  };
};

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
