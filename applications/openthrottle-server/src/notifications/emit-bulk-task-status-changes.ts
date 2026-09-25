/**
 * @description Bulk task status updates with matching `task.status_changed` WebSocket events and one
 * `status_change` work-ledger artifact per affected task.
 */

import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { EntityManager } from 'typeorm';

import { applyBulkTaskStatusChange } from '../graphql/work-ledger/bulk-task-status-change.ts';
import type { WorkLedgerCaptureService } from '../graphql/work-ledger/work-ledger-capture.service.ts';
import type { NotificationsService } from './notifications.service.ts';

/**
 * @description Updates tasks matching `fromStatuses` to `toStatus`, capturing one `status_change`
 * work-ledger artifact per affected task (with that task's own real prior status as `from`, never a
 * guess and never the bulk `toStatus`) and emitting one `task.status_changed` event per affected
 * task. Returns the number of rows updated.
 *
 * Delegates the row-locking/update/capture mechanics to {@link applyBulkTaskStatusChange} —
 * `params.manager` must be a transactional manager (the caller's own transaction) so the row reads,
 * the status write, and every status_change capture commit or roll back together; the notification
 * emission below is a fire-and-forget side effect, not part of that transaction.
 *
 * Previously this ran a single atomic `UPDATE ... RETURNING id` (no check-then-act SELECT), which
 * gave "emitted iff updated" for free but had no per-row `from` to ledger. Now
 * {@link applyBulkTaskStatusChange}'s `SELECT ... FOR UPDATE` locks exactly the rows this then
 * updates by id, so a concurrent writer changing one of them between the SELECT and the UPDATE is
 * blocked by the row lock rather than racing it — the same guarantee, kept a different way.
 */
export async function updateMatchingTasksAndEmitStatusChanged(params: {
  readonly actorKind: string | undefined;
  readonly actorSub: string | undefined;
  readonly captureFailureIsFatal: boolean;
  readonly fromStatuses: readonly string[];
  readonly logger: LoggerService;
  readonly manager: EntityManager;
  readonly notifications: NotificationsService;
  readonly planId: string;
  readonly toStatus: string;
  readonly workLedgerCapture: WorkLedgerCaptureService;
}): Promise<number> {
  const affected = await applyBulkTaskStatusChange(params);

  for (const task of affected) {
    params.notifications.emitTaskStatusChanged({
      planId: params.planId,
      status: params.toStatus,
      taskId: task.taskId,
    });
  }

  return affected.length;
}
