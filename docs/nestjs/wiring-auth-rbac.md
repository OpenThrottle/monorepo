# Wiring nestjs-auth and nestjs-rbac into a NestJS app

This guide describes how to apply **@openthrottle/nestjs-auth** (Passport JWT, guards) and **@openthrottle/nestjs-rbac** (CORS, RBAC guards/decorators) in a consuming NestJS application (e.g. openthrottle-server, cortex-api).

## 1. Dependencies

Ensure the app depends on both packages (workspace or published):

- `@openthrottle/nestjs-auth`
- `@openthrottle/nestjs-rbac`

In a pnpm workspace, these are typically declared at the root or in the app’s `package.json`. NestJS auth also brings in `@nestjs/config`, `@nestjs/passport`, `passport`, and `passport-jwt`.

## 2. CORS in `main.ts`

Use the CORS config from nestjs-rbac so allowed origins, credentials, and methods are driven by env:

```ts
import { getCorsOptions } from '@openthrottle/nestjs-rbac';
// ...
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(getCorsOptions());
  // ...
}
```

Optional env: `CORS_ORIGINS`, `CORS_CREDENTIALS`, `CORS_ALLOWED_METHODS`. See [nestjs-rbac README](../../packages/mattscholta/nestjs-rbac/README.md#cors).

## 3. Module imports in `AppModule`

Import both modules so auth and RBAC are available app-wide:

```ts
import { NestjsAuthModule } from '@openthrottle/nestjs-auth';
import { NestjsRbacModule } from '@openthrottle/nestjs-rbac';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NestjsAuthModule.forRoot(),   // JWT_SECRET from env; or forRootAsync for custom config
    NestjsRbacModule,
    // ... other modules
  ],
})
export class AppModule {}
```

- **Auth:** `NestjsAuthModule.forRoot()` uses `JWT_SECRET` (and optional `JWT_ISSUER`) from env. Use `forRootAsync` if you load config from `ConfigService` or elsewhere. See [nestjs-auth README](../../packages/mattscholta/nestjs-auth/README.md).
- **RBAC:** `NestjsRbacModule` registers the RBAC service and guards; it does not configure CORS (that is done in `main.ts`).

## 4. Protecting routes with auth and RBAC

Use the auth guard first so `request.user` is set, then RBAC guards and decorators:

```ts
import { JwtAuthGuard } from '@openthrottle/nestjs-auth';
import {
  PermissionsGuard,
  Permissions,
  PERMISSIONS,
  RolesGuard,
  Roles,
  ROLES,
} from '@openthrottle/nestjs-rbac';

// JWT required; then require admin role
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
@Get('admin-only')
adminOnly() { return { ok: true }; }

// JWT required; then require a specific permission
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.USERS_WRITE)
@Post('users')
createUser() { ... }
```

The authenticated user must expose `roles?: string[]` on `request.user` (e.g. from your JWT payload or strategy `validate()`). See [nestjs-rbac README — Guards and decorators](../../packages/mattscholta/nestjs-rbac/README.md#guards-and-decorators).

## 5. Environment variables

| Variable         | Package     | Purpose |
| ---------------- | ----------- | ------- |
| `JWT_SECRET`     | nestjs-auth  | Required for JWT verification. |
| `JWT_ISSUER`     | nestjs-auth  | Optional JWT issuer claim. |
| `CORS_ORIGINS`   | nestjs-rbac  | Optional; comma-separated origins; omit or `*` for allow-all. |
| `CORS_CREDENTIALS` | nestjs-rbac | Optional; `true` / `false`; default `true`. |
| `CORS_ALLOWED_METHODS` | nestjs-rbac | Optional; comma-separated HTTP methods. |

## 6. Example app

**openthrottle-server** is wired as a reference: it enables CORS via `getCorsOptions()` in `main.ts` and imports `NestjsAuthModule` and `NestjsRbacModule` in `AppModule`. It also has an `AuthGraphqlModule` with a public `login` mutation that issues JWTs. For a detailed audit of what exists and what remains (credential validation, protecting resolvers, CORS/env), see [OpenThrottle server auth](../openthrottle/openthrottle-server-auth.md). Set `JWT_SECRET` (and optionally `CORS_ORIGINS`) when running the server if you use protected routes.

## References

- [@openthrottle/nestjs-auth README](../../packages/mattscholta/nestjs-auth/README.md) — Strategy registration, `JwtAuthGuard`, `@CurrentUser()`, `@Public()`, env.
- [@openthrottle/nestjs-rbac README](../../packages/mattscholta/nestjs-rbac/README.md) — Roles, permissions, `RolesGuard`, `PermissionsGuard`, CORS options, env.
