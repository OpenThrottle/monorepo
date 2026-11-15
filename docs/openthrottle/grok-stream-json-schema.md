# grok streaming-json schema

The headless event stream the `grok` chat backend
(`packages/openthrottle-agentic-utils/src/utils/conversation-backend/grok/`) and the `grok` plan-run
driver (`packages/openthrottle-drivers/src/drivers/grok.ts`) are built against. grok calls the format
`streaming-json` (JSONL).

> **Provenance, stated honestly.** Three sources, and they do not cover the same ground.
>
> - **Live grok 1.x captures** (`conversation-backend/grok/__tests__/grok-1-tool-calls.fixture.ts`):
>   grok **1.0.77**, model grok-4.7, the chat argv with no `--permission-mode`, captured 2026-11-14.
>   One turn runs three parallel tool calls (two complete, one fails); the other hits a call that needs
>   approval and ends `cancelled`. These are the source for every tool, `usage`, `available_commands`
>   and `end` shape below, and they re-verify `thought` / `text` on 1.x.
> - **Mapper rules first written against grok 0.2.112** (`thought`, `text`, `end`). 0.2.112 emitted no
>   tool events at all.
> - **Recorded fixture** (`structured-output/__tests__/fixtures/grok.ndjson`): grok **1.0.5**,
>   `-p … --output-format streaming-json`. That run produced only `available_commands` events and then
>   an `error`, because the API **rejected the CLI version with HTTP 426** (it required 1.0.13 or
>   later). It contains no `thought`, `text` or `end` event, so it proves nothing about the success
>   path on 1.0.5.

## 1. Invocation contract

Chat path (`argv.ts`, `buildGrokArgv`), spawned without a shell:

```
grok --single=<prompt> --output-format streaming-json --cwd <cwd> \
  [-r <session-id>] [--model <id>] [--system-prompt-override=<persona>] \
  [--permission-mode <mode>] [--reasoning-effort <low|medium|high>]
```

| Flag                              | Meaning                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `--single=<prompt>`               | Headless single-turn flag. The `=` form keeps a leading `-`/`---` inert (one argv element).                        |
| `--output-format streaming-json`  | Incremental JSONL stream (this doc).                                                                               |
| `--cwd <dir>`                     | Workspace directory (also the spawn cwd).                                                                          |
| `-r <session-id>`                 | Resume. Only on resume; grok mints the id on turn one, so it is never pre-minted. Empty id throws.                 |
| `--model <id>`                    | Omitted when blank or `auto`.                                                                                      |
| `--system-prompt-override=<text>` | First-class persona prompt.                                                                                        |
| `--permission-mode <mode>`        | `fullAccess` to `bypassPermissions`; `autoAcceptEdits` to `acceptEdits`; `supervised` to `default`; none omits it. |
| `--reasoning-effort <v>`          | `low`/`medium`/`high`; `extraHigh`/`max`/`ultra` clamp to `high`.                                                  |

Binary: `OPENTHROTTLE_GROK_BIN`, else `grok` on PATH.

Plan-run path (driver `buildShellCommand`):

```
grok -p "<prompt>" --output-format streaming-json --permission-mode acceptEdits [--model <id>] [--reasoning-effort <v>]
```

`--output-format streaming-json` is added only when `outputFormat` is `structured`. `-p` is the short
form of `--single`. A local endpoint, when configured, is passed through environment variables
(`GROK_MODELS_BASE_URL`, `XAI_API_KEY`).

## 2. Framing & event taxonomy

JSONL on stdout, one flat object per line, discriminated by `type`.

| type                 | Fields                                                                                                                  | Source                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `thought`            | `data` (string delta)                                                                                                   | 1.0.77 capture                         |
| `text`               | `data` (string delta)                                                                                                   | 1.0.77 capture                         |
| `tool_call`          | `toolCallId`, `toolName`, `title`, `kind`, `status: 'pending'`, `rawInput`, `content: []`, `locations`                  | 1.0.77 capture                         |
| `tool_call_update`   | `toolCallId`, `status` (`null` / `in_progress` / `completed` / `failed`), `content`, `rawOutput`, `locations`           | 1.0.77 capture                         |
| `usage`              | `usage` (per-request token counts), `signature`                                                                         | 1.0.77 capture; not mapped             |
| `end`                | `sessionId`, `stopReason` (`end_turn` / `cancelled`), `usage`, `modelUsage`, `num_turns`, `total_cost_usd`, `requestId` | 1.0.77 capture                         |
| `error`              | `message`                                                                                                               | mapper (defensive) and 1.0.5 recording |
| `available_commands` | `tools` (the tool names), `commands` (string array)                                                                     | 1.0.5 recording, 1.0.77 capture        |

`available_commands` arrives before the first request and again after each tool round. A `usage`
event follows each model request; the terminal `end` carries the turn's totals.

## 3. Assistant text

`text` events are incremental deltas (`data`). There is no consolidated echo to skip. The terminal
`end` event carries session and usage, not text.

## 4. Thinking & tool calls

`thought` events carry reasoning deltas. Since 1.x every tool call streams as one `tool_call`
followed by `tool_call_update`s with the same `toolCallId`. Parallel calls interleave:

```
{"type":"tool_call","toolCallId":"call-…-0","toolName":"run_terminal_command","kind":"execute","status":"pending","rawInput":{"command":"pwd","description":"Print the current working directory"},"content":[],"locations":[]}
{"type":"tool_call_update","toolCallId":"call-…-0","status":null,"content":[{"type":"content","content":{"type":"text","text":"Print the current working directory"}}],"rawOutput":null,"locations":[]}
{"type":"tool_call_update","toolCallId":"call-…-0","status":"in_progress","content":[…],"rawOutput":{"type":"Bash","exit_code":0,"command":"pwd",…}}
{"type":"tool_call_update","toolCallId":"call-…-0","status":"completed","content":[{"type":"content","content":{"type":"text","text":"/repo\n"}}],"rawOutput":{"type":"Bash",…}}
```

- The first `status: null` update's `content` is the call's **description**, not its output.
- Only the terminal `completed` / `failed` update's `content` text is the result. A failed read carries
  the error text (`Error: <path> does not exist.`).
- `rawOutput` is tool-specific: Bash has `output` as a **byte array** plus `exit_code`; `ReadFile` has
  `FileContent` or `FileNotFound`; an MCP call (`toolName: 'use_tool'`, `rawInput:
{tool_name, tool_input}`) has **empty `content`** and its result in `rawOutput.output.OkayOutput`.
- Tools seen: `run_terminal_command`, `read_file`, `search_tool`, `use_tool` (MCP).

## 5. System prompt / persona

First-class: `--system-prompt-override=<persona>` (the `=` form is deliberate).

## 6. Sessions & multi-turn

grok mints the session id on turn one and echoes it as `end.sessionId`. The next turn passes
`-r <sessionId>`. The id arrives only at the end of the turn, so a turn that fails before `end`
yields no id to persist.

## 7. Errors, exit codes, cancellation

**Permission-cancelled turns.** Without `--permission-mode` (and under `default`), a call that needs
approval cannot be approved headlessly. grok then:

1. fails that call: `tool_call_update` `status: 'failed'`, content text
   ``User cancelled the execution for tool `run_terminal_command` ``;
2. writes ``permission required: Execute `rm -f …` was not run, as a headless run cannot ask for
approval`` to **stderr**;
3. lets calls already running finish, then ends with `{"type":"end","stopReason":"cancelled",…}`,
   **without writing a reply**. It still exits 0.

Read-only calls (`pwd`, `read_file`, an MCP tool already approved on the host) ran without approval
in the captures; an `rm` did not.

The recorded 1.0.5 failure is a single `error` event:

```json
{
  "type": "error",
  "message": "Internal error: {\n  \"message\": \"API error (status 426 Upgrade Required): Your Grok CLI version (1.0.5) is outdated. Please update to version 1.0.13 or later via `grok update` or the installation documentation.\",\n  \"http_status\": 426\n}"
}
```

`message` is a string that itself embeds a JSON object. The adapter also reads stderr and
`describeExit('grok', …)` and escalates SIGTERM to SIGKILL on cancel or timeout. Exit codes are not
observed.

## 8. Auth, models, discovery

Auth is grok's own login under HOME; the chat child gets a scrubbed environment. The 426 above shows
the service enforces a minimum CLI version, so a stale install fails at the first API call, not at
spawn. Update with `grok update`.

## 9. Event to ConversationStreamChunk mapping

`createGrokEventMapper()` returns a per-stream mapper (it correlates calls by `toolCallId`, so a
mapper is never shared between runs). Each `map(event)` returns an array, possibly empty.

| CLI event                                 | Chunks                                   | Notes                                                                                                                                                                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `thought`                                 | `thinking`                               | `delta` = `data`.                                                                                                                                                                                                                                                                      |
| `text`                                    | `text`                                   | `delta` = `data`.                                                                                                                                                                                                                                                                      |
| `tool_call`                               | `tool_call`                              | Once per `toolCallId`; `metadata` = `{callId, toolCall: rawInput, toolName}`.                                                                                                                                                                                                          |
| `tool_call_update` `completed` / `failed` | `tool_result`                            | Once per `toolCallId`; `metadata` = `{callId, isError, toolCall, toolName}`, where `toolCall` is the `content` text (an MCP call's `OkayOutput`). `failed` sets `isError` and the chunk `error`. An update for a call never announced first opens a card.                              |
| `tool_call_update` `null` / `in_progress` | none                                     | Their `content` is the description or partial output.                                                                                                                                                                                                                                  |
| `end`                                     | `session` (if `sessionId`), then `usage` | `session` is `done: false` so the id is persisted; `usage` is `done: true` with `metadata` = `{modelUsage, numTurns, stopReason, usage}`. `error` is `null`, except `stopReason: 'cancelled'`, which gets an error naming the blocked tool(s) and pointing at the Permissions setting. |
| `error`                                   | `text`                                   | `done: true`, `error` = `message` or `grok reported an error`.                                                                                                                                                                                                                         |
| `available_commands`, `usage`, other      | none                                     | Skipped.                                                                                                                                                                                                                                                                               |

The chat adapter (`grok.ts`) also adds grok's own `permission required: …` stderr lines to a
terminal error, because they name the exact command that was blocked. The server persists that
error on the turn's usage payload, so a reloaded conversation still shows it.

No `usage_limit` chunk is produced for grok.

## 10. Known gaps

- The same probe under Full access (`bypassPermissions`) is not captured.
- The `kind` of a tool call (`execute`, `read`, `use_tool`, …) is not forwarded.
- `available_commands` and `usage` are ignored, as is any event type the mapper does not name.
- `usage`, `modelUsage` and `num_turns` are forwarded without validation.
- Plan-run reads the stream with the same mapper, with no extra handling
  (`structured-output/chunk-reader.ts`).

## 11. How to reproduce

```bash
grok --version
grok update            # 1.0.13 or later is needed to avoid the 426
S=$(mktemp -d); cd "$S"
grok --single="Reply with exactly: pong" --output-format streaming-json --cwd "$S" > out.ndjson
jq -r '.type' out.ndjson | sort | uniq -c
# tool events: ask for parallel calls, one of which fails or needs approval
grok --single='In parallel, run `pwd` and read does-not-exist.txt, then summarise.' \
  --output-format streaming-json --cwd "$S" > tools.ndjson 2> tools.err
jq -c 'select(.type|startswith("tool_call"))' tools.ndjson
```
