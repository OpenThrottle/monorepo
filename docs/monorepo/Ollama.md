# Ollama

- [Ollama Docker image](https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image)
- [Ollama with Cursor](https://www.youtube.com/watch?v=Ssh3m_8RPlA)
  - `export OLLAMA_ORIGINS=*` in our `.zshrc` file
  - kill all ollama instances from running
  - `ollama serve`

## Running Ollama

- Install from https://ollama.com/download; start the app or run `ollama serve`.
- Pull models: `scripts/ollama.ts (pnpm run ollama:pull)` (chat and embedding models). See `databases/README.md` for embedding dimension strategy.

## Embeddings for OpenThrottle (Ollama or OpenAI)

Semantic search (`semantic_search`) and doc/plan ingest embed on **openthrottle-server**, so the embedding provider is configured on **`applications/openthrottle-server/.env`** — never in the MCP launcher.

| Path                      | Configure                                                                                                                      | Notes                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Ollama (no cloud API)** | **`OLLAMA_BASE_URL`** (default `http://localhost:11434`) and optionally **`OLLAMA_EMBEDDING_MODEL`** (e.g. `nomic-embed-text`) | No API key needed. Run Ollama locally (or proxy it through Caddy, above).  |
| **OpenAI**                | **`OPENAI_API_KEY`** (leave the Ollama vars unset), e.g. `text-embedding-3-small`                                              | Cloud embeddings; the rest of the stack still runs locally.                |
| **Neither**               | —                                                                                                                              | The stack runs; `semantic_search` and ingest embedding are simply skipped. |

**Dimension caveat:** OpenThrottle stores **1536-dim** vectors. If the Ollama model returns a different dimension, embeddings are skipped — see [`databases/README.md`](../../databases/README.md) § Embedding dimension strategy.

### MCP launcher and embeddings

The stdio launcher [`scripts/run-openthrottle-mcp.sh`](../../scripts/run-openthrottle-mcp.sh) (a thin shim; the logic lives in [`scripts/run-openthrottle-mcp.ts`](../../scripts/run-openthrottle-mcp.ts)) starts **@openthrottle/openthrottle-mcp** on stdio. It does **not** require **`OPENAI_API_KEY`** in the monorepo root `.env` — it needs only `API_URL` / **`API_URL_INTERNAL`** and **`OPENTHROTTLE_MCP_AUTH_TOKEN`** (see [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)). Embedding config lives on the server `.env` per the table above, which is why `semantic_search` can fail while every other MCP tool works.

> **Running the stack fully in Docker (no host Node)?** Use the streamable-HTTP `mcp` container instead of the stdio launcher — `docker compose --profile prod up mcp`, registered by URL. See [mcp-registration.md § HTTP transport (Docker-native)](../openthrottle/mcp-registration.md#http-transport-docker-native).

Smoke check: `API_URL_INTERNAL=http://localhost:6021 pnpm run verify:mcp-env` (reports server embedding config).

## Proxying Ollama through Caddy

The monorepo uses [Caddy](https://caddyserver.com/) to expose local services with a single entry point and optional HTTPS. When Caddy is running, agents and UIs should use the **Caddy-proxied URL** for Ollama so everything hits one stable endpoint.

| Caddy option                 | Ollama URL                 | Use when                                                                      |
| ---------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| **Option B** (local domains) | `https://ollama.local`     | You use `api.local`, `developer.local`, `ollama.local` (add to `/etc/hosts`). |
| **Option A** (path-based)    | `https://localhost/ollama` | You use a single origin with no `/etc/hosts` changes.                         |

- **Set `OLLAMA_BASE_URL`** to the proxied URL when using Caddy so `openthrottle:import`, LangChain, openthrottle-server, and other consumers use the same endpoint. See root `.env.default`, `AGENTS.md`, and `databases/README.md`.
- Caddy config: `tools/caddy/Caddyfile` (Option B) and `tools/caddy/Caddyfile.path-based` (Option A). Run Caddy from repo root per `tools/caddy/README.md`.
- **Trusting Caddy's certificate:** For HTTPS without certificate errors in browsers and Node/fetch, install Caddy's local CA: run **`caddy trust`** once (see [tools/caddy/README.md](../../tools/caddy/README.md) § Local HTTPS and trust store).

## CORS / OLLAMA_ORIGINS

When Ollama is behind Caddy, the browser or agent sends requests to the Caddy URL; Caddy forwards them to Ollama. Ollama sees the request and may enforce CORS via **`OLLAMA_ORIGINS`**. For requests to succeed:

- **From browsers:** The `Origin` header is typically `https://ollama.local` (Option B) or `https://localhost` (Option A). Allow those in `OLLAMA_ORIGINS`.
- **From Node/CLI agents** (openthrottle:import, LangChain, openthrottle-server): They often do not send `Origin`, but some runtimes do. Allowing the Caddy origins and the direct Ollama origin covers all cases.

**Recommended for local dev:** set `OLLAMA_ORIGINS=*` (e.g. in `.zshrc` or `.env`) so Caddy and all agent origins are allowed. Restart `ollama serve` after changing.

**Optional (stricter):** comma-separated list, e.g.
`OLLAMA_ORIGINS=https://ollama.local,https://localhost,http://localhost:11434`

Documented in root `.env.default`; see also `scripts/ollama.ts (pnpm run ollama:pull)` and `tools/caddy/README.md`.

## Using Cursor with Ollama via the proxy

Cursor validates model names and rejects custom Ollama models (e.g. `qwen3-coder-next`) with "Model name is not valid" before sending requests. Use the **Ollama proxy** so Cursor talks to a whitelisted name while the proxy forwards to your real model.

1. **Start the proxy** (requires Ollama, and optionally Caddy at `https://ollama.local`). From monorepo root:

   ```bash
   pnpm nx run @tools/ollama-proxy:serve
   ```

   See [tools/ollama-proxy/README.md](../../tools/ollama-proxy/README.md) for env vars and defaults.

2. **Cursor settings:**
   - **Override OpenAI Base URL:** `http://127.0.0.1:11435/v1` (or `http://127.0.0.1:<OLLAMA_PROXY_PORT>/v1` if you set a different port).
   - **Model:** Use a Cursor-whitelisted name, e.g. `gpt-4o` or `codellama`. The proxy rewrites this to the model configured in `OLLAMA_PROXY_TARGET_MODEL` (default `qwen3-coder-next`) when forwarding to Ollama.
   - **API key:** Leave empty or use a placeholder (e.g. `ollama`); the proxy does not validate it.

Full setup and options: [tools/ollama-proxy/README.md](../../tools/ollama-proxy/README.md). To verify end-to-end (Cursor → proxy → Ollama), see the “Verifying end-to-end” section in that README and run `pnpm nx run @tools/ollama-proxy:e2e` with the proxy and Ollama running.
