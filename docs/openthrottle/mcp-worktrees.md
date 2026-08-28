# MCP servers and git worktrees

Using this repo's custom `openthrottle-mcp` MCP across git worktrees can cause Cursor to treat multiple instances as the same server when they share the same name. This doc summarizes how Cursor keys MCP servers, what we did to make `openthrottle-mcp` worktree-aware, and how other MCPs in `.cursor/mcp.json` behave.

> **Note:** `docs-mcp` is retired — there is no `scripts/run-docs-mcp.sh` and no `docs-mcp` package. Its semantic-search-over-`docs/` role folded into `openthrottle-mcp` (`semantic_search`, `list_sources`, `get_document`). See [mcp-registration.md § Current state](./mcp-registration.md#current-state). For the canonical registration story, see [mcp-registration.md](./mcp-registration.md).

## How Cursor keys MCP servers

- **Config:** Cursor reads `.cursor/mcp.json` per workspace. Each workspace (e.g. each worktree) has its own file; the **key** in `mcpServers` (e.g. `openthrottle-mcp`) is the server identifier Cursor uses.
- **Identity:** Cursor uses that key to decide which command to run and to identify the server. If two workspaces use the same key and the server advertises the same name over the MCP protocol, Cursor may conflate or reuse one process across worktrees, making restart/switching painful.
- **Per-workspace config:** Cursor does not document using path or workspace in the key; the key is a static string in `mcp.json`. So to get distinct identity per worktree we make the **server’s advertised name** worktree-aware (see below). Optionally, you can use different keys per worktree (e.g. generate `mcp.json` with `openthrottle-mcp-worktree-one`, `openthrottle-mcp-worktree-two`) for full isolation.

## Worktree-aware openthrottle-mcp

- **Script:** `scripts/run-openthrottle-mcp.sh` sets `WORKTREE_ID` to the basename of the git worktree root (e.g. `monorepo-worktree-one`) when run inside a git repo. If not in a git repo, `WORKTREE_ID` is unset.
- **Server name:** The package reads `getServerName()` from its config/constants:
  - If `MCP_SERVER_NAME` is set, that value is used.
  - Else if `WORKTREE_ID` is set, the server advertises a worktree-specific name (e.g. `@openthrottle/openthrottle-mcp-{WORKTREE_ID}`
  - Otherwise the default name is used.
- **Override:** Set `MCP_SERVER_NAME` before running the script to force a specific name (e.g. in tests or when not using worktrees).

## Other MCPs in `.cursor/mcp.json`

| Server               | Needs change? | Notes                                                                                                                                                               |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **openthrottle-mcp** | Done          | Worktree-aware via `WORKTREE_ID` / `MCP_SERVER_NAME`.                                                                                                               |
| **fetch**            | No            | Docker-based; stateless. No per-worktree config.                                                                                                                    |
| **filesystem**       | No            | Uses `./` (workspace root); already per-workspace.                                                                                                                  |
| **git**              | No            | `scripts/mcp-git.sh` runs in repo; path is implicit. No identity conflict.                                                                                          |
| **docker-git**       | Optional      | Bind mount is currently hardcoded (`/Users/matt/Development/monorepo`). For multiple worktrees, either use a different config per worktree or a shared parent path. |
| **memory**           | No            | Stateless in-process; no identity.                                                                                                                                  |

**OpenThrottle/Postgres per worktree:** If you want a separate OpenThrottle DB per worktree, set `POSTGRES_*` (or `POSTGRES_URL`) in each worktree’s `.env` (e.g. different ports or DB names). openthrottle-server reads those env vars at runtime. openthrottle-mcp talks to OpenThrottle via GraphQL (openthrottle-server), so point it at the correct API URL per worktree if needed.

## Resolving a live server URL ("fetch failed" in worktrees)

Worktree setup (`scripts/setup_worktree.sh`, reached through the single
tool-agnostic entrypoint `scripts/create_worktree.sh` — `pnpm worktree:new`, the
Claude hook, or Cursor — or lazily via `scripts/ensure_worktree.ts` on first
`dev`) rewrites the canonical ports `6020–6025` in `.env` to a per-worktree block (e.g. `OPENTHROTTLE_SERVER_APP_URL=http://localhost:7011`). But **worktrees do not start their own `openthrottle-server`** — they share the main checkout's server, Postgres, and Redis. So the rewritten URL points at a port with nothing listening, and every openthrottle-mcp call returns `fetch failed`. If a worktree's `.env` is missing entirely, the old launcher died at `source ./.env` and registered **zero** tools.

`scripts/run-openthrottle-mcp.sh` resolves a **live** server at launch instead of trusting the configured port. It probes `GET <url>/health` against candidates, in order, and uses the first that responds:

1. This worktree's own `.env` `OPENTHROTTLE_SERVER_APP_URL` (if present and listening — preserves a genuine per-worktree server).
2. The main/root checkout's `.env` `OPENTHROTTLE_SERVER_APP_URL` (resolved via `git rev-parse --git-common-dir`). This is the shared canonical server.
3. A running docker `server` container's published host port (`docker ps`).
4. Canonical fallback `http://localhost:6021`.

The chosen URL is exported as `API_URL` / `API_URL_INTERNAL`. Reading `.env` is now optional (parsed without `source`), so a missing/partial worktree `.env` no longer aborts the launcher. If **no** candidate is reachable, the launcher exits non-zero with an actionable message instead of silently launching into a `fetch failed` loop:

```
❌ openthrottle-mcp: no reachable OpenThrottle server found.
   Start it from the main checkout:
       pnpm run database:start && pnpm nx run openthrottle-server:dev
```

`.mcp.json` invokes the script directly (`"args": ["scripts/run-openthrottle-mcp.sh"]`); it no longer prefixes `set -a && source ./.env && …`. To debug resolution without starting the server, run `OT_MCP_RESOLVE_ONLY=1 bash scripts/run-openthrottle-mcp.sh` — it prints the resolved URL and exits.

**Note:** MCP servers register at session start, so this fix takes effect for _new_ sessions/worktrees. For a session already running with broken tools, drive GraphQL directly against the live server with `curl` (bearer `OPENTHROTTLE_MCP_AUTH_TOKEN`) as a stopgap.
