# opencode json schema

The headless event stream the `opencode` chat backend
(`packages/openthrottle-agentic-utils/src/utils/conversation-backend/opencode/`) and the `opencode`
plan-run driver (`packages/openthrottle-drivers/src/drivers/opencode.ts`) are built against. opencode
calls it `run --format json` (NDJSON).

> **Provenance.** Event shapes are from a **recorded** stream on opencode **1.18.16**, sanitized, in
> `structured-output/__tests__/fixtures/opencode.ndjson`. The recording is a turn that wrote a file and
> then failed on the model API (a Bedrock 404 about use-case details), so it shows `step_start`,
> `tool_use`, `step_finish` and `error`, but **no `text` event**. The `text` shape comes from the
> mapper and its tests.

## 1. Invocation contract

Chat path (`argv.ts`, `buildOpencodeArgv`), spawned without a shell:

```
opencode run [--auto] --format json --dir <cwd> [-s <session-id>] [-m <provider/model>] \
  [--variant <v>] -- "<prompt>"
```

| Flag                  | Meaning                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `run`                 | Headless single-turn subcommand.                                                                                   |
| `--auto`              | Blanket auto-approve; only for the `fullAccess` posture. Narrower postures go in a temp config `permission` slice. |
| `--format json`       | Raw NDJSON event stream (this doc).                                                                                |
| `--dir <cwd>`         | Workspace directory (also the spawn cwd).                                                                          |
| `-s <session-id>`     | Resume. Omitted on the first turn; opencode mints the id.                                                          |
| `-m <provider/model>` | Omitted when unset.                                                                                                |
| `--variant <v>`       | Reasoning effort: `low`, `medium`, `high` (from `high`/`extraHigh`), `max` (from `max`/`ultra`).                   |
| `--`                  | End-of-options marker; persona frontmatter (`---`) would otherwise be parsed as an option.                         |

Binary: `OPENTHROTTLE_OPENCODE_BIN`, else `opencode` on PATH. opencode has no system-prompt flag, so
the persona is a prompt prefix.

Plan-run path (driver `buildShellCommand`):

```
[OPENCODE_CONFIG=<path>] opencode run --auto "<prompt>" --format json [-m <provider/model>] [--variant <v>]
```

`--format json` is added only when `outputFormat` is `structured`.

## 2. Framing & event taxonomy

NDJSON on stdout. Every event carries a top-level `type`, `timestamp` (ms) and `sessionID`, and,
except `error`, a `part` object.

| type          | `part.type`   | Fields observed                                                                                                              |
| ------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `step_start`  | `step-start`  | `part.id`, `messageID`, `sessionID`, `snapshot`                                                                              |
| `text`        | not recorded  | `part.id`, `part.text` (full snapshot per part id), per the mapper                                                           |
| `tool_use`    | `tool`        | `part.tool`, `part.callID`, `part.state{status,input,output,metadata,title,time{start,end}}`, `part.id`, `messageID`         |
| `step_finish` | `step-finish` | `part.reason`, `part.tokens{total,input,output,reasoning,cache{write,read}}`, `part.cost`, `part.snapshot`, `part.messageID` |
| `error`       | none          | `error.name`, `error.data{message,statusCode,isRetryable,responseHeaders,responseBody,metadata}`                             |

**`tool_use` vs `tool`.** In 1.18.16 the event `type` is `tool_use` while `part.type` is `"tool"`.
Older versions named the event `tool`. The mapper accepts both (`isToolEvent`).

`part.state.status` values the mapper acts on: `completed` and `error` (finished); anything else
(for example running) is treated as a call in progress. The recording shows `completed` only.

## 3. Assistant text & the snapshot rule

`text` events carry a **full per-`part.id` snapshot**, not an incremental delta. The mapper is
stateful: it remembers the emitted length per part id and emits only the newly appended suffix. A
snapshot no longer than what was already emitted is dropped. This is opencode's double-count guard.

## 4. Thinking & tool calls

- No thinking event is mapped. `step_finish.part.tokens.reasoning` reports a token count only.
- A tool is one `tool_use` event per state change, correlated by `part.callID`. A running state maps
  to a call; `completed`/`error` maps to a result. The recording has just the `completed` event,
  which carries `input` and `output` together.

## 5. System prompt / persona

No flag. The chat caller injects the persona as a prompt prefix.

## 6. Sessions & multi-turn

opencode mints the session id on the first `run` and puts it in every event's top-level `sessionID`
(for example `ses_e50a…`). The mapper surfaces it once, from the first event that has it. Later turns
pass `-s <id>`; only the latest user message is sent, never replayed history.

## 7. Errors, exit codes, cancellation

There is **no terminal event**: completion is process exit, and the chat stream driver emits
`done: true` on close, surfacing stderr or a non-zero exit through `describeExit('opencode', …)`.
SIGTERM escalates to SIGKILL on cancel or timeout. Exit codes are not observed.

A failed turn is reported as a top-level event, recorded here (response headers and body truncated):

```json
{"type":"error","timestamp":1793943387751,"sessionID":"ses_e50a…","error":{"name":"APIError","data":{"message":"undefined: Model use case details have not been submitted for this account. …","statusCode":404,"isRetryable":false,"responseHeaders":{…},"responseBody":"{…}","metadata":{"url":"https://bedrock-runtime.us-east-1.amazonaws.com/model/…/converse-stream"}}}}
```

The chat mapper **ignores** `error` events. The plan-run reader handles them (see
[section 10](#10-known-gaps)).

## 8. Auth, models, discovery

Auth is opencode's own provider credentials under HOME. The chat child gets a scrubbed environment.
MCP servers come from the repo `opencode.json` `mcp` block, read automatically in `run` mode (per
the driver capability note). Model discovery is a driver concern and not covered here.

## 9. Event to ConversationStreamChunk mapping

`createOpencodeEventMapper` returns a **stateful** mapper (one per stream) whose `map(event)` returns
zero or more chunks.

| CLI event                                 | Chunk         | Notes                                                                                            |
| ----------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| first event with a `sessionID`            | `session`     | Emitted once, ahead of that event's other chunks; `metadata.sessionId`.                          |
| `text`                                    | `text`        | Only the new suffix of `part.text` for that `part.id`; none if no growth or `id`/`text` missing. |
| `tool_use` or `tool`, state not final     | `tool_call`   | `metadata` = `{callId, tool, toolName, toolPart}`.                                               |
| `tool_use` or `tool`, `completed`/`error` | `tool_result` | Same metadata; `error` = `state.error` or `tool error` when status is `error`, else `null`.      |
| `step_finish`                             | `usage`       | `done: false`; `metadata` = `{cost, tokens}`. Not terminal.                                      |
| `step_start`, `error`, others             | none          | Skipped by the chat mapper.                                                                      |

Terminal `done: true` is never emitted by the mapper. No `usage_limit` chunk is produced.

### Example (recorded, truncated)

```json
{"type":"step_start","timestamp":1793943386453,"sessionID":"ses_e50a…","part":{"id":"prt_…","type":"step-start", …}}
{"type":"tool_use","timestamp":1793943386932,"sessionID":"ses_e50a…","part":{"type":"tool","tool":"write","callID":"tooluse_WGQa…","state":{"status":"completed","input":{"filePath":"/tmp/fixture/hello.txt","content":"hi"},"output":"Wrote file successfully.", …}}}
{"type":"step_finish","timestamp":1793943387134,"sessionID":"ses_e50a…","part":{"reason":"tool-calls","type":"step-finish","tokens":{"total":10590,"input":3,"output":88,"reasoning":0,"cache":{"write":10499,"read":0}},"cost":0.044770275, …}}
{"type":"error","timestamp":1793943387751,"sessionID":"ses_e50a…","error":{"name":"APIError","data":{"message":"…","statusCode":404, …}}}
```

Maps to: `session`, `tool_result` (`write`), `usage`, and nothing for the `error` in chat.

## 10. Known gaps

- **`tool` vs `tool_use` rename**: handled by `isToolEvent`; both spellings map identically.
- **No terminal event**: the stream driver supplies `done: true` on process exit.
- **`error` events**: dropped by the chat mapper. `structured-output/chunk-reader.ts` converts a
  top-level `error` into a terminal `usage` chunk (`done: true`) whose `error` is the first string of
  `error.data.message`, `error.message`, `error.name`, else `opencode reported an error`.
- **`text` is unobserved live**: the recording failed before any model text.
- No thinking events; `part.state.status` values other than `completed` and `error` are not observed.
- `step_finish.tokens` and `cost` are forwarded raw; each step emits a `usage` chunk, so consumers
  should sum rather than overwrite.

## 11. How to reproduce

```bash
opencode --version
S=$(mktemp -d); cd "$S"
opencode run --auto --format json --dir "$S" -- "Create hello.txt containing hi, then reply DONE" > out.ndjson
jq -r '[.type, .part.type // .error.name]|@tsv' out.ndjson | sort | uniq -c
```
