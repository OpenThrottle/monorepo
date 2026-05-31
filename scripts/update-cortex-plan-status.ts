#!/usr/bin/env node

/**
 * @description Updates a plan's status in Cortex by plan ID. Uses POSTGRES_* or POSTGRES_URL.
 * Usage: pnpm exec tsx ./scripts/update-cortex-plan-status.ts <plan-id> <status>
 * Example: pnpm exec tsx ./scripts/update-cortex-plan-status.ts 6d3893b9-26f2-4a89-9b6f-207aaed0554a IN_PROGRESS
 */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { Client } from 'pg';

const planId = process.argv[2];
const status = process.argv[3];
if (!planId || !status) {
  console.error(
    'Usage: tsx ./scripts/update-cortex-plan-status.ts <plan-id> <status>',
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const connectionString = getPostgresUrl();
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const res = await client.query(
      `UPDATE plans SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, status`,
      [status, planId],
    );

    const row = res.rows[0];

    if (!row) {
      console.error(`No plan found for id: ${planId}`);
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
