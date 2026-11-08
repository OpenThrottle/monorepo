import { Task } from '@openthrottle/nestjs-repositories';

import { WORK_LEDGER_CAPTURE_FAILED_MARKER } from '../work-ledger.constants.ts';
import type {
  ApplyBulkTaskStatusChangeParams,
  BulkTaskStatusChangeRow,
} from './bulk-task-status-change.types.ts';

/**
 * @description Selects `planId`'s tasks currently in `fromStatuses` under a pessimistic write lock,
 * updates them (by id) to `toStatus`, then captures one `status_change` artifact per row with that
 * row's own prior status as `from`. Returns the rows actually changed — empty when none matched, in
 * which case neither the update nor any capture runs.
 *
 * Capture calls run concurrently (`Promise.all`, per repo style: no `await` in a loop). A fatal
 * capture failure rejects this call, which — running inside `params.manager`'s transaction — rolls
 * back the row update too; a non-fatal failure is logged per-row and the row update stands.
 */
export async function applyBulkTaskStatusChange(
  params: ApplyBulkTaskStatusChangeParams,
): Promise<readonly BulkTaskStatusChangeRow[]> {
  const taskRepo = params.manager.getRepository(Task);

  const affected = await taskRepo
    .createQueryBuilder('task')
    .setLock('pessimistic_write')
    .where('task.plan_id = :planId', { planId: params.planId })
    .andWhere('task.status IN (:...fromStatuses)', {
      fromStatuses: [...params.fromStatuses],
    })
    .getMany();

  if (affected.length === 0) return [];

  const ids = affected.map((task) => task.id);

  await taskRepo
    .createQueryBuilder()
    .update()
    .set({ status: params.toStatus })
    .where('id IN (:...ids)', { ids })
    .execute();

  // Resolve the session ONCE and share it across every row's capture below: every row in one
  // call shares the SAME actor, so resolving per-row would (absent an ambient session) mint one
  // instant WorkSession per row — a 40-task reset would otherwise open 40 sessions for a single
  // logical event. A failure here is judged by the same fatal/non-fatal policy as a per-row
  // capture failure: fatal rethrows (rolling back the whole update); non-fatal logs ONCE (not once
  // per row — nothing succeeded per-row either way) and skips every row's capture, leaving the
  // already-committed row update in place.
  let sessionId: string;
  try {
    sessionId = await params.workLedgerCapture.resolveSessionId(
      params.manager,
      {
        actorKind: params.actorKind,
        actorSub: params.actorSub,
      },
    );
  } catch (error) {
    if (params.captureFailureIsFatal) throw error;

    params.logger.error(
      `${WORK_LEDGER_CAPTURE_FAILED_MARKER} entity=task planId=${params.planId} taskIds=${affected.map((task) => task.id).join(',')} to=${params.toStatus}: session resolution failed: ${String(error)}`,
      'applyBulkTaskStatusChange',
    );
    return affected.map((task) => ({
      fromStatus: task.status,
      taskId: task.id,
    }));
  }

  await Promise.all(
    affected.map(async (task) => {
      try {
        await params.workLedgerCapture.recordStatusChange(params.manager, {
          actorKind: params.actorKind,
          actorSub: params.actorSub,
          entity: 'task',
          from: task.status,
          id: task.id,
          planId: params.planId,
          sessionId,
          taskId: task.id,
          to: params.toStatus,
        });
      } catch (error) {
        if (params.captureFailureIsFatal) throw error;

        // Deliberately swallowed for non-fatal callers only (background/bulk writers) — see the
        // marker's own doc comment for why this is logged at error rather than warn.
        params.logger.error(
          `${WORK_LEDGER_CAPTURE_FAILED_MARKER} entity=task id=${task.id} from=${task.status} to=${params.toStatus}: ${String(error)}`,
          'applyBulkTaskStatusChange',
        );
      }
    }),
  );

  return affected.map((task) => ({ fromStatus: task.status, taskId: task.id }));
}
