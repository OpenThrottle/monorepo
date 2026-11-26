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
  scripts/<tool>-<hook>.ts thin per-tool entrypoints (the esbuild bundle roots)
  utils/<tool>-payload.ts  per-tool native payload → NormalizedInvocation
  utils/scope.ts           ours | personal | third-party
  utils/privacy.ts         args truncation + secret redaction, before anything leaves the machine
  config/env.ts            endpoint + git branch resolution
  data/events.ts           neutral event construction + the GraphQL mutations
  data/persist.ts          POST to OT, JSONL fallback, outcome correlation, drain
  data/starts.ts           identifiers-only start records used to compute duration
```

A machine-checked test enforces this: no file under `src/` other than the per-agent ones (`src/scripts/` and `src/utils/` files that start with an agent name,
such as `claude-`) may name a specific tool. See [Neutrality is tested, not just asserted](#neutrality-is-tested-not-just-asserted).

## Producer matrix

Every row is a tool we can observe. Columns are the three things a producer needs: a **capture**
path, a **completion** path (outcome + duration), and a **delivery** leg that gets the bundle in
front of the running agent.

Delivery comes in three shapes, and which one a tool supports is a property of the tool, not a choice
we make:

- **in-repo hooks** — this repo loads its own payloads in place (Claude through the generated dev
  marketplace, Cursor through `.cursor/hooks.json`). Covers work in this repo only.
- **plugin payload** — a directory under `plugins/` passed as a per-invocation directory flag, or
  installed once from a marketplace. Reaches repositories whose config we can never write.
- **home-dir config** — the tool reads hooks from the operator's home directory, so there is nothing
  to inject at all; delivery is documentation.

| producer          | capture                                          | completion (outcome + duration) | delivery                        | status   |
| ----------------- | ------------------------------------------------ | ------------------------------- | ------------------------------- | -------- |
| **`claude-code`** | ✅ `PreToolUse`(`Skill`) + `UserPromptExpansion` | ✅ `Stop`                       | in-repo hooks + plugin payload  | complete |
| **`cursor`**      | ✅ `preToolUse` (a `Read` of `SKILL.md`)         | ✅ `sessionEnd`                 | in-repo hooks + plugin payload  | complete |
| **`codex`**       | ✅ `PreToolUse` (`cat` of `SKILL.md`) + slash    | ✅ `SessionEnd`                 | home-dir config (documentation) | complete |

Each row is measured against the installed binary, not read off a docs site:
[cursor-agent-hook-probe.md](../../docs/monorepo/cursor-agent-hook-probe.md),
[codex-cli-hook-probe.md](../../docs/monorepo/codex-cli-hook-probe.md).

Two rows carry caveats worth stating rather than smoothing over:

- **`cursor` has no `Skill` tool.** A skill invocation is only observable as a `Read` of the skill's
  `SKILL.md`, so it is recorded under its own `invocation_path` (`skill_read`) rather than reusing
  `skill_tool`. It is a genuinely weaker signal — an agent editing skills reads them too — and the
  data stays separable instead of looking falsely comparable.
- **`codex` has no `Skill` tool either.** Measured on `codex-cli 0.167.0`, it loads a filesystem
  skill by running `cat <path>/SKILL.md` through its `Bash` tool, so it records under the same
  `skill_read` path as `cursor`. Only that exact command shape matches (one `cat`, one path, no
  pipes or chains); any other way of reading the file returns null rather than a guess, so a change
  in how codex loads skills shows up as missing rows, not as wrong ones.

Every one of these, and **`antigravity`**, also sends the coverage heartbeat on its session-start
event (contract §8). For antigravity that is the only hook: it ships in the generated workspace
plugin `.agents/plugins/openthrottle/`, with no skill capture or completion yet.

Tools with no row yet are not necessarily unreachable; see
[agent-cli-hook-capability-matrix.md](../../docs/monorepo/agent-cli-hook-capability-matrix.md) for
what each CLI's hook and plugin surface actually supports, measured against installed binaries.

## Adding a producer

Four steps, in order.

1. **Write the adapter.** `src/utils/<tool>-payload.ts` exporting a `<TOOL>_SOURCE` producer id
   and a normalizer returning `NormalizedInvocation | null`, plus `src/scripts/<tool>-capture.ts` as
   the entrypoint. Add a completion entrypoint too if the tool exposes a usable session-end event.
2. **Register the bundle.** Add a `PluginEntry` row to a payload in
   [scripts/bundle-hooks.ts](scripts/bundle-hooks.ts). That is the only registration: the Nx
   `outputs` and `inputs` are globs over `plugins/`. Add the entrypoint's `src/` path to
   `sideEffects` too — it runs `main()` on import, and `check-side-effects` fails without it.
3. **Wire the tool's hook config** (the payload's `renderHooks`) to the new handler, using the
   tool's real event names.
4. **Regenerate:** `pnpm nx run @openthrottle/agentic-hooks:bundle-hooks`, and commit the stub,
   manifest, `hooks.json` and README it writes. The bundle goes to the gitignored `dist/`.

Write tests against **captured real payloads**, including negative cases. A normalizer written
against a guessed shape cannot tell "not a skill invocation" from "the shape changed underneath us",
and will report the first while meaning the second.

### Delivering to `codex`

`codex` reads hooks from the operator's home directory rather than any repository, so there is
nothing to inject — delivery is this block, run once:

```toml
# ~/.codex/config.toml
[[hooks.PreToolUse]]
[[hooks.PreToolUse.hooks]]
type = "command"
command = "/absolute/path/to/openthrottle/plugins/openthrottle-codex/hooks/skill-usage-capture.cjs"

[[hooks.UserPromptSubmit]]
[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = "/absolute/path/to/openthrottle/plugins/openthrottle-codex/hooks/skill-usage-capture.cjs"

[[hooks.SessionEnd]]
[[hooks.SessionEnd.hooks]]
type = "command"
command = "/absolute/path/to/openthrottle/plugins/openthrottle-codex/hooks/skill-usage-complete.cjs"

[[hooks.SessionStart]]
[[hooks.SessionStart.hooks]]
type = "command"
command = "/absolute/path/to/openthrottle/plugins/openthrottle-codex/hooks/skill-usage-heartbeat.cjs"
```

The `SessionStart` entry sends the coverage heartbeat
([contract §8](../../docs/monorepo/child-repo-hook-telemetry-contract.md#8-coverage-heartbeat)), so
`/usage` → Telemetry coverage can list the machine. A bundle that lives outside the session's
repository, as it does here, reports the `plugin-dir` leg.

`codex doctor` reports whether the file parsed. `-c hooks.…=…` and `CODEX_HOME` give per-invocation
control.

**The trust gate.** Codex refuses to run hooks it has not persisted trust for.
`--dangerously-bypass-hook-trust` skips that check for one invocation, and the help text means what
it says: "DANGEROUS. Intended only for automation that already vets hook sources."

Use it for **OT's own orchestrated runs**, where the hook bundles are built from this repo's own
source by `pnpm run build:hooks` — the source is vetted by construction. Do **not** reach for it as a
convenience in an interactive shell, or anywhere the hook commands could come from somewhere
unaudited. Trusting once, interactively, is the cheap and correct thing there.

## Backfilling from transcripts

`pnpm run telemetry:backfill` is a one-off, **operator-run** CLI (no hook registers it, and no plugin
payload ships it; `resegment` and `scope` are the same, run as `pnpm run telemetry:<name>`) that recovers what live capture missed from this repository's Claude Code
transcripts: skill invocations in a time window, and per-request token usage.

```bash
pnpm run telemetry:backfill --dry-run   # counts per stream, day and project; sends nothing
pnpm run telemetry:backfill             # send; re-running is a no-op
```

Flags: `--since <ISO>` (default `2026-09-23`, inclusive) and `--until <ISO>` (default now, exclusive)
bound the **skill** window only; tokens are not windowed. `--projects-dir <path>` (default
`~/.claude/projects`), `--repo-root <path>`, `--no-worktrees`, `--timeout-ms <n>`.

- **Only this repo is read.** The projects directory is never listed. The slugs of this repository's
  checkouts (its root plus `git worktree list`) are derived and only those directories are opened;
  a transcript whose recorded `cwd` is outside the checkouts is refused.
- **Idempotent.** Token rows use `(source, session_id, request_id)`. Skill rows reuse the live
  `hook_event_name` and the transcript's `tool_use_id` (Skill tool) or `promptId` + skill (slash
  command), so they dedupe against themselves **and** against a live capture of the same invocation.
- **Backfilled rows are identifiable** by `invocation_path` ending in `:backfill`
  (`skill_tool:backfill`, `slash:backfill`) — that column is in no unique key.
- A real run refuses to start with no endpoint (rather than buffering thousands of rows); transient
  failures buffer for `skill-usage-drain`, permanent rejections are dead-lettered. A schema-skew
  rejection (a server older than the hooks) is transient, never dead-lettered.

## Bundling

Everything ships through `bundle-hooks`, which esbuild-bundles each adapter into a **self-contained
CommonJS file that requires nothing outside node builtins**. That is what lets a hook run as bare
`node x.cjs` with no `node_modules` present.

Bundles are **not committed on `main`**. They land in each payload's gitignored
`plugins/<payload>/dist/`; what is committed is a fixed stub in `hooks/` and `bin/` that requires
`dist/<file>` and exits 0 if it is unbuilt, plus the manifest, `hooks.json` and README. Design and
measurements: [hook-plugin-distribution.md](../../docs/monorepo/hook-plugin-distribution.md).

```bash
pnpm run build:hooks                                          # build dist/ (setup, worktree provisioning, server dev, husky post-merge/post-checkout run it)
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks          # the target behind it; also rewrites committed stubs and manifests
pnpm nx run @openthrottle/agentic-hooks:bundle-hooks-check    # drift gate (runs in check:local); diffs committed files only
```

`.github/workflows/publish-plugins.yml` publishes the built payloads, manifests without a `version`,
to the `plugins-dist` branch that the root `.claude-plugin/marketplace.json` installs from.

The bundler is pinned and deterministic: fixed esbuild version, `minify: false`, no sourcemap, and a
banner with no timestamp. Never hand-edit a stub, a README or a `dist/` file — edit `src/` or the
generator and regenerate. Plugin READMEs are rendered from `scripts/bundle-hooks.ts`.

The root [`.gitattributes`](../../.gitattributes) marks the committed generated files
`linguist-generated=true`, so GitHub collapses them in "Files changed". `git blame` on a stub says
nothing useful, and a published bundle's header banner names its `Source:` path.

## Fail-open is the whole posture

A hook runs on the critical path of a tool call, so it is never allowed to be the reason something
breaks. Every path swallows its errors and exits 0; a server post is bounded by a short timeout and
falls back to a local JSONL buffer; a missing endpoint is silent rather than noisy. Telemetry that can
break the work it observes is worse than no telemetry.

This is non-negotiable and applies to every producer, present and future.

## Neutrality is tested, not just asserted

Documentation does not stop the next feature from landing a tool-shaped concept in the core — that is
exactly how the current divergence happened. A test walks every `.ts` file under `src/` **excluding**
the per-agent files (`<agent>-*.ts` in `scripts/` and `utils/`) and fails on any tool-specific identifier, in code or comments, with a short
explicitly-argued allowlist for the handful of legitimate prose references.

If you find yourself needing a tool name in the core, you probably need a new field on
`NormalizedInvocation` instead.

## Turning it off

Tool-neutral, applies to every producer:

| how                                | effect                       |
| ---------------------------------- | ---------------------------- |
| `OPENTHROTTLE_TELEMETRY_OFFLINE=1` | buffers locally, never posts |

Delivery-specific, and only meaningful where that delivery leg exists:

| how                                  | scope            | effect                                  |
| ------------------------------------ | ---------------- | --------------------------------------- |
| `OPENTHROTTLE_HOOK_PLUGIN_ENABLED=0` | plugin payload   | OT drivers stop passing `--plugin-dir`  |
| `/plugin uninstall openthrottle`     | Claude Code only | removes the installed plugin entirely   |
| `OPENTHROTTLE_CLAUDE_PLUGINS=0`      | this repo        | setup skips the dev-marketplace install |

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
