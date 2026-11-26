# @openthrottle/openthrottle-drivers — agent notes

The OT-central contract for invoking agent CLIs (Claude Code, Codex, Cursor, Antigravity,
Grok, OpenCode). Each CLI is one `defineDriver(...)` module; a shared engine
(`runDriverSync`/`runDriverAsync`) runs it.

**Consumed by:** `@openthrottle/openthrottle-agentic-loop`,
`@openthrottle/openthrottle-agentic-utils`, `@openthrottle/openthrottle-plan-config`
(runner-id re-exports), and transitively `openthrottle-server`.

## Layout

- `src/utils/registry.ts` — `DRIVER_IDS`, `DriverId`, `defineDriver`, `isDriverId`,
  `parseDriverId`, `lookupDriver`. Imports NO driver module (keeps it acyclic).
- `src/utils/<agent>Driver.ts` — one file per CLI, exporting `<agent>Driver` (`defineDriver(...)`).
  `src/utils/driver-registry.ts` assembles `ALL_DRIVERS`, `DRIVER_REGISTRY`, and `getDriver`.
- `src/utils/engine.ts` — `runDriverSync`/`runDriverAsync` (spawn/timeout/abort/streaming).
- `src/utils/runAgentPrompt.ts` — `runAgentPrompt` (resolve driver, check capabilities, run).
- `src/types/` — `AgentDriver`, `DriverCapabilities`, `DriverInvocationConfig`, …
- `src/utils/` also holds the error classes (`UnknownDriverError`, `UnsupportedDriverModeError`,
  `DriverCapabilityError`, one PascalCase file each), `shell.ts` (escaping), `shell-flags.ts`
  (capability-gated `-w` flags), `logger.ts` (injectable `DriverLogger`), `child-kill.ts`
  (SIGTERM→SIGKILL).

## Invariants & gotchas

- **Node-only.** Uses `child_process`; never import from browser/RR code.
- **Leaf package.** Zero workspace dependencies — the agentic packages
  depend on THIS, not the reverse. Do not import from
  `openthrottle-agentic-*` here (it would create a cycle).
- **Registry ↔ drivers split** avoids a cycle: driver modules import `defineDriver`
  from `utils/registry.ts`, so the assembled `DRIVER_REGISTRY`/`getDriver` live in
  `utils/driver-registry.ts`, not the registry module. Keep it that way.
- **`DRIVER_REGISTRY` is `Record<DriverId, AgentDriver>`** — adding an id to `DRIVERS` fails to compile until a module is registered. `ALL_DRIVERS` derives from that map.
- **Argv parity** is a hard contract for `claude`/`cursor`: their tests pin the exact argv. Claude emits `claude -p …` (NOT `--bare`). Don't "fix" it.
- **Widening `DRIVER_IDS` ripples**: the runner-id helpers in agentic-utils derive from it, and the
  `plan_runs.driver` CHECK (`plan_runs_driver_check`, migration 194) + server
  `PlanRunDriver`/guard enumerate the same set. Add a migration + widen
  those surfaces when you add a runnable id.
- **The child never inherits `process.env`.** `buildChildEnv` (engine) admits only
  `BASE_CHILD_ENV_KEYS`, the driver's `hostEnv`, `OPENTHROTTLE_AGENT_ENV_PASSTHROUGH`
  (exact names) and `config.env`. A CLI that needs a new login variable gets it in its
  `hostEnv` — never by widening the base or adding a broad prefix. The canaries
  (`utils/__tests__/child-env.canary.test.ts` and the OT Loop one in the
  server's `ot-loop.utils.test.ts`) fail if a server secret reaches a child.
- Built package (real `build`/`build-package`, `exports` → `dist/`) — server consumes
  it at runtime, so relative imports use `.ts` extensions. Tag public API `@public`.

## Local-endpoint targeting (`DriverInvocationConfig.endpoint`)

A driver can be pointed at a discovered local OpenAI-compatible model server
(Ollama/LM Studio/vLLM, from `discoverLocalModels`) instead of its own cloud
provider. Set `endpoint: { baseUrl, provider?, apiKey?, configFilePath? }` and
read `capabilities.supportsCustomBaseUrl` to feature-detect.

- **opencode / codex / grok** advertise `supportsCustomBaseUrl: true`; **claude /
  cursor / antigravity** advertise `false` and ignore `endpoint` (their wire protocols
  aren't OpenAI-compatible — Anthropic Messages API / Cursor's proprietary backend /
  Google's Gemini API).
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
- [../AGENTS.md](../AGENTS.md) — parent-tier package conventions.
