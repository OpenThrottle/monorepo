/**
 * @description The manifest contract and its drift guard, relocated from seed
 * time to export time: every table in the database is classified
 * `exported | denied | ignored`, and every column of an exported table is
 * classified `keep | scrub | drop` — each with a one-line reason. The live
 * schema is compared against the manifest before a single row is written, so a
 * new migration breaks the export with an actionable message, never the take.
 *
 * This is deliberately the first draft of the deny list a future public
 * read-only guest instance will need — written as if it will be promoted.
 */

import type { DatabaseSchema } from './schema';

export const COLUMN_ACTION = {
  /** Nulled at export; the column never reaches the snapshot. */
  drop: 'drop',
  /** Exported verbatim. */
  keep: 'keep',
  /** Exported through the identity/secret sanitize pass. */
  scrub: 'scrub',
} as const;

export type ColumnAction = (typeof COLUMN_ACTION)[keyof typeof COLUMN_ACTION];

export const TABLE_CLASSIFICATION = {
  /** Never exported, regardless of FK closure — credential-adjacent. */
  denied: 'denied',
  /** In the export scope; every column must be classified. */
  exported: 'exported',
  /** Not part of the snapshot scope (infra ledgers, auth plumbing, …). */
  ignored: 'ignored',
} as const;

export type TableClassification =
  (typeof TABLE_CLASSIFICATION)[keyof typeof TABLE_CLASSIFICATION];

export interface ColumnManifestEntry {
  action: ColumnAction;
  reason: string;
  /**
   * Required on pgvector columns: the dimension the committed snapshot was
   * built against. An embedding model/dimension change then fails the export
   * instead of silently stranding stale vectors.
   */
  vectorDimension?: number;
}

export interface ExportedTableManifest {
  classification: typeof TABLE_CLASSIFICATION.exported;
  columns: Record<string, ColumnManifestEntry>;
  reason: string;
}

export interface NonExportedTableManifest {
  classification:
    typeof TABLE_CLASSIFICATION.denied | typeof TABLE_CLASSIFICATION.ignored;
  reason: string;
}

export type TableManifestEntry =
  ExportedTableManifest | NonExportedTableManifest;

/** table name → classification. */
export type SnapshotManifest = Record<string, TableManifestEntry>;

const MANIFEST_PATH =
  'packages/openthrottle-showroom/src/snapshot/manifest.data.ts';

const VECTOR_TYPE_PATTERN = /^vector\((\d+)\)$/;

/**
 * Compare the live schema against the committed manifest and throw on any
 * drift. Every message names the table/column and says what to do about it.
 */
export const assertManifestMatchesSchema = (
  manifest: SnapshotManifest,
  schema: DatabaseSchema,
): void => {
  const problems: string[] = [];

  for (const [tableName, table] of schema.tables) {
    const entry = manifest[tableName];

    if (entry === undefined) {
      problems.push(
        `table '${tableName}' is not classified — decide exported/denied/ignored in ${MANIFEST_PATH}`,
      );
      continue;
    }

    if (entry.classification !== TABLE_CLASSIFICATION.exported) {
      continue;
    }

    for (const column of table.columns) {
      const columnEntry = entry.columns[column];
      const columnType = table.columnTypes[column];
      const vectorMatch = VECTOR_TYPE_PATTERN.exec(columnType);

      if (columnEntry === undefined) {
        problems.push(
          `column '${tableName}.${column}' is not classified — decide keep/scrub/drop in ${MANIFEST_PATH}`,
        );
        continue;
      }

      if (vectorMatch !== null) {
        const liveDimension = Number(vectorMatch[1]);

        if (columnEntry.vectorDimension === undefined) {
          problems.push(
            `vector column '${tableName}.${column}' has no pinned vectorDimension in ${MANIFEST_PATH} — pin it to ${liveDimension} so a model change fails loudly`,
          );
        } else if (columnEntry.vectorDimension !== liveDimension) {
          problems.push(
            `vector column '${tableName}.${column}' is ${columnType} in the database but the manifest pins ${columnEntry.vectorDimension} — the embedding model/dimension changed since the snapshot was committed; re-embed, refresh the snapshot and update ${MANIFEST_PATH}`,
          );
        }
      } else if (columnEntry.vectorDimension !== undefined) {
        problems.push(
          `column '${tableName}.${column}' pins vectorDimension ${columnEntry.vectorDimension} but its type is '${columnType}', not a vector — remove the pin in ${MANIFEST_PATH}`,
        );
      }
    }

    for (const column of Object.keys(entry.columns)) {
      if (!table.columns.includes(column)) {
        problems.push(
          `manifest classifies column '${tableName}.${column}' which no longer exists — it was renamed or dropped; update ${MANIFEST_PATH} to match the migration`,
        );
      }
    }
  }

  for (const tableName of Object.keys(manifest)) {
    if (!schema.tables.has(tableName)) {
      problems.push(
        `manifest classifies table '${tableName}' which no longer exists — it was renamed or dropped; update ${MANIFEST_PATH} to match the migration`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `snapshot manifest is out of sync with the database schema:\n  - ${problems.join('\n  - ')}`,
    );
  }
};

/**
 * Guard the write path: a table the FK closure reached must be classified
 * `exported` before its rows may land in the snapshot.
 */
export const assertTableExportable = (
  manifest: SnapshotManifest,
  tableName: string,
): ExportedTableManifest => {
  const entry = manifest[tableName];

  if (entry === undefined || entry.classification !== 'exported') {
    throw new Error(
      `the FK closure reached table '${tableName}' but the manifest classifies it as '${entry?.classification ?? 'unclassified'}' — reclassify it in ${MANIFEST_PATH} or adjust the export scope`,
    );
  }

  return entry;
};
