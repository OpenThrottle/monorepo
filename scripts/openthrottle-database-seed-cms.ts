#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getPostgresUrl,
  sanitizePostgresUrlForLogs,
} from '@openthrottle/openthrottle-agentic-utils';
import { Client } from 'pg';

import {
  findDatabase,
  resolveDatabaseUrl,
} from '../databases/database-registry.ts';
import { postgresHostname } from './openthrottle-database-seed-blog.ts';
import {
  describeCmsSchemaSync,
  readCmsSchemaEntries,
  syncCmsSchemas,
} from './openthrottle-database-sync-cms-schemas.ts';
import { createLogger } from './utils/index.ts';

const logger = createLogger();

/**
 * @description Applies the DEV-ONLY synthetic CMS content in databases/cms/seeds/cms.sql (a
 * root Layout fragment with four children — one a LayoutGrid of three Cards — the `welcome`
 * layout, and one library with one component). Idempotent: every row has a fixed uuid and every INSERT is ON CONFLICT DO NOTHING.
 * Connects to the `cms` database the way `database:migrate` does — the primary's POSTGRES_* with
 * the database swapped, or CMS_POSTGRES_URL — and needs cms migrations 001-010.
 *
 * Before the sample rows it syncs the generated block schemas
 * (scripts/openthrottle-database-sync-cms-schemas.ts), so the sample fragments can be pinned to
 * them and every generated block has an ACTIVE schema to create fragments on.
 *
 * This is deliberately NOT a migration and is not reachable from `database:migrate`,
 * `monorepo:ensure-migrations`, CI or any deploy path. It refuses to run when
 * NODE_ENV=production or when the Postgres host is not local.
 */

/** Hosts that count as "local": loopback names/addresses and the compose service name. */
const LOCAL_POSTGRES_HOSTS: ReadonlySet<string> = new Set([
  '::1',
  '127.0.0.1',
  'localhost',
  'postgres',
]);

/** Absolute path to the seed file, resolved from the current working directory. */
export function defaultCmsSeedPath(): string {
  return join(process.cwd(), 'databases', 'cms', 'seeds', 'cms.sql');
}

/** Connection URL of the `cms` database, derived from the primary URL and `env`. */
export function cmsDatabaseUrl(
  primaryUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const database = findDatabase('cms');

  if (database === undefined) {
    throw new Error('database-registry: the cms database is not registered');
  }

  return resolveDatabaseUrl(database, primaryUrl, env);
}

/**
 * Production guard. Returns a human-readable refusal reason, or `undefined` when
 * seeding is allowed (NODE_ENV is not `production` AND the host is local).
 */
export function cmsSeedRefusal(
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
    return 'NODE_ENV=production: the cms seed is dev-only sample content and never runs in production.';
  }

  const host = postgresHostname(connectionString);

  if (host === undefined || !LOCAL_POSTGRES_HOSTS.has(host)) {
    return `Postgres host "${host ?? '(unparseable)'}" is not local (allowed: ${[...LOCAL_POSTGRES_HOSTS].join(', ')}). The cms seed only runs against a local database.`;
  }

  return undefined;
}

async function main(): Promise<void> {
  const connectionString = cmsDatabaseUrl(getPostgresUrl());
  const refusal = cmsSeedRefusal(connectionString);

  if (refusal !== undefined) {
    logger.fail(`Refusing to seed: ${refusal}`);
    process.exit(1);
  }

  const sql = await readFile(defaultCmsSeedPath(), 'utf-8');
  const client = new Client({ connectionString });

  logger.step(`Seeding sample CMS content into ${sanitizePostgresUrlForLogs(connectionString)}`); // prettier-ignore
  await client.connect();

  try {
    const { rows } = await client.query<{ present: boolean }>(
      `SELECT to_regclass('public.layouts_libraries') IS NOT NULL AS present`,
    );

    if (rows[0]?.present !== true) {
      logger.fail('cms tables do not exist. Run: pnpm run database:migrate -- --database cms'); // prettier-ignore
      process.exit(1);
    }

    // Schemas first: the sample fragments look their generated schema up by typename.
    const schemas = readCmsSchemaEntries(process.cwd());
    logger.info(describeCmsSchemaSync(schemas.length, await syncCmsSchemas(client, schemas))); // prettier-ignore

    // The file wraps itself in BEGIN/COMMIT, so a failure rolls back cleanly.
    await client.query(sql);
    logger.success('CMS seed applied (layout "welcome", 8 fragments, 1 library); safe to re-run.'); // prettier-ignore
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    logger.fail(`CMS seed failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`); // prettier-ignore
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
