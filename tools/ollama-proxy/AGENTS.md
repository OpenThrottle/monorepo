# @tools/ollama-proxy — agent notes

Single-file local HTTP proxy (`src/server.ts`) that accepts OpenAI-style chat requests and forwards them to Ollama, rewriting whatever whitelisted model name the client sent (e.g. Cursor's `gpt-4o`) to `OLLAMA_PROXY_TARGET_MODEL`. Exists because Cursor rejects arbitrary Ollama model names.

**Consumed by:** nothing depends on it — it is run standalone via the root `pnpm ollama-proxy` script (root `package.json` carries the workspace dep). `production:false`, `projectType: application`.

## Commands

- `pnpm nx run @tools/ollama-proxy:serve` — builds (`build:tsc`) then runs `dist/server.js` with `--env-file=.env.default --env-file=.env`. Listens on localhost `OLLAMA_PROXY_PORT` (default 11435).
- `pnpm nx run @tools/ollama-proxy:e2e` — `scripts/e2e.mjs` against an already-running proxy (start `serve` first). Exits 0 with a warning if the proxy is up but Ollama upstream is unreachable — a "passing" e2e does not prove Ollama connectivity.
- `build` compiles to `dist/`; the `ollama-proxy` bin points at `dist/server.js`, so rebuild after editing `src/`.

## Invariants & gotchas

- Default upstream is `OLLAMA_BASE_URL=https://ollama.local` (`.env.default`), which assumes the [tools/caddy](../caddy/) reverse proxy is running, `/etc/hosts` maps `ollama.local`, and Caddy's local CA is trusted (`caddy trust`) — otherwise the proxy's Node `fetch` fails on the self-signed cert. Point `OLLAMA_BASE_URL` at `http://localhost:11434` to bypass Caddy.
- The inbound client API key is never forwarded upstream; upstream auth uses `OLLAMA_PROXY_UPSTREAM_TOKEN` only. No CORS headers unless `OLLAMA_PROXY_ALLOWED_ORIGINS` is set (never wildcard). Keep both properties when touching request handling.

## Pointers

- [README.md](./README.md) — env var table, Cursor setup, end-to-end verification steps.
- [docs/monorepo/Ollama.md](../../docs/monorepo/Ollama.md) — Ollama + Caddy + `OLLAMA_BASE_URL` details.
