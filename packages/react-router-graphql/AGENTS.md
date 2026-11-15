# @openthrottle/react-router-graphql — agent notes

GraphQL execution for React Router apps: server-side `executeGraphqlWithAuth` for loaders/actions
(typed documents, bearer auth from the session cookie, timeouts) plus browser-side graphql-ws
client/hooks for subscriptions.

**Consumed by:** `openthrottle-developer`, `openthrottle-admin`, `openthrottle-cms`, `@openthrottle/react-router-notifications`.

## Layout

- [src/index.ts](src/index.ts) — `executeGraphqlWithAuth`, `GraphqlAuthError`/`GraphqlTimeoutError` + `isAuthError`/`isTimeoutError` guards, `redirectOnAuthError`, re-export of `executeGraphql`.
- [src/hooks/createGraphqlWsClient.tsx](src/hooks/createGraphqlWsClient.tsx) — browser graphql-ws client; returns `null` during SSR.
- [src/hooks/useSubscription.tsx](src/hooks/useSubscription.tsx) — subscribe-while-mounted hook (no Apollo); pair with a loader snapshot, merge deltas by id.
- [src/hooks/executeWsMutation.tsx](src/hooks/executeWsMutation.tsx) — run a mutation/query over the already-open ws socket (graphql-ws `subscribe`, one `next` + `complete`).

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- Server side requires `API_URL_INTERNAL` in env (e.g. `http://localhost:6021`); the ws client takes an absolute `ws(s)://` URL (typically `API_URL_EXTERNAL` with the ws scheme).
- **Error contract.** openthrottle-server answers a missing, invalid or revoked token with **HTTP 200** and `errors[0].extensions.code === 'UNAUTHENTICATED'`, so that code (read from `GraphqlResponseError.extensions`, never the message) is the main path to `GraphqlAuthError` (recorded as `httpStatus` 401); an HTTP 401/403 also maps to it. `FORBIDDEN` deliberately does **not**: the caller is signed in but not permitted, and a login redirect would loop. Timeout → `GraphqlTimeoutError` (default 15s, `timeoutMs: 0` disables). Use the guards, never `message.includes(...)`.
- **React to an auth error with `redirectOnAuthError(error)`, then `throw error`.** It throws a redirect to `/auth` that clears the auth cookie and returns for anything else. Do not hand-roll `redirect(...)`: every app's `/auth` loader sends a request that still has a token on to the dashboard, so a redirect that leaves the cookie loops. In a loader that returns deferred promises, those still need `markDeferredHandled` — see [openthrottle-developer AGENTS.md](../../applications/openthrottle-developer/AGENTS.md) § Invariants.
- `executeGraphql` makes a single fetch with **no retry** — deliberate for SSR loaders; don't add backoff.
- `createGraphqlWsClient` is lazy by default and meant to be a per-app singleton; `connectionParams` only authenticates the **handshake** — identity is pinned to the connection for its lifetime, so pass an async token provider for reconnects.
- `executeWsMutation` rejects on GraphQL errors or completion without data; it exists for traffic that should ride the open socket (e.g. high-frequency uploads), not as a general HTTP replacement.

## Pointers

- [README.md](README.md) — install note (private workspace package).
