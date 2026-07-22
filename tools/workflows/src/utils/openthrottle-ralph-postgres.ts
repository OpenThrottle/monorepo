/**
 * @description Postgres-direct transport for Ralph plan/task I/O (rollback via `WORKFLOW_RALPH_TRANSPORT=postgres-direct`).
 */

import {
  ensurePostgresReachable,
  POSTGRES_UNREACHABLE_HINT,
} from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';
import type {
  CliPlanRunCancelMarker,
  CommitLinkInput,
  CommitLinkRow,
  ListPlansByStatusRow,
  PlanRow,
  ProjectRow,
  RegisterCliRunInput,
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
export async function ensureOpenThrottleReachablePostgres(
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
          'OpenThrottle database is unreachable.',
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
    // Stamp completed_at only on transition into COMPLETED; clear when leaving; never overwrite.
    const completedAtSql = `
      completed_at = CASE
        WHEN UPPER($1::text) = 'COMPLETED' AND UPPER(status) <> 'COMPLETED' THEN NOW()
        WHEN UPPER($1::text) <> 'COMPLETED' AND UPPER(status) = 'COMPLETED' THEN NULL
        ELSE completed_at
      END`;

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
        `UPDATE plans SET status = $1, ${completedAtSql}, updated_at = NOW() WHERE id = $2 AND status != 'IN_PROGRESS' RETURNING id, title, author, category, description, status, summary, created_at, updated_at`,
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
      `UPDATE plans SET status = $1, ${completedAtSql}, updated_at = NOW() WHERE id = $2 RETURNING id, title, author, category, description, status, summary, created_at, updated_at`,
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
    // Stamp completed_at only on transition into COMPLETED; clear when leaving; never overwrite.
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
      `UPDATE tasks SET status = $1,
        completed_at = CASE
          WHEN UPPER($1::text) = 'COMPLETED' AND UPPER(status) <> 'COMPLETED' THEN NOW()
          WHEN UPPER($1::text) <> 'COMPLETED' AND UPPER(status) = 'COMPLETED' THEN NULL
          ELSE completed_at
        END,
        updated_at = NOW()
       WHERE id = $2
       RETURNING id, plan_id, title, description, category, status, requirements, sort_order, created_at, updated_at`,
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

/**
 * @description Registers a detached CLI run as a first-class plan_runs row (postgres-direct twin of
 * {@link registerCliPlanRunGraphql}). Direct INSERT with bullmq_job_id NULL (permitted by the partial
 * unique index from migration 076), run_kind 'orchestrator', status 'IN_PROGRESS', and the location
 * columns set. No BullMQ job. Returns the new plan_run id.
 */
export async function registerCliPlanRunPostgres(
  config: WorkflowRalphConfig,
  input: RegisterCliRunInput,
): Promise<string> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query<{ id: string }>(
      `INSERT INTO plan_runs
         (plan_id, bullmq_job_id, execution_backend, run_kind, status, hostname, pid, worker_id)
       VALUES ($1, NULL, $2, 'orchestrator', 'IN_PROGRESS', $3, $4, $5)
       RETURNING id`,
      [
        input.planId,
        input.executionBackend,
        input.location.hostname,
        input.location.pid,
        input.location.workerId,
      ],
    );
    const row = res.rows[0];
    if (!row) throw new Error('registerCliPlanRun: no row returned');
    return row.id;
  } finally {
    await client.end();
  }
}

/**
 * @description Reads the NEWEST plan_runs row's cancel marker for a plan (postgres-direct twin of
 * {@link readPlanRunCancelMarkerGraphql}). Ordered by created_at DESC — the newest row is the one
 * stampCancelRequested marks. Returns null when the plan has no run row.
 */
export async function readPlanRunCancelMarkerPostgres(
  config: WorkflowRalphConfig,
  planId: string,
): Promise<CliPlanRunCancelMarker | null> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      cancel_requested_at: Date | string | null;
      id: string;
      status: string;
    }>(
      `SELECT id, cancel_requested_at, status FROM plan_runs WHERE plan_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [planId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      cancelRequestedAt:
        row.cancel_requested_at instanceof Date
          ? row.cancel_requested_at.toISOString()
          : (row.cancel_requested_at ?? null),
      planRunId: row.id,
      status: row.status,
    };
  } finally {
    await client.end();
  }
}

/**
 * @description Settles a detached CLI run row on exit (postgres-direct twin of
 * {@link settleCliPlanRunGraphql}): sets the terminal status and clears the location columns, keyed
 * on the run id.
 */
export async function settleCliPlanRunPostgres(
  config: WorkflowRalphConfig,
  planRunId: string,
  status: string,
): Promise<void> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `UPDATE plan_runs SET status = $2, hostname = NULL, pid = NULL, worker_id = NULL, updated_at = NOW() WHERE id = $1`,
      [planRunId, status],
    );
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

/**
 * @description Links a git commit to a plan/task by writing the work ledger rather than the
 * deprecated commit_links base table — the postgres-transport twin of insertCommitLinkGraphql
 * (which routes through the linkCommit mutation, ledger-only after 5/6). Replicates the server's
 * create-or-promote in SQL (node-client 2/6 does the same for its DataSource): resolves the
 * 'workflow-ralph' service account, creates-or-reuses a per-(plan,task) instant session, ensures
 * the (session,plan,task) subject via the COALESCE zero-uuid sentinel, and upserts a git_commit
 * artifact (source='agent', lifecycle='landed', verification='unverified') keyed on the sha so a
 * re-link promotes rather than duplicates. Returns a CommitLinkRow so callers are unaffected
 * (id is the artifact uuid). Wrapped in a transaction for all-or-nothing.
 */
export async function insertCommitLinkPostgres(
  config: WorkflowRalphConfig,
  input: CommitLinkInput,
): Promise<CommitLinkRow> {
  const connectionString = requireConnectionString(config);
  const client = new pg.Client({ connectionString });
  await client.connect();
  const externalRef = `workflow-ralph:${input.planId}:${input.taskId ?? 'plan'}`;
  const externalKey = `github:${input.repo}@${input.sha}`;
  const payload = JSON.stringify({
    landedSha: input.sha,
    repo: input.repo,
    sha: input.sha,
  });
  try {
    await client.query('BEGIN');

    // 1. Actor: the credential-less workflow-ralph service account (Ralph's own identity).
    const saRes = await client.query<{ id: string }>(
      `SELECT id FROM service_accounts WHERE name = 'workflow-ralph' LIMIT 1`,
    );
    const serviceAccountId = saRes.rows[0]?.id;
    if (!serviceAccountId) {
      throw new Error(
        "insertCommitLink: 'workflow-ralph' service account missing",
      );
    }

    // 2. Create-or-reuse the (plan, task) instant session.
    await client.query(
      `INSERT INTO work_sessions
         (actor_service_account_id, closed_by, ended_at, external_ref, on_behalf_of_verified, started_at, tool_name)
       SELECT $1, 'explicit', NOW(), $2, FALSE, NOW(), 'workflow-ralph'
       WHERE NOT EXISTS (SELECT 1 FROM work_sessions WHERE external_ref = $2)`,
      [serviceAccountId, externalRef],
    );
    const sessionRes = await client.query<{ id: string }>(
      `SELECT id FROM work_sessions WHERE external_ref = $1 LIMIT 1`,
      [externalRef],
    );
    const sessionId = sessionRes.rows[0]?.id;
    if (!sessionId) throw new Error('insertCommitLink: session not created');

    // 3. Ensure the (session, plan, task) subject (COALESCE zero-uuid sentinel mirrors the unique index).
    await client.query(
      `INSERT INTO work_session_subjects (plan_id, session_id, task_id)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM work_session_subjects
         WHERE session_id = $2 AND plan_id = $1
           AND COALESCE(task_id, '00000000-0000-0000-0000-000000000000'::uuid)
             = COALESCE($3::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
       )`,
      [input.planId, sessionId, input.taskId ?? null],
    );

    // 4. Upsert the git_commit artifact; promote message/payload, never regress lifecycle/verification.
    const artifactRes = await client.query<{
      id: string;
      message: string | null;
      produced_at: string;
    }>(
      `INSERT INTO work_artifacts
         (external_key, lifecycle, message, payload, produced_at, session_id, source, type, verification)
       VALUES ($1, 'landed', $2, $3::jsonb, NOW(), $4, 'agent', 'git_commit', 'unverified')
       ON CONFLICT (session_id, type, external_key)
       DO UPDATE SET
         message = EXCLUDED.message,
         payload = work_artifacts.payload || EXCLUDED.payload
       RETURNING id, message, produced_at`,
      [externalKey, input.message ?? null, payload, sessionId],
    );
    const row = artifactRes.rows[0];
    if (!row) throw new Error('insertCommitLink: no artifact returned');

    await client.query('COMMIT');

    return {
      createdAt: row.produced_at,
      id: row.id,
      message: row.message,
      planId: input.planId,
      repo: input.repo,
      sha: input.sha,
      taskId: input.taskId ?? null,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}
