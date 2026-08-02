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

| Producer    | Adapter                                                                      | Config                                                       |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Claude Code | `.claude/hooks/skill-usage-capture.cjs` (+ `skill-usage-claude-adapter.cjs`) | `.claude/settings.json` → `PreToolUse`/`UserPromptExpansion` |
| _your tool_ | copy `adapter.template.cjs` into your tool's hooks dir                       | your tool's hook config                                      |

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

## Adding a new producer

1. Copy `adapter.template.cjs` into your tool's hooks folder (keep neutral logic here).
2. Implement `normalize<Tool>Payload(raw)` for your payload shape.
3. Pick a `source` id and pass it to `buildUsageEvent`.
4. Wire your tool's hook config to run the adapter on skill invocation.
5. Add a `node --test` for your `normalize<Tool>Payload`, mirroring
   `.claude/hooks/skill-usage-claude-adapter.test.cjs`.

Do **not** fork `lib.cjs`. If the core is missing something your tool needs,
extend the core generically so every producer benefits.
