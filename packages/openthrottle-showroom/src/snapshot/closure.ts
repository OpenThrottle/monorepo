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
 */

import type { DatabaseSchema, TableSchema } from './schema';
import { stableStringify } from './stable-json';

export interface WindowedRoot {
  table: string;
  windowColumn: string;
}

export interface SnapshotScope {
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

const rowKey = (table: TableSchema, row: Record<string, unknown>): string =>
  stableStringify(table.primaryKey.map((column) => row[column]));

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
    addRows(root, await fetcher.fetchAll(root), true);
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
      await fetcher.fetchSince(root.table, root.windowColumn, cutoffIso),
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

        addRows(edge.childTable, children, true);
      }
    }
  }

  // Upward fixpoint: every exported row's FK parents, recursively. Parents are
  // added with expandChildren = false.
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

  return selected;
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
