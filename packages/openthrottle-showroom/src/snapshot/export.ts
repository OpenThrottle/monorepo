/**
 * @description Export a time-windowed, FK-closed snapshot of the workspace
 * database as one JSONL file per table, parents-first, byte-deterministic.
 *
 * The scope is mechanical: windowed root tables (plans, conversations,
 * scheduled jobs and runs, daily stats, skill usage) pull their FK descendants
 * within the window; the knowledge-base tables (documentation, custom prompts)
 * export in full because semantic search reads across them; FK
 * parents of anything exported come along for integrity. Embedding vectors
 * export verbatim — the embedded text is kept, so the vectors stay valid.
 *
 * `transformRow` is the seam the sanitize pass (manifest, secret detector,
 * identity scrub, timestamp rebase) plugs into; the default is identity.
 */

import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RowFetcher, SnapshotScope } from './closure';
import { collectSnapshotRows, orderTablesTopologically } from './closure';
import type { SnapshotManifest } from './manifest';
import { assertManifestMatchesSchema, assertTableExportable } from './manifest';
import { SNAPSHOT_MANIFEST } from './manifest.data';
import type { DatabaseSchema, QueryRunner } from './schema';
import { quoteIdentifier, reflectSchema } from './schema';
import { stableStringify, stableStringifyManifest } from './stable-json';

export const SNAPSHOT_SCOPE: SnapshotScope = {
  // code_embeddings is deliberately ABSENT: the code index spans arbitrary
  // local workspaces, including private repositories (measured 2026-08-27:
  // 4,800 of 5,760 rows were another repo). The manifest denies it.
  fullRoots: ['custom_prompts', 'documentation'],
  windowedRoots: [
    { table: 'agent_conversations', windowColumn: 'created_at' },
    { table: 'daily_stats', windowColumn: 'created_at' },
    { table: 'plans', windowColumn: 'created_at' },
    { table: 'scheduled_agent_job_runs', windowColumn: 'created_at' },
    { table: 'scheduled_agent_jobs', windowColumn: 'created_at' },
    { table: 'skill_usage_events', windowColumn: 'occurred_at' },
  ],
};

/** The manifest file listing exported tables in load order, with row counts. */
export const SNAPSHOT_TABLES_FILE = '_tables.json';

/**
 * Declared as a type alias, not an interface, so it carries the implicit index
 * signature `stableStringifyManifest` needs to serialize it.
 */
export type SnapshotTableSummary = {
  rowCount: number;
  table: string;
};

export interface SnapshotTransformContext {
  /** The rebase anchor; timestamp offsets are relative to it. */
  anchorIso: string;
  manifest: SnapshotManifest;
  schema: DatabaseSchema;
}

export type SnapshotRowTransform = (
  table: string,
  row: Record<string, unknown>,
) => Record<string, unknown> | null;

export interface SnapshotExportOptions {
  /**
   * Rebase anchor. Must be both DATA-independent and CLOCK-independent — the
   * CLI passes a pinned constant. Every timestamp in the snapshot is stored as
   * an offset from this instant, so an anchor derived from the newest row (or
   * from `new Date()`) rewrites every offset in every file and turns a one-row
   * change — or merely exporting on a different day — into an 18MB
   * whole-snapshot diff with no semantic content.
   */
  anchorIso: string;
  cutoffIso: string;
  /** Defaults to the committed SNAPSHOT_MANIFEST; injectable for tests. */
  manifest?: SnapshotManifest;
  outDir: string;
  runner: QueryRunner;
  scope?: SnapshotScope;
  /**
   * Sanitize seam: built after collection so it can see the anchor timestamp.
   * Return the row to write, or null to drop it. Defaults to identity.
   */
  transformFactory?: (
    context: SnapshotTransformContext,
  ) => SnapshotRowTransform;
}

const createPgRowFetcher = (runner: QueryRunner): RowFetcher => ({
  fetchAll: async (table) => {
    const result = await runner.query(
      `SELECT * FROM ${quoteIdentifier(table)}`,
    );

    return result.rows;
  },
  fetchByColumn: async (table, column, values) => {
    const result = await runner.query(
      `SELECT * FROM ${quoteIdentifier(table)}
        WHERE ${quoteIdentifier(column)}::text = ANY($1::text[])`,
      [values.map((value) => String(value))],
    );

    return result.rows;
  },
  fetchSince: async (table, column, cutoffIso) => {
    const result = await runner.query(
      `SELECT * FROM ${quoteIdentifier(table)}
        WHERE ${quoteIdentifier(column)} >= $1::timestamptz`,
      [cutoffIso],
    );

    return result.rows;
  },
});

const comparePrimaryKeys = (left: unknown[], right: unknown[]): number => {
  for (let i = 0; i < left.length; i += 1) {
    const a = left[i];
    const b = right[i];
    const aNumber = typeof a === 'number' ? a : Number(a);
    const bNumber = typeof b === 'number' ? b : Number(b);

    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      if (aNumber !== bNumber) {
        return aNumber - bNumber;
      }

      continue;
    }

    const aText = String(a);
    const bText = String(b);

    if (aText !== bText) {
      return aText < bText ? -1 : 1;
    }
  }

  return 0;
};

const clearSnapshotDir = async (outDir: string): Promise<void> => {
  await mkdir(outDir, { recursive: true });

  const entries = await readdir(outDir);
  const stale = entries.filter(
    (entry) => entry.endsWith('.jsonl') || entry === SNAPSHOT_TABLES_FILE,
  );

  await Promise.all(stale.map((entry) => unlink(join(outDir, entry))));
};

export const exportSnapshot = async (
  options: SnapshotExportOptions,
): Promise<SnapshotTableSummary[]> => {
  const scope = options.scope ?? SNAPSHOT_SCOPE;
  const manifest = options.manifest ?? SNAPSHOT_MANIFEST;
  const schema: DatabaseSchema = await reflectSchema(options.runner);

  // Drift guard: nothing is fetched, let alone written, until every table and
  // every exported column is classified and vector dimensions still match.
  assertManifestMatchesSchema(manifest, schema);

  const fetcher = createPgRowFetcher(options.runner);
  const rows = await collectSnapshotRows(
    fetcher,
    schema,
    scope,
    options.cutoffIso,
  );

  const exportedTables = [...rows.keys()].filter(
    (table) => (rows.get(table)?.size ?? 0) > 0,
  );
  const ordered = orderTablesTopologically(schema, exportedTables);

  const transformRow: SnapshotRowTransform =
    options.transformFactory === undefined
      ? (_table, row) => row
      : options.transformFactory({
          anchorIso: options.anchorIso,
          manifest,
          schema,
        });

  await clearSnapshotDir(options.outDir);

  const summaries: SnapshotTableSummary[] = [];

  /* eslint-disable no-await-in-loop -- sequential deterministic writes */
  for (const table of ordered) {
    const tableSchema = schema.tables.get(table);
    const bucket = rows.get(table);

    if (tableSchema === undefined || bucket === undefined) {
      continue;
    }

    // The closure can only widen (a new FK edge); a reached table must be
    // classified 'exported' before its rows may land in the snapshot.
    assertTableExportable(manifest, table);

    const sortedRows = [...bucket.values()].sort((a, b) =>
      comparePrimaryKeys(
        tableSchema.primaryKey.map((column) => a[column]),
        tableSchema.primaryKey.map((column) => b[column]),
      ),
    );

    const kept: string[] = [];

    for (const row of sortedRows) {
      const transformed = transformRow(table, row);

      if (transformed !== null) {
        kept.push(stableStringify(transformed));
      }
    }

    await writeFile(
      join(options.outDir, `${table}.jsonl`),
      kept.length > 0 ? `${kept.join('\n')}\n` : '',
      'utf8',
    );

    summaries.push({ rowCount: kept.length, table });
  }
  /* eslint-enable no-await-in-loop */

  await writeFile(
    join(options.outDir, SNAPSHOT_TABLES_FILE),
    `${stableStringifyManifest(summaries)}\n`,
    'utf8',
  );

  return summaries;
};
