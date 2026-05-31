/**
 * @description Server wiring for job-run lifecycle hooks: plan/task context, plan output stream,
 * and a single in-process agent iteration per hook.
 */

import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkflowLifecycleDispatcher } from '@openthrottle/openthrottle-agentic-workflow';
import {
  PlanOutputStreamService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { formatPlanAndTasksForPrompt } from '@openthrottle/openthrottle-workflows';
import type { WorkflowRunnerId } from '@openthrottle/openthrottle-agentic-utils';
import {
  createCursorWorkflowRalphIterationRunner,
  executeJobRunHooksPhase,
  formatJobRunHookEntryLabel,
  mergeRalphNestedRunTuningWithExecutionBackend,
  type ExecuteJobRunHooksPhaseResult,
  type JobRunHookPhase,
  type JobRunHookRunKind,
  type JobRunHooksConfig,
  type RalphNestedRunTuningInput,
} from '@tools/workflows';
import type { RunPlanJobData } from '../plans/plans.types';
import { isRunPlanOrchestratorJobData } from '../plans/plans.types';

function getWorkspaceRoot(jobData: RunPlanJobData): string {
  return (
    jobData.workingDirectory ?? process.env.WORKSPACE_ROOT ?? process.cwd()
  );
}

function runKindFromJobData(jobData: RunPlanJobData): JobRunHookRunKind {
  return isRunPlanOrchestratorJobData(jobData) ? 'orchestrator' : 'spawn';
}

function executionBackendFromJobData(
  jobData: RunPlanJobData,
): WorkflowRunnerId {
  const merged = mergeRalphNestedRunTuningWithExecutionBackend(
    jobData.ralph,
    jobData.executionBackend,
  );

  return merged.backend ?? jobData.executionBackend ?? 'cursor';
}

const BEFORE_PHASE_SUFFIX = `Complete any preflight work for this plan job. The main Ralph run starts only if this hook succeeds (or on_failure allows it).`;
const AFTER_PHASE_SUFFIX = `The main plan job has finished (or was blocked before start). Summarize, file follow-ups, or run post-run checks as configured.`;
const BEFORE_EACH_SUFFIX = `This hook runs before the task iterations begin. Complete any pre-task setup; the task run continues only if this hook succeeds (or on_failure allows it).`;
const AFTER_EACH_SUFFIX = `This hook runs after the task reached a terminal status. Summarize, run per-task checks, or file follow-ups as configured.`;

const layer1SuffixForPhase = (phase: JobRunHookPhase): string => {
  if (phase === 'beforeAll' || phase === 'beforeEach') {
    return phase === 'beforeEach' ? BEFORE_EACH_SUFFIX : BEFORE_PHASE_SUFFIX;
  }

  return phase === 'afterEach' ? AFTER_EACH_SUFFIX : AFTER_PHASE_SUFFIX;
};

export type PlanQueueJobCompletedPayload = {
  readonly jobType: string;
  readonly message: string;
  readonly planId: string;
  readonly severity: 'error' | 'info' | 'success' | 'warning';
};

export interface PlanJobRunHooksServices {
  readonly emitQueueJobCompleted: (
    payload: PlanQueueJobCompletedPayload,
  ) => void;
}

const logAfterRunHookFailures = (
  logger: LoggerService,
  logLabel: string,
  planId: string,
  phaseResult: ExecuteJobRunHooksPhaseResult,
): void => {
  for (const result of phaseResult.results) {
    if (result.ok) {
      continue;
    }

    logger.warn(
      `afterAll hook failed (on_failure=${result.onFailure}): planId=${planId}, ${formatJobRunHookEntryLabel(result.entry)}`,
      logLabel,
    );
  }
};

export interface ExecutePlanJobRunHooksParams {
  readonly hooks: JobRunHooksConfig | undefined;
  readonly jobData: RunPlanJobData;
  readonly logLabel: string;
  readonly logger: LoggerService;
  readonly mainRunStarted?: boolean;
  readonly mainRunSucceeded?: boolean;
  readonly phase: JobRunHookPhase;
  readonly planOutputStreamService: PlanOutputStreamService;
  readonly plansService: PlansService;
  readonly signal?: AbortSignal;
  readonly task?: {
    readonly category: string | undefined;
    readonly id: string;
    readonly status: string;
    readonly title: string;
  };
  readonly taskOutcome?: 'blocked' | 'completed' | 'failed';
  readonly tasksService: TasksService;
}

/**
 * @description Loads plan/tasks, runs hooks for {@link ExecutePlanJobRunHooksParams.phase}, appends to plan output.
 */
export const executePlanJobRunHooks = async (
  params: ExecutePlanJobRunHooksParams,
): Promise<ExecuteJobRunHooksPhaseResult> => {
  const { jobData, phase } = params;
  const planId = jobData.planId;

  if (params.hooks === undefined || params.hooks.hooks.length === 0) {
    return { blocked: false, results: [] };
  }

  const planRepo = params.plansService.getRepository();
  const taskRepo = params.tasksService.getRepository();

  const [plan, tasks] = await Promise.all([
    planRepo.findOne({ where: { id: planId } }),
    taskRepo.find({
      order: { createdAt: 'ASC' },
      where: { planId },
    }),
  ]);

  if (!plan) {
    params.logger.warn(
      `Job-run hooks skipped: plan not found planId=${planId}`,
      params.logLabel,
    );

    return { blocked: false, results: [] };
  }

  const planContextBlock = formatPlanAndTasksForPrompt(plan, tasks);
  const cwd = getWorkspaceRoot(jobData);
  const backend = executionBackendFromJobData(jobData);
  const ralph = jobData.ralph as RalphNestedRunTuningInput | undefined;
  const model = ralph?.model ?? undefined;

  const iterationRunner = createCursorWorkflowRalphIterationRunner();

  const appendPlanOutput = async (
    content: string,
    _iteration: number | null,
  ): Promise<void> => {
    const outputRepo = params.planOutputStreamService.getRepository();
    const entity = outputRepo.create({
      content,
      iteration: null,
      planId,
    });

    await outputRepo.save(entity);
  };

  const layer1Suffix = layer1SuffixForPhase(phase);

  return executeJobRunHooksPhase({
    deps: {
      appendPlanOutput,
      cwd,
      runHookIteration: async ({
        agentPrompt,
        hookIndex,
        signal,
        timeoutMs,
      }) => {
        try {
          const output = await iterationRunner.run({
            agentPrompt,
            iteration: hookIndex,
            model,
            runner: backend,
            signal,
            timeoutMs,
          });

          return { ok: true, output };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);

          if (signal?.aborted === true) {
            return {
              cancelled: true,
              errorMessage: message,
              ok: false,
            };
          }

          return { errorMessage: message, ok: false };
        }
      },
    },
    hooks: params.hooks,
    layer1Suffix,
    mainRunStarted: params.mainRunStarted,
    mainRunSucceeded: params.mainRunSucceeded,
    phase,
    planContextBlock,
    planId,
    runKind: runKindFromJobData(jobData),
    signal: params.signal,
    task: params.task,
    taskOutcome: params.taskOutcome,
  });
};

/**
 * @description Runs `afterAll` hooks for the current terminal job outcome.
 */
export const runAfterAllHooks = async (
  params: Omit<ExecutePlanJobRunHooksParams, 'phase'>,
): Promise<ExecuteJobRunHooksPhaseResult> =>
  executePlanJobRunHooks({
    ...params,
    phase: 'afterAll',
  });

/** @description Alias for {@link runAfterAllHooks} (legacy name). */
export const runAfterRunHooks = runAfterAllHooks;

/**
 * @description Runs `after_run` hooks, then emits the plan queue job-completed notification.
 */
export const runAfterRunHooksThenNotify = async (params: {
  readonly hooks: JobRunHooksConfig | undefined;
  readonly jobData: RunPlanJobData;
  readonly logLabel: string;
  readonly logger: LoggerService;
  readonly mainRunStarted: boolean;
  readonly mainRunSucceeded: boolean;
  readonly notification: PlanQueueJobCompletedPayload;
  readonly notifications: PlanJobRunHooksServices;
  readonly planOutputStreamService: PlanOutputStreamService;
  readonly plansService: PlansService;
  readonly signal?: AbortSignal;
  readonly tasksService: TasksService;
}): Promise<void> => {
  const phaseResult = await runAfterRunHooks({
    hooks: params.hooks,
    jobData: params.jobData,
    logLabel: params.logLabel,
    logger: params.logger,
    mainRunStarted: params.mainRunStarted,
    mainRunSucceeded: params.mainRunSucceeded,
    planOutputStreamService: params.planOutputStreamService,
    plansService: params.plansService,
    signal: params.signal,
    tasksService: params.tasksService,
  });

  logAfterRunHookFailures(
    params.logger,
    params.logLabel,
    params.jobData.planId,
    phaseResult,
  );

  params.notifications.emitQueueJobCompleted(params.notification);
};

/**
 * @description Runs `beforeAll` hooks; when blocked, sets plan status to BLOCKED and returns true.
 */
export const runBeforeAllHooksAndHandleBlock = async (params: {
  readonly hooks: JobRunHooksConfig | undefined;
  readonly jobData: RunPlanJobData;
  readonly logLabel: string;
  readonly logger: LoggerService;
  readonly notifications: PlanJobRunHooksServices & {
    emitPlanStatusChanged: (payload: {
      planId: string;
      status: string;
    }) => void;
  };
  readonly planOutputStreamService: PlanOutputStreamService;
  readonly plansService: PlansService;
  readonly signal?: AbortSignal;
  readonly tasksService: TasksService;
}): Promise<boolean> => {
  const phaseResult = await executePlanJobRunHooks({
    hooks: params.hooks,
    jobData: params.jobData,
    logLabel: params.logLabel,
    logger: params.logger,
    phase: 'beforeAll',
    planOutputStreamService: params.planOutputStreamService,
    plansService: params.plansService,
    signal: params.signal,
    tasksService: params.tasksService,
  });

  if (!phaseResult.blocked) {
    return false;
  }

  const planId = params.jobData.planId;
  const repo = params.plansService.getRepository();

  await runAfterRunHooks({
    hooks: params.hooks,
    jobData: params.jobData,
    logLabel: params.logLabel,
    logger: params.logger,
    mainRunStarted: false,
    mainRunSucceeded: false,
    planOutputStreamService: params.planOutputStreamService,
    plansService: params.plansService,
    signal: params.signal,
    tasksService: params.tasksService,
  });

  await repo.update({ id: planId }, { status: 'BLOCKED' });

  params.notifications.emitPlanStatusChanged({
    planId,
    status: 'BLOCKED',
  });

  params.notifications.emitQueueJobCompleted({
    jobType: 'plans',
    message: `Plan run blocked by beforeAll hook: ${planId}`,
    planId,
    severity: 'error',
  });

  params.logger.warn(
    `beforeAll hook blocked main run: planId=${planId}`,
    params.logLabel,
  );

  return true;
};

/** @description Alias for {@link runBeforeAllHooksAndHandleBlock} (legacy name). */
export const runBeforeRunHooksAndHandleBlock = runBeforeAllHooksAndHandleBlock;

/**
 * @description Runs `beforeAll` hooks via a BullMQ child-job dispatcher; handles plan BLOCKED terminal path.
 */
export const runBeforeAllHooksWithDispatcher = async (params: {
  readonly dispatcher: WorkflowLifecycleDispatcher;
  readonly hooks: JobRunHooksConfig | undefined;
  readonly jobData: RunPlanJobData;
  readonly logLabel: string;
  readonly logger: LoggerService;
  readonly notifications: PlanJobRunHooksServices & {
    emitPlanStatusChanged: (payload: {
      planId: string;
      status: string;
    }) => void;
  };
  readonly planOutputStreamService: PlanOutputStreamService;
  readonly plansService: PlansService;
  readonly signal?: AbortSignal;
  readonly tasksService: TasksService;
}): Promise<boolean> => {
  const phaseResult = await params.dispatcher.runPlan({ phase: 'beforeAll' });

  if (!phaseResult.blocked) {
    return false;
  }

  const planId = params.jobData.planId;

  await params.dispatcher.runPlan({
    mainRunStarted: false,
    mainRunSucceeded: false,
    phase: 'afterAll',
  });

  const repo = params.plansService.getRepository();
  await repo.update({ id: planId }, { status: 'BLOCKED' });

  params.notifications.emitPlanStatusChanged({
    planId,
    status: 'BLOCKED',
  });

  params.notifications.emitQueueJobCompleted({
    jobType: 'plans',
    message: `Plan run blocked by beforeAll hook: ${planId}`,
    planId,
    severity: 'error',
  });

  params.logger.warn(
    `beforeAll hook blocked main run: planId=${planId}`,
    params.logLabel,
  );

  return true;
};

/**
 * @description Runs `afterAll` hooks via dispatcher, then emits queue job-completed notification.
 */
export const runAfterAllHooksWithDispatcherThenNotify = async (params: {
  readonly dispatcher: WorkflowLifecycleDispatcher;
  readonly jobData: RunPlanJobData;
  readonly logLabel: string;
  readonly logger: LoggerService;
  readonly mainRunStarted: boolean;
  readonly mainRunSucceeded: boolean;
  readonly notification: PlanQueueJobCompletedPayload;
  readonly notifications: PlanJobRunHooksServices;
}): Promise<void> => {
  await params.dispatcher.runPlan({
    mainRunStarted: params.mainRunStarted,
    mainRunSucceeded: params.mainRunSucceeded,
    phase: 'afterAll',
  });

  params.notifications.emitQueueJobCompleted(params.notification);
};
