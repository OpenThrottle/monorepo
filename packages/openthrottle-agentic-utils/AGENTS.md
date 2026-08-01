# @openthrottle/openthrottle-agentic-utils — agent notes

Leaf runtime utilities for the agentic stack, extracted incrementally from `@tools/workflows` and
`@openthrottle/node-client`: Postgres URL resolution, OT root discovery, workflow transport/config cwd,
subprocess PATH, debug-env parsing, wall-clock/child-process metrics, and local model-server
discovery.

**Consumed by:** `openthrottle-server`, `openthrottle-developer`,
`@openthrottle/openthrottle-workflows`, `@openthrottle/openthrottle-agentic-ralph`,
`@openthrottle/nestjs-model-discovery`, `@openthrottle/nestjs-worktrees`, `@tools/workflows`.

## Layout

- `src/utils/` — one file per domain (postgres, workflow, nodejs, metrics) plus
  `model-discovery/` (probe/fingerprint/dedupe of local OpenAI-compatible servers).
- `src/types/` — public type shapes (e.g. `model-discovery.ts`).
- `src/index.ts` — barrel; every public symbol re-exports from here.

## Conversation backends (streaming chat)

`src/utils/conversation-backend/` is the uniform streaming seam behind the chat
composer: a backend maps its source's native output onto `ConversationStreamChunk`
(`text` | `thinking` | `tool_call` | `tool_result` | `usage` | `session`).

- **Backends:** `openai` (HTTP endpoint) + CLI adapters **claude, cursor, opencode,
  codex, grok** (one directory each: `argv.ts` / `events.ts` / `<cli>.ts` / `index.ts`
  - `__tests__`). Each CLI's native event schema is documented in
    `docs/openthrottle/<cli>-stream-json-schema.md`.
- **Single routing registry:** `registry.ts` exports `CONVERSATION_CLI_BACKENDS`
  (driver id → `ConversationBackend`). The server derives its `CLI_BACKENDS` map
  directly from it — the ONE place a CLI backend is wired.
- **Add a streaming backend (recipe):** (1) the driver is already in
  `@openthrottle/openthrottle-drivers` (discovery derives from `ALL_DRIVERS`);
  (2) add `conversation-backend/<id>/` mirroring an existing adapter (spawn
  hardening: allowlisted binary via bin-env, scrubbed env, arg-array/no-shell,
  SIGTERM→SIGKILL teardown, idle+wall timeouts); (3) add one entry to
  `CONVERSATION_CLI_BACKENDS`; (4) flip that driver's `capabilities.chatStreaming:
true`. A guard test (`__tests__/registry.test.ts`) enforces (3) ⟺ (4); discovery,
  the composer, the resolver's accepted-backend allowlist, and server routing all
  light up from there.

## Idle timeouts (stall protection)

Every streaming path is bounded so a wedged backend can't hang a chat turn:

- **CLI backends** self-terminate via `resolveAgentTimeouts()` — idle (no output
  for `idleMs`, default `120_000`, env `OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`) +
  wall-clock (`wallClockMs`, default `900_000`) with a SIGTERM→SIGKILL teardown.
- **HTTP/openai backend** (`chat-completions/stream.ts`) applies the same
  `resolveAgentTimeouts().idleMs` as a per-part idle timeout: it composes an
  internal `AbortController` with the caller signal (`AbortSignal.any`), resets on
  each streamed part, and on stall aborts the SDK request and throws a clear
  "endpoint stalled" error.
- **Server orchestrator backstop:** `resolveChatIdleTimeoutMs()` (env
  `OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS`; default = `resolveAgentTimeouts().idleMs` +
  `30_000` margin = **`150_000`**) is consumed by
  `ConversationStreamService.runStream()` to terminate ANY backend — idle-only, no
  orchestrator wall-clock. The margin keeps it above the CLI/HTTP idle so a
  backend's own cleaner terminal wins first; it fires only for a truly stalled
  turn (or the HTTP backend ignoring its signal). On expiry it publishes a
  terminal chunk marked retryable so the client can auto-retry. Full contract:
  `docs/reliability/chat-idle-timeout-retry.md`.

## Invariants & gotchas

- No Nx `build` target (`__build`/`__build-package` placeholders — see [../AGENTS.md](../AGENTS.md)),
  but top-level `exports` still map to `dist/` because `openthrottle-server` consumes it at
  runtime. Keep the dist-shaped `exports` intact when moving files.
- Utilities stay **pure**: `model-discovery` never reads `process.env` — callers pass an env-like
  object to `resolveHosts`/`resolvePorts`. Keep new utilities free of framework/transport deps.
- Public API names may be generalized, but **env var names are frozen** for compatibility
  (`POSTGRES_URL`, `WORKFLOW_RALPH_OT_ROOT`, `OPENTHROTTLE_POSTGRES_URL`, …).

## Don't

- Not a home for CLI bins, OpenThrottle GraphQL/Postgres CRUD, job-run-hook runners, or doc-ingestion —
  those stay in `@tools/workflows` until their own migration phase.
- The cached NestJS wrapper over model discovery is `@openthrottle/nestjs-model-discovery`; don't
  add ConfigService/caching here.

## Pointers

- [README.md](./README.md) — module layout table, model-discovery host/port resolution details.
