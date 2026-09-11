# Agent-CLI hook and plugin capability matrix

**Sibling of** [`child-repo-hook-overlay.md`](./child-repo-hook-overlay.md) and
[`child-repo-hook-telemetry-contract.md`](./child-repo-hook-telemetry-contract.md). Mirrors the CLI
table in §2 of [`foreign-workspace-skill-injection.md`](./foreign-workspace-skill-injection.md),
which answered the same question for skills.

The question: for each of the seven CLIs in `packages/openthrottle-drivers/src/drivers/`, can OT put
hooks into a repository **without writing into that repository** — and if so, how?

Everything below was established by running the installed binaries, not read off a docs site.

> **Measured 2026-09-11** against `claude` 2.1.267, `cursor-agent` 2026.09.10-fd3934a, `codex-cli`
> 0.145.0, `gemini` 0.25.2, `grok` 1.0.5, and `opencode` 1.18.16. `antigravity` (`agy`) is **not
> installed on this machine** and its row is carried over from the 1.1.21 dossier, unverified here.
> **Re-probe whenever any of these CLIs ships a release** — hook and plugin surfaces move fast, and
> this matrix goes stale silently rather than loudly. See
> [What is machine-checked and what is not](#what-is-machine-checked-and-what-is-not).

Two rows now have their own primary record, far more detailed than this table:
[`cursor-agent-hook-probe.md`](./cursor-agent-hook-probe.md) and
[`codex-cli-hook-probe.md`](./codex-cli-hook-probe.md).

## The matrix

| CLI              | hooks?                                | hook config read from                                                                                                                             | out-of-repo override                                            | plugin mechanism                                                        | verdict for the overlay                                                                       |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **claude**       | yes                                   | user / project / local settings + every installed plugin, merged additively                                                                       | `--settings`, `--plugin-dir`, `--plugin-url`                    | plugins + marketplace (`/plugin install`)                               | **shipped** — legs A and B both verified end-to-end                                           |
| **cursor-agent** | yes                                   | nine sources merged additively, including `.claude/settings.json` and `.claude/settings.local.json`                                               | **`--plugin-dir`** (repeatable), confirmed on 2026.09.10        | plugins + `plugin marketplace`                                          | **shipped** — capture, completion and leg B verified; needs its OWN payload, see below        |
| **codex**        | yes                                   | `~/.codex/config.toml` (home, **not** the repo), `$CODEX_HOME/<name>.config.toml`                                                                 | `-c hooks.…`, `--profile`, `CODEX_HOME`                         | `codex plugin` installs from marketplaces; **no `--plugin-dir` flag**   | **shipped, partially** — needs no injection at all; capture is slash-commands-only, see below |
| **gemini**       | yes (experimental; settings-gated)    | `hooks` block in `.gemini/settings.json` (user `~/.gemini/` or workspace scope); `gemini hooks migrate` imports Claude Code hooks from `.claude/` | user-scope settings are out-of-repo; **no per-invocation flag** | durable `gemini extensions install <git-url\|path>` into `~/.gemini`    | **viable, not built** — user-scope settings layer; probe execution before relying on it       |
| **grok**         | yes (`PreToolUse`, session lifecycle) | `.grok/hooks/`, plus `[[hooks.<Event>]]` in `~/.grok/config.toml` and other config layers, combined additively                                    | config layers are out-of-repo; **no per-invocation flag**       | durable `grok plugin install <git-url\|path>`; **reads Claude plugins** | **partial** — see below                                                                       |
| **opencode**     | via plugins (JS module hook API)      | project `opencode.json` + global config; `--pure` disables                                                                                        | global config is out-of-repo                                    | `opencode plugin <npm-module>` (npm, not a directory)                   | **viable, different shape** — npm-published module, not a payload directory                   |
| **antigravity**  | yes (unverified)                      | `~/.gemini/antigravity-cli/hooks.json` and `~/.gemini/config/hooks.json` (paths recovered from the 1.1.21 binary)                                 | both paths are out-of-repo; per-invocation flag **unknown**     | unknown; `~/.gemini/config/skills/` exists, plugin surface unprobed     | **unprobed** — `agy` is not installed here; nothing in this row is measured                   |

## What is worth knowing beyond the table

### Every one of the seven has an out-of-repo path

This is the headline, and it is the opposite of the skills result. §2 of the skill-injection record
found that _no_ CLI exposes an out-of-repo skills directory, which is what forced materialization
into the target working tree. For hooks, **all seven** have somewhere to put config that is not the
target repo — five via a home-directory config layer, two via a per-invocation directory flag.

That closes the door on option C for good. C was only ever rescuable if some CLI had no out-of-repo
hook config and multi-CLI parity became a v1 requirement. Neither half of that condition holds.

### cursor-agent reads Claude's hook config — and that is a trap

Cursor's hook resolver merges **nine** sources: `enterprise`, `team`, `user`, `project`, `runtime`,
`claude-project`, `claude-project-local`, `claude-user`, and installed plugins. Its plugin manifest
lookup is `.cursor-plugin/plugin.json` → `.claude-plugin/plugin.json` → `plugin.json`, it defaults
plugin hooks to `<root>/hooks/hooks.json`, it sets both `CURSOR_PLUGIN_ROOT` and
`CLAUDE_PLUGIN_ROOT`, and it translates Claude's event names (`PreToolUse` → `preToolUse`, `Stop` →
`stop`, `UserPromptSubmit` → `beforeSubmitPrompt`).

It is therefore very tempting to conclude one payload serves both. **It does not, and it fails
silently.** The translation drops exactly what this telemetry needs: `PreToolUse` with
`matcher: "Skill"` has no Cursor tool to match, `UserPromptExpansion` has no Cursor equivalent at
all, and `Stop` maps to an event that never fires in a headless run. Pointing Cursor at the Claude
payload loads cleanly, reports nothing wrong, and records nothing. Hence
`plugins/openthrottle-cursor/` as a separate committed payload, and `AgentDriver.pluginDirRel`
naming one per driver.

This is the same shape of half-truth as grok below. Both are recorded rather than smoothed over
because "tool X reads Claude plugins" reads as coverage and is not.

### Skill invocations are not uniformly observable

Claude has a real `Skill` tool, so `PreToolUse` with `matcher: "Skill"` is exact. **Cursor and codex
do not.** In Cursor a skill invocation is only visible as a `Read` of the skill's `SKILL.md` — a
weaker signal, since an agent editing skills reads them too, which is why those rows are recorded
under a distinct `invocation_path` (`skill_read`) rather than folded in with Claude's. For codex,
which `tool_name` a skill produces has not been captured at all, so its capture is
slash-commands-only until it can be.

This is the single biggest cross-tool difference and it is a **data-quality** difference, not a
plumbing one. Anything comparing skill usage across producers has to account for it.

### grok reads Claude plugins — but that is not the win it looks like

`grok inspect` reports "Harness Compatibility" with both cursor and claude, covering skills, rules,
agents, mcps, and hooks. Installing OT's Claude plugin made grok list it immediately:

```
Plugins (3)
└ openthrottle (user, enabled)  hooks
```

It then did **not** fire our hooks on a headless `grok -p` run that provably used the skill. Two
independent reasons, both structural rather than incidental:

1. **Trust.** "Projects must be explicitly trusted before their hooks execute", and the only lever is
   the interactive `/hooks-trust` slash command — there is no CLI flag. Unattended runs in an
   untrusted foreign repo are blocked _by design_, which is precisely the case leg B exists to serve.
2. **No `Skill` tool.** `grok inspect` reports `permissions.allow: Skill(update-config) -- unknown
tool prefix: Skill`. Grok reaches skills by another route, so a `PreToolUse` hook with
   `matcher: "Skill"` has nothing to match. Grok also has no `UserPromptExpansion`, so the
   complementary capture path is absent too.

So grok is _plugin-compatible_ without being _hook-compatible for our events_. Recording this
explicitly because "grok reads Claude plugins" is exactly the sort of half-truth that would otherwise
be taken as coverage.

### codex needs no injection mechanism at all

Codex reads hooks from `~/.codex/config.toml` — home directory, never the repo. An operator
configures it once and it applies everywhere, with no per-repo or per-invocation work. `-c hooks.…`
overrides and `CODEX_HOME` provide per-invocation control if wanted. Confirmed 2026-09-11: there is
**no `--plugin-dir` flag**; `codex plugin` installs from marketplaces instead. So delivery is
documentation, and the copy-pasteable block lives in `packages/agentic-hooks/README.md`.

Codex gates hook execution on trust, with `--dangerously-bypass-hook-trust` as the automation escape
hatch. The name is a fair warning: it is right for OT's own orchestrated runs, whose bundles are
generated here and drift-checked byte-for-byte, and wrong as an interactive convenience.

### opencode is the odd one out

Opencode plugins are **npm modules**, not directories: `opencode plugin <module>` installs and
updates config. There is no directory flag. Covering opencode means publishing a package, which is a
distribution decision rather than a technical obstacle. `--pure` disables external plugins, so the
kill switch exists.

### antigravity is unprobed

`agy` is not installed on this machine, so nothing in its row was measured for this revision. The
config paths come from the 1.1.21 binary dossier
([`antigravity-stream-json-schema.md`](../openthrottle/antigravity-stream-json-schema.md)), which
recovered `~/.gemini/antigravity-cli/hooks.json` and `~/.gemini/config/hooks.json` as strings — that
establishes the paths exist in the binary, **not** that hooks fire, what their payloads look like, or
whether a per-invocation override exists. Treat the row as a starting point for a probe, not a
finding. Note also that antigravity shares `~/.gemini` with the Gemini CLI but uses a different
layout, so gemini's row does not transfer.

## What is machine-checked and what is not

This document warns that it goes stale silently, which is a reason to move what can be asserted out
of prose. Half of it now is:

- **Machine-checked.** Which drivers advertise `capabilities.pluginDir`, and which payload each names
  via `AgentDriver.pluginDirRel`, are asserted in
  `packages/openthrottle-drivers/src/drivers/__tests__/plugin-dir.test.ts`. A driver that gains or
  loses the capability, or is pointed at the wrong payload, fails CI rather than drifting from this
  table.
- **Not machine-checkable, and deliberately so.** Where a CLI reads its hook config, whether a trust
  gate blocks unattended execution, which events actually fire headless, and what a payload contains
  are properties of a **third-party binary**, not of our descriptors. Nothing in this repo can assert
  them; only running the binary can, which is what the two probe documents do. Generating this table
  from `capabilities` would make it look authoritative about facts it cannot know — worse than stale,
  because it would be confidently wrong.

The honest split: assert what we control, date and re-probe what we do not.

## Consequences

- **Shipped: claude, cursor, codex.** Claude and cursor have capture, completion and an out-of-repo
  delivery leg, all verified end-to-end. Codex has completion and slash-command capture, and needs no
  injection.
- **codex's remaining gap** is its tool-based capture path, blocked on capturing a real `PreToolUse`
  payload.
- **gemini** is next-cheapest of the rest: a user-scope settings layer already exists, and
  `gemini hooks migrate` suggests a Claude-shaped config would be understood. Probe before relying on
  it.
- **grok and opencode** stay on option D (server-side transcript derivation) for now: grok because
  trust and the missing `Skill` tool block it structurally, opencode because it needs a published npm
  package. Neither is blocked by a _lack_ of out-of-repo config.
- **antigravity** needs installing and probing before it can be placed at all.

Nothing here requires writing into a target repository for any of the seven.
