# Agentic CLI chat backends

> Plan-Id: a3363c74-09f5-4403-bca2-efc16ab424ed
>
> The developer-app chat can stream from a locally-installed **agentic CLI**
> (e.g. `cursor-agent`) as well as from local OpenAI-compatible model servers.
> This is the user + operator guide; the design rationale and v1 limitations are
> in [agentic-cli-backend-adr.md](./agentic-cli-backend-adr.md). The empirical
> CLI schemas live in [cursor-agent-stream-json-schema.md](./cursor-agent-stream-json-schema.md)
> and [claude-stream-json-schema.md](./claude-stream-json-schema.md); the
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
        → ConversationStreamChunk { delta, done, error, kind, metadata? }
          → publish → conversationStreamChunkAdded subscription → UI
```

`kind` ∈ `text | thinking | tool_call | tool_result | usage | session`. Only
`text` accumulates into the persisted/rendered assistant message; the rest
stream for liveness (richer inline rendering of tool/thinking is a follow-up).

## Using it

1. Register a local checkout in **Settings → Workspace repositories** (a
   `WorkspaceLocalRepository`: an absolute `filesystemPath` on the server host).
2. In the home composer's model dropdown, pick an agent CLI (e.g. **Cursor
   Agent**) — it appears next to local models when the binary is detected.
3. A **repository selector** appears; choose the checkout the agent runs in.
4. (Optional) pick a **persona** — it becomes the agent's system prompt.
5. Send. The agent streams back; **Stop** cancels and kills the process.

One OT conversation maps to one cursor chat session (minted via
`cursor-agent create-chat`, persisted in `conversation.metadata.cursorSessionId`
and resumed each turn) — so multi-turn context is owned by the CLI; we send only
the latest user message, never replayed history.

## Security model

Spawning a binary from an authenticated web request is the highest-risk surface.
The gate (see `conversation-stream.resolver.ts` + the cursor-agent adapter):

- **Allowlist only.** The resolver routes `openai | cursor` and rejects anything
  else; the adapter spawns only `cursor-agent`. The discovery allowlist
  (`AGENT_CLI_ALLOWLIST`) gates what's even surfaced.
- **No shell.** `child_process.spawn` with an **argument array** — the prompt is
  always one array element. Shell metacharacters cannot escape (tested).
- **Scoped cwd.** Production requires a `repositoryId` resolving to an **owned**
  `WorkspaceLocalRepository.filesystemPath`. A raw dev directory is allowed
  **only** when `NODE_ENV !== 'production'` via `OPENTHROTTLE_AGENT_DEV_CWD`, and
  is **hard-disabled in production**.
- **Scrubbed env.** The child inherits an allowlist (`PATH`, `HOME`, `TERM`,
  locale, `CURSOR_API_KEY`) — never the server's full env (DB/JWT/Redis secrets).
  It authenticates via the host's own cursor login.
- **Bounded + torn down.** Idle timeout + wall-clock cap (env-overridable), and
  a guaranteed `SIGTERM → SIGKILL` teardown on cancel/timeout/disconnect (no
  zombies). Cancel flows through the existing per-conversation AbortController.
- **Authenticated humans only** (existing JWT guard; no service accounts).

### Tuning (env)

| Var                                       | Meaning                                                       | Default        |
| ----------------------------------------- | ------------------------------------------------------------- | -------------- |
| `OPENTHROTTLE_AGENT_DEV_CWD`              | Dev-only cwd when no repository is selected (ignored in prod) | unset          |
| `OPENTHROTTLE_CURSOR_AGENT_BIN`           | Absolute path to `cursor-agent` (else PATH)                   | `cursor-agent` |
| `OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`      | Kill after this much silence                                  | 120000         |
| `OPENTHROTTLE_AGENT_WALLCLOCK_TIMEOUT_MS` | Hard run cap                                                  | 900000         |
| `OPENTHROTTLE_AGENT_KILL_GRACE_MS`        | SIGTERM→SIGKILL grace                                         | 5000           |

## Adding a new CLI to the allowlist

The work is mechanical once the CLI is vetted with the compatibility guide:

1. Run the [compatibility guide](./agentic-cli-backend-compatibility-guide.md)
   against the binary; commit a `<cli>-stream-json-schema.md`. (claude is
   already documented as compatible.)
2. Add an entry to `AGENT_CLI_ALLOWLIST` (`packages/openthrottle-agentic-utils/.../agent-discovery.ts`).
3. Implement a `ConversationBackend` adapter (its own argv builder, NDJSON/SSE
   parser, event→`kind` mapping, session acquisition, system-prompt injection) —
   mirror `cursor-agent/`. The seam, chunk shape, timeouts, and teardown are
   shared; only parsing + invocation differ per CLI.
4. Route the new backend id in `ConversationStreamService` + the resolver, and
   add it to the client's tagged-union decode.

## Test coverage

Unit + integration tests (no live cursor, no network) cover the path:

- **Adapter** (`cursor-agent/__tests__`): NDJSON line buffering across partial
  chunks; event→chunk mapping for every event type (fixtures from the spike);
  spawn → parse → terminal via a fake binary; **start→stream→done**, the
  **stderr/non-zero-exit error** path, **idle-timeout kill**, **cancel kill**,
  and **env scrubbing** (a secret does not reach the child).
- **Discovery**: available/missing/non-zero-exit probes.
- **Resolver**: backend routing, **cursor cwd resolution + session mint**,
  repository-not-found, and **unsupported-backend rejection** (allowlist).
- **Service**: backend selection, text-only accumulation, terminal/error chunks,
  cancel aborts in-flight.
- **Client**: tagged-union decode, text-only reducer accumulation.

A true live E2E (real `cursor-agent`, multi-turn resume turn-2-recall, against a
production build) is gated on a logged-in host and is **deferred** — it can't run
unattended in CI (network + Cursor auth). Run it manually per
[E2E targets a production build](../../README.md): start the dev server in a
checkout where `cursor-agent status` is logged in, select the agent + a
repository, and verify a turn streams and a second turn recalls the first.
