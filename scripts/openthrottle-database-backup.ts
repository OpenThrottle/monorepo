#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync } from 'node:fs';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';

import type { DatabaseDefinition } from '../databases/database-registry.ts';
import {
  databaseNameOf,
  DATABASES,
  parseDatabaseFlag,
  resolveDatabaseUrl,
  selectDatabases,
} from '../databases/database-registry.ts';
import { resolvePrimaryComposeProject } from './openthrottle-database-lifecycle.ts';
import { readEnvFile } from './utils/env.ts';
import { createLogger } from './utils/index.ts';

const logger = createLogger();

/**
 * @description Backs up every database in `databases/database-registry.ts` to
 * its own timestamped zip file (`--database <name>` backs up just one).
 * Uses POSTGRES_URL or POSTGRES_* env vars for the primary; the others derive
 * from it. Requires Postgres to be running (e.g. docker-compose).
 * Writes to databases/<db>/backups/<db>-YYYYMMDD-HHMMSS.zip (plain SQL inside)
 * and keeps DATABASE_BACKUP_RETENTION_COUNT archives per database.
 *
 * When the docker-compose `postgres` service is running, pg_dump executes
 * inside the container so the client version always matches the server
 * (a host pg_dump older than the server — e.g. Homebrew 17 vs Postgres 18 —
 * aborts with a server version mismatch). Only THIS checkout's compose
 * project counts (an isolated worktree runs its own); with none running it
 * falls back to the host pg_dump rather than another project's container.
 */

/** Where `database`'s archives go: `databases/<db>/backups` under `root`. */
export function backupsDirFor(
  database: DatabaseDefinition,
  root: string = process.cwd(),
): string {
  return join(root, 'databases', database.name, 'backups');
}

/**
 * The docker-compose *service* name. The running *container* is named by
 * compose (`<project>-postgres-1`), so we resolve it via the service label
 * rather than assuming `docker exec postgres` works.
 */
const POSTGRES_SERVICE = 'postgres';

/** Default number of scheduled backups to retain when the env var is unset. */
const DEFAULT_BACKUP_RETENTION_COUNT = 14;

/** Matches only `database`'s generated backup archives — never seed*.sql or other files. */
function backupArchivePattern(database: string): RegExp {
  return new RegExp(`^${database}-\\d{8}-\\d{6}\\.zip$`);
}

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
 * `<database>-YYYYMMDD-HHMMSS.zip` files are considered — seed*.sql and any
 * other file are always excluded. The timestamped name sorts chronologically,
 * so a descending sort keeps the newest.
 */
export function selectBackupsToPrune(
  filenames: readonly string[],
  keep: number,
  database: string = 'openthrottle',
): string[] {
  const pattern = backupArchivePattern(database);
  const archives = filenames
    .filter((name) => pattern.test(name))
    .sort()
    .reverse();

  return keep <= 0 ? archives : archives.slice(keep);
}

/**
 * @description Deletes backup archives beyond the retention window. Never touches
 * non-archive files (seed*.sql, etc.). Best-effort: logs and continues on error.
 */
async function pruneOldBackups(
  dir: string,
  keep: number,
  database: string,
): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }

  const toDelete = selectBackupsToPrune(entries, keep, database);
  await Promise.all(
    toDelete.map((name) => unlink(join(dir, name)).catch(() => {})),
  );

  if (toDelete.length > 0) {
    logger.info(
      `Pruned ${toDelete.length} old ${database} backup(s), keeping the ${keep} most recent.`,
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

/** What {@link selectPostgresContainerId} needs from `docker ps`. */
export interface DockerPsResult {
  readonly status: number | null;
  readonly stdout: string;
}

/** Runs `docker <args>` and returns its exit status and stdout. Injected so the selection is testable. */
export type RunDockerPs = (args: readonly string[]) => DockerPsResult;

const runDockerPs: RunDockerPs = (args) => {
  const ps = spawnSync('docker', [...args], { encoding: 'utf8', shell: false });

  return { status: ps.status, stdout: ps.stdout ?? '' };
};

/** Which compose project's `postgres` to look for: its name and the checkout it runs from. */
export interface ComposeProjectRef {
  readonly name: string;
  /** Absolute checkout root — compose stamps it on every container as `com.docker.compose.project.working_dir`. */
  readonly workingDir: string;
}

/**
 * @description Resolves the running container ID for the compose `postgres`
 * service OF `project`, or null when this checkout has none running. Uses
 * labels rather than a hardcoded name because compose names the container
 * `<project>-postgres-1`, not `postgres`. The project and working-dir labels
 * matter: with an isolated worktree running, several projects each have a
 * `postgres` service, and a hand-run container can carry copied
 * project/service labels (seen: `ot-verify-*`, no working_dir). Taking the
 * first service match dumps whichever `docker ps` listed first. Null — never
 * another checkout's container — sends the caller to the host pg_dump.
 */
export function selectPostgresContainerId(
  project: ComposeProjectRef,
  run: RunDockerPs = runDockerPs,
): string | null {
  const ps = run([
    'ps',
    '-q',
    '--filter',
    `label=com.docker.compose.project=${project.name}`,
    '--filter',
    `label=com.docker.compose.project.working_dir=${project.workingDir}`,
    '--filter',
    `label=com.docker.compose.service=${POSTGRES_SERVICE}`,
  ]);

  const id = ps.status === 0 ? (ps.stdout.trim().split('\n')[0] ?? '') : '';

  return id === '' ? null : id;
}

/**
 * @description The compose project this checkout's `docker compose` commands
 * run under, resolved the way compose does: `COMPOSE_PROJECT_NAME` from the
 * process env, then from `<root>/.env` (a worktree's provisioner writes
 * `openthrottle-<slug>` there), then the compose file's top-level `name:`,
 * then the directory name.
 */
export function resolveComposeProject(
  root: string = process.cwd(),
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const composeFile = join(root, 'docker-compose.yml');
  const fileEnv = readEnvFile(join(root, '.env'));
  const fromProcess = env.COMPOSE_PROJECT_NAME?.trim();
  const hasProcessProject = fromProcess !== undefined && fromProcess !== '';
  const primaryEnv = hasProcessProject
    ? { ...fileEnv, COMPOSE_PROJECT_NAME: fromProcess }
    : fileEnv;
  const composeContents = existsSync(composeFile)
    ? readFileSync(composeFile, 'utf8')
    : '';

  return resolvePrimaryComposeProject({
    composeContents,
    primaryDir: root,
    primaryEnv,
  });
}

/**
 * `pg_dump` inside the container. `databaseName` undefined means the
 * container's own `$POSTGRES_DB` (the primary); any other database is passed
 * as a positional argument so the shell never interpolates it.
 */
function dumpViaContainer(
  containerId: string,
  sqlPath: string,
  databaseName: string | undefined,
): number | null {
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
        'pg_dump -U "$POSTGRES_USER" -d "${1:-$POSTGRES_DB}" -F p',
        'sh',
        ...(databaseName === undefined ? [] : [databaseName]),
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

/** Dump, zip and prune one database. Throws when pg_dump or zip fails. */
async function backupDatabase(
  database: DatabaseDefinition,
  primaryUrl: string,
  containerId: string | null,
  ts: string,
): Promise<void> {
  const connectionString = resolveDatabaseUrl(database, primaryUrl);
  const dir = backupsDirFor(database);
  await mkdir(dir, { recursive: true });

  const sqlPath = join(dir, `${database.name}-${ts}.sql`);
  const zipPath = join(dir, `${database.name}-${ts}.zip`);

  const containerDatabase = database.primary
    ? undefined
    : databaseNameOf(connectionString);
  const dumpStatus = containerId
    ? dumpViaContainer(containerId, sqlPath, containerDatabase)
    : dumpViaHost(connectionString, sqlPath);

  if (dumpStatus !== 0) {
    await unlink(sqlPath).catch(() => {});
    throw new Error(
      `pg_dump of ${database.name} (${containerId ? 'container' : 'host'}) exited with code ${dumpStatus}`,
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

  logger.success(`Backup of ${database.name} written to: ${zipPath}`);

  await pruneOldBackups(dir, resolveBackupRetentionCount(), database.name);
}

async function main(): Promise<void> {
  const databases = selectDatabases(parseDatabaseFlag(process.argv.slice(2)));
  if (!databases) {
    const known = DATABASES.map((database) => database.name).join(', ');
    throw new Error(`Unknown --database. Known databases: ${known}.`);
  }

  const primaryUrl = getPostgresUrl();
  const root = process.cwd();
  const project = resolveComposeProject(root);
  const containerId = selectPostgresContainerId({
    name: project,
    workingDir: root,
  });
  if (containerId === null) {
    logger.info(
      `No running postgres container for compose project "${project}" in ${root}; using the host pg_dump.`,
    );
  }
  const ts = timestamp();

  // One database at a time: each pg_dump streams a whole database, and the
  // first failure should stop the run with a non-zero exit (the scheduled
  // backup job reports it) rather than race the rest.
  /* eslint-disable no-await-in-loop -- sequential dumps, fail-fast */
  for (const database of databases) {
    await backupDatabase(database, primaryUrl, containerId, ts);
  }
  /* eslint-enable no-await-in-loop */
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
