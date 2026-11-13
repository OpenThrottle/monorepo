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
import KeyvRedis from '@keyv/redis';
import Keyv from 'keyv';

import { redisConfig } from '../config.constants';
import type { RedisCacheLogger } from './redis.types.ts';

/**
 * @description Copy an `Error` into a plain object so JSON log formats keep
 * its details. `message`, `name` and `stack` are non-enumerable on an `Error`,
 * so winston's JSON output prints a bare `Error` (for example node-redis's
 * `SocketClosedUnexpectedlyError` on a Redis restart) as `{}`. Enumerable own
 * fields such as `code`, `errno` and `syscall` are kept. Non-`Error` values are
 * returned unchanged.
 */
const serializeError = (error: unknown): unknown => {
  if (!(error instanceof Error)) return error;

  return {
    ...error,
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
};

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
 * Connection-level errors (connect/auth/reconnect failures, a Redis restart's
 * `SocketClosedUnexpectedlyError`) are emitted as `error` events on the
 * underlying node-redis client. `@keyv/redis` does NOT forward those to its own
 * emitter — it only relays `connect`/`disconnect`/`reconnecting` — so a listener
 * on the store alone leaves the client's `error` unhandled, and an unhandled
 * `error` event crashes the Node process. Unlike cache *fetch* errors these are
 * NOT swallowed by `ErrorsAreMissesCache`. We attach `error` listeners on the
 * client, the store and the wrapper so they are logged rather than thrown, and
 * register the store for graceful shutdown via {@link disconnectRedisCaches}.
 *
 * @param logger Optional logger used to record connection-level errors. When
 * omitted, errors are still handled (preventing a crash) but not logged.
 */
export const getRedisCache = (logger?: RedisCacheLogger) => {
  const APP_NAME = process.env.APP_NAME || 'openthrottle - default';
  const namespace = `${APP_NAME}-graphql-cache`;

  const { host, password, port, tls, username } = redisConfig();

  const scheme = tls ? 'rediss' : 'redis';
  const hasCredentials = Boolean(username || password);
  const encodedUsername = encodeURIComponent(username ?? '');
  const encodedPassword = encodeURIComponent(password ?? '');
  const userInfo = `${encodedUsername}:${encodedPassword}@`;
  const credentials = hasCredentials ? userInfo : '';
  const redisUri = `${scheme}://${credentials}${host}:${port}`;

  const cacheRedis = new KeyvRedis(redisUri, { namespace });
  // NOTE: this line is why `@openthrottle/nestjs-redis` is the one nestjs
  // package still on `"type": "commonjs"`.
  //
  // `keyv` is dual-published with SEPARATE declarations per condition
  // (`dist/index.d.cts` for require, `dist/index.d.ts` for import).
  // `@apollo/utils.keyvadapter` is CommonJS-only — no `type`, no `exports` map,
  // and 4.0.1 is the latest release — so its own `.d.ts` resolves `keyv`
  // through the require condition. Flip this package to ESM and our `Keyv`
  // resolves through import instead, producing two nominally distinct classes:
  //
  //   Argument of type 'keyv/dist/index' with resolution-mode "import").Keyv<string>'
  //   is not assignable to parameter of type 'keyv/dist/index').Keyv<string>'
  //   Types have separate declarations of a private property '_ttl'.
  //
  // The usual escape hatch is an `as` cast, which this repo bans outright, and
  // there is no adapter version to upgrade to. So this package stays CommonJS
  // until `@apollo/utils.keyvadapter` ships ESM/dual types. Nothing else is
  // blocked by it: ESM packages consume this one fine via its `import`
  // condition, and Node's `require(esm)` covers the reverse.
  const cacheKV = new Keyv(cacheRedis);

  const logConnectionError = (source: string) => {
    return (error: unknown): void => {
      logger?.error(`Redis cache connection error (${source})`, {
        error: serializeError(error),
        namespace,
      });
    };
  };

  // The client is the emitter a Redis restart actually fires on; see above.
  cacheRedis.client.on('error', logConnectionError('client'));
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
