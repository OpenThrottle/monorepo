/**
 * @description Minimal Cortex client for Ralph (plan and task flows): get/update plan and task, format prompt context. Config from @openthrottle/ai-mcp getCortexPostgresConfig().
 * All workflow entry points require Cortex at startup; use getCortexConfigOrExit and ensureCortexReachableOrExit for a single fail-fast flow.
 */

import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';
import pg from 'pg';
import { ralphDebugLogger } from './ralph-debug-logger';

export interface WorkflowRalphConfig {
  readonly connectionString: string;
}

/** Fatal error prefix used by getCortexConfigOrExit and ensureCortexReachableOrExit for consistent CLI output. */
export const RALPH_FATAL_PREFIX = '\n🚨 FATAL: ';

/** Emoji prefix for validation/not-found fatal errors in workflow bins (e.g. plan not found). Use with console.error. */
export const RALPH_WORKFLOW_FATAL_PREFIX = '🚨 ';

/** Shared message when Cortex env is missing. Used by getCortexConfigOrExit and all workflow bins/scripts. */
export const RALPH_FATAL_REQUIRED = `${RALPH_FATAL_PREFIX}Cortex is required. Set POSTGRES_URL or POSTGRES_* and ensure the database is reachable.\n`;

/** Suffix for unreachable message (detail is interpolated). Used in thrown Error and README. */
export const RALPH_FATAL_UNREACHABLE_SUFFIX =
  '\n   Check POSTGRES_URL (or POSTGRES_*) and network connectivity. See tools/workflows/README.md.\n';

/**
 * @description Normalizes JSONB task requirements from Postgres to a readonly array.
 */
function taskRequirementsFromRow(raw: unknown): readonly unknown[] {
  return Array.isArray(raw) ? raw : [];
}

/**
 * @description Returns Cortex config or exits with {@link RALPH_FATAL_REQUIRED}. Use at startup for all workflow entry points (Cortex required).
 */
export function getCortexConfigOrExit(): WorkflowRalphConfig {
  const config = getCortexPostgresConfig();
  if (!config) {
    console.error(RALPH_FATAL_REQUIRED);
    process.exit(1);
  }

  console.log('💰 💰 config 💰 💰', config);
  return config;
}

/**
 * @description Verifies Cortex is reachable or exits with a clear message. Call after getCortexConfigOrExit() for the standard startup flow.
 */
export async function ensureCortexReachableOrExit(
  config: WorkflowRalphConfig,
): Promise<void> {
  try {
    await ensureCortexReachable(config);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${RALPH_FATAL_PREFIX}${msg}\n`);
    process.exit(1);
  }

  console.log('💰 💰 ensureCortexReachableOrExit 💰 💰 SUCCESS');
}

/**
 * @description Verifies Cortex Postgres is reachable (connect + SELECT 1). Throws with a clear message if connection fails. Call before using Cortex when config is required.
 */
export async function ensureCortexReachable(
  config: WorkflowRalphConfig,
): Promise<void> {
  const client = new pg.Client({ connectionString: config.connectionString });

  try {
    await client.connect();
    await client.query('SELECT 1');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cortex database is unreachable. ${detail}${RALPH_FATAL_UNREACHABLE_SUFFIX}`,
    );
  } finally {
    await client.end();
  }
}

export interface TaskRow {
  readonly category: string | null;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly planId: string;
  readonly requirements: readonly unknown[];
  readonly status: string;
  readonly title: string;
  readonly updatedAt: string;
}

export interface PlanRow {
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

export interface ProjectRow {
  readonly id: string;
  readonly name: string;
  readonly nxProjectName: string | null;
}

/**
 * @description Updates a plan's summary (PRD summarization, usage guide). Returns updated row or null if not found.
 */
export async function updatePlanSummary(
  config: WorkflowRalphConfig,
  planId: string,
  summary: string,
): Promise<PlanRow | null> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      id: string;
      title: string;
      author: string;
      category: string;
      description: string | null;
      status: string;
      summary: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `UPDATE plans SET summary = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, author, category, description, status, summary, created_at, updated_at`,
      [summary, planId],
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

/**
 * @description Updates a task's summary (PRD summarization, close-out notes). Returns true if a row was updated.
 */
export async function updateTaskSummary(
  config: WorkflowRalphConfig,
  taskId: string,
  summary: string,
): Promise<boolean> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query(
      `UPDATE tasks SET summary = $1, updated_at = NOW() WHERE id = $2`,
      [summary, taskId],
    );
    return res.rowCount === 1;
  } finally {
    await client.end();
  }
}

/**
 * @description Fetches a task by id, or null if not found.
 */
export async function getTaskById(
  config: WorkflowRalphConfig,
  id: string,
): Promise<TaskRow | null> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      id: string;
      plan_id: string;
      title: string;
      description: string | null;
      category: string | null;
      status: string;
      requirements: unknown;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, plan_id, title, description, category, status, requirements, created_at, updated_at FROM tasks WHERE id = $1`,
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
      status: row.status,
      title: row.title,
      updatedAt: row.updated_at,
    };
  } finally {
    await client.end();
  }
}

export interface ListPlansByStatusRow {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly createdAt: string;
}

/**
 * @description Lists plans in Cortex filtered by status. Returns id, title, status, createdAt.
 */
export async function listPlansByStatus(
  config: WorkflowRalphConfig,
  status: string,
): Promise<ListPlansByStatusRow[]> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      id: string;
      title: string;
      status: string;
      created_at: string;
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

/**
 * @description Fetches a plan by id, or null if not found.
 */
export async function getPlanById(
  config: WorkflowRalphConfig,
  id: string,
): Promise<PlanRow | null> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      id: string;
      title: string;
      author: string;
      category: string;
      description: string | null;
      status: string;
      summary: string | null;
      created_at: string;
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

/**
 * @description Lists all projects from the projects table (id, name, nx_project_name). Use to map plans to NX projects.
 */
export async function listProjects(
  config: WorkflowRalphConfig,
): Promise<ProjectRow[]> {
  const client = new pg.Client({ connectionString: config.connectionString });
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

/**
 * @description Ensures a project row exists for the given NX project name; returns its id. Inserts if missing.
 */
export async function ensureProjectForNxName(
  config: WorkflowRalphConfig,
  nxProjectName: string,
): Promise<string> {
  const client = new pg.Client({ connectionString: config.connectionString });
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

/**
 * @description Updates a plan's project_id (FK to projects). Pass null to clear. Returns true if a row was updated.
 */
export async function updatePlanProjectId(
  config: WorkflowRalphConfig,
  planId: string,
  projectId: string | null,
): Promise<boolean> {
  const client = new pg.Client({ connectionString: config.connectionString });
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

/**
 * @description Fetches all tasks for a plan, ordered by created_at.
 */
export async function getTasksByPlanId(
  config: WorkflowRalphConfig,
  planId: string,
): Promise<TaskRow[]> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      id: string;
      plan_id: string;
      title: string;
      description: string | null;
      category: string | null;
      status: string;
      requirements: unknown;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, plan_id, title, description, category, status, requirements, created_at, updated_at FROM tasks WHERE plan_id = $1 ORDER BY created_at`,
      [planId],
    );
    return res.rows.map((row) => ({
      category: row.category,
      createdAt: row.created_at,
      description: row.description,
      id: row.id,
      planId: row.plan_id,
      requirements: taskRequirementsFromRow(row.requirements),
      status: row.status,
      title: row.title,
      updatedAt: row.updated_at,
    }));
  } finally {
    await client.end();
  }
}

/**
 * @description Formats plan and tasks as plain text for injection into the agent prompt. Ralph uses this so the agent gets full context from Postgres without needing Cortex MCP (get_plan, get_tasks_by_plan_id).
 */
export function formatPlanAndTasksForPrompt(
  plan: PlanRow | null,
  tasks: TaskRow[],
): string {
  const lines: string[] = [
    '--- Cortex plan (injected by Ralph from Postgres)',
    '',
  ];
  if (plan) {
    lines.push(`Plan-Id: ${plan.id}`);
    lines.push(`Title: ${plan.title}`);
    if (plan.description) lines.push(`Description: ${plan.description.trim()}`);
    if (plan.status) lines.push(`Status: ${plan.status}`);
    lines.push('');
  }
  lines.push('Tasks:');
  if (tasks.length === 0) {
    lines.push('  (none)');
  } else {
    for (const t of tasks) {
      lines.push(`  - ${t.id}  ${t.title}  (${t.status})`);
      if (t.description?.trim()) {
        lines.push(`    ${t.description.trim().replace(/\n/g, ' ')}`);
      }
    }
  }
  lines.push('', '---');
  return lines.join('\n');
}

/**
 * @description Updates a task's status (and optionally other fields). Returns updated row or null if not found.
 */
export async function updateTaskStatus(
  config: WorkflowRalphConfig,
  id: string,
  status: string,
): Promise<TaskRow | null> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      id: string;
      plan_id: string;
      title: string;
      description: string | null;
      category: string | null;
      status: string;
      requirements: unknown;
      created_at: string;
      updated_at: string;
    }>(
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, plan_id, title, description, category, status, requirements, created_at, updated_at`,
      [status, id],
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
      status: row.status,
      title: row.title,
      updatedAt: row.updated_at,
    };
  } finally {
    await client.end();
  }
}

/**
 * @description Updates a plan's status in Postgres. For `IN_PROGRESS`, applies
 * `UPDATE … WHERE id = $2 AND status = 'PENDING'` (aligned with
 * `PlansResolver.canApplyInProgressAsTargetStatus` in `plans.resolver.ts`). Returns the
 * updated row, or `null` if the plan id is missing or no row matched (including `IN_PROGRESS`
 * when the plan is not currently `PENDING`). Unlike GraphQL `updatePlan` / `setPlanStatus`,
 * this helper does not treat `IN_PROGRESS` → `IN_PROGRESS` as a no-op: an already-in-progress
 * plan yields no update and `null`. Other target statuses use an unconditional update by id.
 */
export async function updatePlanStatus(
  config: WorkflowRalphConfig,
  planId: string,
  status: string,
): Promise<PlanRow | null> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    if (status === 'IN_PROGRESS') {
      const res = await client.query<{
        id: string;
        title: string;
        author: string;
        category: string;
        description: string | null;
        status: string;
        summary: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `UPDATE plans SET status = $1, updated_at = NOW() WHERE id = $2 AND status = 'PENDING' RETURNING id, title, author, category, description, status, summary, created_at, updated_at`,
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
      id: string;
      title: string;
      author: string;
      category: string;
      description: string | null;
      status: string;
      summary: string | null;
      created_at: string;
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

export interface CommitLinkInput {
  readonly message: string | null;
  readonly planId: string;
  readonly repo: string;
  readonly sha: string;
  readonly taskId: string | null;
}

export interface CommitLinkRow {
  readonly createdAt: string;
  readonly id: string;
  readonly message: string | null;
  readonly planId: string;
  readonly repo: string;
  readonly sha: string;
  readonly taskId: string | null;
}

/**
 * @description Appends a chunk of streaming output to a plan (same as Cortex MCP append_plan_output). Used by child-job when streamToCortex is enabled so plan_output_stream is updated in real time.
 */
export async function appendPlanOutput(
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
  const client = new pg.Client({ connectionString: config.connectionString });
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
 * @description Inserts a commit link (plan/task ↔ repo/sha). Use after PR merge with the squash commit SHA so commit_links stores the one SHA on main.
 */
export async function insertCommitLink(
  config: WorkflowRalphConfig,
  input: CommitLinkInput,
): Promise<CommitLinkRow> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    const res = await client.query<{
      id: string;
      plan_id: string;
      task_id: string | null;
      repo: string;
      sha: string;
      message: string | null;
      created_at: string;
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
