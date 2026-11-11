import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Client } from 'pg';

import type { DatabaseDefinition } from './database-registry.ts';
import {
  databaseNameOf,
  isValidDatabaseName,
  migrationsDirFor,
  primaryDatabase,
  resolveDatabaseUrl,
  withDatabaseName,
} from './database-registry.ts';

/**
 * @description The single schema_migrations ledger implementation, shared by
 * both migration entrypoints: the workspace runner
 * (`scripts/openthrottle-database-migrations.ts`, behind `pnpm run
 * database:migrate` and the `monorepo:ensure-migrations` gate) and the
 * container image (`Dockerfile.Migrations`).
 *
 * Migrations are tracked in a `schema_migrations` ledger and applied exactly once
 * (run-once / idempotent). Each migration + its ledger insert runs in a single
 * transaction, so a failed migration rolls back cleanly and is retried on the next run.
 *
 * An empty ledger on a DB that already carries the schema is a one-time
 * cut-over: every file is applied once, in order, and recorded. See
 * {@link isLedgerCutOver} for why it never marks files applied without running them.
 *
 * Deliberately dependency-free beyond `pg` and `node:*` builtins, and written in
 * erasable TypeScript only (no parameter properties, enums or namespaces), so the
 * container image runs it with Node's native type stripping — no build step, no
 * workspace. Logging is injected for the same reason.
 */

/** Absolute path to the primary (openthrottle) database's migration files. */
export function defaultMigrationsDir(): string {
  return migrationsDirFor(primaryDatabase());
}

/**
 * fs-backed {@link MigrationSource} reading `.sql` files from `dir` (default
 * {@link defaultMigrationsDir}). A missing directory lists as empty: a database
 * with no migrations yet still gets created and gets its ledger.
 */
export function createFsMigrationSource(
  dir: string = defaultMigrationsDir(),
): MigrationSource {
  return {
    list: async () => {
      try {
        return await readdir(dir);
      } catch (error) {
        if (hasErrorCode(error, 'ENOENT')) return [];
        throw error;
      }
    },
    read: (file) => readFile(join(dir, file), 'utf-8'),
  };
}

/** Ledger table recording which migration files have been applied. */
export const LEDGER_TABLE = 'schema_migrations';

/** Tables whose presence proves a DB already carries the openthrottle schema (gates the cut-over log). */
export const CORE_TABLES: readonly string[] = primaryDatabase().coreTables;

/**
 * Migrations whose body was deliberately replaced with a no-op after release.
 * They keep their filename (the ledger key) so nothing re-runs or orphans, and
 * are exempt from drift warnings: a ledger that recorded the original body
 * would otherwise warn on every run about an edit that is intended.
 *
 * Retire a migration only when re-applying it would damage user data, and say
 * why in the file itself.
 */
export const RETIRED_MIGRATIONS: ReadonlySet<string> =
  primaryDatabase().retiredMigrations;

/**
 * A migration recorded in the ledger. `checksum` is null for rows seeded by the
 * retired mark-only bootstrap, which some existing ledgers still carry.
 */
export interface AppliedMigration {
  checksum: string | null;
  filename: string;
}

/** A previously-applied migration whose file content has since changed. */
export interface ChecksumDrift {
  applied: string;
  current: string;
  filename: string;
}

/** Persistence port for the migration runner; see {@link PgMigrationStore} for the pg impl. */
export interface MigrationStore {
  /** Apply one migration and record it, atomically. Rejects (recording nothing) on failure. */
  apply(filename: string, sql: string, checksum: string): Promise<void>;
  /** Whether the DB already carries the core schema (distinguishes a cut-over from a fresh DB). */
  coreTablesExist(): Promise<boolean>;
  /** Create the ledger table if it does not exist. */
  ensureLedger(): Promise<void>;
  /** Migrations recorded as applied, with their stored checksums. */
  readApplied(): Promise<AppliedMigration[]>;
}

/** Lists and reads migration files; abstracted so the runner is unit-testable. */
export interface MigrationSource {
  list(): Promise<string[]>;
  read(filename: string): Promise<string>;
}

export interface MigrationRunResult {
  applied: string[];
  /** True when this run was the one-time cut-over of a ledgerless, populated DB. */
  cutOver: boolean;
  skipped: string[];
}

/** Content hash used to detect edited-in-place migrations (drift detection is warn-only). */
export function createChecksum(sql: string): string {
  return createHash('sha256').update(sql, 'utf-8').digest('hex');
}

/** Keep only `.sql` files, in lexical order — the canonical migration application order. */
export function filterSortSqlFiles(entries: readonly string[]): string[] {
  return entries.filter((f) => f.endsWith('.sql')).sort();
}

/** Migration files not yet present in the ledger, preserving sorted order. */
export function selectPendingMigrations(
  sqlFiles: readonly string[],
  applied: Iterable<string>,
): string[] {
  const appliedSet = new Set(applied);
  return filterSortSqlFiles(sqlFiles).filter((f) => !appliedSet.has(f));
}

/**
 * Already-applied migrations whose current file checksum differs from the one
 * recorded when they were applied (edited-in-place). Legacy bootstrap-seeded
 * rows (null checksum) and files no longer present are ignored — nothing to compare.
 */
export function findChecksumDrift(
  applied: readonly AppliedMigration[],
  currentChecksums: ReadonlyMap<string, string>,
): ChecksumDrift[] {
  const drifts: ChecksumDrift[] = [];
  for (const { checksum, filename } of applied) {
    if (checksum === null) continue;
    const current = currentChecksums.get(filename);
    if (current !== undefined && current !== checksum) {
      drifts.push({ applied: checksum, current, filename });
    }
  }
  return drifts;
}

/**
 * A cut-over is an empty ledger on a DB that already carries the core schema:
 * one migrated before the ledger existed, by a runner that re-applied every file
 * on every run (the container image did, until it adopted this ledger).
 *
 * It applies every file once, in order — exactly what that runner did on each
 * deploy — and records each one. It deliberately does NOT mark the on-disk files
 * applied without running them: a volume last migrated by an *older* image has
 * never run the files new in this one, and marking them would silently leave its
 * schema behind for good.
 */
export function isLedgerCutOver(
  appliedCount: number,
  coreTablesExist: boolean,
): boolean {
  return appliedCount === 0 && coreTablesExist;
}

/**
 * Orchestrates a migration run against an injected store/source.
 * Pure of pg/fs so it can be exercised with in-memory fakes.
 */
export async function runMigrations(
  store: MigrationStore,
  source: MigrationSource,
  log: (message: string) => void = console.log,
  warn: (message: string) => void = console.warn,
  retiredMigrations: ReadonlySet<string> = RETIRED_MIGRATIONS,
): Promise<MigrationRunResult> {
  await store.ensureLedger();

  const sqlFiles = filterSortSqlFiles(await source.list());
  if (sqlFiles.length === 0) {
    log('No migration files found.');
    return { applied: [], cutOver: false, skipped: [] };
  }

  const applied = await store.readApplied();
  const cutOver = isLedgerCutOver(
    applied.length,
    await store.coreTablesExist(),
  );

  if (cutOver) {
    log(
      `One-time ${LEDGER_TABLE} cut-over: the schema exists but the ledger is empty. ` +
        `Applying all ${sqlFiles.length} migration(s) once and recording each; later runs apply only new files.`,
    );
  }

  await warnOnChecksumDrift(applied, sqlFiles, source, warn, retiredMigrations);

  const pending = selectPendingMigrations(
    sqlFiles,
    applied.map((a) => a.filename),
  );
  const appliedNow: string[] = [];

  /* eslint-disable no-await-in-loop -- migrations must run in order */
  for (const file of pending) {
    const sql = await source.read(file);
    log(`Running: ${file}`);
    await store.apply(file, sql, createChecksum(sql));
    appliedNow.push(file);
  }
  /* eslint-enable no-await-in-loop */

  if (appliedNow.length === 0) {
    log('No pending migrations; database is up to date.');
  } else {
    log(`Migrations completed (${appliedNow.length} applied).`);
  }

  return {
    applied: appliedNow,
    cutOver,
    skipped: sqlFiles.filter((f) => !appliedNow.includes(f)),
  };
}

/**
 * Read the current content of already-applied files and warn (never fail, never
 * re-apply) if any no longer matches its recorded checksum. Files with no stored
 * checksum (legacy bootstrap-seeded), no longer on disk, or in {@link RETIRED_MIGRATIONS}
 * are skipped.
 */
async function warnOnChecksumDrift(
  applied: readonly AppliedMigration[],
  sqlFiles: readonly string[],
  source: MigrationSource,
  warn: (message: string) => void,
  retiredMigrations: ReadonlySet<string>,
): Promise<void> {
  const present = new Set(sqlFiles);
  const hashable = applied.filter(
    (a) =>
      a.checksum !== null &&
      present.has(a.filename) &&
      !retiredMigrations.has(a.filename),
  );

  const entries = await Promise.all(
    hashable.map(
      async (a) =>
        [a.filename, createChecksum(await source.read(a.filename))] as const,
    ),
  );

  for (const { applied: was, current, filename } of findChecksumDrift(
    applied,
    new Map(entries),
  )) {
    warn(
      `Checksum drift: ${filename} was edited after it was applied ` +
        `(recorded ${was.slice(0, 12)}…, current ${current.slice(0, 12)}…). ` +
        `Not re-applied — revert the edit or add a new migration.`,
    );
  }
}

/** pg-backed {@link MigrationStore}. Each apply() is one transaction. */
export class PgMigrationStore implements MigrationStore {
  // An explicit field rather than a parameter property: parameter properties
  // are not erasable, so Node's native type stripping rejects them.
  private readonly client: Client;
  private readonly coreTables: readonly string[];

  constructor(client: Client, coreTables: readonly string[] = CORE_TABLES) {
    this.client = client;
    this.coreTables = coreTables;
  }

  async ensureLedger(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        checksum TEXT
      )
    `);
  }

  async readApplied(): Promise<AppliedMigration[]> {
    const { rows } = await this.client.query<AppliedMigration>(
      `SELECT filename, checksum FROM ${LEDGER_TABLE}`,
    );
    return rows.map((r) => ({ checksum: r.checksum, filename: r.filename }));
  }

  async coreTablesExist(): Promise<boolean> {
    const { rows } = await this.client.query<{ present: boolean }>(
      `SELECT bool_and(to_regclass('public.' || t) IS NOT NULL) AS present
       FROM unnest($1::text[]) AS t`,
      [[...this.coreTables]],
    );
    return rows[0]?.present === true;
  }

  async apply(filename: string, sql: string, checksum: string): Promise<void> {
    try {
      await this.client.query('BEGIN');
      await this.client.query(sql);
      await this.client.query(
        `INSERT INTO ${LEDGER_TABLE} (filename, checksum) VALUES ($1, $2)`,
        [filename, checksum],
      );
      await this.client.query('COMMIT');
    } catch (e) {
      await this.client.query('ROLLBACK');
      throw e;
    }
  }
}

/** The slice of a pg client {@link ensureDatabaseExists} needs; `pg.Client` satisfies it. */
export interface DatabaseAdminClient {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ readonly rowCount: number | null }>;
}

/** Postgres `duplicate_database`: a concurrent runner created it between our check and CREATE. */
const DUPLICATE_DATABASE = '42P04';

/** Whether `error` carries `code` (a pg SQLSTATE or a Node errno code). */
function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

/**
 * Create database `name` on the server `admin` is connected to, unless it
 * already exists. Returns whether this call created it.
 *
 * `/docker-entrypoint-initdb.d` only runs against an EMPTY volume, so an init
 * script alone never creates a database on an existing dev volume or a deployed
 * box; every migration entrypoint calls this before migrating a non-primary
 * database. `CREATE DATABASE` cannot run inside a transaction, so this is two
 * plain statements, and a runner racing us to it (`42P04`) counts as existing.
 */
export async function ensureDatabaseExists(
  admin: DatabaseAdminClient,
  name: string,
): Promise<boolean> {
  if (!isValidDatabaseName(name)) {
    throw new Error(
      `Refusing to create database "${name}": names must be lowercase identifiers (a-z, 0-9, _).`,
    );
  }

  const existing = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [name],
  );
  if ((existing.rowCount ?? 0) > 0) return false;

  try {
    // The name is validated above; identifiers cannot be bound as parameters.
    await admin.query(`CREATE DATABASE "${name}"`);
    return true;
  } catch (error) {
    if (hasErrorCode(error, DUPLICATE_DATABASE)) return false;
    throw error;
  }
}

/** What happened to one database in a {@link migrateDatabases} run. */
export interface DatabaseMigrationOutcome {
  /** Whether the run created the database before migrating it. */
  readonly created: boolean;
  readonly database: DatabaseDefinition['name'];
  readonly result: MigrationRunResult;
}

/** Side effects {@link migrateDatabases} needs; {@link createPgDatabaseMigrator} is the pg impl. */
export interface DatabaseMigrator {
  /** Create the database at `url` if missing, connecting through `adminUrl`. Returns whether it was created. */
  ensureDatabase(adminUrl: string, url: string): Promise<boolean>;
  /** Run the ledger for `database` against `url`. */
  migrate(
    database: DatabaseDefinition,
    url: string,
  ): Promise<MigrationRunResult>;
}

/** Inputs to {@link migrateDatabases}. */
export interface MigrateDatabasesInput {
  readonly databases: readonly DatabaseDefinition[];
  readonly env: NodeJS.ProcessEnv;
  readonly log: (message: string) => void;
  readonly migrator: DatabaseMigrator;
  /** Connection URL of the primary database; every other URL derives from it. */
  readonly primaryUrl: string;
}

/**
 * Migrate each database in order, each against its own ledger. A non-primary
 * database is created first when it does not exist yet.
 *
 * Fail-fast: the first database that throws stops the run and the error
 * propagates, so later databases are not attempted. Every entrypoint exits
 * non-zero on it, and a stack that is half-migrated must not boot anyway: the
 * compose server waits on the migrations service succeeding.
 */
export async function migrateDatabases(
  input: MigrateDatabasesInput,
): Promise<readonly DatabaseMigrationOutcome[]> {
  const outcomes: DatabaseMigrationOutcome[] = [];

  /* eslint-disable no-await-in-loop -- databases migrate in order, and the first failure stops the run */
  for (const database of input.databases) {
    const url = resolveDatabaseUrl(database, input.primaryUrl, input.env);
    input.log(`Database ${database.name} (${databaseNameOf(url)}):`);

    const created = database.primary
      ? false
      : await input.migrator.ensureDatabase(input.primaryUrl, url);
    if (created) input.log(`Created database ${databaseNameOf(url)}.`);

    const result = await input.migrator.migrate(database, url);
    outcomes.push({ created, database: database.name, result });
  }
  /* eslint-enable no-await-in-loop */

  return outcomes;
}

/**
 * pg-backed {@link DatabaseMigrator}. `connect` is injected so the workspace and
 * the container image can each supply their own `pg.Client` construction.
 */
export function createPgDatabaseMigrator(
  connect: (url: string) => Promise<Client>,
  log: (message: string) => void = console.log,
  warn: (message: string) => void = console.warn,
): DatabaseMigrator {
  return {
    ensureDatabase: async (adminUrl, url) => {
      // Connect to the maintenance database on the same server: the primary
      // database may not be the one the admin can reach first on a fresh box.
      const admin = await connect(withDatabaseName(adminUrl, 'postgres'));
      try {
        return await ensureDatabaseExists(admin, databaseNameOf(url));
      } finally {
        await admin.end();
      }
    },
    migrate: async (database, url) => {
      const client = await connect(url);
      try {
        return await runMigrations(
          new PgMigrationStore(client, database.coreTables),
          createFsMigrationSource(migrationsDirFor(database)),
          log,
          warn,
          database.retiredMigrations,
        );
      } finally {
        await client.end();
      }
    },
  };
}
