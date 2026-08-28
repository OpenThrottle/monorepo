# Local services and ports

The canonical port map for local development, plus the optional Caddy reverse proxy that fronts them
with hostnames instead of ports.

**Worktrees do not use these ports.** These `6010`–`6025` ports are the main checkout's; a git
worktree gets its own app-port block in the `7000` range (Postgres and Redis stay shared). See
[worktree-port-allocation.md](./worktree-port-allocation.md), which is the authority for the offsets —
this page is the authority for the canonical values.

## App ports

Six app ports, `6020`–`6025`, in a fixed order that worktree allocation preserves as relative
offsets:

| Service                    | Port     | Description                                                            | Env / config                                       |
| -------------------------- | -------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| **openthrottle-developer** | **6020** | React Router + Vite frontend; talks to the server for API + WebSocket. | `applications/openthrottle-developer/.env.default` |
| **openthrottle-server**    | **6021** | NestJS API: GraphQL (`/graphql`), REST, BullMQ Board (`/queues`).      | `applications/openthrottle-server/.env.default`    |
| **openthrottle-admin**     | **6022** | React Router + Vite admin portal.                                      | `applications/openthrottle-admin/.env.default`     |
| _(reserved)_               | **6023** | Slot kept so the six-port block and its offsets stay stable.           | —                                                  |
| **openthrottle-email**     | **6024** | React Router + Vite.                                                   | `applications/openthrottle-email/.env.default`     |
| **openthrottle-website**   | **6025** | React Router + Vite marketing site.                                    | `applications/openthrottle-website/.env.default`   |

If a React Router app's `PORT` is unset, Vite falls back to **3000** — which is why the `.env.default`
files set it explicitly.

## Backing services

| Service      | Port      | Notes                                                                                                   |
| ------------ | --------- | ------------------------------------------------------------------------------------------------------- |
| **Postgres** | **6010**  | `POSTGRES_PORT` in the server `.env.default`. Shared across worktrees; not proxied.                     |
| **Redis**    | **6011**  | `REDIS_PORT`, same file (BullMQ). Shared across worktrees; not proxied.                                 |
| **Ollama**   | **11434** | `OLLAMA_BASE_URL`, default `http://localhost:11434`. See [Ollama.md](./Ollama.md), `scripts/ollama.ts`. |

The GraphQL endpoint is `http://localhost:6021/graphql`. Tools and MCP clients should use the same
base URL as `openthrottle-server` rather than hardcoding a second one.

## Caddy reverse proxy (optional, already written)

`tools/caddy/` holds two ready Caddyfiles. Neither runs unless you start it — nothing in setup or
`docker compose` launches Caddy, so ignoring this section entirely is a supported way to work.

| File                               | Layout                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tools/caddy/Caddyfile`            | **Local domains.** `api.local`, `developer.local`, `admin.local`, `email.local`, `website.local`, `ollama.local`. |
| `tools/caddy/Caddyfile.path-based` | **Path-based.** One origin, `https://localhost/api`, `/developer`, `/ollama`.                                     |

```bash
caddy run --config tools/caddy/Caddyfile
```

- **Local domains is the better default.** Each app thinks it is at the root, so no base-path
  rewriting and no `vite base` config. The cost is `/etc/hosts` entries (or local DNS) pointing each
  `*.local` name at `127.0.0.1`.
- **Path-based needs app cooperation.** Apps may need a base path (`vite base: '/developer/'`), and
  the WebSocket and GraphQL paths have to stay consistent with it.
- **WebSocket passthrough is automatic** in Caddy's `reverse_proxy`, so GraphQL subscriptions work
  through either layout with no extra directives.
- **HTTPS.** Caddy can serve `.local` and `localhost` over HTTPS from its own local CA. Trust that CA
  (`caddy trust`) so browsers and `fetch` stop warning — see
  [tools/caddy/README.md](../../tools/caddy/README.md) § Local HTTPS and trust store.
- **Keep the ports in sync.** Both Caddyfiles hardcode `6020`–`6025` and `11434`. Change a port here
  and you must change it there.

## References

- Caddyfile docs: <https://caddyserver.com/docs/caddyfile>
- Ollama in this repo: [Ollama.md](./Ollama.md), `scripts/ollama.ts` (`pnpm run ollama:pull`), `databases/README.md`
- Server / developer config: `applications/openthrottle-server/.env.default`,
  `applications/openthrottle-developer/app/global/config/settings.ts`
