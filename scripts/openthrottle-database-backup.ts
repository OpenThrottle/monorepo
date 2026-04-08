#!/usr/bin/env node

import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';

/**
 * @description Backs up the Cortex Postgres database to a timestamped zip file.
 * Uses POSTGRES_URL or POSTGRES_* env vars. Requires cortex Postgres to be running (e.g. docker-compose).
 * Writes to databases/cortex/backups/cortex-YYYYMMDD-HHMMSS.zip (plain SQL inside).
 */

const BACKUPS_DIR = join(process.cwd(), 'databases', 'backups');

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

async function main(): Promise<void> {
  const { connectionString } = getCortexPostgresConfig();
  await mkdir(BACKUPS_DIR, { recursive: true });

  const ts = timestamp();
  const sqlPath = join(BACKUPS_DIR, `openthrottle-${ts}.sql`);
  const zipPath = join(BACKUPS_DIR, `openthrottle-${ts}.zip`);

  const pgDump = spawnSync(
    'pg_dump',
    ['--dbname', connectionString, '-F', 'p', '-f', sqlPath],
    { shell: false, stdio: 'inherit' },
  );

  if (pgDump.status !== 0) {
    throw new Error(`pg_dump exited with code ${pgDump.status}`);
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
