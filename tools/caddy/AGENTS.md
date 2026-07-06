# tools/caddy — agent notes

Two Caddyfile variants for the local reverse proxy (not an Nx project — see [tools/AGENTS.md](../AGENTS.md)); no lint/test targets, changes take effect on Caddy restart.

- `Caddyfile` — one hostname per service (`api.local`→6021, `developer.local`→6020, `admin.local`→6022, `email.local`→6024, `website.local`→6025, `ollama.local`→11434); requires `/etc/hosts` entries.
- `Caddyfile.path-based` — single `https://localhost` origin: `/api`, `/ollama`, `/developer` (and `/` falls through to the developer app); no `/etc/hosts` changes, but apps may need base-path config.

**Gotcha:** Caddy issues HTTPS certs from its internal CA. Browsers can click through, but Node/`fetch` callers (ollama-proxy, embedding imports pointed at `https://ollama.local`) hard-fail until you run `caddy trust` once (`caddy untrust` reverses it). Restart Node processes that already saw the bad cert.

Ports must match each app's `.env.default`. Service/hostname map: [docs/monorepo/local-services-and-ports.md](../../docs/monorepo/local-services-and-ports.md); Ollama-specific setup: [docs/monorepo/Ollama.md](../../docs/monorepo/Ollama.md); run/docker instructions: [README.md](./README.md).
