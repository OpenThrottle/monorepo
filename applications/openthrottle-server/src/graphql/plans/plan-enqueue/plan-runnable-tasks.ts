/**
 * @description The single definition of "a task a whole-plan run would pick up", shared by every
 * enqueue guard, the scheduled-run fire decision and the `Plan.runnableTaskCount` loader so they
 * cannot drift.
 */

import { Task } from '@openthrottle/nestjs-repositories';
import type { EntityManager } from 'typeorm';
import { In } from 'typeorm';

/** Task statuses reset to QUEUED when a plan run is enqueued (COMPLETED and PROMOTED tasks are left unchanged: PROMOTED work continued as its own plan, so re-running it here would duplicate it). */
export const ENQUEUE_TASK_STATUSES_TO_RESET = [
  'PENDING',
  'IN_PROGRESS',
  'BLOCKED',
  'BACKLOG',
  'SKIPPED',
  'CANCELED',
] as const;

/** Task statuses a whole-plan run would pick up: every resettable status plus tasks already QUEUED. */
export const RUNNABLE_TASK_STATUSES = [
  ...ENQUEUE_TASK_STATUSES_TO_RESET,
  'QUEUED',
] as const;

/**
 * @description Counts the plan's runnable tasks (status in {@link RUNNABLE_TASK_STATUSES}) through
 * the given manager, so a caller inside a transaction reads within it.
 */
export async function countRunnablePlanTasks(
  manager: EntityManager,
  planId: string,
): Promise<number> {
  return manager.getRepository(Task).count({
    where: { planId, status: In([...RUNNABLE_TASK_STATUSES]) },
  });
}
