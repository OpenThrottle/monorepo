/**
 * @description The FK-closure walk that decides which rows a snapshot contains.
 *
 * Two directions, deliberately asymmetric:
 *
 * - **Down** (parent → children), only from the root tables and their
 *   descendants: children of a windowed root come along because their parent
 *   row was exported. Rows added this way keep expanding downward.
 * - **Up** (child → parents), from every exported row: FK integrity demands the
 *   parent (users, projects, repositories, …), but a parent added for integrity
 *   does NOT expand downward — otherwise pulling one user would pull every row
 *   the user ever touched and the window would be meaningless.
 *
 * Soft-deleted rows (a non-null `deleted_at`, on any table that has the
 * column) never enter as roots or downward children, so a plan deleted in the
 * app is not in the snapshot and its tasks do not ride along. They are kept
 * only when a live exported row still points at one as an FK parent — a soft
 * delete leaves the reference in place (deleteProject keeps `plans.project_id`),
 * and dropping the parent would make the snapshot fail its FK checks on load.
 * Such a row keeps its `deleted_at`, so the app still reads it as deleted.
 */

import type { DatabaseSchema, TableSchema } from './schema.ts';
import { stableStringify } from './stable-json.ts';

export interface WindowedRoot {
  table: string;
  windowColumn: string;
}

/**
 * One row kept out of the snapshot by decision, not by the window. The row is
 * never added, and every selected row that references it (transitively) is
 * removed with it, so the snapshot still loads with its FK checks intact.
 */
export interface ExcludedRow {
  /** Primary-key value. Only single-column primary keys can be excluded. */
  readonly id: string;
  /** Why, in a sentence — the review of a snapshot diff reads this. */
  readonly reason: string;
  readonly table: string;
}

export interface SnapshotScope {
  /** Rows removed by decision, with everything that references them. */
  excludedRows: readonly ExcludedRow[];
  /** Root tables exported in full, plus their downward closure. */
  fullRoots: string[];
  /** Root tables exported where `windowColumn >= cutoff`, plus closure. */
  windowedRoots: WindowedRoot[];
}

/** table name → (primary-key key → row) */
export type SnapshotRows = Map<string, Map<string, Record<string, unknown>>>;

/** Row access surface, satisfied by the pg implementation and by test fakes. */
export interface RowFetcher {
  fetchAll(table: string): Promise<Record<string, unknown>[]>;
  fetchByColumn(
    table: string,
    column: string,
    values: unknown[],
  ): Promise<Record<string, unknown>[]>;
  fetchSince(
    table: string,
    column: string,
    cutoffIso: string,
  ): Promise<Record<string, unknown>[]>;
}

const FETCH_BATCH_SIZE = 1_000;

const SOFT_DELETE_COLUMN = 'deleted_at';

/**
 * @description Drop soft-deleted rows. A table without the column keeps every
 * row.
 */
const withoutSoftDeleted = (
  table: TableSchema,
  rows: Record<string, unknown>[],
): Record<string, unknown>[] => {
  if (!table.columns.includes(SOFT_DELETE_COLUMN)) {
    return rows;
  }

  return rows.filter((row) => {
    const deletedAt = row[SOFT_DELETE_COLUMN];

    return deletedAt === null || deletedAt === undefined;
  });
};

const rowKey = (table: TableSchema, row: Record<string, unknown>): string => {
  return stableStringify(table.primaryKey.map((column) => row[column]));
};

const requireTable = (schema: DatabaseSchema, name: string): TableSchema => {
  const table = schema.tables.get(name);

  if (table === undefined) {
    throw new Error(
      `snapshot scope names table '${name}' which does not exist in the database`,
    );
  }

  if (table.primaryKey.length === 0) {
    throw new Error(`table '${name}' has no primary key — cannot snapshot it`);
  }

  return table;
};

/**
 * Tables reachable downward (parent → child) from the roots. Only rows in these
 * tables are allowed to expand further downward.
 */
export const computeDownwardTables = (
  schema: DatabaseSchema,
  rootTables: string[],
): Set<string> => {
  const reached = new Set<string>(rootTables);
  const queue = [...rootTables];

  while (queue.length > 0) {
    const parent = queue.shift();

    for (const edge of schema.foreignKeys) {
      if (edge.parentTable === parent && !reached.has(edge.childTable)) {
        reached.add(edge.childTable);
        queue.push(edge.childTable);
      }
    }
  }

  return reached;
};

export const collectSnapshotRows = async (
  fetcher: RowFetcher,
  schema: DatabaseSchema,
  scope: SnapshotScope,
  cutoffIso: string,
): Promise<SnapshotRows> => {
  const rootTables = [
    ...scope.fullRoots,
    ...scope.windowedRoots.map((root) => root.table),
  ];

  for (const name of rootTables) {
    requireTable(schema, name);
  }

  const downwardTables = computeDownwardTables(schema, rootTables);
  const selected: SnapshotRows = new Map();
  /** table name → primary-key keys that must never be selected. */
  const excluded = excludedKeysByTable(schema, scope.excludedRows);

  /** Rows added downward, still owing a child expansion. */
  const expansionQueue: { rows: Record<string, unknown>[]; table: string }[] =
    [];

  const addRows = (
    tableName: string,
    rows: Record<string, unknown>[],
    expandChildren: boolean,
  ): Record<string, unknown>[] => {
    const table = requireTable(schema, tableName);
    const bucket =
      selected.get(tableName) ?? new Map<string, Record<string, unknown>>();
    selected.set(tableName, bucket);

    const added: Record<string, unknown>[] = [];

    for (const row of rows) {
      const key = rowKey(table, row);

      if (excluded.get(tableName)?.has(key) === true) {
        continue;
      }

      if (!bucket.has(key)) {
        bucket.set(key, row);
        added.push(row);
      }
    }

    if (expandChildren && added.length > 0) {
      expansionQueue.push({ rows: added, table: tableName });
    }

    return added;
  };

  /* eslint-disable no-await-in-loop -- sequential fixpoint over one connection */
  for (const root of scope.fullRoots) {
    addRows(
      root,
      withoutSoftDeleted(
        requireTable(schema, root),
        await fetcher.fetchAll(root),
      ),
      true,
    );
  }

  for (const root of scope.windowedRoots) {
    const table = requireTable(schema, root.table);

    if (!table.columns.includes(root.windowColumn)) {
      throw new Error(
        `windowed root '${root.table}' has no column '${root.windowColumn}'`,
      );
    }

    addRows(
      root.table,
      withoutSoftDeleted(
        table,
        await fetcher.fetchSince(root.table, root.windowColumn, cutoffIso),
      ),
      true,
    );
  }

  // Downward fixpoint: children of exported rows, restricted to the roots'
  // descendant tables so integrity-only parents never fan back out.
  while (expansionQueue.length > 0) {
    const { rows, table } = expansionQueue.shift() ?? { rows: [], table: '' };

    for (const edge of schema.foreignKeys) {
      if (edge.parentTable !== table || !downwardTables.has(edge.childTable)) {
        continue;
      }

      const parentValues = [
        ...new Set(
          rows
            .map((row) => row[edge.parentColumn])
            .filter((value) => value !== null && value !== undefined),
        ),
      ];

      for (let i = 0; i < parentValues.length; i += FETCH_BATCH_SIZE) {
        const batch = parentValues.slice(i, i + FETCH_BATCH_SIZE);
        const children = await fetcher.fetchByColumn(
          edge.childTable,
          edge.childColumn,
          batch,
        );

        addRows(
          edge.childTable,
          withoutSoftDeleted(requireTable(schema, edge.childTable), children),
          true,
        );
      }
    }
  }

  // Upward fixpoint: every exported row's FK parents, recursively. Parents are
  // added with expandChildren = false, and soft-deleted ones are kept on
  // purpose — a live row still references them (see the module comment).
  let upwardFrontier: { rows: Record<string, unknown>[]; table: string }[] = [
    ...selected.entries(),
  ].map(([table, bucket]) => ({ rows: [...bucket.values()], table }));

  while (upwardFrontier.length > 0) {
    const nextFrontier: { rows: Record<string, unknown>[]; table: string }[] =
      [];

    for (const { rows, table } of upwardFrontier) {
      for (const edge of schema.foreignKeys) {
        if (edge.childTable !== table) {
          continue;
        }

        const parentTable = requireTable(schema, edge.parentTable);
        const bucket = selected.get(edge.parentTable);
        const wanted = [
          ...new Set(
            rows
              .map((row) => row[edge.childColumn])
              .filter((value) => value !== null && value !== undefined),
          ),
        ].filter((value) => {
          // Single-column FKs point at the parent's referenced column; when it
          // is the sole primary key we can check membership without a fetch.
          if (
            parentTable.primaryKey.length === 1 &&
            parentTable.primaryKey[0] === edge.parentColumn
          ) {
            return bucket?.has(stableStringify([value])) !== true;
          }

          return true;
        });

        for (let i = 0; i < wanted.length; i += FETCH_BATCH_SIZE) {
          const batch = wanted.slice(i, i + FETCH_BATCH_SIZE);
          const parents = await fetcher.fetchByColumn(
            edge.parentTable,
            edge.parentColumn,
            batch,
          );

          const added = addRows(edge.parentTable, parents, false);

          if (added.length > 0) {
            nextFrontier.push({ rows: added, table: edge.parentTable });
          }
        }
      }
    }

    upwardFrontier = nextFrontier;
  }
  /* eslint-enable no-await-in-loop */

  removeRowsReferencingExcluded(schema, selected, excluded);

  return selected;
};

/**
 * @description Validate the scope's exclusions and index them by table. An
 * exclusion naming a missing table or a composite-key table fails loudly: a
 * typo here would silently put the row back in the snapshot.
 */
const excludedKeysByTable = (
  schema: DatabaseSchema,
  excludedRows: readonly ExcludedRow[],
): Map<string, Set<string>> => {
  const keys = new Map<string, Set<string>>();

  for (const row of excludedRows) {
    const table = requireTable(schema, row.table);

    if (table.primaryKey.length !== 1) {
      throw new Error(
        `cannot exclude a row from '${row.table}': only single-column primary keys are supported`,
      );
    }

    const bucket = keys.get(row.table) ?? new Set<string>();

    bucket.add(stableStringify([row.id]));
    keys.set(row.table, bucket);
  }

  return keys;
};

/**
 * @description Remove every selected row whose FK points at an excluded row,
 * then every row pointing at one of those, to a fixpoint. Removed keys join
 * `excluded`, so the cascade follows them. Only edges onto a single-column
 * primary key are followed, which is every edge an exclusion can start from.
 */
const removeRowsReferencingExcluded = (
  schema: DatabaseSchema,
  selected: SnapshotRows,
  excluded: Map<string, Set<string>>,
): void => {
  let changed = excluded.size > 0;

  while (changed) {
    changed = false;

    for (const edge of schema.foreignKeys) {
      const parentTable = schema.tables.get(edge.parentTable);
      const gone = excluded.get(edge.parentTable);
      const bucket = selected.get(edge.childTable);

      if (
        gone === undefined ||
        bucket === undefined ||
        parentTable?.primaryKey.length !== 1 ||
        parentTable.primaryKey[0] !== edge.parentColumn
      ) {
        continue;
      }

      for (const [key, row] of bucket) {
        const value = row[edge.childColumn];

        if (value === null || value === undefined) {
          continue;
        }

        if (gone.has(stableStringify([value]))) {
          bucket.delete(key);

          const removed = excluded.get(edge.childTable) ?? new Set<string>();

          removed.add(key);
          excluded.set(edge.childTable, removed);
          changed = true;
        }
      }
    }
  }
};

/**
 * Order tables parents-first (Kahn), alphabetical among ties so the order is
 * stable. Self-references are ignored; a cross-table cycle fails loudly.
 */
export const orderTablesTopologically = (
  schema: DatabaseSchema,
  tableNames: string[],
): string[] => {
  const names = new Set(tableNames);
  const dependencies = new Map<string, Set<string>>();

  for (const name of tableNames) {
    dependencies.set(name, new Set());
  }

  for (const edge of schema.foreignKeys) {
    if (
      edge.childTable !== edge.parentTable &&
      names.has(edge.childTable) &&
      names.has(edge.parentTable)
    ) {
      dependencies.get(edge.childTable)?.add(edge.parentTable);
    }
  }

  const ordered: string[] = [];
  const placed = new Set<string>();

  while (ordered.length < tableNames.length) {
    const ready = [...dependencies.entries()]
      .filter(
        ([name, parents]) =>
          !placed.has(name) &&
          [...parents].every((parent) => placed.has(parent)),
      )
      .map(([name]) => name)
      .sort();

    if (ready.length === 0) {
      const remaining = tableNames.filter((name) => !placed.has(name)).sort();

      throw new Error(
        `foreign-key cycle among tables: ${remaining.join(', ')}`,
      );
    }

    for (const name of ready) {
      ordered.push(name);
      placed.add(name);
    }
  }

  return ordered;
};

/**
 * @description Reorder one table's rows so a row another row references through
 * a self-FK (`tasks.parent_task_id`, `skill_usage_events.duplicate_of_id`,
 * `plan_runs.resume_of_run_id`) is written first. The loader inserts in file
 * order and Postgres checks each FK on insert, so primary-key order alone only
 * works when ids happen to sort parents first: time-ordered uuidv7 ids do, and
 * random v4 ids do not. Otherwise stable: rows keep their incoming order, and a
 * row moves only to follow the row it points at. A cycle is left as found, and
 * fails on load naming the constraint.
 */
export const orderRowsBySelfReference = (
  schema: DatabaseSchema,
  tableName: string,
  rows: readonly Record<string, unknown>[],
): Record<string, unknown>[] => {
  const table = schema.tables.get(tableName);
  const selfEdges = schema.foreignKeys.filter((edge) => {
    return (
      edge.childTable === tableName &&
      edge.parentTable === tableName &&
      table?.primaryKey.length === 1 &&
      table.primaryKey[0] === edge.parentColumn
    );
  });

  if (table === undefined || selfEdges.length === 0) {
    return [...rows];
  }

  const byKey = new Map(
    rows.map((row) => [stableStringify([row[table.primaryKey[0] ?? '']]), row]),
  );
  const visited = new Set<Record<string, unknown>>();
  const ordered: Record<string, unknown>[] = [];

  const visit = (row: Record<string, unknown>): void => {
    if (visited.has(row)) {
      return;
    }

    visited.add(row);

    for (const edge of selfEdges) {
      const value = row[edge.childColumn];

      if (value === null || value === undefined) {
        continue;
      }

      const parent = byKey.get(stableStringify([value]));

      if (parent !== undefined) {
        visit(parent);
      }
    }

    ordered.push(row);
  };

  for (const row of rows) {
    visit(row);
  }

  return ordered;
};
