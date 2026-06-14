/**
 * @description Unifies the spawn and in-process-orchestrator plan-run enqueue flows behind one
 * service so {@link PlansResolver} mutations stay thin (validate → call → map). Owns the atomicity
 * invariant shared by both flows: the run record, plan status, and task resets commit together, and
 * the BullMQ job is enqueued AFTER the transaction commits (enqueue-after-commit). A DB failure
 * therefore leaves no orphaned job; the narrow committed-but-add-failed window is reconciled by the
 * processor's onModuleInit startup reconciliation.
 */

import { randomUUID } from 'node:crypto';
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
  PlanRunsService,
  Task,
} from '@openthrottle/nestjs-repositories';
import { updateMatchingTasksAndEmitStatusChanged } from '../../notifications/emit-bulk-task-status-changes';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  PLAN_JOB_PRIORITY_DEFAULT,
  PLANS_QUEUE_NAME,
  RUN_PLAN_SPAWN_JOB_NAME,
} from '../../queues/plans/plans.constants';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import {
  normalizeIdempotencyKey,
  QueuesService,
} from '../queues/queues.service';
import {
  buildRunPlanJobData,
  buildRunPlanOrchestratorJobData,
  resolveDefaultPlanRunKind,
} from './enqueue-plan-ralph-tuning';
import { buildPlanRunConfigSnapshotFromJobData } from './enqueue-plan-run-config-snapshot';
import type { RalphPlanRunTuningInput } from './plan.input';

/** Task statuses reset to QUEUED when a plan run is enqueued (COMPLETED tasks are left unchanged). */
const ENQUEUE_TASK_STATUSES_TO_RESET = [
  'PENDING',
  'IN_PROGRESS',
  'BLOCKED',
  'BACKLOG',
  'SKIPPED',
  'CANCELED',
] as const;

type ExecutionBackend = 'claude' | 'cursor' | 'opencode';

/** @description Validated parameters for a spawn (nested workflow-ralph) plan-run enqueue. */
export interface EnqueueSpawnParams {
  readonly idempotencyKey?: string | null;
  readonly jobRunHooksJson?: string | null;
  readonly planId: string;
  readonly priority?: number | null;
  readonly ralph?: RalphPlanRunTuningInput | null;
  readonly workingDirectory?: string | null;
}

/** @description Validated parameters for an in-process orchestrator plan-run enqueue. */
export interface EnqueueOrchestratorParams {
  readonly idempotencyKey?: string | null;
  readonly jobRunHooksJson?: string | null;
  readonly mode?: 'plan' | 'task' | null;
  readonly planId: string;
  readonly priority?: number | null;
  readonly ralph?: RalphPlanRunTuningInput | null;
  readonly taskId?: string | null;
  readonly workingDirectory?: string | null;
}

/** @description Result of an enqueue: the persisted backend, job id, and live queue position. */
export interface EnqueueOutcome {
  readonly executionBackend: ExecutionBackend;
  readonly jobId: string;
  readonly planId: string;
  readonly queuePosition: number;
  readonly queueTotal: number;
}

/**
 * @description Service owning the spawn and orchestrator plan-run enqueue pipelines. Extracted from
 * PlansResolver so the resolver only validates GraphQL input and maps results. App-internal; not
 * exported from a package boundary, so no @publicApi tag is required.
 */
@Injectable()
export class PlanEnqueueService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly planRunsService: PlanRunsService,
    private readonly plansService: PlansService,
    private readonly queuesService: QueuesService,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, void>,
  ) {}

  /**
   * @description Enqueue a spawn plan-run (nested workflow-ralph in the worker). When the deployment
   * defaults to the in-process orchestrator (resolveDefaultPlanRunKind), this delegates to
   * {@link PlanEnqueueService.enqueueOrchestrator}, preserving the resolver's prior routing.
   */
  async enqueueSpawn(params: EnqueueSpawnParams): Promise<EnqueueOutcome> {
    const {
      idempotencyKey,
      jobRunHooksJson,
      planId,
      priority,
      ralph,
      workingDirectory,
    } = params;

    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`🟡 3 - Plan not found: ${planId}`);
    }

    // Orchestrator-by-default: queued runs use the in-process GraphQL orchestrator unless the
    // deployment opts back into spawn via OPENTHROTTLE_DEFAULT_RUN_KIND=spawn (Stage (a) rollback).
    if (resolveDefaultPlanRunKind() === 'orchestrator') {
      return this.enqueueOrchestrator({
        idempotencyKey: idempotencyKey ?? null,
        jobRunHooksJson,
        mode: null,
        planId,
        priority,
        ralph,
        taskId: null,
        workingDirectory,
      });
    }

    let jobData: RunPlanJobData;
    try {
      jobData = buildRunPlanJobData({
        jobRunHooksJson,
        planId,
        planJobRunHooks: plan.jobRunHooks,
        ralph,
        workingDirectory,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }

    const jobPriority = priority ?? PLAN_JOB_PRIORITY_DEFAULT;
    // Validate the caller idempotency key before the transaction so we never commit then fail.
    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    if ('error' in normalizedKey) {
      throw new BadRequestException(normalizedKey.error);
    }
    const jobId = normalizedKey.key ?? randomUUID();
    const runConfigSnapshot = buildPlanRunConfigSnapshotFromJobData(jobData);

    await this.commitEnqueueTransaction({
      bullmqJobId: jobId,
      executionBackend: jobData.executionBackend ?? 'cursor',
      planId,
      runConfigSnapshot,
      runKind: 'spawn',
    });

    const job = await this.plansQueue.add(RUN_PLAN_SPAWN_JOB_NAME, jobData, {
      jobId,
      priority: jobPriority,
    });

    const { queuePosition, queueTotal } = await this.emitQueuePosition(
      planId,
      String(job.id),
    );

    return {
      executionBackend: jobData.executionBackend ?? 'cursor',
      jobId,
      planId,
      queuePosition,
      queueTotal,
    };
  }

  /**
   * @description Enqueue an in-process Ralph orchestrator plan-run. Callers must pre-validate the
   * GraphQL `mode`/`taskId` constraints (the resolver does this); this method assumes a resolved
   * `mode` and an existing `taskId` when `mode === 'task'`.
   */
  async enqueueOrchestrator(
    params: EnqueueOrchestratorParams,
  ): Promise<EnqueueOutcome> {
    const {
      idempotencyKey,
      jobRunHooksJson,
      mode,
      planId,
      priority,
      ralph,
      taskId,
      workingDirectory,
    } = params;

    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`🟡 1 - Plan not found: ${planId}`);
    }

    let jobData: ReturnType<typeof buildRunPlanOrchestratorJobData>;
    try {
      jobData = buildRunPlanOrchestratorJobData({
        jobRunHooksJson,
        mode: mode ?? null,
        planId,
        planJobRunHooks: plan.jobRunHooks,
        ralph,
        taskId,
        workingDirectory,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }

    const jobPriority = priority ?? PLAN_JOB_PRIORITY_DEFAULT;

    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    if ('error' in normalizedKey) {
      throw new BadRequestException(normalizedKey.error);
    }
    const effectiveJobId = normalizedKey.key ?? randomUUID();
    const runConfigSnapshot = buildPlanRunConfigSnapshotFromJobData(jobData);

    await this.commitEnqueueTransaction({
      bullmqJobId: effectiveJobId,
      executionBackend: jobData.executionBackend ?? 'cursor',
      planId,
      runConfigSnapshot,
      runKind: 'orchestrator',
    });

    const enqueueResult = await this.queuesService.enqueuePlanRalphOrchestrator(
      {
        idempotencyKey: effectiveJobId,
        jobData,
        priority: jobPriority,
      },
    );

    if ('error' in enqueueResult) {
      throw new BadRequestException(enqueueResult.error);
    }

    const { queuePosition, queueTotal } = await this.emitQueuePosition(
      planId,
      enqueueResult.jobId,
    );

    return {
      executionBackend: jobData.executionBackend ?? 'cursor',
      jobId: enqueueResult.jobId,
      planId,
      queuePosition,
      queueTotal,
    };
  }

  /**
   * @description Atomicity invariant: the run record, plan status, and task resets commit together
   * or not at all. The BullMQ add cannot join a DB transaction, so callers enqueue AFTER this
   * commits (enqueue-after-commit). A DB failure leaves NO orphaned job; the narrow
   * "committed but add threw" window leaves a QUEUED plan with no job, which a retry re-enqueues and
   * the processor's onModuleInit reconciliation tolerates.
   */
  private async commitEnqueueTransaction(params: {
    bullmqJobId: string;
    executionBackend: ExecutionBackend;
    planId: string;
    runConfigSnapshot: ReturnType<typeof buildPlanRunConfigSnapshotFromJobData>;
    runKind: 'orchestrator' | 'spawn';
  }): Promise<void> {
    const {
      bullmqJobId,
      executionBackend,
      planId,
      runConfigSnapshot,
      runKind,
    } = params;
    const repo = this.plansService.getRepository();

    await repo.manager.transaction(async (manager) => {
      await this.planRunsService.recordQueuedRun(
        {
          bullmqJobId,
          executionBackend,
          planId,
          queueName: PLANS_QUEUE_NAME,
          runConfigSnapshot,
          runKind,
        },
        manager,
      );

      await manager
        .getRepository(Plan)
        .update({ id: planId }, { status: 'QUEUED' });

      await updateMatchingTasksAndEmitStatusChanged({
        fromStatuses: ENQUEUE_TASK_STATUSES_TO_RESET,
        notifications: this.notificationsService,
        planId,
        taskRepo: manager.getRepository(Task),
        toStatus: 'QUEUED',
      });
    });
  }

  /**
   * @description Computes the 1-based queue position of the just-added job and emits the
   * plan-enqueued notification. Returns the position and the current waiting total.
   */
  private async emitQueuePosition(
    planId: string,
    jobId: string,
  ): Promise<{ queuePosition: number; queueTotal: number }> {
    const waitingCount = await this.plansQueue.getWaitingCount();
    const waitingJobs = await this.plansQueue.getJobs(['waiting'], 0, 500);
    const jobIndex = waitingJobs.findIndex((j) => String(j.id) === jobId);
    const queuePosition = jobIndex >= 0 ? jobIndex + 1 : waitingCount;
    const queueTotal = waitingCount;

    this.notificationsService.emitPlanEnqueued({
      planId,
      queuePosition,
      queueTotal,
    });

    return { queuePosition, queueTotal };
  }
}
