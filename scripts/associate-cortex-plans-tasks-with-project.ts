#!/usr/bin/env node

/**
 * @description Associates plans and tasks in Cortex with NX projects where the
 * association is clear from the title. Uses criteria from
 * docs/openthrottle/plans-tasks-without-project-scope.md and
 * databases/cortex/README.md § Project association.
 * Usage: pnpm exec tsx ./scripts/associate-cortex-plans-tasks-with-project.ts [--dry-run]
 */

import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';
import { Client } from 'pg';

const DRY_RUN = process.argv.includes('--dry-run');

/** NX project names we may associate. Must exist in `projects` (we upsert by nx_project_name). */
const NX_PROJECT_NAMES = [
  'openthrottle-developer',
  'openthrottle-server',
  'openthrottle-website',
  '@openthrottle/ai-mcp',
] as const;

/**
 * Infer NX project from plan title. Returns null when ambiguous or cross-cutting.
 * Conservative: only when title clearly mentions one project.
 */
function inferPlanProject(
  title: string,
): (typeof NX_PROJECT_NAMES)[number] | null {
  const lower = title.toLowerCase();
  if (lower.includes('openthrottle-developer')) return 'openthrottle-developer';
  if (lower.includes('openthrottle-server')) return 'openthrottle-server';
  if (lower.includes('openthrottle-website')) return 'openthrottle-website';
  if (lower.includes('ai-mcp')) return '@openthrottle/ai-mcp';
  return null;
}

/**
 * Infer NX project from task title and plan title. Uses plan context when task is generic.
 */
function inferTaskProject(
  taskTitle: string,
  planTitle: string,
): (typeof NX_PROJECT_NAMES)[number] | null {
  const fromTask = inferPlanProject(taskTitle);
  if (fromTask) return fromTask;
  return inferPlanProject(planTitle);
}

async function main(): Promise<void> {
  const config = getCortexPostgresConfig();
  if (!config) {
    console.error(
      'Cortex Postgres not configured. Set CORTEX_POSTGRES_URL or CORTEX_POSTGRES_* env vars.',
    );
    process.exit(1);
  }
  const client = new Client({ connectionString: config.connectionString });
  await client.connect();
  try {
    if (DRY_RUN) console.log('--- DRY RUN (no writes) ---\n');

    // Ensure project rows exist (by nx_project_name). Projects table has no unique on nx_project_name,
    // so we select the first matching id or insert one.
    const projectIds = new Map<string, string>();
    for (const name of NX_PROJECT_NAMES) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await client.query(
        `SELECT id FROM projects WHERE nx_project_name = $1 LIMIT 1`,
        [name],
      );
      if (existing.rows.length > 0) {
        projectIds.set(name, existing.rows[0].id as string);
      } else {
        if (!DRY_RUN) {
          // eslint-disable-next-line no-await-in-loop
          const ins = await client.query(
            `INSERT INTO projects (name, nx_project_name) VALUES ($1, $2) RETURNING id`,
            [name, name],
          );
          projectIds.set(name, ins.rows[0].id as string);
        } else {
          projectIds.set(name, '<would create>');
        }
      }
    }

    // Plans: update where project_id IS NULL and title matches one project
    const plansRes = await client.query(
      `SELECT id, title FROM plans WHERE project_id IS NULL ORDER BY updated_at DESC`,
    );
    let plansUpdated = 0;
    for (const row of plansRes.rows) {
      const projectName = inferPlanProject(row.title as string);
      if (!projectName) continue;

      const projectId = projectIds.get(projectName);
      if (!projectId || projectId === '<would create>') continue;

      if (!DRY_RUN) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(
          `UPDATE plans SET project_id = $1, project = $2, updated_at = NOW() WHERE id = $3`,
          [projectId, projectName, row.id],
        );
      }
      plansUpdated++;
      console.log(
        `Plan: ${(row.title as string).slice(0, 60)}... → ${projectName}`,
      );
    }

    // Tasks: update where project_id IS NULL and task/plan title matches one project
    const tasksRes = await client.query(
      `SELECT t.id, t.title AS task_title, p.title AS plan_title
       FROM tasks t
       JOIN plans p ON t.plan_id = p.id
       WHERE t.project_id IS NULL
       ORDER BY t.updated_at DESC`,
    );
    let tasksUpdated = 0;
    for (const row of tasksRes.rows) {
      const projectName = inferTaskProject(
        row.task_title as string,
        row.plan_title as string,
      );
      if (!projectName) continue;
      const projectId = projectIds.get(projectName);
      if (!projectId || projectId === '<would create>') continue;
      if (!DRY_RUN) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(
          `UPDATE tasks SET project_id = $1, project = $2, updated_at = NOW() WHERE id = $3`,
          [projectId, projectName, row.id],
        );
      }
      tasksUpdated++;
      const taskTitle = (row.task_title as string).slice(0, 50);
      console.log(
        `Task: ${taskTitle}... (plan: ${(row.plan_title as string).slice(0, 30)}) → ${projectName}`,
      );
    }

    console.log(
      `\n${DRY_RUN ? 'Would update' : 'Updated'}: ${plansUpdated} plans, ${tasksUpdated} tasks.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
