#!/usr/bin/env node

import { Client } from 'pg';

import {
  createFsMigrationSource,
  PgMigrationStore,
  runMigrations,
} from './migration-runner.ts';

/**
 * @description Container entrypoint for the `openthrottle/migrations` image
 * (`Dockerfile.Migrations`), run as the compose `migrations` init service.
 * Applies pending migrations through the shared schema_migrations ledger
 * (`./migration-runner.ts`) and exits non-zero on failure, so a server that
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

async function main(): Promise<void> {
  const client = new Client({ connectionString: resolvePostgresUrl() });
  await client.connect();

  try {
    await runMigrations(
      new PgMigrationStore(client),
      createFsMigrationSource(),
      console.log,
      console.warn,
    );
  } catch (e) {
    console.error(' 🔴 Migration failed:', e);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('databases/migrate.ts')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
