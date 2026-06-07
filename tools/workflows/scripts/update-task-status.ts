#!/usr/bin/env -S pnpm exec tsx
/**
 * One-off: update a Cortex task's status. Usage: pnpm exec tsx scripts/update-task-status.ts <task-id> <status>
 */
import {
  ensureDatabaseReachableOrExit,
  getCortexConfigOrExit,
  updateTaskStatus,
} from '../src/utils/openthrottle-ralph';

const taskId = process.argv[2];
const statusRaw = process.argv[3];
if (!taskId || !statusRaw) {
  console.error(
    'Usage: pnpm exec tsx scripts/update-task-status.ts <task-id> <status>',
  );
  process.exit(1);
}

/** Normalize status to Cortex plan_task_status enum (uppercase). Accepts lowercase/snake. */
const STATUS_MAP: Record<string, string> = {
  backlog: 'BACKLOG',
  blocked: 'BLOCKED',
  canceled: 'CANCELED',
  completed: 'COMPLETED',
  in_progress: 'IN_PROGRESS',
  pending: 'PENDING',
  skipped: 'SKIPPED',
};
const status = STATUS_MAP[statusRaw.toLowerCase()] ?? statusRaw;

(async (): Promise<void> => {
  const config = getCortexConfigOrExit();
  await ensureDatabaseReachableOrExit(config);
  const row = await updateTaskStatus(config, taskId, status);
  if (row) {
    console.log('Updated task', row.id, 'to status', row.status);
  } else {
    console.error('Task not found or update failed');
    process.exit(1);
  }
})();
