# @openthrottle/nestjs-graphql — agent notes

NestJS Apollo GraphQL module (`NestjsGraphqlModule.forRoot`) with secure defaults: error
sanitization, query-depth limiting, CSRF prevention, graphql-ws connection auth, pinned landing
page, and opt-in Apollo cache plugins. Also home to `PubSubModule` (subscriptions PubSub engine)
and the subscription topic-name helpers.

**Consumed by:** `openthrottle-server` only (`forRoot` in `app.module.ts`; it overrides
`buildSchemaOptions`, `cachePlugins`, and `context` but not `autoSchemaFile`).

## Layout

- `src/modules/nestjs-graphql.module.ts` — `DEFAULT_DRIVER_CONFIG` + the `buildDriverConfig` /
  `mergeSecureDefaults` merge logic; every default worth knowing has a JSDoc explaining why.
- `src/subscriptions/graphql-ws-auth.ts` — connection-time JWT auth for graphql-ws
  (`connectionParams.authToken`, same HS256 `JWT_SECRET`/`JWT_ISSUER` as HTTP).
- `src/subscriptions/topics.ts` — topic-name builders (`<entity>:<id>:<facet>`); always build
  names here, the in-memory PubSub matches exact strings only.
- `src/pubsub/pubsub.module.ts` — global module providing the `PUB_SUB` singleton (in-memory
  `PubSub`; Redis swap seam documented in its JSDoc).
- `src/config/` — `format-error` (leak-safe `formatError`), cache plugins, depth-limit rule,
  response-cache session id.

## Invariants & gotchas

- **This package owns the `autoSchemaFile: 'schema.gql'` default.** The path is cwd-relative and
  the `openthrottle-server` `dev`/`start` targets run with `cwd` at the project root, so server
  boot writes `applications/openthrottle-server/schema.gql` — the single committed schema file
  (consumer side documented in
  [applications/openthrottle-server/AGENTS.md](../../applications/openthrottle-server/AGENTS.md)).
  Changing this default moves where every consumer's schema lands and breaks the committed-schema
  codegen flow. It appears twice in the module file (`DEFAULT_DRIVER_CONFIG` and a literal inside
  `forRoot`) — keep both in sync.
- `mergeSecureDefaults` deep-merges `subscriptions` and `csrfPrevention` so a caller adding one
  nested field (e.g. a ws `path`) can't silently drop the default graphql-ws `onConnect` auth
  (fail-open). Don't simplify to a shallow spread.
- graphql-ws connections without a valid token are rejected by default (`required: true`); the
  verified user id lives on the connection's `extra`, surfaced to resolvers via the consumer's
  `context` callback — resolvers never read identity from subscription variables.
- Depth limit defaults to 12 (`maxDepth <= 0` disables); introspection is off in production unless
  `GRAPHQL_INTROSPECTION=true`; `formatError` strips extensions/stacktraces and masks unhandled
  errors in production — overriding it re-opens the leak.
- Default response-cache `sessionId` is derived from the verified user id (hashed), not the raw
  Authorization header (`response-cache-session.ts`).
- Built package (`build` via `@nx/js:tsc`, `exports` → `dist/`) — see [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](./README.md) — cache-plugin options and re-exported helpers.
