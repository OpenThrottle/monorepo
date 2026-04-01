# @openthrottle/nestjs-rbac

NestJS RBAC and CORS utilities. For step-by-step wiring of this package together with **@openthrottle/nestjs-auth** into a NestJS app (e.g. openthrottle-server), see [docs/nestjs/wiring-auth-rbac.md](../../../docs/nestjs/wiring-auth-rbac.md).

## RBAC roles and permissions

Roles and permissions are defined in the package and used by guards (see task “Implement permission/role guards and decorators”). The model is **stored in package config** (constants in `src/roles.ts`); there is no database in this package. Apps can override or extend the mapping via guard options or by loading roles/permissions from their own DB and passing a custom mapping to the guards.

### Roles

| Role     | Description                        |
| -------- | ---------------------------------- |
| `admin`  | Full access (all permissions).     |
| `user`   | Read access to settings and users. |
| `viewer` | Read-only (settings and users).    |

### Permissions

| Permission       | Description                 |
| ---------------- | --------------------------- |
| `settings:read`  | Read app settings.          |
| `settings:write` | Change app settings.        |
| `users:read`     | Read user list/details.     |
| `users:write`    | Create/update/delete users. |

### Mapping (role → permissions)

- **admin:** `settings:read`, `settings:write`, `users:read`, `users:write`
- **user:** `settings:read`, `users:read`
- **viewer:** `settings:read`, `users:read`

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

- **CORS_ORIGINS** – Comma-separated allowed origins; omit or `*` for allow-all.
- **CORS_CREDENTIALS** – `true` or `false`; defaults to `true`.
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

**yarn:**

```bash
yarn add @openthrottle/nestjs-rbac
```
