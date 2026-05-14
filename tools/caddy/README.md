# Caddy reverse proxy for local development

[Caddy](https://caddyserver.com/) is used as a single entry point for local services (openthrottle-server, openthrottle-developer, Ollama) with optional automatic HTTPS. See [docs/monorepo/local-services-and-ports.md](../../docs/monorepo/local-services-and-ports.md) for the full list of services and recommended hostnames.

## Config files

| File                     | Layout                                                                   | Use when                                                       |
| ------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| **Caddyfile**            | Option B: local domains (`api.local`, `developer.local`, `ollama.local`) | You prefer one hostname per service and can edit `/etc/hosts`. |
| **Caddyfile.path-based** | Option A: path-based on `localhost` (`/api`, `/developer`, `/ollama`)    | You want a single origin with no `/etc/hosts` changes.         |

## Prerequisites (Option B: local domains)

Add to `/etc/hosts` (or equivalent) so the hostnames resolve to this machine:

```bash
127.0.0.1 api.local developer.local email.local website.local ollama.local
```

## Running Caddy

All commands assume you are in the **monorepo root**.

### Binary

1. Install Caddy: [download](https://caddyserver.com/download) or `brew install caddy` (macOS).
2. Run with the chosen config:

   ```bash
   caddy run --config tools/caddy/Caddyfile
   ```

   Or for path-based:

   ```bash
   caddy run --config tools/caddy/Caddyfile.path-based
   ```

3. Open [https://api.local](https://api.local), [https://developer.local](https://developer.local), or [https://ollama.local](https://ollama.local) (Option B), or [https://localhost/api](https://localhost/api), [https://localhost/developer](https://localhost/developer), [https://localhost/ollama](https://localhost/ollama) (Option A). Accept the browser warning for Caddy’s local cert the first time, or install Caddy’s CA into your trust store (see [Local HTTPS and trust store](#local-https-and-trust-store)).

### Docker

Mount the Caddyfile and expose 80/443:

```bash
docker run --rm -v "$(pwd)/tools/caddy/Caddyfile:/etc/caddy/Caddyfile" -p 443:443 -p 80:80 caddy caddy run --config /etc/caddy/Caddyfile
```

For path-based, use `Caddyfile.path-based` instead of `Caddyfile`.

## Proxied services

- **api.local** (or **/api**) → `localhost:6021` (openthrottle-server: GraphQL, REST, Socket.IO). WebSocket is passed through by default.
- **developer.local** (or **/developer** and **/**) → `localhost:6020` (openthrottle-developer; see `applications/openthrottle-developer/.env.default`).
- **ollama.local** (or **/ollama**) → `localhost:11434` (Ollama). Set `OLLAMA_BASE_URL` to the proxied URL when using Caddy (see AGENTS.md and databases/README.md).

Ensure the backend services are running on their usual ports before using the proxy.

## Local HTTPS and trust store

When Caddy serves HTTPS for `localhost` or `.local` hostnames, it uses an **internal CA** to issue certificates. Browsers and Node/fetch will show certificate errors until that CA is trusted.

To avoid certificate errors:

1. Run **`caddy trust`** once (from any directory). This installs Caddy's local CA into your system trust store so that `https://localhost/...` and `https://ollama.local` (and other Caddy-proxied URLs) are trusted. On macOS and Linux this may prompt for your password (sudo). See [Caddy docs: caddy trust](https://caddyserver.com/docs/command-line#caddy-trust).
2. Restart browsers or Node processes that already saw the cert warning.

To remove the CA from the trust store later: **`caddy untrust`**.
