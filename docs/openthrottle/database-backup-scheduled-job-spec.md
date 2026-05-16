# Scheduled database backup (BullMQ)

Automated local Postgres backups via a dedicated BullMQ queue and repeatable job on **openthrottle-server**. The worker runs the same command as manual backup:

```bash
pnpm run database:backup
# → tsx ./scripts/openthrottle-database-backup.ts
```

Artifacts are written under `databases/backups/` (gitignored) as `openthrottle-YYYYMMDD-HHMMSS.zip` (plain SQL inside). See [databases/README.md](../../databases/README.md) and `scripts/openthrottle-database-backup.ts`.

## Prerequisites (host / container)

| Requirement               | Notes                                                                                                                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Postgres reachable**    | The server process must reach the DB using `POSTGRES_URL` or `POSTGRES_*` (same as the API). `pg_dump` runs in the backup script.                                                                                                                              |
| **`pg_dump` on PATH**     | Invoked by `scripts/openthrottle-database-backup.ts`. Install client tools in the server image or dev machine.                                                                                                                                                 |
| **`zip` on PATH**         | Used to compress the SQL dump before deleting the intermediate `.sql` file.                                                                                                                                                                                    |
| **`pnpm` on PATH**        | Processor spawns `pnpm run database:backup` from the monorepo root (not `tsx` directly), so workspace scripts and `tsx` resolution match local dev.                                                                                                            |
| **Monorepo root (`cwd`)** | Backup paths are relative to `process.cwd()` in the script (`databases/backups/`). The job must use **`WORKSPACE_ROOT`** when the API is not started from the repo root (Docker, systemd, etc.). Same variable as doc-ingestion and plans/workflow processors. |

## Environment contract

| Env var                          | Required                    | Default                 | Description                                                                                                                                                                                                                                                                                      |
| -------------------------------- | --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_BACKUP_CRON`           | Yes (to enable schedule)    | —                       | BullMQ cron pattern: **six fields** `sec min hour day month dow` (same as `DOC_INGESTION_CRON`). Example: `0 0 0 * * *` = once daily at **00:00:00**. If unset or empty, **no** repeatable job is registered on bootstrap.                                                                       |
| `DATABASE_BACKUP_TZ`             | No                          | _(none → UTC)_          | Optional [IANA time zone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) passed to BullMQ `repeat.tz` (e.g. `America/Los_Angeles`). When unset, the cron pattern is interpreted in **UTC** (BullMQ / cron-parser default). Set this for “local midnight” instead of UTC midnight. |
| `DATABASE_BACKUP_ENABLED`        | No                          | `true` when cron is set | Explicit kill switch: `false` / `0` skips repeatable registration even if `DATABASE_BACKUP_CRON` is set. Useful in shared `.env` files without removing the cron line.                                                                                                                           |
| `WORKSPACE_ROOT`                 | No                          | `process.cwd()`         | Absolute path to the monorepo root for `pnpm run database:backup`. **Required** when the server’s cwd is not the repo root.                                                                                                                                                                      |
| `DATABASE_BACKUP_JOB_TIMEOUT_MS` | No                          | `1800000` (30 min)      | BullMQ job timeout for a single backup run.                                                                                                                                                                                                                                                      |
| `POSTGRES_*` / `POSTGRES_URL`    | Yes (for backup to succeed) | —                       | Same as API; inherited by the child process via `process.env`.                                                                                                                                                                                                                                   |

**Opt-in semantics:** Scheduling is off unless `DATABASE_BACKUP_CRON` is non-empty after trim and `DATABASE_BACKUP_ENABLED` is not disabled. This mirrors [doc-ingestion](./doc-ingestion-job-spec.md) (`DOC_INGESTION_CRON`).

**Recommended production default (daily midnight UTC):**

```bash
export DATABASE_BACKUP_CRON="0 0 0 * * *"
# optional: export DATABASE_BACKUP_TZ="America/Los_Angeles"
```

**Local midnight in Pacific time:**

```bash
export DATABASE_BACKUP_CRON="0 0 0 * * *"
export DATABASE_BACKUP_TZ="America/Los_Angeles"
```

## Timezone semantics

- **Without `DATABASE_BACKUP_TZ`:** `0 0 0 * * *` means 00:00:00 **UTC** every day.
- **With `DATABASE_BACKUP_TZ`:** The same pattern is evaluated in that zone (BullMQ `repeat: { pattern, tz }`).
- **Do not** encode zone offsets in the cron string; use `DATABASE_BACKUP_TZ` for IANA zones and DST behavior.
- Backup file timestamps inside `openthrottle-database-backup.ts` use the **server’s local `Date`** at run time (filename `openthrottle-YYYYMMDD-HHMMSS`), independent of cron TZ.

## Queue design (implementation reference)

| Property           | Value                                     | Rationale                                                                                                       |
| ------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Queue name         | `Database Backup`                         | Human-readable; matches `Daily Stats`, `Doc Ingestion`.                                                         |
| Job name           | `database-backup`                         | Stable processor / logging identifier.                                                                          |
| Concurrency        | `1`                                       | Avoid overlapping `pg_dump` / disk spikes.                                                                      |
| Repeatable `jobId` | `openthrottle-database-backup-repeatable` | Stable id so redeploys upsert one schedule instead of duplicating (BullMQ `queue.add(..., { jobId, repeat })`). |
| Processor command  | `pnpm run database:backup`                | Uses root `package.json` script; cwd = `WORKSPACE_ROOT ?? process.cwd()`.                                       |

Overlap with long-running **Plans** / **Workflow** workers: use a **separate** queue module; do not route backups through plan/workflow queues.

## Bull Board and GraphQL

- Register the queue with `NestjsBullmqModule` and `NestjsBullmqBoardModule.forFeature` (same as daily-stats / doc-ingestion).
- Repeatable jobs appear in Bull Board and via `repeatableJobs(input: { queueName: "Database Backup" })`; remove with `removeRepeatableJob` using the returned `key`.

## Examples

**Enable daily backup at midnight UTC (typical staging):**

```bash
export DATABASE_BACKUP_CRON="0 0 0 * * *"
export WORKSPACE_ROOT="/path/to/openthrottle"
```

**Disable without unsetting cron (e.g. developer laptop):**

```bash
export DATABASE_BACKUP_CRON="0 0 0 * * *"
export DATABASE_BACKUP_ENABLED="false"
```

**Docker API container** (repo mounted at `/app`):

```bash
WORKSPACE_ROOT="/app"
DATABASE_BACKUP_CRON="0 0 0 * * *"
# Ensure image includes: pnpm, pg_dump, zip; Postgres host reachable from container network
```

## Related

- Manual backup: `pnpm run database:backup` (root `package.json`)
- Repeatable patterns: `applications/openthrottle-server/src/queues/doc-ingestion/doc-ingestion-repeatable.service.ts`, `daily-stats-repeatable.service.ts`
- Env parsing (implementation): `applications/openthrottle-server/src/queues/database-backup/database-backup.env.ts`
