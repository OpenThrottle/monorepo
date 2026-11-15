#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { Client } from 'pg';

import type { DatabaseDefinition } from '../databases/database-registry.ts';
import {
  databaseNameOf,
  DATABASES,
  migrationsDirFor,
  parseDatabaseFlag,
  resolveDatabaseUrl,
  selectDatabases,
} from '../databases/database-registry.ts';
import type { MigrationSource } from '../databases/migration-runner.ts';
import {
  createFsMigrationSource,
  createPgDatabaseMigrator,
  migrateDatabases,
} from '../databases/migration-runner.ts';
import { createLogger } from './utils/logger.ts';
import type { MigrationGuardResult } from './utils/migration-guard.ts';
import { checkMigrationGuard } from './utils/migration-guard.ts';
import {
  readWorktreeDbMode,
  WORKTREE_DB_ENV_FILES,
} from './utils/worktree-db.ts';

const logger = createLogger();

/**
 * @description Workspace entrypoint for `pnpm run database:migrate`: migrates
 * every database in `databases/database-registry.ts`, in order, each against its
 * own `schema_migrations` ledger, creating any non-primary database that does
 * not exist yet. `--database <name>` migrates just one. Uses POSTGRES_URL or
 * POSTGRES_* env vars for the primary; the others derive from it (see the
 * registry). Requires Postgres to be running (e.g. docker-compose).
 *
 * The ledger logic itself lives in `databases/migration-runner.ts`, shared with
 * the container image (`Dockerfile.Migrations`); this file only wires the
 * workspace's connection resolution, logger and shared-DB worktree guard into it.
 */

/** Options for {@link guardSharedMigrations}; every field has a production default. */
export interface GuardSharedMigrationsOptions {
  readonly cwd: string;
  readonly databases: readonly DatabaseDefinition[];
  /** The environment the run connects with; its connection decides each target database. */
  readonly env: NodeJS.ProcessEnv;
  /** Migration source for a database; defaults to its directory on disk. */
  readonly sourceFor: (database: DatabaseDefinition) => MigrationSource;
}

/** The on-disk migration source for `database`. */
const diskSourceFor = (database: DatabaseDefinition): MigrationSource => {
  return createFsMigrationSource(migrationsDirFor(database));
};

/** The database name `env` would migrate `database` in, or `undefined` when it resolves no connection. */
const targetDatabaseName = (
  database: DatabaseDefinition,
  env: NodeJS.ProcessEnv,
): string | undefined => {
  try {
    return databaseNameOf(
      resolveDatabaseUrl(database, getPostgresUrl(env), env),
    );
  } catch {
    return undefined;
  }
};

/**
 * `path` parsed the way `--env-file` and `process.loadEnvFile` parse it, which
 * is how every migration entrypoint loads its connection (inline `#` comments
 * included, which `utils/env.ts` does not strip). A missing file reads as `{}`.
 */
const readDotenv = (path: string): NodeJS.ProcessEnv => {
  try {
    return parseEnv(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
};

/**
 * Whether a run connecting with `env` would migrate `database` in the shared
 * database: the one this worktree's own `.env` files point at. A run aimed
 * elsewhere (a throwaway scratch database a test just created) is not what the
 * guard protects. Databases are compared by name, so a host alias
 * (`localhost` vs `host.docker.internal`) cannot hide the shared one. Fails
 * closed: when either side resolves no connection, the run counts as shared.
 */
export function targetsSharedDatabase(
  database: DatabaseDefinition,
  cwd: string,
  env: NodeJS.ProcessEnv,
): boolean {
  const target = targetDatabaseName(database, env);
  const shared = new Set(
    WORKTREE_DB_ENV_FILES.map((relative) => {
      return targetDatabaseName(database, readDotenv(join(cwd, relative)));
    }).filter((name) => name !== undefined),
  );

  if (target === undefined || shared.size === 0) return true;

  return shared.has(target);
}

/**
 * Shared-DB guard for the CLI entrypoints (`database:migrate`, `ensure-migrations`):
 * in a `OT_WORKTREE_DB=shared` worktree, refuses when this checkout carries a
 * migration file, in any of `databases`, absent from the local `origin/main`
 * ref. Runs before any database connection, so a refusal applies nothing.
 * Primary and isolated checkouts are always allowed, and so is a database the
 * run does not aim at the shared one ({@link targetsSharedDatabase}). See
 * utils/migration-guard.ts.
 *
 * Workspace-only (it reads git and the worktree marker), so it lives here
 * rather than in the dependency-free shared core the container image runs.
 */
export async function guardSharedMigrations(
  options: Partial<GuardSharedMigrationsOptions> = {},
): Promise<MigrationGuardResult> {
  const cwd = options.cwd ?? process.cwd();
  const databases = options.databases ?? DATABASES;
  const env = options.env ?? process.env;
  const sourceFor = options.sourceFor ?? diskSourceFor;
  const mode = readWorktreeDbMode(cwd, env);

  if (mode !== 'shared') return { kind: 'allowed' };

  const guarded = databases.filter((database) => {
    return targetsSharedDatabase(database, cwd, env);
  });

  const results = await Promise.all(
    guarded.map(async (database) => {
      return checkMigrationGuard({
        cwd,
        database: database.name,
        legacyMigrationsDirs: database.legacyMigrationsPaths,
        localFiles: await sourceFor(database).list(),
        migrationsDir: database.migrationsPath,
        mode,
      });
    }),
  );

  return results.find((result) => result.kind === 'refused') ?? { kind: 'allowed' }; // prettier-ignore
}

/**
 * The databases `argv` asks for: all of them, or the one `--database <name>`
 * names. `undefined` when that name matches no registered database.
 */
export function databasesFromArgv(
  argv: readonly string[],
): readonly DatabaseDefinition[] | undefined {
  return selectDatabases(parseDatabaseFlag(argv));
}

/** Open a connected `pg.Client` for `url`. */
export async function connectClient(url: string): Promise<Client> {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

async function main(): Promise<void> {
  const databases = databasesFromArgv(process.argv.slice(2));
  if (!databases) {
    const known = DATABASES.map((database) => database.name).join(', ');
    logger.fail(`Unknown --database. Known databases: ${known}.`);
    process.exit(1);
  }

  const guard = await guardSharedMigrations({ databases });
  if (guard.kind === 'refused') {
    logger.fail(guard.message);
    process.exit(1);
  }

  try {
    await migrateDatabases({
      databases,
      env: process.env,
      log: logger.info,
      migrator: createPgDatabaseMigrator(
        connectClient,
        logger.info,
        logger.warn,
      ),
      primaryUrl: getPostgresUrl(),
    });
  } catch (e) {
    logger.fail(
      `Migration failed: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`,
    );
    process.exit(1);
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
