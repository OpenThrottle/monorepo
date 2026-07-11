# OpenThrottle VS Code extension: auth and login design

This document describes the login flow and token storage design for the vscode-openthrottle extension so it can work with openthrottle-server’s JWT auth.

## Server auth (openthrottle-server)

- **Mechanism:** JWT. Protected GraphQL resolvers use a global JWT guard; `login` and `register` (and health) are `@Public()`.
- **Login:** GraphQL mutation `login(input: LoginInput!)` with `email` and `password`. Returns `LoginResultObject { accessToken }`.
- **Usage:** Client sends `Authorization: Bearer <accessToken>` on subsequent requests. No cookies required for the extension.

## How users sign in (chosen: server login mutation)

- **Chosen:** **Email/password via GraphQL `login` mutation.** The extension calls the same `login` mutation as the web app. No OAuth or separate “server login page” in a browser; the extension shows its own login UI (e.g. in Welcome or a dedicated Login view) and collects email/password, then calls `login` and stores the returned JWT.
- **Not chosen:**
  - **OAuth:** Would require opening a browser, redirect handling, and server-side or PKCE flow; heavier for an extension and not currently provided by the server.
  - **API key:** Server does not expose API-key auth; only JWT from `login`/`register`.

## Token storage: `vscode.SecretStorage`

- **Where:** Use the VS Code API `context.secrets` (`vscode.SecretStorage`) provided in `ExtensionContext` at activation.
- **Key:** A single key per “session” for the current API base URL, e.g. `openthrottle.token` or `openthrottle.token.${hashOfBaseUrl}` so different servers (e.g. local vs staging) can have different tokens.
- **Value:** The JWT string (`accessToken` from `login`).
- **Lifecycle:**
  - **Store:** After a successful `login` mutation, call `context.secrets.store(key, accessToken)`.
  - **Read:** Before each GraphQL request (or once when building the client), call `context.secrets.get(key)` and pass the token to the client.
  - **Delete:** On “Sign out,” call `context.secrets.delete(key)` and clear in-memory state so the next request is unauthenticated.

Recommendation: use a key that includes a hash of the configured API base URL (e.g. `openthrottle.token.${hash}`) so that changing `openthrottle.apiBaseUrl` doesn’t reuse a token from another environment.

## Passing the token to GraphQL requests

- **Current:** `OpenThrottleApiClient` uses `@openthrottle/nodejs-graphql`’s `executeGraphqlWithAuth('token', ...)`. The literal `'token'` is a placeholder; it does not send a real token and does not use the extension’s `baseUrl` (nodejs-graphql uses `API_URL_INTERNAL`).
- **Required:**
  1. **URL:** The extension must call GraphQL at `getApiBaseUrl() + '/graphql'`. Either:
     - Extend or replace the nodejs-graphql usage so the extension can pass both `baseUrl` and `token`, or
     - Implement a small extension-side `fetch` to `baseUrl + '/graphql'` with `Authorization: Bearer ${token}` and use the same typed documents.
  2. **Token:** The client (or a wrapper) must get the token from `SecretStorage` (async) and pass it as the `Authorization: Bearer <token>` header. If no token is stored, send no `Authorization` header (so server returns 401 for protected operations).

Concrete options:

- **A. Extension-owned fetch:** In the extension, implement `executeGraphql(baseUrl, document, variables, { token })` that uses `fetch(baseUrl + '/graphql', { headers: { Authorization: token ? `Bearer ${token}` : undefined } })`. Then `OpenThrottleApiClient` takes `baseUrl` and a `getToken(): Promise<string | undefined>` (or the extension context) and passes the token on every request. No change to nodejs-graphql’s env-based URL.
- **B. nodejs-graphql with URL + token:** Add an overload or new export in nodejs-graphql that accepts `(url, token, document, variables)` so the extension can pass both URL and token. The extension would still need to read the token from SecretStorage and pass it in.

Recommendation: **A** — keep the extension’s GraphQL calls explicit with `baseUrl` from config and token from SecretStorage, and avoid relying on process env in the extension runtime.

## Handling 401 (unauthenticated)

- When any GraphQL or HTTP call returns **401**, treat the user as unauthenticated:
  - Do not show a raw error in the Plans tree.
  - Clear or ignore the stored token (optional: call `context.secrets.delete(key)` so the next load doesn’t retry with a stale token).
  - Show the login UI (Welcome item or dedicated Login view) so the user can sign in again.
- The client should expose or use a way to detect 401 (e.g. catch `res.status === 401` or a GraphQL error indicating unauthenticated) and trigger the “show login” flow instead of surfacing a generic error.

## Summary

| Decision       | Choice                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------- |
| Sign-in method | Email/password via GraphQL `login` mutation                                                 |
| Token storage  | `vscode.SecretStorage` (context.secrets), key scoped by API base URL                        |
| Token usage    | `Authorization: Bearer <accessToken>` on every GraphQL request                              |
| GraphQL URL    | Extension config `openthrottle.apiBaseUrl` + `/graphql` (extension-owned fetch recommended) |
| 401 handling   | Treat as unauthenticated; show login UI, avoid raw error in tree                            |

This design allows the extension to sign in with the same credentials as the web app, store the JWT securely in VS Code’s secret storage, and send it on all GraphQL requests while handling 401 by showing the login experience instead of an error.
