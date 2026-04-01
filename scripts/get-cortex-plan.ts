#!/usr/bin/env node
/**
 * @description Fetches a plan and its tasks from Cortex by plan ID. Uses CORTEX_POSTGRES_* or CORTEX_POSTGRES_URL.
 * Usage: pnpm exec tsx ./scripts/get-cortex-plan.ts <plan-id>
 */
import {
  getCortexPostgresConfig,
  getPlanById,
  getTasksByPlanId,
} from '@openthrottle/ai-mcp/src/cortex-server';

const planId = process.argv[2];
if (!planId) {
  console.error('Usage: tsx ./scripts/get-cortex-plan.ts <plan-id>');
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
  const plan = await getPlanById(config, planId);
  if (!plan) {
    console.error(`No plan found for id: ${planId}`);
    process.exit(1);
  }
  const tasks = await getTasksByPlanId(config, planId);
  console.log(JSON.stringify({ plan, tasks }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
