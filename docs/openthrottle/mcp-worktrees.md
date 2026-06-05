# MCP servers and git worktrees

Using this repo with custom MCPs (openthrottle-mcp, docs-mcp) across git worktrees can cause Cursor to treat multiple instances as the same server when they share the same name. This doc summarizes how Cursor keys MCP servers, what we did to make openthrottle-mcp and docs-mcp worktree-aware, and how other MCPs in `.cursor/mcp.json` behave.

## How Cursor keys MCP servers

- **Config:** Cursor reads `.cursor/mcp.json` per workspace. Each workspace (e.g. each worktree) has its own file; the **key** in `mcpServers` (e.g. `openthrottle-mcp`, `docs-mcp`) is the server identifier Cursor uses.
- **Identity:** Cursor uses that key to decide which command to run and to identify the server. If two workspaces use the same key and the server advertises the same name over the MCP protocol, Cursor may conflate or reuse one process across worktrees, making restart/switching painful.
- **Per-workspace config:** Cursor does not document using path or workspace in the key; the key is a static string in `mcp.json`. So to get distinct identity per worktree we make the **server’s advertised name** worktree-aware (see below). Optionally, you can use different keys per worktree (e.g. generate `mcp.json` with `openthrottle-mcp-worktree-one`, `openthrottle-mcp-worktree-two`) for full isolation.

## Worktree-aware openthrottle-mcp and docs-mcp

- **Scripts:** `scripts/run-openthrottle-mcp.sh` and `scripts/run-docs-mcp.sh` set `WORKTREE_ID` to the basename of the git worktree root (e.g. `monorepo-worktree-one`) when run inside a git repo. If not in a git repo, `WORKTREE_ID` is unset.
- **Server name:** Both packages read `getServerName()` from their config/constants:
  - If `MCP_SERVER_NAME` is set, that value is used.
  - Else if `WORKTREE_ID` is set, the server advertises a worktree-specific name (e.g. `@openthrottle/openthrottle-mcp-{WORKTREE_ID}`
  - Otherwise the default name is used.
- **Override:** Set `MCP_SERVER_NAME` before running the script to force a specific name (e.g. in tests or when not using worktrees).

## Other MCPs in `.cursor/mcp.json`

| Server               | Needs change? | Notes                                                                                                                                                               |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **openthrottle-mcp** | Done          | Worktree-aware via `WORKTREE_ID` / `MCP_SERVER_NAME`.                                                                                                               |
| **docs-mcp**         | Done          | Same as openthrottle-mcp.                                                                                                                                           |
| **fetch**            | No            | Docker-based; stateless. No per-worktree config.                                                                                                                    |
| **filesystem**       | No            | Uses `./` (workspace root); already per-workspace.                                                                                                                  |
| **git**              | No            | `scripts/mcp-git.sh` runs in repo; path is implicit. No identity conflict.                                                                                          |
| **docker-git**       | Optional      | Bind mount is currently hardcoded (`/Users/matt/Development/monorepo`). For multiple worktrees, either use a different config per worktree or a shared parent path. |
| **memory**           | No            | Stateless in-process; no identity.                                                                                                                                  |

**Cortex/Postgres per worktree:** If you want a separate Cortex DB per worktree, set `POSTGRES_*` (or `POSTGRES_URL`) in each worktree’s `.env` (e.g. different ports or DB names). openthrottle-server and docs-mcp read those env vars at runtime. openthrottle-mcp talks to Cortex via GraphQL (openthrottle-server), so point it at the correct API URL per worktree if needed.
