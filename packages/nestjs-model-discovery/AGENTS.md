# @openthrottle/nestjs-model-discovery — agent notes

Injectable, stale-while-revalidate-cached NestJS wrappers around the pure discovery cores
in `@openthrottle/openthrottle-agentic-utils`:

- **local** (default 60s soft TTL) — running OpenAI-compatible model servers on this
  machine (Ollama-primary; vLLM, llama.cpp, SGLang, LM Studio).
- **remote** (default 1h soft / 24h hard) — a hosted gateway's published catalog
  (OpenRouter). Much longer TTLs on purpose: a published catalog changing on the order of
  days, not a port scan.

**Consumed by:** `openthrottle-server` only (backs the `discoverLocalModels` and
`discoverRemoteModels` GraphQL queries; the `openthrottle-mcp` `discover_local_models`
tool reads that query, not this package directly).

## Layout

- `src/nestjs-model-discovery.service.ts` — `discover()` / `invalidate()`, in-process
  TTL cache, `scannedAt` stamping.
- `src/config/nestjs-model-discovery.config.ts` — `registerAs('modelDiscovery')` env
  mapping + exported Joi `configValidationSchema`.
- `src/nestjs-remote-models.service.ts` — `catalog()` / `chatCredentials()` /
  `invalidate()`, SWR cache, `fetchedAt` stamping.
- `src/config/nestjs-remote-models.config.ts` — `registerAs('remoteModels')`; the SINGLE
  place `OPENROUTER_*` is read anywhere in the monorepo.
- `src/nestjs-model-discovery.module.ts` — module wiring for BOTH services.

## Invariants & gotchas

- Built package (real `build` target; the `__build-package` placeholder key alongside it
  does not make it source-first — see [../AGENTS.md](../AGENTS.md)).
- Env is read only at this wrapper boundary; the core in `openthrottle-agentic-utils`
  never touches `process.env`. Route new options config → core arguments, not env reads
  in the core.
- **The OpenRouter key never leaves this package.** `catalog()` exposes only a derived
  `configured: boolean`; `chatCredentials()` hands the key out for one outbound request
  and returns `null` when unconfigured. Never put it in a GraphQL field, a log line, or a
  return value. The catalog debug log deliberately omits the base URL too, since an
  operator could embed credentials in a proxy URL.
- Joi validates on every config build: a malformed value (e.g. `LLM_PROBE_TIMEOUT_MS=abc`)
  throws at boot instead of silently coercing to its default.
- GraphQL-agnostic by design — resolver/ObjectTypes live in `openthrottle-server`; do not
  add GraphQL dependencies here.
- Cache semantics are intentional: the GraphQL query serves the cached snapshot only
  (`LLM_DISCOVERY_CACHE_TTL_MS`, `0` disables); `forceRefresh` is an explicit opt-in, not
  per-request behavior.
- Returned `baseUrl`s reflect the discovering process's network vantage (a Dockerized
  server sees `host.docker.internal`) and may not be reachable from other processes.

## Pointers

- [README.md](./README.md) — env-var table, snapshot-vs-live, explicit out-of-scope list.
