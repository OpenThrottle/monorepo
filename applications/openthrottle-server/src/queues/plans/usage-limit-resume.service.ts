import { Injectable } from '@nestjs/common';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { WorkflowRalphUsageLimit } from '@openthrottle/openthrottle-agentic-ralph';

import { PlanEnqueueService } from '../../graphql/plans/plan-enqueue.service.ts';
import { PlanStatusService } from '../../graphql/plans/plan-status.service.ts';
import { StatusChangeSystemAccountService } from '../../graphql/work-ledger/status-change-system-account.service.ts';
import { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture.service.ts';
import { updateMatchingTasksAndEmitStatusChanged } from '../../notifications/emit-bulk-task-status-changes.ts';
import { NotificationsService } from '../../notifications/notifications.service.ts';
import { USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH } from '../usage-limit/usage-limit.constants.ts';
import { decideUsageLimitResume } from '../usage-limit/usage-limit.utils.ts';
import { PLANS_QUEUE_NAME } from './plans.constants.ts';
import type { RunPlanOrchestratorJobData } from './plans.types.ts';

/**
 * @description What became of a usage-limited run: continued later (`resumed`), parked for a human
 * (`held`), or left alone because something else already decided the plan's fate (`skipped`).
 * `message` is the user-facing notification text.
 */
export interface UsageLimitHandling {
  readonly message: string;
  readonly outcome: 'held' | 'resumed' | 'skipped';
}

const describeError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const parseInstant = (iso: string | null): Date | null => {
  if (iso === null) {
    return null;
  }

  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * @description Owns everything that happens after a plan run stops on a Claude subscription usage
 * limit: settle the run row `USAGE_LIMITED`, decide via {@link decideUsageLimitResume} whether to
 * continue it, then either enqueue the delayed continuation through the shared enqueue pipeline
 * ({@link PlanEnqueueService.enqueueUsageLimitResume}, plan → QUEUED) or park the plan (→ PENDING).
 * {@link UsageLimitResumeService.handle} never throws: the limited job must complete normally so
 * BullMQ does not retry it into another doomed iteration.
 */
@Injectable()
export class UsageLimitResumeService {
  constructor(
    private readonly logger: LoggerService,
    private readonly notifications: NotificationsService,
    private readonly planEnqueueService: PlanEnqueueService,
    private readonly planRunsService: PlanRunsService,
    private readonly plansService: PlansService,
    private readonly planStatusService: PlanStatusService,
    private readonly statusChangeSystemAccount: StatusChangeSystemAccountService,
    private readonly tasksService: TasksService,
    private readonly workLedgerCapture: WorkLedgerCaptureService,
  ) {}

  /**
   * @description Settles the limited run and applies the resume policy. `now` is injectable for
   * tests. Never throws.
   */
  async handle(params: {
    readonly jobData: RunPlanOrchestratorJobData;
    readonly jobId: string;
    readonly limit: WorkflowRalphUsageLimit;
    readonly now?: Date;
    readonly planId: string;
  }): Promise<UsageLimitHandling> {
    const { jobData, jobId, limit, planId } = params;
    const now = params.now ?? new Date();
    const resetLabel = limit.resetsAt ?? 'an unknown time';

    try {
      const limitedRun = await this.planRunsService.settleRunUsageLimited(
        PLANS_QUEUE_NAME,
        jobId,
        { resetsAt: parseInstant(limit.resetsAt), type: limit.rateLimitType },
      );

      if (limitedRun === null) {
        // Already settled by someone else (stale sweep, cancel) or never recorded: nothing here owns
        // the plan's next status, so leave it alone.
        this.logger.warn(
          `Usage limit hit but plan_runs row for job ${jobId} was not writable; not resuming plan ${planId}.`,
          UsageLimitResumeService.name,
        );

        return {
          message: `Plan run stopped on a usage limit (resets ${resetLabel}); the run record was already settled, so it was not resumed.`,
          outcome: 'skipped',
        };
      }

      const plan = await this.plansService
        .getRepository()
        .findOne({ where: { id: planId } });
      const cancelMarker =
        await this.planRunsService.readCancelRequested(planId);

      if (plan?.status !== 'IN_PROGRESS' || cancelMarker !== null) {
        return {
          message: `Plan run stopped on a usage limit (resets ${resetLabel}); the plan was cancelled or changed meanwhile, so it was not resumed.`,
          outcome: 'skipped',
        };
      }

      const chainDepth = await this.planRunsService.countUsageLimitedInChain(
        limitedRun.id,
        USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
      );
      const decision = decideUsageLimitResume({ chainDepth, limit, now });

      if (decision.kind === 'resume') {
        const actorSub = await this.statusChangeSystemAccount.resolveId();

        try {
          await this.planEnqueueService.enqueueUsageLimitResume({
            actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
            actorSub: actorSub ?? undefined,
            delayMs: decision.delayMs,
            jobData,
            limitedRun,
          });
        } catch (error) {
          return this.hold(
            planId,
            resetLabel,
            `scheduling the resume failed: ${describeError(error)}`,
          );
        }

        this.notifications.emitPlanStatusChanged({
          planId,
          status: 'QUEUED',
        });

        const resumeAt = new Date(now.getTime() + decision.delayMs);

        return {
          message: `Plan paused: usage limit reached — resumes at ${resumeAt.toISOString()}`,
          outcome: 'resumed',
        };
      }

      return this.hold(planId, resetLabel, decision.reason);
    } catch (error) {
      this.logger.warn(
        `Usage-limit handling failed for plan ${planId}, job ${jobId}: ${describeError(error)}`,
        UsageLimitResumeService.name,
      );

      return this.hold(planId, resetLabel, `resume bookkeeping failed`);
    }
  }

  /**
   * @description Parks the plan: IN_PROGRESS → PENDING and its still-QUEUED tasks → PENDING (what a
   * cancel does), so it reads as startable rather than running. Best-effort — a write failure is
   * logged and the notification still goes out. Never throws.
   */
  private async hold(
    planId: string,
    resetLabel: string,
    reason: string,
  ): Promise<UsageLimitHandling> {
    try {
      const actorSub = await this.statusChangeSystemAccount.resolveId();

      await this.planStatusService.writeGuardedStatus(planId, {
        actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        actorSub: actorSub ?? undefined,
        captureFailureIsFatal: false,
        guardCurrentStatus: 'IN_PROGRESS',
        requestedStatus: 'PENDING',
        throwOnForbiddenInProgress: false,
      });

      await this.tasksService.getRepository().manager.transaction((manager) =>
        updateMatchingTasksAndEmitStatusChanged({
          actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
          actorSub: actorSub ?? undefined,
          captureFailureIsFatal: false,
          fromStatuses: ['QUEUED'],
          logger: this.logger,
          manager,
          notifications: this.notifications,
          planId,
          toStatus: 'PENDING',
          workLedgerCapture: this.workLedgerCapture,
        }),
      );

      this.notifications.emitPlanStatusChanged({ planId, status: 'PENDING' });
    } catch (error) {
      this.logger.warn(
        `Failed to park plan ${planId} after a usage limit: ${describeError(error)}`,
        UsageLimitResumeService.name,
      );
    }

    return {
      message: `Plan paused: usage limit reached — resets at ${resetLabel}; not resuming automatically (${reason})`,
      outcome: 'held',
    };
  }
}
