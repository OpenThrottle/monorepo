#!/usr/bin/env node

import { Client } from 'pg';

import { DATABASES } from './database-registry.ts';
import {
  createPgDatabaseMigrator,
  migrateDatabases,
} from './migration-runner.ts';

/**
 * @description Container entrypoint for the `openthrottle/migrations` image
 * (`Dockerfile.Migrations`), run as the compose `migrations` init service.
 * Migrates every database in `./database-registry.ts` (creating any that are
 * missing) through the shared schema_migrations ledger (`./migration-runner.ts`),
 * one ledger per database, and exits non-zero on failure, so a server that
 * `depends_on: service_completed_successfully` never boots on a half-migrated DB.
 *
 * Runs under Node's native type stripping with only `pg` installed — no build
 * step and no workspace — so it must not import anything from the monorepo.
 */

/**
 * Resolve the Postgres connection string from env. Precedence:
 * OPENTHROTTLE_POSTGRES_URL → POSTGRES_URL → POSTGRES_* pieces. Kept in sync
 * with @openthrottle/openthrottle-agentic-utils getPostgresUrl (not imported
 * here to keep the migrations image free of the workspace).
 */
export function resolvePostgresUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const otUrl = env.OPENTHROTTLE_POSTGRES_URL?.trim();
  if (otUrl) return otUrl;

  const url = env.POSTGRES_URL?.trim();
  if (url) return url;

  const { POSTGRES_DB, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_USER } = env;
  const port = Number(env.POSTGRES_PORT);

  if (
    !POSTGRES_DB ||
    !POSTGRES_HOST ||
    !POSTGRES_PASSWORD ||
    !port ||
    !POSTGRES_USER
  ) {
    throw new Error(
      '🚨 Required Postgres environment variables are not set (POSTGRES_URL or POSTGRES_HOST/PORT/USER/PASSWORD/DB)',
    );
  }

  const encodedPassword = encodeURIComponent(POSTGRES_PASSWORD);
  return `postgresql://${POSTGRES_USER}:${encodedPassword}@${POSTGRES_HOST}:${port}/${POSTGRES_DB}`;
}

/** Open a connected `pg.Client` for `url`. */
async function connect(url: string): Promise<Client> {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

async function main(): Promise<void> {
  try {
    await migrateDatabases({
      databases: DATABASES,
      env: process.env,
      log: console.log,
      migrator: createPgDatabaseMigrator(connect, console.log, console.warn),
      primaryUrl: resolvePostgresUrl(),
    });
  } catch (e) {
    console.error(' 🔴 Migration failed:', e);
    process.exitCode = 1;
  }
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('databases/migrate.ts')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
