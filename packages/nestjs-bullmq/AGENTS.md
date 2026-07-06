# @openthrottle/nestjs-bullmq — agent notes

NestJS BullMQ module: Redis-backed queues with a config-driven connection, shared default
job options (retries/backoff/retention), and a `registerQueue` helper for feature queues.

**Consumed by:** `openthrottle-server` only — `NestjsBullmqModule` imported once in
`app.module.ts`, then `NestjsBullmqModule.registerQueue(<name>)` per feature queue in
`applications/openthrottle-server/src/queues/*` (plans, doc-ingestion, code-index, …).

## Layout

- `src/modules/nestjs-bullmq.module.ts` — the whole module: `ConfigModule.forRoot` with Joi
  validation, `BullModule.forRootAsync`, root `defaultJobOptions`, static `registerQueue`.
- `src/config/nestjs-bullmq.config.ts` — `redisConfig` (`registerAs`) mapping `REDIS_*` env
  vars to ioredis connection options, plus the Joi `configValidationSchema`.
- `src/config/nestjs-bullmq.defaults.ts` — `defaultWorkerOptions` (lockDuration,
  stalledInterval, maxStalledCount) for stalled-job recovery.

## Invariants & gotchas

- Built, not source-first: real `build`/`dev` targets via `@nx/js:tsc`. `main`/`types` point
  at `./src/index.ts` for workspace dev, but top-level `exports` map to `./dist` because
  `openthrottle-server`'s Docker runtime loads dist (see [../AGENTS.md](../AGENTS.md)).
  Keep `exports` and `src` layout in sync when moving files.
- Importing the package must not require Redis env vars (consumer unit tests rely on this) —
  `BullModule.forRootAsync` defers the `REDIS_HOST` read to bootstrap; don't convert to
  a synchronous `forRoot`. At bootstrap, Joi fails fast and reports all bad `REDIS_*` vars
  at once (`abortEarly: false`).
- `maxRetriesPerRequest: null` and `enableReadyCheck: false` are BullMQ client requirements
  set in `redisConfig` — don't override them.
- Root `defaultJobOptions` bounds Redis growth (`removeOnComplete`/`removeOnFail` TTLs).
  Worker options are deliberately NOT set at the root: every `@Processor` must spread
  `defaultWorkerOptions` itself, or its stalled jobs won't recover after a server restart.
- Cross-package imports must be declared in `dependencies` (`workspace:^`), not left to
  pnpm hoisting or `tsconfig.lib.json` project references alone.

## Don't

- Queue dashboard/monitoring UI belongs in the sibling
  [`nestjs-bullmq-board`](../nestjs-bullmq-board/) package (Bull Board), not here.

## Pointers

- [README.md](./README.md) — full `REDIS_*` env var table (TLS, `REDIS_FAMILY`/IPv6,
  managed-Redis notes).
