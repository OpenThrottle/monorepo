# Skill-usage capture — cross-tool producer contract

Tool-neutral capture of **skill invocations** (ours vs third-party) that any AI
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
| Generated Claude bundles                                                                                                   | `.claude/hooks/skill-usage-{capture,complete,drain,outcome,scope}.cjs`                           |
| Generated Cursor bundle                                                                                                    | `.cursor/hooks/skill-usage-capture.cjs`                                                          |
| Unit tests                                                                                                                 | `packages/agentic-hooks/src/**/__tests__/*.test.ts` (Vitest)                                     |

Wired producers (editor-native config):

| Producer    | Bundle(s)                                                                           | Config                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude Code | `.claude/hooks/skill-usage-capture.cjs` (start); `…-complete.cjs` (Stop → outcomes) | `.claude/settings.json` → `PreToolUse`/`UserPromptExpansion` (start) + `Stop` (complete)                                                                           |
| Cursor      | `.cursor/hooks/skill-usage-capture.cjs`                                             | `.cursor/hooks.json` → `beforeSubmitPrompt` (provisional — the normalizer no-ops on non-skill payloads until Cursor's skill-invocation event/payload is finalized) |

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

- **Scope**: `ours` when authored under `skills/<name>/`; `third-party` when
  plugin-namespaced (`a:b`) or a `skills-lock.json` install.
- **Privacy**: args are truncated + secret-redacted by default before they ever
  leave the machine (`src/privacy.ts` — the seam plan `91679bbf` extends).
- **Fail-open**: capture never blocks or throws into the host tool. On any server
  error it appends a local JSONL line instead of losing the event.
- **Zero runtime deps**: bundled `.cjs` `require` nothing outside node builtins,
  so hooks run as bare `node x.cjs` in fresh checkouts / worktrees with no
  `node_modules`.

## Outcomes & duration (automatic)

The **Outcomes** and **Avg duration** columns on `/usage` are populated
**automatically — zero manual steps**:

1. On each start, the capture hook also records an identifiers-only correlation
   entry (`session_id, skill_name, tool_use_id, started_at, scope` — **no args**)
   under `.cache/skill-usage/starts/<session_id>.jsonl`.
2. At turn end, the Claude Code `Stop` hook (`skill-usage-complete.cjs`) resolves
   the open starts, emits one `success` outcome each with
   `duration_ms = Stop − started_at`, and drains them (deduped). Starts stranded
   by a session that ended without a `Stop` are later swept as `abandoned`.

For a specific outcome the automatic path can't infer — notably `error` — call
the opt-in helper `.claude/hooks/skill-usage-outcome.cjs`
(`--skill … --outcome error [--duration-ms …] --session …`). Additive, not a
replacement. Absent outcomes are expected for third-party / uninstrumented skills.

### Draining the JSONL fallback

When the server is down, starts/outcomes buffer to
`.cache/skill-usage/{events,outcomes}.jsonl`. The `Stop` hook runs a small
time-boxed drain opportunistically, and `.claude/hooks/skill-usage-drain.cjs`
does an unbounded catch-up flush (idempotent, concurrent-writer safe).

## Adding / changing a producer

1. Add an entrypoint under `packages/agentic-hooks/src/adapters/<tool>/`
   (implement `normalize<Tool>Payload(raw)` and delegate to the core) and a
   Vitest for the normalizer.
2. Add a row to the `BUNDLES` manifest in
   `packages/agentic-hooks/scripts/bundle-hooks.ts` mapping the entrypoint to its
   output `.cjs` path.
3. Run `pnpm nx run @openthrottle/agentic-hooks:bundle-hooks` and commit the
   generated `.cjs` (tracked, **not** gitignored).
4. Wire your tool's hook config to run the bundle.

**Never** hand-edit a generated `.cjs`, and **never** fork the core — extend it
generically in the package so every producer benefits. The
`bundle-hooks-check` drift gate (in `check:local` and CI) fails if a committed
bundle doesn't match its source.
