#!/usr/bin/env node

/**
 * @description Standalone, dependency-light migration runner for the consumer
 * install path. Mirrors scripts/openthrottle-database-migrations.ts but with NO
 * workspace imports so it can be baked into a tiny published image
 * (Dockerfile.Migrations) and run as a compose init service. Reads migrations
 * from databases/migrations/ (relative to this file) and applies them in
 * filename order against the resolved Postgres URL.
 *
 * On a clean machine the seeded Postgres image (openthrottle/postgres) already
 * applies databases/seed.sql via docker-entrypoint-initdb.d, so this runner is a
 * no-op-equivalent there; its real job is applying incremental migrations on
 * UPGRADE of an existing volume. Migrations must therefore be idempotent.
 */

import { Client } from 'pg';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Resolve the Postgres connection string from env. Precedence:
 * OPENTHROTTLE_POSTGRES_URL → POSTGRES_URL → POSTGRES_* pieces. Kept in sync
 * with @openthrottle/openthrottle-agentic-utils getPostgresUrl (not imported
 * here to keep the migrations image free of the workspace).
 */
const resolvePostgresUrl = (env = process.env) => {
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
};

const main = async () => {
  const connectionString = resolvePostgresUrl();

  let entries;
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

  try {
    /* eslint-disable no-await-in-loop -- migrations must run in order */
    for (const file of sqlFiles) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`Running: ${file}`);
      await client.query(sql);
    }
    /* eslint-enable no-await-in-loop */
    console.log('Migrations completed.');
  } catch (e) {
    console.error(' 🔴 Migration failed:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
