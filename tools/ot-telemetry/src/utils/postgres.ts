import {
  getPostgresUrl,
  sanitizePostgresUrlForLogs,
} from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';

import { MIGRATION_LEDGER, POSTGRES_ENV_VARS_TRIED } from '../config/index.ts';
import { POSTGRES_CONNECTION_FAILURE_PREFIX } from '../data/data.copy.ts';
import type {
  CapabilityProbe,
  MigrationHighWaterMarkResult,
  ReadOnlyConnection,
} from '../types/index.ts';

/**
 * @description Everything that talks to Postgres outside the metric queries themselves: the
 * read-only connection, the one-round-trip capability probe, and the migration high-water mark.
 *
 * Env precedence is delegated to `getPostgresUrl` (from `@openthrottle/openthrottle-agentic-utils`)
 * so it stays byte-for-byte in sync with `databases/run-migrations.mjs` and the server's own
 * resolution: `OPENTHROTTLE_POSTGRES_URL` → `POSTGRES_URL` → `POSTGRES_*` pieces.
 *
 * Every pooled connection is opened read-only at the wire-protocol level (`options:
 * '-c default_transaction_read_only=on'`) rather than via a post-connect `SET`, so there is no
 * window — not even the first query on a freshly grown pool connection — during which a bug in a
 * metric query could mutate an engineer's database.
 *
 * The capability probe is a snapshot of what the connected database actually has (public schema
 * tables + columns). Metric queries declare what they need against it and are skipped — not
 * crashed — when a table or column is missing, which is what keeps the report alive on a box that
 * is several migrations behind.
 */

function describeEnvVarsTried(): string {
  return `Tried (in order): ${POSTGRES_ENV_VARS_TRIED.join(', ')}.`;
}

/**
 * Resolves the connection string, connects, and switches the session to
 * read-only. Throws a single, actionable error — naming every env var tried —
 * rather than ever returning a connection that produced a half-empty report.
 */
export async function connectReadOnly(
  env: NodeJS.ProcessEnv = process.env,
): Promise<ReadOnlyConnection> {
  let connectionString: string;
  try {
    connectionString = getPostgresUrl(env);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${POSTGRES_CONNECTION_FAILURE_PREFIX} ${detail} ${describeEnvVarsTried()} Set one of these (see databases/README.md) and retry.`,
      { cause: error },
    );
  }

  const sanitizedUrl = sanitizePostgresUrlForLogs(connectionString);
  // `options` is passed to the server at wire-connect time (like PGOPTIONS), so
  // every connection the pool ever opens — not just the first — is read-only
  // from the moment it is established, with no post-connect `SET` window.
  const client = new pg.Pool({
    connectionString,
    options: '-c default_transaction_read_only=on',
  });

  try {
    // A Pool connects lazily; without an eager probe here, a bad connection
    // string would surface as a mysterious failure inside the first metric
    // query instead of this actionable, env-vars-named error.
    const probeClient = await client.connect();
    probeClient.release();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // The pool may or may not have opened a connection; end() is safe either way.
    await client.end().catch(() => undefined);
    throw new Error(
      `${POSTGRES_CONNECTION_FAILURE_PREFIX} Connection to ${sanitizedUrl} failed: ${detail} ${describeEnvVarsTried()}`,
      { cause: error },
    );
  }

  return {
    client,
    close: () => client.end(),
    sanitizedUrl,
  };
}

interface TableColumnsRow {
  readonly column_name: string | null;
  readonly table_name: string;
}

/**
 * Queries `information_schema.tables` joined to `information_schema.columns`
 * ONCE — a single round trip — and builds an in-memory capability map from it.
 */
export async function probeCapabilities(
  client: pg.Pool,
): Promise<CapabilityProbe> {
  const { rows } = await client.query<TableColumnsRow>(
    `SELECT t.table_name, c.column_name
     FROM information_schema.tables t
     LEFT JOIN information_schema.columns c
       ON c.table_schema = t.table_schema
      AND c.table_name = t.table_name
     WHERE t.table_schema = 'public'`,
  );

  const columnsByTable = new Map<string, Set<string>>();
  for (const row of rows) {
    const existing = columnsByTable.get(row.table_name);
    const columns = existing ?? new Set<string>();
    if (row.column_name !== null) {
      columns.add(row.column_name);
    }
    if (!existing) {
      columnsByTable.set(row.table_name, columns);
    }
  }

  return {
    hasColumns(table: string, columns: readonly string[] = []): boolean {
      const present = columnsByTable.get(table);
      if (!present) return false;
      return columns.every((column) => present.has(column));
    },
    hasTable(table: string): boolean {
      return columnsByTable.has(table);
    },
    tables: new Set(columnsByTable.keys()),
  };
}

/** Reads the migration high-water mark, or records why it could not be read. */
export async function readMigrationHighWaterMark(
  client: pg.Pool,
  probe: CapabilityProbe,
): Promise<MigrationHighWaterMarkResult> {
  if (!probe.hasColumns(MIGRATION_LEDGER.TABLE, [MIGRATION_LEDGER.ID_COLUMN])) {
    return {
      migrationHighWaterMark: null,
      skipped: [
        {
          name: 'migrationHighWaterMark',
          reason: `missing table/column: ${MIGRATION_LEDGER.TABLE}(${MIGRATION_LEDGER.ID_COLUMN})`,
        },
      ],
    };
  }

  const { rows } = await client.query<{ max: string | null }>(
    `SELECT max(${MIGRATION_LEDGER.ID_COLUMN}) FROM ${MIGRATION_LEDGER.TABLE}`,
  );

  return { migrationHighWaterMark: rows[0]?.max ?? null, skipped: [] };
}
