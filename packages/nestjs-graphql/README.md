# @openthrottle/nestjs-graphql

A GraphQL module for NestJS applications. This package provides GraphQL support using Apollo Server, allowing you to build GraphQL APIs with NestJS using code-first or schema-first approaches.

## Cache plugins (opt-in)

Use `NestjsGraphqlModule.forRoot({ cachePlugins: { ... } })` to enable Apollo Cache-Control and response-cache plugins. Omit `cachePlugins` for default behavior (no caching).

- **cachePlugins.cacheControl** — enable or configure `ApolloServerPluginCacheControl`.
- **cachePlugins.responseCache** — enable or configure the response-cache plugin (e.g. `sessionId` from request headers). When set to `true`, `sessionId` defaults to the `authorization` header.

Re-exported helpers: `ApolloServerPluginCacheControl`, `createResponseCachePlugin`, and their option types from the package entrypoint.

### Cache hints: `@CacheHint` or `setCacheHint`

Two ways to hint a field, one code path: the decorator stores the hint in the field's `extensions`, and a plugin hands it to `setCacheHint` while the field resolves, so both behave identically (including the no-op when the cache-control plugin is absent).

- **`@CacheHint({ maxAge, scope })`** — the hint is known when you write the field (the common case). No `@Info()` parameter needed.
- **`setCacheHint(info, { maxAge, scope })`** — the hint is computed while resolving (from the result, or from the user).

```ts
@Query(() => DiscoverLocalModelsResult)
@CacheHint({ maxAge: 60, scope: 'PRIVATE' })
discoverLocalModels(): Promise<DiscoverLocalModelsResult> { ... }
```

- **Object-typed child fields default to `maxAge: 0`, so each one needs its own hint.** Put `@CacheHint` on the object type's `@Field` property or on the `@ResolveField` method that resolves it. Since `@nestjs/graphql` 14.2 a `@ResolveField` hint applies even when the object type also declares that `@Field` (the resolver method's extensions win); earlier versions dropped it. Scalar fields inherit their parent's hint and need none.
- **Nothing applies without `cachePlugins.cacheControl`.** That option registers both Apollo's cache-control plugin and the plugin that reads `@CacheHint`.

### ⚠️ One un-hinted field makes a whole operation uncacheable

`cacheControl: true` means `ApolloServerPluginCacheControl({})`, whose `defaultMaxAge` is **0**, and Apollo derives an operation's cache policy from its **most restrictive field**. So a single root or object-typed field without a hint drops the entire response to `maxAge 0`, and the response-cache plugin refuses to store it — with no error and no warning. The only visible symptom is a query that is always slow.

Two consequences worth internalising:

1. **Every field in a cacheable document must be hinted.** Reference implementation: `GithubResolver` in `@openthrottle/nestjs-github`, where each `@Query` carries `@CacheHint(...)` with a shared constant from `graphql.constants.ts`. Its test suite builds the schema with `GraphQLSchemaFactory` and asserts every `Query` field's `extensions` carry a positive `maxAge`, so a new un-hinted query fails CI.
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
