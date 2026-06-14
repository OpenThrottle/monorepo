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
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { updateMatchingTasksAndEmitStatusChanged } from '../../notifications/emit-bulk-task-status-changes';
import { NotificationsService } from '../../notifications/notifications.service';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
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

/** @description Outcome of a cancel-plan-run request (mapped to CancelPlanRunResultObject by the resolver). */
interface CancelRunOutcome {
  readonly activeJobIdsCouldNotCancel: string[];
  readonly noMatchingJob: boolean;
  readonly planId: string;
  readonly planStatusAfter: string | null;
  readonly removedJobIds: string[];
  readonly signaledActiveRunToStop: boolean;
}

/**
 * @description Service owning plan status policy and cancellation orchestration. App-internal; not
 * exported from a package boundary, so no @publicApi tag is required.
 */
@Injectable()
export class PlanStatusService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly planRunCancellation: PlanRunCancellationService,
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

    entity.status = nextStatus;

    return repo.save(entity);
  }

  /**
   * @description Cancels BullMQ plan-run jobs for a plan and signals any active run to stop. When a
   * waiting/delayed job was removed or an active run was signaled, resets the plan to PENDING and the
   * plan's QUEUED tasks to PENDING. Throws NotFoundException when the plan does not exist.
   */
  async cancelRun(planId: string): Promise<CancelRunOutcome> {
    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`🟡 2 - Plan not found: ${planId}`);
    }

    const queueResult = await cancelPlanRunJobsForPlan(this.plansQueue, planId);
    const signaledActiveRunToStop = this.planRunCancellation.abort(planId);

    const shouldSetPlanPending =
      queueResult.removedJobIds.length > 0 || signaledActiveRunToStop;

    let planStatusAfter: string | null = null;

    if (shouldSetPlanPending) {
      await repo.update({ id: planId }, { status: 'PENDING' });

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
      noMatchingJob: queueResult.matchingJobCount === 0,
      planId,
      planStatusAfter,
      removedJobIds: [...queueResult.removedJobIds],
      signaledActiveRunToStop,
    };
  }
}
