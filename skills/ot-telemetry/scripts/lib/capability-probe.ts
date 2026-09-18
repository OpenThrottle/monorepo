import type pg from 'pg';

/**
 * @description A single-round-trip snapshot of what the connected database
 * actually has (public schema tables + columns). Metric queries declare what
 * they need against this probe and are skipped — not crashed — when a table or
 * column is missing, which is what keeps the report alive on a box that is
 * several migrations behind.
 */

interface TableColumnsRow {
  readonly column_name: string | null;
  readonly table_name: string;
}

/** Tables (and their columns) actually present in the `public` schema. */
export interface CapabilityProbe {
  /** True when `table` has every column in `columns` (an empty/omitted list only checks the table). */
  hasColumns(table: string, columns?: readonly string[]): boolean;
  /** True when `table` exists in the `public` schema. */
  hasTable(table: string): boolean;
  /** All tables discovered in the `public` schema. */
  readonly tables: ReadonlySet<string>;
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
