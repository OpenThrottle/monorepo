# @openthrottle/agentic-hooks — agent notes

Skill-usage telemetry for agent CLIs: one tool-neutral core, plus a thin per-tool **producer**
adapter that turns that tool's native hook payload into a `NormalizedInvocation` and delegates
everything else. Adapters are esbuild-bundled into self-contained `.cjs` hooks that require nothing
outside node builtins.

**Consumed by:** the plugin payloads under `plugins/` (Claude `openthrottle`, `openthrottle-workflow`,
`openthrottle-guards`; Cursor `openthrottle-cursor`, `openthrottle-cursor-guards`; Codex
`openthrottle-codex`). This repo loads them in place through the generated dev marketplace and
`.cursor/hooks.json`, OT's drivers pass them as `--plugin-dir` (`pluginDirRels`), and the public
marketplace installs them from `plugins-dist`. Hooks ship nowhere else: there are no
`.claude/hooks/`, `.cursor/hooks/` or `.codex/hooks/` bundles. Design:
[hook-plugin-distribution.md](../../docs/monorepo/hook-plugin-distribution.md).

## Layout

- `src/index.ts` — public entry point; re-exports every module. Tag public API `@public` so Knip
  keeps it.
- `src/types.ts` — **the producer contract.** `NormalizedInvocation` is the seam every adapter
  targets; `UsageEvent` / `OutcomeEvent` are what the core builds from it.
- `src/adapters/<tool>/` — thin per-tool entrypoints **only**: `payload.ts` (a `<TOOL>_SOURCE`
  producer id + a normalizer) and one file per hook event. Nothing else belongs here, except the
  tool's own transcript handling: Claude's lives in `transcript.ts` (line → `TokenUsageRecord`, no
  I/O) and `transcript-usage.ts` (checkpointed read at `Stop`; also reads the session's
  `subagents/agent-*.jsonl`, so `SubagentStop` need not be registered). The file offsets,
  checkpoints and sending stay in `src/data/`. The one-off operator backfill (`backfill.ts`, bundled
  by no payload, run as `pnpm run telemetry:backfill`, registered as no hook) reuses that reader through
  `transcript-backfill.ts`, `transcript-skills.ts` and `transcript-projects.ts`; see the README's
  "Backfilling from transcripts".
- `src/utils/` — `scope.ts` (ours | personal | third-party), `privacy.ts` (truncation + secret redaction),
  `logging.ts`.
- `src/config/` — `env.ts`: endpoint resolution by location, the OpenThrottle-checkout
  predicate, git branch, the disable switches.
- `src/data/` — `events.ts` (event construction + GraphQL inputs), `persist.ts` (POST → JSONL
  fallback, correlation, drain), `starts.ts` (identifiers-only start records used to compute
  duration), `jsonl.ts`, `plan-runs.ts` (backstop notes under `~/.openthrottle/skill-usage/plan-runs/<repo-hash>/`, never `<repo>/.cache/`). Token usage: `token-usage.ts` (row mapping + batch POST,
  `persistTokenUsage` in `persist.ts`, buffered to `token-usage.jsonl`), `checkpoints.ts` (per-session
  byte offsets, `checkpoints/<session>.json`) and `read-new.ts` (complete-lines-only readers).
  Keep the word "cursor" out of the core: the neutrality test bans it.
- `scripts/bundle-hooks.ts` — the deterministic esbuild bundler and the generator for every plugin
  payload (stubs, manifests, `hooks.json`, READMEs, the dev marketplace). Its payload definitions and
  their `PluginEntry` rows are the single source of truth for what gets bundled where.
- `scripts/assemble-plugins-dist.ts` — builds the tree `publish-plugins.yml` pushes to `plugins-dist`.

## Invariants & gotchas

Each of these is a rule you can fail, not a description.

- **The neutral core must contain no tool-specific identifier.** No file under `src/` outside
  `src/adapters/` may name a tool, in code or in comments. A test enforces this with a short,
  explicitly-argued allowlist — adding to that allowlist is an argument you have to make, not a
  formality. If you need a tool name in the core, you almost certainly need a new field on
  `NormalizedInvocation` instead.
- **Anything a second tool would duplicate goes in the core, not the adapter.** If a new producer
  cannot reuse a core function, that is a signal the core function is not neutral enough. Fix it
  there; do not fork the logic into the adapter.
- **This package ships into repositories that are not ours; it must leave no trace in them.** Two
  rules carry that, and both fail closed. The `<repoRoot>/.env` layer is gated on
  `isOpenThrottleCheckout` — an ambiguous checkout counts as foreign, so the worst case is telemetry
  that buffers rather than a stranger's `.env` being opened. And every buffered artifact goes to
  `~/.openthrottle/skill-usage/`, never under a repo root; the path helpers take no `repoRoot`
  argument precisely so a future caller cannot reintroduce one. A foreign-repo run must leave
  `git status` clean.
- **Configuration is resolved by location, under `OPENTHROTTLE_*` names only.** Repo `.env` (OT
  checkouts), then process env, then `~/.openthrottle/.env`. The repo layer outranks the ambient
  shell on purpose: an OT worktree runs its own server on its own port, and a stale parent shell
  must not divert that worktree's capture to a sibling's schema. Do not add a second name for a
  value that already has one — a `SKILL_USAGE_*` vocabulary existed alongside `OPENTHROTTLE_*` for
  exactly that reason and cost a debugging session before it was removed.
- **A configuration path named in a README must be one the code reads.** `~/.openthrottle/hooks.json`
  was advertised in both plugin READMEs from the day they shipped and read by nothing, which is how
  a foreign-repo user was left with no working way to configure an endpoint. Grep before you
  document.
- **Every hook is fail-open and exits 0.** Swallow every error, bound every network call, and never
  let a failure surface to the tool. A hook that can break the work it observes is worse than no
  hook.
- **Everything under `plugins/` is generated. Never hand-edit it.** That is the committed stubs in
  `hooks/` and `bin/`, manifests, `hooks.json`, READMEs and the dev marketplace, plus the
  gitignored `dist/` bundles. Edit `src/` or `scripts/bundle-hooks.ts`, then run
  `pnpm nx run @openthrottle/agentic-hooks:bundle-hooks` (or `pnpm run build:hooks` for `dist/`).
  `bundle-hooks-check` diffs committed files only; it still builds every bundle in memory.
- **Bundles are not committed on `main`.** `dist/` is gitignored and `build:hooks` fills it; the
  stubs require `dist/<file>` and exit 0 if it is missing, so an unbuilt checkout is fail-open. A
  hook change that needs a built bundle to take effect needs `pnpm run build:hooks` first.
  `publish-plugins.yml` publishes built payloads to `plugins-dist`, manifests without `version`.
- **Adding a bundle is ONE edit in the generator, plus the adapter.** (1) the adapter under
  `src/adapters/<tool>/`, (2) a `PluginEntry` row in the right payload in `scripts/bundle-hooks.ts`.
  The Nx `outputs` and `inputs` are `plugins/**` globs, so `package.json` needs no change. A _new
  payload directory_ also needs its own entry in `.prettierignore` in the same commit (the
  `.gitattributes` globs already cover `plugins/*/`); add it to the driver's `pluginDirRels` if
  orchestrated runs should load it.
- **Payload hooks never double-fire in this repo.** Committed `.claude/settings.json` enables the
  `@openthrottle-dev` plugin ids and disables the public `@openthrottle` ones. Test a branch's own
  hooks with `claude --plugin-dir ./plugins/<p>`.
- **Operator CLIs:** `doctor`, `drain` and `outcome` ship in the telemetry plugin's `bin/`;
  `backfill`, `resegment` and `scope` are bundled nowhere and run from source
  (`pnpm run telemetry:<name>`).
- **The bundler is pinned and deterministic** — catalog-pinned esbuild, `minify: false`, no
  sourcemap, `legalComments: 'none'`, and a banner with no date. Do not add anything time-, path-,
  or environment-varying to the banner or to generated output; the drift gate diffs bytes.
- **Source-first package: there is no real `build` target** (`__build` is the placeholder
  discriminator). Validate with `lint` / `typecheck` / `test`; do not add a `build` target.
- **Producer ids are durable data.** `<TOOL>_SOURCE` values land in `skill_usage_events.source` and
  `skill_usage_outcomes.source`, which are free-text and un-constrained precisely so that adding a
  producer needs no migration. Renaming one silently splits a tool's history in two.

## Pointers

- [README.md](README.md) — the producer contract, the producer matrix, and the "adding a producer"
  recipe.
- [../../docs/monorepo/agent-cli-hook-capability-matrix.md](../../docs/monorepo/agent-cli-hook-capability-matrix.md) —
  what each agent CLI's hook and plugin surface actually supports, measured against binaries.
- [../../docs/monorepo/child-repo-hook-overlay.md](../../docs/monorepo/child-repo-hook-overlay.md) —
  how hooks reach repositories this repo's config cannot write.
- [../../docs/monorepo/child-repo-hook-telemetry-contract.md](../../docs/monorepo/child-repo-hook-telemetry-contract.md) —
  what a hook may do in a repository OT does not own.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout, `@public` tags,
  source-first pattern).
