# Agent-CLI hook and plugin capability matrix

**Sibling of** [`child-repo-hook-overlay.md`](./child-repo-hook-overlay.md) and
[`child-repo-hook-telemetry-contract.md`](./child-repo-hook-telemetry-contract.md). Mirrors the CLI
table in §2 of [`foreign-workspace-skill-injection.md`](./foreign-workspace-skill-injection.md),
which answered the same question for skills.

The question: for each of the six CLIs in `packages/openthrottle-drivers/src/drivers/`, can OT put
hooks into a repository **without writing into that repository** — and if so, how?

Everything below was established by running the installed binaries, not read off a docs site.
Versions probed: `claude` 2.1.232, `codex-cli` 0.147.0, `cursor-agent` 2026.08.11, `opencode` 1.18.16,
`grok` 1.0.0, `gemini` 0.25.2 (subcommand surface + shipped source; hook execution not yet exercised
end-to-end).

## The matrix

| CLI              | hooks?                                | hook config read from                                                                                                                             | out-of-repo override                                            | plugin mechanism                                                        | verdict for the overlay                                                                     |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **claude**       | yes                                   | user / project / local settings + every installed plugin, merged additively                                                                       | `--settings`, `--plugin-dir`, `--plugin-url`                    | plugins + marketplace (`/plugin install`)                               | **fully covered** — legs A and B both verified end-to-end                                   |
| **cursor-agent** | yes                                   | `.cursor/hooks.json` in-repo                                                                                                                      | **`--plugin-dir`** (repeatable)                                 | plugins + `plugin marketplace`                                          | **viable, not yet built** — the flag exists; needs a cursor payload                         |
| **codex**        | yes                                   | `~/.codex/config.toml` (home, **not** the repo), `$CODEX_HOME/<name>.config.toml`                                                                 | `-c hooks.…`, `--profile`, `CODEX_HOME`                         | plugins + `plugin marketplace` (local or git)                           | **viable, not yet built** — config is already out-of-repo by default                        |
| **gemini**       | yes (experimental; settings-gated)    | `hooks` block in `.gemini/settings.json` (user `~/.gemini/` or workspace scope); `gemini hooks migrate` imports Claude Code hooks from `.claude/` | user-scope settings are out-of-repo; **no per-invocation flag** | durable `gemini extensions install <git-url\|path>` into `~/.gemini`    | **viable, not yet built** — user-scope settings layer; probe execution before relying on it |
| **grok**         | yes (`PreToolUse`, session lifecycle) | `.grok/hooks/`, plus `[[hooks.<Event>]]` in `~/.grok/config.toml` and other config layers, combined additively                                    | config layers are out-of-repo; **no per-invocation flag**       | durable `grok plugin install <git-url\|path>`; **reads Claude plugins** | **partial** — see below                                                                     |
| **opencode**     | via plugins (JS module hook API)      | project `opencode.json` + global config; `--pure` disables                                                                                        | global config is out-of-repo                                    | `opencode plugin <npm-module>` (npm, not a directory)                   | **viable, different shape** — npm-published module, not a payload directory                 |

## What is worth knowing beyond the table

### Every one of the six has an out-of-repo path

This is the headline, and it is the opposite of the skills result. §2 of the skill-injection record
found that _no_ CLI exposes an out-of-repo skills directory, which is what forced materialization
into the target working tree. For hooks, **all six** have somewhere to put config that is not the
target repo — four via a home-directory config layer (gemini included, via user-scope
`~/.gemini/settings.json`), two via a per-invocation directory flag.

That closes the door on option C for good. C was only ever rescuable if some CLI had no out-of-repo
hook config and multi-CLI parity became a v1 requirement. Neither half of that condition holds.

### `cursor-agent` also takes `--plugin-dir`

The plan recorded cursor as in-repo-only (`.cursor/hooks.json`, which is where our one cursor adapter
is wired today). It also accepts `--plugin-dir <path>`, repeatable, exactly like Claude. Leg B
therefore generalizes to cursor without new mechanism — the driver capability flag
(`capabilities.pluginDir`) and `appendPluginDirShellFlags` already exist and are per-driver, so
extending to cursor is a payload plus flipping one boolean.

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
configures it once and it applies everywhere, with no per-repo or per-invocation work. `-c
hooks.…` overrides and `CODEX_HOME` provide per-invocation control if wanted. Codex also gates hook
execution on trust, with `--dangerously-bypass-hook-trust` as the automation escape hatch; the name
is a fair warning and should not be reached for casually.

### opencode is the odd one out

Opencode plugins are **npm modules**, not directories: `opencode plugin <module>` installs and
updates config. There is no directory flag. Covering opencode means publishing a package, which is a
distribution decision rather than a technical obstacle. `--pure` disables external plugins, so the
kill switch exists.

## Consequences

- **v1 (shipped): claude only.** Legs A and B are both verified. This is the overwhelming majority of
  OT-orchestrated runs.
- **Next-cheapest: cursor**, via `--plugin-dir` and a cursor-shaped payload. The driver plumbing is
  already generic.
- **codex** is next after that and needs no injection at all — just a documented `~/.codex/config.toml`
  block and a decision about the trust bypass.
- **grok and opencode** stay on option D (server-side transcript derivation) for now: grok because
  trust and the missing `Skill` tool block it structurally, opencode because it needs a published npm
  package. Neither is blocked by a _lack_ of out-of-repo config.

Nothing here requires writing into a target repository for any of the five.
