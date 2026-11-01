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
- `src/schema/emit-code-first-schema.ts` — `emitCodeFirstSchema`: writes a root module's
  `autoSchemaFile` (when set) in Nest preview mode (only `GraphQLModule` initializes; no DB/Redis/HTTP).
- `src/schema/graphql-schema-command.ts` + `src/bin.ts` — the check/write command behind the
  shared `graphql-schema` Nx target (`nx.json` targetDefaults). Nx runs `dist/src/bin.js` with
  node directly (so `--env-file` loads before the app module is imported), passing the app's
  built `--module`, `--project` and `--schema={projectRoot}/schema.gql`. A GraphQL API needs no
  script of its own: it opts in with an empty `"graphql-schema": {}` target (plus
  `"graphql-schema-write": {}` for `codegen-graphql-watch`'s dev-path dependency).

## Invariants & gotchas

- **A boot never writes the schema.** `autoSchemaFile` is `true` (in memory) in every environment, so
  `graphql-schema:write` is the only producer of the committed
  `applications/openthrottle-server/schema.gql` (a boot orders types differently from that command,
  so a boot-written file churned the diff and failed `graphql-schema:check`). The one way to point
  the emit at a file is `GRAPHQL_SCHEMA_FILE` (`src/schema/auto-schema-file.ts`): `forRoot` turns it
  into `autoSchemaFile` when it runs, and only the `graphql-schema` command sets it, BEFORE importing
  the app's root module (an absolute path: the committed schema for `write`, a temp file for `check`).
  Keep that file import-free, and keep `autoSchemaFile` out of `DEFAULT_DRIVER_CONFIG`, so the lookup
  stays lazy.
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
