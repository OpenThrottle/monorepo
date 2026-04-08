#!/usr/bin/env node

/**
 * @description Updates a task's status in Cortex by task ID. Uses POSTGRES_* or POSTGRES_URL.
 * Usage: pnpm exec tsx ./scripts/update-cortex-task-status.ts <task-id> <status>
 * Example: pnpm exec tsx ./scripts/update-cortex-task-status.ts e918fc4e-7f58-495e-84fe-f14837ae5718 completed
 */

import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';
import { Client } from 'pg';

const taskId = process.argv[2];
const status = process.argv[3];
if (!taskId || !status) {
  console.error(
    'Usage: tsx ./scripts/update-cortex-task-status.ts <task-id> <status>',
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const { connectionString } = getCortexPostgresConfig();

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const res = await client.query(
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, status`,
      [status, taskId],
    );

    const row = res.rows[0];

    if (!row) {
      console.error(`No task found for id: ${taskId}`);
      process.exit(1);
    }

    console.log(JSON.stringify(row, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
