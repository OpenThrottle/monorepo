# @openthrottle/nestjs-rbac

NestJS RBAC and CORS utilities. For step-by-step wiring of this package together with **@openthrottle/nestjs-auth** into a NestJS app (e.g. openthrottle-server), see [docs/nestjs/wiring-auth-rbac.md](../../../docs/nestjs/wiring-auth-rbac.md).

## RBAC roles and permissions

Roles and permissions are defined in the package and used by guards (see task “Implement permission/role guards and decorators”). The static mapping in `src/roles/roles.utils.ts` (`ROLE_PERMISSIONS`) is a **default / seed table ONLY** — it is the built-in default for this package's JWT-claim-based guards and a reference for apps with no database. It is **not** the production source of truth for apps with a DB-backed authorization model (e.g. openthrottle-server, which resolves permissions via `RolesRepository`). Apps override or extend it by loading roles/permissions from their own DB and passing a custom mapping to the guards / `roleHasPermission`.

> The tables below mirror `ROLE_PERMISSIONS` in `src/roles/roles.utils.ts`. Keep the two in sync.

### Roles

| Role          | Description                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `admin`       | Full settings + users access.                                                                         |
| `user`        | Read/write settings, read users.                                                                      |
| `viewer`      | Read-only (settings and users).                                                                       |
| `mcp`         | Read/write plans, draft blog posts, search code, manage its own scheduled jobs (MCP service account). |
| `plan-runner` | Read/write plans (plan-run worker account).                                                           |

### Permissions

| Permission        | Description                                                                       |
| ----------------- | --------------------------------------------------------------------------------- |
| `blog:draft`      | Create/edit DRAFT blog posts; read all blog posts, tags and authors.              |
| `blog:write`      | Publish/unpublish/archive posts; edit non-draft posts; manage authors and tags.   |
| `cms:write`       | Create/update/delete cms content: fragments, their edges, layouts, components.    |
| `code:read`       | Search a registered repository's indexed code and read its index status.          |
| `flags:read`      | Read feature flags.                                                               |
| `flags:write`     | Create/update/delete flags.                                                       |
| `plans:read`      | Read plans.                                                                       |
| `plans:write`     | Create/update/delete plans.                                                       |
| `schedules:read`  | List the caller's scheduled agent jobs through the agent (`…AsAgent`) operations. |
| `schedules:write` | Create/update/delete/run-now scheduled agent jobs through the agent operations.   |
| `settings:read`   | Read app settings.                                                                |
| `settings:write`  | Change app settings.                                                              |
| `users:read`      | Read user list/details.                                                           |
| `users:write`     | Create/update/delete users.                                                       |

### Mapping (role → permissions)

- **admin:** every defined permission (full superset — derived from `PERMISSIONS`, so new permissions are granted automatically)
- **user:** `code:read`, `flags:read`, `schedules:read`, `schedules:write`, `settings:read`, `settings:write`, `users:read`
- **viewer:** `code:read`, `flags:read`, `schedules:read`, `settings:read`, `users:read`
- **mcp:** `blog:draft`, `code:read`, `plans:read`, `plans:write`, `schedules:read`, `schedules:write`
- **plan-runner:** `plans:read`, `plans:write`

Usage (for guards and app code):

```ts
import {
  ROLES,
  PERMISSIONS,
  roleHasPermission,
  ROLE_PERMISSIONS,
} from '@openthrottle/nestjs-rbac';

// Check if a role has a permission (uses built-in ROLE_PERMISSIONS)
roleHasPermission(ROLES.ADMIN, PERMISSIONS.USERS_WRITE); // true

// Custom mapping (e.g. from DB) can be passed as third argument
roleHasPermission(role, permission, customRolePermissions);
```

### Guards and decorators

> [!CAUTION]
> **`RolesGuard` and `PermissionsGuard` are JWT-claim-based.** They authorize using `request.user.roles`
> — a client-asserted JWT claim fixed at token-mint time — resolved against the static `ROLE_PERMISSIONS`
> map. They do **not** consult any server-side source of truth. If roles are mutable server-side
> (revoked/changed after a token is issued) or the `roles` claim is otherwise untrusted, these guards are
> a **privilege-escalation hazard**: a stale or forged claim grants access until the token expires.
>
> **MUST NOT be used where roles/permissions are managed in a database or are otherwise mutable after token
> issuance.** They are only safe for apps whose authorization model is genuinely "JWT claim + static map"
> with immutable roles for a token's lifetime.
>
> In **openthrottle-server** these guards are deliberately **not** used. The canonical enforcer is
> `GqlPermissionsGuard` (`applications/openthrottle-server/src/guards/gql-permissions.guard.ts`), which
> resolves permissions from the DB via `RolesRepository.getPermissionsForUser` /
> `getPermissionsForServiceAccount`. Wire any new HTTP/GraphQL authorization through a DB-backed enforcer
> like that, not through these package guards.

Use `@Roles()` and `@Permissions()` with `RolesGuard` and `PermissionsGuard` to enforce RBAC on route handlers. **Place an auth guard (e.g. `JwtAuthGuard`) before the RBAC guards** so `request.user` is set.

```ts
import { JwtAuthGuard } from '@openthrottle/nestjs-auth';
import {
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  ROLES,
  Roles,
  RolesGuard,
} from '@openthrottle/nestjs-rbac';

// Require admin role
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
@Get('admin-only')
adminOnly() { return { ok: true }; }

// Require permission (derived from user's role)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.USERS_WRITE)
@Post('users')
createUser() { ... }
```

The authenticated user must have `roles?: string[]` on `request.user` (e.g. from JWT payload or `validate()` in your auth strategy).

## CORS

Use the CORS config in your `main.ts`:

```ts
import { getCorsOptions } from '@openthrottle/nestjs-rbac';

// In bootstrap():
app.enableCors(getCorsOptions());
```

Environment variables (all optional):

- **CORS_ORIGINS** – Comma-separated allowed origins; omit or `*` for allow-all. Allow-all is refused when `NODE_ENV=production` unless `CORS_ALLOW_ALL_ORIGINS=true`.
- **CORS_CREDENTIALS** – `true` or `false`. When unset, defaults to `true` if an explicit `CORS_ORIGINS` allowlist is provided, and `false` when the origin is allow-all (omitted/empty/`*`). `CORS_CREDENTIALS=true` with an allow-all origin is refused in every environment, because it would let any site make credentialed requests.
- **CORS_ALLOW_ALL_ORIGINS** – `true` to permit an allow-all origin in production (credentials stay off).

`getCorsOptions()` throws on a refused combination, so the server fails at boot rather than starting with an unsafe policy.

- **CORS_ALLOWED_METHODS** – Comma-separated HTTP methods; defaults to `GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS`.

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-rbac
```

**npm:**

```bash
npm install @openthrottle/nestjs-rbac
```
