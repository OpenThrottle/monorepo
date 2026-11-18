/**
 * @description Retention policy for `scheduled_agent_job_runs` — one row per
 * cron fire, run-now or usage-limit resume of a scheduled agent job.
 *
 * Append-only and never pruned: the table grows by one row per fire for as long
 * as a job stays scheduled (47 rows in three months on the audited database,
 * each carrying a settings snapshot and raw usage JSON).
 *
 * Deletes a run only when it is no longer in flight
 * (`SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES`: queued, running), finished (or,
 * if it never started, was created) more than 180 days ago, and is not its job's
 * newest run — so every job keeps its latest outcome on the schedule page.
 *
 * The only reference into the table is the `resume_of_run_id` self-reference,
 * `ON DELETE SET NULL`: a resume run outlives the limited run it continued and
 * loses only the link.
 */

import { SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES } from '@openthrottle/nestjs-repositories';
import type { DataSource } from 'typeorm';

import type { RetentionPolicy } from '../data-retention.types.ts';

/** Finished runs are kept this long. */
const RETENTION_DAYS = 180;

const IN_FLIGHT_STATUSES: readonly string[] = [
  ...SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES,
];

const EXPIRED_RUN_IDS = `
  SELECT r.id
    FROM scheduled_agent_job_runs r
   WHERE r.status <> ALL($1::text[])
     AND COALESCE(r.finished_at, r.created_at) < now() - make_interval(days => $2)
     AND EXISTS (
           SELECT 1
             FROM scheduled_agent_job_runs newer
            WHERE newer.scheduled_agent_job_id = r.scheduled_agent_job_id
              AND (newer.created_at, newer.id) > (r.created_at, r.id)
         )
`;

export const scheduledAgentJobRunsPolicy: RetentionPolicy = {
  countExpired: async (dataSource: DataSource): Promise<number> => {
    const rows: Array<{ count: string }> = await dataSource.query(
      `SELECT count(*)::text AS count FROM (${EXPIRED_RUN_IDS}) expired`,
      [IN_FLIGHT_STATUSES, RETENTION_DAYS],
    );

    return Number(rows[0]?.count ?? 0);
  },

  deleteBatch: async (
    dataSource: DataSource,
    limit: number,
  ): Promise<number> => {
    const rows: Array<{ id: string }> = await dataSource.query(
      `DELETE FROM scheduled_agent_job_runs
        WHERE id IN (SELECT id FROM (${EXPIRED_RUN_IDS} LIMIT $3) batch)
        RETURNING id`,
      [IN_FLIGHT_STATUSES, RETENTION_DAYS, limit],
    );

    return rows.length;
  },

  description: `delete finished scheduled-job runs older than ${RETENTION_DAYS} days, keeping each job's newest run; never delete a queued or running run`,

  name: 'scheduled-agent-job-runs',

  table: 'scheduled_agent_job_runs',
};
