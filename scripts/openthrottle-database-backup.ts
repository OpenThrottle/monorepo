#!/usr/bin/env node

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { join } from 'node:path';
import { closeSync, openSync } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

/**
 * @description Backs up the Cortex Postgres database to a timestamped zip file.
 * Uses POSTGRES_URL or POSTGRES_* env vars. Requires cortex Postgres to be running (e.g. docker-compose).
 * Writes to databases/backups/cortex-YYYYMMDD-HHMMSS.zip (plain SQL inside).
 *
 * When the docker-compose `postgres` container is running, pg_dump executes
 * inside the container so the client version always matches the server
 * (a host pg_dump older than the server — e.g. Homebrew 17 vs Postgres 18 —
 * aborts with a server version mismatch). Falls back to the host pg_dump
 * when the container is not available.
 */

const BACKUPS_DIR = join(process.cwd(), 'databases', 'backups');
const POSTGRES_CONTAINER = 'postgres';

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

function isPostgresContainerRunning(): boolean {
  const inspect = spawnSync(
    'docker',
    ['inspect', '--format', '{{.State.Running}}', POSTGRES_CONTAINER],
    { encoding: 'utf8', shell: false },
  );

  return inspect.status === 0 && inspect.stdout.trim() === 'true';
}

function dumpViaContainer(sqlPath: string): number | null {
  const sqlFile = openSync(sqlPath, 'w');

  try {
    // POSTGRES_USER / POSTGRES_DB are expanded by the container's shell from
    // the container's own environment (set via docker-compose).
    const pgDump = spawnSync(
      'docker',
      [
        'exec',
        POSTGRES_CONTAINER,
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

  const useContainer = isPostgresContainerRunning();
  const dumpStatus = useContainer
    ? dumpViaContainer(sqlPath)
    : dumpViaHost(connectionString, sqlPath);

  if (dumpStatus !== 0) {
    await unlink(sqlPath).catch(() => {});
    throw new Error(
      `pg_dump (${useContainer ? 'container' : 'host'}) exited with code ${dumpStatus}`,
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
