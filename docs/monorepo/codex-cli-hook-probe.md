# `codex` CLI hook surface — measured

**Measured 2026-09-11** against `codex-cli` **0.145.0** by running the installed binary with hooks
wired to a stdin recorder, and by reading the JSON schemas the binary embeds. **`PreToolUse` re-probed
2026-11-24** against **0.167.0**. Sibling of
[cursor-agent-hook-probe.md](./cursor-agent-hook-probe.md) and
[agent-cli-hook-capability-matrix.md](./agent-cli-hook-capability-matrix.md).

Captured payloads are committed as fixtures at
`packages/agentic-hooks/src/adapters/codex/__tests__/fixtures/` (paths scrubbed).

## What was captured

**0.145.0, live:** `SessionStart`, `UserPromptSubmit`, `SessionEnd`. `PreToolUse` could not be
captured then: `codex` auth on the probe machine had expired, so no model call and no tool call ran.

**0.167.0, live (2026-11-24):** `PreToolUse`, `PostToolUse`, `Stop`, from a session in a scratch repo
asked to "Use the ot-probe-ping skill" — see
[How a skill surfaces as a tool](#how-a-skill-surfaces-as-a-tool). The `PreToolUse` payload is the
`pre-tool-use.json` fixture.

## Hook events

Confirmed in the binary: `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`,
`PostCompact`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`,
`Stop`.

Codex uses **Claude's event names**, and a Claude-shaped payload envelope. The names are `PascalCase`
in the hook config and in `hook_event_name`.

## Payload shapes

Every captured payload carries `session_id`, `cwd`, `hook_event_name` and `transcript_path`, plus a
Codex-only `turn_id` on turn-scoped events (the binary documents it as "Codex extension: expose the
active turn id to internal turn-scoped hooks").

`UserPromptSubmit` — the event capture is built on:

```json
{
  "session_id": "01a092c0-…",
  "turn_id": "01a092c0-…",
  "transcript_path": "…/sessions/2026/09/11/rollout-….jsonl",
  "cwd": "/tmp/probe-repo",
  "hook_event_name": "UserPromptSubmit",
  "model": "gpt-5.1-codex",
  "permission_mode": "bypassPermissions",
  "prompt": "Use the foreign-ping skill."
}
```

`SessionEnd` adds `reason`, observed as `"other"` for a normal end. **`reason` is not an outcome** —
it does not distinguish success from failure the way Cursor's `final_status` does, so the completion
adapter records `success` rather than inventing a mapping from a field that does not carry the
distinction.

`PreToolUse` / `PostToolUse` schemas, read verbatim from the binary's embedded JSON schema
(`pre-tool-use.command.input`), require: `cwd`, `hook_event_name`, `model`, `permission_mode`,
`session_id`, `tool_input`, `tool_name`, `tool_use_id`, `transcript_path`, `turn_id`; `agent_id` and
`agent_type` are optional. That is the same shape Claude's `PreToolUse` has.

## How a skill surfaces as a tool

**Answered 2026-11-24 on 0.167.0.** Codex has **no `Skill` tool**. Its system prompt lists each skill
with a short path into a "Skill roots" table and tells the model to read the `SKILL.md` before acting;
the model does that with its `Bash` tool:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "cat .agents/skills/ot-probe-ping/SKILL.md" },
  "tool_use_id": "exec-b8ed9ba6-…",
  "session_id": "01a21067-…",
  "turn_id": "01a21067-…",
  "cwd": "/tmp/probe-repo",
  "model": "gpt-6-luna",
  "permission_mode": "bypassPermissions",
  "transcript_path": "…/sessions/2026/11/24/rollout-….jsonl"
}
```

The skill name is the `SKILL.md`'s parent directory — the same signal Cursor gives with a `Read`, so
the adapter records it under the same `invocation_path`, `skill_read`. A second probe with a
700-line `SKILL.md` was also read with one `cat`, not paged with `sed -n`.

The adapter matches **only** that shape: one `cat`, one optionally quoted path ending in
`/<name>/SKILL.md`, no pipes, chains, redirects or substitutions. A `sed -n`, `head` or compound read
returns null. Those were not observed, and a normalizer that guesses at them cannot tell "not a skill
invocation" from "the shape changed underneath us". A change in how codex loads skills therefore shows
up as missing rows rather than wrong ones; the re-probe triggers below are how it is caught.

**Hooks inherit the session's sandbox network policy.** Verified live on 2026-11-24: under
`codex exec -s read-only` the capture post and the coverage heartbeat both failed with
`fetch failed` and the event was buffered to `~/.openthrottle/skill-usage/` (the drain delivered it
later, unchanged). Under the default `workspace-write` the same capture posted directly. Telemetry from
read-only codex sessions therefore arrives late, on the next drain, rather than not at all.

Cloud skills are different: the prompt sends them through a `skills.list` / `skills.read` tool with
`skill://` identifiers. OpenThrottle's skills are filesystem skills, so that path is not captured.

## Probe method (repeatable)

Isolate a home directory so the operator's own config is untouched:

```bash
export CODEX_HOME=/tmp/codex-probe-home
mkdir -p "$CODEX_HOME"
cat > "$CODEX_HOME/config.toml" <<'TOML'
[[hooks.PreToolUse]]
[[hooks.PreToolUse.hooks]]
type = "command"
command = "/tmp/record.cjs"
TOML
codex exec --dangerously-bypass-hook-trust --skip-git-repo-check -s read-only "…" < /dev/null
```

`codex doctor` reports whether `config.toml` parsed. Note that an isolated `CODEX_HOME` also
isolates auth, so it needs its own `codex login` — copying `auth.json` in does not work once the
token needs refreshing.

## Delivery: no injection mechanism is needed

Codex reads hooks from `~/.codex/config.toml` — the operator's home directory, never a repository —
so unlike Claude and Cursor there is nothing to inject. An operator configures it once and it applies
in every repo. There is no `--plugin-dir` flag (`codex plugin` installs from marketplaces instead),
so delivery is **documentation**, and the copy-pasteable block lives in
`packages/agentic-hooks/README.md`.

Per-invocation control exists via `-c hooks.…=…` and `CODEX_HOME`.

## The trust gate

Codex will not run hooks it has not persisted trust for. `--dangerously-bypass-hook-trust` skips
that check for one invocation, and its help text is blunt: "DANGEROUS. Intended only for automation
that already vets hook sources."

Read it literally. The flag is appropriate for **OT's own orchestrated runs**, where OT generated the
hook bundles, committed them, and drift-checks them byte-for-byte — the source is vetted by
construction. It is **not** appropriate as a convenience in an operator's interactive shell, and not
appropriate in any context where the hook commands could come from somewhere the operator has not
audited: trusting once, interactively, is the cheap and correct thing there.

## Hook environment

Codex exports no `CODEX_PROJECT_DIR` equivalent. The adapter takes the repo root from the payload's
own `cwd`, which every event carries, falling back to `OPEN_THROTTLE_REPO_ROOT` then `process.cwd()`.

## Re-probe triggers

Codex ships fast. Re-probe when: a release changes the hook event list; a release changes the
"Skills" section of its system prompt (how a skill is loaded); or a `skill_usage_events` count for
`source = 'codex'`, `invocation_path = 'skill_read'` drops to zero on a machine still running codex.
