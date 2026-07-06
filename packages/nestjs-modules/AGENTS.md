# @openthrottle/nestjs-modules — agent notes

Shared NestJS foundations: `GlobalClsModule` (request-scoped context via nestjs-cls) and
`LoggerModule`/`LoggerService` (Winston structured logging).

**Consumed by:** the most-depended-on `nestjs-*` package — `openthrottle-server` plus 7
workspace packages (`nestjs-agentic-workflow`, `nestjs-bullmq`, `nestjs-logging`,
`nestjs-model-discovery`, `nestjs-typeorm`, `nestjs-vector-search`, `openthrottle-mcp`).
Changes here ripple across the entire server stack.

## Layout

- `src/modules/logger/` — `LoggerService` implements Nest's `LoggerService` over Winston;
  `logger.config.ts` picks the formatter from `NODE_ENV` / `LOG_FORMAT`.
- `src/modules/global-cls/` — `ClsModule.forRoot` middleware seeding `app` context from
  `x-app-name`/`x-app-version` headers; `GlobalClsService` with `setUser`.

## Invariants & gotchas

- Built package (real `build` target, `exports` → `dist/` — see
  [../AGENTS.md](../AGENTS.md) for why that must stay).
- Importing `GlobalClsModule` is not passive: it mounts **global** CLS middleware
  (`ClsModule.forRoot({ global: true, middleware: { mount: true } })`) on the consumer.
- `GlobalClsService` is the nestjs-cls `ClsService` singleton augmented with `setUser`
  via `Object.assign` — nestjs-cls exposes one singleton, so don't replace the instance
  in the factory.
- `LoggerService.fatal` maps to Winston `error` with a `severity: 'fatal'` meta marker
  (Winston has no fatal level; the reserved `level` field must stay `error` so transports
  and level filters behave). `log()` is deprecated in favor of `info()`.
- `logger.config.ts` reads `NODE_ENV`, `LOG_FORMAT` (unknown values warn and fall back
  rather than silently defaulting), and `APP_NAME` (the `service` tag on every line).

## Pointers

- [README.md](./README.md) — GlobalCls usage and where `openthrottle-server` populates
  `user` (auth hook/guard).
