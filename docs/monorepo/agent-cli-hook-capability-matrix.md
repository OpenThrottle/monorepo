# Agent-CLI hook and plugin capability matrix

**Sibling of** [`child-repo-hook-overlay.md`](./child-repo-hook-overlay.md) and
[`child-repo-hook-telemetry-contract.md`](./child-repo-hook-telemetry-contract.md). Mirrors the CLI
table in §2 of [`foreign-workspace-skill-injection.md`](./foreign-workspace-skill-injection.md),
which answered the same question for skills.

The question: for each of the seven CLIs in `packages/openthrottle-drivers/src/utils/*Driver.ts`, can OT put
hooks into a repository **without writing into that repository** — and if so, how?

Everything below was established by running the installed binaries, not read off a docs site.

> **Measured 2026-09-11** against `claude` 2.1.267, `cursor-agent` 2026.09.10-fd3934a, `codex-cli`
> 0.145.0, `grok` 1.0.5, and `opencode` 1.18.16. The `antigravity` (`agy`) row was re-measured on
> 1.5.8 on 2026-11-13 (OT plan `ab30bcff`) — hooks only; its plugin and out-of-repo columns are
> still partly unprobed.
> **Re-probe whenever any of these CLIs ships a release** — hook and plugin surfaces move fast, and
> this matrix goes stale silently rather than loudly. See
> [What is machine-checked and what is not](#what-is-machine-checked-and-what-is-not).

Two rows now have their own primary record, far more detailed than this table:
[`cursor-agent-hook-probe.md`](./cursor-agent-hook-probe.md) and
[`codex-cli-hook-probe.md`](./codex-cli-hook-probe.md).

## The matrix

| CLI              | hooks?                                | hook config read from                                                                                           | out-of-repo override                                        | plugin mechanism                                                        | verdict for the overlay                                                                             |
| ---------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **claude**       | yes                                   | user / project / local settings + every installed plugin, merged additively                                     | `--settings`, `--plugin-dir`, `--plugin-url`                | plugins + marketplace (`/plugin install`)                               | **shipped** — legs A and B both verified end-to-end                                                 |
| **cursor-agent** | yes                                   | nine sources merged additively, including `.claude/settings.json` and `.claude/settings.local.json`             | **`--plugin-dir`** (repeatable), confirmed on 2026.09.10    | plugins + `plugin marketplace`                                          | **shipped** — capture, completion and leg B verified; needs its OWN payload, see below              |
| **codex**        | yes                                   | `~/.codex/config.toml`, `$CODEX_HOME/<name>.config.toml`; since 0.167.0 also a **trusted** project's `.codex/`  | `-c hooks.…`, `--profile`, `CODEX_HOME`                     | `codex plugin` installs from marketplaces; **no `--plugin-dir` flag**   | **shipped** — needs no injection at all; capture is a `Bash` `cat` of `SKILL.md` + slash, see below |
| **grok**         | yes (`PreToolUse`, session lifecycle) | `.grok/hooks/`, plus `[[hooks.<Event>]]` in `~/.grok/config.toml` and other config layers, combined additively  | config layers are out-of-repo; **no per-invocation flag**   | durable `grok plugin install <git-url\|path>`; **reads Claude plugins** | **partial** — see below                                                                             |
| **opencode**     | via plugins (JS module hook API)      | project `opencode.json` + global config; `--pure` disables                                                      | global config is out-of-repo                                | `opencode plugin <npm-module>` (npm, not a directory)                   | **viable, different shape** — npm-published module, not a payload directory                         |
| **antigravity**  | yes — measured on 1.5.8 (2026-11-13)  | a workspace plugin, `<cwd>/.agents/plugins/<name>/{plugin.json,hooks.json}`; fires under `-p` **and** `agy acp` | `--settings` (session-only JSON) exists; unprobed for hooks | `agy plugin install` / `validate`, plus workspace `.agents/plugins/`    | **hooks verified in-repo only** — the out-of-repo route is still unprobed, see below                |

## What is worth knowing beyond the table

### antigravity: the hook shape, as `agy plugin validate` accepts it

Measured on `agy` 1.5.8 with a throwaway plugin in a scratch workspace. `hooks.json` is a map of
hook-set name → event → entries; tool events take a `matcher` and a nested `hooks` list:

```json
{
  "probe": {
    "PreInvocation": [{ "command": "echo PreInvocation >> /tmp/hooks.log" }],
    "PreToolUse": [
      {
        "hooks": [{ "command": "echo PreToolUse >> /tmp/hooks.log" }],
        "matcher": "*"
      }
    ],
    "SessionStart": [{ "command": "echo SessionStart >> /tmp/hooks.log" }],
    "Stop": [{ "command": "echo Stop >> /tmp/hooks.log" }]
  }
}
```

Events: `SessionStart`, `PreInvocation`, `PostInvocation`, `Stop`, `PreToolUse`, `PostToolUse`. Over
`agy acp` a new session fired `SessionStart`, then `PreInvocation` / `PreToolUse` per step, then
`Stop`; a turn resumed with `session/load` in a fresh process fired `PreInvocation` and `Stop` but
no `SessionStart`. The 1.1.21-era home paths (`~/.gemini/antigravity-cli/hooks.json`,
`~/.gemini/config/hooks.json`) were not re-probed.

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
`plugins/openthrottle-cursor/` (and `openthrottle-cursor-guards`) as separate payloads, and
`AgentDriver.pluginDirRels` naming a driver's payloads (Claude 3, Cursor 2). How payloads are
built, hosted and consumed: [hook-plugin-distribution.md](./hook-plugin-distribution.md).

This is the same shape of half-truth as grok below. Both are recorded rather than smoothed over
because "tool X reads Claude plugins" reads as coverage and is not.

### Skill invocations are not uniformly observable

Claude has a real `Skill` tool, so `PreToolUse` with `matcher: "Skill"` is exact. **Cursor and codex
do not.** In Cursor a skill invocation is only visible as a `Read` of the skill's `SKILL.md` — a
weaker signal, since an agent editing skills reads them too, which is why those rows are recorded
under a distinct `invocation_path` (`skill_read`) rather than folded in with Claude's. Codex is the
same signal through a different tool: measured on codex-cli 0.167.0 (2026-11-24), a filesystem skill
is loaded by `PreToolUse` `tool_name: "Bash"` running `cat <path>/SKILL.md`, recorded as
`skill_read` too. Only that exact command shape matches — see
[`codex-cli-hook-probe.md`](./codex-cli-hook-probe.md#how-a-skill-surfaces-as-a-tool).

This is the single biggest cross-tool difference and it is a **data-quality** difference, not a
plumbing one. Anything comparing skill usage across producers has to account for it.

**Cursor re-measured 2026-11-24 on `cursor-agent` 2026.11.13-eacade1** (OT plan `8f040d3a`): the
`skill_read` path still holds and the whole chain works headless. A scratch repo whose
`.cursor/hooks.json` wired only `preToolUse` → capture and `sessionEnd` → complete, with a skill
whose body runs `skill-usage-outcome.cjs`, produced one usage row (`source: cursor`,
`invocation_path: skill_read`), one deliberate outcome row (`source: cursor`, the session's own id,
a real `duration_ms`) and **no** `session_ended` row, because the reporter claimed the start. The
reporter finds the session through `CURSOR_CONVERSATION_ID` (exported to the Shell tool alongside
`CURSOR_AGENT=1`; it equals the hook payload's `session_id`). Still missing: a signal narrower than
the `SKILL.md` read: Cursor has no `Skill` tool and no skill-specific hook event. This run did not
wire `beforeSubmitPrompt`, so its headless behaviour stands as measured on 2026.09.10.

### Skill telemetry for the agents with no capture adapter (2026-11-24)

A skill's outcome and duration need three things from an agent: a **skill-invocation signal** a hook
can see (capture), a **session-end signal** (completion), and a **session id exported to the shell
tool**, so the deliberate reporter `skill-usage-outcome.cjs` can claim the start capture recorded.
Claude Code, Codex and Cursor have all three (Cursor re-measured above; Codex exports
`CODEX_SESSION_ID` / `CODEX_THREAD_ID` on codex-cli 0.167.0). For the rest, measured or read from
the installed build during OT plan `8f040d3a`:

| CLI             | version | skill signal                                                                                                                    | session end                                                               | session id in the shell tool                                                        | how it was read                                                                                                                                                            |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **gemini-cli**  | 0.25.2  | **yes**: `BeforeTool` with `tool_name: activate_skill`, the skill in `tool_input.name`; skills are behind `experimental.skills` | **yes**: `SessionEnd` (`reason`), `session_id` on every hook              | **no**: `shellExecutionService` adds only `GEMINI_CLI=1` to the shell's environment | the shipped `gemini-cli-core` docs (`docs/hooks/reference.md`, `docs/cli/skills.md`) and source; a live run needs `GOOGLE_CLOUD_PROJECT` on this account, so none was made |
| **opencode**    | 1.19.5  | **likely**: a built-in `skill` tool, observable through a plugin's `tool.execute.before`                                        | **likely**: `session.idle` / `session.deleted` plugin events              | **no**: sets `AGENT=1`, `OPENCODE=1`, `OPENCODE_PID` process-wide; no session id    | strings in the compiled binary; plugins are JS modules (npm or a local plugin file), not hook commands, so an adapter is a different shape                                 |
| **antigravity** | 1.5.16  | **unmeasured**: `PreToolUse` exists (matcher-based); which tool a skill load raises is not captured                             | **unmeasured**: `Stop` fires per turn; no session-end event is documented | **unmeasured**                                                                      | a probe needs `--dangerously-skip-permissions` and `--dangerously-bypass-hook-trust`, which an unattended agent run may not use without the user's say-so                  |
| **grok**        | —       | no `Skill` tool (see below)                                                                                                     | session lifecycle hooks exist                                             | unmeasured                                                                          | record only, as planned                                                                                                                                                    |

**What ships in the meantime.** No adapter: none of these has all three pieces measured, and an
adapter written against unmeasured payloads cannot tell "not a skill" from "the shape changed" (the
bug the first Cursor adapter had). The reporter instead **stands down** in a Gemini CLI or OpenCode
shell (`GEMINI_CLI=1` / `OPENCODE=1`) unless a candidate session holds the skill's start, rather than
writing a row stamped `claude-code` from an inherited parent session id. Antigravity has no shell
marker yet, so a report there can still be mislabelled. Follow-up work is OT plan `4dff4f7e`;
[agent-editor-folders.md § 7](./agent-editor-folders.md#7-cross-agent-parity) holds the per-agent
parity row.

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

Codex reads hooks from `~/.codex/config.toml` in the home directory. An operator configures it
once and it applies everywhere, with no per-repo or per-invocation work.

**Correction, 2026-11-12 (codex-cli 0.167.0):** this section was measured on 0.145.0 as "home
directory, never the repo", and that no longer holds. Codex now loads a project-scoped `.codex/`
layer (`config.toml`, hooks and `rules/`), but **only when the project is trusted**
(`[projects."<path>"] trust_level = "trusted"` in `~/.codex/config.toml`). An untrusted project's
`.codex/` is skipped entirely. A probe confirmed that `codex mcp list` shows a project
`[mcp_servers.*]` entry only after trust is set. This repo now generates `.codex/config.toml` and
`.codex/rules/default.rules` from [`.agents/agent-config.json`](../../.agents/agent-config.json),
see [agent-config-parity.md](./agent-config-parity.md). The home-directory route below still works,
and it is the only one that reaches an untrusted foreign repo. `-c hooks.…`
overrides and `CODEX_HOME` provide per-invocation control if wanted. Confirmed 2026-09-11: there is
**no `--plugin-dir` flag**; `codex plugin` installs from marketplaces instead. So delivery is
documentation: the `config.toml` snippet lives in the README of `plugins/openthrottle-codex/`
(that payload ships no `hooks.json`) and in `packages/agentic-hooks/README.md`.

Codex gates hook execution on trust, with `--dangerously-bypass-hook-trust` as the automation escape
hatch. The name is a fair warning: it is right for OT's own orchestrated runs, whose bundles are
built from this repo's source, and wrong as an interactive convenience.

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
finding.

### Session-start event, for the coverage heartbeat

The coverage heartbeat (contract §8 of
[`child-repo-hook-telemetry-contract.md`](./child-repo-hook-telemetry-contract.md)) needs one event
that fires **once per session, in a headless run**. Measured 2026-11-14 (OT plan `47305386`) in a
scratch git repo, each CLI wired to a recorder that appends raw stdin to a JSONL file, prompted with
"Reply with the single word PONG.":

| CLI              | version            | headless invocation                                                                    | session-start event                | evidence                                                                                                                                                                                               |
| ---------------- | ------------------ | -------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **claude**       | —                  | `claude -p`                                                                            | `SessionStart`                     | already shipped (plan `c4ece7fe`)                                                                                                                                                                      |
| **cursor-agent** | 2026.11.11-b912975 | `cursor-agent -p --force --trust` with `.cursor/hooks.json`                            | `sessionStart`                     | fired once, before the turn; `sessionEnd` once after; `stop` did not fire. Carries `session_id`, `workspace_roots`, `model`, `cursor_version` — **and `user_email`**, which must never be forwarded    |
| **codex**        | codex-cli 0.167.0  | `codex exec --dangerously-bypass-hook-trust -c 'hooks.SessionStart=[…]'`               | `SessionStart` (`source: startup`) | fired once, before the turn; then `Stop` per turn and `SessionEnd` (`reason: other`). Carries `session_id`, `cwd`, `model`, `transcript_path`                                                          |
| **antigravity**  | agy 1.5.9          | `agy --dangerously-skip-permissions -p '…'` with a workspace plugin `.agents/plugins/` | `SessionStart`                     | fired once, before `PreInvocation` and `Stop`. **camelCase** envelope: `conversationId`, `cwd`, `workspacePaths`, `modelName`, `hookEventName` — **and `lastUserInput`** (the prompt), never forwarded |

Every one of the three has a usable event: the heartbeat's gap was adapters, not events, and all
three now send it (plan `47305386`; contract §8 of the telemetry contract says how each one's
delivery leg is read). Two
caveats carry over from the sections above: an `agy` turn resumed with `session/load` fires no
`SessionStart` (right for a heartbeat — it is the same session), and codex skips a hook source it
has not trusted unless the run passes `--dangerously-bypass-hook-trust`. Also, `agy` refuses
`-p --dangerously-skip-permissions "…"` — `-p` takes the next argument as its prompt — so flags go
before `-p`.

### Marketplace install records, for the coverage heartbeat

The heartbeat's `marketplacePluginInstalled` / `marketplacePluginVersion` fields and its
`marketplace` delivery leg need two facts per tool: **where a marketplace install unpacks** (so a
hook running from there reads as `marketplace`) and **what a hook can read to say whether the
OpenThrottle plugin is installed, at which version**. Measured 2026-11-14 (OT plan `6b0fb4c4`).
Every install went into a throwaway home (`CODEX_HOME=…`, `HOME=…`) from a local git marketplace
holding one probe plugin, so no real config was touched; Cursor's row is read off the existing
installs on the probe machine, because its CLI cannot install.

| CLI              | version            | install location                                                           | install record a hook can read                                                                                                                                                                                                                                                                        | evidence                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **claude**       | —                  | `<config dir>/plugins/cache/<marketplace>/<plugin>/<version>/`             | `<config dir>/plugins/installed_plugins.json` → `plugins["openthrottle@openthrottle"][0].version`                                                                                                                                                                                                     | already shipped (`utils/claude-heartbeat.ts`)                                                                                                                                                                                                                                                                                                               |
| **cursor-agent** | 2026.11.13-eacade1 | `~/.cursor/plugins/cache/<marketplace>/<plugin>/<git sha>/`                | **none readable.** The real record is the IDE's sqlite store (`state.vscdb`, key `cursor.plugins.installedIds.<userId>\|<workspace>` → `[{id, sources}]`, numeric server ids). The cache directory is the best signal: a finished unpack carries a `.cache-complete` marker and the plugin's manifest | `cursor-agent plugin` has only `marketplace add\|list\|remove\|update` — **no install command**; installing happens in the IDE. Two existing installs (`cursor-public/cursor-team-kit/3dbd22ff…/`, `cursor-public/datadog/dde3591e…/`) both carry `.cache-complete` + `.cursor-plugin/plugin.json`. Whether an IDE uninstall prunes the cache is unmeasured |
| **codex**        | codex-cli 0.167.0  | `$CODEX_HOME/plugins/cache/<marketplace>/<plugin>/<version>/`              | `$CODEX_HOME/config.toml` table `[plugins."<plugin>@<marketplace>"]` with `enabled = true\|false`; the version is the cache directory name and its manifest                                                                                                                                           | `codex plugin marketplace add <dir>` + `codex plugin add ot-probe@ot-probe-mp` wrote both; `codex plugin remove` deleted the table **and** the cache directory. It installs a **Claude-format** marketplace too: this repo's `.claude-plugin/marketplace.json` installed as `openthrottle@openthrottle` at `…/cache/openthrottle/openthrottle/1.3.0/`       |
| **antigravity**  | agy 1.5.9          | `~/.gemini/config/plugins/<dir>/` (flat — no marketplace or version level) | `~/.gemini/config/plugins/<dir>/plugin.json` (`version`); `~/.gemini/config/config.json` `plugins.<dir>.enabled` (absent until first toggled, meaning enabled); `~/.gemini/config/import_manifest.json` lists `{name, source, importedAt, components}` with no version                                | `agy plugin install <dir>` and `agy plugin import claude` both land here; `disable` / `enable` flip `config.json`; `uninstall` deletes the directory and the manifest entry. `plugin@marketplace` resolves only against two catalogs compiled into the binary (`antigravity-plugins-official`, `-partners`), so OpenThrottle cannot be installed that way   |

Three findings change what the heartbeat can claim, and the third is a coverage gap rather than a
detail:

- **Codex runs a marketplace plugin's hooks**, with `PLUGIN_ROOT` and `CLAUDE_PLUGIN_ROOT` both set
  to the install directory and cwd = the session's cwd — but only once the hooks are trusted
  (`--dangerously-bypass-hook-trust` in the probe; without it the `SessionStart` hook did not run).
  `codex features list` reports `plugin_hooks` as `removed`: that is the retired flag, not the
  behavior.
- **agy rewrites `${CLAUDE_PLUGIN_ROOT}/…` to `./…`** when it imports a Claude plugin, and runs hooks
  with cwd = the plugin folder. It drops what it cannot map (`PreToolUse` on `Skill`,
  `UserPromptExpansion`) with a warning — the same loss as Cursor's translation, but said out loud.
- **All three run the Claude plugin's bundles, which report themselves as `claude-code`.**
  cursor-agent ran the machine's _Claude-installed_ `openthrottle` plugin's `SessionStart` hook
  during a plain `cursor-agent -p` in a scratch repo — reproduced twice, the receipt in
  `~/.openthrottle/skill-usage/last-heartbeat.json` stamped inside each run's window with
  `source: claude-code`, `deliveryLeg: marketplace`. Codex and agy, installing this repo's
  marketplace, get the same `skill-usage-heartbeat.cjs`. So a marketplace install reached through
  any of them is counted as a Claude Code session, and the per-tool heartbeat adapters only ever run
  from a repo or `--plugin-dir` registration.

Re-check of the 2026.11.13 side observation: in this run cursor-agent did **not** leak
`CURSOR_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT` into a project `.cursor/hooks.json` hook (an `env` dump
came back empty), so the leak is intermittent at best. The Cursor adapter's script-location check
stays.

### Which tool is running the Claude bundles

Decided 2026-11-14 (OT plan `8f9ce368`): **the Claude bundles detect the tool running them** and
act for it, rather than shipping one marketplace per tool. Per-tool marketplaces cannot fix the
measured case: cursor-agent runs whatever the user installed through _Claude_, whatever else we
publish; agy cannot install from our marketplace at all (`plugin@marketplace` only resolves its two
compiled-in catalogs); and codex would still accept the Claude-format one.

What each tool hands a Claude-format plugin hook. Cursor re-measured 2026-11-14 on 2026.11.13-eacade1
(an `env` dump from a probe plugin passed with `--plugin-dir`, run from a scratch repo); codex and
agy are the plan `6b0fb4c4` measurements in the section above:

| host             | marker the bundle reads                                                                  | other facts                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **cursor-agent** | `CURSOR_PLUGIN_ROOT` set, equal to `CLAUDE_PLUGIN_ROOT`, and the running script under it | also sets `CURSOR_PROJECT_DIR`, `CLAUDE_PROJECT_DIR` (both the session's repo), `CURSOR_VERSION`, `CURSOR_INVOKED_AS=cursor-agent`, `CURSOR_USER_EMAIL`; cwd = plugin folder |
| **codex**        | `CLAUDE_PLUGIN_ROOT` (and `PLUGIN_ROOT`) under `$CODEX_HOME/plugins/cache/`              | cwd = the session's cwd                                                                                                                                                      |
| **antigravity**  | the running script under `~/.gemini/config/plugins/` (agy rewrites the root to `./`)     | cwd = plugin folder; the repo comes from the payload's `cwd`                                                                                                                 |
| **claude**       | none of the above                                                                        | Claude Code never sets `CURSOR_PLUGIN_ROOT` and never unpacks under codex's or agy's directories                                                                             |

Only per-hook variables count. A hook inherits its host's whole environment, so `CLAUDECODE=1` and
the rest of `CLAUDE_CODE_*` reach a cursor-agent hook whenever cursor-agent was itself started from
a Claude Code session (the probe above was), and are no evidence of the host.

What the bundles do once the host is known:

- **Heartbeat: sent, as the host.** `source` is the host's id (`cursor`, `codex`, `antigravity`);
  the delivery leg and the marketplace fields describe the install that delivered this copy — a
  Claude-installed plugin under Cursor reads Claude's `installed_plugins.json`, a codex install its
  `config.toml`, an agy copy its plugins directory.
- **Heartbeat: stands down when the host's own registration will send one.** That is the
  double-heartbeat guard. cursor: the repo's `.cursor/hooks.json` registers `skill-usage-heartbeat`
  (this repo does); codex: `$CODEX_HOME/config.toml` or the repo's `.codex/config.toml` does; agy:
  a workspace plugin under `.agents/plugins/` does (this repo's does). The Claude-host check —
  `.claude/settings.json` — is wrong under the other hosts: cursor-agent `-p` did **not** run a
  repo's `.claude/settings.json` `SessionStart` hook in either probe (with and without a
  `.cursor/hooks.json`), so this repo avoided a double only because it registers both.
- **Capture and completion: stand down.** Their parsers read Claude payloads. Under cursor and agy
  the events they key on are dropped anyway; under codex a `Stop` would feed a codex transcript to
  the Claude token-usage reader and stamp the `claude auth status` login on it. The host's own
  adapter is the only correct producer, so there is nothing to attribute.

### Session kickoff guard

The plan-first kickoff rule (follow-up work starts as `/ot-loop <planUuid>`; see the
[`ot-plans` skill](../../skills/ot-plans/SKILL.md#follow-ups-and-session-kickoff)) can only be
_blocked_ where an agent starts a **separate** session through a tool call a `PreToolUse`-style hook
sees. In-task subagents are exempt by design — `ot-loop` treats them as workers inside one task — so
they are not that hook point. Measured 2026-10-31 by reading `cursor-agent` 2026.10.22-27dcf5f's
shipped bundle and the strings of `codex-cli` 0.145.0; no payload was captured live.

| CLI              | separate-session tool the agent calls                                                                                                                                                                                   | guard                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **claude**       | the desktop app's `start_session` / `hand_off_to_session` (brief in `prompt` / `remaining_plan`)                                                                                                                        | **shipped** — `openthrottle-workflow` plugin's `require-ot-plan-kickoff` |
| **cursor-agent** | **none.** `Task` is an in-task subagent. Background agents are started by a person; their `sessionStart` carries `is_background_agent: true` and no prompt, and can return `env` / `additional_context` but cannot deny | nothing to block; `AGENTS.md` already carries the rule                   |
| **codex**        | **none.** `spawn_agent` / `send_input` / `wait_agent` / `close_agent` manage sub-agents under the current task (`/root/task1/task_3`); `codex cloud` is a person's command                                              | nothing to block                                                         |
| others           | unprobed                                                                                                                                                                                                                | —                                                                        |

Two things follow. First, the session guard is Claude-only because only Claude has the thing it
guards, not because the other adapters are missing; the decision itself is tool-neutral
(`packages/agentic-hooks/src/data/kickoff.ts`), so a CLI that grows such a tool needs only an adapter.
Second, cursor-agent reads `.claude/settings.json` and Claude plugins' hooks, so it may load the Claude registration — that is
harmless: the adapter checks the tool name itself and allows anything that is not a kickoff tool,
whether or not Cursor applies the `matcher`. The layer that reaches every CLI, and every person, is
git: the pre-push `Plan-Id:` check.

**Re-probe when** a CLI ships a tool that starts a separate session or background agent from inside
a turn — grep the bundle for it, as above, then capture one real payload before writing an adapter.

## What is machine-checked and what is not

This document warns that it goes stale silently, which is a reason to move what can be asserted out
of prose. Half of it now is:

- **Machine-checked.** Which drivers advertise `capabilities.pluginDir`, and which payload each names
  via `AgentDriver.pluginDirRel`, are asserted in
  `packages/openthrottle-drivers/src/utils/__tests__/plugin-dir.test.ts`. A driver that gains or
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
  delivery leg, all verified end-to-end. Codex has completion and both capture paths (`skill_read`
  via `PreToolUse`, and slash commands), and needs no injection.
- **grok and opencode** stay on option D (server-side transcript derivation) for now: grok because
  trust and the missing `Skill` tool block it structurally, opencode because it needs a published npm
  package. Neither is blocked by a _lack_ of out-of-repo config.
- **antigravity** has hooks verified in-repo (a workspace plugin) and sends the coverage heartbeat
  from there; skill capture and the out-of-repo route are still unprobed.

Nothing here requires writing into a target repository for any of the seven.
