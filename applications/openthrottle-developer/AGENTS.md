# openthrottle-developer — agent notes

The flagship developer portal (React Router v8 + Vite): plans, tasks, projects, notes,
generators, prompts, pull requests, the in-app IDE, and repo-skills discovery. Talks only to
`openthrottle-server` over GraphQL. See [README.md](./README.md) for the feature tour and
[docs/monorepo/openthrottle-developer-vite-devtools.md](../../docs/monorepo/openthrottle-developer-vite-devtools.md)
for devtools/profiling/troubleshooting.

**Consumed by:** nothing — deployable app (dev port 6020; env in [.env.default](./.env.default)).

## Commands

- `pnpm nx run openthrottle-developer:dev` — Vite dev server on 6020; needs `openthrottle-server`
  reachable at `API_URL_INTERNAL`/`API_URL_EXTERNAL` (default 6021).
- Codegen is **two divergent passes**: this app's `codegen-graphql` (from [codegen.ts](./codegen.ts),
  `enumsAsTypes: true` → type-only enums into `app/__generated__/`) and a separate
  `packages/openthrottle-developer-codegen` pass that omits the flag to emit _runtime_ enum
  objects (e.g. `CustomPromptType.Agents`, imported by `PlansTable`/`PromptsTable`). Read both
  headers before touching either — do not "consolidate" them.

## Layout

- `app/routes/` — `flatRoutes` (dotted flat filenames, e.g. `plans.$planId._index.tsx`) with a
  co-located `<route>.tsx.graphql` document per route. Route modules stay thin.
- `app/routing/<area>/` — feature folders (`components/`, `data/`, `hooks/`, `utils/`, `config/`)
  behind the `~/*` alias. `plans/` is the largest and the reference decomposition (see gotchas).
- `app/entry.server.tsx` + `app/global/config/csp.ts` — CSP nonce minting and the shared streaming
  render (see gotchas).
- `app/testing/route-fixtures.tsx` — isolated route-UI harness (replaces Storybook); prioritized
  modules in [docs/routing-modules-debug-harness.md](./docs/routing-modules-debug-harness.md).
- `docs/` — per-feature design docs (repo-skills discovery, commander/search entrypoints, settings
  Debug/Logs tabs). Read the matching one before touching that area.

## Invariants & gotchas

- **Plans route decomposition is the pattern to follow.** `plans.$planId._index.tsx` was a god
  route (#136); loader/subscription-teardown logic now lives in extracted hooks
  (`app/routing/plans/hooks/usePlanRunConfigEditor`, `usePlanLifecycleRevalidation`) and utils, with
  presentational pieces like `PlanWorkflowConfigHookRow` split into `app/routing/plans/components/`.
  Keep new work in that shape; do not grow the route file back up.
- **Fresh worktrees fail Vitest at collection** until codegen runs — suites import from
  `app/__generated__/` (`graphql.ts`, `gql.ts`, and this app's unique `testing.ts` mock factory).
  Run `pnpm nx run openthrottle-developer:codegen-graphql` (or the workspace-wide codegen) first;
  the old `VITEST_FAILURE_BASELINE.md` is obsolete.
- **CSP is nonce-based report-only** (#143). `entry.server.tsx` mints a per-request nonce, calls the
  shared `buildCsp(nonce, getCspOptions())`, sets the header, and threads the same nonce into
  `root.tsx` so inline bootstrap scripts match. Only per-app origins and the `reportOnly` flag live
  in `app/global/config/csp.ts`; the builder forces report-only outside `NODE_ENV=production`, so
  flipping `reportOnly` only affects prod. Add third-party origins via the `additional*Src` arrays,
  never by loosening the shared builder.
- **Skills route reads the filesystem, not a TS registry.** `/skills` and the agents area discover
  skills from `.agents/skills` (the SSOT view; `.claude/skills` fan-out deduped in) at request time via
  `app/routing/agents/data/resolve-monorepo-root.server.ts`. Root resolution: `WORKSPACE_ROOT` env
  (same var as the server — never invent `MONOREPO_ROOT`), else walk up ≤12 levels for a dir with
  both `nx.json` and `pnpm-workspace.yaml`, else `null` (empty list, no throw — deployed builds
  without a checkout). Design: [docs/repo-skills-discovery-design.md](./docs/repo-skills-discovery-design.md).
- **Voice input** (#142): push-to-talk on the home commander via `app/routing/home/hooks/useVoiceInput.tsx`
  - `useTranscriptionStream.tsx`, streaming to a local WhisperLive instance — a dev-only external
    dependency; the feature degrades when it is unreachable.
- `tests/setup.ts` keeps app-local jsdom shims (no-op WebGL2 context + a `visualViewport`
  stand-in for `@paper-design/shaders` on the auth screen); these stay here, not in the shared
  testing package.
- Prompts: routes live at `/prompts/*` (legacy `/custom-prompts/*` redirect), but GraphQL still
  uses the `customPrompt`/`customPrompts` fields — don't rename the operations to match the URLs.
- **Agent-CLI setup** (`/settings/setup`): read-only status of the agent CLIs (installed/version
  from `discoverAgentClis`) always renders; the Install/Update controls are gated by the
  server-computed `agentCliSetupConfig { canManage, installEnabled }` — the client has no
  permission data, so the loader must fetch those booleans and pass them down (never infer from
  client identity). Runs stream over `agentSetupChunkAdded` via `useAgentSetupStream`. The feature
  is default-off on the server (`OT_AGENT_CLI_INSTALL_ENABLED`) — a local-dev tool, not for
  hosted deploys. CLI auth/login is out of scope.

- **Route actions validate `FormData` through the generated Zod schema**, not
  hand-rolled field reads. Use `parseFormData` from
  `@openthrottle/react-router-graphql` + a `~/__generated__/schemas` input schema
  (`.omit()` route-param ids, then assemble). See
  [packages/graphql-codegen/README.md](../../packages/graphql-codegen/README.md).
  Don't add new `formData.get` + `typeof === 'string'` + `.trim()` + empty-check
  helpers.

## Don't

- Don't hand-edit `app/__generated__/*` — regenerate via codegen.
- Don't add a `build` target debate here: `dev`/`build`/`start`/`typecheck` are the plugin-inferred
  targets (root/area docs); the inferred `typecheck` is renamed `__NOT_USED__typecheck` and the real
  one comes from the local nx plugin.

## Pointers

- [README.md](./README.md) — feature tour, Skills page requirements, Prompts UI.
- [docs/](./docs/) — repo-skills discovery, commander/search entrypoints, settings tab specs.
- [tests/e2e/README.md](./tests/e2e/README.md) — canonical Maestro-against-prod-build write-up.
