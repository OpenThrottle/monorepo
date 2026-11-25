# @openthrottle/openthrottle-agentic-utils — agent notes

Leaf runtime utilities for the agentic stack, extracted incrementally from `@openthrottle/node-client` and the earlier
workflow tooling: Postgres URL resolution, OT root discovery, workflow transport/config cwd,
subprocess PATH, debug-env parsing, wall-clock/child-process metrics, and local model-server
discovery.

**Consumed by:** `openthrottle-server`, `openthrottle-developer`,
`@openthrottle/openthrottle-agentic-loop`, `@openthrottle/nestjs-model-discovery`,
`@openthrottle/nestjs-worktrees`.

## Layout

- `src/utils/` — one file per domain (postgres, workflow, nodejs, metrics) plus flat `model-discovery-*.ts` files (probe/fingerprint/dedupe of local OpenAI-compatible servers).
- `src/types/` — public type shapes (e.g. `model-discovery.ts`).
- `src/index.ts` — barrel; every public symbol re-exports from here.

## Conversation backends (streaming chat)

The uniform streaming seam behind the chat composer (backends, CLI adapters, ACP path, registry,
`chat-completions`) was split out into [`@openthrottle/agentic-conversation-backend`](../agentic-conversation-backend/AGENTS.md).
This package no longer re-exports it; import from that package.

## Plan-run transcripts (structured output → ATIF)

Plan runs reuse the conversation backends' per-CLI mappers (from `@openthrottle/agentic-conversation-backend`) to read each agent's structured stream.
Design: `docs/openthrottle/eval-system-adr.md` § Decision 4.

- **`src/utils/structured-output-chunk-reader.ts` and `withStructuredOutput.ts`:**
  - `withStructuredOutput(driver)` switches a plan-run driver to structured stdout and installs the
    matching `parseOutput` and `renderOutputLine`. Call it once per run, because the renderer is
    stateful.
  - `readStructuredOutput(driverId, raw)` returns every chunk of a finished run.
- **The plan-run reader is not the chat reader.** Plan runs never ask for partial messages, so for
  claude and cursor the reader also adds back the consolidated `assistant` text the chat mappers
  skip. Never add `--include-partial-messages` or `--stream-partial-output` to a plan-run driver: the
  text would be counted twice.
- **`src/utils/trajectory-*.ts`:**
  - `chunksToAtif` builds the ATIF v1.8 document, with the types in `src/types/atif.ts`.
  - `trajectory-tool-metadata.ts` is the single table of where each CLI keeps tool arguments and results.
  - `normalizeUsage.ts` handles token accounting. Claude, cursor and opencode report cache tokens
    alongside the input count; codex reports them as part of it.
- **Fixtures:** `src/utils/__tests__/fixtures/` holds sanitized real recordings, with
  `*.synthetic.ndjson` marking the ones built by hand. Re-record with each CLI's plan-run command
  plus its structured flag.

## Idle timeouts (stall protection)

Every streaming path is bounded so a wedged backend can't hang a chat turn:

- **CLI backends** self-terminate via `resolveAgentTimeouts()` — idle (no output
  for `idleMs`, default `120_000`, env `OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`) +
  wall-clock (`wallClockMs`, default `900_000`) with a SIGTERM→SIGKILL teardown.
- **HTTP/openai backend** (`streamChatCompletion.ts` in `@openthrottle/agentic-conversation-backend`) applies the same
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
  (`POSTGRES_URL`, `OPENTHROTTLE_PLAN_RUN_OT_ROOT`, `OPENTHROTTLE_POSTGRES_URL`, …).

## Don't

- Not a home for OpenThrottle GraphQL/Postgres CRUD. The one bin here is `workflow-memory-reconcile` (`src/scripts/memory-reconcile.ts`; it talks to OT over plain `fetch`, no GraphQL client) and, being a top-level-executing file, it is listed in `sideEffects`.
- The job-run lifecycle hooks (`types/job-run-lifecycle-hooks.ts`, `utils/job-run-*.ts`, `utils/hook-task-to-job-run-hook.ts`) and the run settings they share (`PlanRunTuningSettings`, `PlanRunRuntimeSeed`, `DEFAULT_PLAN_RUN_*`) live here; nothing here imports `agentic-loop`.
- The cached NestJS wrapper over model discovery is `@openthrottle/nestjs-model-discovery`; don't
  add ConfigService/caching here.

## Pointers

- [README.md](./README.md) — module layout table, model-discovery host/port resolution details.
