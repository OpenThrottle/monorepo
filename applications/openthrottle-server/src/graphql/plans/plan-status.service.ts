/**
 * @description Owns plan status-transition policy and cancellation orchestration, extracted from
 * {@link PlansResolver} so the resolver no longer carries transition rules. Centralizes the
 * openthrottle-ralph IN_PROGRESS transition policy, status persistence, and the cancel-plan-run flow
 * (queue cancellation + active-run abort + plan/task status reset).
 */

import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  Plan,
  PLAN_RUN_STATUS,
  PlanRunsService,
  PlansService,
  REMAINING_TASK_STATUSES,
  resolveCompletedAtForStatusChange,
  Task,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { Queue } from 'bullmq';
import type { EntityManager } from 'typeorm';
import { In } from 'typeorm';

import { updateMatchingTasksAndEmitStatusChanged } from '../../notifications/emit-bulk-task-status-changes.ts';
import { NotificationsService } from '../../notifications/notifications.service.ts';
import { PlanCancelChannelService } from '../../queues/plans/plan-cancel-channel.service.ts';
import { PlanRunCancellationService } from '../../queues/plans/plan-run-cancellation.service.ts';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants.ts';
import type { RunPlanJobData } from '../../queues/plans/plans.types.ts';
import { WorkLedgerCaptureService } from '../work-ledger/work-ledger-capture.service.ts';
import { WORK_LEDGER_CAPTURE_FAILED_MARKER } from '../work-ledger/work-ledger-capture-failure-marker.ts';
import { cancelPlanRunJobsForPlan } from './cancel-plan-run-jobs.ts';

/**
 * @description Re-exported for backward compatibility. The canonical definition (and its doc
 * comment) now lives at `../work-ledger/work-ledger-capture-failure-marker.ts`, so the bulk
 * task-status writers (`applyBulkTaskStatusChange`) can log the same marker without a circular
 * import back through this module.
 */
export { WORK_LEDGER_CAPTURE_FAILED_MARKER };

const IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE = `Cannot transition to IN_PROGRESS: only PENDING, QUEUED, or already IN_PROGRESS plans may enter this state.`;

/**
 * @description Normalizes plan status for policy checks (GraphQL and DB may differ in case).
 */
function normalizePlanStatusForPolicy(status: string): string {
  return status.trim().toUpperCase();
}

/**
 * @description openthrottle-ralph parity: `UPDATE … SET status = 'IN_PROGRESS' WHERE status != 'IN_PROGRESS'`.
 * Allows `PENDING`, `QUEUED`, and idempotent `IN_PROGRESS` → `IN_PROGRESS`.
 */
function canApplyInProgressAsTargetStatus(currentStatus: string): boolean {
  const s = normalizePlanStatusForPolicy(currentStatus);
  return s === 'PENDING' || s === 'IN_PROGRESS' || s === 'QUEUED';
}

/**
 * @description Machine-readable primary outcome of a cancel-plan-run request (the honest replacement
 * for inferring success from `activeJobIdsCouldNotCancel`). Drives the UI toast/label. `as const`
 * object rather than a TS enum per repo style.
 */
export const CANCEL_PLAN_RUN_OUTCOME = {
  /** A durable cancel was requested for a run not confirmed to be actively executing (e.g. detached CLI, or a run between iterations); it stops at its next checkpoint. */
  CANCELLATION_REQUESTED: 'CANCELLATION_REQUESTED',
  /** No queued job and no live run existed — nothing to cancel. */
  NO_ACTIVE_RUN: 'NO_ACTIVE_RUN',
  /** A queued (not-yet-started) job was removed from the queue; the plan was reset to PENDING. */
  RUN_CANCELLED: 'RUN_CANCELLED',
  /** An actively-executing run was signaled to stop (local abort or cross-process pub/sub); it stops imminently. */
  RUN_STOPPING: 'RUN_STOPPING',
} as const;

export type CancelPlanRunOutcome =
  (typeof CANCEL_PLAN_RUN_OUTCOME)[keyof typeof CANCEL_PLAN_RUN_OUTCOME];

/**
 * @description Parameters for {@link PlanStatusService.applyStatusChange}. `entity` is the caller's
 * already-loaded row: on a valid transition the chokepoint mutates its `status`/`completedAt` in
 * place and leaves persistence to the caller (so a multi-field caller like `updatePlan` can fold the
 * change into one `manager.save`, while a status-only caller can `manager.save`/`manager.update` the
 * same entity right after).
 */
export interface ApplyStatusChangeParams {
  /** Request-principal actor kind, or `AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT` for a background writer. */
  readonly actorKind: string | undefined;
  /** Request-principal sub, or a `StatusChangeSystemAccountService.resolveId()` id for a background writer. */
  readonly actorSub: string | undefined;
  /**
   * True when a work-ledger capture failure must roll back the transaction (user-facing mutations,
   * which run this inside their own `manager.transaction`). False lets a background writer log the
   * failure and still commit the row update — set by later tasks that route background callers here.
   */
  readonly captureFailureIsFatal: boolean;
  /** The caller's already-loaded row; mutated in place on a valid transition. */
  readonly entity: Plan;
  readonly requestedStatus: string;
  /**
   * True to throw on a forbidden IN_PROGRESS transition or on COMPLETED while tasks remain
   * unresolved (user-facing `setStatus` / `updatePlan`). False to return `{ applied: false }`
   * instead (background `writeGuardedStatus` writers — processor settle, parent-plan reconcile)
   * so a worker is not crashed by a BadRequestException.
   */
  readonly throwOnForbiddenInProgress: boolean;
}

/** @description Result of {@link PlanStatusService.applyStatusChange}. */
export type ApplyStatusChangeResult =
  | { readonly applied: false }
  | {
      readonly applied: true;
      readonly fromStatus: string;
      readonly toStatus: string;
    };

/**
 * @description Actor to attribute a chokepoint-routed status write to: a request principal's
 * `kind`/`sub` (from `@CurrentUser`), or `AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT` paired with
 * {@link StatusChangeSystemAccountService.resolveId} for a background BullMQ writer.
 */
export interface StatusChangeActor {
  readonly actorKind: string | undefined;
  readonly actorSub: string | undefined;
}

/** Parameters for {@link PlanStatusService.writeGuardedStatus}. */
export interface WriteGuardedStatusParams {
  readonly actorKind: string | undefined;
  readonly actorSub: string | undefined;
  readonly captureFailureIsFatal: boolean;
  /**
   * When set, the write is skipped unless the freshly-locked row's current status equals this
   * value — mirrors a guarded `UPDATE … WHERE status = <guardCurrentStatus>` without giving up
   * the row lock's freshness. `undefined` means no extra guard beyond
   * {@link PlanStatusService.applyStatusChange}'s own transition policy.
   */
  readonly guardCurrentStatus: string | undefined;
  readonly requestedStatus: string;
  readonly throwOnForbiddenInProgress: boolean;
}

/** @description Outcome of a cancel-plan-run request (mapped to CancelPlanRunResultObject by the resolver). */
interface CancelRunOutcome {
  readonly activeJobIdsCouldNotCancel: string[];
  /** True when the durable cancel marker was stamped on a live run (cross-process/host/CLI guarantee). */
  readonly cancelRequested: boolean;
  readonly noMatchingJob: boolean;
  /** Machine-readable primary outcome for UI messaging. */
  readonly outcome: CancelPlanRunOutcome;
  readonly planId: string;
  readonly planStatusAfter: string | null;
  readonly removedJobIds: string[];
  readonly signaledActiveRunToStop: boolean;
}

/**
 * @description Service owning plan status policy and cancellation orchestration. App-internal; not
 * exported from a package boundary, so no @public tag is required.
 */
@Injectable()
export class PlanStatusService {
  constructor(
    private readonly logger: LoggerService,
    private readonly notificationsService: NotificationsService,
    private readonly planCancelChannel: PlanCancelChannelService,
    private readonly planRunCancellation: PlanRunCancellationService,
    private readonly planRunsService: PlanRunsService,
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
    private readonly workLedgerCapture: WorkLedgerCaptureService,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, void>,
  ) {}

  /** Message thrown when an IN_PROGRESS transition is rejected by policy. */
  readonly forbiddenTransitionMessage =
    IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE;

  /**
   * @description True when a requested status is IN_PROGRESS but the current status forbids that
   * transition. Used by updatePlan to decide whether to reject a no-op IN_PROGRESS request.
   */
  isInProgressBlocked(
    currentStatus: string,
    requestedStatus: string | null | undefined,
  ): boolean {
    if (requestedStatus == null) return false;
    return (
      normalizePlanStatusForPolicy(requestedStatus) === 'IN_PROGRESS' &&
      !canApplyInProgressAsTargetStatus(currentStatus)
    );
  }

  /**
   * @description Builds the BadRequest / warn message used when COMPLETED is refused because the
   * plan still has unresolved tasks. Names each task (id + status) and steers BLOCKED leftovers
   * toward marking the plan BLOCKED instead of COMPLETED.
   */
  unresolvedCompletedMessage(
    unresolved: ReadonlyArray<{ readonly id: string; readonly status: string }>,
  ): string {
    const listed = unresolved
      .map((task) => `${task.id} (${task.status})`)
      .join(', ');
    const hasBlocked = unresolved.some(
      (task) => normalizePlanStatusForPolicy(task.status) === 'BLOCKED',
    );
    const hint = hasBlocked
      ? ' Set the plan to BLOCKED instead when any task is BLOCKED.'
      : ' Resolve or cancel those tasks first.';

    return `Cannot mark plan COMPLETED while unresolved tasks remain: ${listed}.${hint}`;
  }

  /**
   * @description Resolves the next status for a partial plan update. Returns `{ nextStatus }` when
   * the status should change, or `null` when it should stay unchanged (no-op, idempotent, or a
   * forbidden IN_PROGRESS transition that is silently left in place — openthrottle-ralph parity).
   */
  resolveStatusChange(
    currentStatus: string,
    requestedStatus: string,
  ): { nextStatus: string } | null {
    const nextStatus = normalizePlanStatusForPolicy(requestedStatus);
    if (
      nextStatus === 'IN_PROGRESS' &&
      !canApplyInProgressAsTargetStatus(currentStatus)
    ) {
      return null;
    }
    if (normalizePlanStatusForPolicy(currentStatus) === nextStatus) {
      return null;
    }
    return { nextStatus };
  }

  /**
   * @description The one legal way to write `plans.status`: validates the transition, resolves
   * `completedAt`, mutates `params.entity` in place, and captures a `status_change` work-ledger
   * artifact — all using the caller's transactional `manager`, so the artifact write lands in the
   * same transaction as whatever the caller does with the (already-mutated) entity next.
   *
   * Does not persist `params.entity` itself: a multi-field caller (`updatePlan`) folds the mutated
   * status/completedAt into its own `manager.save(entity)` alongside other changed columns; a
   * status-only caller saves/updates the same entity right after this returns. Either way, this
   * method is the only place that assigns `entity.status`.
   *
   * A no-op transition (current === requested) and a forbidden IN_PROGRESS transition (when
   * `throwOnForbiddenInProgress` is false) both return `{ applied: false }` without touching the
   * entity or capturing anything. A forbidden IN_PROGRESS transition throws instead when
   * `throwOnForbiddenInProgress` is true.
   *
   * COMPLETED is refused while any task is in {@link REMAINING_TASK_STATUSES}: user-facing
   * callers pass `throwOnForbiddenInProgress: true` and get a {@link BadRequestException} that
   * names the unresolved tasks; background writers (`writeGuardedStatus` from the processor /
   * `completeParentPlanIfTasksDone`) pass false and get `{ applied: false }` plus a warn log so
   * a worker is not crashed. Rejecting is preferred over silently coercing to BLOCKED.
   *
   * A work-ledger capture failure rethrows (rolling back the caller's transaction) when
   * `captureFailureIsFatal` is true; otherwise it is logged and swallowed so the entity mutation
   * still stands for the caller to persist.
   */
  async applyStatusChange(
    manager: EntityManager,
    params: ApplyStatusChangeParams,
  ): Promise<ApplyStatusChangeResult> {
    const {
      actorKind,
      actorSub,
      captureFailureIsFatal,
      entity,
      requestedStatus,
      throwOnForbiddenInProgress,
    } = params;

    const previousStatus = entity.status;
    const nextStatus = normalizePlanStatusForPolicy(requestedStatus);

    if (
      nextStatus === 'IN_PROGRESS' &&
      !canApplyInProgressAsTargetStatus(previousStatus)
    ) {
      if (throwOnForbiddenInProgress) {
        throw new BadRequestException(IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE);
      }
      return { applied: false };
    }

    if (normalizePlanStatusForPolicy(previousStatus) === nextStatus) {
      return { applied: false };
    }

    if (nextStatus === 'COMPLETED') {
      const unresolved = await manager.getRepository(Task).find({
        select: { id: true, status: true },
        where: {
          planId: entity.id,
          status: In([...REMAINING_TASK_STATUSES]),
        },
      });

      if (unresolved.length > 0) {
        const message = this.unresolvedCompletedMessage(unresolved);

        if (throwOnForbiddenInProgress) {
          throw new BadRequestException(message);
        }

        this.logger.warn(message, PlanStatusService.name);
        return { applied: false };
      }
    }

    entity.status = nextStatus;
    entity.completedAt = resolveCompletedAtForStatusChange({
      currentCompletedAt: entity.completedAt,
      nextStatus,
      previousStatus,
    });

    try {
      await this.workLedgerCapture.recordStatusChange(manager, {
        actorKind,
        actorSub,
        entity: 'plan',
        from: previousStatus,
        id: entity.id,
        planId: entity.id,
        taskId: null,
        to: nextStatus,
      });
    } catch (error) {
      if (captureFailureIsFatal) throw error;

      // Deliberately swallowed for background writers only. This reintroduces the exact
      // failure mode this service exists to close — a status write with no ledger row — so
      // it is logged at error with a fixed marker rather than warn, and the agreement script
      // in databases/ is what detects any drift it causes after the fact.
      this.logger.error(
        `${WORK_LEDGER_CAPTURE_FAILED_MARKER} entity=plan id=${entity.id} from=${previousStatus} to=${nextStatus}: ${String(error)}`,
        PlanStatusService.name,
      );
    }

    return { applied: true, fromStatus: previousStatus, toStatus: nextStatus };
  }

  /**
   * @description Sets a plan's status with transition validation (the setPlanStatus mutation body).
   * Returns the (possibly unchanged) plan, or null when the plan does not exist. Throws
   * BadRequestException when an IN_PROGRESS transition is forbidden. Runs entirely inside one
   * transaction so the row save and the status_change capture commit together.
   */
  async setStatus(
    planId: string,
    requestedStatus: string,
    actor: StatusChangeActor,
  ): Promise<Plan | null> {
    const repo = this.plansService.getRepository();

    return repo.manager.transaction(async (manager) => {
      const planRepo = manager.getRepository(Plan);
      const entity = await planRepo.findOne({ where: { id: planId } });

      if (!entity) return null;

      const result = await this.applyStatusChange(manager, {
        actorKind: actor.actorKind,
        actorSub: actor.actorSub,
        captureFailureIsFatal: true,
        entity,
        requestedStatus,
        throwOnForbiddenInProgress: true,
      });

      if (!result.applied) return entity;

      return planRepo.save(entity);
    });
  }

  /**
   * @description Loads `planId`, applies {@link applyStatusChange} under a pessimistic write lock,
   * and persists the mutated entity — all in one transaction. The lock makes this the guarded-write
   * equivalent of an atomic `UPDATE … WHERE status = <guardCurrentStatus>`: only one transaction can
   * hold the plan row's lock at a time, so the freshly-read status this method (and
   * `applyStatusChange`'s own transition policy) decides on cannot go stale before the save commits.
   * The backbone of `promoteParentPlanToInProgress` and `completeParentPlanIfTasksDone` below, and
   * used directly by background callers with no extra work to fold in (the stale sweeper, the plans
   * worker's own job-start write). `cancelRun` and `setStatus` call `applyStatusChange` directly
   * instead — they already hold a loaded entity or need to combine other work in the same
   * transaction. Returns whether the plan row changed.
   */
  async writeGuardedStatus(
    planId: string,
    params: WriteGuardedStatusParams,
  ): Promise<boolean> {
    const repo = this.plansService.getRepository();

    return repo.manager.transaction(async (manager) => {
      const planRepo = manager.getRepository(Plan);
      const entity = await planRepo.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { id: planId },
      });

      if (!entity) return false;
      if (
        params.guardCurrentStatus != null &&
        entity.status !== params.guardCurrentStatus
      ) {
        return false;
      }

      const result = await this.applyStatusChange(manager, {
        actorKind: params.actorKind,
        actorSub: params.actorSub,
        captureFailureIsFatal: params.captureFailureIsFatal,
        entity,
        requestedStatus: params.requestedStatus,
        throwOnForbiddenInProgress: params.throwOnForbiddenInProgress,
      });

      if (!result.applied) return false;

      await planRepo.save(entity);
      return true;
    });
  }

  /**
   * @description Promotes `planId` to IN_PROGRESS when one of its tasks has just entered
   * IN_PROGRESS (the "any live task implies a live plan" rule) — the write half of what used to be
   * `TasksService.syncParentPlanStatus`. Defers to `applyStatusChange`'s IN_PROGRESS transition
   * policy (PENDING/QUEUED/IN_PROGRESS only), which tightens the old ad hoc
   * `status != 'IN_PROGRESS'` guard that would have happily resurrected a
   * CANCELED/COMPLETED/BACKLOG plan — this method now obeys the same policy every other IN_PROGRESS
   * transition in the app obeys. Returns whether the plan row changed.
   */
  async promoteParentPlanToInProgress(
    planId: string,
    actor: StatusChangeActor,
    captureFailureIsFatal: boolean,
  ): Promise<boolean> {
    return this.writeGuardedStatus(planId, {
      actorKind: actor.actorKind,
      actorSub: actor.actorSub,
      captureFailureIsFatal,
      guardCurrentStatus: undefined,
      requestedStatus: 'IN_PROGRESS',
      throwOnForbiddenInProgress: false,
    });
  }

  /**
   * @description Downward reconcile: completes `planId` when it is IN_PROGRESS and has no
   * remaining (non-terminal) tasks — the write half of what used to be
   * `TasksService.completeParentPlanIfTasksDone`. `TasksService.hasRemainingTasks` answers the
   * "should it change?" question; `guardCurrentStatus: 'IN_PROGRESS'` re-checks the plan is still
   * IN_PROGRESS under the row lock before writing (mirrors the old guarded
   * `UPDATE … WHERE status = 'IN_PROGRESS'`) — enforced explicitly here because
   * `applyStatusChange`'s own transition policy only restricts moves INTO IN_PROGRESS, not out of
   * it, so nothing else would stop a CANCELED/PENDING/BACKLOG plan from being resurrected straight
   * to COMPLETED. Returns whether the plan was completed.
   */
  async completeParentPlanIfTasksDone(
    planId: string,
    actor: StatusChangeActor,
  ): Promise<boolean> {
    const hasRemaining = await this.tasksService.hasRemainingTasks(planId);

    if (hasRemaining) return false;

    return this.writeGuardedStatus(planId, {
      actorKind: actor.actorKind,
      actorSub: actor.actorSub,
      captureFailureIsFatal: true,
      guardCurrentStatus: 'IN_PROGRESS',
      requestedStatus: 'COMPLETED',
      throwOnForbiddenInProgress: false,
    });
  }

  /**
   * @description Cancels BullMQ plan-run jobs for a plan and signals any active run to stop. When a
   * waiting/delayed job was removed or an active run was signaled, resets the plan to PENDING and the
   * plan's QUEUED tasks to PENDING. Throws NotFoundException when the plan does not exist.
   *
   * Also the cancel path for scheduled runs (migration 140): a SCHEDULED run is a delayed job plus a
   * plan_runs row, and removing the job leaves the row behind, so the plan's SCHEDULED rows are
   * settled CANCELLED here, after the job removal. The settle is guarded on `status = SCHEDULED`,
   * which makes a repeat cancel — and a cancel after the run fired (IN_PROGRESS) or settled — a
   * no-op for the row; a job a worker already holds locked (it is firing right now) is left to the
   * worker. Without `planRunId` cancelling is per PLAN, as it always was: every delayed job and
   * SCHEDULED row of the plan goes together. Jobs removed for SCHEDULED rows do not by themselves
   * reset the plan or its tasks — scheduling never changed their status — so cancelling only a
   * scheduled run leaves a COMPLETED plan COMPLETED.
   *
   * With `planRunId` the cancel is scoped to that one run — see {@link cancelScheduledRun}.
   */
  async cancelRun(
    planId: string,
    requestedByUserId: string | null = null,
    actor: StatusChangeActor,
    planRunId: string | null = null,
  ): Promise<CancelRunOutcome> {
    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`🟡 2 - Plan not found: ${planId}`);
    }

    if (planRunId !== null) {
      return this.cancelScheduledRun(planId, planRunId);
    }

    const status = normalizePlanStatusForPolicy(plan.status);
    const cancelable = status === 'QUEUED' || status === 'IN_PROGRESS';
    // A run that is actively executing (vs merely queued) — the distinction between
    // "stopping now" and "cancelled from the queue".
    const runIsExecuting = status === 'IN_PROGRESS';

    // Read BEFORE the removal: which of the jobs about to be removed belong to SCHEDULED rows.
    const scheduledJobIds = new Set(
      (await this.planRunsService.findScheduledByPlanId(planId)).flatMap(
        (run) => (run.bullmqJobId === null ? [] : [run.bullmqJobId]),
      ),
    );

    const queueResult = await cancelPlanRunJobsForPlan(this.plansQueue, planId);

    let signaledActiveRunToStop = false;
    let cancelRequested = false;
    // Whether the run we stamped is one that polls the marker. A run whose owner has
    // no timer (heartbeat_expected = false — an interactive /ot-loop turn) also has no
    // iteration-boundary loop the server can rely on, so a stamp is a request, not a stop.
    let markedRunPollsForCancel = false;

    if (cancelable) {
      // Reach the process that owns this run's AbortController via three layers:
      //  - Channel 0: abort the in-memory controller if this process owns it (zero-hop fast path).
      //  - Channel 1: stamp the durable marker so the owning process/host/CLI stops at its next
      //    iteration boundary even if the pub/sub message is missed (the guarantee).
      //  - Channel 2: publish plan:<id>:cancel so a run active on another process stops immediately.
      signaledActiveRunToStop = this.planRunCancellation.abort(planId);
      const markedRunId = await this.planRunsService.stampCancelRequested(
        planId,
        requestedByUserId,
      );
      await this.planCancelChannel.publishCancel(planId);
      cancelRequested = markedRunId !== null;

      if (markedRunId !== null) {
        const markedRun = await this.planRunsService.findById(markedRunId);
        markedRunPollsForCancel = markedRun?.heartbeatExpected ?? true;
      }
    }

    // Settle the SCHEDULED rows whose delayed job is now gone. Runs after the queue removal and
    // regardless of plan status, so a row whose job was already lost from Redis is not left
    // SCHEDULED forever. A locked-active job is mid-fire: its row is the worker's to flip.
    const cancelledScheduledRuns =
      await this.planRunsService.settleScheduledRunsCancelled(
        planId,
        queueResult.lockedActiveJobIds,
      );

    // Settle the QUEUED rows whose waiting/delayed job was just removed (a usage-limit resume sits
    // delayed for hours), or they read QUEUED forever. Guarded on QUEUED, so a row whose job already
    // started is untouched; SCHEDULED rows were settled just above.
    await this.planRunsService.settleQueuedRunsCancelledByJobIds(
      PLANS_QUEUE_NAME,
      queueResult.removedJobIds,
    );

    // Jobs of an ordinary queued run: removing one means the plan's QUEUED status (and its tasks')
    // no longer has a job behind it, so they reset. A scheduled run's job never set either.
    const removedOrdinaryQueuedJob = queueResult.removedJobIds.some(
      (jobId) => !scheduledJobIds.has(jobId),
    );
    const removedQueuedJob =
      queueResult.removedJobIds.length > 0 || cancelledScheduledRuns > 0;
    // An actively-executing run is being stopped when we aborted it locally, or when we
    // published/stamped a cancel against a plan that is currently IN_PROGRESS.
    //
    // The stamp only counts as a stop when the marked run actually polls the marker. An
    // unsupervised run does not, so claiming RUN_STOPPING for it would reset the plan and
    // its QUEUED tasks to PENDING underneath an agent that is still working and will later
    // write COMPLETED over the reset. It gets the truthful CANCELLATION_REQUESTED instead:
    // the request is recorded, and nothing guarantees anyone is listening. A local abort
    // (Channel 0) still earns RUN_STOPPING — that one is a proven stop, not a request.
    const activeRunStopping =
      signaledActiveRunToStop ||
      (cancelRequested && runIsExecuting && markedRunPollsForCancel);

    let outcome: CancelPlanRunOutcome = CANCEL_PLAN_RUN_OUTCOME.NO_ACTIVE_RUN;
    if (activeRunStopping) {
      outcome = CANCEL_PLAN_RUN_OUTCOME.RUN_STOPPING;
    } else if (removedQueuedJob) {
      outcome = CANCEL_PLAN_RUN_OUTCOME.RUN_CANCELLED;
    } else if (cancelRequested) {
      outcome = CANCEL_PLAN_RUN_OUTCOME.CANCELLATION_REQUESTED;
    }

    // Reset the plan (and its QUEUED tasks) to PENDING when we removed a queued job or stopped an
    // actively-executing run. A pure CANCELLATION_REQUESTED (no confirmed active run) leaves status
    // to the owning run's terminal handling — we do not race it to PENDING.
    const shouldSetPlanPending = removedOrdinaryQueuedJob || activeRunStopping;

    let planStatusAfter: string | null = null;

    if (shouldSetPlanPending) {
      // `plan` was loaded once at the top of this method and is reused here (not re-fetched) —
      // the same staleness window the unconditional `repo.update` this replaced used to accept,
      // preserved rather than widened or narrowed by routing through the chokepoint.
      await repo.manager.transaction(async (manager) => {
        const planRepo = manager.getRepository(Plan);

        await this.applyStatusChange(manager, {
          actorKind: actor.actorKind,
          actorSub: actor.actorSub,
          captureFailureIsFatal: true,
          entity: plan,
          requestedStatus: 'PENDING',
          throwOnForbiddenInProgress: false,
        });

        // applyStatusChange only mutates status/completedAt (and only captures a status_change)
        // when `plan.status` actually differs from PENDING. The write this replaced was an
        // unconditional `UPDATE … SET status = 'PENDING', completed_at = NULL` with no such
        // guard — cancelRun's own `cancelable`/`removedQueuedJob` checks above are the real
        // decision logic here, not this row's current status, so force-normalize both columns
        // to match that unconditional behaviour exactly, whether or not applyStatusChange
        // considered this a no-op transition.
        plan.status = 'PENDING';
        plan.completedAt = null;

        await planRepo.save(plan);
      });

      // A second, separate transaction from the plan-status reset above (this is a distinct
      // table, and the plan row is already committed): select-lock-update-capture the plan's
      // QUEUED tasks under the tasks-table manager's own transaction, attributed to the same
      // request principal with a fatal capture (cancelRun is user-initiated, same as the plan
      // write immediately above it).
      await this.tasksService.getRepository().manager.transaction((manager) =>
        updateMatchingTasksAndEmitStatusChanged({
          actorKind: actor.actorKind,
          actorSub: actor.actorSub,
          captureFailureIsFatal: true,
          fromStatuses: ['QUEUED'],
          logger: this.logger,
          manager,
          notifications: this.notificationsService,
          planId,
          toStatus: 'PENDING',
          workLedgerCapture: this.workLedgerCapture,
        }),
      );

      const refreshed = await repo.findOne({ where: { id: planId } });
      planStatusAfter = refreshed?.status ?? 'PENDING';
    }

    return {
      activeJobIdsCouldNotCancel: [...queueResult.lockedActiveJobIds],
      cancelRequested,
      noMatchingJob: queueResult.matchingJobCount === 0,
      outcome,
      planId,
      planStatusAfter,
      removedJobIds: [...queueResult.removedJobIds],
      signaledActiveRunToStop,
    };
  }

  /**
   * @description The run-scoped cancel behind `cancelPlanRun({ planId, planRunId })`: cancels exactly
   * one SCHEDULED run — removes its delayed BullMQ job and settles its row CANCELLED — and nothing
   * else. No other run of the plan (live or scheduled), no cancel marker, no abort signal, and
   * neither the plan status nor the tasks are touched, so a live run on the same plan survives it.
   *
   * `planRunId` that names no run of `planId` is rejected. A run that is not SCHEDULED:
   *  - already settled (CANCELLED, COMPLETED, FAILED, ...) -> a no-op `NO_ACTIVE_RUN`, so a repeat or
   *    double-clicked cancel is idempotent;
   *  - QUEUED or IN_PROGRESS (it fired, or was never scheduled) -> rejected with a clear message
   *    rather than falling through to the per-plan cancel, which would stop whatever is live on the
   *    plan — surprising for a click aimed at one scheduled run. Omit `planRunId` to stop a live run.
   * A delayed job a worker already holds locked is firing right now: it is reported in
   * `activeJobIdsCouldNotCancel` and the row is left for the worker to flip.
   */
  private async cancelScheduledRun(
    planId: string,
    planRunId: string,
  ): Promise<CancelRunOutcome> {
    const run = await this.planRunsService.findById(planRunId);

    if (!run || run.planId !== planId) {
      throw new BadRequestException(
        `Plan run ${planRunId} was not found for plan ${planId}`,
      );
    }

    const outcomeFor = (
      fields: Pick<
        CancelRunOutcome,
        'activeJobIdsCouldNotCancel' | 'noMatchingJob' | 'removedJobIds'
      > & { readonly outcome: CancelPlanRunOutcome },
    ): CancelRunOutcome => {
      return {
        ...fields,
        cancelRequested: false,
        planId,
        // The plan is deliberately untouched by a run-scoped cancel.
        planStatusAfter: null,
        signaledActiveRunToStop: false,
      };
    };

    if (run.status !== PLAN_RUN_STATUS.SCHEDULED) {
      if (
        run.status === PLAN_RUN_STATUS.QUEUED ||
        run.status === PLAN_RUN_STATUS.IN_PROGRESS
      ) {
        throw new BadRequestException(
          `Plan run ${planRunId} is ${run.status}, not SCHEDULED, so it cannot be cancelled on its own; cancel the plan to stop a live run`,
        );
      }

      return outcomeFor({
        activeJobIdsCouldNotCancel: [],
        noMatchingJob: true,
        outcome: CANCEL_PLAN_RUN_OUTCOME.NO_ACTIVE_RUN,
        removedJobIds: [],
      });
    }

    const jobId = run.bullmqJobId;
    const job =
      jobId === null ? undefined : await this.plansQueue.getJob(jobId);
    let removedJobIds: string[] = [];

    if (job !== undefined && jobId !== null) {
      try {
        await job.remove();
        removedJobIds = [jobId];
      } catch (error) {
        // A locked job is one a worker is running right now (it fired between the read and the
        // remove); its row is the worker's to flip. Anything else is a real failure.
        if ((await job.getState()) !== 'active') {
          throw error;
        }

        return outcomeFor({
          activeJobIdsCouldNotCancel: [jobId],
          noMatchingJob: false,
          outcome: CANCEL_PLAN_RUN_OUTCOME.NO_ACTIVE_RUN,
          removedJobIds: [],
        });
      }
    }

    // A job already gone from Redis still gets its row settled, so it is not SCHEDULED forever.
    const settled =
      await this.planRunsService.settleScheduledRunCancelled(planRunId);

    const wasCancelled = settled || removedJobIds.length > 0;
    const { NO_ACTIVE_RUN, RUN_CANCELLED } = CANCEL_PLAN_RUN_OUTCOME;

    return outcomeFor({
      activeJobIdsCouldNotCancel: [],
      noMatchingJob: job === undefined,
      outcome: wasCancelled ? RUN_CANCELLED : NO_ACTIVE_RUN,
      removedJobIds,
    });
  }
}
