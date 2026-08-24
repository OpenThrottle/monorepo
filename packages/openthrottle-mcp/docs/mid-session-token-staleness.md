# Mid-session token staleness — design note

## Problem

`openthrottle-mcp` runs as a **long-lived stdio child** of the MCP client. The
launch-time preflight in `scripts/run-openthrottle-mcp.sh` validates the token
once, at boot. A token that is valid at boot but **rotated or revoked later**
keeps 401ing on every authenticated tool call until the process is relaunched —
inherent to a long-lived process that snapshots `process.env` at start.

Two distinct sub-cases:

1. **Rotated in `.env`.** A new credential is minted and written to `.env`, the
   old one still valid (overlap window) or already revoked. The fix is source
   truth: re-read `.env`.
2. **Revoked with no `.env` update.** The credential is revoked server-side and
   nothing local changes. No local re-read can recover this — it needs a fresh,
   valid token and a reconnect.

## Options considered

| Option                                     | Recovers rotation? | Recovers revoke? | Cost / risk                                                   |
| ------------------------------------------ | ------------------ | ---------------- | ------------------------------------------------------------- |
| A. Periodic re-validation (launcher/srv)   | no (detect only)   | no               | Timer plumbing; can't refresh a long-lived process's snapshot |
| B. **Per-request re-resolution from .env** | **yes**            | no               | One function; throttled file read; gated to stdio launcher    |
| C. Retry-once on 401 (re-read + retry)     | yes (via re-read)  | no               | Must wrap ~15 tool call sites; churn + risk                   |

Option A only detects; it cannot mutate the running process's token cleanly.
Option C's recovery ultimately depends on the same `.env` re-read as B, but pays
for it by threading a retry wrapper through every tool handler — larger blast
radius for no extra recovery power. **B is the smallest change that closes the
rotation gap**, and it does so transparently for every tool at once (all authed
tools resolve through `getAuthToken()`).

Neither B nor C recovers the **revoke-without-.env-update** case; that is
handled out of band by the `auth_status` tool + reconnect runbook (see
[AUTH.md](./AUTH.md)) — a loud, actionable "your MCP is stale, reconnect"
signal instead of silent per-call 401s.

## Chosen approach — B

`getAuthToken()` (resolution order: per-request store → env) now calls
`refreshEnvAuthTokenFromFile()` before reading `process.env` — but only when
there is no per-request token (the embedded server path is untouched).

- The launcher records the **absolute path** of the `.env` it self-loaded the
  token from in `OT_MCP_AUTH_TOKEN_ENV_FILE`. Its presence is what arms
  re-resolution. It is **not** set when the token came from an exported shell
  var (that shell is the source of truth and `.env` may be stale) or in the
  embedded per-request-token server.
- Re-reads are **throttled** to at most one per `OT_MCP_TOKEN_REFRESH_MS`
  (default 5000ms; `0` disables). A changed source-file path re-reads immediately.
- The re-read **never clobbers** a valid token with a missing/empty file value
  and **never throws** — token resolution must not break on a rotated/absent file.

### Interaction with prior work

- Builds on the launch-time preflight (PR #297): boot still fails loudly on a
  bad token; this only adds live pickup of a rotated one.
- Aligns with the `.mcp.json` no-env-block change (this plan, task 2): the token
  is now normally self-loaded from `.env`, so `OT_MCP_AUTH_TOKEN_ENV_FILE` is set
  in the common path and re-resolution is active by default.

### Implementation

- `packages/openthrottle-mcp/src/auth/get-auth-token.ts` —
  `refreshEnvAuthTokenFromFile()` + wiring in `getAuthToken()`.
- `scripts/run-openthrottle-mcp.sh` — export `OT_MCP_AUTH_TOKEN_ENV_FILE` on
  self-load.
- Tests: `src/auth/get-auth-token.test.ts`.
