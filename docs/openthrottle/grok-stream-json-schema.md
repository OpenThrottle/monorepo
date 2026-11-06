# grok streaming-json schema

The headless event stream the `grok` chat backend
(`packages/openthrottle-agentic-utils/src/utils/conversation-backend/grok/`) and the `grok` plan-run
driver (`packages/openthrottle-drivers/src/drivers/grok.ts`) are built against. grok calls the format
`streaming-json` (JSONL).

> **Provenance, stated honestly.** Two sources, and they do not cover the same ground.
>
> - **Mapper rules** (`thought`, `text`, `end`): the mapper header says they were captured from live
>   runs of grok **0.2.112**. That capture is not in the repo, so those event shapes are taken from
>   `events.ts` and its tests, not re-verified here.
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

| type                 | Fields                                                            | Source                                 |
| -------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| `thought`            | `data` (string delta)                                             | mapper, 0.2.112                        |
| `text`               | `data` (string delta)                                             | mapper, 0.2.112                        |
| `end`                | `sessionId`, `usage`, `modelUsage`, `num_turns`, `stopReason`     | mapper, 0.2.112                        |
| `error`              | `message`                                                         | mapper (defensive) and 1.0.5 recording |
| `available_commands` | `tools` (empty array in the recording), `commands` (string array) | 1.0.5 recording; not mapped            |

The 1.0.5 recording emits `available_commands` twice (slash commands and skills installed on the
host, which this doc does not reproduce), then the `error`. `usage`, `modelUsage` and `num_turns`
shapes are forwarded raw and not observed here.

## 3. Assistant text

`text` events are incremental deltas (`data`). There is no consolidated echo to skip. The terminal
`end` event carries session and usage, not text.

## 4. Thinking & tool calls

`thought` events carry reasoning deltas. **Headless mode emits no tool events** (only `thought`,
`text`, `end`), so there is no `tool_call` or `tool_result`. The driver capability notes the same.

## 5. System prompt / persona

First-class: `--system-prompt-override=<persona>` (the `=` form is deliberate).

## 6. Sessions & multi-turn

grok mints the session id on turn one and echoes it as `end.sessionId`. The next turn passes
`-r <sessionId>`. The id arrives only at the end of the turn, so a turn that fails before `end`
yields no id to persist.

## 7. Errors, exit codes, cancellation

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

`mapGrokEvent` is stateless and returns an array (possibly empty).

| CLI event                   | Chunks                                   | Notes                                                                                                                                                     |
| --------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `thought`                   | `thinking`                               | `delta` = `data`.                                                                                                                                         |
| `text`                      | `text`                                   | `delta` = `data`.                                                                                                                                         |
| `end`                       | `session` (if `sessionId`), then `usage` | `session` is `done: false` so the id is persisted; `usage` is `done: true`, `error: null`, with `metadata` = `{modelUsage, numTurns, stopReason, usage}`. |
| `error`                     | `text`                                   | `done: true`, `error` = `message` or `grok reported an error`.                                                                                            |
| `available_commands`, other | none                                     | Skipped.                                                                                                                                                  |

No `usage_limit` chunk is produced for grok.

## 10. Known gaps

- **No tool events** in headless mode, so no `tool_call` or `tool_result`.
- The success-path shapes come from grok 0.2.112 per the mapper header and are **not re-verified on
  1.0.x**; the only 1.0.5 recording is the 426 failure.
- `available_commands` is ignored, as is any event type the mapper does not name.
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
```
