# OpenThrottle server auth (NestJS + Passport)

This document describes the auth setup on **openthrottle-server**: Passport local strategy for credential validation, Cortex DB as user store, JWT issuance, and optional features. For generic wiring of nestjs-auth and nestjs-rbac, see [docs/nestjs/wiring-auth-rbac.md](../nestjs/wiring-auth-rbac.md).

---

## Current auth state

### What exists today

- **User store (Cortex)** — Users live in the Cortex DB `users` table (`databases/migrations`: `026_create_users_table.sql`, `031_add_users_password_hash_and_email_unique.sql`, `033_add_users_disabled_at.sql`). The table has `email` (unique when set), `password_hash` (bcrypt), `github_username`, and optional `disabled_at`. When `disabled_at` is set, the user is disabled and login is rejected (LocalStrategy throws `UnauthorizedException('Account is disabled')`). **UsersService** (`@openthrottle/nestjs-repositories`) provides `findByEmail`, `validatePassword`, `hashPassword`, `create`, `update`, `disable`, and `enable`; the Passport local strategy uses these for login.

- **NestjsAuthModule** (`@openthrottle/nestjs-auth`) — Registered in `AppModule` via `NestjsAuthModule.forRoot()`. Provides:
  - **JWT strategy** (`packages/nestjs-auth/src/strategies/jwt.strategy.ts`): Passport strategy that validates JWTs from the `Authorization: Bearer <token>` header. Uses `JWT_SECRET` (required) and optional `JWT_ISSUER` from env. Algorithm HS256; token extracted via `ExtractJwt.fromAuthHeaderAsBearerToken()`. The validated payload (including `sub` as user id and optional `email`) is attached to `request.user`; consumers should use `sub` as the stable user id, not email.
  - **JwtAuthGuard** (`packages/nestjs-auth/src/guards/jwt-auth.guard.ts`): Guard that enforces JWT authentication. Use with `@UseGuards(JwtAuthGuard)` on resolvers or controllers, or use the global guard (see below). On success, the validated payload is attached to `request.user`; on failure it throws `UnauthorizedException('JWT authentication required')`.
  - **Global auth guard**: `applications/openthrottle-server/src/app.module.ts` registers `GlobalAuthGuard` as `APP_GUARD`. It skips auth when a handler or class is marked `@Public()` (e.g. login, register, health). Bearer `ot_sa_<prefix>_<secret>` are validated first via `ServiceAccountAuthService`; otherwise it delegates to `JwtAuthGuard`. Login, register, and health endpoints are marked `@Public()`.
  - **Service account tokens**: Long-lived automation credentials (`service_accounts`, `service_account_credentials`, `service_account_roles`). Format `Authorization: Bearer ot_sa_<prefix>_<secret>`. Bootstrap with `pnpm run database:bootstrap-service-accounts`; see `packages/openthrottle-mcp/docs/AUTH.md`.
  - **NestjsAuthModule** registration: `applications/openthrottle-server/src/app.module.ts` (imports `NestjsAuthModule.forRoot()`).

- **AuthGraphqlModule** — GraphQL auth surface in openthrottle-server:
  - **Module**: `applications/openthrottle-server/src/graphql/auth/auth-graphql.module.ts`. Registers `JwtModule` with the same `JWT_SECRET` and optional `JWT_ISSUER` (and `expiresIn: 24h`), plus PassportModule and LocalStrategy. Local strategy validates email/password against Cortex users.
  - **Login mutation**: `applications/openthrottle-server/src/graphql/auth/auth.resolver.ts` — public `login(input: LoginInput)` mutation. Input: `LoginInput` (email, password); output: `LoginResultObject` with `accessToken`. Uses `GqlLocalCredentialsGuard` + `AuthGuard('local')` so LocalStrategy runs and sets `request.user`; AuthService then signs a JWT with `sub: user.id`.
  - **Register mutation**: Same resolver — public `register(input: RegisterInput)` mutation. Input: `RegisterInput` (email, password, optional githubUsername); output: `RegisterResultObject` (id, email, accessToken). AuthService hashes the password with bcrypt (via UsersService.hashPassword), creates the user in Cortex, and returns the new user plus a JWT so the client can stay logged in. Duplicate email returns `ConflictException`.
  - **AuthService** (`applications/openthrottle-server/src/graphql/auth/auth.service.ts`): `login(user)` signs a JWT for a validated user (from LocalStrategy). `register(input)` creates a user (email unique, password hashed) and returns id, email, and accessToken. Credential validation is done by the Passport local strategy; the token uses `sub` as the stable user id.
  - **Supporting types**: `login.input.ts`, `login-result.object.ts`, `register.input.ts`, `register-result.object.ts`; **LocalStrategy** in `strategies/local.strategy.ts`; **GqlLocalCredentialsGuard** copies GraphQL args onto the request body for Passport.

- **CORS** — Configured in `applications/openthrottle-server/src/main.ts` via `app.enableCors(getCorsOptions())` from `@openthrottle/nestjs-rbac`. Allowed origins, credentials, and methods come from env (see [docs/nestjs/wiring-auth-rbac.md](../nestjs/wiring-auth-rbac.md) and env table below).

### Environment variables

No new env is required beyond the JWT variables below. Password hashing uses bcrypt with a fixed default (10 rounds) in `@openthrottle/nestjs-repositories`; to make rounds configurable you could add `BCRYPT_ROUNDS` and pass it into `UsersService.hashPassword`.

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

**Current state:** A **global auth guard** is applied: `GlobalAuthGuard` is registered as `APP_GUARD` in `app.module.ts`. It checks for `@Public()` (via `IS_PUBLIC_KEY`) on the handler or class; when set, it skips auth. Non-public routes require either a valid service-account bearer (`ot_sa_…`) or a human JWT. `GqlPermissionsGuard` enforces `@Permissions()` for both principal kinds using `RolesService.getPermissionsForUser` or `getPermissionsForServiceAccount`.

1. **Public operations**
   - **Login:** The `login` mutation and `AuthResolver` are marked `@Public()`. File: `applications/openthrottle-server/src/graphql/auth/auth.resolver.ts`.
   - **Register:** The `register` mutation is on the same resolver and is public (no JWT required to create an account).
   - **Health:** The health GraphQL resolver (`HealthResolver`) and REST controller (`HealthController`, `GET /health`) are marked `@Public()` so health checks do not require a token.

2. **Consumers and `sub` as user id**
   - The JWT payload uses `sub` as the **user id** (UUID from Cortex users), not email. Use `@CurrentUser()` from `@openthrottle/nestjs-auth` to get the payload; use `@CurrentUser('sub')` for the user id. Do not rely on `sub` as email.

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

**Roles and permissions (DB-backed):** Roles and permissions are stored in Cortex (`permissions`, `roles`, `role_permissions`, `user_roles`, `service_account_roles`). Migration `034_create_roles_and_permissions_tables.sql` seeds default permissions (`settings:read`, `settings:write`, `users:read`, `users:write`) and roles (`admin`, `user`, `viewer`) with the same mapping as `@openthrottle/nestjs-rbac`. Migration `045_seed_service_accounts_bootstrap.sql` adds `plans:read` / `plans:write`, automation roles `mcp` and `workflow-ralph`, and service accounts `openthrottle-mcp` and `workflow-ralph`. Resolvers using `@Permissions()` are protected by `GqlPermissionsGuard`, which resolves the authenticated `AuthPrincipal` on `request.user` and loads permissions via `RolesService.getPermissionsForUser` (human JWT) or `RolesService.getPermissionsForServiceAccount` (Bearer `ot_sa_…`). **Human bootstrap:** After migrations, no user has any role. Assign `admin` via SQL or admin GraphQL once a first admin exists. **Service account bootstrap:** Run `pnpm run database:bootstrap-service-accounts` to mint `ot_sa_…` tokens for `OPENTHROTTLE_MCP_AUTH_TOKEN` and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` (see `databases/README.md` and `packages/openthrottle-mcp/docs/AUTH.md`).

**Optional auth features (not implemented):**

- **Refresh tokens** — Not implemented. To add: issue a long-lived refresh token (stored server-side or signed opaquely), expose a refresh mutation that accepts it and returns a new access token, and have the frontend use it when the access token expires or returns 401.
- **Cookie-based JWT** — The JWT strategy currently uses `ExtractJwt.fromAuthHeaderAsBearerToken()` only. To support cookies: add a custom extractor (e.g. read from `req.cookies.accessToken` or a named cookie), register it in the JWT strategy options, and ensure CORS is configured with `CORS_CREDENTIALS=true` and the frontend uses `credentials: 'include'`. For security, prefer HttpOnly, SameSite cookies and HTTPS in production.
