# Skill-usage capture — cross-tool producer contract

Tool-neutral capture of **skill invocations** (ours, personal and third-party) that any AI
agent/editor can feed, persisted in OpenThrottle as the system of record and
surfaced on the Developer **Usage** route. See OT plans `d3759118` (base),
`f5e40886` (outcomes & duration), `21f150c6` (this package extraction).

> **Source of truth moved.** The capture core and every per-tool adapter now
> live in the workspace package **`@openthrottle/agentic-hooks`**
> (`packages/agentic-hooks`), authored in **TypeScript**. The `.cjs` files under
> each tool's hook folder are **generated bundles** — self-contained, committed,
> and **must not be hand-edited**. This folder no longer holds a hand-written
> `lib.cjs`/`adapter.template.cjs`.

```
producer hook payload → <tool adapter> → NormalizedInvocation
                          → buildUsageEvent({ normalized, source }) → persistUsageEvent
                          → OT GraphQL (recordSkillUsage)  |  JSONL fallback
```

## Where things live now

| Concern                                                                                                                    | Location                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Tool-neutral core (scope, privacy seam, `buildUsageEvent`, GraphQL/JSONL persistence, outcome/duration correlation, drain) | `packages/agentic-hooks/src/` (barrel `index.ts`)                                                |
| Per-tool adapters (TS esbuild entrypoints)                                                                                 | `packages/agentic-hooks/src/adapters/<tool>/`                                                    |
| Bundler + drift check                                                                                                      | `packages/agentic-hooks/scripts/bundle-hooks.ts` → targets `bundle-hooks` / `bundle-hooks-check` |
| Generated Claude payload                                                                                                   | `plugins/openthrottle/{hooks,bin}/skill-usage-*.cjs` (stubs; bundles in gitignored `dist/`)      |
| Generated Cursor payload                                                                                                   | `plugins/openthrottle-cursor/hooks/skill-usage-*.cjs`                                            |
| Unit tests                                                                                                                 | `packages/agentic-hooks/src/**/__tests__/*.test.ts` (Vitest)                                     |

Wired producers (plugin `hooks.json`; this repo loads them via its dev marketplace, see
[hook-plugin-distribution.md](../../../docs/monorepo/hook-plugin-distribution.md) §5):

| Producer    | Bundle(s)                                                                                                     | Config                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code | `plugins/openthrottle/hooks/skill-usage-capture.cjs` (start); `…-complete.cjs` (SessionEnd → outcomes)        | `plugins/openthrottle/hooks/hooks.json` → `PreToolUse`/`UserPromptExpansion` (start) + `Stop`/`SessionEnd` (complete)                                                                                       |
| Cursor      | `plugins/openthrottle-cursor/hooks/skill-usage-capture.cjs` (start); `…-complete.cjs` (sessionEnd → outcomes) | `plugins/openthrottle-cursor/hooks/hooks.json` → `preToolUse` `Read` of a `SKILL.md` (start, `invocation_path: skill_read`) + interactive-only `beforeSubmitPrompt` slash commands; `sessionEnd` (complete) |

## The producer contract

### 1. NormalizedInvocation — what an adapter must produce

```ts
{
  skill_name: string,              // required — e.g. "ot-plans", "vercel:deploy"
  args: unknown,                   // raw args; the core applies the privacy seam
  session_id: string | null,
  cwd: string | null,
  invocation_path: 'skill_tool' | 'slash' | null,
  // optional passthroughs (include when your payload carries them):
  agent_id, agent_type, tool_use_id, prompt_id, hook_event_name,
}
```

### 2. `source` — who captured it

Every producer passes a stable `source` id to `buildUsageEvent` (e.g.
`"claude-code"`, `"cursor"`). It rides through to the durable record so usage is
attributable per tool. Pick a short, stable kebab-case id and keep it constant.

### 3. Guarantees the core gives you

- **Scope**: `ours` when authored under `skills/<name>/`; `personal` when linked
  into `.agents/skills/<name>` from the invoking user's personal skills root
  (`~/.openthrottle/skills`, or `OPENTHROTTLE_PERSONAL_SKILLS_DIR`) — on disk and
  invokable, but outside the repo, so nobody else's checkout has it;
  `third-party` when plugin-namespaced (`a:b`) or a `skills-lock.json` install.
  Detection is realpath-based, so the symlink fan-out resolves correctly.
- **Privacy**: args are truncated + secret-redacted by default before they ever
  leave the machine (`src/privacy.ts` — the seam plan `91679bbf` extends).
- **Fail-open**: capture never blocks or throws into the host tool. On any server
  error it appends a local JSONL line instead of losing the event.
- **Zero runtime deps**: bundled `.cjs` `require` nothing outside node builtins,
  so hooks run as bare `node x.cjs` in fresh checkouts / worktrees with no
  `node_modules`.

## Outcomes & duration

1. On each start, the capture hook also records an identifiers-only correlation
   entry (`session_id, skill_name, tool_use_id, started_at, scope` — **no args**)
   under `.cache/skill-usage/starts/<session_id>.jsonl`.
2. At session end, the Claude Code `SessionEnd` hook (`skill-usage-complete.cjs`)
   resolves the starts no reporter claimed, emits one **`session_ended`** outcome
   each with a **null** `duration_ms`, and drains them (deduped). The same bundle
   also runs on every turn's `Stop`, where it leaves the starts open so a skill
   that finishes in a later turn can still claim one. Starts stranded by a
   session that ended without a `SessionEnd` are later swept as `abandoned`,
   also with a null duration.

**The automatic path makes no quality claim, by design.** A `Stop` or `SessionEnd` payload
carries a session id and nothing else, so it cannot know whether the skill
helped; it used to record `success` regardless, which made the Outcomes column
measure liveness while reading as quality. No hook brackets a skill's own work
either (`PostToolUse` on `Skill` fires at injection, not completion), so there is
no honest duration to record.

`success` and `error` are therefore reserved for a deliberate reporter — the
opt-in helper `skill-usage-outcome.cjs` (the `bin/` of the Claude, Codex and Cursor
telemetry payloads; on the Bash PATH under Claude Code)
(`--skill … --outcome error [--duration-ms …] [--session …] [--source …]`), which is also the
only path that may report a duration. It rejects `session_ended`. It finds the running agent's
session from that agent's shell variables and stamps that agent's `source`, and it writes nothing
in a shell it cannot attribute. Per-agent support:
[agent-editor-folders.md § Skill-usage telemetry per agent](../../../docs/monorepo/agent-editor-folders.md#skill-usage-telemetry-per-agent). A skill that
never reports shows `—` on `/usage`, which is the honest state, not missing data.

Absent outcomes are expected for uninstrumented skills — most third-party ones,
since we do not control their internals. Scope is not the test, though: a
`personal` skill is yours to instrument, so a personal row with no outcome means
nobody wired one up, not that one was impossible.

Full model, including the legacy-row quarantine:
[`docs/monorepo/skill-usage-telemetry-scope.md`](../../../docs/monorepo/skill-usage-telemetry-scope.md).

### Draining the JSONL fallback

When the server is down, starts/outcomes buffer to
`.cache/skill-usage/{events,outcomes}.jsonl`. The `Stop` hook runs a small
time-boxed drain opportunistically, and `skill-usage-drain.cjs` (plugin `bin/`; `pnpm run telemetry:drain` in an OT checkout)
does an unbounded catch-up flush (idempotent, concurrent-writer safe).

## Adding / changing a producer

1. Add an entrypoint under `packages/agentic-hooks/src/adapters/<tool>/`
   (implement `normalize<Tool>Payload(raw)` and delegate to the core) and a
   Vitest for the normalizer.
2. Add a `PluginEntry` row to a payload in
   `packages/agentic-hooks/scripts/bundle-hooks.ts` mapping the entrypoint to its
   output file. That is the only registration; the Nx outputs are globs.
3. Run `pnpm nx run @openthrottle/agentic-hooks:bundle-hooks` and commit the
   generated stub, manifest and `hooks.json`. The bundle lands in the gitignored `dist/`.
4. Add the event to the payload's hook table in the same file.

**Never** hand-edit a generated stub or `dist/` file, and **never** fork the core — extend it
generically in the package so every producer benefits. The
`bundle-hooks-check` drift gate (in `check:local` and CI) fails if a committed
stub, manifest or `hooks.json` doesn't match the generator.
