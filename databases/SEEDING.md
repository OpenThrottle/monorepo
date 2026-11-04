# Seeding an OpenThrottle database from a dump

Provider-agnostic runbook for loading an existing dataset into a **fresh** OpenThrottle database.
Everything here is parameterised on `POSTGRES_HOST` / `POSTGRES_PORT` / credentials, so the same
procedure stands up a Hetzner box, a GCP Cloud SQL instance, a local container, or a scratch database
for a restore drill.

**This is a copy, not a cutover.** Nothing here drops, disables or drains the source. That is
deliberate: it keeps rolling back to the previous deployment a DNS change rather than a restore.

Verification is a script, not a checklist:

```bash
POSTGRES_HOST=… POSTGRES_PORT=… POSTGRES_USER=… POSTGRES_PASSWORD=… POSTGRES_DB=… \
  databases/verify-restore.sh
```

## 1. Decide which source is authoritative

The root `docker-compose.yml` mounts **exactly one** of two Postgres volumes, and they hold
**different data**:

| Volume                       | Contents                            |
| ---------------------------- | ----------------------------------- |
| `postgres_data`              | 🌱 the fresh / public demo database |
| `postgres_data_dev_personal` | 🔒 the pre-public personal archive  |

Check which one is live before dumping anything — the mount toggle is commented in the `postgres`
service's `volumes:` block, and taking a dump from the wrong one produces a plausible-looking
database with the wrong contents. See `databases/README.md` § "Local Postgres volumes".

> ⚠️ Never `docker compose down -v`. It destroys **both** volumes, including the personal archive.
> Use `docker compose stop postgres` to swap safely.

## 2. Produce a dump

```bash
pnpm run database:backup
```

Writes `databases/backups/openthrottle-YYYYMMDD-HHMMSS.zip` — a **zip containing plain SQL**, not a
`.sql.gz` and not a `pg_dump` custom-format archive. It keeps the 14 most recent by default
(`DATABASE_BACKUP_RETENTION_COUNT`).

Plain SQL matters for what follows: restore with `psql`, not `pg_restore`.

To dump a remote source instead, point the same `POSTGRES_*` variables at it.

## 3. Prepare the target

The target needs its schema before data lands. On a deployed box the `migrations` container does
this automatically as part of `docker compose up` (the server waits on
`service_completed_successfully`). Elsewhere:

```bash
POSTGRES_HOST=… POSTGRES_PORT=… pnpm run database:migrate
```

Confirm the two extensions exist — `vector` and `pg_trgm` are created by the migrations, and this is
worth checking rather than assuming, because **a managed Postgres and a self-hosted pgvector image
fail differently here**. Managed offerings restrict which extensions may be created at all, while a
self-hosted image can install the extension and still fail to load a mismatched `vector.so`.
`verify-restore.sh` exercises both rather than just reading `pg_extension`.

## 4. Restore

⚠️ **The restoring `psql` must be the same major version as the dump (18).** A PG18 `pg_dump`
emits `\restrict` / `\unrestrict` meta-commands, and an older `psql` fails on them at line 5 with
`invalid command \restrict`. A deployed box has no host Postgres client at all, so run `psql` inside
the container, which matches by construction:

```bash
unzip -p databases/backups/openthrottle-YYYYMMDD-HHMMSS.zip > /tmp/openthrottle.sql

docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql --host localhost --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
       --set ON_ERROR_STOP=on -q < /tmp/openthrottle.sql
```

Off-box, against a remote target, use a matching client the same way:

```bash
docker run --rm -i -e PGPASSWORD="$POSTGRES_PASSWORD" pgvector/pgvector:0.8.2-pg18-trixie \
  psql --host "$POSTGRES_HOST" --port "$POSTGRES_PORT" \
       --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
       --set ON_ERROR_STOP=on -q < /tmp/openthrottle.sql
```

### `ON_ERROR_STOP=on` is necessary but NOT sufficient

Set it — without it `psql` skips failing statements and still exits 0.

But it does **not** catch everything. This was observed, not theorised: restoring a PG18 dump with a
17.2 `psql` failed on `\restrict` at line 5, restored **nothing at all**, and **still exited 0**.
`ON_ERROR_STOP` governs SQL errors, not meta-command parse errors.

So a zero exit status from `psql` is not evidence of a successful restore. **Always run step 5.** The
verifier caught this exact case when the exit code did not.

## 5. Verify

```bash
databases/verify-restore.sh
```

It checks four things, and the fourth is the one that matters most:

1. **Server version** is Postgres 18 — the data directory layout differs between 17 and 18
   (`/var/lib/postgresql` vs `/var/lib/postgresql/data`), and mounting the 17 path on 18 silently
   yields an empty cluster.
2. **`vector` and `pg_trgm` are usable**, by running a distance operator and `similarity()` rather
   than trusting `pg_extension`.
3. **The `schema_migrations` ledger** came across, so `database:migrate` and the migrations image
   are a no-op rather than re-applying every migration once.
4. **Embeddings survived** — non-null, with the expected dimensionality, and answering a real
   nearest-neighbour query. **A row count cannot catch this.** Rows restore with the right count and
   `NULL` embeddings, every table matches, and `semantic_search` then returns nothing. The script
   fails loudly on precisely that case.

Compare row counts against the source by diffing two runs:

```bash
# against the source
… databases/verify-restore.sh --counts-only > /tmp/source-counts.txt
# against the target
… databases/verify-restore.sh --counts-only > /tmp/target-counts.txt
diff /tmp/source-counts.txt /tmp/target-counts.txt
```

Then confirm the application layer agrees, since that exercises the embedding column through the code
path that actually matters:

```bash
# via the OT MCP, or a GraphQL query against the target
semantic_search "hetzner deployment"
```

## 6. Provision credentials (manual, once)

A restore brings data but not necessarily the credentials a _new_ deployment needs.

```bash
docker compose run --rm bootstrap
```

Idempotent, and deliberately never automatic — `up` must never silently provision a possibly-shared
database. See
[`infra/applications/openthrottle_hcloud/SECRETS.md`](../infra/applications/openthrottle_hcloud/SECRETS.md)
for passing tokens into that one invocation without putting them in `user_data`.

## ⚠️ The ledger decides what the first deploy re-applies

**Read this before restoring into anything you care about.**

Every migration entrypoint runs the same `schema_migrations` ledger
([`databases/migration-runner.ts`](./migration-runner.ts)):

| Entrypoint                                    | Used by                           | Ledger?                                  |
| --------------------------------------------- | --------------------------------- | ---------------------------------------- |
| `scripts/openthrottle-database-migrations.ts` | `pnpm run database:migrate`       | **Yes** — `schema_migrations`, once each |
| `databases/migrate.ts`                        | `Dockerfile.Migrations` → the box | **Yes** — the same ledger                |

So whether the next `docker compose up` touches restored data depends only on whether the dump
carried the ledger:

- **Dump with a ledger** (any database migrated by `database:migrate` or a ledger-era image): the
  runner applies only the files the ledger does not record. Nothing already applied runs again.
- **Dump without a ledger, or with an empty one**: the first run is the one-time cut-over. It applies
  **every** migration once, in order, records each, and from then on applies only new files. That
  is one last run of what the old ledgerless image did on every deploy.

Migrations are written to converge, so the cut-over is safe for schema: DDL uses `IF NOT EXISTS`,
and data backfills such as `069_backfill_work_ledger_from_commit_links.sql` guard with
`WHERE NOT EXISTS`. Two things still change on that one run:

- **Default RBAC grants come back.** The permission seeds (`034`, `045`, `085`, `092`, …) insert
  `role_permissions` rows with `ON CONFLICT DO NOTHING`, so a default grant an admin had revoked is
  re-inserted once. Re-check role permissions after the first deploy against restored data.
- The one-off `visormatt` author/assignee normalizations (`010`, `013`) used to reset every plan's
  author and assignee on each run. They are retired as no-ops, so the cut-over no longer touches
  them.

Take a snapshot **before** the first deploy against restored data, not after, and run
`verify-restore.sh` first: its ledger check tells you which of the two cases you are in.

Date-scoped backfills are fine — `057_redate_completed_at_from_plan_output_stream.sql` is pinned to
`DATE '2026-07-10'`, so it cannot touch anything else.
