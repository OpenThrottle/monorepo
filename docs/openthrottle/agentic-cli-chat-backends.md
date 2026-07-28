# Agentic CLI chat backends

> Plan-Id: a3363c74-09f5-4403-bca2-efc16ab424ed
>
> The developer-app chat can stream from a locally-installed **agentic CLI**
> (`cursor-agent`, `claude`, or `opencode`) as well as from local
> OpenAI-compatible model servers. This is the user + operator guide; the design
> rationale and v1 limitations are in
> [agentic-cli-backend-adr.md](./agentic-cli-backend-adr.md). The empirical CLI
> schemas live in
> [cursor-agent-stream-json-schema.md](./cursor-agent-stream-json-schema.md),
> [claude-stream-json-schema.md](./claude-stream-json-schema.md), and
> [opencode-stream-json-schema.md](./opencode-stream-json-schema.md); the
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
`messageId:sortOrder`. Details:
[cursor-agent-stream-json-schema.md §8](./cursor-agent-stream-json-schema.md).

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
- **claude** — a UUID **we** mint up front; created with `--session-id` on the
  first turn, resumed with `--resume` after (`resumeSession` flag on the run).
- **opencode** — **minted by opencode itself** on the first `run` (no create
  command); the adapter surfaces the id in its `kind:'session'` chunk and
  `ConversationStreamService` persists it, so later turns resume via `-s`.

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

| Var                                       | Meaning                                                       | Default        |
| ----------------------------------------- | ------------------------------------------------------------- | -------------- |
| `OPENTHROTTLE_AGENT_DEV_CWD`              | Dev-only cwd when no repository is selected (ignored in prod) | unset          |
| `OPENTHROTTLE_CURSOR_AGENT_BIN`           | Absolute path to `cursor-agent` (else PATH)                   | `cursor-agent` |
| `OPENTHROTTLE_CLAUDE_BIN`                 | Absolute path to `claude` (else PATH)                         | `claude`       |
| `OPENTHROTTLE_CODEX_BIN`                  | Absolute path to `codex` (else PATH); discovery/plan-run only | `codex`        |
| `OPENTHROTTLE_GROK_BIN`                   | Absolute path to `grok` (else PATH); discovery/plan-run only  | `grok`         |
| `OPENTHROTTLE_OPENCODE_BIN`               | Absolute path to `opencode` (else PATH)                       | `opencode`     |
| `OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`      | Kill after this much silence                                  | 120000         |
| `OPENTHROTTLE_AGENT_WALLCLOCK_TIMEOUT_MS` | Hard run cap                                                  | 900000         |
| `OPENTHROTTLE_AGENT_KILL_GRACE_MS`        | SIGTERM→SIGKILL grace                                         | 5000           |
| `OPENTHROTTLE_AGENT_SESSION_TIMEOUT_MS`   | Bound `cursor-agent create-chat` (kill child on timeout)      | 30000          |

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
