#!/usr/bin/env -S pnpm exec tsx
/**
 * One-off: update a Cortex plan's status. Usage: pnpm exec tsx scripts/update-plan-status.ts <plan-id> <status>
 */
import {
  ensureDatabaseReachableOrExit,
  getCortexConfigOrExit,
  updatePlanStatus,
} from '../src/utils/openthrottle-ralph';

const planId = process.argv[2];
const statusRaw = process.argv[3];
if (!planId || !statusRaw) {
  console.error(
    'Usage: pnpm exec tsx scripts/update-plan-status.ts <plan-id> <status>',
  );
  process.exit(1);
}

/** Normalize status to Cortex plan_task_status enum (uppercase). Accepts lowercase/snake. */
const STATUS_MAP: Record<string, string> = {
  BACKLOG: 'BACKLOG',
  BLOCKED: 'BLOCKED',
  CANCELED: 'CANCELED',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING: 'PENDING',
  SKIPPED: 'SKIPPED',
};
const status = STATUS_MAP[statusRaw.toLowerCase()] ?? statusRaw;

(async (): Promise<void> => {
  const config = getCortexConfigOrExit();
  await ensureDatabaseReachableOrExit(config);
  const row = await updatePlanStatus(config, planId, status);
  // Direct DB: IN_PROGRESS only applies when current status is not already IN_PROGRESS (see openthrottle-ralph.updatePlanStatus).
  if (row) {
    console.log('Updated plan', row.id, 'to status', row.status);
  } else {
    console.error(
      'Plan not found or update did not apply (e.g. IN_PROGRESS when plan is already IN_PROGRESS).',
    );
    process.exit(1);
  }
})();
