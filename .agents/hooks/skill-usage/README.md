# Skill-usage capture — cross-tool producer contract

Tool-neutral capture of **skill invocations** (ours vs third-party) that any AI
agent/editor can feed, persisted in OpenThrottle as the system of record and
surfaced on the Developer **Usage** route. See OT plan `d3759118`.

The point of this folder: the capture logic is **not** owned by any one tool.
Each producer (Claude Code, Cursor, a git hook, …) ships a ~30-line adapter that
translates its native hook payload into one shared shape and delegates the rest.

```
producer hook payload → <tool adapter> → NormalizedInvocation
                          → buildUsageEvent({ normalized, source }) → persistUsageEvent
                          → OT GraphQL (recordSkillUsage)  |  JSONL fallback
```

## Files

| File                   | Owns                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib.cjs`              | The tool-neutral core: scope detection, privacy seam, `buildUsageEvent`, GraphQL/JSONL persistence, env resolution. **No tool-specific code.** |
| `lib.test.cjs`         | Tests for the neutral core. Run: `node --test .agents/hooks/skill-usage/lib.test.cjs`                                                          |
| `adapter.template.cjs` | Copy-me reference adapter for a new producer.                                                                                                  |
| `README.md`            | This contract.                                                                                                                                 |

Wired producers live under each tool's own hook folder (editor-native config):

| Producer    | Adapter                                                                                                                               | Config                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Claude Code | `.claude/hooks/skill-usage-capture.cjs` (+ `skill-usage-claude-adapter.cjs`) start; `.claude/hooks/skill-usage-complete.cjs` outcomes | `.claude/settings.json` → `PreToolUse`/`UserPromptExpansion` (start) + `Stop` (complete) |
| _your tool_ | copy `adapter.template.cjs` into your tool's hooks dir                                                                                | your tool's hook config                                                                  |

## The producer contract

### 1. NormalizedInvocation — what an adapter must produce

```js
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

- **Scope**: `ours` when the skill is authored under `skills/<name>/`;
  `third-party` when plugin-namespaced (`a:b`) or a `skills-lock.json` install.
- **Privacy**: args are truncated + secret-redacted by default before they ever
  leave the machine. The server stores them as-sent and never re-expands.
- **Fail-open**: capture never blocks or throws into the host tool. On any
  server error it appends a local JSONL line instead of losing the event.

## Outcomes & duration (automatic)

The **Outcomes** and **Avg duration** columns on `/usage` are populated
**automatically — zero manual steps**:

1. On each start, the capture hook also records an identifiers-only correlation
   entry (`session_id, skill_name, tool_use_id, started_at, scope` — **no args**)
   under `.cache/skill-usage/starts/<session_id>.jsonl`.
2. At turn end, the Claude Code `Stop` hook (`skill-usage-complete.cjs`) resolves
   the open starts for the session, emits one `success` outcome each with
   `duration_ms = Stop − started_at` via `recordSkillUsageOutcome`, and drains
   them (deduped — a repeated `Stop` never double-emits). Starts stranded by a
   session that ended without a `Stop` are later swept as `abandoned`.

`Stop` carries no `tool_use_id`/`skill_name`/error signal, so correlation is
session-scoped and the automatic classifier emits `success` (or `abandoned`).
For a specific outcome the automatic path can't infer — notably `error` — call
the **opt-in precision** helper `.claude/hooks/skill-usage-outcome.cjs`
(`--skill … --outcome error [--duration-ms …] --session …`). It is additive, not
a replacement.

**Absent outcomes are expected and valid** for third-party / uninstrumented
skills (namespaced `a:b` or `skills-lock.json` installs) — those legitimately
render `—`.

### Draining the JSONL fallback

When the server is down, starts/outcomes buffer to
`.cache/skill-usage/{events,outcomes}.jsonl`. The `Stop` hook runs a small
time-boxed drain opportunistically, and `.claude/hooks/skill-usage-drain.cjs`
does an unbounded catch-up flush for manual / scheduled runs (idempotent,
concurrent-writer safe via an atomic rename; unsent lines are retained).

## Adding a new producer

1. Copy `adapter.template.cjs` into your tool's hooks folder (keep neutral logic here).
2. Implement `normalize<Tool>Payload(raw)` for your payload shape.
3. Pick a `source` id and pass it to `buildUsageEvent`.
4. Wire your tool's hook config to run the adapter on skill invocation.
5. Add a `node --test` for your `normalize<Tool>Payload`, mirroring
   `.claude/hooks/skill-usage-claude-adapter.test.cjs`.

Do **not** fork `lib.cjs`. If the core is missing something your tool needs,
extend the core generically so every producer benefits.
