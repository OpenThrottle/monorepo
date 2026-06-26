# @openthrottle/nestjs-redis

A small Redis integration for NestJS applications. It provides:

- `getRedisCache` — a fault-tolerant Apollo Server cache backend backed by Redis (via Keyv), with connection-level errors logged instead of crashing the process.
- `NestjsRedisModule` — a module whose `onApplicationShutdown` hook closes the Redis clients backing those caches so connections are released cleanly.

Redis connection settings are read from `REDIS_*` environment variables (`REDIS_HOST` is required; `REDIS_PORT` defaults to `6379`).

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-redis
```

**npm:**

```bash
npm install @openthrottle/nestjs-redis
```
