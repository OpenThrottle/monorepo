# Ollama

- [Ollama Docker image](https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image)
- [Ollama with Cursor](https://www.youtube.com/watch?v=Ssh3m_8RPlA)
  - `export OLLAMA_ORIGINS=*` in our `.zshrc` file
  - kill all ollama instances from running
  - `ollama serve`

## Running Ollama

- Install from https://ollama.com/download; start the app or run `ollama serve`.
- Pull models: `scripts/ollama.ts (pnpm run ollama:pull)` (chat and embedding models). Semantic search does not need Ollama — see § Embeddings for OpenThrottle below.

## Embeddings for OpenThrottle

Semantic search (`semantic_search`) embeds on **openthrottle-server** only — never in the MCP launcher or the ingest scripts — with **one model at one dimension: nomic-embed-text-v1.5, 768 dims** by default, or a hosted model at the same 768 dims (OT plans `165e86ef`, `7a18c91d`; schema and provenance in [`databases/openthrottle/README.md`](../../databases/openthrottle/README.md) § Embedding dimension strategy).

| Provider              | Configure (server `.env`)                                                                         | Notes                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Local (default)**   | nothing — or `EMBEDDING_MODELS_DIR` (default `~/.openthrottle/models`)                            | Quantized ONNX in a worker thread inside the server. Weights are fetched automatically before every server boot (`monorepo:ensure-embedding-model`), and by setup + worktree provisioning; `pnpm run embeddings:download-model` is the manual retry. |
| **Ollama (optional)** | `EMBEDDING_PROVIDER=ollama`, `OLLAMA_BASE_URL` (default `http://localhost:11434`)                 | Same model: `ollama pull nomic-embed-text`. Useful to put inference on a GPU box; vectors are interchangeable with the local provider's.                                                                                                             |
| **OpenAI / Gemini**   | `EMBEDDING_PROVIDER=openai` + `OPENAI_API_KEY`, or `EMBEDDING_PROVIDER=gemini` + `GEMINI_API_KEY` | Hosted, at 768 dims (`text-embedding-3-small` / `gemini-embedding-001`). Your content goes to the provider; switching re-embeds everything. Trade-offs: `databases/openthrottle/README.md`.                                                          |

When the embedder cannot run — weights missing, Ollama down, a refused value — the server says so: MCP `health` shows `embeddings: unconfigured` or `degraded` with per-table coverage, and `semantic_search` answers with Postgres full-text search (`mode: lexical`, plus a `reason`) instead of empty results. Once the embedder is back, the embeddings queue and its 15-minute reconciler catch up with no manual step.

The code index (`/ide` Semantic tab, `nestjs-vector-search`) uses this same embedder and model; `OLLAMA_EMBEDDING_MODEL` is no longer read anywhere. What happens to **source code** depends on the provider (OT plan `1c8b9a90`):

- **Local or Ollama:** code is indexed as normal and never leaves your hardware.
- **OpenAI or Gemini:** code indexing is **off**. The Semantic tab shows `hostedOptInRequired`, the Index action enqueues nothing, and any queued job refuses before reading a file. Plans, tasks, docs and prompts still embed through the hosted API. To send code too, set `CODE_EMBEDDINGS_ALLOW_HOSTED=true` on the server; only the exact value `true` counts.

### MCP launcher and embeddings

The stdio launcher [`scripts/run-openthrottle-mcp.sh`](../../scripts/run-openthrottle-mcp.sh) (a thin shim; the logic lives in [`scripts/run-openthrottle-mcp.ts`](../../scripts/run-openthrottle-mcp.ts)) starts **@openthrottle/openthrottle-mcp** on stdio. It needs no embedding config at all — only `API_URL` / **`API_URL_INTERNAL`** and **`OPENTHROTTLE_MCP_AUTH_TOKEN`** (see [AUTH.md](../../packages/openthrottle-mcp/docs/AUTH.md)). Embedding runs on the server per the table above, which is why `semantic_search` can answer lexically while every other MCP tool works normally.

> **Running the stack fully in Docker (no host Node)?** Use the streamable-HTTP `mcp` container instead of the stdio launcher — `docker compose --profile prod up mcp`, registered by URL. See [mcp-registration.md § HTTP transport (Docker-native)](../openthrottle/mcp-registration.md#http-transport-docker-native).

Smoke check: `API_URL_INTERNAL=http://localhost:6021 pnpm run verify:mcp-env` (reports the server's `serverHealth.embeddings` status).

## Proxying Ollama through Caddy

The monorepo uses [Caddy](https://caddyserver.com/) to expose local services with a single entry point and optional HTTPS. When Caddy is running, agents and UIs should use the **Caddy-proxied URL** for Ollama so everything hits one stable endpoint.

| Caddy option                 | Ollama URL                 | Use when                                                                      |
| ---------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| **Option B** (local domains) | `https://ollama.local`     | You use `api.local`, `developer.local`, `ollama.local` (add to `/etc/hosts`). |
| **Option A** (path-based)    | `https://localhost/ollama` | You use a single origin with no `/etc/hosts` changes.                         |

- **Set `OLLAMA_BASE_URL`** to the proxied URL when using Caddy so `openthrottle:import`, LangChain, openthrottle-server, and other consumers use the same endpoint. See root `.env.default`, `AGENTS.md`, and `databases/openthrottle/README.md`.
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
