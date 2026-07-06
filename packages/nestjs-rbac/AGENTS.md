# @openthrottle/nestjs-rbac — agent notes

JWT-claim-based RBAC guards/decorators with a static role→permission map, plus the CORS
options builder NestJS apps use at bootstrap.

**Consumed by:** `openthrottle-server` — `main.ts` calls `app.enableCors(getCorsOptions())`.

## Layout

- `src/roles.ts` — `ROLES`, `PERMISSIONS`, `ROLE_PERMISSIONS`, `roleHasPermission`.
- `src/guards/` + `src/decorators/` — `RolesGuard`/`PermissionsGuard`, `@Roles`/`@Permissions`.
- `src/cors.ts` — `getCorsOptions()`, env-driven CORS config.

## Invariants & gotchas

- Built, not source-first: real `build`/`dev` targets, top-level `exports` → `dist`
  (family pattern — see [../AGENTS.md](../AGENTS.md)).
- The guards trust `request.user.roles` (a JWT claim fixed at mint time) with no
  server-side lookup — a privilege-escalation hazard wherever roles are DB-managed.
  openthrottle-server's canonical enforcer is its own `GqlPermissionsGuard` (DB-backed via
  `RolesService`); never substitute these guards for it.
- `ROLE_PERMISSIONS` is a default/seed table only, not production truth for DB-backed apps;
  guards accept a custom mapping.
- Asymmetric semantics: `@Roles(A, B)` grants on ANY listed role (OR); `@PermissionsGuard`
  requires ALL listed permissions (AND).
- CORS is env-driven: `CORS_ORIGINS`, `CORS_CREDENTIALS`, `CORS_ALLOWED_METHODS`. With an
  allow-all origin, credentials default to **false** (explicit `CORS_CREDENTIALS=true`
  opt-in); with an explicit origin allowlist they default to true. Server CORS behavior
  changes are made here, not in the app's `main.ts`.
- The README's role/permission tables mirror `src/roles.ts` — update both together.

## Pointers

- [README.md](./README.md) — role/permission tables, guard caveats.
- [docs/nestjs/wiring-auth-rbac.md](../../docs/nestjs/wiring-auth-rbac.md) — wiring this
  package with `@openthrottle/nestjs-auth` into an app.
