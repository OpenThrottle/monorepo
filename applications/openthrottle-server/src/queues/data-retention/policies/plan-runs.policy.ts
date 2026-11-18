/**
 * @description Retention policy for `plan_runs` — the append-only history of
 * every plan execution (CLI spawns, orchestrator runs, interactive loops).
 *
 * One row per run, never deleted: the audited database held 524 runs in six
 * months. A run row is attribution (which agent, model, branch, worktree), so it
 * is worth keeping for a while, but a run settled half a year ago answers no
 * question the plan, its tasks and the git history do not.
 *
 * Deletes a run only when ALL of these hold:
 *   - its status is terminal ({@link TERMINAL_STATUSES}) — QUEUED, SCHEDULED and
 *     IN_PROGRESS runs are never touched, at any age;
 *   - it was last updated (settled) more than 180 days ago;
 *   - it is not its plan's newest run, so every plan that ever ran keeps its
 *     latest attribution row;
 *   - it has no `agent_trajectories` row. Trajectories cascade from the run, and
 *     `eval_human_labels` cascades from the trajectory, so deleting such a run
 *     would silently delete hand-written eval labels. Trajectory retention is a
 *     separate decision for the eval system, not a side effect of this one.
 *
 * Every other reference is `ON DELETE SET NULL` — `work_sessions.plan_run_id`,
 * `plan_messages.plan_run_id` and the `resume_of_run_id` self-reference — so the
 * work ledger and the plan inbox keep their rows and lose only the link.
 */

import { PLAN_RUN_STATUS } from '@openthrottle/nestjs-repositories-server';
import type { DataSource } from 'typeorm';

import type { RetentionPolicy } from '../data-retention.types.ts';

/** Settled runs are kept this long. */
const RETENTION_DAYS = 180;

/** Statuses a run never leaves. USAGE_LIMITED is terminal for its own row; a continuation is a new row. */
const TERMINAL_STATUSES: readonly string[] = [
  PLAN_RUN_STATUS.CANCELLED,
  PLAN_RUN_STATUS.COMPLETED,
  PLAN_RUN_STATUS.FAILED,
  PLAN_RUN_STATUS.MISSED,
  PLAN_RUN_STATUS.SKIPPED,
  PLAN_RUN_STATUS.STALE,
  PLAN_RUN_STATUS.SUPERSEDED,
  PLAN_RUN_STATUS.USAGE_LIMITED,
];

const EXPIRED_RUN_IDS = `
  SELECT r.id
    FROM plan_runs r
   WHERE r.status = ANY($1::text[])
     AND r.updated_at < now() - make_interval(days => $2)
     AND EXISTS (
           SELECT 1
             FROM plan_runs newer
            WHERE newer.plan_id = r.plan_id
              AND (newer.created_at, newer.id) > (r.created_at, r.id)
         )
     AND NOT EXISTS (
           SELECT 1
             FROM agent_trajectories t
            WHERE t.plan_run_id = r.id
         )
`;

export const planRunsPolicy: RetentionPolicy = {
  countExpired: async (dataSource: DataSource): Promise<number> => {
    const rows: Array<{ count: string }> = await dataSource.query(
      `SELECT count(*)::text AS count FROM (${EXPIRED_RUN_IDS}) expired`,
      [TERMINAL_STATUSES, RETENTION_DAYS],
    );

    return Number(rows[0]?.count ?? 0);
  },

  deleteBatch: async (
    dataSource: DataSource,
    limit: number,
  ): Promise<number> => {
    const rows: Array<{ id: string }> = await dataSource.query(
      `DELETE FROM plan_runs
        WHERE id IN (SELECT id FROM (${EXPIRED_RUN_IDS} LIMIT $3) batch)
        RETURNING id`,
      [TERMINAL_STATUSES, RETENTION_DAYS, limit],
    );

    return rows.length;
  },

  description: `delete terminal runs settled more than ${RETENTION_DAYS} days ago, keeping each plan's newest run and any run with an agent trajectory; never delete a queued, scheduled or in-progress run`,

  name: 'plan-runs',

  table: 'plan_runs',
};
