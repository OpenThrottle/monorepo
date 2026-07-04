# @openthrottle/nestjs-redis — agent notes

Redis-backed Apollo Server cache: `getRedisCache()` returns a fault-tolerant Keyv/Redis
cache, and `NestjsRedisModule` closes those connections on application shutdown.

**Consumed by:** `@openthrottle/nestjs-graphql` imports `getRedisCache` (note: that package
does not declare this dependency in its `package.json` — it resolves via workspace hoisting
plus a tsconfig project reference). The `@tools/generators` NestJS app template registers
`NestjsRedisModule`. No app depends on it directly.

## Layout

- `src/config/redis.ts` — `getRedisCache`, `disconnectRedisCaches`, the module-level
  `liveStores` registry.
- `src/config/nestjs-redis.config.ts` — `redisConfig()` mapping `REDIS_*` env vars.
- `src/modules/nestjs-redis.module.ts` — only an `onApplicationShutdown` hook.

## Invariants & gotchas

- Built, not source-first: real `build`/`dev` targets, top-level `exports` → `dist`
  (family pattern — see [../AGENTS.md](../AGENTS.md)).
- Two distinct error paths, both deliberate: connection-level errors (`error` events on the
  ioredis store and Keyv wrapper) are caught by attached listeners and logged — unhandled
  they would crash the process; cache _fetch_ errors become misses via
  `ErrorsAreMissesCache`. Keep both when touching `getRedisCache`.
- Every cache created registers in `liveStores`; only `NestjsRedisModule`'s shutdown hook
  (`disconnectRedisCaches`) closes them. An app calling `getRedisCache` without importing
  the module leaves Redis connections dangling on shutdown.
- The cache namespace is `${APP_NAME}-graphql-cache` — `APP_NAME` env changes silently
  repoint the cache keyspace.
- `redisConfig()` reads `REDIS_*` at call time; `REDIS_HOST` is required.

## Pointers

- [README.md](./README.md)
