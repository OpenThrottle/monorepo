# gemini stream-json schema (spike)

> Plan-Id: 99541038-2e03-4a76-b0fa-7844e4801f3d
> Captured on gemini-cli 0.25.2 (Homebrew `gemini-cli`, binary `gemini`), auth: **none available on the probe host** — see provenance note.

> **Provenance.** The probe host had no Gemini credentials (no `~/.gemini`, no
> `GEMINI_API_KEY`; OAuth login is interactive-only), so live model turns could
> not be captured. Everything below is taken from the **installed binary
> itself**: real invocations for everything auth-independent (`--help`,
> `--version`, `--list-sessions`, the exit-41 auth failure, installer-URL
> probes), and the **shipped, unminified compiled source** of 0.25.2
> (`dist/src/nonInteractiveCli.js`, `@google/gemini-cli-core`
> `dist/src/output/types.d.ts` + `stream-json-formatter.js`,
> `dist/src/utils/errors.js`) for the stream-json event schema — the actual
> serializer code, not memory or docs. Event shapes below are the exact object
> literals the 0.25.2 emitter writes. **Refresh with live NDJSON captures once
> an authenticated host runs the §11 commands.**

## 1. Invocation contract

Headless mode is the default for a positional prompt (`gemini [query..]`
"Defaults to one-shot"); interactive only when no prompt is given on a TTY or
with `-i/--prompt-interactive`.

| Flag                                           | Meaning                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `<query>` (positional)                         | The prompt. Preferred; one-shot by default.                                                                                    |
| `-p, --prompt <text>`                          | **Deprecated** ("Use the positional prompt instead. This flag will be removed in a future version."). Appended to stdin input. |
| `-o, --output-format <fmt>`                    | `text` \| `json` \| `stream-json`. `stream-json` = NDJSON on stdout.                                                           |
| `-m, --model <id>`                             | Model id. Omit for the CLI default (no `auto` sentinel — omit the flag entirely).                                              |
| `--approval-mode <mode>`                       | `default` (prompt) \| `auto_edit` (auto-approve edits) \| `yolo` (auto-approve all tools).                                     |
| `-y, --yolo`                                   | Boolean equivalent of `--approval-mode yolo`.                                                                                  |
| `--allowed-tools <names...>`                   | Tools allowed without confirmation.                                                                                            |
| `--allowed-mcp-server-names <names...>`        | Restrict which configured MCP servers load.                                                                                    |
| `--include-directories <dirs>`                 | Extra workspace directories.                                                                                                   |
| `-r, --resume <latest\|index>`                 | Resume a previous session for the current project.                                                                             |
| `--list-sessions` / `--delete-session <index>` | Local session management (work unauthenticated).                                                                               |
| `-s, --sandbox`                                | Sandboxed run.                                                                                                                 |
| `-v, --version`                                | Prints the bare version (`0.25.2`).                                                                                            |

There is **no `--workspace`/`--cwd` flag** — the workspace is the process cwd
(plus `--include-directories`). There is **no `--system` flag** (§5).

⚠️ **stdin must be closed by the spawner.** When stdin is not a TTY the CLI
`await readStdin()` before running (`dist/src/gemini.js`) — a spawned child
with an open, silent stdin pipe **hangs forever**. Spawn with stdin `'ignore'`
(argv path) and `< /dev/null` (shell path).

⚠️ Node deprecation noise (`DEP0040 punycode`) is printed to **stderr** on every
run — strip/ignore it; it is not an error.

## 2. Framing & event taxonomy

NDJSON (the formatter is literally `JSON.stringify(event) + '\n'` per event),
all on stdout, newline-terminated. Event `type` set (enum `JsonStreamEventType`
in `@google/gemini-cli-core/dist/src/output/types.d.ts`):

| type          | Shape (exact emitter fields)                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `init`        | `{type, timestamp, session_id, model}`                                                             |
| `message`     | `{type, timestamp, role: 'user'\|'assistant', content, delta?: boolean}`                           |
| `tool_use`    | `{type, timestamp, tool_name, tool_id, parameters: object}`                                        |
| `tool_result` | `{type, timestamp, tool_id, status: 'success'\|'error', output?: string, error?: {type, message}}` |
| `error`       | `{type, timestamp, severity: 'warning'\|'error', message}` (non-fatal: loop detection, max-turns)  |
| `result`      | `{type, timestamp, status: 'success'\|'error', error?: {type, message}, stats?: StreamStats}`      |

`timestamp` is an ISO string (`new Date().toISOString()`). `StreamStats` =
`{total_tokens, input_tokens, output_tokens, cached, input, duration_ms, tool_calls}`
(aggregated across models by `convertToStreamStats`).

Emission order (from `runNonInteractive`): `init` → `message`(user echo) →
per model turn: `message`(assistant, `delta: true`) × N and `tool_use` × M →
`tool_result` per executed tool → (loop while tool calls exist) → `result`.

## 3. Assistant text & double-count rule

Assistant text arrives **only** as `message` events with `role: 'assistant'`
and `delta: true` (one per `GeminiEventType.Content` chunk). There is **no
final consolidated assistant echo** — the terminal `result` event carries
`stats`, not text. Rule: **concatenate every assistant-role `message.content`;
nothing to skip.** (The deprecated `-p` path can also emit one assistant
`delta` message containing the deprecation warning — another reason to use the
positional prompt.)

`role: 'user'` messages are prompt echoes — ignore for rendering.

## 4. Thinking & tool calls

- **No thinking events.** The non-interactive loop maps only `Content`,
  `ToolCallRequest`, `LoopDetected`, `MaxSessionTurns`, `Error`,
  `AgentExecutionStopped/Blocked`; model thought events are not serialized in
  0.25.2. Text-only + tools rendering.
- Tool call = single `tool_use` event (no started/completed pair) with
  correlation id `tool_id` (the internal `callId`); `parameters` is the raw
  args object.
- Tool result = **separate** `tool_result` event correlated by `tool_id`;
  `output` is the display string when available; failures carry
  `status: 'error'` + `error: {type, message}` (e.g. `TOOL_EXECUTION_ERROR`).
  Fatal tool errors (e.g. no disk space) instead emit a terminal
  `result{status:'error'}` and exit 54.

## 5. System prompt / persona

No `--system` flag. The override mechanism is `GEMINI_SYSTEM_MD=<path>` (env
var pointing at a replacement system prompt file; `dist/src/core/prompts.js`) —
**it replaces, not appends**, and the default path variant
(`.gemini/system.md`) would mutate the checkout, so it is rejected for OT use.
**v1: prompt-prefix** the persona into the positional prompt.

## 6. Sessions & multi-turn

- No session mint command. Sessions are created implicitly per run and stored
  locally per project (hashed project root under `~/.gemini/history/…`).
- `--list-sessions` (works unauthenticated, exit 0; prints
  `No previous sessions found for this project.` when empty) and
  `--resume latest|<index>` — **index/latest based, not id based**, scoped to
  the current project directory.
- The minted session id is surfaced in the `init` event (`session_id`) but
  cannot be passed back to `--resume` in 0.25.2 — resume takes an index.
- Consequence for an adapter: `--resume latest` is racy whenever more than one
  gemini run can touch the same checkout (scheduled jobs, parallel chats).
  **v1: flatten conversation history into the prompt**; revisit if the CLI
  gains resume-by-id.

## 7. Errors, exit codes, cancellation

| Scenario                    | stdout                                                           | stderr                                                                                                                                                                                                                                | exit | Handling                        |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------- |
| No auth configured          | (stream-json: `result{status:'error'}`; text mode: nothing)      | `Please set an Auth method in your <home>/.gemini/settings.json or specify one of the following environment variables before running: GEMINI_API_KEY, GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_GENAI_USE_GCA` (captured verbatim, text mode) | 41   | Surface stderr as `error` chunk |
| Bad input / `@file` missing | `result{status:'error'}` (stream-json)                           | message (text mode)                                                                                                                                                                                                                   | 42   | `FatalInputError`               |
| Sandbox failure             | —                                                                | —                                                                                                                                                                                                                                     | 44   | `FatalSandboxError`             |
| Config error                | —                                                                | —                                                                                                                                                                                                                                     | 52   | `FatalConfigError`              |
| Max session turns           | `error{severity:'error'}` then `result`                          | —                                                                                                                                                                                                                                     | 53   | `FatalTurnLimitedError`         |
| Fatal tool failure          | `result{status:'error', error:{type: <ToolErrorType>}}`          | —                                                                                                                                                                                                                                     | 54   | `FatalToolExecutionError`       |
| Cancellation (Ctrl+C/abort) | —                                                                | `Cancelling...` (if >200 ms)                                                                                                                                                                                                          | 130  | `FatalCancellationError`        |
| API/other error             | `result{status:'error', error:{type: <ErrorCtorName>, message}}` | —                                                                                                                                                                                                                                     | 1    | default                         |

In `stream-json` mode **every fatal error still ends with a terminal `result`
event** (`handleError` emits `result{status:'error'}` with best-effort stats,
then `process.exit(code)`). Terminal condition = `result` event **or** process
exit, whichever first. On EPIPE (consumer closed the pipe) the CLI exits 0
silently. SIGTERM is not specially trapped in headless mode — normal child
teardown (SIGTERM→SIGKILL grace) applies; no known lingering grandchildren,
but verify `ps` after live runs.

## 8. Auth, models, discovery

- Auth precedence (headless, `validateNonInterActiveAuth.js`):
  `GOOGLE_GENAI_USE_GCA=true` (OAuth "Login with Google" — interactive first
  time) → `GOOGLE_GENAI_USE_VERTEXAI=true` (needs `GOOGLE_CLOUD_PROJECT` +
  `GOOGLE_CLOUD_LOCATION`, or express-mode `GOOGLE_API_KEY`) →
  `GEMINI_API_KEY`. Otherwise exit 41. A persisted choice lives in
  `~/.gemini/settings.json` (`security.auth`).
- `gemini --version` → `0.25.2` (bare).
- **No model-listing command** (subcommands are only `mcp`, `extensions`,
  `hooks`, `skills`) → discovery is **availability-only** (`discoverModels`
  omitted; probe with `--version`).
- No `status`/`whoami`.
- Install channels: `npm install -g @google/gemini-cli`, Homebrew
  `brew install gemini-cli`, `npx`. **No official curl-shell installer**
  (`https://geminicli.com/install.sh` and `/install` both 404, verified
  2026-08-25) → the drivers-package install descriptor needs an npm method.
- No self-update subcommand → update = re-run the npm/brew install.
- MCP: servers come from `mcpServers` in `.gemini/settings.json` (user scope
  `~/.gemini/`, workspace scope `<cwd>/.gemini/`) or `gemini mcp add`. The CLI
  does **not** read `.mcp.json` (zero references in the 0.25.2 source), so a
  run in an OT checkout does not see `openthrottle-mcp` unless a
  `.gemini/settings.json` is committed.

## 9. Event → ConversationStreamChunk mapping

| CLI event/condition                          | → chunk          | Notes                                                                                   |
| -------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `message{role:'assistant', delta:true}`      | `text` (`delta`) | path: `.content`; no final echo — accumulate everything                                 |
| (none)                                       | `thinking`       | not emitted in 0.25.2                                                                   |
| `tool_use`                                   | `tool_call`      | correlation id: `.tool_id`; name `.tool_name`, args `.parameters`                       |
| `tool_result`                                | `tool_result`    | separate event; correlate by `.tool_id`; text at `.output`                              |
| `result.stats`                               | `usage`          | `{total_tokens, input_tokens, output_tokens, cached, input, …}`                         |
| `init.session_id`                            | `session`        | informational only (resume is index-based)                                              |
| `result` (or process exit)                   | `done:true`      | always emitted, success **and** fatal-error paths                                       |
| `result{status:'error'}` / stderr + exit ≠ 0 | `error`          | codes: 41 auth, 42 input, 44 sandbox, 52 config, 53 turns, 54 tool, 130 cancel, 1 other |

## 10. Verdict

**Compatible (degraded)** — headless NDJSON with assistant deltas, single-event
tool calls + separate correlated results, deterministic terminal (`result`
always emitted, even on fatal errors), usage stats, arg-array spawnable, exit
codes are clean. Degradations: no thinking events; no resume-by-id (flatten
history); no `--system` flag (prompt-prefix); no model listing
(availability-only discovery). Blockers: none — pending confirmation against a
live authenticated capture.

## 11. How to reproduce

```bash
# static (no auth needed)
gemini --help
gemini --version
gemini --list-sessions
cd "$(mktemp -d)" && gemini -o stream-json "say hello"; echo "exit=$?"   # 41 when unauthenticated

# live (needs GEMINI_API_KEY or OAuth'd ~/.gemini) — run in a scratch dir
S=$(mktemp -d); cd "$S"
gemini -o stream-json "Count from 1 to 5, one per line." > out.ndjson 2> out.err; echo "exit=$?"
jq -r '.type' out.ndjson | sort | uniq -c
printf 'hello\n' > a.txt
gemini -o stream-json --approval-mode yolo "Use your tools to read a.txt and report its contents." > tools.ndjson
jq -c 'select(.type|test("tool"))' tools.ndjson
gemini -o stream-json -m definitely-not-a-model "hi"; echo "exit=$?"

# source of the schema (installed package, unminified)
BREW_PKG=$(dirname "$(readlink -f "$(which gemini)")")   # …/@google/gemini-cli/dist
# dist/src/nonInteractiveCli.js                          — emitter call sites
# node_modules/@google/gemini-cli-core/dist/src/output/types.d.ts — event types
# node_modules/@google/gemini-cli-core/dist/src/utils/errors.js   — exit codes
```
