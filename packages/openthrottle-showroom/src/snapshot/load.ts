/**
 * @description Ingest the committed snapshot into the DEMO database, in the
 * exporter's FK-topological order, resolving the rebase markers against seed
 * time so the frozen data renders as a recently-active workspace.
 *
 * Coexistence with the hand-authored hero rows is the delicate part. Hero rows
 * keep their `d0d0d0d0-` ids because existing flows deep-link them; imported
 * rows keep their real ids so a link shown on camera can later match a public
 * instance. The two id spaces must stay disjoint — asserted at load, because a
 * collision would silently overwrite a hero row and change what a recorded
 * flow finds when it navigates.
 *
 * Idempotent by construction: every row upserts on its primary key, so a
 * second unchanged run is a no-op. Where a row collides with an existing one
 * on some OTHER unique key — the same project exported under a real id and
 * hand-authored under a hero one — the existing row wins and the incoming
 * row's children are re-pointed at it; see `upsertRow`.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { quoteIdentifier } from './schema';
import type { DatabaseSchema, QueryRunner, UniqueKey } from './schema';
import { SNAPSHOT_TABLES_FILE } from './export';

/** Ids in this namespace belong to the hand-authored hero fixture. */
export const HERO_ID_PREFIX = 'd0d0d0d0-';

/**
 * `plan_runs` statuses that will not be touched by the server's stale-run
 * sweep. Anything else is coerced to COMPLETED at load: a run with no live
 * heartbeat gets swept, which reconciles its plan's badge between takes.
 */
const TERMINAL_RUN_STATUSES = new Set([
  'CANCELED',
  'COMPLETED',
  'FAILED',
  'STALE',
]);

interface OffsetMarker {
  $offsetDays?: number;
  $offsetMs?: number;
}

interface ByteaMarker {
  $bytea: string;
}

const isByteaMarker = (value: unknown): value is ByteaMarker =>
  typeof value === 'object' &&
  value !== null &&
  '$bytea' in value &&
  typeof Reflect.get(value, '$bytea') === 'string';

const DAY_MS = 86_400_000;

const isOffsetMarker = (value: unknown): value is OffsetMarker =>
  typeof value === 'object' &&
  value !== null &&
  ('$offsetMs' in value || '$offsetDays' in value);

/**
 * Resolve a rebase marker against seed time. `$offsetMs` becomes a timestamp,
 * `$offsetDays` a plain date — offsets are negative, so everything lands in
 * the past and nothing reads as future activity.
 */
export const resolveOffset = (marker: OffsetMarker, seedTime: Date): string => {
  if (marker.$offsetMs !== undefined) {
    return new Date(seedTime.getTime() + marker.$offsetMs).toISOString();
  }

  const dayStart = Math.floor(seedTime.getTime() / DAY_MS) * DAY_MS;
  const resolved = new Date(dayStart + (marker.$offsetDays ?? 0) * DAY_MS);

  return resolved.toISOString().slice(0, 10);
};

/** Values the snapshot encodes as objects, restored to what pg expects. */
const decodeValue = (value: unknown, seedTime: Date): unknown => {
  if (isOffsetMarker(value)) {
    return resolveOffset(value, seedTime);
  }

  if (isByteaMarker(value)) {
    return Buffer.from(value.$bytea, 'hex');
  }

  // Everything else (including jsonb, which the exporter kept as raw text) is
  // already in the form pg accepts as a parameter.
  return value;
};

export interface SnapshotTableFile {
  rowCount: number;
  table: string;
}

/**
 * A snapshot row that was dropped because another row already owned its
 * natural key — either a hero row seeded before the import (the hand-authored
 * `OpenThrottle/monorepo` project and the exported one are the same project,
 * and `projects.nx_project_name` is unique) or an earlier snapshot row on a
 * constraint the source database does not have yet.
 */
export interface ReconciledId {
  /** Primary key of the snapshot row that was dropped. */
  droppedId: string;
  /** Primary key of the row that kept the natural key. */
  keptId: string;
  /** The unique constraint or index that matched. */
  key: string;
  table: string;
}

export interface LoadedTableSummary {
  /** Rows dropped in favour of an existing owner of the same natural key. */
  reconciled: ReconciledId[];
  rowCount: number;
  /** Columns present in the snapshot but absent from the demo schema. */
  skippedColumns: string[];
  table: string;
}

/** Read the committed table manifest — the FK-topological load order. */
export const readSnapshotTables = async (
  dataDir: string,
): Promise<SnapshotTableFile[]> => {
  const raw = await readFile(join(dataDir, SNAPSHOT_TABLES_FILE), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  const tables =
    typeof parsed === 'object' && parsed !== null
      ? Reflect.get(parsed, 'tables')
      : undefined;

  if (!Array.isArray(tables)) {
    throw new Error(
      `${SNAPSHOT_TABLES_FILE} is malformed — re-run snapshot-refresh`,
    );
  }

  return tables;
};

export const readSnapshotRows = async (
  dataDir: string,
  table: string,
): Promise<Record<string, unknown>[]> => {
  const raw = await readFile(join(dataDir, `${table}.jsonl`), 'utf8');

  return raw
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line): Record<string, unknown> => JSON.parse(line));
};

/**
 * A hero id in the snapshot means the export scooped up a demo row (someone
 * pointed the exporter at a seeded database) — refuse rather than overwrite
 * the hand-authored fixture.
 */
export const assertDisjointFromHeroIds = (
  table: string,
  rows: Record<string, unknown>[],
): void => {
  const collisions = rows
    .map((row) => row.id)
    .filter(
      (id): id is string =>
        typeof id === 'string' && id.startsWith(HERO_ID_PREFIX),
    );

  if (collisions.length > 0) {
    throw new Error(
      `snapshot table '${table}' contains ${collisions.length} row(s) in the hero id namespace (${HERO_ID_PREFIX}…), starting with '${collisions[0]}' — the snapshot was exported from a seeded demo database; re-export from the real workspace`,
    );
  }
};

/** Coerce a non-terminal imported run status so the stale sweep leaves it be. */
export const coerceRunStatus = (
  table: string,
  row: Record<string, unknown>,
): Record<string, unknown> => {
  if (table !== 'plan_runs' || typeof row.status !== 'string') {
    return row;
  }

  return TERMINAL_RUN_STATUSES.has(row.status)
    ? row
    : { ...row, status: 'COMPLETED' };
};

export interface LoadSnapshotOptions {
  dataDir: string;
  /**
   * `table.column` keys owned by the ownership remap (every FK into `users`).
   * Excluded from the change comparison for the same reason `updated_at` is:
   * the remap rewrites them after the load, so the stored value never matches
   * the snapshot value, and comparing them would make the loader and the remap
   * fight — the loader restoring the imported owner, the remap flipping it
   * back, every run, forever.
   */
  ownedColumns?: ReadonlySet<string>;
  runner: QueryRunner;
  /** The TARGET (demo) schema — columns, primary keys, FK graph, unique keys. */
  schema: DatabaseSchema;
  seedTime: Date;
}

/**
 * The snapshot is exported from the dev database, which can carry columns the
 * committed migrations do not create yet (an unmerged branch, a hand-applied
 * DDL). The demo database is built from the committed migrations, so it cannot
 * store those values.
 *
 * They are skipped rather than fatal — the demo database is a rendering target,
 * not a system of record, and a column its schema cannot represent is by
 * definition not on camera — but every skip is reported, because a growing list
 * means the dev database has drifted from the migrations.
 */
const partitionColumns = (
  row: Record<string, unknown>,
  targetColumns: Set<string> | undefined,
): { known: string[]; unknown: string[] } => {
  const known: string[] = [];
  const unknown: string[] = [];

  for (const column of Object.keys(row)) {
    if (targetColumns === undefined || targetColumns.has(column)) {
      known.push(column);
    } else {
      unknown.push(column);
    }
  }

  return { known, unknown };
};

const BATCH_SIZE = 200;

/** Postgres SQLSTATE for a unique violation. */
const UNIQUE_VIOLATION = '23505';

const readProperty = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null
    ? Reflect.get(value, key)
    : undefined;

/**
 * The name of the constraint a unique violation names, or undefined for any
 * other failure. TypeORM wraps the driver error, so both layers are checked.
 */
export const uniqueViolationConstraint = (
  error: unknown,
): string | undefined => {
  for (const candidate of [error, readProperty(error, 'driverError')]) {
    if (readProperty(candidate, 'code') !== UNIQUE_VIOLATION) {
      continue;
    }

    const constraint = readProperty(candidate, 'constraint');

    if (typeof constraint === 'string') {
      return constraint;
    }
  }

  return undefined;
};

/**
 * Rewrite the row's foreign keys through the ids reconciled so far, so a child
 * of a dropped row follows its parent to the row that kept the natural key
 * instead of failing the foreign key.
 */
export const applyAliases = (
  table: string,
  row: Record<string, unknown>,
  foreignKeyParents: ReadonlyMap<string, string>,
  aliases: ReadonlyMap<string, ReadonlyMap<string, unknown>>,
): Record<string, unknown> => {
  let result = row;

  for (const [column, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      continue;
    }

    const parent = foreignKeyParents.get(`${table}.${column}`);
    const alias =
      parent === undefined
        ? undefined
        : aliases.get(parent)?.get(String(value));

    if (alias !== undefined) {
      result = { ...result, [column]: alias };
    }
  }

  return result;
};

interface UpsertRowOptions {
  /** Columns written, in the same order as `values`. */
  columns: string[];
  primaryKey: string[];
  row: Record<string, unknown>;
  runner: QueryRunner;
  sql: string;
  table: string;
  uniqueByName: ReadonlyMap<string, UniqueKey>;
  values: unknown[];
}

/**
 * Upsert one row, reconciling a natural-key collision rather than dying on it.
 *
 * `ON CONFLICT` can only nominate ONE constraint, and the loader nominates the
 * primary key — so any OTHER unique key is a hard error, which is what made a
 * re-seed fail: the exported `OpenThrottle/monorepo` project and the
 * hand-authored hero project are the same project under two ids, and
 * `nx_project_name` is unique. Two snapshot rows can collide with each other
 * the same way whenever the demo schema carries a unique index the source
 * database has not got yet, which makes the export legitimately duplicated.
 *
 * Resolution is deliberately reactive — Postgres tells us which constraint
 * lost, we look up the row that owns the key, and the incoming row yields to
 * it. Detecting collisions up front would mean re-implementing unique-index
 * semantics (partial predicates, per-type equality) in JavaScript; letting the
 * database decide costs an extra query only when a collision actually happens.
 * The existing row wins because it is either a hero row that recorded flows
 * deep-link, or the first snapshot row, which keeps the outcome deterministic.
 */
const upsertRow = async (
  options: UpsertRowOptions,
): Promise<ReconciledId | undefined> => {
  try {
    await options.runner.query(options.sql, options.values);

    return undefined;
  } catch (error) {
    const constraint = uniqueViolationConstraint(error);
    const unique =
      constraint === undefined
        ? undefined
        : options.uniqueByName.get(constraint);

    // Aliasing rewrites foreign keys by primary key, so a composite key has
    // nothing to rewrite children with — such a table fails loudly instead.
    if (
      unique === undefined ||
      unique.table !== options.table ||
      options.primaryKey.length !== 1
    ) {
      throw error;
    }

    const indexes = unique.columns.map((column) =>
      options.columns.indexOf(column),
    );

    if (indexes.includes(-1)) {
      throw error;
    }

    const owner = await options.runner.query(
      `SELECT ${quoteIdentifier(options.primaryKey[0])} AS owner
         FROM ${quoteIdentifier(options.table)}
        WHERE ${unique.columns
          .map(
            (column, position) =>
              `${quoteIdentifier(column)} IS NOT DISTINCT FROM $${position + 1}`,
          )
          .join(' AND ')}
        LIMIT 1`,
      indexes.map((index) => options.values[index]),
    );

    const keptId = owner.rows[0]?.owner;
    const droppedId = options.row[options.primaryKey[0]];

    // No owner found means the violation came from somewhere the natural key
    // cannot explain (a partial index whose predicate we did not evaluate, a
    // concurrent writer) — that is a real failure, not a duplicate.
    if (
      keptId === undefined ||
      keptId === null ||
      droppedId === undefined ||
      droppedId === null ||
      String(keptId) === String(droppedId)
    ) {
      throw error;
    }

    return {
      droppedId: String(droppedId),
      keptId: String(keptId),
      key: unique.name,
      table: options.table,
    };
  }
};

/**
 * Upsert every snapshot row. Columns come from the row itself (the exporter
 * wrote every classified column, dropped ones as null), so a schema that has
 * moved on shows up as a Postgres error naming the column rather than silent
 * data loss.
 */
export const loadSnapshot = async (
  options: LoadSnapshotOptions,
): Promise<LoadedTableSummary[]> => {
  const tables = await readSnapshotTables(options.dataDir);
  const summaries: LoadedTableSummary[] = [];
  const uniqueByName = new Map(
    options.schema.uniqueKeys.map((key) => [key.name, key]),
  );
  const foreignKeyParents = new Map(
    options.schema.foreignKeys.map((edge) => [
      `${edge.childTable}.${edge.childColumn}`,
      edge.parentTable,
    ]),
  );
  // parent table → dropped id → the id that kept the natural key.
  const aliases = new Map<string, Map<string, unknown>>();

  /* eslint-disable no-await-in-loop -- ordered writes on one connection */
  for (const { table } of tables) {
    const rows = await readSnapshotRows(options.dataDir, table);

    assertDisjointFromHeroIds(table, rows);

    const target = options.schema.tables.get(table);
    const primaryKey = target?.primaryKey;

    if (primaryKey === undefined || primaryKey.length === 0) {
      throw new Error(
        `table '${table}' has no primary key in the demo database — did migrations run?`,
      );
    }

    const skippedColumns = new Set<string>();
    const reconciled: ReconciledId[] = [];
    const targetColumns =
      target === undefined ? undefined : new Set(target.columns);

    for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
      const batch = rows.slice(offset, offset + BATCH_SIZE);

      for (const raw of batch) {
        const row = applyAliases(
          table,
          coerceRunStatus(table, raw),
          foreignKeyParents,
          aliases,
        );
        const partition = partitionColumns(row, targetColumns);

        for (const column of partition.unknown) {
          skippedColumns.add(column);
        }

        const columns = partition.known;
        const values = columns.map((column) =>
          decodeValue(row[column], options.seedTime),
        );
        const placeholders = columns.map((_, index) => `$${index + 1}`);
        const updates = columns
          .filter((column) => !primaryKey.includes(column))
          .map(
            (column) =>
              `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`,
          );

        // The UPDATE branch is guarded by an IS DISTINCT FROM comparison so an
        // unchanged row is not written at all. That is not just an
        // optimisation: most of these tables carry a BEFORE UPDATE trigger
        // that stamps `updated_at = now()`, so an unconditional upsert would
        // overwrite the rebased timestamps on every re-seed — 200+ plans would
        // read "updated just now" on camera, and take 7 would disagree with
        // take 1. Skipping the write keeps the seed genuinely idempotent.
        // `updated_at` is excluded from the comparison because the trigger
        // OWNS it: it overwrites whatever we set, so the stored value can
        // never equal the snapshot value, and comparing it would report every
        // row as changed forever on any table `--reset` does not truncate
        // (users, which keeps the demo login). It is still written; it just
        // does not get a vote on whether a write is needed.
        const settable = columns.filter(
          (column) =>
            !primaryKey.includes(column) &&
            column !== 'updated_at' &&
            options.ownedColumns?.has(`${table}.${column}`) !== true,
        );
        const conflictAction =
          updates.length === 0 || settable.length === 0
            ? 'NOTHING'
            : `UPDATE SET ${updates.join(', ')}
               WHERE (${settable
                 .map(
                   (column) =>
                     `${quoteIdentifier(table)}.${quoteIdentifier(column)}`,
                 )
                 .join(', ')})
                 IS DISTINCT FROM (${settable
                   .map((column) => `EXCLUDED.${quoteIdentifier(column)}`)
                   .join(', ')})`;

        const collision = await upsertRow({
          columns,
          primaryKey,
          row,
          runner: options.runner,
          sql: `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')})
           VALUES (${placeholders.join(', ')})
           ON CONFLICT (${primaryKey.map(quoteIdentifier).join(', ')})
           DO ${conflictAction}`,
          table,
          uniqueByName,
          values,
        });

        if (collision !== undefined) {
          reconciled.push(collision);

          const tableAliases = aliases.get(table) ?? new Map<string, unknown>();

          tableAliases.set(collision.droppedId, collision.keptId);
          aliases.set(table, tableAliases);
        }
      }
    }

    summaries.push({
      reconciled,
      rowCount: rows.length,
      skippedColumns: [...skippedColumns].sort(),
      table,
    });
  }
  /* eslint-enable no-await-in-loop */

  return summaries;
};

export interface RemapOwnershipOptions {
  /** The user every imported row should belong to — the demo login. */
  demoUserId: string;
  runner: QueryRunner;
  schema: DatabaseSchema;
}

export interface RemappedColumn {
  column: string;
  rowCount: number;
  table: string;
}

/**
 * Re-point every foreign key into `users` at the demo login user.
 *
 * Without this the import is invisible where it matters most. Most workspace
 * surfaces are scoped to the signed-in user — repositories, tag rules, chat
 * conversations, scheduled jobs — and the imported rows belong to the imported
 * users, not to the demo login. The workspace would hold 125 conversations and
 * render "no conversations yet" on camera, which is precisely the empty-state
 * problem the snapshot exists to solve.
 *
 * Driven off the reflected FK graph rather than a hand-written column list, so
 * a migration that adds a new user-owned table is covered automatically.
 * `users.id` itself is excluded — that is the target, not a reference.
 */
export const remapOwnershipToDemoUser = async (
  options: RemapOwnershipOptions,
): Promise<RemappedColumn[]> => {
  const edges = options.schema.foreignKeys.filter(
    (edge) => edge.parentTable === 'users' && edge.childTable !== 'users',
  );
  const remapped: RemappedColumn[] = [];

  /* eslint-disable no-await-in-loop -- ordered writes on one connection */
  for (const edge of edges) {
    // Collapsing several owners onto one can violate a unique key that
    // includes the owner column — two people's checkout of the SAME path is
    // legitimately two rows until they become one person's. Drop the
    // would-be duplicates first, keeping the lowest id, so the remap does not
    // have to care. Driven off the reflected unique keys, so a new one is
    // handled without touching this code.
    //
    // Partial ones are left alone: their predicate decides which rows even
    // participate, and evaluating it here would delete rows that never
    // conflicted. A collision on one still fails loudly, as it always did.
    const uniques = options.schema.uniqueKeys.filter(
      (key) =>
        key.table === edge.childTable &&
        key.predicate === null &&
        key.columns.includes(edge.childColumn),
    );

    for (const unique of uniques) {
      const others = unique.columns.filter(
        (column) => column !== edge.childColumn,
      );
      const comparison =
        others.length === 0
          ? 'true'
          : `(${others.map((column) => `a.${quoteIdentifier(column)}`).join(', ')})
             IS NOT DISTINCT FROM
             (${others.map((column) => `b.${quoteIdentifier(column)}`).join(', ')})`;

      await options.runner.query(
        `DELETE FROM ${quoteIdentifier(edge.childTable)} a
          USING ${quoteIdentifier(edge.childTable)} b
          WHERE a.id > b.id
            AND a.${quoteIdentifier(edge.childColumn)} IS NOT NULL
            AND b.${quoteIdentifier(edge.childColumn)} IS NOT NULL
            AND ${comparison}`,
      );
    }

    // Counted with an explicit SELECT rather than from the UPDATE result:
    // the runner is TypeORM's `query`, which does not surface RETURNING rows
    // for an UPDATE the way node-postgres does, so a row count read off the
    // result silently under-reports.
    const pending = await options.runner.query(
      `SELECT count(*)::int AS n
         FROM ${quoteIdentifier(edge.childTable)}
        WHERE ${quoteIdentifier(edge.childColumn)} IS NOT NULL
          AND ${quoteIdentifier(edge.childColumn)} <> $1`,
      [options.demoUserId],
    );
    const rowCount = Number(pending.rows[0]?.n ?? 0);

    if (rowCount === 0) {
      continue;
    }

    await options.runner.query(
      `UPDATE ${quoteIdentifier(edge.childTable)}
          SET ${quoteIdentifier(edge.childColumn)} = $1
        WHERE ${quoteIdentifier(edge.childColumn)} IS NOT NULL
          AND ${quoteIdentifier(edge.childColumn)} <> $1`,
      [options.demoUserId],
    );

    remapped.push({
      column: edge.childColumn,
      rowCount,
      table: edge.childTable,
    });
  }
  /* eslint-enable no-await-in-loop */

  return remapped.sort((a, b) =>
    `${a.table}.${a.column}` < `${b.table}.${b.column}` ? -1 : 1,
  );
};
