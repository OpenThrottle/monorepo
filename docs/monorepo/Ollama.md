# Ollama

- [Ollama Docker image](https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image)
- [Ollama with Cursor](https://www.youtube.com/watch?v=Ssh3m_8RPlA)
  - `export OLLAMA_ORIGINS=*` in our `.zshrc` file
  - kill all ollama instances from running
  - `ollama serve`

## Running Ollama

- Install from https://ollama.com/download; start the app or run `ollama serve`.
- Pull models: `scripts/ollama.ts (pnpm run ollama:pull)` (chat and embedding models). See `databases/README.md` for embedding dimension strategy.

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
