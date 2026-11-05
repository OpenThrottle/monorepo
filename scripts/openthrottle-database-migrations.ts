#!/usr/bin/env node

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { Client } from 'pg';

import type { MigrationSource } from '../databases/migration-runner.ts';
import {
  createFsMigrationSource,
  PgMigrationStore,
  runMigrations,
} from '../databases/migration-runner.ts';
import { createLogger } from './utils/index.ts';
import type { MigrationGuardResult } from './utils/migration-guard.ts';
import { checkMigrationGuard } from './utils/migration-guard.ts';
import { readWorktreeDbMode } from './utils/worktree-db.ts';

const logger = createLogger();

/**
 * @description Workspace entrypoint for `pnpm run database:migrate`: runs
 * openthrottle database migrations from databases/migrations/ in order.
 * Uses POSTGRES_URL or POSTGRES_* env vars. Requires openthrottle Postgres to be running (e.g. docker-compose).
 *
 * The ledger logic itself lives in `databases/migration-runner.ts`, shared with
 * the container image (`Dockerfile.Migrations`); this file only wires the
 * workspace's connection resolution, logger and shared-DB worktree guard into it.
 */

/**
 * Shared-DB guard for the CLI entrypoints (`database:migrate`, `ensure-migrations`):
 * in a `OT_WORKTREE_DB=shared` worktree, refuses when this checkout carries a
 * migration file absent from the local `origin/main` ref. Runs before any
 * database connection, so a refusal applies nothing. Primary and isolated
 * checkouts are always allowed. See utils/migration-guard.ts.
 *
 * Workspace-only (it reads git and the worktree marker), so it lives here
 * rather than in the dependency-free shared core the container image runs.
 */
export async function guardSharedMigrations(
  source: MigrationSource = createFsMigrationSource(),
  cwd: string = process.cwd(),
): Promise<MigrationGuardResult> {
  const mode = readWorktreeDbMode(cwd);

  return checkMigrationGuard({
    cwd,
    localFiles: mode === 'shared' ? await source.list() : [],
    mode,
  });
}

async function main(): Promise<void> {
  const guard = await guardSharedMigrations();
  if (guard.kind === 'refused') {
    logger.fail(guard.message);
    process.exit(1);
  }

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
