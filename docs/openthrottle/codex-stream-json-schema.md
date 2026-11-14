# codex stream-json schema

The headless event stream the `codex` chat backend
(`packages/openthrottle-agentic-utils/src/utils/conversation-backend/codex/`) and the `codex` plan-run
driver (`packages/openthrottle-drivers/src/drivers/codex.ts`) are built against. codex calls it
`--json` (JSONL "thread events"), not `stream-json`.

> **Provenance.** Verified against codex-cli **0.145.0** (`codex exec --help`, per the driver header).
> The failure envelope (`thread.started`, `turn.started`, `error`, `turn.failed`) was captured from a
> real run. The **success path could not be captured live**: the host codex login had expired
> (`401 refresh_token_reused`) while this was authored. The `item.completed` and `turn.completed`
> shapes below come from the mapper and its tests, and the only full-stream example
> (`structured-output/__tests__/fixtures/codex.synthetic.ndjson`) is **synthetic**, built from those
> test shapes. Treat every example here as illustrative, not captured. Refresh with a live capture
> once codex is authenticated (see [section 11](#11-how-to-reproduce)).

## 1. Invocation contract

Chat path (`argv.ts`, `buildCodexArgv`), spawned without a shell, every value its own argv element:

```
codex exec [resume] --json --skip-git-repo-check <sandbox flags> \
  [-c model_reasoning_effort=<effort>] \
  [--oss --local-provider ollama -c model_providers.oss.base_url="<url>"] \
  [--model <id>] -- [<session-id>] "<prompt>"
```

| Flag / element                                     | Meaning                                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `exec`                                             | Non-interactive subcommand. A resumed turn is `exec resume … -- <session-id> <prompt>`.                          |
| `--json`                                           | JSONL thread-event stream on stdout (this doc).                                                                  |
| `--skip-git-repo-check`                            | Run in a workspace that is not a git repo.                                                                       |
| `--sandbox read-only`                              | Default and `supervised` posture. A headless `exec` cannot prompt, so read-only is the safe default.             |
| `--sandbox workspace-write`                        | `autoAcceptEdits` posture.                                                                                       |
| `--dangerously-bypass-approvals-and-sandbox`       | `fullAccess` posture.                                                                                            |
| `-c sandbox_mode="<mode>"`                         | Resumed turns only: `exec resume` (0.167.0) rejects `--sandbox`, so the same policy goes in as a config key.     |
| `-c model_reasoning_effort=<v>`                    | Reasoning effort; `high`/`extraHigh`/`max`/`ultra` clamp to `high`. Omitted when unset.                          |
| `--oss --local-provider ollama -c …base_url=<url>` | Local OpenAI-compatible endpoint through codex's built-in OSS provider. The `-c` value is a TOML string literal. |
| `--model <id>`                                     | Omitted when blank or `auto`.                                                                                    |
| `--`                                               | End-of-options marker. Verified honored, so a prompt starting with `-` or `---` is never parsed as a flag.       |

The binary comes from `OPENTHROTTLE_CODEX_BIN`, else `codex` on PATH. Resume without a session id
throws before spawn.

Plan-run path (driver `buildShellCommand`):

```
codex exec --json --sandbox workspace-write --skip-git-repo-check [endpoint flags] [effort] [--model <id>] "<prompt>"
```

`--json` is added right after `codex exec` only when `outputFormat` is `structured`; otherwise the
command is the plain text form. The plan-run command pins `--sandbox workspace-write` and, like the chat path, passes
`--skip-git-repo-check` (without it a cwd that is not a trusted git repo exits 1).

## 2. Framing & event taxonomy

JSONL on stdout, one object per line, discriminated by a dot-namespaced `type`. Unlike claude there
is no nested envelope: every event is top-level.

| type             | Fields the mapper reads | Notes                                                                                   |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `thread.started` | `thread_id`             | Minted thread id; the resume id.                                                        |
| `turn.started`   | none                    | Lifecycle marker. Skipped.                                                              |
| `item.started`   | `item` (record)         | Opens a tool item's card; skipped for text (see [section 3](#3-assistant-text--items)). |
| `item.updated`   | not read                | Lifecycle. Skipped.                                                                     |
| `item.completed` | `item` (record)         | Carries the full finished item.                                                         |
| `turn.completed` | `usage`                 | Terminal success. Passed through verbatim.                                              |
| `turn.failed`    | `error.message`         | Terminal failure.                                                                       |
| `error`          | `message`               | Bare stream error, for example an auth failure.                                         |

Item discriminant: the mapper reads `item.item_type`, falling back to `item.type`, because the
serde spelling could not be confirmed against a live success run. Item kinds named in the mapper:
`agent_message`, `reasoning`, `command_execution`, `mcp_tool_call`, `file_change`, `web_search`,
`todo_list`. A live `command_execution` (conversation `479cf7c4`, 2026-11-13) is
`{id, type, status, command, exit_code, aggregated_output}`, with `command` wrapped in the login
shell (`/bin/zsh -lc '…'`) and `status` `failed` on a non-zero exit. Other kinds' field sets are
read defensively.

## 3. Assistant text & items

For text items only `item.completed` is mapped, and it carries the **full** item (the whole assistant
message in `item.text`). Mapping `item.started` or `item.updated` too would double-count, so they are
skipped for text. There is no incremental text delta: text arrives once per message, after it is complete.

## 4. Thinking & tool calls

- `reasoning` items carry the full reasoning text in `item.text`.
- Tool items (`command_execution`, `mcp_tool_call`, `file_change`, `web_search`, `todo_list`, …)
  map like every other backend's tools: a `tool_call` chunk (`callId` = `item.id`, `toolCall` = the
  arguments) opens the card on `item.started`, and a `tool_result` chunk (`toolCall` = the result,
  `isError`) resolves it on `item.completed`. An item seen only as `item.completed` gets both at
  once, so no card has a result without arguments. Per-kind readers: `codex/tool-items.ts`.
- codex has no tool name of its own. The item kind is what the activity was, so the mapper uses it
  as `toolName`.

## 5. System prompt / persona

Not observed as a flag in the argv builder. The chat caller applies the persona prefix to the prompt
before building argv (`CodexArgvOptions.prompt` is documented as "persona prefix already applied").

## 6. Sessions & multi-turn

codex mints the thread id on a fresh `exec` and reports it in `thread.started.thread_id`. The next
turn is `exec resume … -- <thread_id> "<prompt>"`. The adapter surfaces the id as a `session` chunk
before any terminal chunk so the service persists it.

## 7. Errors, exit codes, cancellation

The failure envelope from the real expired-login run is `thread.started`, `turn.started`, `error`,
`turn.failed`. The mapper treats the first of `error` and `turn.failed` as terminal. The chat adapter
also reads stderr and process exit (`describeExit('codex', …)`) and applies a SIGTERM to SIGKILL
escalation on cancel or timeout. Specific exit codes are not observed.

## 8. Auth, models, discovery

Auth is codex's own login under HOME. The chat child gets a scrubbed environment (host codex
credentials, none of the server's secrets). The failure path above shows an expired login surfaces as
`error` then `turn.failed`, not as a process-level auth error. Model listing and version probing are
driver concerns and not covered here.

## 9. Event to ConversationStreamChunk mapping

`createCodexEventMapper()` returns a per-stream mapper whose `map(event)` returns zero or more chunks;
its only state is the set of item ids whose card is already open.

| CLI event                                           | Chunk         | Notes                                                                                                                        |
| --------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `thread.started`                                    | `session`     | `metadata.sessionId` = `thread_id` (or `null`).                                                                              |
| `item.completed`, `agent_message`                   | `text`        | `delta` = `item.text`.                                                                                                       |
| `item.completed`, `reasoning`                       | `thinking`    | `delta` = `item.text`.                                                                                                       |
| `item.started`, a tool kind                         | `tool_call`   | `metadata` = `{callId, itemType, toolCall: args, toolName}`; once per id.                                                    |
| `item.completed`, a tool kind                       | `tool_result` | `metadata` = `{callId, isError, itemType, toolCall: result, toolName}`; preceded by a `tool_call` when the id never started. |
| `item.completed`, no kind or non-record item        | none          | Skipped.                                                                                                                     |
| `turn.completed`                                    | `usage`       | `done: true`, `error: null`, `metadata.usage` = event `usage` (or `null`).                                                   |
| `turn.failed`                                       | `text`        | `done: true`, `error` = `error.message` or `codex reported a failed turn`.                                                   |
| `error`                                             | `text`        | `done: true`, `error` = `message` or `codex reported an error`.                                                              |
| `turn.started`, `item.updated`, text `item.started` | none          | Skipped.                                                                                                                     |

No `usage_limit` chunk is produced for codex. Conversations persisted before this mapping carry
`tool_result` chunks whose metadata is only `{item, itemType, toolName}`; the chat fold reads those
directly.

### Example (synthetic, illustrative)

From `codex.synthetic.ndjson` (not captured from a live run):

```json
{"thread_id":"th_fixture","type":"thread.started"}
{"type":"turn.started"}
{"item":{"id":"i0","item_type":"reasoning","text":"I will create the file."},"type":"item.completed"}
{"item":{"command":"bash -lc 'echo hi > hello.txt'","exit_code":0,"id":"i1","item_type":"command_execution","status":"completed", …},"type":"item.completed"}
{"item":{"id":"i2","item_type":"agent_message","text":"DONE"},"type":"item.completed"}
{"type":"turn.completed","usage":{"cached_input_tokens":1200,"input_tokens":5400,"output_tokens":42}}
```

Maps to: `session`, `thinking`, `tool_result` (`toolName: command_execution`), `text` (`DONE`), then a
terminal `usage`. The `usage` key names here are the synthetic fixture's; they are passed through
unmodified and not interpreted.

## 10. Known gaps

- **Tools appear only as completed items**, so they map to `tool_result` with no preceding
  `tool_call`. A UI cannot show a tool as running.
- No incremental text or thinking: each is one chunk per completed item.
- The success path is unverified live; the item discriminant is read defensively from `item_type`
  then `type`, and only `item.text` is read.
- `usage` is forwarded raw; its field names are not validated.
- No `usage_limit` mapping.
- Plan-run uses the same mapper through `structured-output/chunk-reader.ts`, with no extra handling.

## 11. How to reproduce

```bash
codex exec --help
S=$(mktemp -d); cd "$S"
codex exec --json --skip-git-repo-check --sandbox read-only -- "Reply with exactly: pong" > out.ndjson
jq -r '.type' out.ndjson | sort | uniq -c
codex exec --json --skip-git-repo-check --sandbox workspace-write -- \
  "Create hello.txt containing hi, then reply DONE" > tools.ndjson
jq -c 'select(.type=="item.completed") | .item' tools.ndjson
```

Requires an authenticated codex login. Replace the synthetic fixture with the captured output.
