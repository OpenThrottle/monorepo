/**
 * @description Reflect the live Postgres schema — tables, columns, primary keys
 * and single-column foreign keys — from `information_schema` / `pg_constraint`.
 * The FK graph (restored in migration 099) is what makes the snapshot closure
 * mechanical: nothing here hardcodes a table relationship.
 */

export interface ForeignKeyEdge {
  childColumn: string;
  childTable: string;
  name: string;
  parentColumn: string;
  parentTable: string;
}

export interface TableSchema {
  /** column name → SQL type as `format_type` renders it, e.g. `vector(768)`. */
  columnTypes: Record<string, string>;
  columns: string[];
  name: string;
  primaryKey: string[];
}

export interface UniqueKey {
  columns: string[];
  /**
   * Constraint or index name — the same string Postgres reports as
   * `constraint` on a 23505 error, which is how a violation is traced back to
   * the columns that caused it.
   */
  name: string;
  /** `pg_get_expr(indpred)` for a partial index, null for a total one. */
  predicate: string | null;
  table: string;
}

export interface DatabaseSchema {
  foreignKeys: ForeignKeyEdge[];
  tables: Map<string, TableSchema>;
  /**
   * Every unique key except the primary one, reflected from `pg_index` rather
   * than `pg_constraint`: half of them are bare `CREATE UNIQUE INDEX`
   * statements (`idx_projects_nx_project_name_unique`, for one) that never
   * appear in `pg_constraint` at all.
   */
  uniqueKeys: UniqueKey[];
}

/** Minimal query surface, satisfied by `pg.Client` and by test fakes. */
export interface QueryRunner {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
}

const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

/**
 * `array_agg(attname)` arrives as a `name[]`. Depending on the client's type
 * parsers it is either already a JS array or the raw `{a,b}` text form; accept
 * both. Identifier names cannot contain commas or braces, so the split is safe.
 */
const toNameArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  const text = String(value);

  if (!text.startsWith('{') || !text.endsWith('}')) {
    throw new Error(`expected a Postgres name[] value, got '${text}'`);
  }

  const inner = text.slice(1, -1);

  return inner === '' ? [] : inner.split(',');
};

/**
 * Quote a Postgres identifier after validating its shape. Table and column
 * names flow into SQL as identifiers (parameters are not allowed there), so an
 * unexpected name fails loudly instead of being interpolated.
 */
export const quoteIdentifier = (name: string): string => {
  if (!IDENTIFIER_PATTERN.test(name)) {
    throw new Error(`unsafe identifier '${name}'`);
  }

  return `"${name}"`;
};

export const reflectSchema = async (
  runner: QueryRunner,
): Promise<DatabaseSchema> => {
  const columnRows = await runner.query(
    `SELECT c.table_name, c.column_name,
            format_type(a.atttypid, a.atttypmod) AS column_type
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
       JOIN pg_attribute a
         ON a.attrelid = (quote_ident(c.table_name))::regclass
        AND a.attname = c.column_name
      WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position`,
  );

  const tables = new Map<string, TableSchema>();

  for (const row of columnRows.rows) {
    const tableName = String(row.table_name);
    const table = tables.get(tableName) ?? {
      columnTypes: {},
      columns: [],
      name: tableName,
      primaryKey: [],
    };

    const columnName = String(row.column_name);

    table.columns.push(columnName);
    table.columnTypes[columnName] = String(row.column_type);
    tables.set(tableName, table);
  }

  const primaryKeyRows = await runner.query(
    `SELECT conrelid::regclass::text AS table_name,
            (SELECT array_agg(a.attname ORDER BY u.ord)
               FROM unnest(conkey) WITH ORDINALITY AS u(attnum, ord)
               JOIN pg_attribute a
                 ON a.attrelid = conrelid AND a.attnum = u.attnum) AS columns
       FROM pg_constraint
      WHERE contype = 'p' AND connamespace = 'public'::regnamespace`,
  );

  for (const row of primaryKeyRows.rows) {
    const table = tables.get(String(row.table_name));

    if (table !== undefined) {
      table.primaryKey = toNameArray(row.columns);
    }
  }

  const foreignKeyRows = await runner.query(
    `SELECT conname AS name,
            conrelid::regclass::text AS child_table,
            confrelid::regclass::text AS parent_table,
            (SELECT array_agg(a.attname ORDER BY u.ord)
               FROM unnest(conkey) WITH ORDINALITY AS u(attnum, ord)
               JOIN pg_attribute a
                 ON a.attrelid = conrelid AND a.attnum = u.attnum) AS child_columns,
            (SELECT array_agg(a.attname ORDER BY u.ord)
               FROM unnest(confkey) WITH ORDINALITY AS u(attnum, ord)
               JOIN pg_attribute a
                 ON a.attrelid = confrelid AND a.attnum = u.attnum) AS parent_columns
       FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace
      ORDER BY conname`,
  );

  const foreignKeys: ForeignKeyEdge[] = [];

  for (const row of foreignKeyRows.rows) {
    const childColumns = toNameArray(row.child_columns);
    const parentColumns = toNameArray(row.parent_columns);

    if (childColumns.length !== 1 || parentColumns.length !== 1) {
      throw new Error(
        `foreign key '${String(row.name)}' on '${String(row.child_table)}' is composite — the snapshot closure only supports single-column foreign keys`,
      );
    }

    foreignKeys.push({
      childColumn: childColumns[0],
      childTable: String(row.child_table),
      name: String(row.name),
      parentColumn: parentColumns[0],
      parentTable: String(row.parent_table),
    });
  }

  const uniqueRows = await runner.query(
    `SELECT i.indexrelid::regclass::text AS name,
            i.indrelid::regclass::text AS table_name,
            pg_get_expr(i.indpred, i.indrelid) AS predicate,
            array_length(i.indkey::int[], 1) AS key_count,
            (SELECT array_agg(a.attname ORDER BY k.ord)
               FROM unnest(i.indkey::int[]) WITH ORDINALITY AS k(attnum, ord)
               JOIN pg_attribute a
                 ON a.attrelid = i.indrelid AND a.attnum = k.attnum) AS columns
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE i.indisunique AND NOT i.indisprimary AND n.nspname = 'public'
      ORDER BY name`,
  );

  const uniqueKeys: UniqueKey[] = [];

  for (const row of uniqueRows.rows) {
    const columns = row.columns === null ? [] : toNameArray(row.columns);

    // An expression index (`lower(email)`) has attnum 0 for the expression, so
    // the join returns fewer names than the index has keys. Such an index can
    // never be matched back to plain columns, so it is left out rather than
    // half-described.
    if (columns.length !== Number(row.key_count)) {
      continue;
    }

    uniqueKeys.push({
      columns,
      name: String(row.name),
      predicate: row.predicate === null ? null : String(row.predicate),
      table: String(row.table_name),
    });
  }

  return { foreignKeys, tables, uniqueKeys };
};
