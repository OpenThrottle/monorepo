# @openthrottle/nestjs-modules

A variety of standard modules for NestJS applications. This package provides common modules including logging (Winston), context management, and other shared functionality for NestJS applications.

## Global CLS (`GlobalClsModule`)

Continuation-local storage for the request: `GlobalClsService` exposes a typed store (`app` from headers, optional `user` after auth). Shared helpers include `GlobalClsUser`, `globalClsUserFromJwtLike`, and `applyGlobalClsUser` / `setUser`. Applications typically populate `user` after Passport/JWT validation (see `openthrottle-server` `GlobalClsAuthHook` and `GlobalJwtAuthGuard`).

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-modules
```

**npm:**

```bash
npm install @openthrottle/nestjs-modules
```
