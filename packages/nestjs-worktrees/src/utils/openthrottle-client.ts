/**
 * @description Minimal OpenThrottle client for worktree child job: reachability check, get tasks, update plan status.
 */

import pg from 'pg';

export interface OpenThrottleRalphConfig {
  readonly connectionString: string;
}

/**
 * @description Verifies OpenThrottle Postgres is reachable (connect + SELECT 1). Throws with a clear message if connection fails.
 */
export async function ensureOpenThrottleReachable(
  config: OpenThrottleRalphConfig,
): Promise<void> {
  const client = new pg.Client({ connectionString: config.connectionString });

  try {
    await client.connect();
    await client.query('SELECT 1');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const message = `🚨 Postgres database is unreachable. Set POSTGRES_URL or POSTGRES_* env vars.`;

    throw new Error(`${message} \n${detail}`);
  } finally {
    await client.end();
  }
}

interface TaskRow {
  readonly category: string | null;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly planId: string;
  readonly requirements: readonly unknown[];
  readonly sortOrder: number;
  readonly status: string;
  readonly title: string;
  readonly updatedAt: string;
}

/**
 * @description Fetches all tasks for a plan, ordered by sortOrder then createdAt.
 */
export async function getTasksByPlanId(
  config: OpenThrottleRalphConfig,
  planId: string,
): Promise<TaskRow[]> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      category: string | null;
      created_at: string;
      description: string | null;
      id: string;
      plan_id: string;
      requirements: unknown;
      sort_order: number;
      status: string;
      title: string;
      updated_at: string;
    }>(
      `SELECT id, plan_id, title, description, category, status, requirements, sort_order, created_at, updated_at FROM tasks WHERE plan_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [planId],
    );
    return res.rows.map((row) => {
      const requirements = row.requirements;
      return {
        category: row.category,
        createdAt: row.created_at,
        description: row.description,
        id: row.id,
        planId: row.plan_id,
        requirements: Array.isArray(requirements) ? requirements : [],
        sortOrder: row.sort_order,
        status: row.status,
        title: row.title,
        updatedAt: row.updated_at,
      };
    });
  } finally {
    await client.end();
  }
}

interface PlanRow {
  readonly author: string;
  readonly category: string;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly status: string;
  readonly summary: string | null;
  readonly title: string;
  readonly updatedAt: string;
}

/**
 * @description Updates a plan's status. Returns updated row or null if not found.
 */
export async function updatePlanStatus(
  config: OpenThrottleRalphConfig,
  planId: string,
  status: string,
): Promise<PlanRow | null> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      author: string;
      category: string;
      created_at: string;
      description: string | null;
      id: string;
      status: string;
      summary: string | null;
      title: string;
      updated_at: string;
    }>(
      `UPDATE plans SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, author, category, description, status, summary, created_at, updated_at`,
      [status, planId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      author: row.author,
      category: row.category,
      createdAt: row.created_at,
      description: row.description,
      id: row.id,
      status: row.status,
      summary: row.summary,
      title: row.title,
      updatedAt: row.updated_at,
    };
  } finally {
    await client.end();
  }
}
