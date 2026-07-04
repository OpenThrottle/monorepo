# @openthrottle/nestjs-auth — agent notes

Passport JWT auth module (`NestjsAuthModule.forRoot`/`forRootAsync`, `JwtStrategy`,
`JwtAuthGuard`, `@Public()`, `@CurrentUser()`) plus the `AuthPrincipal` identity contract shared
by human-JWT and service-account auth.

**Consumed by:** `openthrottle-server` (via its `GlobalAuthGuard`) and
`@openthrottle/nestjs-stripe`.

## Layout

- `src/auth-principal.ts` — `AuthPrincipal` union (`kind: 'user' | 'service_account'`),
  normalizers and type guards; the identity shape RBAC/CLS code depends on.
- `src/strategies/jwt.strategy.ts` — HS256 strategy, `JwtPayload`, secret-length enforcement.
- `src/guards/jwt-auth.guard.ts` — honors `IS_PUBLIC_KEY` from `src/decorators/public.decorator.ts`.
- `src/utils/` — `getAuthPrincipalFromRequest` + `getRequestFromExecutionContext` (HTTP and
  GraphQL execution contexts).

## Invariants & gotchas

- **Service-account layering lives in the server, not here.** `ot_sa_…` bearer validation is
  `applications/openthrottle-server/src/auth/service-account-auth.service.ts`; the server's
  `GlobalAuthGuard` tries it first, then falls back to this package's JWT guard, and both paths
  normalize into this package's `AuthPrincipal` and honor this package's `IS_PUBLIC_KEY`. Changing
  the `AuthPrincipal` shape, `kind` discriminants, or `IS_PUBLIC_KEY` breaks that guard.
- `JwtStrategy` throws at startup if the secret is under 32 bytes (`JWT_SECRET_MIN_BYTES`,
  HS256 brute-force floor) — short test secrets fail module init, not token verification.
- `JwtStrategy.validate` is signature-trust by default: a valid unexpired token for a deleted or
  disabled user still authenticates. Production consumers subclass and override `validate` — see
  the README's security note.
- The same `JWT_SECRET`/`JWT_ISSUER` HS256 tokens authenticate graphql-ws connections in
  [`nestjs-graphql`](../nestjs-graphql/) (`graphql-ws-auth.ts`); changing claim or secret handling
  here must stay compatible with that path.
- `forRootAsync` runtime-validates the factory's return (`jwtSecret` non-empty string) before it
  reaches the strategy — a malformed options object fails loudly at wiring time.
- Built package with the deliberate dual mapping (`main` → `src`, `exports` → `dist/`) — see
  [../AGENTS.md](../AGENTS.md) and the README's "Package resolution" section; don't "fix" it.

## Pointers

- [README.md](./README.md) — usage, env vars (`JWT_SECRET`, `JWT_ISSUER`), exports list,
  `validate` security note.
