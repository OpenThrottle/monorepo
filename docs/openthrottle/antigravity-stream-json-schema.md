# antigravity (agy) CLI — headless contract

The headless surface the `antigravity` driver
(`packages/openthrottle-drivers/src/drivers/antigravity.ts`) is built against.

**Measured 2026-08-26** against Antigravity CLI **1.1.21**, `darwin_arm64`, official release tarball
(`cli_mac_arm64.tar.gz`, SHA512 verified against the release manifest). Probed as an extracted
binary in a scratch dir — the `curl | bash` installer was deliberately NOT run, so no PATH or
shell-profile mutation, then re-probed from a properly installed, authenticated binary (§3b).
**Re-verify on every `agy` release** — it self-updates in the background, so the version this
describes will not be the version on disk for long.

> **Naming:** the installer places the binary as **`agy`** in `~/.local/bin`, but the artifact
> inside the tarball is named `antigravity` and its own usage string says `antigravity`. Treat
> `agy` as the installed name (what the driver spawns) and `antigravity` as the tarball name.

## 1. Invocation contract

Headless one-shot exists and is first-class:

| Concern                   | Antigravity CLI 1.1.21                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Headless prompt           | **`-p` / `--print` / `--prompt`** (`--prompt` is a documented alias for `--print`, not deprecated)              |
| Non-interactive approvals | **`--dangerously-skip-permissions`**                                                                            |
| Structured output         | `--output-format text\|json\|stream-json`                                                                       |
| Schema enforcement        | **`--json-schema <string\|path>`** (for `stream-json`, applies to the final result only)                        |
| Model select              | `--model`                                                                                                       |
| Model listing             | **`models` subcommand**                                                                                         |
| Multi-turn                | **`--conversation <ID>` id-based resume**, `-c/--continue` most recent                                          |
| Multi-turn input          | `--input-format stream-json` (one NDJSON message per line on stdin; **requires** `--output-format stream-json`) |
| Timeout                   | `--print-timeout` (default `5m0s`)                                                                              |

Other flags relevant to a driver: `--add-dir` (repeatable workspace dirs), `--sandbox`,
`--effort low|medium|high`, `--mode accept-edits|plan`, `--agent`, `--project` / `--new-project`,
`--disable-slash-commands`, `--log-file`.

Subcommands: `agent(s)`, `changelog`, `help`, `install`, `mcp`, `mic-serve`, `models`, `plugin(s)`,
`update`.

## 2. Auth — the load-bearing gotcha

**Unauthenticated headless runs do NOT fail fast; they block on interactive OAuth.**

`./antigravity -p "say hi" < /dev/null` printed a `accounts.google.com` consent URL, then
`Waiting for authentication (timeout 60s)... Or, paste the authorization code here and press Enter:`
— i.e. it waits for a pasted code **even in print mode with stdin at `/dev/null`**, then exits with
`authentication failed or timed out`. Measured exit was 124 only because our own `timeout 60`
reaped it first.

Consequences for the driver:

- A server-spawned run without pre-provisioned credentials **hangs for the auth window**, it does
  not exit immediately. `--print-timeout` and/or our own spawn timeout is mandatory.
- `models` when unauthenticated is clean: prints `Please sign in to view available models` and
  exits **1**.
- Credential env candidates found in the binary: `GEMINI_API_KEY`, `GOOGLE_API_KEY`,
  `GOOGLE_APPLICATION_CREDENTIALS`, `AGY_ADC_AUTH` (ADC path). **Which of these actually satisfies
  headless auth is UNVERIFIED** — see the residual gap in §5.

## 3. Config, MCP, and plugin resolution

agy keeps its state under the **`~/.gemini` directory** with its own layout; MCP servers are not
configured in `settings.json`. Paths recovered from the binary:

```
~/.gemini/antigravity-cli/settings.json          # CLI settings
~/.gemini/antigravity-cli/hooks.json
~/.gemini/antigravity-cli/cache/projects.json
~/.gemini/config/mcp_config.json                 # MCP servers  <-- not settings.json
~/.gemini/config/skills/                         # Agent Skills
~/.gemini/config/hooks.json
~/.gemini/config/workflows.json, workflows/, global_workflows/
~/.gemini/antigravity/transcript.jsonl           # conversation transcript
~/.gemini/antigravity/artifacts/
```

`antigravity mcp list` on a clean machine → `No MCP servers configured.` (exit 0). There is a real
`mcp` subcommand (`add`, `remove`, `list`, `enable`, `disable`), so MCP servers are
**programmatically registerable** rather than config-file-only. No evidence of `.mcp.json` support,
so an OT checkout's committed `.mcp.json` is still not read — `attachesWorkspaceMcp: false` holds,
but `mcpAutoApprove` may become achievable via `mcp add`.

`antigravity install` is purely environment wiring (`--dir`, `--skip-path`, `--skip-aliases`) —
PATH + shell aliases. `update` is a self-update subcommand, and the binary self-updates in the
background during normal runs.

## 3b. Auth in practice (authenticated install)

With `agy` installed at `~/.local/bin/agy` and signed in via Google OAuth
(`~/.gemini/oauth_creds.json`), two things are verifiable.

### `agy models` output is TAB-SEPARATED, not bare ids

```
Fetching available models...
gemini-3.7-flash-high	Gemini 3.7 Flash (High)
gemini-3.1-pro-high	Gemini 3.1 Pro (High)
claude-sonnet-4-6	Claude Sonnet 4.6 (Thinking)
gpt-oss-120b-medium	GPT-OSS 120B (Medium)
```

Exit 0. Rows are `<id>\t<Display Name>`; the `Fetching available models...` progress line carries no
tab. The driver's `discoverModels.parse` takes the first tab-delimited field per row — an
initial "bare id per line" guess returned `[]` against real output and was fixed here.

Note the catalog is not Google-only: it advertises Claude and GPT-OSS models too.

### Inference is gated by ACCOUNT ELIGIBILITY, separately from auth

A signed-in account is not sufficient. `agy -p "…" --output-format stream-json` returned:

```json
{
  "event": "result",
  "result": {
    "conversation_id": "",
    "status": "ERROR",
    "response": "",
    "error": "Eligibility check failed: Your current account is not eligible for Antigravity. Verify your account to continue.\n\nAlternatively, try signing in with another personal Google account.\n…",
    "duration_seconds": 0,
    "num_turns": 0,
    "usage": {
      "input_tokens": 0,
      "output_tokens": 0,
      "thinking_tokens": 0,
      "cache_read_tokens": 0,
      "total_tokens": 0
    }
  }
}
```

Exit **1** — a clean fast-fail, NOT the OAuth hang of §2. So the failure matrix has three distinct
states worth handling separately: unauthenticated (blocks on OAuth), authenticated-but-ineligible
(exit 1 with a `status: "ERROR"` result event), and authorized (unverified).

### What this pins down about the stream-json envelope

The terminal event is verified:

```
{"event":"<name>","<name>":{…}}   # discriminator + same-named payload object
```

`result` payload fields: `conversation_id`, `status` (`"ERROR"` seen; success value unverified),
`response`, `error`, `duration_seconds`, `num_turns`, and `usage` with `input_tokens`,
`output_tokens`, `thinking_tokens`, `cache_read_tokens`, `total_tokens`.

The **non-terminal** events are still NOT verified. The binary's `printmode` package exposes
`streamJSONEmitter`, `buildInitPayload`, `buildMessageItems` and `buildResultOutput`, plus
`streamInputMessage` / `streamInputContentBlock` / `streamInputUserMessage` for `--input-format
stream-json` — which strongly implies an `init` event and per-message content-block events
alongside `result`. That is inference from symbol names, not captured output, so the event mapper
must NOT be built on it.

## 3c. The stream-json event schema

Captured from real runs on an eligible account with `agy -p "<prompt>" --output-format stream-json
--dangerously-skip-permissions --add-dir "$PWD" --model gemini-3.5-flash-low`. Exit 0.

### Envelope

Every line is `{"event":"<name>", "<name>":{…}}` — a discriminator plus a payload object under the
same key. `init` additionally repeats `conversation_id` at the TOP level; every other event carries
it inside the payload.

Only three event names occur: **`init`**, **`step_update`**, **`result`**. There are no separate
`message` / `tool_use` / `tool_result` events — tool activity is a `step_update` with
`step_type: "tool"`.

### `init` (once, first)

```json
{
  "event": "init",
  "conversation_id": "0da4b6ff-…",
  "init": {
    "model": "gemini-3.5-flash-low",
    "cwd": "/abs/path",
    "tools": ["ask_permission", "run_command", "write_to_file", "…57 total"],
    "permission_mode": "request-review"
  }
}
```

Note `permission_mode` reported `request-review` even under `--dangerously-skip-permissions`.

### `step_update` (many)

```json
{"event":"step_update","step_update":{"conversation_id":"…","step_index":5,"state":"ACTIVE","step_type":"agent_response","text_delta":"I have created the file [hello.txt]("}}
{"event":"step_update","step_update":{"conversation_id":"…","step_index":5,"state":"DONE","step_type":"agent_response","text_delta":"file:///…) containing `hi`.\n","duration_seconds":2.1,"usage":{…}}}
{"event":"step_update","step_update":{"conversation_id":"…","step_index":2,"state":"ACTIVE","step_type":"tool","tool_name":"write_to_file","tool_info":{…}}}
{"event":"step_update","step_update":{"conversation_id":"…","step_index":2,"state":"ERROR","step_type":"tool","tool_name":"write_to_file","tool_info":{…},"duration_seconds":0.3}}
```

Observed values:

| field                 | values                                                                   |
| --------------------- | ------------------------------------------------------------------------ |
| `step_type`           | `user_input`, `agent_response`, `tool`                                   |
| `state`               | `ACTIVE`, `DONE`, `ERROR`                                                |
| always present        | `conversation_id`, `step_index`, `state`, `step_type`                    |
| `agent_response` only | `text_delta` (optional), `usage` + `duration_seconds` on terminal states |
| `tool` only           | `tool_name`, `tool_info`; `duration_seconds` on terminal states          |

**`tool_info` IS ITSELF `{ name, parameters, output? }`** — it repeats `tool_name` and wraps the
tool's real arguments one level deeper, with `output` appearing only on a terminal state (captured
from agy 1.1.22):

```json
{"event":"step_update","step_update":{"step_index":2,"state":"ACTIVE","step_type":"tool","tool_name":"view_file","tool_info":{"name":"view_file","parameters":{"AbsolutePath":"/tmp/sample.txt"}}}}
{"event":"step_update","step_update":{"step_index":2,"state":"DONE","step_type":"tool","tool_name":"view_file","duration_seconds":0.055337,"tool_info":{"name":"view_file","parameters":{"AbsolutePath":"/tmp/sample.txt"},"output":"3 lines, 11 bytes"}}}
```

A consumer must therefore UNWRAP `tool_info.parameters` before rendering the arguments; nesting
`tool_info` under a `parameters` key of its own shows the name and the wrapper twice each.

**Terminal tool steps, captured from agy 1.5.9** (`gemini-3.8-flash-medium`, default
`request-review` posture, 2026-11-14). Abridged:

```json
{"step_index":2,"state":"DONE","step_type":"tool","tool_name":"run_command","tool_info":{"name":"run_command","parameters":{"CommandLine":"pwd"},"output":"Created At: …\nCompleted At: …\nCommand exited with code 0.\n\nCommand output:\n/abs/path\r\n"}}
{"step_index":3,"state":"DONE","step_type":"tool","tool_name":"read_file","tool_info":{"name":"read_file","parameters":{"Path":"/abs/sample.txt"},"output":"3 lines, 17 bytes"}}
{"step_index":4,"state":"ERROR","step_type":"tool","tool_name":"read_file","tool_info":{"name":"read_file","parameters":{"Path":"/abs/missing.txt"},"error":{"type":"TOOL_ERROR","message":"file does not exist"}}}
{"step_index":5,"state":"ERROR","step_type":"tool","tool_name":"call_mcp_tool","tool_info":{"name":"call_mcp_tool","parameters":{"ServerName":"…","ToolName":"health","Arguments":{}},"error":{"type":"TOOL_ERROR","message":"permission check failed for mcp …"}}}
{"step_index":6,"state":"DONE","step_type":"tool","tool_name":"read_file","tool_info":{"name":"read_file","parameters":{"Path":"/abs/does-not-exist/missing.txt"}}}
```

- **`output`** is a string on most DONE steps. For a shell command it is a transcript with the exit
  code and the command's output. For a file read it is only a size summary: agy hands the contents to
  the model, not to the stream.
- **A DONE step can carry no `output` at all.** The last line above is a read of a missing file. In
  the same run another missing-file read came back as `ERROR`. A non-zero shell exit is also DONE,
  with the code in `output`.
- **An ERROR step carries `tool_info.error: { type, message }`** and no `output`.

The mapper therefore sends `output` alone as the result, `null` when there is none, and never the
arguments. An ERROR step becomes a failed card that shows `error.message`. On agy 1.5.1 (the
2026-11-06 probe, conversation `66179a75`), no step carried `output` and ERROR steps had no
message. The old fallback to the arguments is why every RESULT pane showed the arguments.

**`text_delta` IS A DELTA, NOT CUMULATIVE.** The same `step_index` emits multiple
`step_update`s and each carries only the newly produced text; the full assistant message is the
concatenation of that step's deltas. A `user_input` step emits no text at all.

**The double-count rule:** `result.response` is the COMPLETE final assistant text. Rendering the
concatenated `text_delta`s _and_ `result.response` duplicates the whole message — consume one or
the other. The mapper should stream the deltas and treat `result.response` as the
non-streaming fallback only.

A step can go `ACTIVE` → `ERROR` and then be retried under a NEW `step_index` (seen: a
`write_to_file` failing at index 2 and succeeding at index 4), so `step_index` is not a stable
identity for a logical operation and `ERROR` on one step is not a turn-level failure. Turn success
is `result.status` alone.

### `result` (once, last)

```json
{
  "event": "result",
  "result": {
    "conversation_id": "…",
    "status": "SUCCESS",
    "response": "<full final text>",
    "duration_seconds": 0.99,
    "num_turns": 1,
    "usage": {
      "input_tokens": 13696,
      "output_tokens": 1,
      "thinking_tokens": 0,
      "cache_read_tokens": 0,
      "total_tokens": 13697
    }
  }
}
```

`status`: `SUCCESS` verified; `ERROR` verified (see §3b) and carries an `error` string with an empty
`response`. `usage` totals for the turn; `thinking_tokens` exists as a field but was 0 in every
captured sample (no thinking-specific event or step_type was observed at these effort levels).

**A permission denial ends the turn with no answer text** (agy 1.5.9, 2026-11-14, default
`request-review` posture). The 5-call parallel tool-card probe was run twice. Both times one call
was refused (`call_mcp_tool` → ERROR `permission check failed … user denied permission`), and both
times the run ended like this:

```json
{
  "status": "SUCCESS",
  "num_turns": 1,
  "response": "",
  "denied_actions": [{ "action": "mcp", "display_name": "McpTool" }],
  "usage": { "output_tokens": 738, "thinking_tokens": 522, "…": "…" }
}
```

That run emits no `agent_response` step after the tools and no `text_delta` anywhere. A plain
`TOOL_ERROR` such as a missing file does not do this: the sequential probe went on to stream
~1k chars of answer. So an empty assistant message after a denial is what the CLI sent, not
something the mapper dropped. Most of `output_tokens` there is `thinking_tokens`. `denied_actions` appears only when
something was denied.

## 3d. The same tool steps over `agy acp` (chat's default path)

`.env.default` sets `OPENTHROTTLE_CHAT_ACP_BACKENDS="all"`, so antigravity chat runs over `agy acp`
and the stream-json mapper above never sees it. The ACP mapper
(`acp-events.ts` in `@openthrottle/agentic-conversation-backend`) does. agy 1.5.9 on 2026-11-15, running the 4-call parallel
probe (pwd, read `package.json`, an MCP call, a read of a missing file):

- **Tool steps are standard `tool_call` / `tool_call_update` updates**, plus agy-only `name` (the
  tool, e.g. `run_command`) and `args` fields. `title` is a label (`pwd`, `File package.json`), and
  it is what the card shows as the tool name.
- **A completed shell step** carries its transcript twice: as `content[0].content.text` and as
  `rawOutput.output`, next to `rawOutput.exit_code`. **A completed read carries no output at all.**
  The card gets the transcript alone, or `null` ("No output reported.").
- **A failed step carries no reason.** A missing file is `status: "failed"` with no content and no
  `rawOutput`. The agent's answer text names the real error (`file does not exist`), but the update
  does not. The card falls back to a generic failure.
- **A refused permission** (`session/request_permission` answered `reject_once`, the no-mode
  default for a shell command) comes back `failed` with an empty content text and
  `rawOutput: { output: "" }`. The client remembers the calls it refused, and their cards say
  "Permission denied". After one refusal agy fails the rest of the parallel batch unrun and ends
  the turn `end_turn` **with no answer text**. That is the same silent turn the stream-json path
  shows for `result.denied_actions`.
- **Calls cancelled by a refusal never ran** (agy 1.5.13, `CancelCascadeInvocation`). Over ACP they
  come back `failed` with no reason; over stream-json a batched read came back `DONE` with no
  output. Once a turn has a refusal, both mappers flag such a call `notRun`
  (`CONVERSATION_TOOL_NOT_RUN_KEY`) and its card reads "not run". A call that reports an error
  text or output did run, and keeps its real state.
- **A refused step reads the same on both paths.** stream-json's ERROR text for a refusal
  (`permission check failed … user denied permission`, plus an instruction to the model) is
  replaced on the card by `CONVERSATION_TOOL_DENIED_ERROR`, the ACP path's "Permission denied: the
  tool call was refused."
- **No plugin MCP servers.** Under ACP agy exposes only the servers `session/new` hands it, not its
  own `openthrottle_openthrottle-mcp` plugin server. An MCP call the server did not inject never
  reaches a tool step. The model reports the tool as unavailable.

## 4. Driver capabilities

The headless surface is well specified: `-p` with `--output-format stream-json`, optional
`--json-schema`, non-interactive approvals via `--dangerously-skip-permissions`, id-based
conversation resume, and a `models` subcommand for discovery. It is close to Claude Code's, so the
driver's `DriverCapabilities` set `supportsModelFlag: true` with genuine model _listing_, and
`mcpAutoApprove` is worth re-evaluating given `mcp add`.

## 5. Still unverified

The event schema itself is captured against real fixtures (§3c). These remain open, none of them
blocking:

- Whether `--json-schema` alters the `result` payload shape.
- A `thinking`-specific event or step_type. `usage.thinking_tokens` exists but was 0 in every
  sample; higher `--effort` may surface one.
- The `--input-format stream-json` multi-turn input framing (`streamInputMessage` /
  `streamInputContentBlock` / `streamInputUserMessage` in the binary). Not needed for one-shot turns,
  and `--conversation <id>` resume covers multi-turn instead.
- Whether every tool's `tool_info.parameters` keys follow the PascalCase convention `view_file`
  uses (`AbsolutePath`), or whether that is per-tool.

## 5b. Quirks that only live runs expose

All three consumer paths exercised against the installed binary with an eligible account
(**Measured 2026-08-26**, agy 1.1.21).

| path                                                    | result                                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Plan-run shell (`buildShellCommand` → `runDriverAsync`) | exit 0; file created in the ENGINE's cwd, confirming `--add-dir "$PWD"` expands under `shell: true`                  |
| Chat streaming (`antigravityConversationBackend`)       | `session → text → usage`; text `"pong\n"`; usage `{input 13799, output 1, total 13800}` attributed to the init model |
| Chat resume (`--conversation <id>`)                     | same conversation id returned; recalled a fact from turn 1 with NO history in the prompt                             |
| Discovery (`discoverAgentClis`)                         | `available: true`, `version: 1.1.21`, `chatCapable: true`, **14 models** parsed                                      |

**Two argv quirks are invisible to unit tests and will bite anyone editing the spawn path** — the
standing argument for keeping a live gate in every driver change:

1. **`-p` takes the prompt as its VALUE.** `agy -p --dangerously-skip-permissions "<prompt>"` exits 2
   with `-p took "--dangerously-skip-permissions" as its prompt`. The prompt must immediately follow
   `-p`.
2. **`--add-dir` is mandatory.** Without it the CLI reports no active workspace and writes into
   `~/.gemini/antigravity-cli/scratch/<name>/` rather than the cwd — silently. A relative `.` is not
   honored.

A third: `agy models` is tab-separated, so a "bare id per line" parser returns zero models (see §3b).

### A silent start ends "interrupted" with 0 tokens (agy 1.5.9, 2026-11-15)

Conversation 54a41391 (2026-11-14, the server-spawned stream-json path) ended with a terminal
`usage` of all zeros and no tool steps. agy's own log (`~/.gemini/antigravity-cli/log/cli-*.log`)
explains it:

1. agy authenticated, created the conversation and forwarded the prompt. Then it **held the first
   model call until its workspace-plugin MCP servers connected**. `openthrottle_github` and
   `openthrottle_shadcn`, both `npx` launches, were still `connecting` at 30s, 1m, 1m30s and 2m.
   agy writes nothing to stdout while it waits.
2. At 120s the adapter's idle timer (`OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`, default 120000) sent
   SIGTERM.
3. A SIGTERMed agy still writes a terminal event:

   ```json
   {
     "status": "ERROR",
     "error": "interrupted",
     "finished_reason": "interrupted",
     "num_turns": 0,
     "response": "",
     "usage": { "input_tokens": 0, "output_tokens": 0, "total_tokens": 0 }
   }
   ```

   The adapter treated that as agy's own failure, so the turn read "interrupted" and the idle stop
   was lost. Now, when the adapter stopped agy, its own reason wins.

A thinking-heavy turn gets close to the timeout as well. The 4-call probe has spent up to 90s with
no stdout before its first tool step, because agy streams no thinking events.

### How long the silent start takes (agy 1.5.13, 2026-11-20)

`init` always arrives within ~3s, before the MCP wait. The silence is the gap from `init` to agy's
first `step_update`:

| Run                                                     | `init` → first `step_update` |
| ------------------------------------------------------- | ---------------------------- |
| Direct `agy -p`, adapter's scrubbed env, warm npm cache | 8–9s                         |
| Same, empty `npm_config_cache` (cold `npx` fetches)     | 13s                          |
| Same, with the server process's `PATH`                  | 8s                           |
| Server-spawned chat turn, machine load average ~50      | 37s and 63s                  |
| Conversation 54a41391 (2026-11-14)                      | over 120s                    |

Each slow server on its own reaches its MCP `initialize` reply in 7–15s warm and 8–12s cold. A cold
cache and the server's `PATH` therefore don't explain the long waits; host load (agy starts five MCP
servers at once) and network variance do. The `agy acp` path does not hold the first model call for
these servers at all: the ACP probe's first model call came ~1s after the prompt, while
`openthrottle_github` and `openthrottle_shadcn` were still connecting at 30s.

**The fix is a startup allowance, not a longer idle timeout.** From spawn until agy's first event
after `init`, the adapter allows `OPENTHROTTLE_ANTIGRAVITY_STARTUP_TIMEOUT_MS` (default 300000,
never below the idle timeout). It emits a keepalive every 30s (or half the idle timeout, if that is
shorter), so the chat orchestrator's 150s backstop does not fire either. Once agy is replying, the
usual 120s idle timeout applies. A startup stop says agy did not start replying and names a slow MCP
server start as the usual cause. An idle stop after that says only that agy produced no output.

Rejected: raising the idle timeout for every turn (it would also delay catching a genuinely stalled
reply); pre-warming the `npx` servers (the cold cache costs ~5s, not minutes); and skipping the
workspace plugin's servers for chat (agy has no per-run switch for them, and chat needs them).

**A denied MCP call can come back DONE.** Under the server's scrubbed env, the same probe reported
`call_mcp_tool` as `state: DONE` with no output and no error, and only `result.denied_actions`
recorded the denial. From an interactive shell it was `ERROR` with the permission message. The
card can only show what the step says, so the turn-level `denied_actions` is the reliable signal.

## 6. How to reproduce

```bash
# static probe, no auth and no install
BASE=https://antigravity-cli-auto-updater-974169037036.us-central1.run.app
curl -fsSL "$BASE/manifests/darwin_arm64.json"          # -> version, url, sha512
curl -fsSL -o agy.tar.gz "<url from manifest>"
shasum -a 512 agy.tar.gz                                 # must equal manifest sha512
tar -xzf agy.tar.gz && chmod +x antigravity
./antigravity --version && ./antigravity --help
./antigravity mcp list
strings -a antigravity | grep -oE '\.gemini(/[a-zA-Z0-9._-]+)*' | sort -u

# real install (needed for task 5's live smoke)
curl -fsSL https://antigravity.google/cli/install.sh | bash   # -> ~/.local/bin/agy

# authenticated probes (after signing in by running `agy` with no args)
agy models                                                    # tab-separated id<TAB>name
agy -p "ping" --output-format stream-json < /dev/null          # terminal result event
```
