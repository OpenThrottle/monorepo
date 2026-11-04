/**
 * @description Shared select-lock-update-capture mechanics for a bulk task-status write: the
 * chokepoint behind every path that changes MANY tasks' status in one call (plan cancel, plan
 * enqueue, the stale-run sweeper's stranded-plan reconcile). A bulk `.update()` has no per-row
 * `from` — it can only report the single `toStatus` it wrote — so this selects the matching rows
 * under a pessimistic write lock first, updates them by id, then captures one `status_change`
 * work-ledger artifact per row using THAT row's own real prior status, not the bulk `fromStatuses`
 * filter (which can, and for the enqueue reset does, list several different current statuses).
 *
 * `params.manager` MUST be a transactional manager: the `SELECT ... FOR UPDATE` lock only holds for
 * the life of the transaction it runs in, and the row update plus every capture must commit or roll
 * back together with it. This is what keeps the old atomic `UPDATE ... RETURNING`'s guarantee —
 * never emitted-but-not-updated, never updated-but-not-emitted — even though a plain SELECT then
 * UPDATE would otherwise reopen a race window: the row lock blocks a concurrent writer from
 * changing a selected row's status before this update reaches it.
 */

import type { LoggerService } from '@openthrottle/nestjs-modules';
import { Task } from '@openthrottle/nestjs-repositories';
import type { EntityManager } from 'typeorm';

import type { WorkLedgerCaptureService } from './work-ledger-capture.service.ts';
import { WORK_LEDGER_CAPTURE_FAILED_MARKER } from './work-ledger-capture-failure-marker.ts';

/** One row this bulk write actually changed: its id and its status just before the write. */
export interface BulkTaskStatusChangeRow {
  readonly fromStatus: string;
  readonly taskId: string;
}

export interface ApplyBulkTaskStatusChangeParams {
  /** Request-principal actor kind, or `AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT` for a background writer. */
  readonly actorKind: string | undefined;
  /** Request-principal actor sub, or a resolved system-account id for a background writer. */
  readonly actorSub: string | undefined;
  /**
   * True to rethrow a capture failure (rolling back the caller's transaction, and every row this
   * call already updated with it); false to log it behind {@link WORK_LEDGER_CAPTURE_FAILED_MARKER}
   * and leave the row write in place — mirrors
   * {@link import('../plans/plan-status.service.ts').ApplyStatusChangeParams.captureFailureIsFatal}
   * for the single-row plan-status chokepoint.
   */
  readonly captureFailureIsFatal: boolean;
  /** Only tasks currently in one of these statuses are selected, locked, and updated. */
  readonly fromStatuses: readonly string[];
  readonly logger: LoggerService;
  readonly manager: EntityManager;
  readonly planId: string;
  readonly toStatus: string;
  readonly workLedgerCapture: WorkLedgerCaptureService;
}

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
