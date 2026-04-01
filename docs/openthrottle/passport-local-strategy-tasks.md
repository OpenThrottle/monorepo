# Passport Local Strategy — Task Breakdown

This document breaks down the implementation of the Passport local strategy for authentication (Cortex plan `84bf03c3-81d8-43e1-8b2d-0a2026a1e798`). Reference: [openthrottle-server-auth.md](./openthrottle-server-auth.md).

## Context

- **Current state:** `AuthService.login(email, _password)` accepts any credentials and signs a JWT with `sub: email`. No user store validation.
- **Target:** Validate credentials against Cortex `users` table via a Passport local strategy; sign JWT only for validated users with `sub: user.id`.
- **Stack:** openthrottle-server (NestJS, GraphQL), `@openthrottle/nestjs-repositories` (UsersService, User entity), `@openthrottle/nestjs-auth` (JWT strategy, guards). Cortex DB already has a `users` table (migration 026) with `id`, `email` (nullable), `github_username`; no password column yet.

## Detailed Tasks (for Cortex)

Add these as child tasks of plan `84bf03c3-81d8-43e1-8b2d-0a2026a1e798` via Cortex MCP (mcp-developer) `create_task`.

1. **Cortex DB: Add password_hash and email uniqueness for local auth**
   - Add migration in `databases/cortex/migrations/`: column `password_hash` (TEXT, nullable so existing users without passwords remain valid). Add unique index on `email` where email IS NOT NULL so local-auth users have a unique email. Document in Cortex README.

2. **@openthrottle/nestjs-repositories: User entity and UsersService for local auth**
   - Add `passwordHash` to User entity (and UserData). Add `findByEmail(email: string): Promise<User | null>` to UsersService. Add a password verification helper (e.g. `verifyPassword(plainPassword, passwordHash): Promise<boolean>`) using bcrypt; do not store plain passwords. Add bcrypt (and types) as dependency of the package or openthrottle-server where hashing is used.

3. **Add passport-local and implement LocalStrategy in openthrottle-server**
   - Add dependency `passport-local` (and `@types/passport-local`) to openthrottle-server. Create a Passport LocalStrategy (e.g. `applications/openthrottle-server/src/graphql/auth/local.strategy.ts`) that injects UsersService, uses `usernameField: 'email'` (Passport local defaults to `username`; map GraphQL input to request or use custom validation). Validate by finding user by email and comparing password with bcrypt; return user or throw UnauthorizedException. Register the strategy in AuthGraphqlModule (PassportModule is already in NestjsAuthModule; ensure local strategy is registered in the app).

4. **Wire login mutation to LocalStrategy and pass GraphQL credentials**
   - Passport local strategy reads credentials from `req.body.username` / `req.body.password` by default. GraphQL login receives `input: LoginInput` (email, password) as resolver args. Either: (a) in the login resolver, set `req.body = { username: input.email, password: input.password }` (or use `usernameField: 'email'` and set `email` on body) before invoking a guard that runs the local strategy, or (b) use a custom guard that runs the local strategy with credentials from GraphQL context. Apply that guard to the login mutation so that on success `request.user` is the validated User. Then have AuthService accept the validated user and sign JWT only for that user.

5. **AuthService: Sign JWT only for validated user; use sub: user.id**
   - Change `AuthService.login` to accept the validated `User` (from request or resolver) instead of (email, password). Sign JWT payload `{ sub: user.id, email: user.email ?? undefined }` (and optional roles if needed). Remove "accept any" logic. Invalid credentials are handled by the local strategy (UnauthorizedException); AuthService no longer validates credentials.

6. **Auth resolver: Call login with validated user**
   - Update auth resolver so that after the local-strategy guard runs, the resolver passes `request.user` to `AuthService.login(user)`. Keep login mutation public (`@Public()`). Ensure the guard runs before the resolver body so that only valid credentials reach AuthService.

7. **Tests for local strategy and auth flow**
   - Unit test LocalStrategy (mock UsersService and bcrypt; assert correct user returned or UnauthorizedException). Unit test AuthService.login(user) (assert JWT payload contains sub: user.id). Update or add auth resolver test: assert that valid credentials return a token and invalid credentials return Unauthorized. Update any tests that relied on "accept any" behavior.

8. **Update auth documentation**
   - Update `docs/openthrottle/openthrottle-server-auth.md`: document Passport local strategy, Cortex users table (password_hash, email uniqueness), JWT payload (sub: user.id), and that login requires a user in Cortex with email and password_hash set.

## Optional follow-up

- **User registration:** Add a GraphQL mutation (or REST) to create a user with email + password (hash with bcrypt, persist via UsersService). Consider rate limiting and email uniqueness.
- **Password reset:** Out of scope for this plan; can be a separate plan.

## File reference

| Area                   | Path                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Auth doc               | `docs/openthrottle/openthrottle-server-auth.md`                                                                  |
| Cortex users migration | `databases/cortex/migrations/026_create_users_table.sql`                                                         |
| New migration          | `databases/cortex/migrations/031_add_users_password_hash.sql` (or next number)                                   |
| User entity            | `packages/cortex/nestjs-repositories/src/modules/users/user.entity.ts`                                           |
| UsersService           | `packages/cortex/nestjs-repositories/src/modules/users/users.service.ts`                                         |
| Auth module            | `applications/openthrottle-server/src/graphql/auth/` (auth.service.ts, auth.resolver.ts, auth-graphql.module.ts) |
| JWT strategy           | `packages/mattscholta/nestjs-auth/src/strategies/jwt.strategy.ts`                                                |
