# grok (xAI Grok CLI) stream-json schema (spike)

> Plan-Id: 230b02ab-4a5f-47e8-a298-abeaa2eb1768
>
> Filled-in output of [agentic-cli-backend-compatibility-guide.md](./agentic-cli-backend-compatibility-guide.md)
> for the `grok` CLI. Compare with
> [claude-stream-json-schema.md](./claude-stream-json-schema.md),
> [cursor-agent-stream-json-schema.md](./cursor-agent-stream-json-schema.md), and
> [opencode-stream-json-schema.md](./opencode-stream-json-schema.md). All payloads
> are **verbatim from live runs on grok `0.2.112`**. Re-run
> [§11](#11-how-to-reproduce) to refresh.
>
> **Correction to the original plan assumption.** The plan expected grok to be
> single-turn print-only (`grok -p`), text-only, no resumable session. The
> installed grok is far richer: `--output-format streaming-json` emits an
> incremental JSONL stream (thinking + text deltas + a terminal usage/session
> event) and it supports resumable sessions (`-s`/`-r`). This adapter is a full
> streaming adapter, not a degraded text-only one.

## 1. Invocation contract

```
# fresh turn (grok mints the session id, echoes it in the terminal `end` event)
grok --single=<prompt> --output-format streaming-json --cwd <cwd> [--model <m>] \
  [--system-prompt-override=<persona>] [--permission-mode <mode>]   < /dev/null

# resume a prior session
grok --single=<prompt> --output-format streaming-json --cwd <cwd> -r <sessionId> …   < /dev/null
```

| Flag                             | Meaning for the adapter                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `--single=<prompt>` (`-p`)       | Headless single-turn prompt. Passed **`=`-attached** so a leading `-`/`---` in the prompt is inert. **Required** for headless. |
| `--output-format streaming-json` | Incremental JSONL event stream (this doc). Other values: `plain`, `json`. **Required** for parsing.                            |
| `--cwd <cwd>`                    | Working directory. We also set the spawn `cwd`; passing `--cwd` is belt-and-suspenders.                                        |
| `-r, --resume <id>`              | Resume a prior session by id (see [§6](#6-sessions--multi-turn)). Omit on the first turn.                                      |
| `-s, --session-id <uuid>`        | Mint a specific NEW session id. Unused — we let grok mint and surface it instead (opencode-style).                             |
| `-m, --model <MODEL>`            | Model id. Omitted when unset/blank/`auto` → grok's default.                                                                    |
| `--system-prompt-override=<p>`   | Persona system prompt, first-class. Passed **`=`-attached** (persona markdown often starts with `---` frontmatter).            |
| `--permission-mode <mode>`       | `bypassPermissions` (fullAccess), `acceptEdits` (autoAcceptEdits), `default` (supervised); omitted for the no-mode default.    |

**Spawn gotchas (verified, all matter for the adapter):**

- **Use `=`-attached values for the prompt and persona** (`--single=…`, `--system-prompt-override=…`). Verified: clap takes everything after `=` as the literal value, so a leading `-`/`---` and shell metacharacters are inert; each is a single argv element (no shell).
- **Ignore stdin** (`stdio: ['ignore', …]`) — the run is fully driven by argv.
- **Headless must use `--single`/`-p`.** The positional `[PROMPT]` starts an _interactive_ session; only `--single` is headless.
- **No pre-mint command.** grok mints the session id on the first run and echoes it in the terminal `end.sessionId` (see [§6](#6-sessions--multi-turn)). Resume with `-r <id>`.

## 2. Framing & event taxonomy

- **JSONL**, one object per line on stdout. Flat events, each with a top-level `type` + `data` (deltas) — no nested envelope.
- Observed `type`s for a turn: `thought` (reasoning delta), `text` (assistant text delta), and a single terminal `end`.
- **Tool executions are NOT surfaced** as discrete events in this headless mode — tools run silently (the terminal `end.num_turns` increments), and only `thought`/`text`/`end` are emitted. So there is no `tool_call`/`tool_result` mapping in v1.

### `thought` / `text` — incremental deltas (verbatim)

```json
{"type":"thought","data":"The"}
{"type":"text","data":"pong"}
```

### `end` — terminal: session id + usage (verbatim)

```json
{
  "type": "end",
  "stopReason": "EndTurn",
  "sessionId": "019fab66-1cd3-70b1-af22-f7dd9554d380",
  "requestId": "e44cad70-f10f-404d-94e6-2d15aed0e691",
  "usage": {
    "input_tokens": 14537,
    "cache_read_input_tokens": 128,
    "output_tokens": 35,
    "reasoning_tokens": 34,
    "total_tokens": 14700
  },
  "num_turns": 1,
  "modelUsage": {
    "grok-4.5-build-free": {
      "inputTokens": 14537,
      "outputTokens": 35,
      "cacheReadInputTokens": 128,
      "modelCalls": 1
    }
  }
}
```

## 3. Assistant text & double-count rule

`text` events are **incremental deltas** (not snapshots), so the adapter concatenates them directly — no dedup needed (unlike opencode's per-part snapshots).

## 4. Thinking & tool calls

`thought` events → `thinking` deltas. No tool events in headless streaming-json (see [§2](#2-framing--event-taxonomy)).

## 5. Permissions

Composer posture → `--permission-mode`: `fullAccess` → `bypassPermissions`; `autoAcceptEdits` → `acceptEdits`; `supervised` → `default`; the no-mode default omits the flag.

## 6. Sessions & multi-turn

One OT conversation ↔ one grok session. grok mints the id on the first run and echoes it in the terminal `end.sessionId`; the adapter emits a `kind:'session'` chunk from it **before** the terminal `usage` chunk, so `ConversationStreamService.maybePersistMintedSession` persists it. Later turns run `grok --single=… -r <id>` with `resumeSession:true`. Opencode-style mint-on-first-run — no resolver session-branch change is needed.

## 7. Errors, exit codes, cancellation

Terminal on the `end` event, or on process exit if no `end` was seen (the adapter synthesizes a terminal error chunk from stderr + exit code). A defensive `{type:'error',message}` event also maps to a terminal error. Cancellation and idle/wall-clock timeouts use the shared SIGTERM→SIGKILL teardown.

## 8. MCP

grok manages MCP via the `grok mcp add` subcommand (persistent config); there is no inline `--mcp-config` flag or config-path env. Managed OT MCP injection is **unsupported for v1** — the adapter ignores `mcpServers` (and merges `mcpEnv` harmlessly).

## 9. Event → ConversationStreamChunk mapping

| grok event               | chunk(s)                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `{type:'thought',data}`  | `thinking` (`delta = data`), `done:false`                                                                                                        |
| `{type:'text',data}`     | `text` (`delta = data`), `done:false`                                                                                                            |
| `{type:'end', …}`        | `session` (`metadata.sessionId`, `done:false`) **then** `usage` (`metadata.usage/modelUsage/stopReason/numTurns`, **`done:true`**, `error:null`) |
| `{type:'error',message}` | `text`, **`done:true`**, `error = message` (defensive; not observed in captures)                                                                 |
| anything else            | skipped                                                                                                                                          |

## 10. Verdict — **Compatible** (full streaming + reasoning + usage + session; MCP unsupported v1, no tool events in headless mode)

## 11. How to reproduce

```bash
grok --single='Respond with exactly the single word: pong' --output-format streaming-json --cwd /tmp/x < /dev/null
# capture sessionId from the terminal `end` event, then:
grok --single='and again' --output-format streaming-json --cwd /tmp/x -r <sessionId> < /dev/null
```
