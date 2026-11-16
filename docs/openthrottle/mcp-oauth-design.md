# MCP OAuth for the public MCP domain — design

OT plan `16f321a7` (task 1). Written against the MCP authorization spec **2026-07-28**
(`modelcontextprotocol.io/specification/latest/basic/authorization`). Implementation lands in the
same plan's later tasks; this file is the decision record they build against.

## The problem, stated precisely

The plan was filed as "the public MCP domain is guarded by one static token". Reading the code,
it is worse than that:

- `packages/openthrottle-mcp/src/http/mcp-http-auth.middleware.ts` runs a request under the
  caller's `Authorization: Bearer …` **when one is present**, and otherwise calls `next()`.
- `getAuthToken()` then falls back to the container's `OPENTHROTTLE_MCP_AUTH_TOKEN` (`ot_sa_…`).

So a request with **no header at all** runs every machine tool as the `openthrottle-mcp` service
account. When `mcp_domain` is set, Caddy (`infra/applications/*/templates/Caddyfile.tpl`) reverse
proxies the world straight onto that. The env token is not a gate; it is an identity handed to
anyone who can reach the port. The only thing keeping this safe today is that `mcp_domain`
defaults to empty.

That changes the ordering: **refusing header-less requests on the public surface is the first
thing to ship**, before any of the OAuth machinery, and it does not wait for clients to migrate.

## Goals and non-goals

Goals:

- A remote client (Claude Code, Cursor, Codex) connects to `https://<mcp_domain>/mcp`, gets a 401,
  discovers OT's authorization server, the human signs in to the developer app and consents, and
  the client receives a token bound to that human, scoped, expiring and individually revocable.
- Tokens are capped at the consenting user's own permissions — never more.
- The compose-internal MCP (docker agents on the compose network, `OT_MCP_PUBLIC_URL` unset)
  keeps working exactly as today.

Non-goals (v1):

- Machine-to-machine `client_credentials` grants. Automation keeps using `ot_sa_` service-account
  credentials, which already have per-account identity and revocation.
- Third-party identity providers. OT's own user store is the only IdP.
- Confidential clients. Every MCP client in scope is a public native/CLI client
  (`token_endpoint_auth_method: "none"`); PKCE is the client-authentication substitute.
- OpenID Connect (no `id_token`, no `userinfo`). RFC 8414 metadata alone satisfies the spec.

## Spec requirements and how we meet each

| Requirement (2026-07-28)                                                   | Level            | Our answer                                                                                    |
| -------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| MCP server implements Protected Resource Metadata (RFC 9728)               | MUST             | MCP serves `/.well-known/oauth-protected-resource` (+ the `/mcp`-suffixed form)               |
| 401 carries `WWW-Authenticate: Bearer resource_metadata=…`                 | MUST             | MCP middleware, public mode                                                                   |
| AS publishes RFC 8414 **or** OIDC discovery                                | MUST             | `GET <issuer>/.well-known/oauth-authorization-server`                                         |
| OAuth 2.1, PKCE                                                            | MUST             | `code` grant only, `S256` only; `plain` and implicit refused                                  |
| Resource Indicators (RFC 8707); token audience-bound to the MCP server     | MUST             | `resource` required on authorize **and** token; stored on the grant; checked on every request |
| Client ID Metadata Documents                                               | SHOULD           | Supported (URL-shaped `client_id`), with the SSRF guard below                                 |
| Dynamic Client Registration (RFC 7591)                                     | MAY (deprecated) | Supported — Cursor and Codex register this way today                                          |
| `iss` in the authorization response (RFC 9207)                             | SHOULD           | Emitted; `authorization_response_iss_parameter_supported: true`                               |
| Invalid/expired token → 401; insufficient scope → 403 `insufficient_scope` | MUST / SHOULD    | Both, from the MCP middleware and as GraphQL errors                                           |
| Tokens never in the query string                                           | MUST             | Bearer header only; the MCP middleware ignores `?access_token`                                |
| `offline_access` not in PRM `scopes_supported`                             | SHOULD NOT       | PRM lists `mcp:read mcp:write` only; refresh tokens are issued regardless                     |

### Clients

The spec's registration priority is: pre-registered → CIMD → DCR. As of this writing Claude Code
implements PRM discovery, PKCE, `resource`, and both CIMD and DCR; Cursor and Codex
(`codex mcp login`) register with DCR. That is why DCR ships even though the spec deprecates it.
These claims come from vendor docs and release notes, not from running each client against OT —
**task 4's gate is verifying each one end to end** before the legacy path goes, and the matrix in
that task records what was actually observed.

## Topology

```
client ──401──▶ https://mcp.example.com/mcp            (MCP server = resource server)
   │              └─ /.well-known/oauth-protected-resource
   │                  { resource, authorization_servers: [issuer], scopes_supported }
   ├──▶ https://api.example.com/.well-known/oauth-authorization-server   (openthrottle-server = AS)
   ├──▶ POST /oauth/register              (DCR)   — or a CIMD URL as client_id
   ├──▶ GET  /oauth/authorize ─302─▶ https://app.example.com/oauth/consent?request=<id>
   │                                     (developer app: sign in if needed, consent)
   │        ◀─302─ redirect_uri?code=…&state=…&iss=…
   ├──▶ POST /oauth/token  (code + code_verifier + resource) → access + refresh
   └──▶ POST /mcp  Authorization: Bearer ot_oat_…
              └─ MCP forwards the same bearer to openthrottle-server /graphql
```

- **The authorization server is `openthrottle-server`.** It owns the user store, the login, RBAC
  and the database; standing up a separate AS would duplicate all of it. Issuer = the API's public
  origin, new env `OT_OAUTH_ISSUER` (e.g. `https://api.example.com`, no trailing slash).
- **The consent UI is the developer app**, because that is where the human's session already
  lives. `/oauth/authorize` validates everything it can _before_ redirecting (see open redirects),
  persists the request, and sends the browser to `OT_OAUTH_CONSENT_URL` (developer origin +
  `/oauth/consent`). The developer app's consent action calls a GraphQL mutation with the human's
  JWT and receives the final redirect URL.
- **The MCP server is the resource server.** New env `OT_MCP_PUBLIC_URL` — its canonical URI,
  e.g. `https://mcp.example.com/mcp`. Setting it is what switches the MCP into **public mode**.

### Why forwarding the bearer to GraphQL is not "token passthrough"

The spec forbids an MCP server from accepting tokens not issued for it, and its security
considerations forbid passing a client's token through to a _third-party_ upstream API (confused
deputy). Here the AS, the MCP server and the GraphQL API are one operator, one database and one
trust domain: the GraphQL API is the MCP server's own backend, not an upstream it happens to call.
The token's audience is the MCP canonical URI, and the GraphQL server accepts an `ot_oat_` token
**only** when its stored `resource` equals a configured `OT_MCP_PUBLIC_URL`. An OAuth token minted
for the MCP is therefore not a general-purpose API credential for anything else, and no token
issued for another resource is ever accepted. The alternative — the MCP validating the token and
then calling GraphQL as its service account "on behalf of" the user — would need an impersonation
channel on the API, which is a larger and riskier surface than an audience check.

## Tokens

**Opaque, hashed, database-backed** — not JWTs. The whole point of the plan is per-token
revocation and a token list; a self-contained JWT would need a denylist to revoke, which is a
database lookup anyway, without the benefit of the token list falling out for free. The existing
`ot_sa_<prefix>_<secret>` scheme is the precedent: a short public prefix for lookup and display,
a secret compared by hash.

| Token              | Format                     | Lifetime                 | Notes                                                                                                 |
| ------------------ | -------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Authorization code | random, single use         | 60 s                     | Bound to client, redirect URI, PKCE challenge, resource, scopes                                       |
| Access token       | `ot_oat_<prefix>_<secret>` | 1 hour                   | Bearer at the MCP and GraphQL                                                                         |
| Refresh token      | `ot_ort_<prefix>_<secret>` | until the grant expires  | **Rotated on every use**; reuse of a rotated refresh token revokes the whole grant (OAuth 2.1 §4.3.1) |
| Grant              | DB row                     | **30 days** from consent | Matches the T3 reference. Refresh never extends it; re-consent does                                   |

Hashing: SHA-256 of the secret (these are 256-bit random values, so a slow KDF buys nothing and
costs a bcrypt per request). Comparison is constant-time.

## Scopes and RBAC

Two scopes, advertised in PRM `scopes_supported` and AS metadata:

- `mcp:read` — every query.
- `mcp:write` — mutations. Implies `mcp:read` (the spec requires servers to honour scope
  hierarchies).

**The token never carries permissions of its own.** An `ot_oat_` token resolves to the consenting
_user's_ principal, so every existing `@Permissions()` check and every authenticated-only
mutation behaves exactly as it does for that user's JWT. Scopes can only _subtract_:

1. **Server-side (the real guard).** `GlobalAuthGuard` gains an `ot_oat_` branch beside `ot_sa_`.
   A principal whose granted scopes lack `mcp:write` is refused any GraphQL **mutation** with
   `FORBIDDEN` / `reason: INSUFFICIENT_SCOPE`. This holds regardless of what the MCP server does.
2. **MCP-side (spec-shaped UX).** On `tools/call`, a Nest guard on the MCP controller
   (`McpWriteScopeGuard`, after body parsing) compares the tool's read/write classification
   with the token's scopes and answers HTTP 403 with
   `WWW-Authenticate: Bearer error="insufficient_scope", scope="mcp:write", resource_metadata=…`
   so clients can run the step-up flow instead of surfacing a GraphQL error string. The
   classification is an explicit read-only list (`packages/openthrottle-mcp/src/config/tool-access.ts`);
   **unlisted tools are treated as write**, so a forgotten entry fails closed, and a test fails
   when a `get_`/`list_` tool is missing or a listed name no longer exists. It is not emitted as
   the MCP `readOnlyHint` annotation, so the model-facing tool surface is unchanged. The MCP
   learns an opaque token's scopes from the `viewerOAuthScopes` query (authenticated by the
   token itself), cached 30 s per token hash; a failed lookup fails open to the API's check.

The consent screen offers exactly the requested scopes and lets the user narrow them (approving
read-only is one click); it does not try to pre-judge what the user's roles allow, because the
RBAC checks above already cap every request at the user's own permissions. Unknown requested
scopes are dropped, and a request naming none of ours defaults to both — the user sees the result
before approving. Service accounts can never be the subject of an OAuth grant — only a signed-in
human consents, and (from task 2400) a session authenticated by an OAuth token cannot approve
further grants.

## Client registration

### DCR (`POST /oauth/register`)

- Accepts RFC 7591 metadata; persists `client_name`, `redirect_uris`, `client_uri`, `logo_uri`
  (displayed, never fetched by the server).
- Public clients only: `token_endpoint_auth_method` must be `none` (or absent); no secret issued.
- `redirect_uris` must be `https://…` or loopback `http://127.0.0.1|[::1]|localhost:<any port>/…`
  (RFC 8252 — native clients pick an ephemeral port, so loopback matching ignores the port) or a
  private-use scheme (`cursor://…`). No fragments, no wildcards.
- Rate-limited per source IP; registrations unused for 30 days are garbage-collected.

### CIMD (URL-shaped `client_id`)

- When `client_id` is an `https://` URL, the AS fetches it as the client's metadata document.
- **SSRF guard**: `https` only, default port only, resolved address must not be loopback,
  link-local, RFC 1918, CGNAT or the metadata endpoint ranges; no redirects; 5 s timeout; 16 KiB
  body cap; JSON only. The document's own `client_id` must equal the URL exactly.
- Cached on the `oauth_clients` row: re-fetched on authorize once it is over an hour old, and a
  failed re-fetch falls back to a cached copy under 24 h old. `Cache-Control` is not read (v1).
- The address check runs in the socket's `lookup` hook, so it applies to the address actually
  connected to — a hostname cannot pass a pre-check and then rebind to a private address.
- The consent screen shows the client's **host** prominently, because a CIMD `client_name` is
  self-asserted.

## Endpoints

On `openthrottle-server` (REST controllers, `@Public()`, outside GraphQL):

| Method | Path                                      | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/.well-known/oauth-authorization-server` | RFC 8414 metadata: `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `revocation_endpoint`, `response_types_supported: ["code"]`, `grant_types_supported: ["authorization_code","refresh_token"]`, `code_challenge_methods_supported: ["S256"]`, `token_endpoint_auth_methods_supported: ["none"]`, `scopes_supported`, `client_id_metadata_document_supported: true`, `authorization_response_iss_parameter_supported: true` |
| POST   | `/oauth/register`                         | DCR                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| GET    | `/oauth/authorize`                        | Validate, persist an authorization request, 302 to consent                                                                                                                                                                                                                                                                                                                                                                                                 |
| POST   | `/oauth/token`                            | `authorization_code` (+ `code_verifier`, `resource`) and `refresh_token`                                                                                                                                                                                                                                                                                                                                                                                   |
| POST   | `/oauth/revoke`                           | RFC 7009; revoking a refresh token revokes its grant                                                                                                                                                                                                                                                                                                                                                                                                       |

GraphQL (human JWT required — never OAuth or service-account tokens):

- `oauthAuthorizationRequest(id)` — what the consent screen renders: client name and host,
  redirect host, requested scopes, offered scopes, resource.
- `decideOAuthAuthorization(input: { id, approve, scopes })` → `{ redirectUrl }` — mints the code
  (approve) or an `access_denied` error redirect (deny), always with `state` and `iss`.
- `myOAuthGrants` / `revokeOAuthGrant(id)` — the token list. Shaped as a generic
  "signed-in client" row (`client`, `scopes`, `createdAt`, `lastUsedAt`, `expiresAt`) so the
  sessions/devices follow-up can list browser sessions and passkeys beside it rather than build a
  second list.

On the MCP server:

| Method | Path                                                                                    | Purpose                                                                                                                                                                   |
| ------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/.well-known/oauth-protected-resource` and `/.well-known/oauth-protected-resource/mcp` | RFC 9728: `resource: OT_MCP_PUBLIC_URL`, `authorization_servers: [OT_OAUTH_ISSUER]`, `scopes_supported: ["mcp:read","mcp:write"]`, `bearer_methods_supported: ["header"]` |

## Data model (one migration, `openthrottle` database)

- `oauth_clients` — `id`, `client_id` (unique; a generated id for DCR, the URL for CIMD),
  `registration_kind` (`dcr` | `cimd`), `client_name`, `client_uri`, `logo_uri`,
  `redirect_uris text[]`, `metadata_fetched_at`, `last_used_at`, `created_at`.
- `oauth_authorization_requests` — `id`, `client_id` → clients, `redirect_uri`, `state`,
  `code_challenge`, `requested_scopes text[]`, `resource`, `user_id` (set on decision),
  `granted_scopes text[]`, `code_hash` (unique, nullable), `status`
  (`pending` | `approved` | `denied` | `exchanged` | `expired`), `expires_at` (10 min for the
  consent step, 60 s for the code once minted), `created_at`, `decided_at`.
- `oauth_grants` — `id`, `user_id` → users, `client_id` → clients, `scopes text[]`, `resource`,
  `created_at`, `expires_at` (+30 days), `last_used_at`, `revoked_at`, `revoked_reason`
  (`user` | `refresh_reuse` | `admin` | `user_disabled`).
- `oauth_tokens` — `id`, `grant_id` → grants (cascade), `kind` (`access` | `refresh`), `prefix`
  (unique), `secret_hash`, `expires_at`, `created_at`, `revoked_at`, `replaced_by` (refresh
  rotation chain).

Validity of an access token = token not revoked ∧ not expired ∧ grant not revoked ∧ grant not
expired ∧ user not disabled ∧ `grant.resource` ∈ configured MCP resources. One indexed join on
`prefix`; `last_used_at` is written at most once a minute per grant.

## Security checklist

- **Open redirects.** `/oauth/authorize` never redirects to an unvalidated `redirect_uri`. An
  unknown client or a non-matching `redirect_uri` renders an error page on the AS; only errors
  _after_ the redirect URI is validated are returned to it.
- **Mix-up.** `iss` on every authorization response; clients validate it (RFC 9207).
- **Code injection / replay.** PKCE S256 required; codes single-use, 60 s, bound to
  client + redirect URI + resource; a second exchange of a code revokes the grant it produced.
- **Clickjacking.** The consent page sends `frame-ancestors 'none'`.
- **CSRF on consent.** The decision is a GraphQL mutation authenticated by the human's JWT header,
  not a cookie, and it is keyed by an unguessable request id that expires in 10 minutes.
- **Audience.** `resource` is required and must equal a configured `OT_MCP_PUBLIC_URL`; it is
  stored on the grant and re-checked on every request.
- **Disabled users.** Disabling a user revokes their grants; validity also checks `disabled_at`.
- **Logging.** Tokens are never logged; only prefixes.

## Migration off the static token

1. **Public mode refuses anonymous requests (ships first, task 2).** When `OT_MCP_PUBLIC_URL` is
   set, a request without a bearer gets 401 + `WWW-Authenticate`, and the env-token fallback is
   disabled. An explicit bearer (`ot_oat_`, `ot_sa_`, or a human JWT) is still forwarded — those
   all carry identity and are validated by the API.
2. **Deprecation flag.** `OT_MCP_ALLOW_STATIC_TOKEN=true` restores today's header-less fallback in
   public mode for anyone who has a remote client wired that way. It logs a deprecation warning at
   boot and on the first fallback per minute. Default off. Without `OT_MCP_PUBLIC_URL` (the
   compose-internal service) nothing changes.
3. **OAuth live (tasks 2–3).** Infra renders `OT_MCP_PUBLIC_URL`, `OT_OAUTH_ISSUER` and
   `OT_OAUTH_CONSENT_URL` from `mcp_domain`, `api_domain` and `developer_domain`.
4. **Verify clients, then retire (task 4).** Claude Code, Cursor and Codex each complete
   discovery → consent → tool call → refresh → revoke against a deployed instance. Then the flag
   and the public-mode fallback are deleted, the Caddyfile comment is corrected, and
   `docs/openthrottle/mcp-registration.md` documents the OAuth registration.

## Decisions taken here (and the alternatives rejected)

| Decision                                    | Rejected alternative                           | Why                                                |
| ------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| AS = openthrottle-server                    | Separate AS service / third-party IdP          | Users, login and RBAC already live there           |
| Opaque DB tokens                            | JWT access tokens                              | Revocation and the token list are the requirement  |
| Forward bearer, audience-checked at the API | MCP impersonates users via its service account | No impersonation channel to secure                 |
| Scopes subtract from the user's RBAC        | Scope → permission mapping table               | A token can never exceed its user, by construction |
| Unclassified tool ⇒ write                   | Unclassified ⇒ read                            | Fail closed                                        |
| Ship anonymous-refusal before OAuth         | Wait for OAuth                                 | The public surface is open today                   |
| Support DCR despite deprecation             | CIMD only                                      | Cursor and Codex depend on DCR                     |
