#!/usr/bin/env node

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { Client } from 'pg';

import {
  createFsMigrationSource,
  PgMigrationStore,
  runMigrations,
} from '../databases/migration-runner.ts';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

/**
 * @description Workspace entrypoint for `pnpm run database:migrate`: runs
 * openthrottle database migrations from databases/migrations/ in order.
 * Uses POSTGRES_URL or POSTGRES_* env vars. Requires openthrottle Postgres to be running (e.g. docker-compose).
 *
 * The ledger logic itself lives in `databases/migration-runner.ts`, shared with
 * the container image (`Dockerfile.Migrations`); this file only wires the
 * workspace's connection resolution and logger into it.
 */
async function main(): Promise<void> {
  const client = new Client({ connectionString: getPostgresUrl() });
  await client.connect();

  try {
    const store = new PgMigrationStore(client);
    await runMigrations(
      store,
      createFsMigrationSource(),
      logger.info,
      logger.warn,
    );
  } catch (e) {
    logger.fail(
      `Migration failed: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`,
    );
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Only run when invoked directly (not when imported by tests).
if (
  process.argv[1] &&
  process.argv[1].endsWith('openthrottle-database-migrations.ts')
) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
