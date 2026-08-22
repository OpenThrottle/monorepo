/**
 * @description Retention policy for `plan_output_stream` — the per-plan agent
 * narration log written by `append_plan_output`.
 *
 * The table is append-only and had no delete path: every Ralph iteration, every
 * `/loop` task and every MCP progress note adds a chunk that stays forever. The
 * audited database held ~3.4k chunks / ~4.4MB spanning nearly seven months, with
 * the largest single plan at ~70 chunks.
 *
 * Two rules, whichever is tighter for a given row:
 *   1. AGE — drop chunks older than the retention window. Old narration has no
 *      reader; the plan and task records carry the durable outcome.
 *   2. PER-PLAN CAP — keep only the newest N chunks of any one plan. This is the
 *      rule that actually protects the table: a single runaway agent loop can
 *      write tens of thousands of chunks to one plan inside the age window, and
 *      an age-only policy would not touch them for months.
 *
 * The cap is applied per plan rather than globally so a busy plan cannot push a
 * quiet plan's recent output out of the table.
 */

import type { DataSource } from 'typeorm';
import type { RetentionPolicy } from '../data-retention.types';

/** Chunks older than this are dropped regardless of the per-plan cap. */
const RETENTION_DAYS = 90;

/** Newest chunks kept per plan, even inside the retention window. */
const MAX_CHUNKS_PER_PLAN = 500;

/**
 * Ranks every chunk within its plan, newest first, and selects the ids that fail
 * either rule. `id` breaks ties in the ranking so the ordering is total and the
 * same row is never both kept and dropped across two batches.
 */
const EXPIRED_IDS_CTE = `
  WITH ranked AS (
    SELECT
      id,
      created_at,
      row_number() OVER (
        PARTITION BY plan_id
        ORDER BY created_at DESC, id DESC
      ) AS chunk_rank
    FROM plan_output_stream
  )
  SELECT id
    FROM ranked
   WHERE created_at < now() - make_interval(days => $1)
      OR chunk_rank > $2
`;

export const planOutputStreamPolicy: RetentionPolicy = {
  countExpired: async (dataSource: DataSource): Promise<number> => {
    const rows: Array<{ count: string }> = await dataSource.query(
      `SELECT count(*)::text AS count FROM (${EXPIRED_IDS_CTE}) expired`,
      [RETENTION_DAYS, MAX_CHUNKS_PER_PLAN],
    );

    return Number(rows[0]?.count ?? 0);
  },

  deleteBatch: async (
    dataSource: DataSource,
    limit: number,
  ): Promise<number> => {
    const rows: Array<{ id: string }> = await dataSource.query(
      `DELETE FROM plan_output_stream
        WHERE id IN (SELECT id FROM (${EXPIRED_IDS_CTE} LIMIT $3) batch)
        RETURNING id`,
      [RETENTION_DAYS, MAX_CHUNKS_PER_PLAN, limit],
    );

    return rows.length;
  },

  description: `keep the newest ${MAX_CHUNKS_PER_PLAN} chunks per plan, and drop any chunk older than ${RETENTION_DAYS} days`,

  name: 'plan-output-stream',

  table: 'plan_output_stream',
};
