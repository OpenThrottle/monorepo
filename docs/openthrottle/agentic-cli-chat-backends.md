# Agentic CLI chat backends

> Plan-Id: a3363c74-09f5-4403-bca2-efc16ab424ed
>
> The developer-app chat can stream from a locally-installed **agentic CLI**
> (`cursor-agent`, `claude`, or `opencode`) as well as from local
> OpenAI-compatible model servers. This is the user + operator guide. The
> playbook for vetting a new CLI is
> [agentic-cli-backend-compatibility-guide.md](./agentic-cli-backend-compatibility-guide.md).

## How it works

A backend is just an async iterable of chunks. The chat already streamed model
tokens over PubSub → `conversationStreamChunkAdded` → the client. A CLI agent is
the same shape, sourced from a subprocess's NDJSON stdout instead of HTTP/SSE,
so everything downstream is unchanged. The seam:

```
startConversationStream(input)            // input.backend selects the source
  → ConversationStreamService.runStream   // picks the ConversationBackend
    → openAiConversationBackend            // HTTP, OpenAI-compatible
      | cursorAgentConversationBackend     // spawns cursor-agent, parses NDJSON
      | claudeConversationBackend          // spawns claude, parses stream-json
      | opencodeConversationBackend        // spawns opencode run --format json
        → ConversationStreamChunk { delta, done, error, kind, metadata? }
          → publish → conversationStreamChunkAdded subscription → UI
```

`kind` ∈ `text | thinking | tool_call | tool_result | usage | session`. Only
`text` accumulates into the persisted/rendered assistant message; the rest
stream for liveness (richer inline rendering of tool/thinking is a follow-up).

## Using it

1. Register a local checkout in **Settings → Workspace repositories** (a
   `WorkspaceLocalRepository`: an absolute `filesystemPath` on the server host).
2. In the home composer's model dropdown, pick an agent CLI (**Cursor Agent**,
   **Claude Code**, or **OpenCode**) — each appears next to local models when its
   binary is detected on the server host.
3. A **repository selector** appears; choose the checkout the agent runs in.
4. (Optional) pick a **persona** — it becomes the agent's system prompt.
5. Send. The agent streams back; **Stop** cancels and kills the process.

**What you should see on send:** a **Working…** indicator on the assistant
placeholder (and a **Stop** button) from submit until the terminal chunk — even
when `cursor-agent` buffers the whole turn and emits NDJSON in one end-of-turn
burst (~several seconds). An empty "(No content)" bubble with Send re-enabled
mid-turn means the pending-state wiring regressed.

**Repository / cwd:** production always needs a registered repository. In
development, if none is registered, set `OPENTHROTTLE_AGENT_DEV_CWD` to an
absolute checkout path on the server host (ignored in production); the composer
otherwise points you at Settings.

**Subscription race:** the home route only learns the conversation id after
`startConversationStream` returns, so the client subscribes after the server
may already be publishing. `ConversationStreamService` keeps a per-conversation
replay buffer and replays on subscribe; the client dedupes by
`messageId:sortOrder`.

**Persona prompts:** skill-style personas often start with YAML frontmatter
(`---`). Every CLI adapter passes `--` before the prompt so that frontmatter is
not parsed as a CLI option (which previously produced an immediate empty turn).
cursor and opencode inject the persona as a prompt prefix; **claude** uses its
first-class `--append-system-prompt` flag instead (nothing is written into the
checkout).

One OT conversation maps to one CLI session — multi-turn context is owned by the
CLI, so we send only the latest user message, never replayed history. Each
backend acquires its session id differently, persisted in
`conversation.metadata.<backend>SessionId`:

- **cursor** — pre-minted via `cursor-agent create-chat`, then resumed each turn.
  The **only** backend with an out-of-band mint; see [cursor cold start](#cursor-agent-cold-start) for why that matters.
- **claude** — a UUID **we** mint up front; created with `--session-id` on the
  first turn, resumed with `--resume` after (`resumeSession` flag on the run).
- **opencode** — **minted by opencode itself** on the first `run` (no create
  command); the adapter surfaces the id in its `kind:'session'` chunk and
  `ConversationStreamService` persists it, so later turns resume via `-s`.

## cursor-agent cold start

cursor is the only backend that mints its session id out of band — a separate
`cursor-agent create-chat` spawn before the streaming turn. That extra spawn is
where "the first chat of a session fails, but works after using another agent"
was assumed to originate. It is not. What `create-chat` actually does, verified
against the 2026.08.11 binary:

- **Entirely local.** `handleCreateChat` calls `crypto.randomUUID()` and opens a
  SQLite `store.db` under `<configDir>/chats/<md5(cwd)>/<uuid>/`. No network, no
  auth, no credential file written.
- **Fast and concurrency-safe.** 2.0–2.6 s warm _and_ cold; four simultaneous
  mints return four distinct UUIDs with no contention. That is ~12x headroom
  against the 30 s `OPENTHROTTLE_AGENT_SESSION_TIMEOUT_MS` budget.
- **Clean stdout.** The id is the only thing written to stdout; cursor's
  `console-io` sends every other message to stderr.

The problem is that **the process does not exit when it is done.** On a cold run
cursor's startup does blocking network work — statsig init, MCP server init and
OAuth discovery, plus any configured plugin hooks — and that keeps the process
alive long after it has printed what we needed:

```
startup.metrics total_ms=4600  mcp_and_model_init_ms=1246  server_config_ms=689
                auth_ms=33  auth_refresh_ms=-1
```

Auth is 33 ms. MCP init is 1.2 s and network-bound. In a reproduced cold run
(with `~/.cursor/statsig-cache.json` moved aside) a turn reported
`outcome=success duration_ms=15150` and the process had **still not exited four
minutes later**; the same sequence warm takes 3 s from result to close.

### The root cause of the first-chat failures

`createCursorAgentSession()` used to await the child's `close` event. Cold, that
never arrived inside the 30 s budget — so the mint timed out and **discarded an
id it already had**:

```
cursor-agent create-chat timed out after 30000ms elapsedMs=30019
  stdout="b17be556-b994-41ba-8a93-a09ce8ab8e08\n" stderr=<empty>
```

That is the whole bug. Warm, the process exits promptly and the mint succeeds —
which is exactly what "use another agent, then switch back" buys you: elapsed
time and a warmed cursor, not anything about the other agent.

**The mint now settles on the first of: a parseable id on stdout, process exit,
or the timeout.** Stopping at the id is safe — cursor writes `agentId` to its
store _before_ printing it, and `--resume` works even for an id whose store row
never existed. Teardown sends SIGTERM first so cursor still finishes its own
`dispose()`.

Cold end-to-end, measured through the built adapter:

|                  | before                            | after                                     |
| ---------------- | --------------------------------- | ----------------------------------------- |
| mint             | **failed**, timed out at 30019 ms | **392 ms**                                |
| turn             | never reached                     | first chunk 3.7 s, total 10.6 s, no error |
| leaked processes | 1 `worker-server`                 | none                                      |

If you write another adapter with an out-of-band session mint: **bound it on the
output you need, not on process exit.** A CLI that prints its answer and then
lingers is normal, not pathological.

### Failure modes now handled

| What                     | How                                                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A polluted session id    | `parseCursorChatId` validates the minted id (UUID first, conservative token fallback) instead of trusting `stdout.trim()`. Critical because **`--resume` accepts any string** — an unvalidated id does not error, it silently starts a _disconnected_ chat and loses the conversation's history. |
| A mint that never exits  | The mint resolves on the parsed id rather than on `close`, so a lingering cold process no longer costs a 30 s timeout and a discarded id. **This is the fix for the reported bug.**                                                                                                              |
| A transient mint failure | Bounded retry: 2 attempts, 500 ms apart, retryable failures only. Auth and missing-binary are never retried.                                                                                                                                                                                     |
| Leaked grandchildren     | cursor spawns a `worker-server` that inherits our stdout pipe, reparents to init, and outlives the run. Both cursor spawns are `detached: true` and swept by process group — including when the child exited cleanly on its own, which is the case that actually leaks.                          |
| Unactionable errors      | Failures are classified (`authRequired`, `notInstalled`, `timeout`, `unknown`) and rendered as copy with a concrete next step, ANSI-stripped, with the raw message kept as a `Details:` line.                                                                                                    |
| Undiagnosable mints      | Every mint logs start / ok / failed with `conversationId`, `cwd`, `elapsedMs`, `attempt`, and `kind`; failures carry the full (redacted, 2 KB-bounded, escape-preserving) stdout and stderr.                                                                                                     |

### Not implemented, deliberately

- **A single-flight mint guard.** There is no race: `create-chat` is local and
  concurrency-clean (measured).
- **Re-mint on a "chat not found" resume failure.** cursor never emits one.
  `--resume` with a never-minted UUID, and with the literal string
  `Update available!  1.2.3`, both exit 0 with a successful turn. Validating the
  id at the mint is the correct fix; there is no resume-side signal to detect.
- **A warm-up probe.** The cold cost is MCP init and OAuth discovery, which a
  non-mutating `--version`/`status` probe does not warm.

### Troubleshooting: first cursor chat fails, then works after using another agent

1. **Confirm from the server log.** Look for
   `conversation-stream cursor mint start|ok|failed conversationId=… elapsedMs=… attempt=N/2 kind=…`.
   - `mint failed` with `kind=timeout` **and an id visible in the attached
     `stdout=`** → you are running a build from before the mint stopped waiting
     on process exit. That is the original bug; update.
   - `mint ok` with a small `elapsedMs`, but the turn still failed → the mint is
     fine; the problem is in the streaming spawn (cold MCP/OAuth startup). Check
     cursor's own log under `$TMPDIR/cursor-agent-logs-<uid>/` for
     `mcp_oauth_state_transition` and `startup.metrics`.
   - `mint failed` with `kind=authRequired` → the host login expired. Run
     `cursor-agent login` in a terminal as the user the server runs as.
   - `kind=notInstalled` → `cursor-agent` is not on the server's `PATH`; set
     `OPENTHROTTLE_CURSOR_AGENT_BIN` to its absolute path.
   - `kind=timeout` with `elapsedMs` near 30000 → raise
     `OPENTHROTTLE_AGENT_SESSION_TIMEOUT_MS`.
2. **If cursor works in your terminal but not from the server**, the two are
   probably not reading the same config. cursor's config dir is
   `$XDG_CONFIG_HOME/cursor` when that var is set, else `~/.cursor`, and its
   credential store is selected by `AGENT_CLI_CREDENTIAL_STORE`
   (`default` = macOS login keychain, `file`, `memory`). Both now pass through to
   the child, along with `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` and all `CURSOR_*`
   vars — but only if they are set in the **server process's** environment.
3. **A locked or denying macOS keychain** surfaces as `kind=authRequired` with
   cursor's `errSecInteractionNotAllowed` (osStatus 36) wording. Unlock the login
   keychain, or set `AGENT_CLI_CREDENTIAL_STORE=file`.

## Security model

Spawning a binary from an authenticated web request is the highest-risk surface.
The gate (see `conversation-stream.resolver.ts` + the cursor-agent adapter):

- **Allowlist only.** `AGENT_CLI_ALLOWLIST` is **derived from the
  `@openthrottle/openthrottle-drivers` registry** (`ALL_DRIVERS`), so it can't
  drift from the driver set — discovery probes **every** driver (today `claude`,
  `codex`, `cursor`, `grok`, `opencode`). The chat resolver, however, accepts
  `openai` plus only the **chat-capable** drivers (those with a
  `ConversationBackend` adapter — `capabilities.chatStreaming`: `cursor`,
  `claude`, `opencode`) and rejects the plan-run-only drivers (`codex`, `grok`),
  which are discoverable but have no streaming adapter yet. Each adapter spawns
  only its own registry binary; the safety invariant (only registry binaries are
  ever spawned) is now guaranteed by construction.
- **No shell.** `child_process.spawn` with an **argument array** — the prompt is
  always one array element (after a `--` terminator). Shell metacharacters cannot
  escape (tested).
- **Scoped cwd.** Production requires a `repositoryId` resolving to an **owned**
  `WorkspaceLocalRepository.filesystemPath`. A raw dev directory is allowed
  **only** when `NODE_ENV !== 'production'` via `OPENTHROTTLE_AGENT_DEV_CWD`, and
  is **hard-disabled in production**.
- **Scrubbed env.** The child inherits a per-adapter allowlist (`PATH`, `HOME`,
  `TERM`, locale, plus the adapter's own credential var — `CURSOR_API_KEY` for
  cursor, `ANTHROPIC_API_KEY` for claude; opencode reads its credentials from a
  file under `HOME`) — never the server's full env (DB/JWT/Redis secrets). Each
  CLI authenticates via the host's own login.
- **Bounded + torn down.** Idle timeout + wall-clock cap (env-overridable), and
  a guaranteed `SIGTERM → SIGKILL` teardown on cancel/timeout/disconnect (no
  zombies). Cancel flows through the existing per-conversation AbortController.
- **Authenticated humans only** (existing JWT guard; no service accounts).

### Tuning (env)

| Var                                       | Meaning                                                        | Default            |
| ----------------------------------------- | -------------------------------------------------------------- | ------------------ |
| `OPENTHROTTLE_AGENT_DEV_CWD`              | Dev-only cwd when no repository is selected (ignored in prod)  | unset              |
| `OPENTHROTTLE_CURSOR_AGENT_BIN`           | Absolute path to `cursor-agent` (else PATH)                    | `cursor-agent`     |
| `OPENTHROTTLE_CLAUDE_BIN`                 | Absolute path to `claude` (else PATH)                          | `claude`           |
| `OPENTHROTTLE_CODEX_BIN`                  | Absolute path to `codex` (else PATH); discovery/plan-run only  | `codex`            |
| `OPENTHROTTLE_GROK_BIN`                   | Absolute path to `grok` (else PATH); discovery/plan-run only   | `grok`             |
| `OPENTHROTTLE_OPENCODE_BIN`               | Absolute path to `opencode` (else PATH)                        | `opencode`         |
| `OPENTHROTTLE_CLAUDE_CONFIG_DIR`          | Dedicated plugin-free `CLAUDE_CONFIG_DIR` for headless claude  | unset (uses HOME)  |
| `OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`      | Per-agent idle: kill the child after this much stdout silence  | 120000             |
| `OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS`       | Server chat backstop: abort a turn with no chunk for this long | agent idle + 30000 |
| `OPENTHROTTLE_AGENT_WALLCLOCK_TIMEOUT_MS` | Hard run cap                                                   | 900000             |
| `OPENTHROTTLE_AGENT_KILL_GRACE_MS`        | SIGTERM→SIGKILL grace                                          | 5000               |
| `OPENTHROTTLE_AGENT_SESSION_TIMEOUT_MS`   | Bound `cursor-agent create-chat` (kill child on timeout)       | 30000              |

The cursor child additionally **inherits** these from the server process when
set, because cursor provably reads them — dropping one silently diverges the
child from the user's own terminal:

| Var                                   | Why it matters                                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `XDG_CONFIG_HOME`                     | Selects cursor's config dir (`$XDG_CONFIG_HOME/cursor`, else `~/.cursor`) — and thus its chat store                                                            |
| `AGENT_CLI_CREDENTIAL_STORE`          | `default` (macOS login keychain) / `file` / `memory`                                                                                                           |
| `HTTP_PROXY` `HTTPS_PROXY` `NO_PROXY` | Without these cursor has no route to the network behind a corporate proxy                                                                                      |
| `SHELL`                               | cursor shells out for tool calls                                                                                                                               |
| `XDG_CACHE_HOME`                      | Sites `NODE_COMPILE_CACHE` in cursor's launcher on non-darwin                                                                                                  |
| `CURSOR_*`                            | Passed through **by prefix** (`CURSOR_API_KEY`, `CURSOR_AUTH_TOKEN`, `CURSOR_DATA_DIR`, …), so a knob added in a future cursor release needs no allowlist edit |

`NO_COLOR=1` is **forced** on the child (the host cannot override it) to suppress
decorated output at the source. `CI` is deliberately **not** set: it reads as an
output knob but also feeds cursor's credential-store selection.
`NODE_TLS_REJECT_UNAUTHORIZED` is read by cursor but stays omitted — passing it
through would let the host weaken TLS verification for the child.

Two idle timers guard every chat turn and must measure the **same** signal:
the per-agent idle (`OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`, resets on any child
stdout byte) and the server backstop (`OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS`,
resolved by `resolveChatIdleTimeoutMs` = agent idle + a 30s margin unless the
chat knob is set to a positive integer, which overrides it wholesale). Backends
now emit a keepalive per stdout read that maps to no chunk, so the backstop
already tracks the child's stdout timer — the reported "response timed out after
150s with no activity" on live-but-quiet turns (slow first token, rate limits,
plugin startup hooks) is fixed at the source.

These knobs are a **headroom stopgap, not the fix**. If a deployment still needs
more slack (e.g. consistently slow first tokens behind a proxy), raise both in
lockstep — e.g. `OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS=300000` with
`OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS=330000` (or leave the chat knob unset to let
the +30s margin derive it). Keep the backstop **≥** the agent idle so the CLI's
own cleaner self-terminated terminal chunk fires first.

### Isolating headless claude from user plugins

By default the `claude` child inherits the host `HOME`, so every headless chat
turn re-runs the host user's enabled **plugin SessionStart hooks** and injects
their `CLAUDE.md` before the model answers — pure per-turn overhead, and a source
of the null-mapped `system/hook_*` events. (MCP is already isolated: managed
servers are injected inline with `--strict-mcp-config`, so the project `.mcp.json`
and `~/.claude.json` never load.)

Set `OPENTHROTTLE_CLAUDE_CONFIG_DIR` to a dedicated, server-owned config
directory to skip plugin startup entirely — it is forwarded as `CLAUDE_CONFIG_DIR`
to the child (overriding any inherited value). Requirements:

- **Auth must live there.** Copy `.credentials.json` from the real config dir, or
  set `ANTHROPIC_API_KEY` (already allowlisted). Otherwise subscription auth
  breaks — which is why this is **opt-in and unset by default**.
- **No plugins/hooks.** Leave out `plugins/` and any `settings.json`
  `SessionStart` hooks — that is the whole point.
- **Stable across turns.** claude writes the session transcript here under
  `--session-id` on turn one and reads it back under `--resume`; a per-turn or
  ephemeral dir would break multi-turn resume.

## Adding a new CLI

Discovery is **registry-driven**: `AGENT_CLI_ALLOWLIST` projects `ALL_DRIVERS`
from `@openthrottle/openthrottle-drivers`, so a driver becomes discoverable the
moment it is registered — there is no separate discovery list to edit. `claude`,
`cursor`, and `opencode` are wired as chat backends today; `codex` and `grok`
are registered drivers that are discoverable (and usable for plan runs) but not
yet chat-capable. To make a driver chat-capable:

1. Run the [compatibility guide](./agentic-cli-backend-compatibility-guide.md)
   against the binary; commit a `<cli>-stream-json-schema.md`.
2. Register the driver in `@openthrottle/openthrottle-drivers` (`binary`,
   `binEnv`, `versionArgs`, a `discoverModels` descriptor, and set
   `capabilities.chatStreaming: true`). Discovery picks it up automatically.
3. Implement a `ConversationBackend` adapter (its own argv builder, NDJSON/SSE
   parser, event→`kind` mapping, session acquisition, system-prompt injection) —
   mirror `cursor-agent/` (flat top-level events), `claude/` (nested
   `stream_event` envelope + first-class system prompt), or `opencode/` (stateful
   per-part snapshot; terminal on process exit). The seam, chunk shape, timeouts,
   and teardown are shared; only parsing + invocation differ per CLI.
4. Wire the adapter into `ConversationStreamService` and (if it acquires its
   session differently) a branch in the resolver's `resolveCliSession`. The
   resolver's `CLI_BACKENDS` gate is derived from the `chatCapable` allowlist
   entries, so setting `chatStreaming: true` in step 2 admits it automatically.
   The composer already handles any chat-capable discovered backend generically
   (no client change unless a new capability surface is needed).

## Test coverage

Unit + integration tests (no live CLI, no network) cover the path:

- **Adapter** (`cursor-agent/`, `claude/`, `opencode/` `__tests__`): NDJSON line
  buffering across partial chunks; event→chunk mapping for every event type
  (fixtures from each spike, incl. claude's `assistant`-echo double-count skip
  and opencode's per-part snapshot suffix dedup); spawn → parse → terminal via a
  fake binary; **start→stream→done**, the **stderr/non-zero-exit error** path,
  **idle-timeout kill**, **cancel kill**, and **env scrubbing** (a secret does
  not reach the child).
- **Discovery**: available/missing/non-zero-exit probes for every registry
  driver (claude, codex, cursor, grok, opencode), plus per-driver model-listing
  parse + failure→`[]` paths and the `chatCapable` projection.
- **Resolver**: backend routing, per-backend session acquisition (cursor mint,
  claude UUID create→resume, opencode mint-on-first-run + resume-from-metadata),
  cwd resolution, repository-not-found, and **unsupported-backend rejection**
  (allowlist).
- **Service**: adapter selection from `CLI_BACKENDS`, `resumeSession` threading,
  opencode session-id persistence from the `session` chunk, text-only
  accumulation, terminal/error chunks, cancel aborts in-flight.
- **Client**: tagged-union decode (any bare backend id), text-only reducer
  accumulation.

A true live E2E (real CLI, multi-turn resume turn-2-recall, against a production
build) is gated on a logged-in host and is **deferred** — it can't run unattended
in CI (network + per-CLI auth). Run it manually per
[E2E targets a production build](../../README.md): start the dev server in a
checkout where the CLI is logged in (`cursor-agent status`, `claude` host login,
or `opencode auth`), select the agent + a repository, and verify a turn streams
and a second turn recalls the first. During plan `263b1ed7` the raw CLIs were
live-vetted end-to-end at the CLI layer for all three (turn 1 + cross-process
`--resume`/`-s` recall) — see the `*-stream-json-schema.md` §11 reproduce steps.
