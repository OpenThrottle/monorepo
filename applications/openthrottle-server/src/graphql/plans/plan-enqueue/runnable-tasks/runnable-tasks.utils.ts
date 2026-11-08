/**
 * @description The single definition of "a task a whole-plan run would pick up", shared by every
 * enqueue guard, the scheduled-run fire decision and the `Plan.runnableTaskCount` loader so they
 * cannot drift.
 */
import { Task } from '@openthrottle/nestjs-repositories';
import type { EntityManager } from 'typeorm';
import { In } from 'typeorm';

import { RUNNABLE_TASK_STATUSES } from './runnable-tasks.constants.ts';

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
