# ADR: what to adopt from Agent Plugins 1.0.0 and the OTel GenAI conventions

- **Status:** Accepted
- **Date:** 2026-09-11
- **Scope:** `@openthrottle/agentic-hooks` and the generated plugin payloads under `plugins/`
- **Versions checked:** Agent Plugins Specification **1.0.0** (1.1.0 is a working draft);
  OpenTelemetry semantic conventions, GenAI group, **pre-stable** and relocated to
  `open-telemetry/semantic-conventions-genai` by semconv **v1.42.0** (2026-06-12)
- **Related:** [child-repo-hook-overlay.md](./child-repo-hook-overlay.md),
  [agent-cli-hook-capability-matrix.md](./agent-cli-hook-capability-matrix.md),
  [cursor-agent-hook-probe.md](./cursor-agent-hook-probe.md),
  [codex-cli-hook-probe.md](./codex-cli-hook-probe.md)

Every factual claim below has a shelf life. The dates and versions are the point of the document,
not decoration — see [When to revisit](#when-to-revisit).

## Context

This package does two separable things: it **packages** telemetry hooks into distributable plugin
directories, and it **shapes** a skill-usage event. Each half has a different relationship to the
standards landscape, and conflating them is how a team ends up either reinventing a real spec or
chasing a pre-stable one.

## What the specs actually say (re-verified 2026-09-11)

### Agent Plugins 1.0.0

Published by the Agent Plugins project under the Linux Foundation's Agentic AI Foundation
(`agent-plugins.org`, `github.com/agentplugins/agent-plugins-spec`). It standardizes **packaging**.
Four clauses matter here, quoted rather than paraphrased because the plan's premise was wrong on
three of them:

- §5.1 — "Clients MUST check for a manifest at `plugin.json` in the plugin root."
- §7 — "Agent Plugins v1 defines exactly two component types: **skills** and **MCP servers**. Other
  component types are outside the v1 format and do not affect conformance." And: "Clients MUST ignore
  component types they do not support."
- §8.1 — "The optional `extensions` field in `plugin.json` MUST be an object whose member names are
  client extension namespaces…"
- §8.2 — "The extension directory for a namespace is the top-level directory named after it." The
  spec's own worked example of a file-only client extension is literally
  `com.example.client/hooks/hooks.json`.

Three corrections to what this plan assumed:

1. **Hooks are not named as an excluded component type.** The spec does not enumerate hooks,
   commands, agents, rules and LSP servers as exclusions. It defines two component types and says
   everything else is simply outside v1 and does not affect conformance. The practical conclusion is
   the same, but the reason is different and softer: hooks are not forbidden, they are _unaddressed_.
2. **The manifest belongs at `plugin.json` in the plugin root.** `.claude-plugin/plugin.json` is a
   Claude Code convention and appears nowhere in the spec.
3. **The spec does have a home for client-specific files** — a reverse-DNS namespace directory — and
   its example of one is a hooks file. So "there is nowhere for hooks to live" is not true either.

### OpenTelemetry GenAI semantic conventions

Still pre-stable, and moved: semconv **v1.42.0** (2026-06-12) deprecated the GenAI conventions in the
main repository and relocated them to `open-telemetry/semantic-conventions-genai`. No 1.0. Attribute
names can still change between versions. The model is a span tree —
`invoke_agent` → `chat` → `execute_tool` — with `gen_ai.operation.name` covering the agent lifecycle.

## Decision 1 — Does `plugins/openthrottle/` conform, and should it?

**Does it today? No.** It ships `.claude-plugin/plugin.json` and no root `plugin.json`, and the root
manifest is the one hard MUST in §5.1.

**Should it? Yes, for the manifest. No, for the hooks.**

**Yes — adopt the root manifest.** It is cheap, it is a real published standard with real adopters,
and conformance costs one generated file: a root `plugin.json` carrying `$schema` and `name`. Clients
that do not care ignore it; clients that do can read our payload as a plugin. This is _adopted_ in
this ADR and implemented in the same change.

**No — do not move the hooks into a namespace directory.** This is the interesting half, and it is a
case where following the spec exactly would produce a tidier, completely non-functional payload.

§8.2 would have us ship `com.anthropic.claude-code/hooks/hooks.json` and
`com.cursor.agent/hooks/hooks.json`. But a namespace is the _client's_ to define, and neither client
implements one. Measured against the shipping binaries: Claude Code reads plugin hooks from
`hooks/hooks.json`, and Cursor defaults plugin hooks to `<root>/hooks/hooks.json` (its manifest
lookup is `.cursor-plugin/plugin.json` → `.claude-plugin/plugin.json` → `plugin.json`). Hooks moved
under a spec-shaped namespace directory would be found by nobody.

So the payload is, precisely: **a conformant Agent Plugins 1.0.0 plugin that additionally carries
client-specific hooks at the path those clients actually read.** §7 makes that legal in as many
words — other component types "do not affect conformance" — so this is use of the format, not misuse.
We keep the `.claude-plugin/plugin.json` alongside the root one because Cursor's lookup order and
Claude's installer both use it; a duplicated manifest is a small price for two working clients, and
both are generated from one source so they cannot disagree.

**Did this decision force rework?** No. It landed after the Cursor payload task, which is the risk
the plan flagged. It turned out not to matter, because the spec's packaging rules and the clients'
hook-discovery rules are independent: the per-tool payload split was forced by hook _event names_,
not by packaging, and nothing in Agent Plugins 1.0.0 would have made one shared payload work.

## Decision 2 — Do we rename `UsageEvent` fields toward `gen_ai.*`?

**No rename. Yes to a documented mapping.**

Renaming fields to `gen_ai.*` would pin durable database columns and a GraphQL schema to a convention
that has no 1.0, that changed repositories three months ago, and whose attribute names may still
change. `skill_name`, `session_id` and `duration_ms` are already legible; renaming them buys nothing
today and costs a migration plus a deprecation cycle if the convention moves again.

What is free, and worth having, is the mapping itself — so that if we ever emit OTLP, the translation
is a lookup rather than an archaeology exercise. Written against the GenAI conventions as of
**semconv v1.42.0 / the `semantic-conventions-genai` repository, 2026-09-11**:

| ours              | OTel GenAI                 | note                                                      |
| ----------------- | -------------------------- | --------------------------------------------------------- |
| `skill_name`      | `gen_ai.tool.name`         | a skill is the closest thing we have to a tool            |
| `tool_use_id`     | `gen_ai.tool.call.id`      | already the correlation key on our side                   |
| `session_id`      | no stable equivalent       | conversation/session identity is still in flux upstream   |
| `invocation_path` | none                       | ours; records how strong the capture signal is, see below |
| `source`          | none                       | ours; the producing tool, not the model                   |
| `duration_ms`     | span duration              | a span field, not an attribute                            |
| `outcome`         | span status + `error.type` | our three-value outcome does not map cleanly; keep ours   |

Two of our fields have no upstream equivalent **and should not acquire one**. `source` is the
producing agent CLI, which OTel models as resource/instrumentation rather than an attribute.
`invocation_path` records _how_ an invocation was observed (`skill_tool` from Claude's real `Skill`
tool, `skill_read` from Cursor's `SKILL.md` read, `slash` from a parsed command) — a signal-strength
distinction that exists because the tools differ, and that no cross-vendor convention has a reason to
carry. See the capability matrix's "Skill invocations are not uniformly observable".

## Decision 3 — Do we emit OTLP alongside the GraphQL mutation?

**No, not now.** Recorded so it is not re-litigated from scratch:

- **The conventions are pre-stable and just moved repositories.** Emitting against them now buys
  standards-compatibility with a moving target and a second wire format to maintain.
- **The consumer does not exist.** Nobody is pointing a collector at this. The value of OTLP is
  landing in someone's existing observability stack; until there is such a stack asking for skill
  usage, it is a second sink with no reader.
- **It fights fail-open.** Every hook is bounded, swallows its errors, and falls back to a local
  JSONL buffer. A second network sink is a second thing to time-box and a second failure mode on the
  critical path of a tool call, for no current reader.
- **The cost of waiting is near zero.** The mapping above is the expensive part of adopting OTLP
  later, and it is written down. The emit itself is a small addition to `persist.ts`.

Reconsider if: the conventions reach Stable, **or** someone actually wants this telemetry in a
collector. The second trigger is the real one.

## Decision 4 — Are per-tool hook adapters the right architecture, or a stopgap?

**The right architecture.** This is the reassuring finding and it deserves saying plainly.

There is no community spec for the hook half of this package. Agent Plugins 1.0.0 does not address
hooks; the Technical Steering Committee is _considering_ how hooks and sub-agents might join a future
version, which is a considered future, not a contract. So per-tool adapters are not a placeholder
awaiting convergence — there is nothing to converge on yet, and the measured evidence is that the
tools have genuinely diverged: Claude has a `Skill` tool, Cursor has none and only a `SKILL.md` read,
Cursor's `stop` and `beforeSubmitPrompt` do not fire headless while `sessionEnd` does, and codex's
events are Claude-named but TOML-configured from the home directory.

The architectural bet that follows is the one this package already makes: keep the adapters thin and
the core neutral, so that when a hook spec does arrive, adopting it is one more adapter rather than a
rewrite. The evidence that the bet is sound is that the third producer (codex) was added without
touching a single neutral-core file.

## Consequences

- A root `plugin.json` is generated into every payload, alongside the existing
  `.claude-plugin/plugin.json`.
- Hooks stay at `hooks/hooks.json` in each payload, where the clients look.
- No field renames, no schema migration, no OTLP sink.
- The `gen_ai.*` mapping is documented here and nowhere else; if it moves, it moves here.

## When to revisit

- **Agent Plugins 1.1.0 ships** — especially if it brings hooks into the spec, which the TSC has said
  it is considering. That would change Decision 1 and possibly Decision 4.
- **`gen_ai.*` reaches Stable** in `open-telemetry/semantic-conventions-genai`. That would reopen
  Decision 2's rename question on much better terms.
- **Someone asks for this telemetry in a collector.** That, not convention stability, is what should
  trigger Decision 3.
- **A client implements an Agent Plugins extension namespace for hooks.** That would make §8.2's
  layout functional rather than decorative, and Decision 1's second half would flip.
- **The payloads become installed plugins rather than spawn-time directories.** This is the intended
  direction (OT task `b88d8d5a`). It does not change any decision here, but it raises the stakes on
  Decision 1: a payload OT points at with `--plugin-dir` only has to satisfy the one client being
  spawned, whereas a payload a human installs from a marketplace is read by whatever client they
  happen to run — so conformant packaging stops being cheap insurance and starts being the contract.
