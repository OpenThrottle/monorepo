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

### 4. Environment variables

| Variable     | Purpose                                |
| ------------ | -------------------------------------- |
| `JWT_SECRET` | Required. Secret for JWT verification. |
| `JWT_ISSUER` | Optional. JWT issuer claim.            |

### Exports

- `NestjsAuthModule` — Dynamic module (forRoot, forRootAsync)
- `JwtAuthGuard` — Guard for JWT-protected routes
- `JwtStrategy` — Passport JWT strategy
- `CurrentUser` — Param decorator to get the authenticated user
- `Public` — Decorator to skip JWT for specific routes. Honored by `JwtAuthGuard` (and any guard that checks `IS_PUBLIC_KEY` via `Reflector`); a route or controller marked `@Public()` short-circuits and skips authentication.
- `JwtPayload` — Payload shape; extend via module augmentation
