# claude (Claude Code) stream-json schema (spike)

> Plan-Id: a3363c74-09f5-4403-bca2-efc16ab424ed
>
> Filled-in output of [agentic-cli-backend-compatibility-guide.md](./agentic-cli-backend-compatibility-guide.md)
> for the `claude` CLI (Claude Code). Compare with
> [cursor-agent-stream-json-schema.md](./cursor-agent-stream-json-schema.md).
> All payloads are verbatim from live runs on **claude `2.1.177`** (auth via the
> host login). Re-run the commands in [§11](#11-how-to-reproduce) to refresh.

## 1. Invocation contract

```
claude -p --output-format stream-json --include-partial-messages --verbose \
  --session-id <uuid> | --resume <uuid> \
  [--model <id>] [--append-system-prompt <text>] [--allowedTools <names...>] \
  -- "<prompt>"   < /dev/null
```

| Flag                                                       | Meaning for the adapter                                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-p, --print`                                              | Non-interactive/headless. **Required**.                                                                                                                       |
| `--output-format stream-json`                              | NDJSON event stream (this doc). `text`/`json` also exist.                                                                                                     |
| `--verbose`                                                | **Required** for `stream-json` under `--print` (otherwise rejected).                                                                                          |
| `--include-partial-messages`                               | Emit incremental deltas (the `stream_event` envelopes). Without it you get only the consolidated `assistant` + `result`. Only with `--print` + `stream-json`. |
| `--session-id <uuid>`                                      | **Set the session id up front** — we generate the UUID; no "create" round-trip (unlike cursor's `create-chat`).                                               |
| `-r, --resume <uuid>`                                      | Resume a prior session by id (continuity — see [§6](#6-sessions--multi-turn)). `--fork-session` branches to a new id. `-c/--continue` = most recent in cwd.   |
| `--model <id>`                                             | Model selection.                                                                                                                                              |
| `--system-prompt <text>` / `--append-system-prompt <text>` | **First-class system prompt** (+ `…-file` variants). See [§5](#5-system-prompt--persona).                                                                     |
| `--allowedTools <names...>`                                | Scoped tool allowlist for headless tool use (e.g. `Read`). Variadic — see the `--` note below.                                                                |
| `--add-dir <dirs...>`                                      | Extra dirs tool access is allowed in. cwd (the spawn `cwd`) is the workspace; there is **no `--workspace` flag**.                                             |

**Spawn gotchas (verified, both matter for the adapter):**

- **stdin must be closed/ignored** (`stdio: ['ignore', …]` or redirect `/dev/null`). Otherwise claude waits ~3s for stdin and warns; with neither stdin nor a prompt arg it errors `Input must be provided…`.
- **Terminate options with `--` before the prompt.** Variadic flags like `--allowedTools` otherwise swallow the prompt as a tool name. (With an arg array we control this precisely — put `--` as the element before the prompt.)
- `--dangerously-skip-permissions` exists but is the wrong tool here (disables all gates); use a **scoped `--allowedTools`** list instead.

## 2. Framing & event taxonomy

- **NDJSON**, one object per line, stdout. Every event carries `session_id` and a `uuid`.
- Outer envelope `type`s observed: `system`, `stream_event`, `assistant`, `user`, `result`, `rate_limit_event`.
- **`stream_event` wraps the raw Anthropic Messages API stream** (`message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`). This is the key structural difference from cursor: deltas are **nested** under `stream_event.event`, not flat top-level events.

### `system` — lifecycle/metadata (multiple subtypes)

Subtypes: `hook_started`, `hook_response`, `init`, `status`, `post_turn_summary`.
`init` carries `session_id`, `cwd`, `model`, `tools`, `mcp_servers`, `apiKeySource`, `claude_code_version`, `permissionMode`, etc.

```json
{"type":"system","subtype":"init","cwd":"/private/tmp/…","session_id":"f047374e-…","model":"claude-opus-4-8","permissionMode":"default","apiKeySource":"…", …}
```

> The adapter **ignores** `hook_*`, `status`, `post_turn_summary`, and `rate_limit_event` — they have no chunk mapping.

### `stream_event` — the delta carrier

`.event.type` sequence for a plain text turn:

```
message_start → content_block_start → content_block_delta(text_delta) … → content_block_stop → message_delta → message_stop
```

Text delta payload (the canonical streaming text):

```json
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ello world"}}, …}
```

- Text: `event.delta.type=="text_delta"` → `event.delta.text`.
- Thinking: `content_block_start` with `content_block.type=="thinking"`, then `content_block_delta` of `thinking_delta` (text under `.thinking`) and `signature_delta` (ignore the signature).
- Tool input: `content_block_start` with `content_block.type=="tool_use"` (`id`, `name`, empty `input`), then `content_block_delta`/`input_json_delta` whose `.partial_json` fragments **concatenate to the tool args JSON**.

### `assistant` — consolidated message (one per content block)

Full, non-incremental copy of each completed content block (`thinking` / `tool_use` / `text`), with `message.usage`:

```json
{"type":"assistant","message":{"model":"claude-opus-4-8","role":"assistant","content":[{"type":"text","text":"hello world"}],"usage":{…}}, "session_id":"…"}
```

> ⚠️ **Double-count rule:** the canonical streaming text is the `text_delta` stream (above); the `assistant` events **repeat the full text** and must be **skipped** for accumulation. Discriminator = the **envelope type** (`stream_event` = delta, `assistant` = consolidated). Verified: `text_delta` concat == `result.result`. (cursor used `timestamp_ms` presence; claude uses envelope type — this is exactly the per-CLI discriminator the guide says to record.)

### `user` — tool results come back here

Unlike cursor (result inline in the tool_call), claude returns tool results as a **`user` event** with `tool_result` content blocks, correlated by `tool_use_id`:

```json
{
  "type": "user",
  "message": {
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_01Ayo6…",
        "content": "1\thello from alpha\n2\t"
      }
    ]
  },
  "session_id": "…"
}
```

### `result` — terminal event (exactly once)

```json
{"type":"result","subtype":"success","is_error":false,"result":"hello world","num_turns":1,"stop_reason":"end_turn","terminal_reason":"completed","total_cost_usd":0.046,"usage":{…},"modelUsage":{…},"session_id":"…"}
```

`result` = canonical final text; rich `usage`/`modelUsage`/`total_cost_usd`. **Check `is_error`, not `subtype`** — see [§7](#7-errors-exit-codes-cancellation).

## 3. Assistant text & double-count rule

- Canonical deltas: `stream_event` → `content_block_delta` → `text_delta` → `.event.delta.text`.
- Skip the consolidated `assistant` text events.
- Final/canonical text also available at `result.result`.

## 4. Thinking & tool calls

- **Thinking:** `content_block` type `thinking`; stream via `thinking_delta` (text at `.event.delta.thinking`); `signature_delta` is a cryptographic signature → ignore. (In the captured run only a `signature_delta` appeared; reasoning text arrives as `thinking_delta` when the model emits visible thinking.)
- **Tool call:** `content_block_start` type `tool_use` gives `id` + `name`; args stream as `input_json_delta.partial_json` fragments (concatenate to JSON). Maps to `kind:'tool_call'`.
- **Tool result:** a separate `user` event with a `tool_result` block, correlated by `tool_use_id`. Maps to `kind:'tool_result'`. (Structurally different from cursor's inline result.)

## 5. System prompt / persona

**First-class flags** — `--system-prompt <text>` (replace) and `--append-system-prompt <text>` (augment), plus `…-file` variants. Persona → **`--append-system-prompt`** (no prompt-prefix hack, and nothing written into the checkout). This is cleaner than cursor and means persona handling is **per-adapter**, not shared.

## 6. Sessions & multi-turn

- `--session-id <uuid>`: we **mint and supply** the id (generate a UUID, persist to `conversation.metadata`, pass on the first turn). No async "create" step.
- `-r/--resume <uuid>`: continue. **Continuity verified across separate process invocations** (turn 2 in a fresh process recalled turn 1's phrase). claude owns the multi-turn context — do **not** replay history.
- `session_id` is echoed on every event = the id we set.
- `--fork-session` branches; `-c/--continue` resumes the most recent session in the cwd.

## 7. Errors, exit codes, cancellation

| Scenario                          | stdout                                                                                                                     | stderr                           | exit  | Handling                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| Invalid `--model`                 | full event stream incl. `assistant` w/ `error:"model_not_found"` and `result` with `is_error:true`, `api_error_status:404` | empty                            | **1** | Errors surface **in-stream** (`result.is_error`) **and** via exit code. **`subtype` stays `"success"` — gate on `is_error`.** |
| Missing prompt + no stdin         | empty                                                                                                                      | `Error: Input must be provided…` | 1     | Always pass the prompt as an arg and ignore stdin.                                                                            |
| `stream-json` without `--verbose` | —                                                                                                                          | rejected                         | 1     | Always pass `--verbose`.                                                                                                      |
| Tool not in `--allowedTools`      | stream + `permission_denials` in `result`                                                                                  | empty                            | 0     | Denied tools are reported, not fatal.                                                                                         |
| Normal completion                 | NDJSON ending in `result` (`is_error:false`)                                                                               | empty                            | 0     | Terminal `result` → `done:true`.                                                                                              |

**Terminal condition:** a `result` event (preferred — read `is_error`) **or** process exit. On exit without a `result`, surface buffered stderr as an `error` chunk. Cancellation: SIGTERM the child (same as cursor); the AbortController→kill path applies.

## 8. Auth, models, discovery

- Auth: host login (or `ANTHROPIC_API_KEY`); `apiKeySource` reported in `system/init`.
- `claude --version` → `2.1.177 (Claude Code)` (probe/availability).
- Model ids come from the account; `--model` selects. (No separate `--list-models` exercised here.)
- `--bare` exists (skips hooks/memory/CLAUDE.md, forces API-key auth) — **avoid** for the host-login single-node assumption; instead rely on running in a scratch/scoped cwd with no `CLAUDE.md` to limit auto-discovery noise.

## 9. Event → ConversationStreamChunk mapping

| claude event/condition                                                     | → chunk       | Path / note                                                           |
| -------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------- |
| `stream_event` / `content_block_delta` / `text_delta`                      | `text`        | `delta = .event.delta.text`                                           |
| `assistant` (consolidated)                                                 | _(skip)_      | repeats full text; double-count                                       |
| `stream_event` / `content_block_delta` / `thinking_delta`                  | `thinking`    | `.event.delta.thinking`; ignore `signature_delta`                     |
| `stream_event` / `content_block_start` / `tool_use` (+ `input_json_delta`) | `tool_call`   | `id`+`name`; concat `partial_json` for args; correlate by tool_use id |
| `user` / `tool_result` block                                               | `tool_result` | correlate by `tool_use_id`                                            |
| `result.usage` / `assistant.message.usage`                                 | `usage`       | also `total_cost_usd`                                                 |
| `session_id` (every event) = supplied uuid                                 | `session`     | confirmation; we already hold the id                                  |
| `result` (`is_error:false`)                                                | `done:true`   | `result`=canonical text                                               |
| `result.is_error:true` / non-zero exit / startup stderr                    | `error`       | gate on `is_error`, not `subtype`                                     |
| `system/hook_*`, `status`, `post_turn_summary`, `rate_limit_event`         | _(ignore)_    | no mapping                                                            |

## 10. Verdict — **Compatible (full-featured)**

claude satisfies every **required** criterion and most nice-to-haves, arguably a _better_ structural fit than cursor:

- ✅ Deterministic session id we supply (`--session-id`) — no create round-trip.
- ✅ First-class system prompt (`--append-system-prompt`) — no prompt-prefix, no checkout mutation.
- ✅ Native cross-process resume; rich thinking/tool/usage events; per-turn cost.

**Adapter differences from cursor (per-adapter, not interface-level):**

1. Deltas are **nested** under `stream_event.event.*` (vs cursor's flat top-level events) — different parse path.
2. Double-count discriminator is the **envelope type** (`stream_event` vs `assistant`), not a field's presence.
3. Tool results arrive as a separate **`user` event** (vs cursor's inline result).
4. Errors appear **in-stream** (`result.is_error`) as well as via exit code (cursor put config errors only on stderr).
5. Spawn hygiene: **ignore stdin**, require `--verbose`, and place `--` before the prompt.

**Interface implication (validates the task-2 seam):** both CLIs fit the same
`ConversationBackend` = `(normalized run) → AsyncIterable<ConversationStreamChunk>`
contract, but each owns its **own parser, session-acquisition, and
system-prompt injection**. The seam belongs at "normalized run in, chunk
iterable out" — not at any shared parsing/flag logic. The `kind` set
(`text|thinking|tool_call|tool_result|usage|session`) covers both. No required
degradations.

## 11. How to reproduce

```bash
SCRATCH=$(mktemp -d); printf 'hello from alpha\n' > "$SCRATCH/alpha.txt"; cd "$SCRATCH"
SID=$(uuidgen | tr 'A-Z' 'a-z')

# turn 1 (text) — note: ignore stdin, -- before prompt
claude -p --output-format stream-json --include-partial-messages --verbose \
  --session-id "$SID" -- "Reply with exactly: hello world" < /dev/null

# turn 2 — resume (continuity, fresh process)
claude -p --output-format stream-json --include-partial-messages --verbose \
  --resume "$SID" -- "What exact phrase did I just ask you to reply with?" < /dev/null

# tool call — scoped allowlist (NOT --dangerously-skip-permissions)
claude -p --output-format stream-json --include-partial-messages --verbose \
  --session-id "$(uuidgen|tr A-Z a-z)" --allowedTools Read \
  -- "Use the Read tool to read alpha.txt and tell me its contents." < /dev/null
```

Inspect:

```bash
jq -r '.type' out.ndjson | sort | uniq -c
jq -rc 'select(.type=="stream_event") | [.event.type, (.event.content_block.type // .event.delta.type // "")] | @tsv' out.ndjson
jq -rj 'select(.type=="stream_event" and .event.delta.type=="text_delta") | .event.delta.text' out.ndjson
```
