# @openthrottle/nestjs-auth

Authentication module for NestJS applications using Passport JWT. This package provides JWT authentication via `@nestjs/passport`, strategy registration, guards, and decorators.

**Resources:**

- https://docs.nestjs.com/security/authentication

## Installation

```bash
pnpm add @openthrottle/nestjs-auth
```

## Usage

### 1. Register the module

```ts
// app.module.ts
import { NestjsAuthModule } from '@openthrottle/nestjs-auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NestjsAuthModule.forRoot(), // Uses JWT_SECRET from env
    // Or with options:
    // NestjsAuthModule.forRoot({ jwtSecret: 'your-secret', jwtIssuer: 'my-app' }),
  ],
})
export class AppModule {}
```

### 2. Protect routes with JwtAuthGuard

```ts
import { JwtAuthGuard } from '@openthrottle/nestjs-auth';

@Controller('api')
export class ApiController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
```

### 3. Strategy registration

The module registers the `jwt` strategy with Passport. The validated user is attached to `request.user`. NestJS RBAC guards (e.g. from `@openthrottle/nestjs-rbac`) can read `request.user` to enforce role/permission checks.

> **Security — `validate` is signature-trust by default.** The built-in `JwtStrategy.validate` returns the decoded payload unchanged; it does **not** check whether `sub` still exists or is active, so a structurally-valid, unexpired token for a since-deleted/disabled/revoked user authenticates until expiry. Production consumers should subclass `JwtStrategy` and override `validate` to look up the subject and reject inactive principals. See the JSDoc on `JwtStrategy.validate` for an example.

### Package resolution (source-first + built `exports`)

This package follows the repo-wide `@openthrottle/nestjs-*` convention and intentionally carries a **dual mapping**:

- `main` / `module` / `types` point at `./src/index.ts` — in-repo consumers (Vite / ts) transpile the TypeScript source directly, so no build step is required for local integration.
- `exports` points at `./dist/...` — the published / Node `require`-resolved entry, produced by the `build` target.

This is deliberate and consistent across all sibling `nestjs-*` packages; do not "fix" it by dropping one mapping. Use `lint` / `typecheck` / `typecheck-tests` / `test` to validate, and a consumer app (e.g. `openthrottle-server`) as the integration check.

### 4. Environment variables

| Variable     | Purpose                                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET` | Required. Secret for JWT verification. Must be at least 32 bytes (HS256); shorter secrets are rejected at startup to prevent offline brute-forcing. |
| `JWT_ISSUER` | Optional. JWT issuer claim.                                                                                                                         |

### Exports

- `NestjsAuthModule` — Dynamic module (forRoot, forRootAsync)
- `JwtAuthGuard` — Guard for JWT-protected routes
- `JwtStrategy` — Passport JWT strategy
- `CurrentUser` — Param decorator to get the authenticated user
- `Public` — Decorator to skip JWT for specific routes. Honored by `JwtAuthGuard` (and any guard that checks `IS_PUBLIC_KEY` via `Reflector`); a route or controller marked `@Public()` short-circuits and skips authentication.
- `JwtPayload` — Payload shape; extend via module augmentation
