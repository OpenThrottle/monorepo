# MCP server registration for OpenThrottle

Canonical, single-source-of-truth (SSOT) guide for registering Model Context Protocol (MCP) servers when working in the OpenThrottle monorepo. It explains which servers OpenThrottle ships, which are user-provided, where each editor reads its config, and how to register and smoke-test `openthrottle-mcp` at the monorepo root and from a secondary workspace.

This doc **consolidates** registration guidance that previously lived (partly) across [first-time-onboarding.md](./first-time-onboarding.md) (tier table, when-to-use), [mcp-worktrees.md](./mcp-worktrees.md) (worktree-aware launchers, server inventory), and [local-quickstart.md](./local-quickstart.md). Those docs now point here for the registration story and keep only their own concerns (onboarding flow, worktree identity, fresh-clone bootstrap). Where this guide and those overlap, **this file wins**.

> **Scope:** registration and configuration only. For tokens and rotation see [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md); for env alignment and smoke fixtures see [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md); for worktree identity see [mcp-worktrees.md](./mcp-worktrees.md).

## Contents

- [Current state](#current-state) — what is actually committed today
- [MCP tiers](#mcp-tiers) — required OT-native vs user-provided/optional
- [Config locations](#config-locations) — project vs user-level, per editor
- [Template structure](#template-structure) — `.cursor/mcp.json.example` and the launcher
- [Editor parity](#editor-parity) — Cursor / VS Code / Claude Code actual contents
- [User-provided servers](#user-provided-servers) — github, shadcn, nx-mcp, maestro, fetch
- [Secondary workspace](#secondary-workspace) — using OT MCP from another repo
- [Worktrees](#worktrees) — worktree-aware launcher (see mcp-worktrees.md)
- [Smoke-test checklist](#smoke-test-checklist) — registration gates

## Current state

Inventory of MCP config **as actually committed** (audited 2026-06-16). This is the ground truth the rest of this guide builds on — not the original (superseded) plan.

| Config source                 | Scope                | Servers actually present                                       | Notes                                                                                                                      |
| ----------------------------- | -------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/mcp.json.example`    | Project (committed)  | **`openthrottle-mcp`** only                                    | Narrowed to a single active entry on 2026-06-12 (was openthrottle-mcp + docs-mcp + git). The template.                     |
| `.cursor/mcp.json`            | Project (gitignored) | user's machine                                                 | Local, per-developer; may still contain stale `docs-mcp`. **Not** committed; leave alone.                                  |
| `~/.cursor/mcp.json`          | User-level           | user's machine                                                 | Canonical home for the **secondary-workspace** setup (absolute paths to the OT checkout).                                  |
| `.mcp.json` (Claude Code)     | Project (committed)  | `github`, `fetch`, `maestro`, **`openthrottle-mcp`**, `shadcn` | Wider surface than Cursor's template; `openthrottle-mcp` invoked as `bash scripts/run-openthrottle-mcp.sh`.                |
| `.vscode/mcp.json`            | Project (committed)  | _none_ — empty `{}`                                            | Present but unconfigured; VS Code users register servers themselves.                                                       |
| `opencode.json`               | Project (committed)  | `nx-mcp` (`npx nx mcp`)                                        | OpenCode editor config; nx-mcp only.                                                                                       |
| `~/.cursor/mcp.json` patterns | User-level           | optional user-provided servers                                 | github / shadcn / nx-mcp / maestro / fetch as the developer chooses (see [User-provided servers](#user-provided-servers)). |

### `docs-mcp` is retired

`docs-mcp` is **not** an active server and must not be documented as one:

- No launcher — `scripts/run-docs-mcp.sh` was removed (PR #6); it does not exist on disk.
- No package — there is no `docs-mcp` package under `packages/`.
- No committed config references it as active (`.cursor/mcp.json.example`, `.mcp.json`, `.vscode/mcp.json`, `opencode.json` are all docs-mcp-free).
- It may still linger in a developer's gitignored local `.cursor/mcp.json`; remove it there. Historical/seed data (e.g. `databases/seed.sql`) is left intact.

Its former role — semantic search over ingested `docs/` — is now served by **`openthrottle-mcp`** (`semantic_search`, `list_sources`, `get_document`).

See [mcp-worktrees.md](./mcp-worktrees.md) for worktree identity and [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) for env alignment.

## MCP tiers

OpenThrottle distinguishes two tiers of MCP server. **Only one is OT-native and required**; everything else is user-provided and optional.

### Tier 1 — Required, OT-native

| Server               | Why                                                                                                                                                                                                                                                   | Registration                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **openthrottle-mcp** | The single OT-native server. Plans, tasks, notes, commit links, activity, plan output stream, semantic search over the OT knowledge base (plans + tasks + ingested `docs/`), and `health`. Plans/tasks live in OT **only** — never as Markdown files. | `bash scripts/run-openthrottle-mcp.sh` — see [Template structure](#template-structure). |

This is the only server this repo expects you to register to work with OpenThrottle. It absorbed the former `docs-mcp` documentation-search role (see [Current state](#current-state)).

### Tier 2 — User-provided / optional

These are general-purpose servers a developer may register to taste. They are **not** OT-native and **not** required for OT plans/tasks. They appear in `.mcp.json` / `opencode.json` because they are useful in this repo, but you register and authenticate them yourself.

| Server      | Purpose                                  | Appears in      |
| ----------- | ---------------------------------------- | --------------- |
| **github**  | GitHub PRs, issues, code search          | `.mcp.json`     |
| **shadcn**  | shadcn/ui component registry             | `.mcp.json`     |
| **nx-mcp**  | Nx workspace graph, generators, docs     | `opencode.json` |
| **maestro** | Maestro E2E driving of the developer app | `.mcp.json`     |
| **fetch**   | Generic URL fetch                        | `.mcp.json`     |

Detail and registration for these: [User-provided servers](#user-provided-servers).

> **Not active OT-native servers:** `docs-mcp` (retired — see [Current state](#current-state)) and `git` (not present in any committed config). Do not register either as an OT-native server.

## Config locations

MCP config is read per **workspace** and (for Cursor) optionally per **user**. Where you put the `openthrottle-mcp` entry depends on whether the OpenThrottle monorepo is your open workspace.

| Location             | Scope                 | When to use                                                                                                                                                                                             |
| -------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/mcp.json`   | Project (this repo)   | The monorepo is your open Cursor workspace. Copy/merge from [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example). Gitignored — your local copy with real tokens.                                |
| `~/.cursor/mcp.json` | User-level (Cursor)   | **Secondary workspace** — a _different_ repo is open in Cursor but you still want OT tools. Canonical home; use **absolute paths** to the OT checkout. See [Secondary workspace](#secondary-workspace). |
| `.mcp.json`          | Project (Claude Code) | Claude Code in the monorepo. Committed; already includes `openthrottle-mcp` + user-provided servers.                                                                                                    |
| `.vscode/mcp.json`   | Project (VS Code)     | VS Code's MCP support. Currently empty `{}` — register servers yourself.                                                                                                                                |
| `opencode.json`      | Project (OpenCode)    | OpenCode editor. Committed; includes `nx-mcp`.                                                                                                                                                          |

**Project vs user-level (Cursor):** a project-level `.cursor/mcp.json` is only loaded when that folder is the workspace root. When OpenThrottle is _not_ the open workspace, the project file is ignored — use `~/.cursor/mcp.json` instead. If both define `openthrottle-mcp`, see [Cursor merge behavior](#user-provided-servers).

## Template structure

The committed template is [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example). It has **one active entry — `openthrottle-mcp`** — and nothing else:

```json
{
  "mcpServers": {
    "openthrottle-mcp": {
      "command": "bash",
      "args": [
        "-c",
        "set -a && source ./.env && set +a && export API_URL=\"$OPENTHROTTLE_SERVER_APP_URL\" API_URL_INTERNAL=\"$OPENTHROTTLE_SERVER_APP_URL\" && ./scripts/run-openthrottle-mcp.sh"
      ],
      "description": "OpenThrottle (OT) plans knowledge base (Postgres + GraphQL). Plans, tasks, notes, commit links, activity, output stream, semantic search, health."
    }
  }
}
```

**Launcher invocation:**

- The `bash -c` wrapper `source`s the repo `./.env`, then exports `API_URL` / `API_URL_INTERNAL` from `OPENTHROTTLE_SERVER_APP_URL` before running [`scripts/run-openthrottle-mcp.sh`](../../scripts/run-openthrottle-mcp.sh).
- `local-quickstart.md` shows an equivalent form that sets `API_URL` / `API_URL_INTERNAL` (and `OPENTHROTTLE_MCP_AUTH_TOKEN`) explicitly in an `env` block instead of deriving them from `.env` — either works; pick one. Keep the URLs aligned with the server `PORT` (default `6021`).
- **Auth:** put `OPENTHROTTLE_MCP_AUTH_TOKEN` (an `ot_sa_…` service-account token) in `applications/openthrottle-server/.env` and, for Cursor, in the MCP `env` block. Mint it with `pnpm run database:bootstrap-service-accounts`. Never commit a real token — see [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md).
- **Embeddings** are configured on the server (`OPENAI_API_KEY` or `OLLAMA_*` in `applications/openthrottle-server/.env`), **not** in this launcher.
- **Worktree-aware:** the launcher sets `WORKTREE_ID` per worktree and resolves a _live_ server URL at launch (probing `/health`) rather than trusting a per-worktree `.env` port — full detail in [mcp-worktrees.md](./mcp-worktrees.md).

**Optional user-provided servers** (github, shadcn, nx-mcp, maestro, fetch) are **not** active entries in the template. Register them at user level (`~/.cursor/mcp.json`) or as commented placeholders — see [User-provided servers](#user-provided-servers). Do **not** add `docs-mcp` (retired) or `git` (not committed) as active entries.

## Editor parity

Each editor reads its own MCP config file; their committed contents differ. This table is the real current state (audited 2026-06-16), not an aspiration.

| Editor          | Config file                                                      | Committed contents today                                   | openthrottle-mcp present? |
| --------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------- |
| **Cursor**      | `.cursor/mcp.json.example` (template; copy → `.cursor/mcp.json`) | `openthrottle-mcp` only                                    | Yes (the only entry)      |
| **Claude Code** | `.mcp.json`                                                      | `github`, `fetch`, `maestro`, `openthrottle-mcp`, `shadcn` | Yes (+ user-provided)     |
| **VS Code**     | `.vscode/mcp.json`                                               | empty `{}`                                                 | No — register yourself    |
| **OpenCode**    | `opencode.json`                                                  | `nx-mcp`                                                   | No — nx-mcp only          |

**Why they differ:** Cursor's template is intentionally minimal (just the OT-native server); Claude Code's `.mcp.json` is committed with the fuller working set the team uses day-to-day; VS Code's file is a placeholder; OpenCode carries only `nx-mcp`. The one invariant: **`openthrottle-mcp` is the OT-native server** wherever OT plans/tasks are needed.

## User-provided servers

These are Tier 2 servers — useful in this repo but **not** OT-native and **not** required for OT plans/tasks. Register the ones you want; authenticate them yourself. The entries below are exactly as they appear in the committed `.mcp.json` (Claude Code) and `opencode.json` (OpenCode).

### GitHub MCP

```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

- **Token:** the server reads `GITHUB_PERSONAL_ACCESS_TOKEN`; the committed config maps it from your `GITHUB_TOKEN` environment variable (`${GITHUB_TOKEN}`), so export `GITHUB_TOKEN` in your shell/editor environment rather than committing a PAT.
- **Scopes:** a classic PAT with `repo` (read/write to PRs, issues, contents) covers normal use; add `read:org` for org-scoped queries and `workflow` only if you drive Actions. Fine-grained tokens work if granted the equivalent repo permissions.
- **Optional:** GitHub MCP is **not** a plan gate. It is covered as an optional appendix in the [smoke-test checklist](#smoke-test-checklist), not a required registration step.

### shadcn, nx-mcp, maestro, fetch

| Server      | Config (as committed)                                          | Notes                                                                                                |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **shadcn**  | `.mcp.json`: `npx shadcn@latest mcp`                           | shadcn/ui component registry browsing/adding. No token.                                              |
| **nx-mcp**  | `opencode.json`: `npx nx mcp` (`type: local`, `enabled: true`) | Nx workspace graph, generators, docs, task running. No token.                                        |
| **maestro** | `.mcp.json`: `maestro mcp`                                     | Maestro E2E driving of the developer app. Requires the Maestro CLI on `PATH` + a running app/device. |
| **fetch**   | `.mcp.json`: `uvx mcp-server-fetch`                            | Generic URL fetch. Requires `uvx` (uv) on `PATH`. No token.                                          |

### Cursor merge behavior (project + user config)

When you run Cursor inside OpenThrottle, **both** `~/.cursor/mcp.json` (user-level) and `.cursor/mcp.json` (project) apply; Cursor unions their `mcpServers` by key. Practical rules:

- **Distinct keys union.** Put `openthrottle-mcp` in the project file (from the template) and your personal servers (github, shadcn, …) in `~/.cursor/mcp.json`; you get both.
- **Same key → project wins.** If both files define `openthrottle-mcp`, the project-level entry takes precedence for this workspace. Keep the OT-native entry in one place (the project file when the monorepo is open; `~/.cursor/mcp.json` for a [secondary workspace](#secondary-workspace)) to avoid a stale duplicate shadowing the live one.
- **Restart Cursor** after editing either file.

## Secondary workspace

Use `openthrottle-mcp` while your **active Cursor workspace is a different repo** (not the OpenThrottle monorepo root). The project-level `.cursor/mcp.json` inside OpenThrottle is not loaded then, so register at user level.

1. **Register in `~/.cursor/mcp.json`** (user-level), not the project file.
2. **Use an absolute path** to the launcher — `bash` + `<path-to-openthrottle-checkout>/scripts/run-openthrottle-mcp.sh`. A relative `./scripts/...` resolves against the _open_ workspace and won't exist outside the OT repo.
3. **Same env as local OT** — `API_URL` / `API_URL_INTERNAL` pointed at the running server (e.g. `http://localhost:6021`) and `OPENTHROTTLE_MCP_AUTH_TOKEN` for authenticated tools. These are independent of which folder is open.

The launcher `cd`s into the monorepo and starts Node from that checkout; GraphQL-backed tools (`create_plan`, `create_task`, …) call the server over HTTP and do not depend on the open workspace path. Full detail and failure modes: [verification-environment.md § Secondary workspace](../../packages/openthrottle-mcp/docs/verification-environment.md#secondary-workspace-another-repo-open-in-cursor).

## Worktrees

Cursor keys MCP servers by the `mcpServers` key and the server's advertised name; across git worktrees `scripts/run-openthrottle-mcp.sh` sets `WORKTREE_ID` so each worktree advertises a distinct server name, and resolves a **live** server URL at launch rather than trusting a per-worktree `.env` port. Full detail: [mcp-worktrees.md](./mcp-worktrees.md).

## Smoke-test checklist

After registering or changing MCP config, confirm `openthrottle-mcp` works. There is **no docs-mcp gate** (retired). The full, maintained checklist lives in **[verification-environment.md § Registration smoke-test](../../packages/openthrottle-mcp/docs/verification-environment.md#registration-smoke-test-root--secondary-workspace)**; the gates in brief:

**Root (monorepo open):**

1. Copy `.cursor/mcp.json.example` → `.cursor/mcp.json`, set `OPENTHROTTLE_MCP_AUTH_TOKEN`, restart Cursor.
2. `OT_MCP_RESOLVE_ONLY=1 bash scripts/run-openthrottle-mcp.sh` resolves a live server.
3. `health` → all `ok`.
4. One OT tool (e.g. `list_sources` / `semantic_search`) succeeds.

**Secondary workspace (a different repo open):**

1. `~/.cursor/mcp.json` with an absolute path to `scripts/run-openthrottle-mcp.sh` + same OT env; restart Cursor.
2. The absolute-path launcher resolves the live server from any cwd; `health` passes in the MCP panel.

**Optional:** GitHub MCP is **not** a gate — see the [optional GitHub appendix](../../packages/openthrottle-mcp/docs/verification-environment.md#optional-appendix--github-mcp).

## Related documentation

| Topic                                  | Location                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Worktree-aware MCP identity & launcher | [mcp-worktrees.md](./mcp-worktrees.md)                                                          |
| MCP env, fixtures, smoke checks        | [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) |
| Service account tokens & rotation      | [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)                                         |
| First agent workflow after MCP works   | [first-time-onboarding.md](./first-time-onboarding.md)                                          |
| Author OT plans & tasks via MCP        | [authoring-plans-via-mcp.md](./authoring-plans-via-mcp.md)                                      |
| Fresh clone → server + MCP             | [local-quickstart.md](./local-quickstart.md)                                                    |
| Committed config template              | [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example)                                    |
