# @openthrottle/nestjs-graphql

A GraphQL module for NestJS applications. This package provides GraphQL support using Apollo Server, allowing you to build GraphQL APIs with NestJS using code-first or schema-first approaches.

## Cache plugins (opt-in)

Use `NestjsGraphqlModule.forRoot({ cachePlugins: { ... } })` to enable Apollo Cache-Control and response-cache plugins. Omit `cachePlugins` for default behavior (no caching).

- **cachePlugins.cacheControl** — enable or configure `ApolloServerPluginCacheControl`.
- **cachePlugins.responseCache** — enable or configure the response-cache plugin (e.g. `sessionId` from request headers). When set to `true`, `sessionId` defaults to the `authorization` header.

Re-exported helpers: `ApolloServerPluginCacheControl`, `createResponseCachePlugin`, and their option types from the package entrypoint.

### ⚠️ One un-hinted field makes a whole operation uncacheable

`cacheControl: true` means `ApolloServerPluginCacheControl({})`, whose `defaultMaxAge` is **0**, and Apollo derives an operation's cache policy from its **most restrictive field**. So a single field that never calls `setCacheHint` drops the entire response to `maxAge 0`, and the response-cache plugin refuses to store it — with no error and no warning. The only visible symptom is a query that is always slow.

Two consequences worth internalising:

1. **Every field in a cacheable document must be hinted.** Reference implementation: `GithubResolver` in `@openthrottle/nestjs-github`, where each `@Query` takes `@Info()` and calls a local `setCacheHint(info, maxAge)` helper. Its test suite enumerates the resolver prototype and asserts every query sets a positive `maxAge`, so a new un-hinted query fails CI.
2. **A short hint is as contagious as a missing one.** Because the policy is a minimum, selecting a 30s field alongside an expensive 1h field caps the whole operation at 30s. Keep short-lived fields (env flags, liveness booleans) in their own documents rather than bundling them with expensive ones.

To check a response's actual policy, read the `Cache-Control` response header: an uncacheable operation returns `no-store`, a cacheable one returns e.g. `max-age=3600, public` (plus `age` once served from cache).

**Why there is no global `defaultMaxAge`:** setting one would make every operation cacheable by default, silently caching responses whose authors never opted in (plans, tasks, queue stats) and trading a performance bug for a staleness bug. Caching stays opt-in per field, on purpose.

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-graphql
```

**npm:**

```bash
npm install @openthrottle/nestjs-graphql
```
