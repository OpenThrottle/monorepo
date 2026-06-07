/**
 * @description Postgres-direct transport for Ralph plan/task I/O (rollback via `WORKFLOW_RALPH_TRANSPORT=postgres-direct`).
 */

import {
  ensurePostgresReachable,
  POSTGRES_UNREACHABLE_HINT,
} from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';
import type {
  CommitLinkInput,
  CommitLinkRow,
  ListPlansByStatusRow,
  PlanRow,
  ProjectRow,
  TaskRow,
  WorkflowRalphConfig,
} from './openthrottle-ralph-types';
import { taskRequirementsFromRow } from './openthrottle-ralph-types';
import { ralphDebugLogger } from './ralph-debug-logger';

/** Suffix for unreachable message (detail is interpolated). Used in thrown Error and README. */
export const RALPH_FATAL_UNREACHABLE_SUFFIX =
  '\n   Check POSTGRES_URL (or POSTGRES_*) and network connectivity. See tools/workflows/README.md.\n';

const requireConnectionString = (config: WorkflowRalphConfig): string => {
  const connectionString = config.connectionString?.trim();

  if (!connectionString) {
    throw new Error(
      'Postgres-direct transport requires connectionString on WorkflowRalphConfig.',
    );
  }

  return connectionString;
};

/**
 * @description Verifies Postgres is reachable (connect + SELECT 1).
 * @deprecated Import {@link ensurePostgresReachable} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export async function ensureCortexReachablePostgres(
  config: WorkflowRalphConfig,
): Promise<void> {
  const connectionString = requireConnectionString(config);

  try {
    await ensurePostgresReachable(connectionString);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === 'Postgres connection string is required.') {
      throw new Error(
        'Postgres-direct transport requires connectionString on WorkflowRalphConfig.',
      );
    }

    throw new Error(
      message
        .replace(
          'Postgres database is unreachable.',
          'Cortex database is unreachable.',
        )
        .replace(POSTGRES_UNREACHABLE_HINT, RALPH_FATAL_UNREACHABLE_SUFFIX),
    );
  }
}

export async function getTaskByIdPostgres(
  config: WorkflowRalphConfig,
  id: string,
): Promise<TaskRow | null> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
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
      `SELECT id, plan_id, title, description, category, status, requirements, sort_order, created_at, updated_at FROM tasks WHERE id = $1`,
      [id],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      category: row.category,
      createdAt: row.created_at,
      description: row.description,
      id: row.id,
      planId: row.plan_id,
      requirements: taskRequirementsFromRow(row.requirements),
      sortOrder: row.sort_order,
      status: row.status,
      title: row.title,
      updatedAt: row.updated_at,
    };
  } finally {
    await client.end();
  }
}

export async function listPlansByStatusPostgres(
  config: WorkflowRalphConfig,
  status: string,
): Promise<ListPlansByStatusRow[]> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      created_at: string;
      id: string;
      status: string;
      title: string;
    }>(
      `SELECT id, title, status, created_at FROM plans WHERE status = $1 ORDER BY created_at DESC`,
      [status],
    );
    return res.rows.map((row) => ({
      createdAt: row.created_at,
      id: row.id,
      status: row.status,
      title: row.title,
    }));
  } finally {
    await client.end();
  }
}

export async function getPlanByIdPostgres(
  config: WorkflowRalphConfig,
  id: string,
): Promise<PlanRow | null> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
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
      `SELECT id, title, author, category, description, status, summary, created_at, updated_at FROM plans WHERE id = $1`,
      [id],
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

export async function listProjectsPostgres(
  config: WorkflowRalphConfig,
): Promise<ProjectRow[]> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      id: string;
      name: string;
      nx_project_name: string | null;
    }>(`SELECT id, name, nx_project_name FROM projects ORDER BY name`, []);
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      nxProjectName: row.nx_project_name,
    }));
  } finally {
    await client.end();
  }
}

export async function ensureProjectForNxNamePostgres(
  config: WorkflowRalphConfig,
  nxProjectName: string,
): Promise<string> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM projects WHERE nx_project_name = $1 LIMIT 1`,
      [nxProjectName],
    );
    const row = existing.rows[0];
    if (row) return row.id;
    const insert = await client.query<{ id: string }>(
      `INSERT INTO projects (name, nx_project_name) VALUES ($1, $2) RETURNING id`,
      [nxProjectName, nxProjectName],
    );
    const inserted = insert.rows[0];
    if (!inserted) throw new Error('ensureProjectForNxName: no row returned');
    return inserted.id;
  } finally {
    await client.end();
  }
}

export async function updatePlanProjectIdPostgres(
  config: WorkflowRalphConfig,
  planId: string,
  projectId: string | null,
): Promise<boolean> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query(
      `UPDATE plans SET project_id = $1, updated_at = NOW() WHERE id = $2`,
      [projectId, planId],
    );
    return (res.rowCount ?? 0) > 0;
  } finally {
    await client.end();
  }
}

export async function getTasksByPlanIdPostgres(
  config: WorkflowRalphConfig,
  planId: string,
): Promise<TaskRow[]> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
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
    return res.rows.map((row) => ({
      category: row.category,
      createdAt: row.created_at,
      description: row.description,
      id: row.id,
      planId: row.plan_id,
      requirements: taskRequirementsFromRow(row.requirements),
      sortOrder: row.sort_order,
      status: row.status,
      title: row.title,
      updatedAt: row.updated_at,
    }));
  } finally {
    await client.end();
  }
}

export async function updatePlanStatusPostgres(
  config: WorkflowRalphConfig,
  planId: string,
  status: string,
): Promise<PlanRow | null> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    if (status === 'IN_PROGRESS') {
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
        `UPDATE plans SET status = $1, updated_at = NOW() WHERE id = $2 AND status != 'IN_PROGRESS' RETURNING id, title, author, category, description, status, summary, created_at, updated_at`,
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
    }
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

export async function updateTaskStatusPostgres(
  config: WorkflowRalphConfig,
  id: string,
  status: string,
): Promise<TaskRow | null> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
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
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, plan_id, title, description, category, status, requirements, sort_order, created_at, updated_at`,
      [status, id],
    );
    const row = res.rows[0];
    if (!row) return null;
    const taskRow: TaskRow = {
      category: row.category,
      createdAt: row.created_at,
      description: row.description,
      id: row.id,
      planId: row.plan_id,
      requirements: taskRequirementsFromRow(row.requirements),
      sortOrder: row.sort_order,
      status: row.status,
      title: row.title,
      updatedAt: row.updated_at,
    };
    if (status === 'IN_PROGRESS') {
      await updatePlanStatusPostgres(config, taskRow.planId, 'IN_PROGRESS');
    }
    return taskRow;
  } finally {
    await client.end();
  }
}

export async function appendPlanOutputPostgres(
  config: WorkflowRalphConfig,
  planId: string,
  content: string,
  iteration?: number | null,
): Promise<void> {
  if (!content) return;
  ralphDebugLogger.debug('appendPlanOutput', {
    byteLength: content.length,
    iteration: iteration ?? null,
    planId,
  });
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO plan_output_stream (plan_id, iteration, content) VALUES ($1, $2, $3)`,
      [planId, iteration ?? null, content],
    );
  } finally {
    await client.end();
  }
}

export async function insertCommitLinkPostgres(
  config: WorkflowRalphConfig,
  input: CommitLinkInput,
): Promise<CommitLinkRow> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      created_at: string;
      id: string;
      message: string | null;
      plan_id: string;
      repo: string;
      sha: string;
      task_id: string | null;
    }>(
      `INSERT INTO commit_links (plan_id, task_id, repo, sha, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, plan_id, task_id, repo, sha, message, created_at`,
      [
        input.planId,
        input.taskId ?? null,
        input.repo,
        input.sha,
        input.message ?? null,
      ],
    );
    const row = res.rows[0];
    if (!row) throw new Error('insertCommitLink: no row returned');
    return {
      createdAt: row.created_at,
      id: row.id,
      message: row.message,
      planId: row.plan_id,
      repo: row.repo,
      sha: row.sha,
      taskId: row.task_id,
    };
  } finally {
    await client.end();
  }
}
