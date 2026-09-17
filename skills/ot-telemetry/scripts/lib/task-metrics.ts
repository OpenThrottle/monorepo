import type pg from 'pg';

import type { CategoryCount, StatusCount, TagCount } from './count-types.ts';
import type { ReportWindow } from './envelope.ts';
import type { MetricContext, MetricQuery } from './metric-registry.ts';
import type { WindowCount } from './window-count.ts';
import { countInWindow } from './window-count.ts';

/**
 * @description Task aggregate metrics (`metrics.tasks`) and the task tag
 * vocabulary distribution (`metrics.task_tags`), registered as two separate
 * {@link MetricQuery}s so a database missing `task_tags` alone still gets the
 * rest of the task metrics. Every query here selects counts, labels, or
 * durations only — never `tasks.title`, `tasks.description`, `tasks.summary`,
 * or `tasks.requirements`.
 */

/** Tasks-per-plan spread, over every plan (a plan with zero tasks counts as 0). */
export interface TasksPerPlanStats {
  readonly max: number | null;
  readonly median: number | null;
  readonly min: number | null;
  readonly p90: number | null;
  readonly planCount: number;
}

export interface TasksMetrics {
  readonly byCategory: readonly CategoryCount[];
  readonly byStatus: readonly StatusCount[];
  /**
   * Share of the tasks CREATED in the window that have since reached a completed
   * state. Cohort-based, so it is always within [0, 1]; `null` when the window
   * created nothing. Deliberately not `completedInWindow / createdInWindow` —
   * that ratio exceeds 1 whenever tasks created before the window finish inside
   * it, which reads as a bug in a report meant to be shared.
   */
  readonly cohortCompletionRateInWindow: number | null;
  readonly completedInWindow: WindowCount;
  readonly createdInWindow: WindowCount;
  readonly lifetimeTotal: number;
  readonly tasksPerPlan: TasksPerPlanStats;
}

async function countLifetimeTotal(client: pg.Pool): Promise<number> {
  const { rows } = await client.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM tasks',
  );
  return rows[0]?.count ?? 0;
}

async function countByStatus(client: pg.Pool): Promise<readonly StatusCount[]> {
  const { rows } = await client.query<StatusCount>(
    `SELECT status::text AS status, count(*)::int AS count
     FROM tasks
     GROUP BY status
     ORDER BY status`,
  );
  return rows;
}

async function countByCategory(
  client: pg.Pool,
): Promise<readonly CategoryCount[]> {
  const { rows } = await client.query<CategoryCount>(
    `SELECT COALESCE(category, 'uncategorized') AS category, count(*)::int AS count
     FROM tasks
     GROUP BY 1
     ORDER BY 1`,
  );
  return rows;
}

async function tasksPerPlan(client: pg.Pool): Promise<TasksPerPlanStats> {
  const { rows } = await client.query<{
    max: number | null;
    median: number | null;
    min: number | null;
    p90: number | null;
    planCount: number;
  }>(
    `WITH counts AS (
       SELECT p.id, count(t.id)::int AS task_count
       FROM plans p
       LEFT JOIN tasks t ON t.plan_id = p.id
       GROUP BY p.id
     )
     SELECT
       min(task_count)::int AS min,
       max(task_count)::int AS max,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY task_count) AS median,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY task_count) AS p90,
       count(*)::int AS "planCount"
     FROM counts`,
  );

  const row = rows[0];
  return {
    max: row?.max ?? null,
    median: row?.median ?? null,
    min: row?.min ?? null,
    p90: row?.p90 ?? null,
    planCount: row?.planCount ?? 0,
  };
}

/**
 * Of the tasks created inside the window, how many have since completed.
 * Cohort-based by construction: numerator is a strict subset of the denominator.
 */
async function cohortCompletion(
  client: pg.Pool,
  window: ReportWindow,
): Promise<{ readonly completed: number; readonly created: number }> {
  const { rows } = await client.query<{
    completed: number;
    created: number;
  }>(
    `SELECT count(*)::int AS created,
            count(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed
       FROM tasks
      WHERE created_at >= $1 AND created_at < $2`,
    [window.since, window.until],
  );
  return { completed: rows[0]?.completed ?? 0, created: rows[0]?.created ?? 0 };
}

/** `metrics.tasks` — lifetime/window counts, distributions, tasks-per-plan spread, completion rate. */
export const tasksMetricQuery: MetricQuery<TasksMetrics> = {
  name: 'tasks',
  requires: {
    columns: {
      plans: ['id'],
      tasks: [
        'id',
        'plan_id',
        'status',
        'category',
        'created_at',
        'completed_at',
      ],
    },
    tables: ['plans', 'tasks'],
  },
  async run({ client, probe, window }: MetricContext): Promise<TasksMetrics> {
    const [
      lifetimeTotal,
      byStatus,
      byCategory,
      createdInWindow,
      completedInWindow,
      perPlan,
      cohort,
    ] = await Promise.all([
      countLifetimeTotal(client),
      countByStatus(client),
      countByCategory(client),
      countInWindow(client, probe, window, {
        dailyStatsColumn: 'tasks_created',
        table: 'tasks',
        timestampColumn: 'created_at',
      }),
      countInWindow(client, probe, window, {
        dailyStatsColumn: 'tasks_completed',
        table: 'tasks',
        timestampColumn: 'completed_at',
      }),
      tasksPerPlan(client),
      cohortCompletion(client, window),
    ]);

    const cohortCompletionRateInWindow =
      cohort.created > 0 ? cohort.completed / cohort.created : null;

    return {
      byCategory,
      byStatus,
      cohortCompletionRateInWindow,
      completedInWindow,
      createdInWindow,
      lifetimeTotal,
      tasksPerPlan: perPlan,
    };
  },
};

/** `metrics.task_tags` — vocabulary distribution only (tag slugs, never task content). */
export const taskTagsMetricQuery: MetricQuery<readonly TagCount[]> = {
  name: 'task_tags',
  requires: {
    columns: { task_tags: ['tag'] },
    tables: ['task_tags'],
  },
  async run({ client }: MetricContext): Promise<readonly TagCount[]> {
    const { rows } = await client.query<TagCount>(
      `SELECT tag, count(*)::int AS count
       FROM task_tags
       GROUP BY tag
       ORDER BY count DESC, tag`,
    );
    return rows;
  },
};
