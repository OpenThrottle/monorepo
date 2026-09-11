# @openthrottle/agentic-hooks

Skill-usage telemetry for agent CLIs: one tool-neutral core in TypeScript, plus a thin per-tool
**producer** adapter for every agent we can observe.

Answers "which skills actually get used, how often, and did they succeed" by capturing a skill
invocation as it starts and correlating an outcome and a duration when the session ends.

## The producer contract

`NormalizedInvocation` in [src/types.ts](src/types.ts) is the seam, and it is the only thing an
adapter exists to produce:

```
native hook payload  ──(adapter)──▶  NormalizedInvocation  ──▶  everything else
```

An adapter's whole job is that one arrow. Scope detection, privacy/redaction, event construction,
persistence, outcome correlation and drain are **neutral and MUST NOT be reimplemented per tool** —
if a second producer would duplicate it, it belongs in the core.

```
src/
  types.ts                 the producer contract every adapter satisfies
  adapters/<tool>/         thin per-tool entrypoints: native payload → NormalizedInvocation
  utils/scope.ts           ours vs third-party
  utils/privacy.ts         args truncation + secret redaction, before anything leaves the machine
  config/env.ts            endpoint + git branch resolution
  data/events.ts           neutral event construction + the GraphQL mutations
  data/persist.ts          POST to OT, JSONL fallback, outcome correlation, drain
  data/starts.ts           identifiers-only start records used to compute duration
```

A machine-checked test enforces this: no file under `src/` outside `src/adapters/` may name a
specific tool. See [Neutrality is tested, not just asserted](#neutrality-is-tested-not-just-asserted).

## Producer matrix

Every row is a tool we can observe. Columns are the three things a producer needs: a **capture**
path, a **completion** path (outcome + duration), and a **delivery** leg that gets the bundle in
front of the running agent.

Delivery comes in three shapes, and which one a tool supports is a property of the tool, not a choice
we make:

- **in-repo hooks** — this repo's own hook config points at `.<tool>/hooks/*.cjs`. Covers work in
  this repo only.
- **plugin payload** — a generated directory passed as a per-invocation directory flag, or installed
  once from a marketplace. Reaches repositories whose config we can never write.
- **home-dir config** — the tool reads hooks from the operator's home directory, so there is nothing
  to inject at all; delivery is documentation.

| producer          | capture                                          | completion (outcome + duration) | delivery                        | status                         |
| ----------------- | ------------------------------------------------ | ------------------------------- | ------------------------------- | ------------------------------ |
| **`claude-code`** | ✅ `PreToolUse`(`Skill`) + `UserPromptExpansion` | ✅ `Stop`                       | in-repo hooks + plugin payload  | complete                       |
| **`cursor`**      | ✅ `preToolUse` (a `Read` of `SKILL.md`)         | ✅ `sessionEnd`                 | in-repo hooks + plugin payload  | complete                       |
| **`codex`**       | ⚠️ `UserPromptSubmit` slash commands only        | ✅ `SessionEnd`                 | home-dir config (documentation) | slash path only — see the note |

Each row is measured against the installed binary, not read off a docs site:
[cursor-agent-hook-probe.md](../../docs/monorepo/cursor-agent-hook-probe.md),
[codex-cli-hook-probe.md](../../docs/monorepo/codex-cli-hook-probe.md).

Two rows carry caveats worth stating rather than smoothing over:

- **`cursor` has no `Skill` tool.** A skill invocation is only observable as a `Read` of the skill's
  `SKILL.md`, so it is recorded under its own `invocation_path` (`skill_read`) rather than reusing
  `skill_tool`. It is a genuinely weaker signal — an agent editing skills reads them too — and the
  data stays separable instead of looking falsely comparable.
- **`codex` captures slash commands only.** Its `PreToolUse` carries `tool_name`/`tool_input`, so a
  tool-shaped invocation is observable in principle, but which `tool_name` a skill produces has not
  been captured. The branch is deliberately omitted rather than written against a guess — a
  normalizer that guesses cannot tell "not a skill invocation" from "the shape changed underneath
  us", which is exactly the bug `cursor` carried.

Tools with no row yet are not necessarily unreachable; see
[agent-cli-hook-capability-matrix.md](../../docs/monorepo/agent-cli-hook-capability-matrix.md) for
what each CLI's hook and plugin surface actually supports, measured against installed binaries.

## Adding a producer

Five steps, in order. Step 3 is the one that is easy to miss, and missing it silently drops the new
file from the drift gate — the bundle exists, and nothing ever notices when it rots.

1. **Write the adapter.** `src/adapters/<tool>/payload.ts` exporting a `<TOOL>_SOURCE` producer id
   and a normalizer returning `NormalizedInvocation | null`, plus `src/adapters/<tool>/capture.ts` as
   the entrypoint. Add a completion entrypoint too if the tool exposes a usable session-end event.
2. **Register the bundle.** Add a `BundleSpec` row to
   [scripts/bundle-hooks.ts](scripts/bundle-hooks.ts).
3. **Register the outputs in `package.json` — BOTH targets.** The new `.cjs` path must appear in the
   `outputs` array of `bundle-hooks` _and_ in the `inputs` array of `bundle-hooks-check`. The first
   makes Nx cache it; the second makes CI fail when it drifts.
4. **Wire the tool's own hook config** to the generated `.cjs`, using the tool's real event names.
5. **Regenerate:** `pnpm nx run @openthrottle/agentic-hooks:bundle-hooks`, and commit the output.

Write tests against **captured real payloads**, including negative cases. A normalizer written
against a guessed shape cannot tell "not a skill invocation" from "the shape changed underneath us",
and will report the first while meaning the second.

### Delivering to `codex`

`codex` reads hooks from the operator's home directory rather than any repository, so there is
nothing to inject — delivery is this block, run once:

```toml
# ~/.codex/config.toml
[[hooks.UserPromptSubmit]]
[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = "/absolute/path/to/openthrottle/.codex/hooks/skill-usage-capture.cjs"

[[hooks.SessionEnd]]
[[hooks.SessionEnd.hooks]]
type = "command"
command = "/absolute/path/to/openthrottle/.codex/hooks/skill-usage-complete.cjs"
```

`codex doctor` reports whether the file parsed. `-c hooks.…=…` and `CODEX_HOME` give per-invocation
control.

**The trust gate.** Codex refuses to run hooks it has not persisted trust for.
`--dangerously-bypass-hook-trust` skips that check for one invocation, and the help text means what
it says: "DANGEROUS. Intended only for automation that already vets hook sources."

Use it for **OT's own orchestrated runs**, where the hook bundles are generated here, committed, and
drift-checked byte-for-byte — the source is vetted by construction. Do **not** reach for it as a
convenience in an interactive shell, or anywhere the hook commands could come from somewhere
unaudited. Trusting once, interactively, is the cheap and correct thing there.

## Bundling

Everything ships through `bundle-hooks`, which esbuild-bundles each adapter into a **self-contained
CommonJS file that requires nothing outside node builtins**. That is what lets a hook run as bare
`node x.cjs` in a fresh checkout or worktree with no `node_modules` present.

```bash
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks        # regenerate everything
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks-check  # drift gate (runs in check:local)
```

Generated output is committed and diffed **byte-for-byte**, so the bundler is pinned and
deterministic: fixed esbuild version, `minify: false`, no sourcemap, and a banner with no timestamp.
Never hand-edit a generated `.cjs` or anything under a generated payload directory — edit `src/` and
regenerate.

## Fail-open is the whole posture

A hook runs on the critical path of a tool call, so it is never allowed to be the reason something
breaks. Every path swallows its errors and exits 0; a server post is bounded by a short timeout and
falls back to a local JSONL buffer; a missing endpoint is silent rather than noisy. Telemetry that can
break the work it observes is worse than no telemetry.

This is non-negotiable and applies to every producer, present and future.

## Neutrality is tested, not just asserted

Documentation does not stop the next feature from landing a tool-shaped concept in the core — that is
exactly how the current divergence happened. A test walks every `.ts` file under `src/` **excluding**
`src/adapters/` and fails on any tool-specific identifier, in code or comments, with a short
explicitly-argued allowlist for the handful of legitimate prose references.

If you find yourself needing a tool name in the core, you probably need a new field on
`NormalizedInvocation` instead.

## Turning it off

Tool-neutral, applies to every producer:

| how                            | effect                       |
| ------------------------------ | ---------------------------- |
| `SKILL_USAGE_DISABLE_SERVER=1` | buffers locally, never posts |

Delivery-specific, and only meaningful where that delivery leg exists:

| how                                  | scope            | effect                                 |
| ------------------------------------ | ---------------- | -------------------------------------- |
| `OPENTHROTTLE_HOOK_PLUGIN_ENABLED=0` | plugin payload   | OT drivers stop passing `--plugin-dir` |
| `/plugin uninstall openthrottle`     | Claude Code only | removes the installed plugin entirely  |

## Where the standards are

There is a community spec for **packaging** and none for **hooks**, and that split is the reason this
package looks the way it does.

- **Agent Plugins 1.0.0** standardizes the plugin _package_ — a manifest, skills, MCP servers. It
  **explicitly excludes hooks**, classing them with commands, agents and rules as too client-specific
  for a stable portable contract until their formats converge.
- So per-tool adapters are the **correct** architecture here, not a stopgap awaiting a spec. There is
  nothing to converge on yet.
- **OpenTelemetry's GenAI semantic conventions** are the nearest standard for the event _payload_ and
  are worth aligning field names toward, but were still pre-stable at the time of writing.

Full reasoning, versions checked, dates, and the revisit triggers:
[agentic-hooks-standards-adr.md](../../docs/monorepo/agentic-hooks-standards-adr.md).

## Related

- [child-repo-hook-overlay.md](../../docs/monorepo/child-repo-hook-overlay.md) — how hooks reach child
  repositories, and why the skill materializer was not extended to do it.
- [child-repo-hook-telemetry-contract.md](../../docs/monorepo/child-repo-hook-telemetry-contract.md) —
  what a hook may do in a repository OT does not own.
- [agent-cli-hook-capability-matrix.md](../../docs/monorepo/agent-cli-hook-capability-matrix.md) — hook
  and plugin surfaces across every agent CLI OT drives.
- [AGENTS.md](AGENTS.md) — the invariants an agent must respect when changing this package.
