/**
 * @description Owns plan status-transition policy and cancellation orchestration, extracted from
 * {@link PlansResolver} so the resolver no longer carries transition rules. Centralizes the
 * openthrottle-ralph IN_PROGRESS transition policy, status persistence, and the cancel-plan-run flow
 * (queue cancellation + active-run abort + plan/task status reset).
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  Plan,
  PlanRunsService,
  PlansService,
  resolveCompletedAtForStatusChange,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { updateMatchingTasksAndEmitStatusChanged } from '../../notifications/emit-bulk-task-status-changes';
import { NotificationsService } from '../../notifications/notifications.service';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
import { PlanCancelChannelService } from '../../queues/plans/plan-cancel-channel.service';
import { PlanRunCancellationService } from '../../queues/plans/plan-run-cancellation.service';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import { cancelPlanRunJobsForPlan } from './cancel-plan-run-jobs';

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
    private readonly notificationsService: NotificationsService,
    private readonly planCancelChannel: PlanCancelChannelService,
    private readonly planRunCancellation: PlanRunCancellationService,
    private readonly planRunsService: PlanRunsService,
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
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
   * @description Sets a plan's status with transition validation (the setPlanStatus mutation body).
   * Returns the (possibly unchanged) plan, or null when the plan does not exist. Throws
   * BadRequestException when an IN_PROGRESS transition is forbidden.
   */
  async setStatus(
    planId: string,
    requestedStatus: string,
  ): Promise<Plan | null> {
    const repo = this.plansService.getRepository();
    const entity = await repo.findOne({ where: { id: planId } });

    if (!entity) return null;

    const nextStatus = normalizePlanStatusForPolicy(requestedStatus);
    if (
      nextStatus === 'IN_PROGRESS' &&
      !canApplyInProgressAsTargetStatus(entity.status)
    ) {
      throw new BadRequestException(IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE);
    }

    if (normalizePlanStatusForPolicy(entity.status) === nextStatus) {
      return entity;
    }

    const previousStatus = entity.status;
    entity.status = nextStatus;
    entity.completedAt = resolveCompletedAtForStatusChange({
      currentCompletedAt: entity.completedAt,
      nextStatus,
      previousStatus,
    });

    return repo.save(entity);
  }

  /**
   * @description Cancels BullMQ plan-run jobs for a plan and signals any active run to stop. When a
   * waiting/delayed job was removed or an active run was signaled, resets the plan to PENDING and the
   * plan's QUEUED tasks to PENDING. Throws NotFoundException when the plan does not exist.
   */
  async cancelRun(
    planId: string,
    requestedByUserId: string | null = null,
  ): Promise<CancelRunOutcome> {
    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`🟡 2 - Plan not found: ${planId}`);
    }

    const status = normalizePlanStatusForPolicy(plan.status);
    const cancelable = status === 'QUEUED' || status === 'IN_PROGRESS';
    // A run that is actively executing (vs merely queued) — the distinction between
    // "stopping now" and "cancelled from the queue".
    const runIsExecuting = status === 'IN_PROGRESS';

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

    const removedQueuedJob = queueResult.removedJobIds.length > 0;
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

    const outcome: CancelPlanRunOutcome = activeRunStopping
      ? CANCEL_PLAN_RUN_OUTCOME.RUN_STOPPING
      : removedQueuedJob
        ? CANCEL_PLAN_RUN_OUTCOME.RUN_CANCELLED
        : cancelRequested
          ? CANCEL_PLAN_RUN_OUTCOME.CANCELLATION_REQUESTED
          : CANCEL_PLAN_RUN_OUTCOME.NO_ACTIVE_RUN;

    // Reset the plan (and its QUEUED tasks) to PENDING when we removed a queued job or stopped an
    // actively-executing run. A pure CANCELLATION_REQUESTED (no confirmed active run) leaves status
    // to the owning run's terminal handling — we do not race it to PENDING.
    const shouldSetPlanPending = removedQueuedJob || activeRunStopping;

    let planStatusAfter: string | null = null;

    if (shouldSetPlanPending) {
      // Leaving COMPLETED (or any status) for PENDING clears completedAt; null is a no-op otherwise.
      await repo.update(
        { id: planId },
        { completedAt: null, status: 'PENDING' },
      );

      await updateMatchingTasksAndEmitStatusChanged({
        fromStatuses: ['QUEUED'],
        notifications: this.notificationsService,
        planId,
        taskRepo: this.tasksService.getRepository(),
        toStatus: 'PENDING',
      });

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
}
