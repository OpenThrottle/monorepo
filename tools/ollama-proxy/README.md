# Ollama proxy (OpenAI-compatible)

Local HTTP proxy that accepts OpenAI-style requests (e.g. from Cursor) and forwards them to Ollama, rewriting the model name. Use this when Cursor rejects a custom Ollama model name (e.g. `qwen3-coder-next`) with "Model name is not valid"—configure Cursor to use a **whitelisted** model name and point its API base URL at this proxy; the proxy rewrites the model to your actual Ollama model.

## Environment

| Variable                    | Default                | Description                                                                                                                   |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `OLLAMA_PROXY_PORT`         | `11435`                | Port the proxy listens on (localhost only).                                                                                   |
| `OLLAMA_BASE_URL`           | `https://ollama.local` | Upstream Ollama URL (use Caddy-proxied URL when running Caddy; see [docs/monorepo/Ollama.md](../../docs/monorepo/Ollama.md)). |
| `OLLAMA_PROXY_TARGET_MODEL` | `qwen3-coder-next`     | Model name sent to Ollama (the one Cursor cannot use directly).                                                               |
| `OLLAMA_PROXY_TIMEOUT_MS`   | `120000`               | Upstream fetch timeout in milliseconds; on timeout the proxy responds `504` instead of hanging on a slow or dead upstream.    |

## Dependencies

- **Ollama** must be running and reachable at `OLLAMA_BASE_URL`. Pull the target model (e.g. `ollama pull qwen3-coder-next`) before use.
- **Caddy** (optional): when using the monorepo Caddy setup, set `OLLAMA_BASE_URL=https://ollama.local` so the proxy uses the same stable endpoint as other tools. See [docs/monorepo/Ollama.md](../../docs/monorepo/Ollama.md) for Caddy options and certificate trust.

## Run

From monorepo root (builds then starts the proxy):

```bash
pnpm ollama-proxy
```

Or via Nx directly:

```bash
pnpm nx run @tools/ollama-proxy:build
pnpm nx run @tools/ollama-proxy:serve
```

Or from this directory after build:

```bash
cd tools/ollama-proxy && node --env-file=../../.env.default --env-file=.env ./dist/server.js
```

Ensure Ollama (and optionally Caddy) is running so `OLLAMA_BASE_URL` is reachable.

## Testing

With the proxy running, from monorepo root:

```bash
pnpm nx run @tools/ollama-proxy:e2e
```

The script sends a chat completion request with a whitelisted model and verifies the proxy responds. If Ollama is reachable you get a full success; if not, the script still passes with a warning that the proxy is up but upstream is unreachable.

## Cursor setup

1. **Override OpenAI Base URL:** `http://127.0.0.1:11435/v1` (or `http://127.0.0.1:<OLLAMA_PROXY_PORT>/v1` if you changed the port).
2. **Model:** Use a Cursor-whitelisted name, e.g. `gpt-4o` or `codellama`. The proxy will replace it with `OLLAMA_PROXY_TARGET_MODEL` when forwarding to Ollama.
3. **API key:** Leave empty or use a placeholder (e.g. `ollama`); the proxy does not validate it.

See [docs/monorepo/Ollama.md](../../docs/monorepo/Ollama.md) for Caddy and `OLLAMA_BASE_URL` details.

## Verifying end-to-end (Cursor → proxy → Ollama)

1. **Start Ollama** (and optionally Caddy at `https://ollama.local`). Ensure the target model is pulled (e.g. `ollama pull qwen3-coder-next`).
2. **Start the proxy:** from monorepo root run `pnpm ollama-proxy`.
3. **Run the e2e script** (in another terminal): `pnpm nx run @tools/ollama-proxy:e2e`. It sends an OpenAI-format request with a whitelisted model (`gpt-4o`) to the proxy and asserts the proxy forwards to Ollama and returns a completion. If the proxy is not running, the script exits with a clear message; if Ollama is unreachable, it exits 0 with a warning (proxy is working).
4. **In Cursor:** set Override OpenAI Base URL to `http://127.0.0.1:11435/v1`, Model to `gpt-4o` (or another whitelisted name), then run an agent or chat. Confirm requests complete and responses come from your local model.
