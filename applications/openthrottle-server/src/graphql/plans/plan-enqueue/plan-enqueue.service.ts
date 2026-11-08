/**
 * @description Unifies the spawn and in-process-orchestrator plan-run enqueue flows behind one
 * service so {@link PlansResolver} mutations stay thin (validate → call → map). Owns the atomicity
 * invariant shared by both flows: the run record, plan status, and task resets commit together, and
 * the BullMQ job is enqueued AFTER the transaction commits (enqueue-after-commit). A DB failure
 * therefore leaves no orphaned job; the narrow committed-but-add-failed window is reconciled by the
 * processor's onModuleInit startup reconciliation.
 */

import { randomUUID } from 'node:crypto';

import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRunExecutionBackend,
  PlanRunStatus,
} from '@openthrottle/nestjs-repositories';
import {
  Plan,
  PLAN_RUN_STATUS,
  PlanRun,
  PlanRunsService,
  PlansService,
  RepositoryCheckoutsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { JobRunHookEntry } from '@tools/workflows';
import { projectHookTasksToJobRunHookEntries } from '@tools/workflows';
import type { Queue } from 'bullmq';
import type { EntityManager } from 'typeorm';

import { updateMatchingTasksAndEmitStatusChanged } from '../../../notifications/emit-bulk-task-status-changes.ts';
import { NotificationsService } from '../../../notifications/notifications.service.ts';
import {
  PLAN_JOB_PRIORITY_DEFAULT,
  PLANS_QUEUE_NAME,
  SCHEDULED_PLAN_RUN_JOB_ID_PREFIX,
  SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS,
  SCHEDULED_PLAN_RUN_MAX_HORIZON_MS,
} from '../../../queues/plans/plans.constants.ts';
import type {
  RunPlanJobData,
  RunPlanOrchestratorJobData,
} from '../../../queues/plans/plans.types.ts';
import type { ScheduledPlanRunFireDecision } from '../../../queues/plans/scheduled-plan-run.utils.ts';
import { decideScheduledPlanRunFire } from '../../../queues/plans/scheduled-plan-run.utils.ts';
import { USAGE_LIMIT_RESUME_JOB_ID_PREFIX } from '../../../queues/usage-limit/usage-limit.constants.ts';
import {
  normalizeIdempotencyKey,
  QueuesService,
} from '../../queues/queues.service.ts';
import { WorkLedgerCaptureService } from '../../work-ledger/work-ledger-capture.service.ts';
import { buildRunPlanOrchestratorJobData } from '../enqueue-plan-ralph-tuning.ts';
import {
  buildPlanRunConfigSnapshotFromJobData,
  orchestratorJobInputFromSnapshot,
} from '../enqueue-plan-run-config-snapshot.ts';
import type { RalphPlanRunTuningInput } from '../plan.input.ts';
import { PlanStatusService } from '../plan-status.service.ts';
import type {
  EnqueueOutcome,
  ScheduledRunFireOutcome,
  ScheduleOutcome,
} from './plan-enqueue.types.ts';
import {
  countRunnablePlanTasks,
  ENQUEUE_TASK_STATUSES_TO_RESET,
} from './plan-runnable-tasks.ts';

/** Task statuses a usage-limit continuation re-queues: only the limited run's in-flight work. */
const USAGE_LIMIT_RESUME_TASK_STATUSES_TO_RESET = [
  'PENDING',
  'IN_PROGRESS',
] as const;

type ExecutionBackend = PlanRunExecutionBackend;

/**
 * @description The plan_runs status each fire-time decision moves a SCHEDULED run to: QUEUED claims it
 * for the worker; the rest settle it. A scheduled run with nothing to run settles SKIPPED with its
 * reason (an immediate run on a plan with nothing left still ends COMPLETED via
 * `workflow_plan_already_terminal`).
 */
const SCHEDULED_RUN_STATUS_BY_DECISION = {
  fire: PLAN_RUN_STATUS.QUEUED,
  missed: PLAN_RUN_STATUS.MISSED,
  nothing_to_run: PLAN_RUN_STATUS.SKIPPED,
  superseded: PLAN_RUN_STATUS.SUPERSEDED,
} as const satisfies Record<
  ScheduledPlanRunFireDecision['kind'],
  PlanRunStatus
>;

/** @description Validated parameters for a spawn (nested workflow-ralph) plan-run enqueue. */
interface EnqueueSpawnParams {
  /** Request-principal actor kind, for the plans.status write's status_change attribution. */
  readonly actorKind?: string | undefined;
  /** Request-principal actor sub, for the plans.status write's status_change attribution. */
  readonly actorSub?: string | undefined;
  /** User who triggered the enqueue (null for service-account/system); persisted on the run record. */
  readonly actorUserId?: string | null;
  /** REQUIRED git branch the run operates on; persisted on plan_runs.branch. Rejected when blank. */
  readonly branch: string;
  /** Explicit registered checkout id; resolved to a filesystem path (highest precedence). */
  readonly checkoutId?: string | null;
  readonly idempotencyKey?: string | null;
  readonly jobRunHooksJson?: string | null;
  readonly planId: string;
  readonly priority?: number | null;
  readonly ralph?: RalphPlanRunTuningInput | null;
  /** Portable repository id; resolved to the user's single checkout when checkoutId is omitted. */
  readonly repositoryId?: string | null;
  readonly workingDirectory?: string | null;
}

/** @description Validated parameters for an in-process orchestrator plan-run enqueue. */
interface EnqueueOrchestratorParams {
  /** Request-principal actor kind, for the plans.status write's status_change attribution. */
  readonly actorKind?: string | undefined;
  /** Request-principal actor sub, for the plans.status write's status_change attribution. */
  readonly actorSub?: string | undefined;
  /** User who triggered the enqueue (null for service-account/system); persisted on the run record. */
  readonly actorUserId?: string | null;
  /** REQUIRED git branch the run operates on; persisted on plan_runs.branch. Rejected when blank. */
  readonly branch: string;
  /** Explicit registered checkout id; resolved to a filesystem path (highest precedence). */
  readonly checkoutId?: string | null;
  readonly idempotencyKey?: string | null;
  readonly jobRunHooksJson?: string | null;
  readonly mode?: 'plan' | 'task' | null;
  readonly planId: string;
  readonly priority?: number | null;
  readonly ralph?: RalphPlanRunTuningInput | null;
  /** Portable repository id; resolved to the user's single checkout when checkoutId is omitted. */
  readonly repositoryId?: string | null;
  readonly taskId?: string | null;
  readonly workingDirectory?: string | null;
}

/**
 * @description Validated parameters for scheduling a plan run: the in-process orchestrator enqueue
 * shape plus the absolute instant it fires at.
 */
interface SchedulePlanRunParams {
  /** Request-principal actor kind, for the plans.status write's status_change attribution. */
  readonly actorKind?: string | undefined;
  /** Request-principal actor sub, for the plans.status write's status_change attribution. */
  readonly actorSub?: string | undefined;
  /** User who scheduled the run (null for service-account/system); persisted on the run record. */
  readonly actorUserId?: string | null;
  /** REQUIRED git branch the run operates on; persisted on plan_runs.branch. Rejected when blank. */
  readonly branch: string;
  /** Explicit registered checkout id; resolved to a filesystem path (highest precedence). */
  readonly checkoutId?: string | null;
  /** Client dedupe key; becomes part of the deterministic BullMQ jobId. */
  readonly idempotencyKey?: string | null;
  readonly jobRunHooksJson?: string | null;
  readonly planId: string;
  readonly priority?: number | null;
  readonly ralph?: RalphPlanRunTuningInput | null;
  /** Portable repository id; resolved to the user's single checkout when checkoutId is omitted. */
  readonly repositoryId?: string | null;
  /** The absolute instant the run fires at. Must be in the future and within the 30-day horizon. */
  readonly scheduledFor: Date;
  readonly workingDirectory?: string | null;
}

/**
 * @description Validated parameters for continuing a usage-limited run after its reset. `jobData` is
 * the limited job's own payload, reused verbatim so the continuation runs exactly as the original
 * did (same plan, mode, workspace, tuning, hooks).
 */
interface EnqueueUsageLimitResumeParams {
  /** Status-change attribution for the plans.status write (the worker's system account). */
  readonly actorKind: string | undefined;
  readonly actorSub: string | undefined;
  /** How long the continuation job sits in BullMQ's delayed state before it becomes runnable. */
  readonly delayMs: number;
  readonly jobData: RunPlanOrchestratorJobData;
  /** The run row that stopped on the limit; the continuation row links back to it. */
  readonly limitedRun: PlanRun;
}

/** @description A run's workspace after resolution: the canonical ids to snapshot plus the path it runs in. */
interface ResolvedWorkspace {
  readonly checkoutId: string | null;
  readonly repositoryId: string | null;
  readonly workingDirectory: string | null | undefined;
}

/**
 * @description Service owning the spawn and orchestrator plan-run enqueue pipelines. Extracted from
 * PlansResolver so the resolver only validates GraphQL input and maps results. App-internal; not
 * exported from a package boundary, so no @public tag is required.
 */
@Injectable()
export class PlanEnqueueService {
  constructor(
    private readonly logger: LoggerService,
    private readonly notificationsService: NotificationsService,
    private readonly planRunsService: PlanRunsService,
    private readonly plansService: PlansService,
    private readonly planStatusService: PlanStatusService,
    private readonly queuesService: QueuesService,
    private readonly repositoryCheckoutsService: RepositoryCheckoutsService,
    private readonly tasksService: TasksService,
    private readonly workLedgerCapture: WorkLedgerCaptureService,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, void>,
  ) {}

  /**
   * @description Projects the plan's materialized lifecycle hook-tasks into runner hook entries so a
   * queued run executes them alongside any jobRunHooksJson config. Only plan-level SKILL hooks project
   * (per the design bridge); template + task-level hooks run as materialized tasks in the Ralph loop.
   */
  private async resolveMaterializedHookEntries(
    planId: string,
  ): Promise<readonly JobRunHookEntry[]> {
    const { after, before } = await this.tasksService.getPlanHooks(planId);
    return projectHookTasksToJobRunHookEntries([...before, ...after]);
  }

  /**
   * @description Enqueue a plan-run for the `enqueuePlanRun` mutation. The nested-`workflow-ralph`
   * spawn worker path was removed (OT plan 2ab62876): `PlansProcessor` only runs the in-process
   * GraphQL orchestrator, so every queued run is enqueued as an orchestrator run. Kept as a named
   * method (delegating to {@link PlanEnqueueService.enqueueOrchestrator}) so the resolver's
   * `enqueuePlanRun`/`workflowPlanRun` entry points stay stable; the old
   * `OPENTHROTTLE_DEFAULT_RUN_KIND=spawn` rollback knob is gone because there is no spawn worker to
   * roll back to.
   */
  async enqueueSpawn(params: EnqueueSpawnParams): Promise<EnqueueOutcome> {
    const {
      actorKind,
      actorSub,
      actorUserId,
      branch,
      checkoutId,
      idempotencyKey,
      jobRunHooksJson,
      planId,
      priority,
      ralph,
      repositoryId,
      workingDirectory,
    } = params;

    return this.enqueueOrchestrator({
      actorKind,
      actorSub,
      actorUserId,
      branch,
      checkoutId,
      idempotencyKey: idempotencyKey ?? null,
      jobRunHooksJson,
      mode: null,
      planId,
      priority,
      ralph,
      repositoryId,
      taskId: null,
      workingDirectory,
    });
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
      actorKind,
      actorSub,
      actorUserId,
      branch,
      checkoutId,
      idempotencyKey,
      jobRunHooksJson,
      mode,
      planId,
      priority,
      ralph,
      repositoryId,
      taskId,
      workingDirectory,
    } = params;

    const { jobData, resolvedBranch, resolvedWorkspace } =
      await this.prepareOrchestratorRun({
        actorUserId,
        branch,
        checkoutId,
        jobRunHooksJson,
        mode,
        planId,
        ralph,
        repositoryId,
        taskId,
        workingDirectory,
      });

    const jobPriority = priority ?? PLAN_JOB_PRIORITY_DEFAULT;

    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    if ('error' in normalizedKey) {
      throw new BadRequestException(normalizedKey.error);
    }
    const effectiveJobId = normalizedKey.key ?? randomUUID();
    const runConfigSnapshot = buildPlanRunConfigSnapshotFromJobData(jobData, {
      checkoutId: resolvedWorkspace.checkoutId,
      repositoryId: resolvedWorkspace.repositoryId,
    });

    await this.commitEnqueueTransaction({
      actorKind,
      actorSub,
      actorUserId,
      // Provenance projection captured at kickoff: branch from the required
      // kickoff input, checkoutId (on-disk home for deep-links) from the resolved
      // workspace, model from the run snapshot's ralph tuning.
      branch: resolvedBranch,
      bullmqJobId: effectiveJobId,
      checkoutId: resolvedWorkspace.checkoutId,
      executionBackend: jobData.executionBackend ?? 'cursor',
      model: runConfigSnapshot.ralph.model ?? null,
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
   * @description Schedules a plan run for a later instant. Goes through the same two steps as every
   * other orchestrator enqueue and as {@link enqueueUsageLimitResume} — {@link commitEnqueueTransaction}
   * (run row SCHEDULED with `scheduled_for`; plan and tasks untouched) then
   * `QueuesService.enqueuePlanRalphOrchestrator` (BullMQ add after commit, delayed by the time left) —
   * differing only in that the run is freshly resolved from the request, like
   * {@link enqueueOrchestrator}, and the status/delay come from `scheduledFor`. Unlike every other
   * enqueue it does NOT touch the plan or task statuses (see `skipPlanAndTaskStatusWrites`): that
   * moves to fire time.
   *
   * Validation lives here, not in the resolver, so every caller (UI, MCP) gets the same rules:
   * `scheduledFor` must be a valid instant strictly in the future and no further out than
   * {@link SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS} days. The frozen `runConfigSnapshot` is built now,
   * so the run executes with the configuration the user saw when scheduling.
   *
   * The BullMQ `jobId` is deterministic (`scheduled-plan-run-<idempotencyKey | planId-epochMs>`): a
   * retry of the same request lands on the same job. When a run with that job id is still SCHEDULED
   * the call returns it unchanged rather than rewriting its row while BullMQ keeps the original job
   * payload (the documented "same key returns the existing job" idempotency). Throws on failure.
   */
  async schedulePlanRun(
    params: SchedulePlanRunParams,
  ): Promise<ScheduleOutcome> {
    const {
      actorKind,
      actorSub,
      actorUserId,
      branch,
      checkoutId,
      idempotencyKey,
      jobRunHooksJson,
      planId,
      priority,
      ralph,
      repositoryId,
      scheduledFor,
      workingDirectory,
    } = params;

    // One clock read for the whole call, so the past check, the horizon check and the delay agree.
    const nowMs = Date.now();
    const scheduledForMs = scheduledFor.getTime();
    if (Number.isNaN(scheduledForMs)) {
      throw new BadRequestException('scheduledFor must be a valid date-time');
    }
    if (scheduledForMs <= nowMs) {
      throw new BadRequestException(
        `scheduledFor must be in the future (got ${scheduledFor.toISOString()})`,
      );
    }
    if (scheduledForMs - nowMs > SCHEDULED_PLAN_RUN_MAX_HORIZON_MS) {
      throw new BadRequestException(
        `scheduledFor must be within ${SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS} days from now (SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS; got ${scheduledFor.toISOString()})`,
      );
    }
    const delayMs = scheduledForMs - nowMs;

    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    if ('error' in normalizedKey) {
      throw new BadRequestException(normalizedKey.error);
    }
    // Validate the composed id too: the prefix counts against the key length cap, and a failure
    // after the commit below would strand a SCHEDULED row with no job.
    const jobId = `${SCHEDULED_PLAN_RUN_JOB_ID_PREFIX}${normalizedKey.key ?? `${planId}-${scheduledForMs}`}`;
    const normalizedJobId = normalizeIdempotencyKey(jobId);
    if ('error' in normalizedJobId) {
      throw new BadRequestException(normalizedJobId.error);
    }

    const { jobData, resolvedBranch, resolvedWorkspace } =
      await this.prepareOrchestratorRun({
        actorUserId,
        branch,
        checkoutId,
        jobRunHooksJson,
        mode: null,
        planId,
        ralph,
        repositoryId,
        taskId: null,
        workingDirectory,
      });

    const existing = await this.planRunsService.findByQueueNameAndBullmqJobId(
      PLANS_QUEUE_NAME,
      jobId,
    );
    if (
      existing?.status === PLAN_RUN_STATUS.SCHEDULED &&
      existing.scheduledFor !== null
    ) {
      return {
        executionBackend: existing.executionBackend,
        jobId,
        planId,
        planRunId: existing.id,
        scheduledFor: existing.scheduledFor,
      };
    }

    const runConfigSnapshot = buildPlanRunConfigSnapshotFromJobData(jobData, {
      checkoutId: resolvedWorkspace.checkoutId,
      repositoryId: resolvedWorkspace.repositoryId,
    });
    const executionBackend = jobData.executionBackend ?? 'cursor';

    const planRun = await this.commitEnqueueTransaction({
      actorKind,
      actorSub,
      actorUserId,
      branch: resolvedBranch,
      bullmqJobId: jobId,
      checkoutId: resolvedWorkspace.checkoutId,
      executionBackend,
      model: runConfigSnapshot.ralph.model ?? null,
      planId,
      runConfigSnapshot,
      runKind: 'orchestrator',
      scheduledFor,
      // Scheduling writes ONLY the run row. The plan and its tasks are left exactly as they are:
      // another run may be live on this plan (resetting its tasks to QUEUED would corrupt it), and
      // a plan must not read QUEUED for up to 30 days. The plan -> QUEUED and task resets happen at
      // fire time, when the delayed job starts the run.
      skipPlanAndTaskStatusWrites: true,
      status: PLAN_RUN_STATUS.SCHEDULED,
    });

    const enqueueResult = await this.queuesService.enqueuePlanRalphOrchestrator(
      {
        delayMs,
        idempotencyKey: jobId,
        jobData,
        priority: priority ?? PLAN_JOB_PRIORITY_DEFAULT,
      },
    );

    if ('error' in enqueueResult) {
      throw new BadRequestException(enqueueResult.error);
    }

    return {
      executionBackend,
      jobId: enqueueResult.jobId,
      planId,
      planRunId: planRun.id,
      scheduledFor,
    };
  }

  /**
   * @description Validates and resolves the parts of an orchestrator run every enqueue shares — the
   * branch, the plan, the workspace, the lifecycle hooks and the run's job payload — before anything
   * is written. Shared by {@link enqueueOrchestrator} and {@link schedulePlanRun} so the two cannot
   * drift on what a valid run is. Throws BadRequestException / NotFoundException.
   *
   * Refuses a whole-plan run (`mode` 'plan' or null — "Run now", `enqueuePlanRun`/`enqueueSpawn`
   * and `schedulePlanRun`) when the plan has no runnable tasks ({@link countRunnablePlanTasks}, the
   * same count {@link fireScheduledRun} uses), so the user hears it up front. A task-targeted run
   * (`mode` 'task') is exempt: it addresses one task the resolver already verified belongs to the
   * plan, which may be COMPLETED on purpose (re-run it). The fire-time `nothing_to_run` check stays,
   * since tasks can complete between scheduling and firing. {@link enqueueUsageLimitResume} does not
   * pass through here: it continues a run that already started.
   */
  private async prepareOrchestratorRun(input: {
    readonly actorUserId?: string | null;
    readonly branch: string;
    readonly checkoutId?: string | null;
    readonly jobRunHooksJson?: string | null;
    readonly mode?: 'plan' | 'task' | null;
    readonly planId: string;
    readonly ralph?: RalphPlanRunTuningInput | null;
    readonly repositoryId?: string | null;
    readonly taskId?: string | null;
    readonly workingDirectory?: string | null;
  }): Promise<{
    readonly jobData: ReturnType<typeof buildRunPlanOrchestratorJobData>;
    readonly resolvedBranch: string;
    readonly resolvedWorkspace: ResolvedWorkspace;
  }> {
    const {
      actorUserId,
      branch,
      checkoutId,
      jobRunHooksJson,
      mode,
      planId,
      ralph,
      repositoryId,
      taskId,
      workingDirectory,
    } = input;

    // Branch is a REQUIRED kickoff input (locked plan decision): fail fast and
    // loud rather than infer it late. Rejects a missing or whitespace-only value
    // so plan_runs.branch is always meaningful for new runs.
    const resolvedBranch = branch?.trim() ?? '';
    if (resolvedBranch === '') {
      throw new BadRequestException(
        'branch is required to enqueue a plan run (pass the git branch this run operates on)',
      );
    }

    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`🟡 1 - Plan not found: ${planId}`);
    }

    // A whole-plan run (mode 'plan' or unset) with nothing to pick up would start an orchestrator
    // that immediately finds nothing; refuse it here instead. A task-targeted run is exempt, see
    // the method JSDoc.
    if (mode !== 'task') {
      const runnableTaskCount = await countRunnablePlanTasks(
        repo.manager,
        planId,
      );
      if (runnableTaskCount === 0) {
        throw new BadRequestException(
          `Plan ${planId} has no runnable tasks (it has no tasks, or every task is COMPLETED or PROMOTED), so there is nothing to run`,
        );
      }
    }

    const resolvedWorkspace = await this.resolveWorkspace({
      actorUserId,
      checkoutId,
      repositoryId,
      workingDirectory,
    });

    const materializedHookEntries =
      await this.resolveMaterializedHookEntries(planId);

    try {
      const jobData = buildRunPlanOrchestratorJobData({
        jobRunHooksJson,
        materializedHookEntries,
        mode: mode ?? null,
        planId,
        planJobRunHooks: plan.jobRunHooks,
        ralph,
        taskId,
        workingDirectory: resolvedWorkspace.workingDirectory,
      });

      return { jobData, resolvedBranch, resolvedWorkspace };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * @description Enqueues the DELAYED continuation of a run that stopped on a usage limit. It goes
   * through the same two steps as every other orchestrator enqueue — {@link commitEnqueueTransaction}
   * (run row QUEUED + plan QUEUED, one transaction) then `QueuesService.enqueuePlanRalphOrchestrator`
   * (BullMQ add, after commit) — differing only in what it feeds them: the limited run's own job
   * payload, snapshot, backend, model, branch and checkout rather than a freshly resolved request,
   * `resume_of_run_id` set on the new row, and a BullMQ `delay`.
   *
   * The BullMQ `jobId` is deterministic (`usage-limit-resume-<limitedRunId>`): a retry of the same
   * limited run lands on the same job and the same run row instead of forking a second chain. Only
   * PENDING/IN_PROGRESS tasks are re-queued — the limited run's in-flight work — so tasks a human
   * parked as BLOCKED/SKIPPED/CANCELED are not resurrected the way a manual re-enqueue would.
   * Throws on failure; the caller decides the fallback.
   */
  async enqueueUsageLimitResume(
    params: EnqueueUsageLimitResumeParams,
  ): Promise<{ readonly jobId: string }> {
    const { actorKind, actorSub, delayMs, jobData, limitedRun } = params;
    const jobId = `${USAGE_LIMIT_RESUME_JOB_ID_PREFIX}${limitedRun.id}`;

    await this.commitEnqueueTransaction({
      actorKind,
      actorSub,
      actorUserId: limitedRun.actorUserId,
      branch: limitedRun.branch,
      bullmqJobId: jobId,
      checkoutId: limitedRun.checkoutId,
      executionBackend: limitedRun.executionBackend,
      model: limitedRun.model,
      planId: limitedRun.planId,
      resumeOfRunId: limitedRun.id,
      runConfigSnapshot: limitedRun.runConfigSnapshot,
      runKind: 'orchestrator',
      taskStatusesToReset: USAGE_LIMIT_RESUME_TASK_STATUSES_TO_RESET,
    });

    const enqueueResult = await this.queuesService.enqueuePlanRalphOrchestrator(
      {
        delayMs,
        idempotencyKey: jobId,
        jobData,
        priority: PLAN_JOB_PRIORITY_DEFAULT,
      },
    );

    if ('error' in enqueueResult) {
      throw new Error(enqueueResult.error);
    }

    return { jobId: enqueueResult.jobId };
  }

  /**
   * @description Resolves the run's working directory using the locked run_config precedence
   * order: an explicit `checkoutId` → a portable `repositoryId` (resolved to the enqueuing
   * user's single checkout of it) → the raw `workingDirectory` escape hatch. Returns the
   * resolved path plus the canonical ids to snapshot on the run. The resolved path is
   * re-validated downstream by {@link buildRunPlanOrchestratorJobData}'s
   * `validateWorkingDirectory`. Checkout/repository references are scoped to `actorUserId`;
   * an unauthenticated (service-account/system) enqueue may only use the raw path.
   */
  private async resolveWorkspace(input: {
    readonly actorUserId?: string | null;
    readonly checkoutId?: string | null;
    readonly repositoryId?: string | null;
    readonly workingDirectory?: string | null;
  }): Promise<ResolvedWorkspace> {
    const checkoutId = input.checkoutId?.trim() ?? '';
    const repositoryId = input.repositoryId?.trim() ?? '';

    if (checkoutId !== '') {
      if (!input.actorUserId) {
        throw new BadRequestException(
          'checkoutId can only be resolved for an authenticated user',
        );
      }
      const checkout = await this.repositoryCheckoutsService.findByIdForUser(
        checkoutId,
        input.actorUserId,
      );
      if (!checkout) {
        throw new BadRequestException(
          `Checkout not found for this user: ${checkoutId}`,
        );
      }
      return {
        checkoutId: checkout.id,
        repositoryId: checkout.repositoryId,
        workingDirectory: checkout.filesystemPath,
      };
    }

    if (repositoryId !== '') {
      if (!input.actorUserId) {
        throw new BadRequestException(
          'repositoryId can only be resolved for an authenticated user',
        );
      }
      const checkouts =
        await this.repositoryCheckoutsService.findByRepositoryIdForUser(
          repositoryId,
          input.actorUserId,
        );
      const [only] = checkouts;
      if (!only) {
        throw new BadRequestException(
          `No checkout for repository ${repositoryId}; add a folder for it first`,
        );
      }
      if (checkouts.length > 1) {
        throw new BadRequestException(
          `Repository ${repositoryId} has multiple checkouts; specify a checkoutId`,
        );
      }
      return {
        checkoutId: only.id,
        repositoryId,
        workingDirectory: only.filesystemPath,
      };
    }

    return {
      checkoutId: null,
      repositoryId: null,
      workingDirectory: input.workingDirectory,
    };
  }

  /**
   * @description Atomicity invariant: the run record (QUEUED, or SCHEDULED with `scheduledFor`), plan
   * status, and task resets commit together or not at all. Returns the recorded run. The BullMQ add cannot join a DB transaction, so callers enqueue AFTER this
   * commits (enqueue-after-commit). A DB failure leaves NO orphaned job; the narrow
   * "committed but add threw" window leaves a QUEUED plan with no job, which a retry re-enqueues and
   * the processor's onModuleInit reconciliation tolerates.
   */
  private async commitEnqueueTransaction(params: {
    actorKind?: string | undefined;
    actorSub?: string | undefined;
    actorUserId?: string | null;
    branch?: string | null;
    bullmqJobId: string;
    checkoutId?: string | null;
    executionBackend: ExecutionBackend;
    model?: string | null;
    planId: string;
    resumeOfRunId?: string | null;
    runConfigSnapshot: ReturnType<
      typeof buildPlanRunConfigSnapshotFromJobData
    > | null;
    runKind: 'orchestrator' | 'spawn';
    scheduledFor?: Date | null;
    /**
     * True to write only the run row, leaving the plan and its tasks exactly as they are. Used by
     * a scheduled run: the plan may have another run live, and must not read QUEUED until fire time.
     */
    skipPlanAndTaskStatusWrites?: boolean;
    status?: PlanRunStatus;
    taskStatusesToReset?: readonly string[];
  }): Promise<PlanRun> {
    const {
      actorKind,
      actorSub,
      actorUserId,
      branch,
      bullmqJobId,
      checkoutId,
      executionBackend,
      model,
      planId,
      resumeOfRunId,
      runConfigSnapshot,
      runKind,
      scheduledFor,
      skipPlanAndTaskStatusWrites,
      status,
      taskStatusesToReset,
    } = params;
    const repo = this.plansService.getRepository();

    return repo.manager.transaction(async (manager) => {
      const planRun = await this.planRunsService.recordQueuedRun(
        {
          actorUserId: actorUserId ?? null,
          branch: branch ?? null,
          bullmqJobId,
          checkoutId: checkoutId ?? null,
          executionBackend,
          model: model ?? null,
          planId,
          queueName: PLANS_QUEUE_NAME,
          resumeOfRunId: resumeOfRunId ?? null,
          runConfigSnapshot,
          runKind,
          scheduledFor: scheduledFor ?? null,
          status,
        },
        manager,
      );

      if (skipPlanAndTaskStatusWrites === true) {
        return planRun;
      }

      // Fatal capture: this is a foreground, user-initiated mutation already inside its own
      // transaction, same as updatePlan/setStatus.
      await this.writeEnqueueStatuses(manager, {
        actorKind,
        actorSub,
        captureFailureIsFatal: true,
        planId,
        taskStatusesToReset:
          taskStatusesToReset ?? ENQUEUE_TASK_STATUSES_TO_RESET,
      });

      return planRun;
    });
  }

  /**
   * @description The plan and task half of an enqueue: plan -> QUEUED and the plan's
   * `taskStatusesToReset` tasks -> QUEUED, inside the caller's transaction. The ONE place these
   * writes happen for every enqueue — {@link commitEnqueueTransaction} for runs that start now or after
   * a usage limit, {@link fireScheduledRun} for a scheduled run at the moment it fires — so a run that
   * was scheduled starts from exactly the state "Run now" would have put the plan in.
   */
  private async writeEnqueueStatuses(
    manager: EntityManager,
    params: {
      readonly actorKind: string | undefined;
      readonly actorSub: string | undefined;
      readonly captureFailureIsFatal: boolean;
      readonly planId: string;
      readonly taskStatusesToReset: readonly string[];
    },
  ): Promise<void> {
    const {
      actorKind,
      actorSub,
      captureFailureIsFatal,
      planId,
      taskStatusesToReset,
    } = params;

    // Routed through the applyStatusChange chokepoint. Re-reads the plan fresh under this
    // transaction rather than reusing the caller's earlier (pre-transaction) read, since that
    // read predates this commit by the time spent building/validating the job.
    const planRepo = manager.getRepository(Plan);
    const planEntity = await planRepo.findOne({ where: { id: planId } });

    if (planEntity) {
      await this.planStatusService.applyStatusChange(manager, {
        actorKind,
        actorSub,
        captureFailureIsFatal,
        entity: planEntity,
        requestedStatus: 'QUEUED',
        throwOnForbiddenInProgress: false,
      });

      await planRepo.save(planEntity);
    }

    // Select-lock-update-capture, inside this same transaction: ENQUEUE_TASK_STATUSES_TO_RESET
    // lists SIX different current statuses, so the bulk `.update()` this reset performs has no
    // single `from` to ledger — each affected task's own prior status is captured instead of a
    // guess. Attributed to the same actor, with the same capture fatality, as the plans.status
    // write immediately above it.
    await updateMatchingTasksAndEmitStatusChanged({
      actorKind,
      actorSub,
      captureFailureIsFatal,
      fromStatuses: taskStatusesToReset,
      logger: this.logger,
      manager,
      notifications: this.notificationsService,
      planId,
      toStatus: 'QUEUED',
      workLedgerCapture: this.workLedgerCapture,
    });
  }

  /**
   * @description The fire-time half of a scheduled run, run by the plans worker when the run's delayed
   * job fires and BEFORE anything else touches the run. One transaction:
   *
   * 1. Locks the plan row (`pessimistic_write`), so two scheduled runs of one plan firing on different
   *    workers serialize here and the second sees the first as an active run.
   * 2. Re-reads the run; anything but SCHEDULED (a cancel settled it, or it already fired) returns
   *    `not_scheduled` without writing.
   * 3. Decides with {@link decideScheduledPlanRunFire} from the run's lateness, whether the plan has
   *    another active run ({@link PlanRunsService.hasActiveRun}), and whether it has a task left to
   *    run (one in {@link ENQUEUE_TASK_STATUSES_TO_RESET} or already QUEUED — exactly the tasks the
   *    run would pick up).
   * 4. Applies it through {@link PlanRunsService.transitionScheduledRun}, the atomic
   *    `... WHERE status = 'SCHEDULED'` update that a concurrent cancel races: `fire` claims the row
   *    QUEUED, `missed`/`superseded` settle it MISSED/SUPERSEDED, `nothing_to_run` settles it
   *    SKIPPED, each recording the decision's reason in `settled_reason`. If the update loses the race the result is `not_scheduled` and nothing else is
   *    written.
   * 5. Only for `fire`, and only after the claim won: the plan and task QUEUED flip that scheduling
   *    skipped, via the same {@link writeEnqueueStatuses} every enqueue uses (non-fatal capture — a
   *    background writer, like every other worker-side status write). The worker then claims the row
   *    IN_PROGRESS and promotes the plan as for any run.
   *
   * The plan's own status does not gate the fire: a scheduled run on a COMPLETED (or CANCELED,
   * PENDING, ...) plan that still has runnable tasks starts exactly like "Run now" on that plan
   * would — plan -> QUEUED -> IN_PROGRESS. A plan with no runnable tasks is never flipped back to
   * QUEUED: there is no work, so the run settles SKIPPED; the plan then gets the ordinary
   * auto-close ({@link PlanStatusService.reconcileAfterScheduledRunSettled}), which completes an idle
   * PENDING/QUEUED plan whose tasks are all done and otherwise leaves its status and `completedAt`. Notifying the user is the caller's job. Throws only on a database error.
   */
  async fireScheduledRun(params: {
    readonly actorKind: string | undefined;
    readonly actorSub: string | undefined;
    readonly now: Date;
    readonly planId: string;
    readonly planRunId: string;
  }): Promise<ScheduledRunFireOutcome> {
    const { actorKind, actorSub, now, planId, planRunId } = params;
    const repo = this.plansService.getRepository();

    const outcome = await repo.manager.transaction<ScheduledRunFireOutcome>(
      async (manager) => {
        const plan = await manager.getRepository(Plan).findOne({
          lock: { mode: 'pessimistic_write' },
          where: { id: planId },
        });
        const run = await manager
          .getRepository(PlanRun)
          .findOne({ where: { id: planRunId } });

        if (
          plan === null ||
          run?.status !== PLAN_RUN_STATUS.SCHEDULED ||
          run.scheduledFor === null
        ) {
          return { kind: 'not_scheduled' };
        }

        const hasActiveRun = await this.planRunsService.hasActiveRun(
          planId,
          planRunId,
          manager,
        );
        const runnableTaskCount = await countRunnablePlanTasks(manager, planId);
        const decision = decideScheduledPlanRunFire({
          hasActiveRun,
          hasRunnableTasks: runnableTaskCount > 0,
          now,
          scheduledFor: run.scheduledFor,
        });

        const won = await this.planRunsService.transitionScheduledRun(
          planRunId,
          SCHEDULED_RUN_STATUS_BY_DECISION[decision.kind],
          manager,
          decision.kind === 'fire' ? undefined : decision.reason,
        );

        if (!won) {
          return { kind: 'not_scheduled' };
        }

        if (decision.kind === 'fire') {
          await this.writeEnqueueStatuses(manager, {
            actorKind,
            actorSub,
            captureFailureIsFatal: false,
            planId,
            taskStatusesToReset: ENQUEUE_TASK_STATUSES_TO_RESET,
          });
        }

        return decision;
      },
    );

    // The SCHEDULED run was what held an idle, fully-done plan open (see
    // PlanStatusService.completeParentPlanIfTasksDone). Now that it settled SKIPPED, close the plan.
    // Outside the transaction: the reconcile takes its own plan row lock.
    if (outcome.kind === 'nothing_to_run') {
      await this.planStatusService.reconcileAfterScheduledRunSettled(planId, {
        actorKind,
        actorSub,
      });
    }

    return outcome;
  }

  /**
   * @description Re-creates the lost delayed BullMQ job of a SCHEDULED run (the boot reconcile, after
   * Redis was flushed or its volume recreated) under the run's own deterministic job id, so the row
   * and the job line up again and the fire-time policy runs when it fires. The payload is rebuilt from
   * the run's frozen `runConfigSnapshot` ({@link orchestratorJobInputFromSnapshot}) through the same
   * `buildRunPlanOrchestratorJobData` validation an enqueue uses; the original priority is not
   * recorded, so the default applies. Writes nothing to the database. Throws when the run has no job
   * id or snapshot, the payload no longer validates, or the BullMQ add fails.
   */
  async reprojectScheduledRun(params: {
    readonly delayMs: number;
    readonly run: PlanRun;
  }): Promise<{ readonly jobId: string }> {
    const { delayMs, run } = params;

    if (run.bullmqJobId === null || run.runConfigSnapshot == null) {
      throw new Error(
        `Scheduled run ${run.id} has no job id or config snapshot to rebuild its job from`,
      );
    }

    const jobData = buildRunPlanOrchestratorJobData(
      orchestratorJobInputFromSnapshot(run.planId, run.runConfigSnapshot),
    );
    const enqueueResult = await this.queuesService.enqueuePlanRalphOrchestrator(
      {
        delayMs,
        idempotencyKey: run.bullmqJobId,
        jobData,
        priority: PLAN_JOB_PRIORITY_DEFAULT,
      },
    );

    if ('error' in enqueueResult) {
      throw new Error(enqueueResult.error);
    }

    return { jobId: enqueueResult.jobId };
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
