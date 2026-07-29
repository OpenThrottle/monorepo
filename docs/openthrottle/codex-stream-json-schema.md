# codex (OpenAI Codex CLI) stream-json schema (spike)

> Plan-Id: 230b02ab-4a5f-47e8-a298-abeaa2eb1768
>
> Filled-in output of [agentic-cli-backend-compatibility-guide.md](./agentic-cli-backend-compatibility-guide.md)
> for the `codex` CLI. Compare with
> [claude-stream-json-schema.md](./claude-stream-json-schema.md),
> [cursor-agent-stream-json-schema.md](./cursor-agent-stream-json-schema.md), and
> [opencode-stream-json-schema.md](./opencode-stream-json-schema.md). Verified
> against **codex-cli `0.145.0`**.
>
> ⚠️ **Success-path caveat.** The host codex credentials were expired during
> authoring (`codex exec` returned `401 refresh_token_reused` on every model
> call), so the `thread.started` / `turn.started` / `error` / `turn.failed`
> **failure** envelope below is verbatim from a live run, but the success items
> (`item.completed` for `agent_message`/`reasoning`, `turn.completed`) are from
> the codex `exec` JSONL taxonomy embedded in the binary, not a live capture.
> The mapper reads the item discriminant defensively as `item_type ?? type`.
> Re-run [§11](#11-how-to-reproduce) after `codex login` to refresh.

## 1. Invocation contract

```
# fresh turn (codex mints the thread id, echoes it in thread.started)
codex exec --json --skip-git-repo-check --sandbox <policy> [--model <m>] -- "<prompt>"   < /dev/null

# resume a prior thread
codex exec resume --json --skip-git-repo-check --sandbox <policy> [--model <m>] -- <sessionId> "<prompt>"   < /dev/null
```

| Flag                                         | Meaning for the adapter                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `exec [PROMPT]`                              | Non-interactive run. The prompt is the positional (last, after `--`). **Required** subcommand.   |
| `exec resume [SESSION_ID] [PROMPT]`          | Resume a prior thread by id. Positionals after `--`: session id, then prompt.                    |
| `--json`                                     | Emit the JSONL thread-event stream (this doc). **Required** for parsing.                         |
| `--skip-git-repo-check`                      | Allow running outside a git repo. Belt-and-suspenders; chat cwds are usually repos.              |
| `-C, --cd <DIR>`                             | Working root. We set the spawn `cwd` instead; not passed explicitly.                             |
| `-m, --model <MODEL>`                        | Model id. Omitted when unset/blank/`auto` → codex's default.                                     |
| `-s, --sandbox <policy>`                     | `read-only` (default/supervised), `workspace-write` (autoAcceptEdits). See [§5](#5-permissions). |
| `--dangerously-bypass-approvals-and-sandbox` | `fullAccess` posture. Replaces `--sandbox`.                                                      |

**Spawn gotchas (verified, all matter for the adapter):**

- **Terminate options with `--` before the prompt.** Verified: `codex exec --json ... -- "<prompt>"` parses the prompt as the positional even when it starts with `-`/`---`. codex honors the `--` end-of-options marker.
- **Ignore stdin** (`stdio: ['ignore', …]`). With the prompt as an arg, closing stdin (`< /dev/null`) makes codex read EOF and proceed; leaving stdin open makes it wait ("Reading additional input from stdin…").
- **No pre-mint command.** codex mints the thread id on the first `exec` and surfaces it in `thread.started.thread_id` (see [§6](#6-sessions--multi-turn)). Resume via the `exec resume <id>` subcommand.

## 2. Framing & event taxonomy

- **JSONL**, one object per line on stdout. Every event carries a top-level `type` (dot-namespaced), unlike claude's nested `stream_event` envelope.
- Top-level `type`s: `thread.started`, `turn.started`, `item.started`, `item.updated`, `item.completed`, `turn.completed`, `turn.failed`, `error`.
- **Only `item.completed` is mapped** — it carries the full item (whole message). `item.started`/`item.updated` are skipped to avoid double-counting the same item's text. codex `exec --json` is item-granular, not token-granular (token deltas exist only in the lower-level app-server protocol, not this stream).
- `item.item_type` (the item discriminant) ∈ `agent_message | reasoning | command_execution | file_change | mcp_tool_call | web_search | todo_list` (from the binary's `ThreadItem` taxonomy).

### `thread.started` — session opened (verbatim, live)

```json
{
  "type": "thread.started",
  "thread_id": "019fab65-bab1-7343-a32e-1d0cadd24055"
}
```

### `item.completed` — a completed item (agent_message / reasoning / tool)

```json
{"type":"item.completed","item":{"id":"…","item_type":"agent_message","text":"pong"}}
{"type":"item.completed","item":{"id":"…","item_type":"reasoning","text":"…"}}
{"type":"item.completed","item":{"id":"…","item_type":"command_execution","command":"ls", …}}
```

### `turn.completed` — terminal, usage

```json
{"type":"turn.completed","usage":{"input_tokens":…,"cached_input_tokens":…,"output_tokens":…}}
```

### `error` / `turn.failed` — terminal error (verbatim, live — expired auth)

```json
{"type":"error","message":"Your access token could not be refreshed because your refresh token was already used. Please log out and sign in again."}
{"type":"turn.failed","error":{"message":"Your access token could not be refreshed because your refresh token was already used. Please log out and sign in again."}}
```

## 3. Assistant text & double-count rule

`agent_message` items carry the **full** assistant text in `item.text`. Mapping only `item.completed` (never `item.started`/`item.updated`) yields exactly one text chunk per message — no double-count. Streaming granularity is per-item.

## 4. Thinking & tool calls

`reasoning` items → `thinking` chunks (full text). `command_execution` / `mcp_tool_call` / `file_change` / `web_search` / `todo_list` items → `tool_result` chunks carrying the raw item under `metadata.item` (+ `metadata.itemType`).

## 5. Permissions

Composer posture → codex sandbox: `fullAccess` → `--dangerously-bypass-approvals-and-sandbox`; `autoAcceptEdits` → `--sandbox workspace-write`; `supervised` / no-mode default → `--sandbox read-only` (a headless `exec` cannot prompt, so read-only is the safe default unless edits were explicitly authorized).

## 6. Sessions & multi-turn

One OT conversation ↔ one codex thread. codex mints the id on the first `exec` and echoes it as `thread.started.thread_id`; the adapter surfaces it via a `kind:'session'` chunk (before the terminal chunk), which `ConversationStreamService.maybePersistMintedSession` persists. Later turns run `codex exec resume <id> -- "<prompt>"` with `resumeSession:true`. This is the opencode-style mint-on-first-run flow — no resolver session-branch change is needed (the default no-pre-mint branch already fits).

## 7. Errors, exit codes, cancellation

Terminal on `turn.completed` (success) / `turn.failed` / `error`, or on process exit if no terminal event was seen (the adapter synthesizes a terminal error chunk from stderr + exit code). Cancellation and idle/wall-clock timeouts use the shared SIGTERM→SIGKILL teardown.

## 8. MCP

codex manages MCP via the `codex mcp` subcommand (persistent config) and `-c mcp_servers.<name>…` TOML overrides. Inline injection of the managed OT MCP server is **deferred for v1** — the adapter ignores `mcpServers` (and merges `mcpEnv` harmlessly). Follow-up: wire managed MCP through `-c` config overrides.

## 9. Event → ConversationStreamChunk mapping

| codex event                            | chunk                                                              |
| -------------------------------------- | ------------------------------------------------------------------ |
| `thread.started`                       | `session` (`metadata.sessionId = thread_id`), `done:false`         |
| `item.completed` `agent_message`       | `text` (`delta = item.text`), `done:false`                         |
| `item.completed` `reasoning`           | `thinking` (`delta = item.text`), `done:false`                     |
| `item.completed` (other item kinds)    | `tool_result` (`metadata.item`, `metadata.itemType`), `done:false` |
| `turn.completed`                       | `usage` (`metadata.usage`), **`done:true`**, `error:null`          |
| `turn.failed`                          | `text`, **`done:true`**, `error = error.message`                   |
| `error`                                | `text`, **`done:true`**, `error = message`                         |
| `turn.started`, `item.started/updated` | skipped                                                            |

## 10. Verdict — **Compatible** (session + reasoning + usage; MCP deferred)

## 11. How to reproduce

```bash
# Requires a valid codex login (codex login) — host creds were expired at authoring.
codex exec --json --skip-git-repo-check --sandbox read-only -C /tmp/x -- "Respond with exactly the single word: pong" < /dev/null
# capture the thread_id from thread.started, then:
codex exec resume --json --skip-git-repo-check --sandbox read-only -- <thread_id> "and again" < /dev/null
```
