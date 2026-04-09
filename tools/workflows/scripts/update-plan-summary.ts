#!/usr/bin/env -S pnpm exec tsx
/**
 * One-off: update a Cortex plan's summary. Usage: pnpm exec tsx scripts/update-plan-summary.ts <plan-id> <summary>
 * For multiline summary, pass the rest of the line in quotes or use a single argument.
 */
import {
  ensureDatabaseReachableOrExit,
  getCortexConfigOrExit,
  updatePlanSummary,
} from '../src/utils/cortex-ralph';

const planId = process.argv[2];
const summary = process.argv.slice(3).join(' ').trim();
if (!planId || !summary) {
  console.error(
    'Usage: pnpm exec tsx scripts/update-plan-summary.ts <plan-id> <summary>',
  );
  process.exit(1);
}

(async (): Promise<void> => {
  const config = getCortexConfigOrExit();
  await ensureDatabaseReachableOrExit(config);
  const row = await updatePlanSummary(config, planId, summary);
  if (row) {
    console.log('Updated plan', row.id, 'summary');
  } else {
    console.error('Plan not found or update failed');
    process.exit(1);
  }
})();
