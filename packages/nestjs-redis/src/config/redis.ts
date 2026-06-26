/**
 * Cache control for Apollo works uses the lowest possible maxAge in a given request.
 * If not given a defaultMaxAge, it'll default to 0. If any type or field requires a resolver and does not have a maxAge, it'll use the default, which is 0.
 * So there are two options here -
 * 1. Increase the defaultMaxAge of all requests and explicitly set maxAge of specific fields
 * 2. Set defaultMaxAge to 0 but explicitly set maxAge for all fields and types in a given request
 *
 *
 * @see https://github.com/apollographql/apollo-server/issues/3559
 * @see https://github.com/apollographql/apollo-server/issues/3559#issuecomment-737427790
 *
 */

import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import { ErrorsAreMissesCache } from '@apollo/utils.keyvaluecache';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { redisConfig } from './nestjs-redis.config';

/**
 * Minimal logging surface accepted by {@link getRedisCache}. Matches the shape
 * of the injectable `LoggerService` from `@openthrottle/nestjs-modules` as well
 * as the built-in NestJS `Logger`, so connection-level errors are routed to the
 * application logger instead of surfacing as unhandled `error` events (which can
 * crash the Node process).
 */
export interface RedisCacheLogger {
  error: (message: unknown, ...optionalParams: unknown[]) => void;
  warn: (message: unknown, ...optionalParams: unknown[]) => void;
}

/**
 * Tracks the Keyv stores backing every cache created by {@link getRedisCache}
 * so the owning module can close their underlying Redis clients on shutdown.
 * Cleared by {@link disconnectRedisCaches}.
 */
const liveStores = new Set<Keyv>();

/**
 * @see https://www.apollographql.com/docs/apollo-server/performance/cache-backends/#configuring-redis
 * @see https://www.apollographql.com/docs/apollo-server/performance/cache-backends/#handling-cache-fetching-errors
 * @description Simple helper function that connects to our Redis instance
 * and returns a KeyvAdapter instance which is used by Apollo Server.
 *
 * Connection-level errors (connect/auth/reconnect failures) are emitted as
 * `error` events on the underlying ioredis client and on the Keyv wrapper. An
 * unhandled `error` event can crash the Node process, and unlike cache *fetch*
 * errors these are NOT swallowed by `ErrorsAreMissesCache`. We attach `error`
 * listeners on both the store and the wrapper so they are logged rather than
 * thrown, and register the store for graceful shutdown via
 * {@link disconnectRedisCaches}.
 *
 * @param logger Optional logger used to record connection-level errors. When
 * omitted, errors are still handled (preventing a crash) but not logged.
 */
export const getRedisCache = (logger?: RedisCacheLogger) => {
  const APP_NAME = process.env.APP_NAME || 'openthrottle - default';
  const namespace = `${APP_NAME}-graphql-cache`;

  const { host, password, port, tls, username } = redisConfig();

  const scheme = tls ? 'rediss' : 'redis';
  const credentials =
    username || password
      ? `${encodeURIComponent(username ?? '')}:${encodeURIComponent(
          password ?? '',
        )}@`
      : '';
  const redisUri = `${scheme}://${credentials}${host}:${port}`;

  const cacheRedis = new KeyvRedis(redisUri, { namespace });
  const cacheKV = new Keyv(cacheRedis);

  const logConnectionError =
    (source: string) =>
    (error: unknown): void => {
      logger?.error(`Redis cache connection error (${source})`, {
        error,
        namespace,
      });
    };

  cacheRedis.on('error', logConnectionError('store'));
  cacheKV.on('error', logConnectionError('keyv'));

  liveStores.add(cacheKV);

  const adapter = new KeyvAdapter(cacheKV);
  const faultTolerantCache = new ErrorsAreMissesCache(adapter);

  return faultTolerantCache;
};

/**
 * Disconnect the Redis clients backing every cache created by
 * {@link getRedisCache}. Intended to be called from a NestJS lifecycle hook
 * (`onApplicationShutdown`) so connections are closed cleanly on shutdown.
 *
 * Disconnect failures are routed to the optional logger and never rejected, so
 * a single bad client cannot stall the rest of the shutdown sequence.
 */
export const disconnectRedisCaches = async (
  logger?: RedisCacheLogger,
): Promise<void> => {
  const stores = [...liveStores];
  liveStores.clear();

  await Promise.all(
    stores.map(async (store) => {
      try {
        await store.disconnect();
      } catch (error) {
        logger?.warn('Failed to disconnect Redis cache client', { error });
      }
    }),
  );
};
