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
  ScheduledRunRef,
} from '@openthrottle/nestjs-repositories';
import {
  Plan,
  PLAN_RUN_STATUS,
  PLAN_STATUS,
  PlanRun,
  PlanRunsService,
  PlansService,
  RepositoryCheckoutsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import {
  nodeResolverFs,
  resolveOtLoopCommands,
} from '@openthrottle/openthrottle-agentic-loop';
import { getWorkflowConfigCwd } from '@openthrottle/openthrottle-agentic-utils';
import type { JobRunHookEntry } from '@tools/workflows';
import { projectHookTasksToJobRunHookEntries } from '@tools/workflows';
import type { Queue } from 'bullmq';
import type { EntityManager } from 'typeorm';

import { NotificationsService } from '../../../notifications/notifications.service.ts';
import { updateMatchingTasksAndEmitStatusChanged } from '../../../notifications/notifications.utils.ts';
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
import type { ScheduledPlanRunFireDecision } from '../../../queues/plans/scheduled-plan-run/scheduled-plan-run.types.ts';
import { decideScheduledPlanRunFire } from '../../../queues/plans/scheduled-plan-run/scheduled-plan-run.utils.ts';
import { USAGE_LIMIT_RESUME_JOB_ID_PREFIX } from '../../../queues/usage-limit/usage-limit.constants.ts';
import { QueuesService } from '../../queues/queues-service/queues-service.service.ts';
import { normalizeIdempotencyKey } from '../../queues/queues-service/queues-service.utils.ts';
import { WorkLedgerCaptureService } from '../../work-ledger/work-ledger-capture/work-ledger-capture.service.ts';
import { buildRunPlanOrchestratorJobData } from '../enqueue-plan-ralph-tuning/enqueue-plan-ralph-tuning.utils.ts';
import {
  buildPlanRunConfigSnapshotFromJobData,
  orchestratorJobInputFromSnapshot,
} from '../enqueue-plan-run-config-snapshot/enqueue-plan-run-config-snapshot.utils.ts';
import type { RalphPlanRunTuningInput } from '../plan.input.ts';
import { PlanStatusService } from '../plan-status/plan-status.service.ts';
import type { StatusChangeActor } from '../plan-status/plan-status.types.ts';
import { PLAN_SCHEDULE_CONFLICT_CODE } from './plan-enqueue.constants.ts';
import type {
  EnqueueOutcome,
  ScheduledRunFireOutcome,
  ScheduleOutcome,
} from './plan-enqueue.types.ts';
import {
  createPlanScheduleConflictError,
  decidePlanSchedulability,
  isOneScheduledRunViolation,
  resolveRequestedRunner,
} from './plan-enqueue.utils.ts';
import { ENQUEUE_TASK_STATUSES_TO_RESET } from './runnable-tasks/runnable-tasks.constants.ts';
import { countRunnablePlanTasks } from './runnable-tasks/runnable-tasks.utils.ts';

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
  workspace_missing: PLAN_RUN_STATUS.FAILED,
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
  /** True to cancel the plan's scheduled run and run now (D6); otherwise a schedule rejects. */
  readonly cancelScheduled?: boolean | null;
  /** Explicit registered checkout id; resolved to a filesystem path (highest precedence). */
  readonly checkoutId?: string | null;
  readonly idempotencyKey?: string | null;
  readonly jobRunHooksJson?: string | null;
  readonly planId: string;
  readonly priority?: number | null;
  readonly ralph?: RalphPlanRunTuningInput | null;
  /** Portable repository id; resolved to the user's single checkout when checkoutId is omitted. */
  readonly repositoryId?: string | null;
  /** Requested runner (`ralph` | `ot-loop`); absent falls back to the plan's stored runner, else Ralph. */
  readonly runner?: string | null;
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
  /** True to cancel the plan's scheduled run and run now (D6); otherwise a schedule rejects. */
  readonly cancelScheduled?: boolean | null;
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
  /** Requested runner (`ralph` | `ot-loop`); absent falls back to the plan's stored runner, else Ralph. */
  readonly runner?: string | null;
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
  /** True to cancel the plan's current scheduled run and schedule this one in its place (D5). */
  readonly replaceScheduled?: boolean | null;
  /** Portable repository id; resolved to the user's single checkout when checkoutId is omitted. */
  readonly repositoryId?: string | null;
  /** Requested runner (`ralph` | `ot-loop`); absent falls back to the plan's stored runner, else Ralph. */
  readonly runner?: string | null;
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

/** @description What {@link PlanEnqueueService.commitEnqueueTransaction} committed. */
interface CommittedEnqueue {
  /** SCHEDULED runs the commit cancelled (D5/D6), whose delayed jobs the caller removes. */
  readonly cancelledScheduledRuns: readonly ScheduledRunRef[];
  readonly planRun: PlanRun;
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
      cancelScheduled,
      checkoutId,
      idempotencyKey,
      jobRunHooksJson,
      planId,
      priority,
      ralph,
      repositoryId,
      runner,
      workingDirectory,
    } = params;

    return this.enqueueOrchestrator({
      actorKind,
      actorSub,
      actorUserId,
      branch,
      cancelScheduled,
      checkoutId,
      idempotencyKey: idempotencyKey ?? null,
      jobRunHooksJson,
      mode: null,
      planId,
      priority,
      ralph,
      repositoryId,
      runner,
      taskId: null,
      workingDirectory,
    });
  }

  /**
   * @description Enqueue an in-process Ralph orchestrator plan-run. Callers must pre-validate the
   * GraphQL `mode`/`taskId` constraints (the resolver does this); this method assumes a resolved
   * `mode` and an existing `taskId` when `mode === 'task'`.
   *
   * A plan with a SCHEDULED run is rejected with `PLAN_ALREADY_SCHEDULED` (D6) unless
   * `cancelScheduled` is set: then the scheduled run is cancelled in the same transaction that
   * records this run (plan SCHEDULED -> QUEUED), and its delayed job is removed after the commit.
   */
  async enqueueOrchestrator(
    params: EnqueueOrchestratorParams,
  ): Promise<EnqueueOutcome> {
    const {
      actorKind,
      actorSub,
      actorUserId,
      branch,
      cancelScheduled,
      checkoutId,
      idempotencyKey,
      jobRunHooksJson,
      mode,
      planId,
      priority,
      ralph,
      repositoryId,
      runner,
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
        runner,
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

    const { cancelledScheduledRuns } = await this.commitEnqueueTransaction({
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
      scheduledRunPolicy: cancelScheduled === true ? 'cancel' : 'reject',
    });

    await this.removeCancelledScheduledJobs(cancelledScheduledRuns);

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
   * (run row SCHEDULED with `scheduled_for`; plan -> SCHEDULED, tasks untouched) then
   * `QueuesService.enqueuePlanRalphOrchestrator` (BullMQ add after commit, delayed by the time left) —
   * differing only in that the run is freshly resolved from the request, like
   * {@link enqueueOrchestrator}, and the status/delay come from `scheduledFor`. Unlike every other
   * enqueue it moves the plan to SCHEDULED rather than QUEUED and leaves the tasks alone (the
   * `schedule` status writes): the plan -> QUEUED flip and the task resets move to fire time.
   *
   * Only a PENDING or BACKLOG plan can be scheduled (OT plan 764c7654, D2); anything else is rejected
   * with a D8 conflict (`PLAN_ALREADY_SCHEDULED`, `PLAN_ACTIVE`, `PLAN_NOT_SCHEDULABLE`). The check
   * runs inside the commit transaction against the plan row under a write lock, so two concurrent
   * schedules of one plan cannot both pass it; the partial unique index of migration 152 backs it,
   * and a violation of it maps to `PLAN_ALREADY_SCHEDULED` too. With `replaceScheduled` a SCHEDULED
   * plan is rescheduled instead (D5): the old run is cancelled and the new one recorded in one
   * transaction, and the plan stays SCHEDULED throughout.
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
      replaceScheduled,
      repositoryId,
      runner,
      scheduledFor,
      workingDirectory,
    } = params;

    // One clock read for the whole call, so the past check, the horizon check and the delay agree.
    const nowMs = Date.now();
    const scheduledForMs = scheduledFor.getTime();
    const delayMs = this.resolveScheduleDelayMs(scheduledFor, nowMs);

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
        runner,
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

    const { cancelledScheduledRuns, planRun } =
      await this.commitEnqueueTransaction({
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
        // Scheduling moves the plan to SCHEDULED and leaves its tasks exactly as they are: a plan must
        // not read QUEUED for up to 30 days. The plan -> QUEUED and task resets happen at fire time,
        // when the delayed job starts the run.
        scheduledRunPolicy: replaceScheduled === true ? 'cancel' : 'reject',
        status: PLAN_RUN_STATUS.SCHEDULED,
        statusWrites: 'schedule',
      });

    // D5: the old row is already CANCELLED (committed with the new one), so its job is now inert;
    // removing it before adding the new job only tidies Redis. If the process dies between the
    // commit and these BullMQ calls, the old job fires into a no-op claim and the boot reconcile
    // re-adds the new run's missing job.
    await this.removeCancelledScheduledJobs(cancelledScheduledRuns);

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
    readonly runner?: string | null;
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
      runner,
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
    // The request wins over the plan's stored runConfig; absent on both means Ralph.
    const effectiveRunner = resolveRequestedRunner(
      runner,
      plan.runConfig?.runner,
    );
    const otLoop =
      effectiveRunner === 'ot-loop' ? plan.runConfig?.otLoop : undefined;

    let jobData: ReturnType<typeof buildRunPlanOrchestratorJobData>;
    try {
      jobData = buildRunPlanOrchestratorJobData({
        jobRunHooksJson,
        materializedHookEntries,
        mode: mode ?? null,
        otLoop,
        planId,
        planJobRunHooks: plan.jobRunHooks,
        ralph,
        runner: effectiveRunner,
        taskId,
        workingDirectory: resolvedWorkspace.workingDirectory,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }

    if (effectiveRunner === 'ot-loop') {
      await this.assertOtLoopRunnable(jobData);
    }

    return { jobData, resolvedBranch, resolvedWorkspace };
  }

  /**
   * @description Rejects an OT Loop run that could not start, at enqueue (docs/workflows/ot-loop-job.md
   * § 5, § 6): by the time the job runs the plan is already IN_PROGRESS. Two checks. The run must have
   * a worktree (`ralph.worktree` present; the `disableWorktree` opt-out strips it), because the loop
   * resets and cleans its working tree and must never do that to a human's checkout. And a
   * validation command must resolve against the base checkout, which holds the same committed
   * `.openthrottle/ot-loop.json` the worktree will: the loop never marks a task done unvalidated.
   */
  private async assertOtLoopRunnable(
    jobData: ReturnType<typeof buildRunPlanOrchestratorJobData>,
  ): Promise<void> {
    if ((jobData.ralph?.worktree?.trim() ?? '') === '') {
      throw new BadRequestException(
        `OT Loop needs a worktree: it resets and cleans the working tree, so it never runs in your checkout. Remove disableWorktree to run it.`,
      );
    }

    const resolved = await resolveOtLoopCommands({
      fs: nodeResolverFs,
      otLoop: { validationCommands: jobData.otLoop?.validationCommands },
      worktreeRoot: getWorkflowConfigCwd(jobData.workingDirectory, process.env),
    });

    if (resolved.kind !== 'resolved') {
      throw new BadRequestException(resolved.message);
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
   * status, and task resets commit together or not at all. `statusWrites` picks the status half:
   * `enqueue` (the default) moves the plan and its resettable tasks to QUEUED; `schedule` first
   * checks the locked plan may be scheduled (D2, throwing a D8 conflict), then moves only the plan, to
   * SCHEDULED. Returns the recorded run. The BullMQ add cannot join a DB transaction, so callers enqueue AFTER this
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
     * What to do when the plan already has a SCHEDULED run: `reject` with PLAN_ALREADY_SCHEDULED,
     * `cancel` it in this transaction (D5 reschedule, D6 run-now), or `ignore` it (system enqueues
     * such as a usage-limit resume, which never meet one). Defaults to `ignore`.
     */
    scheduledRunPolicy?: 'cancel' | 'ignore' | 'reject';
    status?: PlanRunStatus;
    /** Which status writes join the run row; see the method description. Defaults to `enqueue`. */
    statusWrites?: 'enqueue' | 'schedule';
    taskStatusesToReset?: readonly string[];
  }): Promise<CommittedEnqueue> {
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
      scheduledRunPolicy,
      status,
      statusWrites,
      taskStatusesToReset,
    } = params;
    const repo = this.plansService.getRepository();

    return repo.manager.transaction(async (manager) => {
      const cancelledScheduledRuns = await this.applyScheduledRunPolicy(
        manager,
        planId,
        scheduledRunPolicy ?? 'ignore',
      );
      const isSchedule = statusWrites === 'schedule';
      // A reschedule has just cancelled the old run above, so its SCHEDULED plan may be scheduled.
      const planToSchedule = isSchedule
        ? await this.lockSchedulablePlan(manager, planId, scheduledRunPolicy)
        : null;

      const planRun = await this.recordRunMappingScheduleConflict(
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

      if (planToSchedule !== null) {
        await this.planStatusService.applyStatusChange(manager, {
          actorKind,
          actorSub,
          captureFailureIsFatal: true,
          entity: planToSchedule,
          requestedStatus: PLAN_STATUS.SCHEDULED,
          throwOnForbiddenInProgress: true,
        });
        await manager.getRepository(Plan).save(planToSchedule);

        return { cancelledScheduledRuns, planRun };
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

      return { cancelledScheduledRuns, planRun };
    });
  }

  /**
   * @description Applies a {@link commitEnqueueTransaction} `scheduledRunPolicy` to the plan, under
   * a write lock on the plan row so it cannot race a concurrent schedule. With no SCHEDULED run it is
   * a no-op. `reject` throws the D8 `PLAN_ALREADY_SCHEDULED` conflict naming the run; `cancel` settles
   * the plan's SCHEDULED runs CANCELLED and returns them for the caller to remove their jobs after
   * commit.
   */
  private async applyScheduledRunPolicy(
    manager: EntityManager,
    planId: string,
    policy: 'cancel' | 'ignore' | 'reject',
  ): Promise<readonly ScheduledRunRef[]> {
    if (policy === 'ignore') return [];

    await manager.getRepository(Plan).findOne({
      lock: { mode: 'pessimistic_write' },
      where: { id: planId },
    });
    const scheduledRun = await manager.getRepository(PlanRun).findOne({
      order: { scheduledFor: 'ASC' },
      where: { planId, status: PLAN_RUN_STATUS.SCHEDULED },
    });

    if (scheduledRun === null) return [];

    if (policy === 'reject') {
      throw createPlanScheduleConflictError({
        code: PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ALREADY_SCHEDULED,
        message: `Plan already has a run scheduled for ${scheduledRun.scheduledFor?.toISOString() ?? 'later'}; pass cancelScheduled to run now, or replaceScheduled to reschedule`,
        planRunId: scheduledRun.id,
        scheduledFor: scheduledRun.scheduledFor,
      });
    }

    return this.planRunsService.cancelScheduledRunsForPlan(planId, manager);
  }

  /**
   * @description `recordQueuedRun`, with a violation of the one-SCHEDULED-run-per-plan index
   * (migration 152) mapped to the D8 `PLAN_ALREADY_SCHEDULED` conflict. The plan-row lock makes the
   * violation unreachable through this service; the index is the backstop for any other writer.
   */
  private async recordRunMappingScheduleConflict(
    run: Parameters<PlanRunsService['recordQueuedRun']>[0],
    manager: EntityManager,
  ): Promise<PlanRun> {
    try {
      return await this.planRunsService.recordQueuedRun(run, manager);
    } catch (error) {
      if (!isOneScheduledRunViolation(error)) throw error;

      throw createPlanScheduleConflictError({
        code: PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ALREADY_SCHEDULED,
        message: `Plan already has a scheduled run`,
        planRunId: null,
        scheduledFor: null,
      });
    }
  }

  /** @description Removes the delayed jobs of scheduled runs a commit just cancelled (best-effort). */
  private async removeCancelledScheduledJobs(
    runs: readonly ScheduledRunRef[],
  ): Promise<void> {
    await this.planStatusService.removeScheduledRunJobs(
      runs.flatMap((run) => {
        return run.bullmqJobId === null ? [] : [run.bullmqJobId];
      }),
    );
  }

  /**
   * @description Re-reads the plan under a write lock inside the scheduling transaction and applies
   * the D2 gate ({@link decidePlanSchedulability}). Returns the locked row for the caller to move to
   * SCHEDULED, or throws the D8 conflict — carrying the plan's current scheduled run when it has one.
   * Under the `cancel` policy (a D5 reschedule) a SCHEDULED plan passes: its old run was cancelled
   * earlier in this transaction, and the plan stays SCHEDULED for the new one.
   */
  private async lockSchedulablePlan(
    manager: EntityManager,
    planId: string,
    scheduledRunPolicy: 'cancel' | 'ignore' | 'reject' | undefined,
  ): Promise<Plan> {
    const plan = await manager.getRepository(Plan).findOne({
      lock: { mode: 'pessimistic_write' },
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`🟡 1 - Plan not found: ${planId}`);
    }

    const schedulability = decidePlanSchedulability(plan.status);
    const isReschedule =
      scheduledRunPolicy === 'cancel' && plan.status === PLAN_STATUS.SCHEDULED;

    if (schedulability.kind === 'schedulable' || isReschedule) {
      return plan;
    }

    const scheduledRun = await manager.getRepository(PlanRun).findOne({
      order: { scheduledFor: 'ASC' },
      where: { planId, status: PLAN_RUN_STATUS.SCHEDULED },
    });

    throw createPlanScheduleConflictError({
      code: schedulability.code,
      message: schedulability.message,
      planRunId: scheduledRun?.id ?? null,
      scheduledFor: scheduledRun?.scheduledFor ?? null,
    });
  }

  /**
   * @description Returns a SCHEDULED plan to PENDING once its scheduled run was settled without
   * firing (D4) — the boot reconcile's MISSED settle. Guarded on the plan still being SCHEDULED.
   * Background writer: a work-ledger capture failure is logged, not thrown.
   */
  async releaseScheduledPlan(
    planId: string,
    actor: StatusChangeActor,
  ): Promise<boolean> {
    return this.planStatusService.releaseScheduledPlanStandalone(
      planId,
      actor,
      false,
    );
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
   * @description Validates a requested fire time and returns the delay until it. The same rule for
   * scheduling and rescheduling: a valid instant strictly in the future, no further out than
   * {@link SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS} days. Throws BadRequest otherwise.
   */
  private resolveScheduleDelayMs(scheduledFor: Date, nowMs: number): number {
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

    return scheduledForMs - nowMs;
  }

  /**
   * @description Moves ONE scheduled run's fire time in place, instead of cancel + recreate. The run
   * keeps its id, its frozen run config snapshot and its job id; only `scheduled_for` and the job's
   * delay change. The new instant follows the scheduling rule ({@link resolveScheduleDelayMs}).
   *
   * Order matters: the delayed job is re-delayed FIRST (`changeDelay`, which BullMQ only allows on a
   * job that is still delayed — a job a worker already took is firing, and that is rejected), and the
   * row is moved SECOND under the `status = SCHEDULED` guard. A row that loses that guard was
   * cancelled or settled meanwhile; the cancel removed the job, so nothing is left firing at the new
   * time. Doing it the other way round could leave a row that says "later" over a job that still
   * fires at the old time — and an early fire reads as on time to the fire-time policy. A job lost
   * from Redis (flushed volume) is recreated with the new delay ({@link reprojectScheduledRun}).
   * Never touches the plan or its tasks. Throws BadRequest for an unknown run, a run of another plan,
   * or a run that is not SCHEDULED.
   */
  async reschedulePlanRun(params: {
    readonly planId: string;
    readonly planRunId: string;
    readonly scheduledFor: Date;
  }): Promise<ScheduleOutcome> {
    const { planId, planRunId, scheduledFor } = params;
    const delayMs = this.resolveScheduleDelayMs(scheduledFor, Date.now());
    const run = await this.planRunsService.findById(planRunId);

    if (!run || run.planId !== planId) {
      throw new BadRequestException(
        `Plan run ${planRunId} was not found for plan ${planId}`,
      );
    }
    if (run.status !== PLAN_RUN_STATUS.SCHEDULED || run.bullmqJobId === null) {
      throw new BadRequestException(
        `Plan run ${planRunId} is ${run.status}, not SCHEDULED, so it cannot be rescheduled`,
      );
    }

    const jobId = run.bullmqJobId;
    const job = await this.plansQueue.getJob(jobId);

    if (job === undefined) {
      await this.reprojectScheduledRun({ delayMs, run });
    } else {
      const state = await job.getState();
      if (state !== 'delayed') {
        throw new BadRequestException(
          `Plan run ${planRunId} is already starting (its job is ${state}), so it cannot be rescheduled`,
        );
      }
      await job.changeDelay(delayMs);
    }

    const moved = await this.planRunsService.rescheduleScheduledRun(
      planRunId,
      scheduledFor,
    );
    if (!moved) {
      throw new BadRequestException(
        `Plan run ${planRunId} was cancelled or started while it was being rescheduled`,
      );
    }

    return {
      executionBackend: run.executionBackend,
      jobId,
      planId,
      planRunId,
      scheduledFor,
    };
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
   *    SKIPPED, `workspace_missing` (the caller's `workspaceError`) settles it FAILED, each recording
   *    the decision's reason in `settled_reason`. If the update loses the race the result is `not_scheduled` and nothing else is
   *    written.
   * 5. Only for `fire`, and only after the claim won: the plan (SCHEDULED) and task QUEUED flip that
   *    scheduling skipped, via the same {@link writeEnqueueStatuses} every enqueue uses (non-fatal
   *    capture — a background writer, like every other worker-side status write). The worker then
   *    claims the row IN_PROGRESS and promotes the plan as for any run. Every other decision returns
   *    a SCHEDULED plan to PENDING ({@link PlanStatusService.releaseScheduledPlan}, D4) in the same
   *    transaction.
   *
   * The plan's own status does not gate the fire: since D2 only a PENDING/BACKLOG plan is scheduled,
   * it is SCHEDULED here, but a legacy row on any other plan still starts exactly like "Run now"
   * would — plan -> QUEUED -> IN_PROGRESS. A plan with no runnable tasks is never flipped to
   * QUEUED: there is no work, so the run settles SKIPPED and a SCHEDULED plan returns to PENDING; the
   * plan then gets the ordinary auto-close ({@link PlanStatusService.reconcileAfterScheduledRunSettled}), which completes an idle
   * PENDING/QUEUED plan whose tasks are all done and otherwise leaves its status and `completedAt`. Notifying the user is the caller's job. Throws only on a database error.
   */
  async fireScheduledRun(params: {
    readonly actorKind: string | undefined;
    readonly actorSub: string | undefined;
    readonly now: Date;
    readonly planId: string;
    readonly planRunId: string;
    /** Why the run's working directory is unusable, or null; checked by the caller, outside the transaction. */
    readonly workspaceError: string | null;
  }): Promise<ScheduledRunFireOutcome> {
    const { actorKind, actorSub, now, planId, planRunId, workspaceError } =
      params;
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
          workspaceError,
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
        } else {
          await this.planStatusService.releaseScheduledPlan(manager, {
            actorKind,
            actorSub,
            captureFailureIsFatal: false,
            planId,
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
