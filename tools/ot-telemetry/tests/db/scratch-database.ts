import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  getPostgresUrl,
  OPENTHROTTLE_POSTGRES_URL_ENV,
  sanitizePostgresUrlForLogs,
} from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';

const execFileAsync = promisify(execFile);

/**
 * @description Spins up (and tears down) a throwaway, fully-migrated Postgres
 * *database* on the same local server the repo's `pnpm run database:start`
 * already runs — never a second Postgres server/container, per this task's
 * instruction not to start one in a worktree. Each test file gets its own
 * database (not schema) so `DROP TABLE` experiments in one test can never
 * affect another, and the databases are dropped again in `afterAll`.
 *
 * Loads `.env` from the repo root (the same file the `report` target is invoked with
 * via `--env-file=.env`) if present, and forces `POSTGRES_HOST=localhost`
 * (the committed default is `host.docker.internal`, which only resolves
 * inside a container) — matching the exact invocation this tool documents
 * for running the report locally.
 */

const REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
);
const MIGRATIONS_RUNNER = join(
  REPO_ROOT,
  'scripts',
  'openthrottle-database-migrations.ts',
);

function loadRepoEnvFile(): void {
  try {
    process.loadEnvFile(join(REPO_ROOT, '.env'));
  } catch {
    // No .env at the repo root (e.g. a fresh checkout) — fall through and let
    // whatever the environment already provides (or doesn't) decide.
  }
  // The committed default targets a container hostname; tests always run on
  // the host, so this is the one override applied unconditionally.
  process.env.POSTGRES_HOST = 'localhost';
}

/** Resolves the base connection string, or `null` when required env is missing entirely. */
function tryResolveBaseUrl(): string | null {
  loadRepoEnvFile();
  try {
    return getPostgresUrl(process.env);
  } catch {
    return null;
  }
}

/** True when a real Postgres answers at the resolved connection — never throws. */
export async function isLocalPostgresReachable(): Promise<boolean> {
  const baseUrl = tryResolveBaseUrl();
  if (!baseUrl) return false;

  const client = new pg.Client({ connectionString: baseUrl });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

function withDatabaseName(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

/**
 * Applies every migration via the SAME ledgered runner `pnpm run
 * database:migrate` uses (`scripts/openthrottle-database-migrations.ts`),
 * run as a subprocess (`tsx`) rather than imported directly — that script
 * lives under the root `monorepo` project, whose own `typecheck` target is a
 * no-op, so importing it into this (real-typecheck) project would drag its
 * pre-existing, never-checked type errors into this package's build. Shelling
 * out keeps the same behavior (a populated `schema_migrations` ledger, exactly
 * like a real dev DB) without that coupling.
 */
async function migrateScratchDatabase(connectionString: string): Promise<void> {
  await execFileAsync('pnpm', ['exec', 'tsx', MIGRATIONS_RUNNER], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      [OPENTHROTTLE_POSTGRES_URL_ENV]: connectionString,
    },
  });
}

export interface ScratchDatabase {
  /** Drops the scratch database. Safe to call once. */
  drop(): Promise<void>;
  /** A writable pool connected to the scratch database (fully migrated). */
  pool: pg.Pool;
  readonly sanitizedUrl: string;
}

/** Creates a uniquely-named, fully-migrated scratch database and returns a pool connected to it. */
export async function createScratchDatabase(): Promise<ScratchDatabase> {
  const baseUrl = tryResolveBaseUrl();
  if (!baseUrl) {
    throw new Error(
      'ot-telemetry DB tests: could not resolve a Postgres connection string.',
    );
  }

  const name = `ot_telemetry_test_${randomBytes(6).toString('hex')}`;

  const admin = new pg.Client({ connectionString: baseUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }

  const scratchUrl = withDatabaseName(baseUrl, name);
  await migrateScratchDatabase(scratchUrl);

  const pool = new pg.Pool({ connectionString: scratchUrl });

  return {
    async drop(): Promise<void> {
      await pool.end();
      const admin2 = new pg.Client({ connectionString: baseUrl });
      await admin2.connect();
      try {
        await admin2.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      } finally {
        await admin2.end();
      }
    },
    pool,
    sanitizedUrl: sanitizePostgresUrlForLogs(scratchUrl),
  };
}
