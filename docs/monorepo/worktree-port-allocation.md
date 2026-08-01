# Per-worktree port allocation

Running OpenThrottle to build OpenThrottle means a worktree's dev servers would
otherwise fight the ports the main checkout already binds (`server` on `6021`,
`developer` on `6020`, …). Worktrees are the `n`: each gets its own coherent
**10-port block in the 7000 range**, so any number of them can run alongside the
main checkout.

This is wired into the **tool-agnostic worktree entrypoint**
([setup timing](git-worktree-setup-timing.md)): `scripts/create_worktree.sh`
allocates the block, and `scripts/setup_worktree.sh` rewrites the worktree's
`.env` files onto it. Creating a worktree any of the three ways —
`pnpm worktree:new <name>`, the Claude `WorktreeCreate` hook, or Cursor — runs
the same path, and a plain `git worktree add` self-heals on first `pnpm nx run …:dev`
via `scripts/ensure_worktree.sh`. See
[git-worktree-setup-timing.md](git-worktree-setup-timing.md) for the full flow.

## What gets offset (and what doesn't)

Only the **six app ports** are offset. The canonical layout (`6020`–`6025` in
`.env.default`) is preserved as relative offsets within the block:

| App       | Canonical | Worktree   |
| --------- | --------- | ---------- |
| developer | `6020`    | `base + 0` |
| server    | `6021`    | `base + 1` |
| admin     | `6022`    | `base + 2` |
| cms       | `6023`    | `base + 3` |
| email     | `6024`    | `base + 4` |
| website   | `6025`    | `base + 5` |

**Postgres (`6010`) and Redis (`6011`) are NOT offset.** Worktrees share the main
checkout's already-running database — see [Shared database](#shared-database).

A single random port wouldn't work: the six app ports cross-reference each other
by full URL (`CORS_ORIGINS`, `APP_URL_*`, `API_URL_INTERNAL`/`_EXTERNAL`,
`OPENTHROTTLE_WORKER_GRAPHQL_URL`), so the whole block must move together and
consistently.

## How the block is chosen

`scripts/worktree_ports.sh` (`resolve_worktree_ports`):

1. **Deterministic slot** from the worktree name: `7000 + (cksum(name) % 50) * 10`,
   giving blocks `7000, 7010, … 7490`. Same name → same block across re-setups.
2. **Collision bump**: if any of the six ports in the candidate block is already
   `LISTEN`ing, advance by 10 (up to `7990`) until a free block is found. This
   covers the rare case where two different worktree names hash to the same slot
   _and_ both are live.
3. **Cache pin**: the resolved base is written to `.worktree-ports` in the
   worktree so it stays stable even after a bumped allocation. (`.worktree-ports`
   is gitignored.)

The base is exported as `OT_PORT_BASE` plus
`OT_PORT_{DEVELOPER,SERVER,ADMIN,CMS,EMAIL,WEBSITE}`.

## The .env rewrite

After `setup_environment.sh` resets each `.env` from `.env.default` (back to
`6020`–`6025`), `setup_worktree.sh` remaps the six ports across the root `.env`
and every `applications/*/.env` in one `perl` pass. Because the `70xx` targets
never overlap the `60xx` sources, the rewrite is internally consistent and
idempotent (a second run finds no `602x` left). Exact word-boundary matches leave
Postgres/Redis (`6010`/`6011`) and incidental comment numbers (`6012`,
`604800000`) untouched.

Host `nx dev` needs nothing further — it reads the rewritten `.env` directly.

## Shared database

The decided model is **shared DB**: worktrees connect to the main checkout's
Postgres/Redis on `localhost:6010`/`6011` rather than running their own. This is
the lightest option and avoids one container set per worktree.

> ⚠️ Trade-off: a worktree branch with **divergent migrations** mutates the shared
> schema. If you're iterating on migrations in a worktree, expect to reset/rebuild
> the local DB, or switch that worktree to its own Postgres (not the default).

## docker compose in a worktree

The `.env` rewrite covers host `nx dev`. For `docker compose`, two more things
would collide, so `setup_worktree.sh` also:

- Appends `COMPOSE_PROJECT_NAME=openthrottle-<slug>` and
  `OT_CONTAINER_PREFIX=wt-<slug>-` to the worktree `.env`. The prefix feeds the
  parametrized `container_name: ${OT_CONTAINER_PREFIX:-}<svc>` values in
  `docker-compose.yml` (empty prefix → the main checkout's names are unchanged).
- Generates `docker-compose.worktree.yml` (gitignored), an override that:
  - puts `postgres`/`redis` in a `disabled` profile so they don't start (and
    don't fight `6010`/`6011` or clobber the shared data), and
  - clears `server`/`server-dev` `depends_on` with `!reset` and points
    `POSTGRES_HOST`/`REDIS_HOST` at `host.docker.internal` so the apps use the
    host DB. (`!reset` needs Docker Compose ≥ 2.24.)

Bring up a worktree's apps with both files:

```bash
docker compose -f docker-compose.yml -f docker-compose.worktree.yml up              # prod profile
docker compose -f docker-compose.yml -f docker-compose.worktree.yml --profile dev up # hot reload
```

## Service-account tokens

`setup_environment.sh` resets every `.env` from `.env.default`, which ships
**placeholder** service-account tokens (`ot_sa_xxx…`). The `.mcp.json` launcher
does `source ./.env` from the worktree root, so a placeholder
`OPENTHROTTLE_MCP_AUTH_TOKEN` makes every authenticated `openthrottle-mcp` call
return `Unauthorized`.

So at the end of setup, `setup_worktree.sh` copies the real (non-placeholder)
`OPENTHROTTLE_MCP_AUTH_TOKEN` and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` from
the **source checkout** (the repo the worktree was created from — exported as
`OT_SOURCE_REPO`, or derived via `git --git-common-dir` for a standalone run)
into the worktree's root `.env` and `applications/openthrottle-server/.env`.
Empty/placeholder source values are skipped, and the secret is never echoed.

## openthrottle-mcp server targeting (stable-first)

MCP plan/task CRUD is **checkout-agnostic**: every checkout shares the host
Postgres, so reads and writes land in the same data no matter which server
answers. Which server the MCP talks to is therefore purely a
liveness/resilience choice — and `scripts/run-openthrottle-mcp.sh` resolves
**stable-first**: the main checkout's server (root `.env`
`OPENTHROTTLE_SERVER_APP_URL`), then a running docker `server` container, then
this worktree's server, then the canonical `http://localhost:6021`. Restarting
a worktree's server-under-test never interrupts MCP tooling because the MCP
isn't pointed at it in the first place.

Set `OT_MCP_TARGET=worktree` to prefer this worktree's server instead (e.g.
when exercising server changes through the MCP itself); the stable server
remains the fallback.

Execution isolation is deliberately **not** handled here: which worker executes
a plan run is decided by the per-checkout BullMQ queue prefix
(`OT_QUEUE_PREFIX` / derived from `OT_CONTAINER_PREFIX` — see
`@openthrottle/nestjs-bullmq`), not by MCP server targeting.

## Files

- `scripts/worktree_ports.sh` — allocation helper (sourced, not executed).
- `scripts/create_worktree.sh` — the single create+provision entrypoint (`pnpm worktree:new`, Claude hook, Cursor); resolves + exports the block after creating the worktree.
- `scripts/ensure_worktree.sh` — lazy self-heal guard; provisions a plain `git worktree add` on first `dev`.
- `scripts/setup_worktree.sh` — rewrites `.env`, writes the compose vars, generates the override.
- `docker-compose.yml` — `container_name` values parametrized with `OT_CONTAINER_PREFIX`.

## See also

- [git-worktree-setup-timing.md](git-worktree-setup-timing.md) — the single entrypoint, self-heal guard, and setup ordering.
- [local-services-and-ports.md](local-services-and-ports.md) — the canonical `6010`–`6025` port map.
