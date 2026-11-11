import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @description The databases this repository owns, each with its own migration
 * set and its own `schema_migrations` ledger, all served by the one Postgres
 * instance. Every migration entrypoint (`pnpm run database:migrate`, the
 * `monorepo:ensure-migrations` gate and the container image's `migrate.ts`)
 * iterates this list, and so do the static migration checks.
 *
 * Like the ledger it feeds, this module imports nothing but `node:*` and uses
 * erasable TypeScript only, because the migrations image runs it with Node's
 * native type stripping.
 *
 * Adding a database: add an entry here, create `databases/<name>/migrations/`,
 * and follow the checklist in `databases/AGENTS.md`.
 */

/** Name of a database this repository owns. */
export type DatabaseName = 'cms' | 'openthrottle';

/** One database and the migrations that build it. */
export interface DatabaseDefinition {
  /** Tables whose presence proves the DB already carries this schema (gates the ledger cut-over). */
  readonly coreTables: readonly string[];
  /** Env var that overrides the derived database name (non-primary databases only). */
  readonly databaseNameEnv: string | undefined;
  /** Database name used when {@link DatabaseDefinition.databaseNameEnv} is unset. */
  readonly defaultDatabaseName: string | undefined;
  /**
   * Repo-relative directories this database's migrations lived in before the
   * current one. The shared-DB worktree guard reads `origin/main` at these when
   * the current directory is not there yet.
   */
  readonly legacyMigrationsPaths: readonly string[];
  /** Repo-relative migrations directory, e.g. `databases/openthrottle/migrations`. */
  readonly migrationsPath: string;
  readonly name: DatabaseName;
  /**
   * The primary database is the one the POSTGRES_* env names. Every other
   * database lives on the same server and is derived from that connection.
   */
  readonly primary: boolean;
  /** Migrations deliberately emptied after release; exempt from drift warnings. */
  readonly retiredMigrations: ReadonlySet<string>;
  /** Env var holding a full connection URL that overrides the derived one (non-primary only). */
  readonly urlEnv: string | undefined;
}

/** Repository root, resolved from this module's own location (`databases/`). */
const REPOSITORY_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every database, primary first. Migrations run in this order, and a failure
 * stops the run before the next database.
 */
export const DATABASES: readonly DatabaseDefinition[] = [
  {
    coreTables: ['plans', 'tasks'],
    databaseNameEnv: undefined,
    defaultDatabaseName: undefined,
    legacyMigrationsPaths: ['databases/migrations'],
    migrationsPath: 'databases/openthrottle/migrations',
    name: 'openthrottle',
    primary: true,
    retiredMigrations: new Set([
      '010_normalize_author_to_visormatt.sql',
      '013_normalize_assignee_to_visormatt.sql',
    ]),
    urlEnv: undefined,
  },
  {
    coreTables: ['schemas', 'fragments'],
    databaseNameEnv: 'CMS_POSTGRES_DB',
    defaultDatabaseName: 'cms',
    legacyMigrationsPaths: [],
    migrationsPath: 'databases/cms/migrations',
    name: 'cms',
    primary: false,
    retiredMigrations: new Set(),
    urlEnv: 'CMS_POSTGRES_URL',
  },
];

/** The primary database's definition. */
export function primaryDatabase(): DatabaseDefinition {
  const primary = DATABASES.find((database) => database.primary);
  if (!primary) {
    throw new Error('database-registry: no primary database is registered');
  }
  return primary;
}

/** The definition named `name`, or `undefined` when no database has that name. */
export function findDatabase(name: string): DatabaseDefinition | undefined {
  return DATABASES.find((database) => database.name === name);
}

/** Absolute path to a database's migrations directory. */
export function migrationsDirFor(
  database: DatabaseDefinition,
  root: string = REPOSITORY_ROOT,
): string {
  return join(root, database.migrationsPath);
}

/** Identifier shape accepted for a database name: unquoted-safe, so no quoting surprises. */
const DATABASE_NAME_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/;

/** Whether `name` is a database name this tooling will create (lowercase identifier). */
export function isValidDatabaseName(name: string): boolean {
  return DATABASE_NAME_PATTERN.test(name);
}

/** `url` with its database (the path segment) replaced by `databaseName`. */
export function withDatabaseName(url: string, databaseName: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${encodeURIComponent(databaseName)}`;
  return parsed.toString();
}

/** The database name in a connection URL's path. */
export function databaseNameOf(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

/**
 * Connection URL for `database`. The primary uses `primaryUrl` as is. Any other
 * database takes its URL env var when set, otherwise `primaryUrl` with the
 * database swapped for its name env var (or its default name).
 */
export function resolveDatabaseUrl(
  database: DatabaseDefinition,
  primaryUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (database.primary) return primaryUrl;

  const explicit = database.urlEnv ? env[database.urlEnv]?.trim() : undefined;
  if (explicit) return explicit;

  const fromEnv = database.databaseNameEnv
    ? env[database.databaseNameEnv]?.trim()
    : undefined;
  const databaseName = fromEnv || database.defaultDatabaseName || database.name;

  return withDatabaseName(primaryUrl, databaseName);
}

/**
 * The databases a run targets: all of them, or the one named by `only`.
 * Returns `undefined` when `only` names no registered database.
 */
export function selectDatabases(
  only: string | undefined,
): readonly DatabaseDefinition[] | undefined {
  if (only === undefined) return DATABASES;
  const match = findDatabase(only);
  return match ? [match] : undefined;
}

/**
 * The value of `--database <name>` (or `--database=<name>`) in `argv`, or
 * `undefined` when the flag is absent. A flag with no value yields `''`.
 */
export function parseDatabaseFlag(argv: readonly string[]): string | undefined {
  for (const [index, arg] of argv.entries()) {
    if (arg === '--database') return argv[index + 1] ?? '';
    if (arg.startsWith('--database=')) return arg.slice('--database='.length);
  }
  return undefined;
}
