/**
 * @description Bulk task status updates with matching `task.status_changed` WebSocket events.
 */

import type { Task } from '@openthrottle/nestjs-repositories';
import { In } from 'typeorm';
import type { Repository } from 'typeorm';
import type { NotificationsService } from './notifications.service';

/**
 * @description Updates tasks matching `fromStatuses` to `toStatus` and emits one
 * `task.status_changed` event per affected task so the developer app revalidates without refresh.
 */
export async function updateMatchingTasksAndEmitStatusChanged(params: {
  readonly fromStatuses: readonly string[];
  readonly notifications: NotificationsService;
  readonly planId: string;
  readonly taskRepo: Repository<Task>;
  readonly toStatus: string;
}): Promise<number> {
  const tasks = await params.taskRepo.find({
    select: ['id'],
    where: {
      planId: params.planId,
      status: In([...params.fromStatuses]),
    },
  });

  if (tasks.length === 0) {
    return 0;
  }

  await params.taskRepo.update(
    {
      planId: params.planId,
      status: In([...params.fromStatuses]),
    },
    { status: params.toStatus },
  );

  for (const task of tasks) {
    params.notifications.emitTaskStatusChanged({
      planId: params.planId,
      status: params.toStatus,
      taskId: task.id,
    });
  }

  return tasks.length;
}
