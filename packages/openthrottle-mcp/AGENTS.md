# @openthrottle/openthrottle-mcp — agent notes

The OpenThrottle MCP server: plans, tasks, notes, activity, output stream, semantic search, and
agent-conversation read tools, exposed to MCP clients (Cursor/Claude). NestJS + `@rekog/mcp-nest`.
Nx project name is the full `@openthrottle/openthrottle-mcp` (not the bare directory name).

**Consumed by:** `@openthrottle/nestjs-mcp-developer` and `@openthrottle/nestjs-worktrees`
(via `./auth` / `./nest` subpaths). The standalone server is launched by
[`scripts/run-openthrottle-mcp.sh`](../../scripts/run-openthrottle-mcp.sh).

## Commands

- `pnpm nx run @openthrottle/openthrottle-mcp:build` — required before `serve`; `serve` runs
  `node dist/src/bin.js` (no dev server — the `__dev` target is tsc `--watch`, not a runnable MCP).
- `pnpm nx run @openthrottle/openthrottle-mcp:verify-graphql-codegen` — regenerates GraphQL types
  and fails if `src/__generated__` drifts from the `.graphql` documents. Run after any `.graphql`
  document change. This output is **gitignored** (only `.gitkeep` is tracked), so the guard
  byte-compares a snapshot of the on-disk output against a fresh regeneration rather than using
  `git diff` — which over ignored paths always exits 0, and is why the pre-2026-09 version of this
  guard could never fail. With no output on disk (fresh clone, CI) there is no baseline, and the
  guard says so instead of passing silently; drift on the SHARED plan/task documents is caught in
  CI by `openthrottle-agentic-ralph`, which commits its generated output.

## Fragment coverage (why a tool result can be missing a field)

Plan/task/note/project operations are consumed cross-package from
`packages/openthrottle-agentic-ralph/src/graphql/ralph/*.graphql`, and a tool result **is** the
fragment's selection set passed through verbatim (`runTool<{ plan: GetPlanQuery['plan'] }>` →
`src/utils/tool-result.ts`). A scalar the shared fragment does not select is therefore invisible to
every MCP caller, while codegen, typecheck and the drift guard all stay green — the field is simply
absent. `get_plan` hid `runConfigJson` this way for months.

So: **adding a scalar field to `PlanObject`/`TaskObject` server-side is not done until the shared
fragment selects it.** `packages/openthrottle-agentic-ralph/src/graphql/__tests__/fragment-coverage.test.ts`
enforces this — every scalar/enum field on a covered type must be selected by the fragment or named
in that file's `EXCLUSIONS` with a reason. Object and list-of-object fields are exempt (a selection
set is a real choice). After changing a shared fragment, regenerate **both** consumers.

## Layout

- `src/tool-registry.ts` + `src/tools/*.ts` — one file per tool family (plans, tasks, notes,
  activity, output, search, commit, agent-conversations, …); start here to add or change a tool.
- `src/nest/openthrottle-mcp-mcp-surface.ts` — the MCP surface wired into NestJS.
- `src/auth/get-auth-token.ts` — bearer-token resolution, exported via the `./auth` subpath.
- `src/graphql/**/*.graphql` → `src/__generated__/` — codegen output; edit documents, never `__generated__`.
- `docs/verification-environment.md` — the canonical local services/env/smoke checklist.

## Invariants & gotchas

- **GraphQL-only boundary.** Every tool talks to `openthrottle-server` over GraphQL; there is
  **no** direct Postgres access here. Add a server resolver + a document under `src/graphql/`, not
  a DB query.
- Built package (real `build` target shipping `dist/`), and one `openthrottle-server` consumes
  transitively — keep top-level `exports` → `dist` (see [../AGENTS.md](../AGENTS.md)).
- **Auth model:** most tools use a service-account token (`ot_sa_…`) from
  `OPENTHROTTLE_MCP_AUTH_TOKEN`, **not** a human JWT. The three `agent_conversation_*` read tools
  are the exception — they require a **human JWT** and reject service tokens with
  `403 Human authentication required`. See [docs/AUTH.md](docs/AUTH.md).
- **Launcher env:** `run-openthrottle-mcp.sh` probes candidate servers (stable/root checkout first,
  then docker, then `localhost:6021`), then exports both `API_URL` and `API_URL_INTERNAL` to the
  chosen live URL and reads `OPENTHROTTLE_MCP_AUTH_TOKEN` from `.env` (worktree then root). Don't
  reintroduce `source ./.env` — the targeted-read rewrite exists to avoid worktree env side effects.
- `agent_conversation_*` (web chat threads) and `plan_output_stream` (`get_plan_output` /
  `append_plan_output` / `delete_plan_output`, Ralph/plan iteration logs) are distinct data
  sources — don't cross them. `delete_plan_output` removes a single chunk (`chunkId`) or clears a
  plan's output (optionally scoped to `taskId`); it delegates to the `deletePlanOutput` mutation.

## Don't

- Don't add a direct database dependency or bypass GraphQL for "just this one query".
- Don't hand-edit `src/__generated__/`.

## Pointers

- [README.md](./README.md) — full tool table, auth exceptions, registration.
- [docs/AUTH.md](docs/AUTH.md) — service-account vs human-JWT setup, rotation, Cursor config.
- [docs/verification-environment.md](docs/verification-environment.md) — local verification env.
- [docs/agent-conversation-read-tools-contract.md](docs/agent-conversation-read-tools-contract.md) — conversation-tool contract.
- Registration guide: [docs/openthrottle/mcp-registration.md](../../docs/openthrottle/mcp-registration.md).
