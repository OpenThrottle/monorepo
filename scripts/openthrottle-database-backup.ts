#!/usr/bin/env node

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { join } from 'node:path';
import { closeSync, openSync } from 'node:fs';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/**
 * @description Backs up the OpenThrottle Postgres database to a timestamped zip file.
 * Uses POSTGRES_URL or POSTGRES_* env vars. Requires openthrottle Postgres to be running (e.g. docker-compose).
 * Writes to databases/backups/openthrottle-YYYYMMDD-HHMMSS.zip (plain SQL inside).
 *
 * When the docker-compose `postgres` service is running, pg_dump executes
 * inside the container so the client version always matches the server
 * (a host pg_dump older than the server — e.g. Homebrew 17 vs Postgres 18 —
 * aborts with a server version mismatch). Falls back to the host pg_dump
 * when the container is not available.
 */

const BACKUPS_DIR = join(process.cwd(), 'databases', 'backups');

/**
 * The docker-compose *service* name. The running *container* is named by
 * compose (`<project>-postgres-1`), so we resolve it via the service label
 * rather than assuming `docker exec postgres` works.
 */
const POSTGRES_SERVICE = 'postgres';

/** Default number of scheduled backups to retain when the env var is unset. */
const DEFAULT_BACKUP_RETENTION_COUNT = 14;

/** Matches only generated backup archives — never seed*.sql or other files. */
const BACKUP_ARCHIVE_PATTERN = /^openthrottle-\d{8}-\d{6}\.zip$/;

/**
 * @description Resolves the retention count from `DATABASE_BACKUP_RETENTION_COUNT`
 * (positive integer), falling back to {@link DEFAULT_BACKUP_RETENTION_COUNT}.
 */
export function resolveBackupRetentionCount(
  raw: string | undefined = process.env.DATABASE_BACKUP_RETENTION_COUNT,
): number {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_BACKUP_RETENTION_COUNT;
  }
  const parsed = Number.parseInt(raw.trim(), 10);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_BACKUP_RETENTION_COUNT;
}

/**
 * @description Pure selection: given a directory listing, returns the backup
 * archives to delete so only the `keep` most recent remain. Only
 * `openthrottle-YYYYMMDD-HHMMSS.zip` files are considered — seed*.sql and any
 * other file are always excluded. The timestamped name sorts chronologically,
 * so a descending sort keeps the newest.
 */
export function selectBackupsToPrune(
  filenames: readonly string[],
  keep: number,
): string[] {
  const archives = filenames
    .filter((name) => BACKUP_ARCHIVE_PATTERN.test(name))
    .sort()
    .reverse();

  return keep <= 0 ? archives : archives.slice(keep);
}

/**
 * @description Deletes backup archives beyond the retention window. Never touches
 * non-archive files (seed*.sql, etc.). Best-effort: logs and continues on error.
 */
async function pruneOldBackups(dir: string, keep: number): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }

  const toDelete = selectBackupsToPrune(entries, keep);
  await Promise.all(
    toDelete.map((name) => unlink(join(dir, name)).catch(() => {})),
  );

  if (toDelete.length > 0) {
    console.log(
      `Pruned ${toDelete.length} old backup(s), keeping the ${keep} most recent.`,
    );
  }
}

function timestamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');

  return `${y}${m}${day}-${h}${min}${s}`;
}

/**
 * @description Resolves the running container ID for the compose `postgres`
 * service via its compose label, or null when no such container is running.
 * Uses the label rather than a hardcoded name because compose names the
 * container `<project>-postgres-1`, not `postgres`.
 */
function resolvePostgresContainerId(): string | null {
  const ps = spawnSync(
    'docker',
    [
      'ps',
      '-q',
      '--filter',
      `label=com.docker.compose.service=${POSTGRES_SERVICE}`,
    ],
    { encoding: 'utf8', shell: false },
  );

  const id = ps.status === 0 ? ps.stdout.trim().split('\n')[0] : '';

  return id === '' ? null : id;
}

function dumpViaContainer(containerId: string, sqlPath: string): number | null {
  const sqlFile = openSync(sqlPath, 'w');

  try {
    // POSTGRES_USER / POSTGRES_DB are expanded by the container's shell from
    // the container's own environment (set via docker-compose).
    const pgDump = spawnSync(
      'docker',
      [
        'exec',
        containerId,
        'sh',
        '-c',
        'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F p',
      ],
      { shell: false, stdio: ['ignore', sqlFile, 'inherit'] },
    );

    return pgDump.status;
  } finally {
    closeSync(sqlFile);
  }
}

function dumpViaHost(connectionString: string, sqlPath: string): number | null {
  const pgDump = spawnSync(
    'pg_dump',
    ['--dbname', connectionString, '-F', 'p', '-f', sqlPath],
    { shell: false, stdio: 'inherit' },
  );

  return pgDump.status;
}

async function main(): Promise<void> {
  const connectionString = getPostgresUrl();
  await mkdir(BACKUPS_DIR, { recursive: true });

  const ts = timestamp();
  const sqlPath = join(BACKUPS_DIR, `openthrottle-${ts}.sql`);
  const zipPath = join(BACKUPS_DIR, `openthrottle-${ts}.zip`);

  const containerId = resolvePostgresContainerId();
  const dumpStatus = containerId
    ? dumpViaContainer(containerId, sqlPath)
    : dumpViaHost(connectionString, sqlPath);

  if (dumpStatus !== 0) {
    await unlink(sqlPath).catch(() => {});
    throw new Error(
      `pg_dump (${containerId ? 'container' : 'host'}) exited with code ${dumpStatus}`,
    );
  }

  const zipResult = spawnSync('zip', ['-j', zipPath, sqlPath], {
    shell: false,
    stdio: 'inherit',
  });

  if (zipResult.status !== 0) {
    await unlink(sqlPath).catch(() => {});
    throw new Error(`zip exited with code ${zipResult.status}`);
  }

  await unlink(sqlPath);

  console.log('Backup written to:', zipPath);

  await pruneOldBackups(BACKUPS_DIR, resolveBackupRetentionCount());
}

// Only auto-run when executed directly (so tests can import the pure helpers
// without triggering a backup).
const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  import.meta.url === pathToFileURL(invokedPath).href
) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
