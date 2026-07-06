# applications/openthrottle/ — agent notes

Not an Nx project (no `package.json`). Two jobs: (1) the **consumer-install**
`docker-compose.yml` — runs published `openthrottle/*` images (server, developer, one-shot
`migrations`) on a clean machine with no repo build; (2) base-image Dockerfiles
(`Dockerfile.Postgres` with seeded schema, `Dockerfile.Redis`, `Dockerfile.Whisper`) that the
**root** dev `docker-compose.yml` also builds from by path.

- **Local dev never uses this compose file.** Dev Postgres/Redis come from the root
  `docker-compose.yml` via `pnpm run database:start` (ports 6010/6011).
- This compose file reads `./.env` (copy [`.env.default`](./.env.default)); default host
  ports are deliberately offset from dev: developer 9020, server 9021, Postgres 9010,
  Redis 9011. `OPENTHROTTLE_WORKSPACES_DIR` mounts local checkouts at `/workspaces`.
- Edit here only when changing the consumer install (services/env/image tags in
  `docker-compose.yml` + `.env.default`) or the shared base-image Dockerfiles.
- [README.md](./README.md)'s "Docker Compose" section predates the consumer-install rewrite
  (it still describes building from the monorepo root) — trust the compose file's own header.
