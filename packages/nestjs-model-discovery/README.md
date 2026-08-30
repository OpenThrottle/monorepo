# @openthrottle/nestjs-model-discovery

Thin NestJS wrappers around the model-discovery cores in
[`@openthrottle/openthrottle-agentic-utils`](../openthrottle-agentic-utils). It provides
**two injectable, in-process-cached services**:

- `NestjsModelDiscoveryService` — discovers locally-running OpenAI-compatible model
  servers (Ollama-primary; also vLLM, llama.cpp, SGLang, LM Studio) and their models.
- `NestjsRemoteModelsService` — fetches a hosted gateway's published catalog
  (OpenRouter) and reports whether an operator key makes it usable for chat.

Both are **GraphQL-agnostic** — the resolvers/ObjectTypes live in `openthrottle-server`
(`discoverLocalModels`, `discoverRemoteModels`), and the `openthrottle-mcp`
`discover_local_models` tool reads that query. This package owns only the services,
their config, and the caches.

## The remote catalog service

`NestjsRemoteModelsService.catalog()` reuses the same `StaleWhileRevalidateCache` as the
local service but with far longer TTLs — soft 1h, hard 24h, against local discovery's
60s/10m. That is deliberate: this is one internet round trip for a few-hundred-entry
published catalog that changes on the order of days, not a port scan of a machine whose
servers come and go. A page load must never pay for it.

It never throws: the underlying fetcher degrades every failure mode to an empty catalog.

**The API key never leaves this package.** `catalog()` returns a derived
`configured: boolean` and nothing more; `chatCredentials()` returns the key for immediate
use on an outbound request and `null` when unconfigured, so a caller cannot accidentally
start an unauthenticated turn. The key is never persisted, returned over GraphQL, or
logged — the catalog debug line carries counts and the provider id only, and
deliberately not the base URL (an operator could embed credentials in a proxy URL).

`src/config/nestjs-remote-models.config.ts` (`registerAs('remoteModels')`) is the SINGLE
place `OPENROUTER_*` env vars are read anywhere in the monorepo.

## What it does

`NestjsModelDiscoveryService.discover()` resolves hosts/ports/timeouts from config,
runs the pure `discoverModels` core, stamps `scannedAt`, and caches the snapshot
in-process. A local scan is sub-second, so freshness comes from a short TTL cache
— **no Redis, no BullMQ, no Postgres snapshot.**

```ts
import { NestjsModelDiscoveryModule } from '@openthrottle/nestjs-model-discovery';

@Module({ imports: [NestjsModelDiscoveryModule] })
export class AppModule {}

// elsewhere
constructor(private readonly discovery: NestjsModelDiscoveryService) {}

const snapshot = await this.discovery.discover();                    // cached within TTL
const fresh = await this.discovery.discover({ forceRefresh: true }); // bypass cache
this.discovery.invalidate();                                        // drop the cache
```

`DiscoveryResult`:

```ts
{
  endpoints: [{ baseUrl, host, port, provider, models }], // deduped, sorted by (host, port)
  scannedHosts: string[],
  scannedAt: string,                                      // ISO-8601, caller-stamped
}
```

## Configuration (env)

Read once at the wrapper boundary via a `registerAs('modelDiscovery')` namespace —
the pure core never reads `process.env`. All optional. Values are validated against
the exported `configValidationSchema` on every config build, so a malformed value
(e.g. `LLM_PROBE_TIMEOUT_MS=abc`) throws on boot rather than being silently coerced
to its default. The schema is also exported so a consumer can compose it into a
top-level `ConfigModule.forRoot({ validationSchema })`.

| Env var                                            | Purpose                                             | Default                               |
| -------------------------------------------------- | --------------------------------------------------- | ------------------------------------- |
| `LLM_HOSTS`                                        | Comma/space list; **replaces** the default host set | `localhost`, `host.docker.internal`   |
| `LLM_PORTS`                                        | Comma/space list; **replaces** the default port set | `8000-8020`, `1234`, `11434`, `11435` |
| `OLLAMA_BASE_URL` / `OLLAMA_URL` / `LM_STUDIO_URL` | host+port parsed and **merged** into the scan set   | —                                     |
| `LLM_PROBE_TIMEOUT_MS`                             | `/v1/models` probe timeout                          | `3000`                                |
| `LLM_FINGERPRINT_TIMEOUT_MS`                       | provider fingerprint timeout                        | `1500`                                |
| `LLM_DISCOVERY_CONCURRENCY`                        | max in-flight probes                                | `50`                                  |
| `LLM_DISCOVERY_CACHE_TTL_MS`                       | in-process cache TTL; `0` disables caching          | `60000`                               |

## Snapshot vs live

`discover()` returns the cached snapshot while it is within the TTL window
(default 60s); `discover({ forceRefresh: true })` forces a fresh scan. The GraphQL
`discoverLocalModels` query intentionally serves the **cached snapshot** only — it
does not trigger a live scan per request.

## Caveat: baseUrl vantage point

`baseUrl`s reflect the **discovering process's** network view. A Dockerized server
reaches a host-side Ollama via `host.docker.internal`, so a returned `baseUrl` may
not be reachable verbatim from a different process (e.g. an MCP client).

## Out of scope

The odysseus "Cookbook" hardware-fit / model-download feature, availability
history, and any Developer/Admin UI or chat surfacing (a future consumer can read
`discoverLocalModels`). Multi-host network sweeps / Tailscale ship **no code** —
only a pluggable `HostSource` seam in the core.

## Installation

In this monorepo, depend on it via the workspace protocol:

```jsonc
// package.json
"dependencies": { "@openthrottle/nestjs-model-discovery": "workspace:^" }
```
