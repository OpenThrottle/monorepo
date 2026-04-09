// #!/usr/bin/env node

// /* eslint-disable no-await-in-loop */

// /**
//  * @description Links plans and tasks that have no project (project_id IS NULL) to
//  * an existing Cortex project when the plan/task title clearly matches one project.
//  * Does not create any new projects. If there is no good match or multiple matches,
//  * leaves the plan/task as-is.
//  *
//  * Usage: pnpm exec tsx ./scripts/link-cortex-plans-tasks-to-existing-projects.ts [--dry-run]
//  */

// import { getPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';
// import { Client } from 'pg';

// const DRY_RUN = process.argv.includes('--dry-run');

// interface ProjectRow {
//   id: string;
//   name: string;
//   nx_project_name: string | null;
// }

// /** Ordered by name length descending so longer names match first (e.g. openthrottle-developer before openthrottle). */
// function buildProjectMatchers(
//   rows: ProjectRow[],
// ): Array<{ id: string; name: string }> {
//   const names = new Map<string, { id: string; name: string }>();
//   for (const r of rows) {
//     const name = (r.nx_project_name ?? r.name).trim();
//     if (!name) continue;
//     if (!names.has(name)) names.set(name, { id: r.id, name });
//   }
//   return [...names.values()].sort((a, b) => b.name.length - a.name.length);
// }

// /**
//  * @description Returns the single existing project that best matches the title, or null if none or ambiguous.
//  */
// function inferProjectFromTitle(
//   title: string,
//   matchers: Array<{ id: string; name: string }>,
// ): { id: string; name: string } | null {
//   const lower = title.toLowerCase();
//   let match: { id: string; name: string } | null = null;
//   for (const m of matchers) {
//     if (lower.includes(m.name.toLowerCase())) {
//       if (match) return null;
//       match = m;
//     }
//   }
//   return match;
// }

// async function main(): Promise<void> {
//   const config = getPostgresConfig();
//   if (!config) {
//     console.error(
//       'Cortex Postgres not configured. Set POSTGRES_URL or POSTGRES_* env vars.',
//     );
//     process.exit(1);
//   }

//   const client = new Client({ connectionString: config.connectionString });
//   await client.connect();

//   try {
//     if (DRY_RUN) console.log('--- DRY RUN (no writes) ---\n');

//     const projectsRes = await client.query<ProjectRow>(
//       `SELECT id, name, nx_project_name FROM projects ORDER BY nx_project_name, name`,
//     );
//     const matchers = buildProjectMatchers(projectsRes.rows);
//     if (matchers.length === 0) {
//       console.log('No projects in DB. Nothing to link.');
//       return;
//     }
//     console.log(
//       `Linking only to existing projects (${matchers.length}): ${matchers.map((m) => m.name).join(', ')}\n`,
//     );

//     // Plans: link when title matches exactly one existing project
//     const plansRes = await client.query(
//       `SELECT id, title FROM plans WHERE project_id IS NULL ORDER BY updated_at DESC`,
//     );
//     let plansUpdated = 0;
//     for (const row of plansRes.rows) {
//       const title = row.title as string;
//       const project = inferProjectFromTitle(title, matchers);
//       if (!project) continue;

//       if (!DRY_RUN) {
//         await client.query(
//           `UPDATE plans SET project_id = $1, project = $2, updated_at = NOW() WHERE id = $3`,
//           [project.id, project.name, row.id],
//         );
//       }
//       plansUpdated++;
//       console.log(
//         `Plan: ${title.slice(0, 60)}${title.length > 60 ? '...' : ''} → ${project.name}`,
//       );
//     }

//     // Tasks: link when task title or plan title matches exactly one existing project
//     const tasksRes = await client.query(
//       `SELECT t.id, t.title AS task_title, p.title AS plan_title
//        FROM tasks t
//        JOIN plans p ON t.plan_id = p.id
//        WHERE t.project_id IS NULL
//        ORDER BY t.updated_at DESC`,
//     );
//     let tasksUpdated = 0;
//     for (const row of tasksRes.rows) {
//       const taskTitle = (row.task_title as string) ?? '';
//       const planTitle = (row.plan_title as string) ?? '';
//       const fromTask = inferProjectFromTitle(taskTitle, matchers);
//       const fromPlan = inferProjectFromTitle(planTitle, matchers);
//       const project = fromTask ?? fromPlan;
//       if (!project) continue;
//       if (fromTask && fromPlan && fromTask.id !== fromPlan.id) continue;

//       if (!DRY_RUN) {
//         await client.query(
//           `UPDATE tasks SET project_id = $1, project = $2, updated_at = NOW() WHERE id = $3`,
//           [project.id, project.name, row.id],
//         );
//       }
//       tasksUpdated++;
//       console.log(
//         `Task: ${taskTitle.slice(0, 50)}${taskTitle.length > 50 ? '...' : ''} (plan: ${planTitle.slice(0, 30)}...) → ${project.name}`,
//       );
//     }

//     console.log(
//       `\n${DRY_RUN ? 'Would link' : 'Linked'}: ${plansUpdated} plans, ${tasksUpdated} tasks. Plans/tasks with no clear match left unchanged.`,
//     );
//   } finally {
//     await client.end();
//   }
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
