#!/usr/bin/env node

import { Client } from 'pg';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';

/**
 * @description Runs cortex database migrations from databases/migrations/ in order.
 * Uses POSTGRES_URL or POSTGRES_* env vars. Requires cortex Postgres to be running (e.g. docker-compose).
 */

const MIGRATIONS_DIR = join(process.cwd(), 'databases', 'migrations');

async function main(): Promise<void> {
  const connectionString = getPostgresUrl();

  let entries: string[];
  try {
    entries = await readdir(MIGRATIONS_DIR);
  } catch (e) {
    console.error('Migrations directory not found:', MIGRATIONS_DIR, e);
    process.exit(1);
  }

  const sqlFiles = entries.filter((f) => f.endsWith('.sql')).sort();

  if (sqlFiles.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  // console.error('🌟 connected 🌟', sqlFiles);
  console.error('🌟 client.connection 🌟', client.connection);

  try {
    /* eslint-disable no-await-in-loop -- migrations must run in order */
    for (const file of sqlFiles) {
      const path = join(MIGRATIONS_DIR, file);
      const sql = await readFile(path, 'utf-8');

      console.log(`Running: ${file}`);

      await client.query(sql);
    }
    /* eslint-enable no-await-in-loop */

    console.log('Migrations completed.');
  } catch (e) {
    console.error(' 🔴  🔴  🔴 Migration failed:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
