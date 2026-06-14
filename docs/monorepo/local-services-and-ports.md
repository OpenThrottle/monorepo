# Local services and ports for Caddy

This document lists local development services and their ports so they can be exposed behind a single entry point (e.g. [Caddy](https://caddyserver.com/) reverse proxy). It also recommends hostnames and whether to use Caddy’s automatic HTTPS for localhost.

## Services to expose

| Service                    | Port                | Description                                                                                            | Env / config                                                                                                                                             |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **openthrottle-server**    | **6021**            | NestJS API: GraphQL, REST, Socket.IO (WebSockets). Used by openthrottle-developer and tooling.         | `applications/openthrottle-server/.env.default`: `PORT="6021"`. GraphQL at `/graphql`; Socket.IO at `/socket.io`; BullMQ Board at `/queues`.             |
| **openthrottle-developer** | **6020** (template) | React Router + Vite frontend. Connects to openthrottle-server for API and WebSocket.                   | `applications/openthrottle-developer/.env.default`: `PORT="6020"`, `API_URL_*` → `http://localhost:6021`. If `PORT` is unset, Vite defaults to **3000**. |
| **Ollama**                 | **11434**           | Local LLM/embedding server. Used by `cortex:import`, LangChain, openthrottle-server, and other agents. | `OLLAMA_BASE_URL` default `http://localhost:11434`. See `scripts/ollama.sh`, `databases/README.md`, `.env.default`.                                      |

> **Worktrees:** these `6010`–`6025` ports are the main checkout's. Git worktrees
> get their own app-port block in the `7000` range (Postgres/Redis stay shared) —
> see [worktree-port-allocation.md](worktree-port-allocation.md).

## Optional / related services

- **Postgres (OpenThrottle)** — `localhost:6010` (from `applications/openthrottle-server/.env.default`: `POSTGRES_PORT`). Typically not exposed through Caddy; used by openthrottle-server and Cortex tooling.
- **Redis** — `localhost:6011` (from the same `POSTGRES_*` / Redis block in the server `.env.default`; matches root `docker-compose-databases.yml` conventions). Used by openthrottle-server (BullMQ). Not normally exposed through Caddy.
- **GraphQL URL** — `http://localhost:6021/graphql` when using the server template on `6021`. Tools and MCP clients should use the same base URL as `openthrottle-server`. Behind Caddy, use a single API entry point (e.g. `https://api.local` or `https://localhost/api`) instead of raw port references.

## Recommended hostnames and Caddy layout

Two workable approaches:

### Option A: Path-based on localhost

Single origin `https://localhost` with paths:

- `https://localhost/api` → reverse_proxy to `localhost:6021` (openthrottle-server)
- `https://localhost/developer` or `https://localhost/` → reverse_proxy to the developer dev port (e.g. `localhost:6020` from app `.env.default`, or `3000` / `5173` depending on your Vite config)
- `https://localhost/ollama` → reverse_proxy to `localhost:11434` (Ollama)

Pros: One host, no `/etc/hosts` changes. Cons: Apps may need base path config (e.g. Vite `base: '/developer/'`), and WebSocket/GraphQL paths must be consistent with the base path.

### Option B: Local domains (recommended for clarity)

Use a small set of hostnames and point them at `127.0.0.1` via `/etc/hosts` (or similar). Caddy can obtain and trust certs for these:

- **api.local** → `localhost:6021` (openthrottle-server)
- **developer.local** → `localhost:6020` (or your configured `PORT`; match `vite.config.ts` and `applications/openthrottle-developer/.env.default`)
- **ollama.local** → `localhost:11434` (Ollama)

Pros: No path rewriting; each app thinks it’s at the root. Clear separation for API, developer UI, and Ollama. Caddy’s automatic HTTPS works with locally-trusted certs (e.g. Caddy can install its CA into the system trust store). Cons: Requires editing `/etc/hosts` (or using a local DNS like dnsmasq).

### HTTPS for localhost

- **Caddy’s localhost HTTPS:** Caddy can enable HTTPS on `localhost` and use its own locally-trusted CA so browsers and Node/fetch don’t show certificate errors. This applies to both Option A and, if you add `localhost` as an alternate, Option B.
- **Trust store:** See [tools/caddy/README.md](../../tools/caddy/README.md) § Local HTTPS and trust store for how to trust Caddy’s local CA (run `caddy trust`) so that `https://localhost/...` and `https://ollama.local` work without manual cert bypass.

## Decisions to capture in Caddyfile

1. **Which option:** Path-based on `localhost` (Option A) vs local domains (Option B). Recommendation: **Option B** (api.local, developer.local, ollama.local) for simpler app config and a single stable `OLLAMA_BASE_URL` (e.g. `https://ollama.local`).
2. **Whether to use Caddy’s automatic HTTPS** for these hostnames (recommended so agents and browsers can use HTTPS without self-signed warnings).
3. **WebSocket passthrough:** Ensure Caddy is configured to pass through WebSocket traffic for openthrottle-server (Socket.IO) when proxying `api.local` or `https://localhost/api`.

## Caddy config in repo

Caddy and Caddyfile(s) live in **tools/caddy/**:

- **Caddyfile** — Option B (api.local, developer.local, ollama.local).
- **Caddyfile.path-based** — Option A (https://localhost/api, /developer, /ollama).
- **README** — run instructions (binary and Docker).

## References

- Plan: _Expose local services with Caddy and host Ollama for agents_ (Cortex).
- Caddyfile docs: <https://caddyserver.com/docs/caddyfile>.
- Ollama in this repo: `docs/monorepo/Ollama.md`, `scripts/ollama.sh`, `databases/README.md`, `AGENTS.md` (§ OLLAMA_BASE_URL).
- openthrottle-server / developer: `applications/openthrottle-server/.env.default`, `applications/openthrottle-developer/app/global/config/settings.ts`, `docs/openthrottle/notifications-websockets-plan.md`.
