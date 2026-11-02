# Per-worktree port allocation

Running OpenThrottle to build OpenThrottle means a worktree's dev servers would
otherwise fight the ports the main checkout already binds (`server` on `6021`,
`developer` on `6020`, …). Worktrees are the `n`: each gets its own coherent
**10-port block in the 7000 range**, so any number of them can run alongside the
main checkout.

This is wired into **OpenThrottle's worktree provisioner**,
`scripts/setup_worktree.ts` (run by bare Node — native type stripping, no tsx): it
allocates the block and rewrites the worktree's `.env` files onto it. The
provisioner is not called directly — the portable
[`ot-worktree`](../../skills/ot-worktree/SKILL.md) skill discovers and runs it.
Creating a worktree any of the three ways — `pnpm worktree:new <name>`, the
Claude `WorktreeCreate` hook, or Cursor — runs the same path, and a plain
`git worktree add` self-heals on first `pnpm nx run …:dev` via
`pnpm worktree:heal`.

## What gets offset (and what doesn't)

Only the **six app ports** are offset. The canonical layout (`6020`–`6025` in `.env.default` — see
[local-services-and-ports.md](./local-services-and-ports.md), the authority for those values) is
preserved as relative offsets within the block. `6023` has no app; the slot is held so the offsets
stay stable:

| App        | Canonical | Worktree   |
| ---------- | --------- | ---------- |
| developer  | `6020`    | `base + 0` |
| server     | `6021`    | `base + 1` |
| admin      | `6022`    | `base + 2` |
| _reserved_ | `6023`    | `base + 3` |
| email      | `6024`    | `base + 4` |
| website    | `6025`    | `base + 5` |

**Postgres (`6010`) and Redis (`6011`) are NOT offset by default.** Worktrees share the main
checkout's already-running database — see [Shared database](#shared-database). A worktree
that opts into its own database gets `base + 8` / `base + 9` instead
([Isolated mode](#isolated-mode-pnpm-worktreedb-isolate)).

A single random port wouldn't work: the six app ports cross-reference each other
by full URL (`CORS_ORIGINS`, `APP_URL_*`, `API_URL_INTERNAL`/`_EXTERNAL`,
`OPENTHROTTLE_WORKER_GRAPHQL_URL`), so the whole block must move together and
consistently.

## How the block is chosen

`scripts/utils/worktree-ports.ts` (`resolveWorktreePorts`):

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

After `setup_environment.ts` resets each `.env` from `.env.default` (back to
`6020`–`6025`), `setup_worktree.ts` remaps the six ports across the root `.env`
and every `applications/*/.env` in one `perl` pass. Because the `70xx` targets
never overlap the `60xx` sources, the rewrite is internally consistent and
idempotent (a second run finds no `602x` left). Exact word-boundary matches leave
Postgres/Redis (`6010`/`6011`) and incidental comment numbers (`6012`,
`604800000`) untouched.

Host `nx dev` needs nothing further — it reads the rewritten `.env` directly.

## Shared database

The decided model is **shared DB**: worktrees connect to the main checkout's
Postgres/Redis on `localhost:6010`/`6011` rather than running their own. This is
the lightest option and avoids one container set per worktree. It is the default and it is
**enforced**: the runtime follows the marker below, and a branch that would change the shared
schema is stopped at the [migration guard](#migration-guard-shared-mode).

### The `OT_WORKTREE_DB` marker

One marker is the single runtime signal for "which database does this checkout use":

| `OT_WORKTREE_DB` | Meaning                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| _absent_         | The primary checkout. Owns its Postgres/Redis.                            |
| `shared`         | A provisioned worktree using the primary's database (the default).        |
| `isolated`       | A worktree with its own database (`pnpm worktree:db isolate`, see below). |

`scripts/setup_worktree.ts` writes `OT_WORKTREE_DB=shared` into the root and
`applications/openthrottle-server/.env`. Worktrees provisioned before the marker
existed are backfilled by `scripts/heal_worktree.ts` (the ot-worktree **heal hook**,
run by `pnpm worktree:heal` before every `dev`). Git detection of "is this a linked
worktree" lives only in heal/provision, which decide whether to write the marker;
everything at runtime reads the marker — `database:start`/`database:stop`
(`scripts/openthrottle-database-lifecycle.ts`) and the server's "does this checkout own repeatables" gate
(`applications/openthrottle-server/src/queues/repeatable-job.owner.ts`): every repeatable
job (work-ledger sweep/verify/harvest, daily stats, doc ingestion, data retention, plan-runs
stale sweep, and the scheduled-agent-jobs boot reconcile) registers only when that check says
owner — `shared` is not, `isolated` and an absent marker are. A non-owner logs one line naming
the reason and registers nothing, so a shared-DB worktree never runs duplicates against the
primary's data. `OT_SCHEDULED_JOBS_OWNER` stays as the explicit override. That gate, plus the
per-worktree queue prefix, is why `pnpm nx run openthrottle-server:dev` (`PROCESS_ROLE=all`) is
safe in a worktree; there is no rule to boot `dev-api` instead. Use `dev-api` (or
`worktree:serve server --api-only`) only when you do not want processors running.

With `OT_WORKTREE_DB=shared`:

- `pnpm run database:start` is a no-op when the shared Postgres/Redis answer on
  `POSTGRES_PORT`/`REDIS_PORT` (it prints where they live). If they are down it starts
  the **primary's** containers on its behalf — the primary's `docker-compose.yml`,
  `--project-directory` and compose project, never the worktree's own compose file —
  so a worktree never creates containers under its own compose project.
- `pnpm run database:stop` never stops the shared database (it says so and exits 0).
- `pnpm run database:migrate` keeps working against the shared database.

The primary checkout (marker absent) runs the original `docker compose up -d redis
postgres` / `docker compose down --remove-orphans` unchanged.

### Migration guard (shared mode)

A branch that adds `databases/migrations/1xx_*.sql` must never apply it to the shared
database (drift detection is warn-only, an abandoned branch leaves tables behind, number
collisions land in real data). With `OT_WORKTREE_DB=shared`, `pnpm run database:migrate`
and `monorepo:ensure-migrations` (the gate under `dev-api`/`dev`) **refuse**, before
touching the database, when any migration file in the checkout is absent from the local
`origin/main` ref:

```
this branch adds migrations <files>; a shared-DB worktree cannot apply them. Run `pnpm worktree:db isolate`.
```

Fetching is the caller's job (`git fetch origin main`); a missing `origin/main` ref fails
closed with its own message. Migrations already on `origin/main` apply normally, so a
worktree branched off a newer main than the primary still works. The primary and isolated
checkouts are never guarded.

### Isolated mode: `pnpm worktree:db isolate`

When a branch needs its own schema, give the worktree its own database. Switching is
explicit, never automatic — it moves the worktree off your data, starts containers and
rewrites `.env`:

```bash
pnpm worktree:db isolate              # an existing worktree
pnpm worktree:new <name> --own-db     # at create time: the same code path
```

It allocates `POSTGRES_PORT`/`REDIS_PORT` at **base+8/base+9** of the worktree's existing
10-wide block (offsets 0–6 are app ports; the block derivation is unchanged, so on-disk
worktrees keep their ports) with the same free-port bump as the app block (a whole block
at a time), writes them and every derived value (`POSTGRES_URL`) into the root and per-app
`.env` files, sets `OT_WORKTREE_DB=isolated`, regenerates `docker-compose.worktree.yml`
without the disabled postgres/redis, and starts the worktree's own containers under its own
compose project (`openthrottle-<slug>`). It then applies every migration, runs
`database:bootstrap-default-user` (developer@openthrottle.ai, with admin), and runs
`database:bootstrap-service-accounts` so the service-account bearers the worktree's `.env`
carries (copied from the source checkout) verify against the fresh database. The shared
database is **not** cloned (slow, and it may carry the personal-archive volume). Running it
again on an isolated worktree is a no-op; if seeding fails part-way it prints the recovery
commands (`database:start`, `database:migrate`, `database:bootstrap-default-user`,
`database:bootstrap-service-accounts`).

`database:start`/`database:stop` then act on the worktree's own containers (`stop` keeps
the data). `pnpm worktree:remove` runs `.worktree/teardown.sh`, which for an isolated
worktree stops and removes the containers **and volumes** (`compose down --volumes`); a
shared worktree's teardown never touches the shared database.

`worktree:new --own-db` reaches the provisioner through the ot-worktree contract's only
channel, an exported environment variable (`OPENTHROTTLE_WORKTREE_OWN_DB=1`).

### Orphaned queue keys: `pnpm worktree:prune-queues`

A shared worktree's BullMQ queues live in the primary's Redis under its own prefix
(`bull:wt-<slug>`), and teardown deletes that prefix. Worktrees removed before teardown did
that, or removed with a bare `git worktree remove` (which skips teardown), left their keys
behind. List and clear them with:

```bash
pnpm worktree:prune-queues           # dry run: orphaned prefixes and key counts, deletes nothing
pnpm worktree:prune-queues --apply   # delete each orphan's bull:wt-<slug>:* keys
```

A prefix is orphaned when no entry in `git worktree list` claims it — each listed worktree
protects both the prefix its `.env` resolves to and the `bull:wt-<basename>` provisioning
derives from its directory name. The bare `bull` prefix (the primary's queues) is never a
candidate, deletion uses the colon-anchored pattern so `bull:wt-a` cannot take `bull:wt-a-b`
with it, and if `git worktree list` cannot be read it refuses rather than treating every
prefix as orphaned. Redis is the primary checkout's (`REDIS_*` from its `.env`), whichever
checkout you run it from.

## Running the stack: `pnpm worktree:serve`

A worktree runs its own server and developer app on its own port block. To run one from an
agent shell (where a backgrounded `dev` is reaped with the shell, and an unscoped kill can hit
the primary's server), use the helper:

```bash
pnpm worktree:serve server                 # openthrottle-server:dev, detached; blocks until the port listens
pnpm worktree:serve server --api-only      # openthrottle-server:dev-api (no processors)
pnpm worktree:serve developer              # openthrottle-developer:dev
pnpm worktree:serve --stop [server|developer]
```

It logs to `.worktree/logs/<target>.log` with a pidfile beside it, waits for the worktree's
`OPENTHROTTLE_SERVER_PORT` / `OPENTHROTTLE_DEVELOPER_PORT` (`--timeout=<seconds>`, default 300),
and prints a ready-to-run `curl` probe; the server probe uses the worktree's own service-account
bearer, read from its `.env` at run time, never echoed. `--stop` signals only the pidfile's
process group and processes whose cwd is inside the worktree, and reaps a stale Nx
`Waiting for … in another nx process` lock. It refuses in the primary checkout (no
`OT_WORKTREE_DB` marker). Verify a worktree's server and UI through the URLs it prints, not
the primary's `6020`/`6021`.

Caveat: running `developer` dirties the tracked `applications/openthrottle-developer/app/__generated__/*`
(codegen-watch output is unformatted). Unless your change is meant to alter generated output,
restore those files before committing.

## docker compose in a worktree

The `.env` rewrite covers host `nx dev`. For `docker compose`, two more things
would collide, so `setup_worktree.ts` also:

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

`setup_environment.ts` resets every `.env` from `.env.default`, which ships
**placeholder** service-account tokens (`ot_sa_xxx…`). The `.mcp.json` launcher
does `source ./.env` from the worktree root, so a placeholder
`OPENTHROTTLE_MCP_AUTH_TOKEN` makes every authenticated `openthrottle-mcp` call
return `Unauthorized`.

So at the end of setup, `setup_worktree.ts` copies the real (non-placeholder)
`OPENTHROTTLE_MCP_AUTH_TOKEN` and `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` from
the **source checkout** (the repo the worktree was created from — exported as
`OPENTHROTTLE_SOURCE_REPO`, or derived via `git --git-common-dir` for a standalone run)
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

- `scripts/utils/worktree-ports.ts` — allocation helper (imported by the provisioner).
- `skills/ot-worktree/scripts/create.sh` — the create action (`pnpm worktree:new`, Claude hook, Cursor); creates the worktree, then hands off to the repo provisioner.
- `skills/ot-worktree/scripts/heal.sh` — the heal action (`pnpm worktree:heal`); provisions a plain `git worktree add` on first `dev`.
- `skills/ot-worktree/scripts/destroy.sh` — the destroy action (`pnpm worktree:remove`); teardown hook, `git worktree remove`, prune.
- `scripts/utils/worktree-db.ts` — the `OT_WORKTREE_DB` marker: mode resolution, write and backfill.
- `scripts/openthrottle-database-lifecycle.ts` — `database:start` / `database:stop`, marker-aware.
- `scripts/heal_worktree.ts` — the heal hook that backfills the marker onto pre-existing worktrees.
- `scripts/worktree_db.ts` / `scripts/utils/worktree-db-isolate.ts` — `pnpm worktree:db isolate` (also run by `worktree:new --own-db`).
- `scripts/utils/migration-guard.ts` — the shared-mode migration guard behind `database:migrate` and `ensure-migrations`.
- `scripts/worktree_prune_queues.ts` / `scripts/utils/worktree-queue-keys.ts` — `pnpm worktree:prune-queues`; the util also backs teardown's queue-key cleanup.
- `scripts/worktree_serve.ts` / `scripts/utils/worktree-serve.ts` — `pnpm worktree:serve` (run, wait, probe, stop).
- `scripts/utils/worktree-compose.ts` — the generated `docker-compose.worktree.yml` (shared vs isolated).
- `scripts/setup_worktree.ts` — **OpenThrottle's provisioner** (executable, run by bare Node with native type stripping), found by the skill's third discovery rung. Allocates the port block, rewrites `.env`, writes the compose vars, generates the override.
- `docker-compose.yml` — `container_name` values parametrized with `OT_CONTAINER_PREFIX`.

## See also

- [local-services-and-ports.md](local-services-and-ports.md) — the canonical `6010`–`6025` port map.
