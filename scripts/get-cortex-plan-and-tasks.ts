#!/usr/bin/env node

/**
 * @description Fetches a plan and its tasks from Cortex. Uses CORTEX_POSTGRES_* or CORTEX_POSTGRES_URL.
 * Usage: pnpm exec tsx ./scripts/get-cortex-plan-and-tasks.ts <plan-id>
 */

import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';
import { Client } from 'pg';

const planId = process.argv[2];
if (!planId) {
  console.error('Usage: tsx ./scripts/get-cortex-plan-and-tasks.ts <plan-id>');
  process.exit(1);
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
    const [planRes, tasksRes] = await Promise.all([
      client.query(
        `SELECT id, title, author, category, description, status, created_at, updated_at FROM plans WHERE id = $1`,
        [planId],
      ),
      client.query(
        `SELECT id, plan_id, title, description, category, status, requirements, created_at, updated_at FROM tasks WHERE plan_id = $1 ORDER BY created_at`,
        [planId],
      ),
    ]);
    const plan = planRes.rows[0] ?? null;
    if (!plan) {
      console.error(`No plan found for id: ${planId}`);
      process.exit(1);
    }
    const tasks = tasksRes.rows;
    console.log(JSON.stringify({ plan, tasks }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
