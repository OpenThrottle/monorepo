# @openthrottle/openthrottle-drivers — agent notes

The OT-central contract for invoking agent CLIs (Claude Code, Codex, Cursor, Grok,
OpenCode). Each CLI is one `defineDriver(...)` module; a shared engine
(`runDriverSync`/`runDriverAsync`) runs it. Extracted from
`tools/workflows/src/bin/run-iteration.ts`.

**Consumed by:** `@tools/workflows` (run-iteration adapter),
`@openthrottle/openthrottle-agentic-utils` + `@openthrottle/openthrottle-agentic-workflow`
(runner-id re-exports), and transitively `openthrottle-server`.

## Layout

- `src/registry/` — `DRIVER_IDS`, `DriverId`, `defineDriver`, `isDriverId`,
  `parseDriverId`, `lookupDriver`. Imports NO driver module (keeps it acyclic).
- `src/drivers/` — one file per CLI + `index.ts` that assembles `ALL_DRIVERS`,
  `DRIVER_REGISTRY`, and `getDriver`.
- `src/engine/` — `runDriverSync`/`runDriverAsync` (spawn/timeout/abort/streaming).
- `src/types/` — `AgentDriver`, `DriverCapabilities`, `DriverInvocationConfig`, …
- `src/errors/` — `UnknownDriverError`, `UnsupportedDriverModeError`.
- `src/utils/` — `shell.ts` (escaping), `worktree.ts` (capability-gated `-w` flags),
  `logger.ts` (injectable `DriverLogger`), `child-kill.ts` (SIGTERM→SIGKILL).

## Invariants & gotchas

- **Node-only.** Uses `child_process`; never import from browser/RR code.
- **Leaf package.** Zero workspace dependencies — the agentic packages and
  tools/workflows depend on THIS, not the reverse. Do not import from
  `openthrottle-agentic-*` here (it would create a cycle).
- **Registry ↔ drivers split** avoids a cycle: driver modules import `defineDriver`
  from `registry/`, so the assembled `DRIVER_REGISTRY`/`getDriver` live in
  `drivers/index.ts`, not `registry/`. Keep it that way.
- **`DRIVER_IDS` and `ALL_DRIVERS` must stay in lockstep** — add a new id to both.
- **Byte-identical parity** with the legacy builders is a hard contract for
  `claude`/`cursor`: the unchanged `tools/workflows` `run-iteration.test.ts` runs
  against these drivers. Claude emits `claude -p …` (NOT `--bare`). Don't "fix" it.
- **Widening `DRIVER_IDS` ripples**: `WORKFLOW_RUNNER_IDS` derives from it, and the
  `plan_runs.execution_backend` CHECK (databases/migrations/079) + server
  `PlanRunExecutionBackend`/guard enumerate the same set. Add a migration + widen
  those surfaces when you add a runnable id.
- Built package (real `build`/`build-package`, `exports` → `dist/`) — server consumes
  it at runtime, so relative imports use `.ts` extensions. Tag public API `@public`.

## Local-endpoint targeting (`DriverInvocationConfig.endpoint`)

A driver can be pointed at a discovered local OpenAI-compatible model server
(Ollama/LM Studio/vLLM, from `discoverLocalModels`) instead of its own cloud
provider. Set `endpoint: { baseUrl, provider?, apiKey?, configFilePath? }` and
read `capabilities.supportsCustomBaseUrl` to feature-detect.

- **opencode / codex / grok** advertise `supportsCustomBaseUrl: true`; **claude /
  cursor** advertise `false` and ignore `endpoint` (their wire protocols aren't
  OpenAI-compatible — Anthropic Messages API / Cursor's proprietary backend).
- Injection stays in the **pure** `buildShellCommand` (env prefix via
  `formatShellEnvPrefix`, or CLI flags): grok → `GROK_MODELS_BASE_URL` +
  placeholder `XAI_API_KEY`; codex → `--oss --local-provider <provider|ollama> -c
model_providers.oss.base_url="<baseUrl>"`; opencode → `OPENCODE_CONFIG=<path>`
  (the config **file is materialized by the consumer** and passed as
  `endpoint.configFilePath` — the leaf builder never writes files).
- `model` carries the discovered model id (opencode expects `provider/model`).
- The streaming chat path has a parallel implementation in
  `@openthrottle/openthrottle-agentic-utils` conversation-backend adapters (honoring
  `ConversationBackendRun.baseUrl`); the developer composer joins driver × endpoint
  and the conversation-stream resolver SSRF-validates `baseUrl` against discovery.

**Verified E2E (2026-07-29):** `GROK_MODELS_BASE_URL=http://localhost:11434/v1
XAI_API_KEY=local grok -p "…" --model qwen3.5:latest` streamed a completion from a
local Ollama model. Docker caveat: a discovered `host.docker.internal` baseUrl may
be unreachable from a driver process outside that Docker network — pass it verbatim
and prefer the localhost vantage.

## Pointers

- [README.md](./README.md) — API list, capability matrix, "adding a new agent CLI".
- [tools/workflows/README.md](../../tools/workflows/README.md) — Ralph "which path runs when".
- [../AGENTS.md](../AGENTS.md) — parent-tier package conventions.
