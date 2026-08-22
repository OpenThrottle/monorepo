/**
 * @description Factory for the common shape of retention rule: an append-only
 * table with a timestamp column and no dependents, pruned purely by age.
 *
 * Several tables want exactly this and nothing more, so the SQL lives here once
 * instead of being copy-pasted per table. Tables needing conditional windows,
 * per-parent caps or cascade ordering write a bespoke policy instead — see
 * `work-ledger.policy.ts` and `plan-output-stream.policy.ts`.
 *
 * The table and column names are interpolated into the statement rather than
 * bound as parameters, because Postgres does not accept identifiers as bind
 * parameters. They therefore MUST come from this module's callers (compile-time
 * literals), never from request input, and are validated below to make that a
 * hard guarantee rather than a convention.
 */

import type { DataSource } from 'typeorm';
import type { RetentionPolicy } from '../data-retention.types';

/** snake_case identifiers only — anything else is a programming error, not input. */
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

const assertSafeIdentifier = (value: string, label: string): string => {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new Error(
      `Unsafe ${label} in retention policy: "${value}". Identifiers are interpolated into SQL and must be literal snake_case names.`,
    );
  }

  return value;
};

export interface AgeRetentionPolicyOptions {
  /** Timestamp column the age window is measured against. */
  readonly column: string;
  /** Rows older than this many days are deleted. */
  readonly days: number;
  /** Stable policy identifier. */
  readonly name: string;
  /** Why this window is the right one, for logs and docs. */
  readonly rationale: string;
  /** Table to prune. */
  readonly table: string;
}

/**
 * @description Builds a retention policy that deletes rows whose timestamp is
 * older than `days`. Deletes by primary key from a bounded subselect so each
 * batch is a short, index-friendly statement.
 */
export function createAgeRetentionPolicy({
  column,
  days,
  name,
  rationale,
  table,
}: AgeRetentionPolicyOptions): RetentionPolicy {
  const safeTable = assertSafeIdentifier(table, 'table name');
  const safeColumn = assertSafeIdentifier(column, 'column name');

  const expiredIds = `
    SELECT id
      FROM ${safeTable}
     WHERE ${safeColumn} < now() - make_interval(days => $1)
  `;

  return {
    countExpired: async (dataSource: DataSource): Promise<number> => {
      const rows: Array<{ count: string }> = await dataSource.query(
        `SELECT count(*)::text AS count FROM (${expiredIds}) expired`,
        [days],
      );

      return Number(rows[0]?.count ?? 0);
    },

    deleteBatch: async (
      dataSource: DataSource,
      limit: number,
    ): Promise<number> => {
      const rows: Array<{ id: string }> = await dataSource.query(
        `DELETE FROM ${safeTable}
          WHERE id IN (SELECT id FROM (${expiredIds} LIMIT $2) batch)
          RETURNING id`,
        [days, limit],
      );

      return rows.length;
    },

    description: `delete rows older than ${days} days by ${safeColumn} (${rationale})`,

    name,

    table: safeTable,
  };
}
