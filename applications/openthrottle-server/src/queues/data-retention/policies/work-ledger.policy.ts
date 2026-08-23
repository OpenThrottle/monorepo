/**
 * @description Retention policy for the work ledger — `work_sessions` and, by
 * cascade, `work_session_subjects` and `work_artifacts`.
 *
 * One row set is written per work session: every plan run, every Ralph iteration,
 * every MCP session that attaches a subject. The abandoned-session sweeper closes
 * sessions that were never ended, but nothing has ever deleted historical closed
 * ones. The audited database held ~3.5k sessions / ~3.7k subjects / ~4k artifacts
 * (~5.5MB) accumulated in under seven months.
 *
 * THE UNIT OF RETENTION IS THE SESSION, not the artifact. Both child tables have
 * `session_id ... ON DELETE CASCADE`, so deleting an expired session removes its
 * subjects and artifacts with it. Pruning the children independently would be
 * both slower and capable of leaving a session behind with its evidence gone.
 *
 * Two windows, because not all sessions are worth the same:
 *   - A session holding at least one VERIFIED artifact is provenance: it is how a
 *     plan or task is tied to a merged commit. Kept for a year.
 *   - A session with only unverified or orphaned artifacts — or none at all, which
 *     is most of the abandoned ones — is process residue. Kept 180 days.
 *
 * OPEN sessions are never deleted, whatever their age. An open row may be an
 * in-flight session, and the abandoned-session sweeper closes genuinely dead ones
 * within the hour, after which they become eligible here normally. Racing that
 * sweeper to delete a live session is not a trade worth making.
 *
 * Losing a verified artifact after a year does not lose the traceability itself:
 * per-task work commits carry `Plan-Id:` / `Task-Id:` footers in the git history,
 * which outlives any row here.
 */

import type { DataSource } from 'typeorm';
import type { RetentionPolicy } from '../data-retention.types';

/** Sessions holding a verified artifact are kept this long. */
const VERIFIED_RETENTION_DAYS = 365;

/** Sessions with no verified artifact are kept this long. */
const UNVERIFIED_RETENTION_DAYS = 180;

/**
 * Expired closed sessions. The retention window is chosen per row by whether the
 * session has any verified artifact, so one pass covers both classes.
 */
const EXPIRED_SESSION_IDS = `
  SELECT s.id
    FROM work_sessions s
   WHERE s.ended_at IS NOT NULL
     AND s.started_at < now() - make_interval(days =>
           CASE
             WHEN EXISTS (
               SELECT 1
                 FROM work_artifacts a
                WHERE a.session_id = s.id
                  AND a.verification = 'verified'
             ) THEN $1
             ELSE $2
           END
         )
`;

export const workLedgerPolicy: RetentionPolicy = {
  countExpired: async (dataSource: DataSource): Promise<number> => {
    const rows: Array<{ count: string }> = await dataSource.query(
      `SELECT count(*)::text AS count FROM (${EXPIRED_SESSION_IDS}) expired`,
      [VERIFIED_RETENTION_DAYS, UNVERIFIED_RETENTION_DAYS],
    );

    return Number(rows[0]?.count ?? 0);
  },

  deleteBatch: async (
    dataSource: DataSource,
    limit: number,
  ): Promise<number> => {
    const rows: Array<{ id: string }> = await dataSource.query(
      `DELETE FROM work_sessions
        WHERE id IN (SELECT id FROM (${EXPIRED_SESSION_IDS} LIMIT $3) batch)
        RETURNING id`,
      [VERIFIED_RETENTION_DAYS, UNVERIFIED_RETENTION_DAYS, limit],
    );

    return rows.length;
  },

  description: `delete closed sessions (cascading to subjects and artifacts) after ${VERIFIED_RETENTION_DAYS} days when they hold a verified artifact, ${UNVERIFIED_RETENTION_DAYS} days otherwise; never delete an open session`,

  name: 'work-ledger',

  table: 'work_sessions',
};
