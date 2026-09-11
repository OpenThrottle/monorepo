# @openthrottle/agentic-hooks — agent notes

Skill-usage telemetry for agent CLIs: one tool-neutral core, plus a thin per-tool **producer**
adapter that turns that tool's native hook payload into a `NormalizedInvocation` and delegates
everything else. Adapters are esbuild-bundled into self-contained `.cjs` hooks that require nothing
outside node builtins.

**Consumed by:** this repo's in-repo hook configs (`.claude/settings.json`, `.cursor/hooks.json`),
the distributable plugin payload under `plugins/openthrottle/`, and OT's drivers, which pass that
payload as `--plugin-dir` for orchestrated runs.

## Layout

- `src/index.ts` — public entry point; re-exports every module. Tag public API `@public` so Knip
  keeps it.
- `src/types.ts` — **the producer contract.** `NormalizedInvocation` is the seam every adapter
  targets; `UsageEvent` / `OutcomeEvent` are what the core builds from it.
- `src/adapters/<tool>/` — thin per-tool entrypoints **only**: `payload.ts` (a `<TOOL>_SOURCE`
  producer id + a normalizer) and one file per hook event. Nothing else belongs here.
- `src/utils/` — `scope.ts` (ours vs third-party), `privacy.ts` (truncation + secret redaction),
  `logging.ts`.
- `src/config/` — `env.ts`: endpoint resolution, git branch, the disable switches.
- `src/data/` — `events.ts` (event construction + GraphQL inputs), `persist.ts` (POST → JSONL
  fallback, correlation, drain), `starts.ts` (identifiers-only start records used to compute
  duration), `jsonl.ts`, `plan-runs.ts`.
- `scripts/bundle-hooks.ts` — the deterministic esbuild bundler and the generator for the plugin
  payload. Its `BUNDLES` list is the single source of truth for what gets bundled where.

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
- **Every hook is fail-open and exits 0.** Swallow every error, bound every network call, and never
  let a failure surface to the tool. A hook that can break the work it observes is worse than no
  hook.
- **Bundles are generated and diffed byte-for-byte. Never hand-edit them.** That covers every `.cjs`
  under a tool hook folder (`.claude/hooks/`, `.cursor/hooks/`, …) and everything under
  `plugins/openthrottle/`. Edit `src/`, then run
  `pnpm nx run @openthrottle/agentic-hooks:bundle-hooks`.
- **Adding a bundle means THREE edits, not one.** (1) the adapter under `src/adapters/<tool>/`,
  (2) a `BUNDLES` row in `scripts/bundle-hooks.ts`, (3) the new path in the `outputs` array of
  `bundle-hooks` **and** the `inputs` array of `bundle-hooks-check` in `package.json`. Miss the
  third and the file is generated but never drift-checked — it exists, and nothing notices when it
  rots.
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
