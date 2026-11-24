# OpenThrottle server auth (NestJS + Passport)

This document describes the auth setup on **openthrottle-server**: Passport local strategy for credential validation, OpenThrottle DB as user store, JWT issuance, and optional features. For generic wiring of nestjs-auth and nestjs-rbac, see [docs/nestjs/wiring-auth-rbac.md](../nestjs/wiring-auth-rbac.md).

---

## Current auth state

### What exists today

- **User store (OpenThrottle)** — Users live in the OpenThrottle DB `users` table (`databases/openthrottle/migrations`: `026_create_users_table.sql`, `031_add_users_password_hash_and_email_unique.sql`, `033_add_users_disabled_at.sql`). The table has `email` (unique when set), `password_hash` (bcrypt), `github_username`, and optional `disabled_at`. When `disabled_at` is set, the user is disabled and login is rejected (LocalStrategy throws `UnauthorizedException('Account is disabled')`). **UsersRepository** (`@openthrottle/nestjs-repositories-server`) provides `findByEmail`, `validatePassword`, `hashPassword`, `create`, `update`, `disable`, and `enable`; the Passport local strategy uses these for login.

- **NestjsAuthModule** (`@openthrottle/nestjs-auth`) — Registered in `AppModule` via `NestjsAuthModule.forRoot()`. Provides:
  - **JWT strategy** (`packages/nestjs-auth/src/strategies/jwt.strategy.ts`): Passport strategy that validates JWTs from the `Authorization: Bearer <token>` header. Uses `JWT_SECRET` (required) and optional `JWT_ISSUER` from env. Algorithm HS256; token extracted via `ExtractJwt.fromAuthHeaderAsBearerToken()`. The validated payload (including `sub` as user id and optional `email`) is attached to `request.user`; consumers should use `sub` as the stable user id, not email.
  - **JwtAuthGuard** (`packages/nestjs-auth/src/guards/jwt-auth.guard.ts`): Guard that enforces JWT authentication. Use with `@UseGuards(JwtAuthGuard)` on resolvers or controllers, or use the global guard (see below). On success, the validated payload is attached to `request.user`; on failure it throws `UnauthorizedException('JWT authentication required')`.
  - **Global auth guard**: `applications/openthrottle-server/src/app.module.ts` registers `GlobalAuthGuard` as `APP_GUARD`. It skips auth when a handler or class is marked `@Public()` (e.g. login, register, health). Bearer `ot_sa_<prefix>_<secret>` are validated first via `ServiceAccountAuthService`; otherwise it delegates to `JwtAuthGuard`. Login, register, and health endpoints are marked `@Public()`.
  - **Service account tokens**: Long-lived automation credentials (`service_accounts`, `service_account_credentials`, `service_account_roles`). Format `Authorization: Bearer ot_sa_<prefix>_<secret>`. Bootstrap with `pnpm run database:bootstrap-service-accounts`; see `packages/openthrottle-mcp/docs/AUTH.md`.
  - **NestjsAuthModule** registration: `applications/openthrottle-server/src/app.module.ts` (imports `NestjsAuthModule.forRoot()`).

- **AuthGraphqlModule** — GraphQL auth surface in openthrottle-server:
  - **Module**: `applications/openthrottle-server/src/graphql/auth/auth.module.ts`. Registers `JwtModule` with the same `JWT_SECRET` and optional `JWT_ISSUER` (and `expiresIn: 24h`), plus PassportModule and LocalStrategy. Local strategy validates email/password against OpenThrottle users.
  - **Login mutation**: `applications/openthrottle-server/src/graphql/auth/auth.resolver.ts` — public `login(input: LoginInput)` mutation. Input: `LoginInput` (email, password); output: `LoginResultObject` with `accessToken`. Uses `GqlLocalCredentialsGuard` + `AuthGuard('local')` so LocalStrategy runs and sets `request.user`; AuthService then signs a JWT with `sub: user.id`.
  - **Register mutation**: Same resolver — public `register(input: RegisterInput)` mutation. Input: `RegisterInput` (email, password, optional githubUsername); output: `RegisterResultObject` (id, email, accessToken). AuthService hashes the password with bcrypt (via UsersRepository.hashPassword), creates the user in OpenThrottle, and returns the new user plus a JWT so the client can stay logged in. Duplicate email returns `ConflictException`. **Registration is gated:** `OPENTHROTTLE_REGISTRATION_ENABLED` unset means on outside production and off when `NODE_ENV=production`; `true`/`false` force it. A disabled call returns a `GraphQLError` with `extensions: { code: 'FORBIDDEN', reason: 'REGISTRATION_DISABLED' }`. The gate exists because most mutations are authenticated-only (Path A, ADR `18e16dfc`), so open registration would hand any caller a principal that can use them; moving destructive mutations to `@Permissions` is the Path B plan `ff184aa8`.
  - **AuthService** (`applications/openthrottle-server/src/graphql/auth/auth.service.ts`): `login(user)` signs a JWT for a validated user (from LocalStrategy). `register(input)` creates a user (email unique, password hashed) and returns id, email, and accessToken. Credential validation is done by the Passport local strategy; the token uses `sub` as the stable user id.
  - **Supporting types**: `login.input.ts`, `login-result.object.ts`, `register.input.ts`, `register-result.object.ts`; **LocalStrategy** in `strategies/local.strategy.ts`; **GqlLocalCredentialsGuard** copies GraphQL args onto the request body for Passport.

- **CORS** — Configured in `applications/openthrottle-server/src/main.ts` via `app.enableCors(getCorsOptions())` from `@openthrottle/nestjs-rbac`. Allowed origins, credentials, and methods come from env (see [docs/nestjs/wiring-auth-rbac.md](../nestjs/wiring-auth-rbac.md) and env table below).

### Environment variables

No new env is required beyond the JWT variables below. Password hashing uses bcrypt with a fixed default (10 rounds) in `@openthrottle/nestjs-repositories-server` (`hashPassword`); to make rounds configurable you could add `BCRYPT_ROUNDS` and pass it into `UsersRepository.hashPassword`.

| Variable     | Required | Purpose                                                                                                                                                                    |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET` | Yes      | Used by both NestjsAuthModule (JwtStrategy) and AuthGraphqlModule (JwtModule) to verify/sign tokens. Set in `applications/openthrottle-server/.env.default` for local dev. |
| `JWT_ISSUER` | No       | Optional JWT `iss` claim. When set, the strategy and AuthService both use it so issued tokens are accepted by the strategy.                                                |

CORS-related env (`CORS_ORIGINS`, `CORS_CREDENTIALS`, `CORS_ALLOWED_METHODS`) are documented in [docs/nestjs/wiring-auth-rbac.md](../nestjs/wiring-auth-rbac.md).

### File reference summary

| Area           | Path                                                                                                                                                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App bootstrap  | `applications/openthrottle-server/src/main.ts`                                                                                                                                                                                                                              |
| App module     | `applications/openthrottle-server/src/app.module.ts`                                                                                                                                                                                                                        |
| Auth GraphQL   | `applications/openthrottle-server/src/graphql/auth/` (auth-graphql.module.ts, auth.resolver.ts, auth.service.ts, login.input.ts, login-result.object.ts, register.input.ts, register-result.object.ts, strategies/local.strategy.ts, guards/gql-local-credentials.guard.ts) |
| NestjsAuth pkg | `packages/nestjs-auth/` (nestjs-auth.module.ts, strategies/jwt.strategy.ts, guards/jwt-auth.guard.ts, auth.options.ts)                                                                                                                                                      |
| Env defaults   | `applications/openthrottle-server/.env.default`                                                                                                                                                                                                                             |

---

## Protecting resolvers and public routes

**Current state:** A **global auth guard** is applied: `GlobalAuthGuard` is registered as `APP_GUARD` in `app.module.ts`. It checks for `@Public()` (via `IS_PUBLIC_KEY`) on the handler or class; when set, it skips auth. Non-public routes require either a valid service-account bearer (`ot_sa_…`) or a human JWT. `GqlPermissionsGuard` enforces `@Permissions()` for both principal kinds using `RolesRepository.getPermissionsForUser` or `getPermissionsForServiceAccount`.

1. **Public operations**
   - **Login:** The `login` mutation and `AuthResolver` are marked `@Public()`. File: `applications/openthrottle-server/src/graphql/auth/auth.resolver.ts`.
   - **Register:** The `register` mutation is on the same resolver and is public (no JWT required to create an account), and gated by `OPENTHROTTLE_REGISTRATION_ENABLED` (off in production unless set to `true`).
   - **Health:** The health GraphQL resolver (`HealthResolver`) and REST controller (`HealthController`, `GET /health`) are marked `@Public()` so health checks do not require a token.

2. **Consumers and `sub` as user id**
   - The JWT payload uses `sub` as the **user id** (UUID from OpenThrottle users), not email. Use `@CurrentUser()` from `@openthrottle/nestjs-auth` to get the payload; use `@CurrentUser('sub')` for the user id. Do not rely on `sub` as email.

3. **Frontend: send the JWT**
   - **Authorization header:** The JWT strategy reads the token from `Authorization: Bearer <accessToken>`. Ensure the frontend (e.g. Apollo Client, urql) sends this header on every GraphQL request after login. Store the token from `login { accessToken }` in memory or secure storage and attach it to the GraphQL client’s headers.
   - **Cookies:** The current JWT strategy uses `ExtractJwt.fromAuthHeaderAsBearerToken()` only; it does not read cookies. To support cookie-based JWT, you would need to extend the strategy (or add a custom extractor) to read the token from a cookie and ensure CORS is configured with credentials (see [CORS, env, and optional auth features](#cors-env-and-optional-auth-features)).

### CORS, env, and optional auth features

CORS and related env are driven by `getCorsOptions()` from `@openthrottle/nestjs-rbac` in `main.ts`. Full wiring (including module imports and guard usage) is documented in [docs/nestjs/wiring-auth-rbac.md](../nestjs/wiring-auth-rbac.md); the CORS comment in `applications/openthrottle-server/src/main.ts` points to that doc.

**CORS for frontend:**

- **CORS_ORIGINS** — Comma-separated list of allowed origins (e.g. `https://app.openthrottle.ai,http://localhost:5173`). Omit or set to `*` for allow-all (convenient for local dev; avoid in production). When the frontend runs on a different origin than the API, set this to that origin (or list) so the browser allows the requests.
- **CORS_CREDENTIALS** — Set to `true` (default) when the frontend sends the JWT via `Authorization: Bearer <token>` or via cookies. Browsers require `credentials: true` in CORS when sending credentials. Set to `false` only if you do not send credentials cross-origin.

**openthrottle-developer e2e auth:** The developer app (Vite default port 3000, or 5173; allowedHosts `developer.local`) must be in `CORS_ORIGINS` when calling the server from the browser. `applications/openthrottle-server/.env.default` sets `CORS_ORIGINS` and `CORS_CREDENTIALS` so the developer app is allowed by default.

**JWT issuer and expiry:**

- **JWT_ISSUER** — Optional. When set, the JWT strategy and AuthGraphqlModule (JwtModule) both use it so issued tokens include the `iss` claim and the strategy accepts them. Useful in multi-tenant or multi-service setups.
- **Expiry** — Token lifetime is fixed at **24h** in `AuthGraphqlModule` (`auth-graphql.module.ts` signOptions `expiresIn: '24h'`) and in `AuthService` (`DEFAULT_EXPIRES_IN`). Making expiry configurable via env (e.g. `JWT_EXPIRES_IN`) is an optional follow-up.

**Roles and permissions (DB-backed):** Roles and permissions are stored in OpenThrottle (`permissions`, `roles`, `role_permissions`, `user_roles`, `service_account_roles`). Migration `034_create_roles_and_permissions_tables.sql` seeds default permissions (`settings:read`, `settings:write`, `users:read`, `users:write`) and roles (`admin`, `user`, `viewer`) with the same mapping as `@openthrottle/nestjs-rbac`. Migration `045_seed_service_accounts_bootstrap.sql` adds `plans:read` / `plans:write`, automation roles `mcp` and a plan-runner role, and service accounts `openthrottle-mcp` and a plan-runner account (renamed to `plan-runner` by migration 197). Resolvers using `@Permissions()` are protected by `GqlPermissionsGuard`, which resolves the authenticated `AuthPrincipal` on `request.user` and loads permissions via `RolesRepository.getPermissionsForUser` (human JWT) or `RolesRepository.getPermissionsForServiceAccount` (Bearer `ot_sa_…`). **Human bootstrap:** After migrations, no user has any role. Assign `admin` via SQL or admin GraphQL once a first admin exists. **Service account bootstrap:** Run `pnpm run database:bootstrap-service-accounts` to mint `ot_sa_…` tokens for `OPENTHROTTLE_MCP_AUTH_TOKEN` and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` (see `databases/openthrottle/README.md` and `packages/openthrottle-mcp/docs/AUTH.md`).

### Service accounts and the acting user: which helper to reach for

A resolver that receives a `sub` has to answer one question before anything else: **what is this
user id actually for?** Getting that wrong is what produced the one real defect in this area (see
below), so the three mechanisms are named here rather than inferred from whichever precedent you
happen to find first.

| You need...                                              | Use                                                          | Non-user principal                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| To **attribute** an action (nullable FK, "who did this") | `resolveActorUserId(sub, kind)`                              | resolves `null`, action proceeds unattributed                         |
| A user to **own or scope** a row the action must create  | `EffectiveUserResolutionService.resolveEffectiveUserId(sub)` | resolves the service account's `acting_user_id`; `null` when unlinked |
| The human to **be the subject**, not merely the actor    | `assertHumanAuthPrincipal(principal)`                        | throws `ForbiddenException`                                           |

**The rule that governs all three: acting-user resolution changes WHOM a permitted action is
attributed to — never WHAT the caller is authorized to do.** Authorization comes from
`service_account_roles` and `user_roles`, evaluated by `GqlPermissionsGuard`, and nothing here
touches that. Migration 107's `COMMENT` on `service_accounts.acting_user_id` says the same thing in
the schema: "a hint, never a permission grant". If you find yourself using a resolved user id to
decide _whether_ an action may proceed, you have reached for the wrong tool.

`assertHumanAuthPrincipal` is the deliberate hard floor, and its current users share one property:
the human is the **subject** of the operation, so acting-as would be either an escalation or a
privacy breach. `service-accounts.resolver` (an account must not mint or re-role its own
credentials), `agent-conversations.resolver` (a person's own chats), `token-usage.resolver` (a
person's own usage). Keep it that way; do not swap it for acting-user resolution to make an
automation path work.

**Audited 2026-09-08 (OT plan `79e8c132`).** Every `resolveActorUserId` call site was reviewed after
`registerPlanRunWorktreeCheckout` was changed to resolve through the acting user. Two findings worth
keeping:

- **There was no inconsistent line to redraw.** No other mutation hard-rejects a non-user principal
  through `resolveActorUserId`; the remaining call sites (`registerCliPlanRun`, both enqueue paths,
  `cancelPlanRun`) all treat `null` as "unattributed" and carry on. `registerPlanRunWorktreeCheckout`
  was the sole outlier.
- **That rejection was never an authorization control.** `PlansResolver` is
  `@authz-stance: authenticated-only`, so a service account could already call every other mutation
  on it. Reaching for the attribution helper where an _owner_ was needed simply produced a
  `ForbiddenException` as a side effect. The fix removed an accident, not a safeguard — which is
  precisely why the table above exists.

All three current `resolveEffectiveUserId` consumers (`registerPlanRunWorktreeCheckout`,
`recordSkillUsage`, `PlanCreationService`'s workspace resolution) use the result only to own, scope
or attribute a row, and each degrades to doing _less_ on `null` — never more. No call site depends
on it for authorization.

### Machine token hashing: SHA-256, not bcrypt, not HMAC

**Decided 2026-11-20 (OT plan `1eca04ec`).** Every machine-minted bearer secret is stored as the
plain hex SHA-256 of its secret part and compared in constant time: service-account credentials
(`ot_sa_<prefix>_<secret>`), and the MCP OAuth access tokens, refresh tokens and authorization
codes (`ot_oat_`, `ot_ort_`; PR #869). Human passwords stay on bcrypt (`users.password_hash`), and
so does the stored-only hash of a third-party `api_token` in `mcp_connector_connections`. Those
inputs are chosen by a person, so their entropy is unknown and a slow KDF is the right tool.

**Why a fast hash is safe here.** A slow KDF exists to make guessing a low-entropy input
expensive. These secrets are not guessable: an OAuth secret is 256 random bits, and a minted
`ot_sa_` secret is 32 characters drawn from 62, about 190 bits. bcrypt adds nothing at those sizes.
That only holds if every secret really is random, so `upsertCredentialForToken` refuses to store
an `ot_sa_` secret shorter than 32 characters (`SERVICE_ACCOUNT_SECRET_MIN_LENGTH`). Before this
change an operator could hand it a short, hand-typed secret through `OPENTHROTTLE_MCP_AUTH_TOKEN`.
A short secret that already verifies keeps working and stays on bcrypt; it is never rehashed.

**What bcrypt cost on `ot_sa_`.** `GlobalAuthGuard` verifies the bearer on every request. It
caches nothing, so every GraphQL call from the MCP server, the worker and the hooks paid one
`bcrypt.compare`. An unknown prefix compared against a dummy hash, so a forged token paid it too.
Measured on an Apple M1 Max, Node 26.13.1, `bcrypt` 6.0.0:

| Verification                    | Per call | Notes                                                                      |
| ------------------------------- | -------- | -------------------------------------------------------------------------- |
| `bcrypt.compare`, cost 10       | ~81 ms   | 64 concurrent calls took 2.0 s: about 32 per second through the libuv pool |
| SHA-256 + `timingSafeEqual`     | ~1.2 µs  | the chosen scheme                                                          |
| HMAC-SHA256 + `timingSafeEqual` | ~2.6 µs  | the rejected alternative                                                   |

So bcrypt added about 80 ms of latency to every service-account request. Worse, it was a
cheap way to take the server down. bcrypt runs on libuv's four-thread pool, the same pool `fs`,
`dns.lookup`, `zlib` and async `crypto` use. About 32 forged `ot_sa_` requests a second, with no
credential at all, kept that pool full. `@Public()` handlers verify a bearer if one is present, so
even those requests paid the cost.

**Threat model.**

| Attacker holds                  | Plain SHA-256                                                                                                                                                                  | HMAC-SHA256 (server-held key)                                                       | bcrypt          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------- |
| A database read (leak, backup)  | Cannot recover a token: inverting SHA-256 on a 190–256-bit preimage is infeasible                                                                                              | Same                                                                                | Same            |
| A database write                | Can insert a row whose hash it computed and so mint a token. It could already overwrite a `users.password_hash` (bcrypt is just as computable offline) and sign in as an admin | Cannot mint a token, but the `password_hash` route stays open, so nothing is gained | Same as SHA-256 |
| The database and the server env | Everything is lost under any scheme. The env also holds `JWT_SECRET`, which forges any user                                                                                    | Same: the key leaks with the env                                                    | Same            |

HMAC only helps against an attacker who can write to the database, and that attacker already has a
better way in. In return it costs a new secret in every environment (`.env`, compose, the GCP and
Hetzner templates, `SECRETS.md`), a rotation story with a key id on every row, and a migration of
every stored hash. No row of the table justifies that, so it was rejected. Revisit it if user
passwords ever leave the `openthrottle` database for an external IdP. Then a database write no
longer reaches an admin session, and the HMAC column gains a reason to exist.

**Migrating existing rows.** `service_account_credentials.secret_hash` holds a bcrypt hash
(`$2…`) for rows minted before this change, and SHA-256 hex for rows minted after. Verification
reads the format. A bcrypt row is checked with bcrypt once, then rewritten to SHA-256 in place, so
each credential pays bcrypt on its first use after deploy and never again. No token is invalidated
and nobody re-mints. An unknown prefix now fails without hashing anything. The prefix is public, so
the database lookup's timing reveals nothing a client did not send.

**CodeQL.** `js/insufficient-password-hash` takes as a source any identifier its password heuristic
matches. That heuristic includes the substring `oauth` as well as `pass(word|code|phrase)` and
`api_key`/`api_tok`. Its sink is any `crypto.createHash` _or_ `crypto.createHmac` call, so HMAC
would not have silenced it. The `ot_sa_` code path names its values `secret` and `token`, which
fall in the heuristic's `secret` class, not `password`, so it should not be flagged. The OAuth module will be (it was, as alert #19 on PR #869). That
alert is dismissed as a false positive and points here. If it recurs, dismiss it with a link to this
section. Do not rename identifiers to dodge the heuristic.

**Optional auth features (not implemented):**

- **Refresh tokens** — Not implemented. To add: issue a long-lived refresh token (stored server-side or signed opaquely), expose a refresh mutation that accepts it and returns a new access token, and have the frontend use it when the access token expires or returns 401.
- **Cookie-based JWT** — The JWT strategy currently uses `ExtractJwt.fromAuthHeaderAsBearerToken()` only. To support cookies: add a custom extractor (e.g. read from `req.cookies.accessToken` or a named cookie), register it in the JWT strategy options, and ensure CORS is configured with `CORS_CREDENTIALS=true` and the frontend uses `credentials: 'include'`. For security, prefer HttpOnly, SameSite cookies and HTTPS in production.
