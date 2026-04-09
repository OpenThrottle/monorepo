#!/usr/bin/env node
/**
 * One-off script to load a plan and its tasks from Cortex (same data as get_plan + get_tasks_by_plan_id).
 * Usage: pnpm exec tsx scripts/load-plan.ts <plan-id>
 */

import {
  ensureDatabaseReachableOrExit,
  formatPlanAndTasksForPrompt,
  getCortexConfigOrExit,
  getPlanById,
  getTasksByPlanId,
} from '../src/utils/cortex-ralph';

const planId = process.argv[2] ?? 'a58c1ccc-a04e-41a0-9cf6-641b1bc78ab5';

async function main(): Promise<void> {
  const config = getCortexConfigOrExit();
  await ensureDatabaseReachableOrExit(config);
  const plan = await getPlanById(config, planId);
  const tasks = await getTasksByPlanId(config, planId);
  console.log(formatPlanAndTasksForPrompt(plan, tasks));
  console.log('\n--- Plan (JSON) ---');
  console.log(JSON.stringify(plan, null, 2));
  console.log('\n--- Tasks (JSON) ---');
  console.log(JSON.stringify(tasks, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
