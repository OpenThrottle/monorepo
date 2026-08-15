import { Redis, type RedisOptions } from 'ioredis';
import { redisConfig } from './nestjs-redis.config';

/**
 * Minimal logging surface accepted by {@link createRedisClient}. Matches the
 * shape of the injectable `LoggerService` from `@openthrottle/nestjs-modules`
 * as well as the built-in NestJS `Logger`, so connection-level errors are
 * routed to the application logger instead of surfacing as unhandled `error`
 * events (which can crash the Node process).
 */
export interface RedisClientLogger {
  error: (message: unknown, ...optionalParams: unknown[]) => void;
  warn: (message: unknown, ...optionalParams: unknown[]) => void;
}

/**
 * @description Build a dedicated, fully-typed ioredis client for control-plane
 * work (health-check ping, plan-cancel pub/sub) that must not borrow BullMQ's
 * queue connection. Connection settings (host/port/tls/auth) come from the
 * shared {@link redisConfig}, keeping TLS/auth parity with the Keyv cache
 * client in `./redis`.
 *
 * Returns `null` when `REDIS_HOST` is unset so callers can preserve their
 * best-effort semantics (e.g. the health check reports `unconfigured`) without
 * `redisConfig()` throwing. `lazyConnect` defers the TCP connection until the
 * first command/subscribe, so simply constructing the client never triggers a
 * connection attempt or an unhandled `error` event.
 *
 * Connection-level errors are logged (never rethrown) via the optional logger,
 * mirroring {@link getRedisCache}.
 */
export const createRedisClient = (logger?: RedisClientLogger): Redis | null => {
  if (!process.env.REDIS_HOST) {
    return null;
  }

  const { host, password, port, tls, username } = redisConfig();

  const options: RedisOptions = {
    host,
    lazyConnect: true,
    password,
    port,
    username,
    ...(tls ? { tls: {} } : {}),
  };

  const client = new Redis(options);

  client.on('error', (error: unknown): void => {
    logger?.error('Redis client connection error', { error });
  });

  return client;
};

/**
 * @description Gracefully close a client created by {@link createRedisClient}.
 * Intended for a NestJS `onApplicationShutdown` hook so the connection is
 * released cleanly. A `null` client (unconfigured) is a no-op, and `quit()`
 * failures are routed to the optional logger and never rejected so a single
 * bad client cannot stall the rest of the shutdown sequence.
 */
export const disconnectRedisClient = async (
  client: Redis | null,
  logger?: RedisClientLogger,
): Promise<void> => {
  if (client === null) {
    return;
  }

  try {
    await client.quit();
  } catch (error) {
    logger?.warn('Failed to disconnect Redis client', { error });
  }
};
