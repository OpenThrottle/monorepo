#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getPostgresUrl,
  sanitizePostgresUrlForLogs,
} from '@openthrottle/openthrottle-agentic-utils';
import { Client } from 'pg';

import { createLogger } from './utils/index.ts';

const logger = createLogger();

/**
 * @description Applies the DEV-ONLY sample blog content in databases/seeds/blog.sql
 * (2 authors, 3 tags, 6 posts covering published, draft, archived and
 * future-scheduled visibility). Idempotent: re-running leaves every row byte-identical.
 * Uses POSTGRES_URL or POSTGRES_* env vars, like `database:migrate`, and needs migration 131.
 *
 * This is deliberately NOT a migration and is not reachable from `database:migrate`,
 * `monorepo:ensure-migrations`, setup, CI or any deploy path. It refuses to run when
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
export function defaultBlogSeedPath(): string {
  return join(process.cwd(), 'databases', 'seeds', 'blog.sql');
}

/** Hostname of a Postgres connection string, lowercased, without IPv6 brackets. */
export function postgresHostname(connectionString: string): string | undefined {
  try {
    const { hostname } = new URL(connectionString);

    return hostname.replace(/^\[|\]$/g, '').toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Production guard. Returns a human-readable refusal reason, or `undefined` when
 * seeding is allowed (NODE_ENV is not `production` AND the host is local).
 */
export function blogSeedRefusal(
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
    return 'NODE_ENV=production: the blog seed is dev-only sample content and never runs in production.';
  }

  const host = postgresHostname(connectionString);

  if (host === undefined || !LOCAL_POSTGRES_HOSTS.has(host)) {
    return `Postgres host "${host ?? '(unparseable)'}" is not local (allowed: ${[...LOCAL_POSTGRES_HOSTS].join(', ')}). The blog seed only runs against a local database.`;
  }

  return undefined;
}

async function main(): Promise<void> {
  const connectionString = getPostgresUrl();
  const refusal = blogSeedRefusal(connectionString);

  if (refusal !== undefined) {
    logger.fail(`Refusing to seed: ${refusal}`);
    process.exit(1);
  }

  const sql = await readFile(defaultBlogSeedPath(), 'utf-8');
  const client = new Client({ connectionString });

  logger.step(`Seeding sample blog content into ${sanitizePostgresUrlForLogs(connectionString)}`); // prettier-ignore
  await client.connect();

  try {
    const { rows } = await client.query<{ present: boolean }>(
      `SELECT to_regclass('public.blog_posts') IS NOT NULL AS present`,
    );

    if (rows[0]?.present !== true) {
      logger.fail('blog_posts does not exist. Run: pnpm run database:migrate');
      process.exit(1);
    }

    // The file wraps itself in BEGIN/COMMIT, so a failure rolls back cleanly.
    await client.query(sql);
    logger.success('Blog seed applied (2 authors, 3 tags, 6 posts); safe to re-run.'); // prettier-ignore
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    logger.fail(`Blog seed failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`); // prettier-ignore
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
