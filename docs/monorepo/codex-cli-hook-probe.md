# `codex` CLI hook surface — measured

**Measured 2026-09-11** against `codex-cli` **0.145.0** by running the installed binary with hooks
wired to a stdin recorder, and by reading the JSON schemas the binary embeds. Sibling of
[cursor-agent-hook-probe.md](./cursor-agent-hook-probe.md) and
[agent-cli-hook-capability-matrix.md](./agent-cli-hook-capability-matrix.md).

Captured payloads are committed as fixtures at
`packages/agentic-hooks/src/adapters/codex/__tests__/fixtures/` (paths scrubbed).

## What was captured, and what was not

**Captured from a live run:** `SessionStart`, `UserPromptSubmit`, `SessionEnd`.

**Not captured: `PreToolUse`.** The probe session reached the model call and failed there —
`codex` authentication on the probe machine is expired (`~/.codex/auth.json` last refreshed
2026-02-03, seven months before the probe; the file is untouched and the same failure reproduces
with the real home directory, so this predates the probe). No model call means no tool call, so
no `PreToolUse` payload. **The tool-based capture branch is therefore NOT implemented** — see
[Open question](#open-question-how-does-a-skill-surface-as-a-tool) below.

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

## Open question: how does a skill surface as a tool?

`PreToolUse` carries `tool_name` and `tool_input`, so a skill invocation is observable **in
principle**. What is unknown is which `tool_name` a skill produces, and where in `tool_input` the
skill name sits.

Grepping the binary for a `Skill`-shaped tool finds only skill-_authoring_ helper scripts
(`skill_name` / `skill_dir` argparse arguments in an embedded Python template), not a tool
definition — which weakly suggests Codex resolves skills the way Cursor does, by reading `SKILL.md`,
rather than through a dedicated tool. **That is a suggestion, not a measurement, and the adapter
does not act on it.**

This is deliberate. A normalizer written against a guessed tool name cannot distinguish "not a skill
invocation" from "the shape changed underneath us" — precisely the bug the Cursor adapter carried
for a year. The branch stays out until a real payload can be captured.

**To close this:** restore `codex` login (`codex login`), then re-run the probe method below and add
the `PreToolUse` branch with a committed fixture.

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

Codex ships fast. Re-probe when: `codex login` is restored (to close the `PreToolUse` question);
a release changes the hook event list; or Agent Plugins support changes how skills are resolved.
