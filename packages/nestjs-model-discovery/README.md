# @openthrottle/nestjs-model-discovery

A thin NestJS wrapper around the local model-discovery core in
[`@openthrottle/openthrottle-agentic-utils`](../openthrottle-agentic-utils). It
provides an **injectable, in-process-cached service** that discovers
locally-running OpenAI-compatible model servers (Ollama-primary; also vLLM,
llama.cpp, SGLang, LM Studio) and the models they serve.

It is **GraphQL-agnostic** — the resolver/ObjectTypes live in `openthrottle-server`
(`discoverLocalModels`), and the `openthrottle-mcp` `discover_local_models` tool
reads that query. This package owns only the service, its config, and the cache.

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
the pure core never reads `process.env`. All optional.

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
