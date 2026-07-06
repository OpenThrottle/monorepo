# @openthrottle/nestjs-throttler — agent notes

Rate limiting for the GraphQL API: wraps `@nestjs/throttler` with a default tier
(10 requests / 60s) and binds a GraphQL-aware `GqlThrottlerGuard` as a global `APP_GUARD`.

**Consumed by:** `openthrottle-server` only.

## Layout

- `src/modules/nestjs-throttler.module.ts` — static import, `forRoot`, `forRootAsync`; every
  variant re-binds the guard as `APP_GUARD`.
- `src/guards/gql-throttler.guard.ts` — the whole point of the package; read its doc comments
  before touching throttling behavior.
- `src/config/nestjs-throttler.options.ts` — option parsing/validation + the default tier.
- `src/modules/*.integration.test.ts` — HTTP and GraphQL integration tests covering the
  skip/enforce matrix; extend these when changing guard behavior.

## Invariants & gotchas

- Built package (real `build`/`dev` targets, `exports` → `dist/`) — see [../AGENTS.md](../AGENTS.md).
- Importing the module **enforces** the limit — the guard is a global `APP_GUARD`, not opt-in
  config. Adding this module to a test module rate-limits that test app.
- The stock `ThrottlerGuard` crashes on every GraphQL operation (`context.switchToHttp()` is
  undefined → "Cannot read properties of undefined (reading 'ip')"). `GqlThrottlerGuard`
  resolves `req` from the GraphQL context instead; REST falls through to stock behavior.
- graphql-ws operations are deliberately **skipped**, in two layers:
  - subscriptions (and connection-time contexts with no `req`) — no client IP to track;
  - queries/mutations executed over the ws socket — `@nestjs/apollo` surfaces the ws upgrade
    request as `req` so they _look_ throttleable, but there is no Express `res.header` to set
    rate-limit headers on, so `shouldSkip` returns true whenever no usable `res.header` exists.
    Don't "fix" ws throttling by faking a `res` — the skip is intentional.
- `forRoot`/`forRootAsync` are only `global: true` when `isGlobal: true` is passed, but the
  `APP_GUARD` binding applies app-wide regardless of module scope.

## Pointers

- [README.md](./README.md) — install + upstream `@nestjs/throttler` docs link.
