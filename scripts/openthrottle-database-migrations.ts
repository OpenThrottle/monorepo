#!/usr/bin/env node

import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';

/**
 * @description Runs openthrottle database migrations from databases/migrations/ in order.
 * Uses POSTGRES_URL or POSTGRES_* env vars. Requires openthrottle Postgres to be running (e.g. docker-compose).
 *
 * Migrations are tracked in a `schema_migrations` ledger and applied exactly once
 * (run-once / idempotent). Each migration + its ledger insert runs in a single
 * transaction, so a failed migration rolls back cleanly and is retried on the next run.
 */

/** Absolute path to the migration files, resolved from the current working directory. */
export function defaultMigrationsDir(): string {
  return join(process.cwd(), 'databases', 'migrations');
}

/** fs-backed {@link MigrationSource} reading `.sql` files from `dir` (default {@link defaultMigrationsDir}). */
export function createFsMigrationSource(
  dir: string = defaultMigrationsDir(),
): MigrationSource {
  return {
    list: () => readdir(dir),
    read: (file) => readFile(join(dir, file), 'utf-8'),
  };
}

/** Ledger table recording which migration files have been applied. */
export const LEDGER_TABLE = 'schema_migrations';

/** Tables whose presence proves a DB already carries the openthrottle schema. */
export const CORE_TABLES = ['plans', 'tasks'] as const;

/** A migration recorded in the ledger. `checksum` is null for bootstrap-seeded rows. */
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
  /** Seed the ledger with the given filenames as already-applied (no SQL executed). */
  bootstrap(filenames: readonly string[]): Promise<void>;
  /** Whether the DB already carries the core schema (used to gate bootstrap). */
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
  bootstrapped: boolean;
  skipped: string[];
}

/** Content hash used to detect edited-in-place migrations (drift detection is warn-only, added later). */
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
 * recorded when they were applied (edited-in-place). Bootstrap-seeded rows
 * (null checksum) and files no longer present are ignored — nothing to compare.
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
 * Bootstrap only when the ledger is empty AND the DB already has the core schema.
 *
 * Safe for this repo because the previous runner re-ran *every* migration on
 * *every* invocation, so any DB carrying the schema has necessarily had all
 * current migration files applied — seeding them all as applied is correct and
 * avoids re-running historical data migrations against populated data.
 */
export function shouldBootstrapLedger(
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
): Promise<MigrationRunResult> {
  await store.ensureLedger();

  const sqlFiles = filterSortSqlFiles(await source.list());
  if (sqlFiles.length === 0) {
    log('No migration files found.');
    return { applied: [], bootstrapped: false, skipped: [] };
  }

  const applied = await store.readApplied();

  if (shouldBootstrapLedger(applied.length, await store.coreTablesExist())) {
    await store.bootstrap(sqlFiles);
    log(
      `Bootstrapped ${LEDGER_TABLE} with ${sqlFiles.length} existing migration(s) (schema already present); nothing re-run.`,
    );
    return { applied: [], bootstrapped: true, skipped: [...sqlFiles] };
  }

  await warnOnChecksumDrift(applied, sqlFiles, source, warn);

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
    bootstrapped: false,
    skipped: sqlFiles.filter((f) => !appliedNow.includes(f)),
  };
}

/**
 * Read the current content of already-applied files and warn (never fail, never
 * re-apply) if any no longer matches its recorded checksum. Files with no stored
 * checksum (bootstrap-seeded) or no longer on disk are skipped.
 */
async function warnOnChecksumDrift(
  applied: readonly AppliedMigration[],
  sqlFiles: readonly string[],
  source: MigrationSource,
  warn: (message: string) => void,
): Promise<void> {
  const present = new Set(sqlFiles);
  const hashable = applied.filter(
    (a) => a.checksum !== null && present.has(a.filename),
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
      `⚠️  Checksum drift: ${filename} was edited after it was applied ` +
        `(recorded ${was.slice(0, 12)}…, current ${current.slice(0, 12)}…). ` +
        `Not re-applied — revert the edit or add a new migration.`,
    );
  }
}

/** pg-backed {@link MigrationStore}. Each apply() is one transaction. */
export class PgMigrationStore implements MigrationStore {
  constructor(private readonly client: Client) {}

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
      [[...CORE_TABLES]],
    );
    return rows[0]?.present === true;
  }

  async bootstrap(filenames: readonly string[]): Promise<void> {
    await this.client.query(
      `INSERT INTO ${LEDGER_TABLE} (filename)
       SELECT unnest($1::text[])
       ON CONFLICT (filename) DO NOTHING`,
      [[...filenames]],
    );
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

async function main(): Promise<void> {
  const client = new Client({ connectionString: getPostgresUrl() });
  await client.connect();

  try {
    const store = new PgMigrationStore(client);
    await runMigrations(store, createFsMigrationSource());
  } catch (e) {
    console.error(' 🔴  🔴  🔴 Migration failed:', e);
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
