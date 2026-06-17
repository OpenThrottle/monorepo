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

<!--
SECTION PLACEHOLDERS — filled in by later tasks in plan 0f2ffac0-26fc-40bc-914f-b3f1dede75b4.
Each section is authored by its own task; this scaffold establishes the structure, TOC,
and cross-links so the consolidation lands incrementally without duplicating source docs.
-->

## Current state

Inventory of MCP config **as actually committed** (audited 2026-06-16). This is the ground truth the rest of this guide builds on — not the original (superseded) plan.

| Config source                | Scope               | Servers actually present                                          | Notes                                                                                                  |
| ---------------------------- | ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `.cursor/mcp.json.example`   | Project (committed) | **`openthrottle-mcp`** only                                       | Narrowed to a single active entry on 2026-06-12 (was openthrottle-mcp + docs-mcp + git). The template. |
| `.cursor/mcp.json`           | Project (gitignored)| user's machine                                                    | Local, per-developer; may still contain stale `docs-mcp`. **Not** committed; leave alone.              |
| `~/.cursor/mcp.json`         | User-level          | user's machine                                                    | Canonical home for the **secondary-workspace** setup (absolute paths to the OT checkout).              |
| `.mcp.json` (Claude Code)    | Project (committed) | `github`, `fetch`, `maestro`, **`openthrottle-mcp`**, `shadcn`    | Wider surface than Cursor's template; `openthrottle-mcp` invoked as `bash scripts/run-openthrottle-mcp.sh`. |
| `.vscode/mcp.json`           | Project (committed) | _none_ — empty `{}`                                               | Present but unconfigured; VS Code users register servers themselves.                                   |
| `opencode.json`              | Project (committed) | `nx-mcp` (`npx nx mcp`)                                           | OpenCode editor config; nx-mcp only.                                                                   |
| `~/.cursor/mcp.json` patterns| User-level          | optional user-provided servers                                    | github / shadcn / nx-mcp / maestro / fetch as the developer chooses (see [User-provided servers](#user-provided-servers)). |

### `docs-mcp` is retired

`docs-mcp` is **not** an active server and must not be documented as one:

- No launcher — `scripts/run-docs-mcp.sh` was removed (PR #6); it does not exist on disk.
- No package — there is no `docs-mcp` package under `packages/`.
- No committed config references it as active (`.cursor/mcp.json.example`, `.mcp.json`, `.vscode/mcp.json`, `opencode.json` are all docs-mcp-free).
- It lingers only in (a) the gitignored local `.cursor/mcp.json` on individual machines and (b) stale doc prose — being purged under this plan (see [task tracking in mcp-worktrees.md, first-time-onboarding.md, etc.](#related-documentation)). Historical/seed data (e.g. `databases/seed.sql`) is left intact.

Its former role — semantic search over ingested `docs/` — is now served by **`openthrottle-mcp`** (`semantic_search`, `list_sources`, `get_document`).

See [mcp-worktrees.md](./mcp-worktrees.md) for worktree identity and [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md) for env alignment.

## MCP tiers

OpenThrottle distinguishes two tiers of MCP server. **Only one is OT-native and required**; everything else is user-provided and optional.

### Tier 1 — Required, OT-native

| Server             | Why                                                                                                   | Registration                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **openthrottle-mcp** | The single OT-native server. Plans, tasks, notes, commit links, activity, plan output stream, semantic search over the OT knowledge base (plans + tasks + ingested `docs/`), and `health`. Plans/tasks live in OT **only** — never as Markdown files. | `bash scripts/run-openthrottle-mcp.sh` — see [Template structure](#template-structure). |

This is the only server this repo expects you to register to work with OpenThrottle. It absorbed the former `docs-mcp` documentation-search role (see [Current state](#current-state)).

### Tier 2 — User-provided / optional

These are general-purpose servers a developer may register to taste. They are **not** OT-native and **not** required for OT plans/tasks. They appear in `.mcp.json` / `opencode.json` because they are useful in this repo, but you register and authenticate them yourself.

| Server     | Purpose                                  | Appears in                  |
| ---------- | ---------------------------------------- | --------------------------- |
| **github** | GitHub PRs, issues, code search          | `.mcp.json`                 |
| **shadcn** | shadcn/ui component registry             | `.mcp.json`                 |
| **nx-mcp** | Nx workspace graph, generators, docs     | `opencode.json`             |
| **maestro**| Maestro E2E driving of the developer app | `.mcp.json`                 |
| **fetch**  | Generic URL fetch                        | `.mcp.json`                 |

Detail and registration for these: [User-provided servers](#user-provided-servers).

> **Not active OT-native servers:** `docs-mcp` (retired — see [Current state](#current-state)) and `git` (not present in any committed config). Do not register either as an OT-native server.

## Config locations

MCP config is read per **workspace** and (for Cursor) optionally per **user**. Where you put the `openthrottle-mcp` entry depends on whether the OpenThrottle monorepo is your open workspace.

| Location                         | Scope                | When to use                                                                                                   |
| -------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `.cursor/mcp.json`               | Project (this repo)  | The monorepo is your open Cursor workspace. Copy/merge from [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example). Gitignored — your local copy with real tokens. |
| `~/.cursor/mcp.json`             | User-level (Cursor)  | **Secondary workspace** — a *different* repo is open in Cursor but you still want OT tools. Canonical home; use **absolute paths** to the OT checkout. See [Secondary workspace](#secondary-workspace). |
| `.mcp.json`                      | Project (Claude Code)| Claude Code in the monorepo. Committed; already includes `openthrottle-mcp` + user-provided servers.          |
| `.vscode/mcp.json`               | Project (VS Code)    | VS Code's MCP support. Currently empty `{}` — register servers yourself.                                      |
| `opencode.json`                  | Project (OpenCode)   | OpenCode editor. Committed; includes `nx-mcp`.                                                                |

**Project vs user-level (Cursor):** a project-level `.cursor/mcp.json` is only loaded when that folder is the workspace root. When OpenThrottle is *not* the open workspace, the project file is ignored — use `~/.cursor/mcp.json` instead. If both define `openthrottle-mcp`, see [Cursor merge behavior](#user-provided-servers).

## Template structure

<!-- TODO(task 4000): .cursor/mcp.json.example with openthrottle-mcp active + commented optional
     placeholders; launcher invocation (scripts/run-openthrottle-mcp.sh, API_URL/API_URL_INTERNAL
     from OPENTHROTTLE_SERVER_APP_URL), env vars, bootstrap, worktree-aware behavior. -->

_Pending — see task 4000._

## Editor parity

<!-- TODO(task 4000): table mapping Cursor (.cursor/mcp.json), VS Code (.vscode/mcp.json, empty),
     Claude Code (.mcp.json) to their real current contents. -->

_Pending — see task 4000._

## User-provided servers

<!-- TODO(task 5000): GitHub MCP (key, command/args, GITHUB_PERSONAL_ACCESS_TOKEN/GITHUB_TOKEN,
     scopes), shadcn, nx-mcp, maestro, fetch as they appear in .mcp.json/opencode.json; Cursor
     project + user config merge behavior; GitHub MCP optional (appendix, not a gate). -->

_Pending — see task 5000._

## Secondary workspace

Use `openthrottle-mcp` while your **active Cursor workspace is a different repo** (not the OpenThrottle monorepo root). The project-level `.cursor/mcp.json` inside OpenThrottle is not loaded then, so register at user level.

1. **Register in `~/.cursor/mcp.json`** (user-level), not the project file.
2. **Use an absolute path** to the launcher — `bash` + `<path-to-openthrottle-checkout>/scripts/run-openthrottle-mcp.sh`. A relative `./scripts/...` resolves against the *open* workspace and won't exist outside the OT repo.
3. **Same env as local OT** — `API_URL` / `API_URL_INTERNAL` pointed at the running server (e.g. `http://localhost:6021`) and `OPENTHROTTLE_MCP_AUTH_TOKEN` for authenticated tools. These are independent of which folder is open.

The launcher `cd`s into the monorepo and starts Node from that checkout; GraphQL-backed tools (`create_plan`, `create_task`, …) call the server over HTTP and do not depend on the open workspace path. Full detail and failure modes: [verification-environment.md § Secondary workspace](../../packages/openthrottle-mcp/docs/verification-environment.md#secondary-workspace-another-repo-open-in-cursor).

## Worktrees

Cursor keys MCP servers by the `mcpServers` key and the server's advertised name; across git worktrees `scripts/run-openthrottle-mcp.sh` sets `WORKTREE_ID` so each worktree advertises a distinct server name, and resolves a **live** server URL at launch rather than trusting a per-worktree `.env` port. Full detail: [mcp-worktrees.md](./mcp-worktrees.md).

## Smoke-test checklist

<!-- TODO(task 13000): consolidated checklist — openthrottle-mcp health + one OT tool at root and
     from secondary workspace; optional GitHub MCP appendix; no docs-mcp gate (retired). Links to
     verification-environment.md § Smoke checklist. -->

_Pending — see task 13000 and [verification-environment.md § Smoke checklist](../../packages/openthrottle-mcp/docs/verification-environment.md#smoke-checklist-re-validate-after-doc-or-config-changes)._

## Related documentation

| Topic                                  | Location                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Worktree-aware MCP identity & launcher | [mcp-worktrees.md](./mcp-worktrees.md)                                                            |
| MCP env, fixtures, smoke checks        | [verification-environment.md](../../packages/openthrottle-mcp/docs/verification-environment.md)   |
| Service account tokens & rotation      | [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)                                            |
| First agent workflow after MCP works   | [first-time-onboarding.md](./first-time-onboarding.md)                                            |
| Fresh clone → server + MCP             | [local-quickstart.md](./local-quickstart.md)                                                      |
| Committed config template              | [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example)                                       |
