# @openthrottle/agentic-hooks

Skill-usage telemetry for agent CLIs: a tool-neutral core in TypeScript, plus per-tool adapters that
are bundled into self-contained `.cjs` hooks and a distributable Claude Code plugin.

Answers "which skills actually get used, how often, and did they succeed" by capturing a skill
invocation as it starts and correlating an outcome and a duration when the session ends.

## How it is organized

```
src/
  types.ts                 the producer contract every adapter satisfies
  adapters/<tool>/         thin per-tool entrypoints: CLI payload → neutral event
  utils/scope.ts           ours vs third-party
  utils/privacy.ts         args truncation + secret redaction, before anything leaves the machine
  data/events.ts           neutral event construction + the GraphQL mutations
  data/persist.ts          POST to OT, JSONL fallback, outcome correlation, drain
  data/starts.ts           identifiers-only start records used to compute duration
```

Adapters stay deliberately thin. Everything a second tool would otherwise duplicate — scope, privacy,
event shape, persistence, correlation — lives in the neutral core, so adding a tool means writing a
payload normalizer and nothing else.

## Two consumers, one set of sources

Everything ships through `bundle-hooks`, which esbuild-bundles each adapter into a **self-contained
CommonJS file that requires nothing outside node builtins**. That is what lets a hook run as bare
`node x.cjs` in a fresh checkout or worktree with no `node_modules` present.

1. **In-repo hooks** — `.claude/hooks/*.cjs` and `.cursor/hooks/*.cjs`, wired by this repo's
   `.claude/settings.json` and `.cursor/hooks.json`.
2. **The plugin payload** — `plugins/openthrottle/`, the same bundles wired to
   `${CLAUDE_PLUGIN_ROOT}`-relative commands so hooks reach repositories this repo's settings can
   never touch. It is installed from a marketplace by humans, and passed as `--plugin-dir` by OT's
   drivers for orchestrated runs. See
   [child-repo-hook-overlay.md](../../docs/monorepo/child-repo-hook-overlay.md).

```bash
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks        # regenerate everything
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks-check  # drift gate (runs in check:local)
```

Generated output is committed and diffed **byte-for-byte**, so the bundler is pinned and
deterministic: fixed esbuild version, `minify: false`, no sourcemap, and a banner with no timestamp.
Never hand-edit a `.cjs` or anything under `plugins/openthrottle/` — edit `src/` and regenerate.

## Fail-open is the whole posture

A hook runs on the critical path of a tool call, so it is never allowed to be the reason something
breaks. Every path swallows its errors and exits 0; a server post is bounded by a short timeout and
falls back to a local JSONL buffer; a missing endpoint is silent rather than noisy. Telemetry that can
break the work it observes is worse than no telemetry.

## Turning it off

| how                                  | effect                                 |
| ------------------------------------ | -------------------------------------- |
| `SKILL_USAGE_DISABLE_SERVER=1`       | buffers locally, never posts           |
| `OPENTHROTTLE_HOOK_PLUGIN_ENABLED=0` | OT drivers stop passing `--plugin-dir` |
| `/plugin uninstall openthrottle`     | removes the installed plugin entirely  |

## Related

- [child-repo-hook-overlay.md](../../docs/monorepo/child-repo-hook-overlay.md) — how hooks reach child
  repositories, and why the skill materializer was not extended to do it.
- [child-repo-hook-telemetry-contract.md](../../docs/monorepo/child-repo-hook-telemetry-contract.md) —
  what a hook may do in a repository OT does not own.
- [agent-cli-hook-capability-matrix.md](../../docs/monorepo/agent-cli-hook-capability-matrix.md) — hook
  and plugin surfaces across all five agent CLIs.
