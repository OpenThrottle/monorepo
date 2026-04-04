// #!/usr/bin/env node

// /**
//  * @description Lists plans and tasks in Cortex where project_id IS NULL.
//  * Uses CORTEX_POSTGRES_* or CORTEX_POSTGRES_URL. For Ralph: associate plans/tasks with NX projects.
//  * Usage: pnpm exec tsx ./scripts/list-cortex-plans-tasks-without-project.ts
//  */

// import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';
// import { Client } from 'pg';

// async function main(): Promise<void> {
//   const config = getCortexPostgresConfig();
//   if (!config) {
//     console.error(
//       'Cortex Postgres not configured. Set CORTEX_POSTGRES_URL or CORTEX_POSTGRES_* env vars.',
//     );
//     process.exit(1);
//   }
//   const client = new Client({ connectionString: config.connectionString });
//   await client.connect();
//   try {
//     const [plansRes, tasksRes] = await Promise.all([
//       client.query(
//         `SELECT id, title, author, category, status, created_at
//          FROM plans
//          WHERE project_id IS NULL
//          ORDER BY updated_at DESC`,
//       ),
//       client.query(
//         `SELECT t.id, t.plan_id, t.title, t.status, p.title AS plan_title
//          FROM tasks t
//          JOIN plans p ON t.plan_id = p.id
//          WHERE t.project_id IS NULL
//          ORDER BY t.updated_at DESC`,
//       ),
//     ]);
//     const plans = plansRes.rows;
//     const tasks = tasksRes.rows;
//     console.log('--- Plans without project_id ---');
//     console.log(`Count: ${plans.length}\n`);
//     for (const row of plans) {
//       console.log(
//         `${row.id} | ${row.status} | ${row.category ?? ''} | ${row.title}`,
//       );
//     }
//     console.log('\n--- Tasks without project_id ---');
//     console.log(`Count: ${tasks.length}\n`);
//     for (const row of tasks) {
//       console.log(
//         `${row.id} | ${row.status} | ${row.plan_title} | ${row.title}`,
//       );
//     }
//   } finally {
//     await client.end();
//   }
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
