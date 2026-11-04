# `cursor-agent` hook surface — measured

**Measured 2026-09-11** against `cursor-agent` **2026.09.10-fd3934a** by running the installed
binary, capturing raw hook stdin, and reading the shipped bundle. Nothing here is from a docs site.

Sibling of [agent-cli-hook-capability-matrix.md](./agent-cli-hook-capability-matrix.md), which
summarizes every CLI; this file is the primary record for the Cursor row. Captured payloads are
committed as test fixtures at
`packages/agentic-hooks/src/adapters/cursor/__tests__/fixtures/` (paths and the operator email
scrubbed; everything else verbatim).

## Method

A scratch git workspace with `.cursor/hooks.json` wiring **all 18 events** to one recorder that
appends raw stdin to a JSONL file and exits 0, plus a trivial skill at
`.agents/skills/probe-ping/SKILL.md` and a command at `.cursor/commands/probe-cmd.md`. Two headless
runs:

1. `cursor-agent -p --force --trust "Use the probe-ping skill. Then create a file… and run a shell
command…"` → 17 hook invocations.
2. `cursor-agent -p --force --trust "/probe-cmd"` → 3 hook invocations.

## The headline: there is no `Skill` tool, and a skill invocation is a `Read`

**A skill invocation is observable only as a `Read` of the skill's `SKILL.md`.** Cursor has no
`Skill` tool and no skill- or command-specific hook event. To use a skill the agent must read its
`SKILL.md`, which raises `preToolUse` with `tool_name: "Read"` and the path in
`tool_input.file_path`:

```json
{
  "tool_name": "Read",
  "tool_input": { "file_path": "…/.agents/skills/probe-ping/SKILL.md" },
  "tool_use_id": "toolu_bdrk_01Rrz6…",
  "session_id": "e747cb7c-…",
  "hook_event_name": "preToolUse",
  "workspace_roots": ["…"]
}
```

The skill name is the **parent directory** of `SKILL.md`. The same read also raises `beforeReadFile`
(which additionally carries the file `content`), but `beforeReadFile` has **no `tool_use_id`**, so
`preToolUse` is the correlatable one and the right event to capture on.

Grepping the shipped bundle for `"Skill"` returns only UI strings ("Create New Skill"); the model
side speaks of `referencedSkills` / `selectedSkills` / `skill_descriptors`, i.e. context injection,
not tool dispatch.

**Known limitation, stated plainly:** reading a `SKILL.md` is not proof of _using_ the skill. An
agent editing skills in this repo reads them too. There is no narrower signal available — the
alternative is deriving usage from the transcript server-side. Capture events from this path should
be tagged with a distinct `invocation_path` so the data stays separable.

## `beforeSubmitPrompt` never fires in headless runs — the current wiring is dead

`.cursor/hooks.json` in this repo wires `skill-usage-capture.cjs` to `beforeSubmitPrompt`.

- Run 1 (plain prompt): **no `beforeSubmitPrompt`**.
- Run 2 (`/probe-cmd`, a real slash command that provably expanded — the agent replied `CMDPROBE`):
  **no `beforeSubmitPrompt`**. Only `sessionStart`, `afterAgentThought`, `sessionEnd`.

So in `-p` mode — the mode OT orchestrates — that event does not fire at all. Even where it does
fire, its payload is `{prompt, attachments, composer_mode, …}` and carries no skill identity, and
the current normalizer looks for `skill` / `skill_name` / `command` / `command_name`, none of which
exist on any event.

**Verdict: the Cursor capture hook has never recorded a real invocation.** Confirmed against the
data — `skill_usage_events` holds exactly one row with `source = 'cursor'`, and it is a synthetic
probe from 2026-08-08 (`session_id = 'cursor-e2e'`, `args = 'cursor e2e'`), not a real session.

## `stop` does not fire either; `sessionEnd` is the completion signal

`stop` fired in neither run. `sessionEnd` fired in both, and carries everything a completion hook
needs:

```json
{
  "reason": "completed",
  "final_status": "completed",
  "duration_ms": 34945,
  "session_id": "e747cb7c-…",
  "hook_event_name": "sessionEnd",
  "workspace_roots": ["…"]
}
```

This answers the open design question directly: **Cursor's completion adapter must key off
`sessionEnd`, not `stop`.** `stop` is Cursor's per-turn analogue of Claude's `Stop` (the bundle
applies the same `loop_count` / `loop_limit` guard to `stop` and `subagentStop`), whereas
`sessionEnd` is a true once-per-session signal that fires headless. Using `stop` would have produced
nothing at all in orchestrated runs.

## Every payload carries the same envelope

Present on all 18 events, without exception:

| field                              | note                                                               |
| ---------------------------------- | ------------------------------------------------------------------ |
| `session_id`                       | equal to `conversation_id` in these runs; correlation works        |
| `conversation_id`, `generation_id` | —                                                                  |
| `hook_event_name`                  | the Cursor event name, camelCase                                   |
| `workspace_roots`                  | **snake_case array**, not `workspaceRoots`; `[0]` is the repo root |
| `cursor_version`                   | —                                                                  |
| `model`                            | —                                                                  |
| `user_email`                       | **operator PII — must never be forwarded**                         |
| `transcript_path`                  | `null` early in a session, set once the transcript exists          |

`cwd` is **not** a general envelope field — it appeared only on the `Shell` tool's `preToolUse` /
`postToolUse`. Resolve cwd from `workspace_roots[0]`.

The existing normalizer reads `workspaceRoots` (camelCase). That spelling does not exist; only the
snake_case form does.

## The 18 events, confirmed present in the binary

`sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`,
`subagentStop`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution`,
`afterMCPExecution`, `beforeReadFile`, `afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`,
`afterAgentResponse`, `afterAgentThought`.

Observed firing in a headless run: `sessionStart`, `afterAgentThought`, `preToolUse`,
`beforeReadFile`, `postToolUse`, `postToolUseFailure`, `beforeShellExecution`, `afterShellExecution`,
`afterFileEdit`, `sessionEnd`.

## `--plugin-dir` exists, and Cursor also reads Claude hook config

`cursor-agent --help` confirms `--plugin-dir <path>` — "Load a local plugin directory (can be
specified multiple times)". Repeatable, exactly like Claude's.

Beyond that, the bundle's hook resolver merges hooks from **nine** sources, additively:
`enterprise`, `team`, `user`, `project`, `runtime`, `claude-project`, `claude-project-local`,
`claude-user`, and installed plugins. Cursor genuinely reads Claude's hook configuration and even
maps its own events onto Claude's names (`beforeReadFile` → `Read`, `beforeSubmitPrompt` →
`UserPromptSubmit`, `stop` → `Stop`).

That is less useful than it sounds, for the same reason grok's Claude-plugin compatibility was:
our Claude wiring matches `PreToolUse` with `matcher: "Skill"`, and Cursor has no `Skill` tool. A
Cursor-shaped payload is still required.

For plugin-supplied hooks the working directory is the plugin's `installPath`, **except** for `stop`
and `subagentStop`, which get the workspace path.

## Hook environment

`buildHookEnvironment` exports:

- `CURSOR_PROJECT_DIR` — the workspace path (so the existing adapter's env read is correct)
- `CURSOR_VERSION`
- `CURSOR_USER_EMAIL`, when resolvable
- `CURSOR_TRANSCRIPT_PATH`, when a transcript exists
- `CLAUDE_PROJECT_DIR` — set to the same workspace path, as a compatibility alias

## Re-probe triggers

`cursor-agent` ships releases continuously. Re-run the probe when: a release lands and this package
is being changed; `beforeSubmitPrompt` or `stop` start firing headless; or a `Skill`-shaped tool
appears in the bundle (grep `"Skill"` — today it is UI strings only).
