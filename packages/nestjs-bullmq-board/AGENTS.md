# @openthrottle/nestjs-bullmq-board — agent notes

NestJS module mounting the Bull Board dashboard (Express adapter, `/queues` route) behind
basic-auth, for monitoring BullMQ queues/jobs.

**Consumed by:** `openthrottle-server` only — `forRoot({ enabled: isBullBoardEnabled() })` in
`app.module.ts`, plus `forFeature(<queue>)` per queue module.

## Layout

- `src/modules/nestjs-bullmq-board.module.ts` — everything: `isBullBoardEnabled()`, `forRoot`
  (mounts dashboard + basic-auth), `forFeature` (registers one queue).
- `src/config/nestjs-bullmq-board.config.ts` — `bullmqBoardConfig` (`registerAs`) + Joi schema
  for `BULLMQ_BOARD_ADMIN_USERNAME` / `BULLMQ_BOARD_ADMIN_PASSWORD` (password min 16 chars).

## Invariants & gotchas

- **The dashboard must stay off in production**: it exposes job payloads and destructive
  retry/remove/clean actions behind a single shared static basic-auth credential.
  `isBullBoardEnabled()` (`NODE_ENV !== 'production'`) is the single source of truth.
- `forRoot` and `forFeature` must agree on enablement: `forFeature` mounts a module that injects
  the `bull_board_instance` provider only an **enabled** root supplies. When disabled,
  `forFeature` returns an empty module — removing that guard makes every queue module throw
  `UnknownDependenciesException` at boot in production.
- Env vars are only validated/required when the dashboard is enabled; `forRoot({ enabled: false })`
  imports nothing, so production needs no `BULLMQ_BOARD_*` vars.
- `BullBoardModule.forRootAsync` is a separate injector scope: the `ConfigModule.forFeature`
  inside its `imports` is required for the options factory to resolve the config token — the
  sibling `ConfigModule.forRoot` is not visible across that boundary.
- Built package (`build` via `@nx/js:tsc`, `exports` → `dist/`) — see [../AGENTS.md](../AGENTS.md).

## Don't

- Queue/connection/worker configuration belongs in the sibling
  [`nestjs-bullmq`](../nestjs-bullmq/) package; this one is dashboard-only.

## Pointers

- [README.md](./README.md) — based on upstream [bull-board](https://github.com/felixmosh/bull-board).
