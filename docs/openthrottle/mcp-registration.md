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

<!-- TODO(task 2000 — audit): inventory table of ACTUAL committed contents:
     .cursor/mcp.json.example (openthrottle-mcp only, 2026-06-12), .mcp.json
     (github/fetch/maestro/openthrottle-mcp/shadcn), .vscode/mcp.json (empty {}),
     opencode.json (nx-mcp), user-level ~/.cursor/mcp.json patterns. Flag docs-mcp as RETIRED. -->

_Pending — see task 2000._

## MCP tiers

<!-- TODO(task 3000): required OT-native = openthrottle-mcp only; user-provided/optional =
     github, shadcn, nx-mcp, maestro, fetch. NOT docs-mcp (retired), NOT git (not committed). -->

_Pending — see task 3000._

## Config locations

<!-- TODO(task 3000): project-level .cursor/mcp.json vs user-level ~/.cursor/mcp.json;
     secondary workspace canonical = ~/.cursor/mcp.json with absolute paths to the OT checkout. -->

_Pending — see task 3000._

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

<!-- TODO(task 3000/5000): using OT MCP while the active workspace is a different checkout —
     ~/.cursor/mcp.json with absolute path to scripts/run-openthrottle-mcp.sh; same env as local OT.
     Detail in verification-environment.md § Secondary workspace. -->

_Pending — see verification-environment.md § Secondary workspace and task 3000._

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
