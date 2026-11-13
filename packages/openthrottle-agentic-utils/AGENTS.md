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
- **ACP path (`acp/`, behind `OPENTHROTTLE_CHAT_ACP_BACKENDS`):** cursor and
  antigravity can run chat as one long-lived ACP agent per conversation instead
  of a CLI per turn. Per-agent launch facts and the permission-posture → session
  mode shim live in `acp/agent-specs.ts`, never in `acp.ts`. Two things a turn
  loses there, both probed against the real CLIs (plan 60dfd266): cursor applies
  file edits without asking in every mode (`editApprovals: false`), and
  `cursor-agent acp` runs **no** `.cursor/hooks.json` hooks — the same fixture
  fires sessionStart/preToolUse/afterFileEdit/… under `cursor-agent -p` — so
  chat-over-ACP on cursor carries no OT hook telemetry (skill-usage capture,
  bash-guard, format-on-edit).

## Plan-run transcripts (structured output → ATIF)

Plan runs reuse the conversation backends' per-CLI mappers to read each agent's structured stream.
Design: `docs/openthrottle/eval-system-adr.md` § Decision 4.

- **`src/utils/structured-output/`:**
  - `withStructuredOutput(driver)` switches a plan-run driver to structured stdout and installs the
    matching `parseOutput` and `renderOutputLine`. Call it once per run, because the renderer is
    stateful.
  - `readStructuredOutput(driverId, raw)` returns every chunk of a finished run.
- **The plan-run reader is not the chat reader.** Plan runs never ask for partial messages, so for
  claude and cursor the reader also adds back the consolidated `assistant` text the chat mappers
  skip. Never add `--include-partial-messages` or `--stream-partial-output` to a plan-run driver: the
  text would be counted twice.
- **`src/utils/trajectory/`:**
  - `chunksToAtif` builds the ATIF v1.8 document, with the types in `src/types/atif.ts`.
  - `tool-metadata.ts` is the single table of where each CLI keeps tool arguments and results.
  - `normalizeUsage.ts` handles token accounting. Claude, cursor and opencode report cache tokens
    alongside the input count; codex reports them as part of it.
- **Fixtures:** `structured-output/__tests__/fixtures/` holds sanitized real recordings, with
  `*.synthetic.ndjson` marking the ones built by hand. Re-record with each CLI's plan-run command
  plus its structured flag.

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

- Not a home for CLI bins, OpenThrottle GraphQL/Postgres CRUD, or job-run-hook runners — those stay in `@tools/workflows` until their own migration phase.
- The cached NestJS wrapper over model discovery is `@openthrottle/nestjs-model-discovery`; don't
  add ConfigService/caching here.

## Pointers

- [README.md](./README.md) — module layout table, model-discovery host/port resolution details.
