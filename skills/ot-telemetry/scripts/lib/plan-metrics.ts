import type pg from 'pg';

import type { CategoryCount, StatusCount, TagCount } from './count-types.ts';
import type { MetricContext, MetricQuery } from './metric-registry.ts';
import type { WindowCount } from './window-count.ts';
import { countInWindow } from './window-count.ts';

/**
 * @description Plan aggregate metrics (`metrics.plans`) and the plan tag
 * vocabulary distribution (`metrics.plan_tags`), registered as two separate
 * {@link MetricQuery}s so a database missing `plan_tags` alone still gets the
 * rest of the plan metrics rather than losing the whole family. Every query
 * here selects counts, labels, or durations only — never `plans.title`,
 * `plans.description`, or `plans.summary`.
 */

/** Time from `created_at` to `completed_at` for plans completed in the window. */
export interface TimeToCompleteStats {
  readonly medianSeconds: number | null;
  readonly p90Seconds: number | null;
  readonly sampleCount: number;
}

export interface PlansMetrics {
  readonly byCategory: readonly CategoryCount[];
  readonly byStatus: readonly StatusCount[];
  readonly completedInWindow: WindowCount;
  readonly createdInWindow: WindowCount;
  readonly lifetimeTotal: number;
  readonly timeToCompleteInWindow: TimeToCompleteStats;
  readonly zeroTaskPlanCount: number;
}

async function countLifetimeTotal(client: pg.Pool): Promise<number> {
  const { rows } = await client.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM plans',
  );
  return rows[0]?.count ?? 0;
}

async function countByStatus(client: pg.Pool): Promise<readonly StatusCount[]> {
  const { rows } = await client.query<StatusCount>(
    `SELECT status::text AS status, count(*)::int AS count
     FROM plans
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
     FROM plans
     GROUP BY 1
     ORDER BY 1`,
  );
  return rows;
}

async function timeToCompleteInWindow(
  client: pg.Pool,
  window: MetricContext['window'],
): Promise<TimeToCompleteStats> {
  const { rows } = await client.query<{
    medianSeconds: number | null;
    p90Seconds: number | null;
    sampleCount: number;
  }>(
    `SELECT
       percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))) AS "medianSeconds",
       percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))) AS "p90Seconds",
       count(*)::int AS "sampleCount"
     FROM plans
     WHERE completed_at IS NOT NULL AND completed_at >= $1 AND completed_at < $2`,
    [window.since, window.until],
  );

  const row = rows[0];
  return {
    medianSeconds: row?.medianSeconds ?? null,
    p90Seconds: row?.p90Seconds ?? null,
    sampleCount: row?.sampleCount ?? 0,
  };
}

async function countZeroTaskPlans(client: pg.Pool): Promise<number> {
  const { rows } = await client.query<{ count: number }>(
    `SELECT count(*)::int AS count
     FROM plans p
     WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.plan_id = p.id)`,
  );
  return rows[0]?.count ?? 0;
}

/** `metrics.plans` — lifetime/window counts, distributions, and completion latency. */
export const plansMetricQuery: MetricQuery<PlansMetrics> = {
  name: 'plans',
  requires: {
    columns: {
      plans: ['id', 'status', 'category', 'created_at', 'completed_at'],
      tasks: ['plan_id'],
    },
    tables: ['plans', 'tasks'],
  },
  async run({ client, probe, window }: MetricContext): Promise<PlansMetrics> {
    const [
      lifetimeTotal,
      byStatus,
      byCategory,
      createdInWindow,
      completedInWindow,
      timeToComplete,
      zeroTaskPlanCount,
    ] = await Promise.all([
      countLifetimeTotal(client),
      countByStatus(client),
      countByCategory(client),
      countInWindow(client, probe, window, {
        dailyStatsColumn: 'plans_created',
        table: 'plans',
        timestampColumn: 'created_at',
      }),
      countInWindow(client, probe, window, {
        dailyStatsColumn: 'plans_completed',
        table: 'plans',
        timestampColumn: 'completed_at',
      }),
      timeToCompleteInWindow(client, window),
      countZeroTaskPlans(client),
    ]);

    return {
      byCategory,
      byStatus,
      completedInWindow,
      createdInWindow,
      lifetimeTotal,
      timeToCompleteInWindow: timeToComplete,
      zeroTaskPlanCount,
    };
  },
};

/** `metrics.plan_tags` — vocabulary distribution only (tag slugs, never plan content). */
export const planTagsMetricQuery: MetricQuery<readonly TagCount[]> = {
  name: 'plan_tags',
  requires: {
    columns: { plan_tags: ['tag'] },
    tables: ['plan_tags'],
  },
  async run({ client }: MetricContext): Promise<readonly TagCount[]> {
    const { rows } = await client.query<TagCount>(
      `SELECT tag, count(*)::int AS count
       FROM plan_tags
       GROUP BY tag
       ORDER BY count DESC, tag`,
    );
    return rows;
  },
};
