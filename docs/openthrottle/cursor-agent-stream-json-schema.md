# cursor-agent `stream-json` schema (spike)

> Plan-Id: a3363c74-09f5-4403-bca2-efc16ab424ed
> Task-Id: cfe2df8f-3bbe-4176-a664-d61351537bff
>
> Empirical capture of `cursor-agent`'s `--output-format stream-json` so the CLI
> backend adapter targets a real schema, not a guess. All payloads below are
> verbatim from a live run on **cursor-agent `2026.06.15-18-00-12-6f5a2cf`**
> (logged in via `apiKeySource: "login"`). Re-run the commands in
> [§7](#7-how-to-reproduce) to refresh if the CLI version changes.

## 1. Invocation contract

```
cursor-agent --print --output-format stream-json --stream-partial-output \
  --workspace <cwd> --trust [--mode ask|plan] [--force] [--resume <chatId>] [--model <id>] \
  "<prompt>"
```

Confirmed flags (from `cursor-agent --help`):

| Flag                          | Meaning for the adapter                                                                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-p, --print`                 | Non-interactive/headless. **Required** for any scripted use.                                                                                                                                                                            |
| `--output-format stream-json` | NDJSON event stream (this doc). Only valid with `--print`.                                                                                                                                                                              |
| `--stream-partial-output`     | Emit incremental text **deltas**; without it, assistant text arrives as one consolidated event. Only valid with `--print` + `stream-json`.                                                                                              |
| `--workspace <path>`          | Working directory the agent operates in. **Use this to set cwd explicitly** instead of (or in addition to) the spawn `cwd`.                                                                                                             |
| `--trust`                     | **Required** in headless mode for a directory cursor hasn't seen before — otherwise it refuses with a "Workspace Trust Required" prompt on stderr and exits non-zero (see [§5](#5-error--edge-behavior)). `-f/--yolo` also imply trust. |
| `--mode ask\|plan`            | Read-only modes. `ask` = Q&A, `plan` = analyze/propose, **no edits**. Omit for full agent (read+write+shell).                                                                                                                           |
| `-f, --force` / `--yolo`      | Auto-approve all tool use (needed to exercise write/shell tools headlessly).                                                                                                                                                            |
| `--resume [chatId]`           | Resume an existing chat by id (session continuity — see [§3](#3-sessions--multi-turn-resume)).                                                                                                                                          |
| `--model <id>`                | Model selection; `cursor-agent models` / `--list-models` enumerates valid ids.                                                                                                                                                          |

There is **no `--system` / system-prompt flag** — see [§4](#4-persona--system-prompt).

## 2. Framing & event taxonomy

- **NDJSON**: exactly one JSON object per line, `\n`-terminated (verified by hexdump — stdout ends with a single `0a`). Safe to parse with line-buffered split + `JSON.parse` per complete line, tolerating a partial trailing line across stdout chunks.
- All events carry a top-level `type` and the `session_id`. Most streaming events also carry `timestamp_ms`.
- Everything goes to **stdout**; stderr is empty on success.

Event `type`s observed (a tool-using turn): `system`, `user`, `thinking`, `tool_call`, `assistant`, `result`.

### `system` / `init` — first line of every run

```json
{
  "type": "system",
  "subtype": "init",
  "apiKeySource": "login",
  "cwd": "/private/tmp/…",
  "session_id": "2a5f06af-…",
  "model": "Auto",
  "permissionMode": "default"
}
```

Announces the resolved `session_id`, `cwd`, and `model`. (We already know the session id from `create-chat`/`--resume`, so this is confirmation, not the source of truth.)

### `user` — echo of the submitted prompt

```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [{ "type": "text", "text": "Reply with exactly: hello world" }]
  },
  "session_id": "2a5f06af-…"
}
```

### `assistant` — text output

With `--stream-partial-output`, assistant text streams as **deltas**, each with a `timestamp_ms`, followed by **one final consolidated event with NO `timestamp_ms`** repeating the _full_ accumulated text:

```json
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"hello"}]},"session_id":"…","timestamp_ms":1781763222114}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":" world"}]},"session_id":"…","timestamp_ms":1781763222115}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"hello world"}]},"session_id":"…"}   // <- final echo, no timestamp_ms
```

> ⚠️ **Parser rule (critical):** treat assistant events **with** `timestamp_ms` as text deltas; **ignore** the trailing event **without** `timestamp_ms` (it is the full-text echo and would double-count). Verified: delta-only concatenation == `result.result` exactly. Equivalently, you may discard all streamed assistant text and use `result.result` as canonical, but then you lose incremental streaming.

The text delta is at `message.content[0].text` (content is an array of `{type:"text", text}` blocks). Across the runs, tool/thinking content did **not** appear inside `assistant.content`; they are their own top-level events.

### `thinking` — reasoning stream

```json
{"type":"thinking","subtype":"delta","text":"Reading alpha.txt to","session_id":"…","timestamp_ms":…}
{"type":"thinking","subtype":"delta","text":" report its exact contents.","session_id":"…","timestamp_ms":…}
{"type":"thinking","subtype":"completed","session_id":"…","timestamp_ms":…}
```

`subtype:"delta"` carries incremental `text` (top-level, **not** under `message`); `subtype:"completed"` marks the end of the thinking segment (no text).

### `tool_call` — tool invocation (started + completed, result inline)

```json
{"type":"tool_call","subtype":"started","call_id":"tool_bf9e…","tool_call":{"readToolCall":{"args":{"path":"/…/alpha.txt"}},"toolCallId":"tool_bf9e…","hookAdditionalContexts":[]},"model_call_id":"…","session_id":"…","timestamp_ms":…}
{"type":"tool_call","subtype":"completed","call_id":"tool_bf9e…","tool_call":{"readToolCall":{"args":{"path":"/…/alpha.txt"},"result":{"success":{"content":"hello from alpha\n","totalLines":2,"fileSize":17,…}}},"toolCallId":"tool_bf9e…"},"model_call_id":"…","session_id":"…","timestamp_ms":…}
```

- Correlate `started`↔`completed` by `call_id` (`model_call_id` ties it to the assistant turn).
- The **result is embedded inline** in the `completed` event under `tool_call.<toolKind>.result` — there is no separate `tool_result` event type.
- The tool kind is the **key** inside `tool_call` (here `readToolCall`; expect `shellToolCall`, `writeToolCall`, etc. — enumerate as encountered, don't hardcode an exhaustive list).

### `result` — terminal event (exactly once)

```json
{
  "type": "result",
  "subtype": "success",
  "duration_ms": 8881,
  "duration_api_ms": 8881,
  "is_error": false,
  "result": "hello world",
  "session_id": "…",
  "request_id": "…",
  "usage": {
    "inputTokens": 26967,
    "outputTokens": 35,
    "cacheReadTokens": 2654,
    "cacheWriteTokens": 0
  }
}
```

Marks completion. `result` = canonical final assistant text; `is_error` = success flag; `usage` = token accounting; `subtype` observed as `"success"`.

## 3. Sessions & multi-turn resume

- `cursor-agent create-chat` → prints a **bare UUID** + `\n` to stdout, exit 0, empty stderr. This is the cleanest way to mint a session id up front.
  ```
  $ cursor-agent create-chat
  2a5f06af-90e8-485d-97ea-5b91d3d028b7
  ```
- `--resume <chatId>` + a prompt drives a turn against that session. **Continuity verified across separate process invocations**: after turn 1 ("reply with hello world"), a _new process_ with `--resume <same id>` correctly recalled the phrase. cursor-agent owns the multi-turn context — we do **not** replay history.
- `session_id` is echoed on every event and equals the resume id.

**OT mapping:** one OT conversation ↔ one cursor chat id. On the first turn, `create-chat` → persist the id in `conversation.metadata`; on later turns, `--resume <id>`. Emitting the id back to the service as a `kind:'session'` chunk is still the plan, but note we can also obtain it synchronously from `create-chat` _before_ streaming (more robust — persist immediately, don't depend on parsing it out of the stream).

## 4. Persona / system prompt

**There is no `--system` flag.** Mechanisms available:

1. **Prompt prefix (recommended for v1):** prepend the persona instruction to the prompt arg-array element. No filesystem side-effects, fully scoped per-turn. Downside: it occupies the user turn (cosmetic).
2. Cursor **rules** (`.cursor/rules/*.mdc` or `AGENTS.md` in the workspace) — these _would_ steer the agent, but they **mutate the user's checkout**, which is undesirable for a scoped chat backend. Avoid in v1.
3. `--plugin-dir <path>` — heavier; out of scope.

→ Adapter implements persona → **prompt prefix**, CLI-only, per the plan's task-7/task-3 decisions.

## 5. Error & edge behavior

| Scenario                           | stdout                    | stderr                                                    | exit  | Adapter handling                                                                                                                                                                                                                  |
| ---------------------------------- | ------------------------- | --------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Untrusted workspace (no `--trust`) | empty                     | "Workspace Trust Required" text                           | **1** | Always pass `--trust` (cwd is server-validated).                                                                                                                                                                                  |
| Invalid `--model`                  | empty                     | "Cannot use this model: … Available models: …" plain text | **1** | Pre-flight validation fails **before** any stream-json; surface stderr as the error. **Errors are NOT always stream-json events** — a non-zero exit with no terminal `result` must map to an `error` chunk using buffered stderr. |
| Unknown `--resume <id>`            | full normal stream        | empty                                                     | **0** | Does **not** error; silently starts a fresh session under that id (history lost). A stale persisted session id degrades gracefully rather than failing.                                                                           |
| Normal completion                  | NDJSON ending in `result` | empty                                                     | 0     | Terminal `result` → `done:true`.                                                                                                                                                                                                  |

**Implication:** the adapter's terminal condition is _either_ a `result` event _or_ process exit. On exit without a `result`, treat non-zero exit (or any captured stderr) as an error chunk; don't assume every failure arrives as JSON.

## 6. Event → `ConversationStreamChunk` mapping (for task 3)

| cursor-agent event                     | chunk `kind`               | notes                                                          |
| -------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| `assistant` **with** `timestamp_ms`    | `text`                     | `delta = message.content[0].text`                              |
| `assistant` **without** `timestamp_ms` | _(skip)_                   | full-text echo; would double-count                             |
| `thinking` `subtype:delta`             | `thinking`                 | `text` is top-level                                            |
| `thinking` `subtype:completed`         | _(skip or segment marker)_ | no text                                                        |
| `tool_call` `subtype:started`          | `tool_call`                | key in `tool_call` = tool kind; correlate by `call_id`         |
| `tool_call` `subtype:completed`        | `tool_result`              | result inline at `tool_call.<kind>.result`; same `call_id`     |
| `system` `subtype:init`                | `session`                  | carries `session_id` (or get it from `create-chat`)            |
| `result`                               | terminal `done:true`       | `result` = canonical text; `usage` available; `is_error`→error |
| process exit ≠ 0 w/o `result`          | `error`                    | use buffered stderr as the message                             |

## 7. How to reproduce

```bash
SCRATCH=$(mktemp -d); printf 'hello from alpha\n' > "$SCRATCH/alpha.txt"
CHAT=$(cursor-agent create-chat)                       # → bare UUID

# turn 1 (text), then turn 2 resumes the same chat (continuity)
cursor-agent --print --output-format stream-json --stream-partial-output \
  --workspace "$SCRATCH" --trust --mode ask --resume "$CHAT" "Reply with exactly: hello world"
cursor-agent --print --output-format stream-json --stream-partial-output \
  --workspace "$SCRATCH" --trust --mode ask --resume "$CHAT" "What phrase did I just ask for?"

# tool call (needs --force; default agent mode)
cursor-agent --print --output-format stream-json --stream-partial-output \
  --workspace "$SCRATCH" --trust --force --resume "$(cursor-agent create-chat)" \
  "Use your tools to read alpha.txt and report its contents."
```

Inspect with `jq -r '.type' out.ndjson | sort | uniq -c` and
`jq -c 'select(.type=="assistant") | {ts: has("timestamp_ms"), text: .message.content[0].text}' out.ndjson`.

## 8. Server / home-chat integration behavior

Notes for the developer home chat (`applications/openthrottle-developer/app/routes/_index.tsx` → `startConversationStream`), added when fixing "Cursor Agent selected but nothing appears to happen" (OT plan `67ceec0b`).

- **Repository is required.** A CLI backend needs a `cwd`. It resolves from the selected registered repository, or — only when `NODE_ENV !== 'production'` — from `OPENTHROTTLE_AGENT_DEV_CWD`. With neither, the start mutation returns an `errorMessage` and the composer shows "Register a local repository in Settings".
- **cursor-agent buffers to end-of-turn.** Even with `--stream-partial-output`, a turn's thinking/text/result often land in a single burst seconds in (≈9s observed). The composer therefore shows a **pending "Working…" indicator** for the started assistant turn (kept visible via `isStreaming` until the terminal chunk) instead of an empty "(No content)" bubble.
- **Subscription replay closes the connect race.** The home route only learns the conversation id once the start mutation returns, so its `conversationStreamChunkAdded` subscription attaches after the stream began publishing. `ConversationStreamService` keeps a bounded per-conversation replay buffer (reset at turn start, evicted 30s after the terminal chunk) and `subscribe()` replays buffered-then-live; the client dedupes by `messageId:sortOrder`. This also delivers a turn that completed before the client subscribed.
- **Session-create is bounded.** `createCursorAgentSession` (`cursor-agent create-chat`) is bounded by `OPENTHROTTLE_AGENT_SESSION_TIMEOUT_MS` (default 30 000 ms); on timeout the child is torn down (SIGTERM→SIGKILL) and a clear error surfaces — the start mutation can never hang. Stream turns remain bounded by the idle / wall-clock timeouts in §1.
