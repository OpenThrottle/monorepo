#!/usr/bin/env -S pnpm exec tsx
/**
 * One-off: update a Cortex task's summary. Usage: pnpm exec tsx scripts/update-task-summary.ts <task-id> <summary>
 */
import {
  ensureDatabaseReachableOrExit,
  getCortexConfigOrExit,
  updateTaskSummary,
} from '../src/utils/cortex-ralph';

const taskId = process.argv[2];
const summary = process.argv.slice(3).join(' ').trim();
if (!taskId || !summary) {
  console.error(
    'Usage: pnpm exec tsx scripts/update-task-summary.ts <task-id> <summary>',
  );
  process.exit(1);
}

(async (): Promise<void> => {
  const config = getCortexConfigOrExit();
  await ensureDatabaseReachableOrExit(config);
  const ok = await updateTaskSummary(config, taskId, summary);
  if (ok) {
    console.log('Updated task', taskId, 'summary');
  } else {
    console.error('Task not found or update failed');
    process.exit(1);
  }
})();
