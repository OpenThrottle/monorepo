/**
 * @description Bulk task status updates with matching `task.status_changed` WebSocket events.
 */

import type { Task } from '@openthrottle/nestjs-repositories';
import type { Repository } from 'typeorm';
import type { NotificationsService } from './notifications.service';

/**
 * @description Updates tasks matching `fromStatuses` to `toStatus` and emits one
 * `task.status_changed` event per affected task so the developer app revalidates without refresh.
 *
 * The update is a single atomic `UPDATE ... RETURNING id` (no check-then-act SELECT first), so the
 * emitted events correspond to exactly the rows this statement changed — a task that was changed by
 * a concurrent writer between a SELECT and UPDATE can no longer be emitted-but-not-updated or
 * updated-but-not-emitted. Returns the number of rows updated.
 */
export async function updateMatchingTasksAndEmitStatusChanged(params: {
  readonly fromStatuses: readonly string[];
  readonly notifications: NotificationsService;
  readonly planId: string;
  readonly taskRepo: Repository<Task>;
  readonly toStatus: string;
}): Promise<number> {
  const result = await params.taskRepo
    .createQueryBuilder()
    .update()
    .set({ status: params.toStatus })
    .where('plan_id = :planId', { planId: params.planId })
    .andWhere('status IN (:...fromStatuses)', {
      fromStatuses: [...params.fromStatuses],
    })
    .returning(['id'])
    .execute();

  const rawRows: ReadonlyArray<{ readonly id: string }> = result.raw;
  const updatedIds = rawRows.map((row) => row.id);

  for (const id of updatedIds) {
    params.notifications.emitTaskStatusChanged({
      planId: params.planId,
      status: params.toStatus,
      taskId: id,
    });
  }

  return updatedIds.length;
}
