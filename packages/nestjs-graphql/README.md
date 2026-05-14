# @openthrottle/nestjs-graphql

A GraphQL module for NestJS applications. This package provides GraphQL support using Apollo Server, allowing you to build GraphQL APIs with NestJS using code-first or schema-first approaches.

## Cache plugins (opt-in)

Use `NestjsGraphqlModule.forRoot({ cachePlugins: { ... } })` to enable Apollo Cache-Control and response-cache plugins. Omit `cachePlugins` for default behavior (no caching).

- **cachePlugins.cacheControl** — enable or configure `ApolloServerPluginCacheControl`.
- **cachePlugins.responseCache** — enable or configure the response-cache plugin (e.g. `sessionId` from request headers). When set to `true`, `sessionId` defaults to the `authorization` header.

Re-exported helpers: `ApolloServerPluginCacheControl`, `createResponseCachePlugin`, and their option types from the package entrypoint.

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
