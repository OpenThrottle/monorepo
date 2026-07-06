# @openthrottle/react-router-graphql — agent notes

GraphQL execution for React Router apps: server-side `executeGraphqlWithAuth` for loaders/actions
(typed documents, bearer auth from the session cookie, timeouts) plus browser-side graphql-ws
client/hooks for subscriptions.

**Consumed by:** `openthrottle-developer`, `@openthrottle/react-router-notifications`.

## Layout

- [src/index.ts](src/index.ts) — `executeGraphqlWithAuth`, `GraphqlAuthError`/`GraphqlTimeoutError` + `isAuthError`/`isTimeoutError` guards, re-export of `executeGraphql`.
- [src/hooks/createGraphqlWsClient.tsx](src/hooks/createGraphqlWsClient.tsx) — browser graphql-ws client; returns `null` during SSR.
- [src/hooks/useSubscription.tsx](src/hooks/useSubscription.tsx) — subscribe-while-mounted hook (no Apollo); pair with a loader snapshot, merge deltas by id.
- [src/hooks/executeWsMutation.tsx](src/hooks/executeWsMutation.tsx) — run a mutation/query over the already-open ws socket (graphql-ws `subscribe`, one `next` + `complete`).

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- **Undeclared workspace deps:** `src/index.ts` imports `@openthrottle/nodejs-graphql` and `@openthrottle/react-router-auth`, but neither is in this `package.json` (nor linked into this package's `node_modules`) — resolution currently rides on consumers. Declare them (`workspace:^`) if you touch these imports or add a consumer.
- Server side requires `API_URL_INTERNAL` in env (e.g. `http://localhost:6021`); the ws client takes an absolute `ws(s)://` URL (typically `API_URL_EXTERNAL` with the ws scheme).
- Error contract: HTTP 401/403 → `GraphqlAuthError`, timeout → `GraphqlTimeoutError` (default 15s, `timeoutMs: 0` disables). Use the `instanceof` guards, never `message.includes(...)` string matching.
- `executeGraphql` makes a single fetch with **no retry** — deliberate for SSR loaders; don't add backoff.
- `createGraphqlWsClient` is lazy by default and meant to be a per-app singleton; `connectionParams` only authenticates the **handshake** — identity is pinned to the connection for its lifetime, so pass an async token provider for reconnects.
- `executeWsMutation` rejects on GraphQL errors or completion without data; it exists for traffic that should ride the open socket (e.g. high-frequency uploads), not as a general HTTP replacement.

## Pointers

- [README.md](README.md) — install note (private workspace package).
