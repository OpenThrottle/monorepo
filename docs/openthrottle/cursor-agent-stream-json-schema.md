# cursor-agent stream-json schema

The headless event stream the `cursor-agent` chat backend
(`packages/openthrottle-agentic-utils/src/utils/conversation-backend/cursor-agent/`) and the `cursor`
plan-run driver (`packages/openthrottle-drivers/src/drivers/cursor.ts`) are built against.

> **Provenance.** Event shapes are from a **recorded** plan-run capture on cursor-agent
> **2026.11.05**, sanitized, in `structured-output/__tests__/fixtures/cursor.ndjson`. That capture
> ran **without** `--stream-partial-output`, so it shows the consolidated form (see
> [section 3](#3-assistant-text--the-double-count-rule)). The chat flags and the partial-output
> behavior come from `argv.ts`, `events.ts` and their tests, not from a recording.

Section numbering differs from the other schema docs: the mapper cites **section 6** for the mapping
rules, so the mapping lives there.

## 1. Invocation contract

Chat path (`argv.ts`, `buildCursorAgentArgv`), spawned without a shell:

```
cursor-agent --print --output-format stream-json --stream-partial-output \
  --workspace <cwd> --trust --resume <chat-id> (--force | --mode ask) [--model <id>] -- "<prompt>"
```

| Flag                          | Meaning                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--print`                     | Headless mode.                                                                                                 |
| `--output-format stream-json` | NDJSON event stream (this doc).                                                                                |
| `--stream-partial-output`     | Emit incremental deltas (events carrying `timestamp_ms`). Chat only.                                           |
| `--workspace <cwd>`           | Workspace directory (also the spawn cwd).                                                                      |
| `--trust`                     | Always on; skips the workspace-trust prompt. **Not** a permission boundary: `--print` can write and run shell. |
| `--resume <chat-id>`          | One OT conversation maps to one cursor chat. The id is minted up front with `cursor-agent create-chat`.        |
| `--force`                     | Added only for the `fullAccess` posture (run every tool call unless denied).                                   |
| `--mode ask`                  | Every other posture (supervised, accept-edits, none): read-only, no writes and no shell (2026.11.05).          |
| `--model <id>`                | Verbatim. Omitted when unset.                                                                                  |
| `--`                          | End-of-options marker; persona markdown often starts with `---`, which would parse as an unknown flag.         |

There is **no separate reasoning or service-tier flag** in `--print` mode. Both are baked into the
model id (for example `claude-opus-4-8-high-fast`); the bracket form `auto[fast=false]` is rejected at
run time. The prompt is always the final element. Binary: `OPENTHROTTLE_CURSOR_AGENT_BIN`, else
`cursor-agent` on PATH.

Plan-run path (driver `buildShellCommand`):

```
cursor-agent --force -p "<prompt>" --output-format stream-json [--model <id>] [mcp/plugin/worktree flags]
```

`--output-format stream-json` is appended only when `outputFormat` is `structured`. The plan-run
command does **not** pass `--stream-partial-output`, which is why the consolidated `assistant` event
matters ([section 8](#8-known-gaps)).

## 2. Framing & event taxonomy

NDJSON on stdout, one object per line, flat top-level events. Every event in the fixture carries
`session_id`.

| type        | subtype                | Fields                                                                                                |
| ----------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `system`    | `init`                 | `apiKeySource`, `cwd`, `session_id`, `model`, `permissionMode`                                        |
| `user`      | none                   | `message.role`, `message.content[]` (prompt echo), `session_id`                                       |
| `thinking`  | `delta`                | `text`, `session_id`, `timestamp_ms`                                                                  |
| `thinking`  | `completed`            | `session_id`, `timestamp_ms` (no text)                                                                |
| `tool_call` | `started`, `completed` | `call_id`, `tool_call`, `model_call_id`, `session_id`, `timestamp_ms`                                 |
| `assistant` | none                   | `message.role`, `message.content[].text`, `session_id`; `timestamp_ms` present only on partial deltas |
| `result`    | `success`              | `duration_ms`, `duration_api_ms`, `is_error`, `result`, `session_id`, `request_id`, `usage`           |

`tool_call.tool_call` names its tool with a **key**, not a value: `{"editToolCall": {...}}` means
`edit`. It also carries `toolCallId`, `hookAdditionalContexts` and `startedAtMs`. On `completed` the
result is embedded inline under the tool key (`editToolCall.result.success` with `path`, `linesAdded`,
`linesRemoved`, `diffString`, `afterFullFileContent`, `message`). `result.usage` fields observed:
`inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens`.

## 3. Assistant text & the double-count rule

With `--stream-partial-output`, `assistant` events with a `timestamp_ms` are incremental text deltas.
cursor then repeats text it already streamed in two **consolidated** `assistant` events:

- **Before each tool call**, the text segment so far, carrying `timestamp_ms` **and**
  `model_call_id`. Partial deltas never carry `model_call_id` (observed on cursor-agent
  2026.11.05; emitting this event doubled every interim sentence of a turn with tool calls).
- **At the end**, the final segment again, with no `timestamp_ms`.

Rule: take events with `timestamp_ms` and no `model_call_id`; **skip** both consolidations. Without
partial output (the recorded plan-run stream) the consolidated event is the only place the text
appears.

cursor glues segments together with no separator, in its own `result` text too
(`…a.txt.I will read missing.txt.1. …`). The chat server adds the paragraph break when a text segment
follows a non-text chunk; see `paragraphBreakBefore` in the conversation-stream service.

## 4. Thinking & tool calls

- `thinking` `delta` events stream reasoning text; `thinking` `completed` is a marker with no text.
- A tool call is a `started`/`completed` pair correlated by `call_id`. The result is embedded in the
  `completed` event, so there is no separate result event.

## 5. System prompt / persona

No flag; the chat caller applies the persona prefix to the prompt before building argv.

## 6. Event to ConversationStreamChunk mapping

`mapCursorEvent` is stateless and returns one chunk or `null`.

| CLI event                          | Chunk         | Notes                                                                                                 |
| ---------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| `system`, subtype `init`           | `session`     | `metadata.sessionId` = `session_id`. Other `system` subtypes are skipped.                             |
| `assistant` with `timestamp_ms`    | `text`        | `delta` = first `message.content[0].text`. Skipped when it carries `model_call_id`.                   |
| `assistant` without `timestamp_ms` | none          | Consolidated echo; skipped to avoid double-counting.                                                  |
| `thinking`, subtype `delta`        | `thinking`    | `delta` = `text`. The `completed` marker is skipped.                                                  |
| `tool_call`, subtype `started`     | `tool_call`   | `metadata` = `{callId, toolCall, toolName}`; `toolCall` = the tool's `args` minus cursor bookkeeping. |
| `tool_call`, subtype `completed`   | `tool_result` | `toolCall` = `result.success`; `result.error`/`rejected` set `isError` with readable text instead.    |
| `result`                           | `usage`       | `done: true`; `error` = `result` text only when `is_error === true`; `metadata` = `{result, usage}`.  |
| `user`, unknown types              | none          | Prompt echo is skipped.                                                                               |

`toolName` is the first record-valued key of `tool_call` that is not `toolCallId` or
`hookAdditionalContexts`, with a trailing `ToolCall` stripped (`editToolCall` becomes `edit`).
No `usage_limit` chunk is produced for cursor.

### Example (recorded, truncated)

```json
{"type":"system","subtype":"init","apiKeySource":"login","cwd":"/tmp/fixture","session_id":"1bed510b-…","model":"Auto","permissionMode":"default"}
{"type":"thinking","subtype":"delta","text":"I","session_id":"1bed510b-…","timestamp_ms":1793943390669}
{"type":"tool_call","subtype":"started","call_id":"call-8a79f29c-…","tool_call":{"editToolCall":{"args":{"path":"/tmp/fixture/hello.txt","streamContent":"hi\n"}}, …},"timestamp_ms":1793943390728}
{"type":"tool_call","subtype":"completed","call_id":"call-8a79f29c-…","tool_call":{"editToolCall":{"args":{…},"result":{"success":{"path":"/tmp/fixture/hello.txt","linesAdded":1, …}}}, …}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"DONE"}]},"session_id":"1bed510b-…"}
{"type":"result","subtype":"success","duration_ms":8106,"is_error":false,"result":"DONE","usage":{"inputTokens":26049,"outputTokens":70,"cacheReadTokens":6784,"cacheWriteTokens":0,"reasoningTokens":40}}
```

Note that in this plan-run recording the thinking deltas still carry `timestamp_ms` although
`--stream-partial-output` was off, while the `assistant` event does not.

## 7. Sessions, errors, cancellation

- The chat id is minted with `cursor-agent create-chat` (validated as a UUID by `parseCursorChatId.ts`,
  because `--resume` accepts any string and silently starts a fresh chat on a polluted id) and passed
  to `--resume`. `system.init.session_id` confirms it.
- The turn ends on the `result` event or process exit. The adapter reads stderr and
  `describeExit('cursor-agent', …)`, and escalates SIGTERM to SIGKILL on cancel or timeout. Specific
  exit codes are not observed.
- `result.is_error === true` carries the message in `result`.

## 8. Known gaps

- **Consolidated text.** The chat mapper skips the consolidated `assistant` event. Plan runs never
  ask for partial output, so `structured-output/chunk-reader.ts` (`withConsolidatedText`) adds it
  back: it emits the `text` blocks of any `assistant` event that has no `timestamp_ms`, then runs the
  chat mapper. The same wrapper serves claude.
- No reasoning or tier flag; the model id is the selector.
- `user` prompt echoes and `thinking` `completed` markers have no chunk.
- `usage` is forwarded raw (camelCase keys as recorded).
- No `usage_limit` mapping.

## 9. How to reproduce

```bash
S=$(mktemp -d); cd "$S"
cursor-agent --force -p "Create hello.txt containing hi, then reply exactly: DONE" \
  --output-format stream-json > out.ndjson
jq -r '[.type,.subtype]|@tsv' out.ndjson | sort | uniq -c
# chat shape, with incremental deltas
cursor-agent --print --output-format stream-json --stream-partial-output --trust \
  --workspace "$S" -- "say hi" | jq -c 'select(.type=="assistant")'
```
