/**
 * @description Runs a single lifecycle hook entry (one BullMQ child job invocation).
 */

import type { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PLAN_TASK_LIST_ORDER,
  PlanOutputStreamService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { formatPlanAndTasksForPrompt } from '@openthrottle/openthrottle-agentic-ralph';
import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import {
  buildJobRunHookAgentPrompt,
  createCursorWorkflowRalphIterationRunner,
  formatJobRunHookEntryLabel,
  mergeRalphNestedRunTuningWithExecutionBackend,
  resolveJobRunHookLayer1Prompt,
  resolveJobRunHookOnFailure,
  resolveJobRunHookTimeoutSeconds,
  shouldRunJobRunHook,
  type JobRunHookEntry,
  type JobRunHookPhase,
  type JobRunHookRunKind,
  type JobRunHookTaskContext,
  type JobRunHookTaskOutcome,
  type RalphNestedRunTuningInput,
} from '@tools/workflows';
import type { RunPlanJobData } from '../plans/plans.types';
import { isRunPlanOrchestratorJobData } from '../plans/plans.types';
import type { PlanLifecycleHookJobResult } from './plan-lifecycle-hooks.types';

const hookFailed = (result: {
  readonly cancelled?: boolean;
  readonly errorMessage?: string;
  readonly ok: boolean;
}): boolean =>
  result.cancelled === true ||
  !result.ok ||
  (result.errorMessage !== undefined && result.errorMessage.trim() !== '');

const applyHookFailurePolicy = (
  phase: JobRunHookPhase,
  onFailure: ReturnType<typeof resolveJobRunHookOnFailure>,
  failed: boolean,
): { readonly blocked: boolean } => {
  if (!failed) {
    return { blocked: false };
  }
  if (onFailure === 'ignore' || onFailure === 'warn') {
    return { blocked: false };
  }
  if (
    (phase === 'beforeAll' || phase === 'beforeEach') &&
    onFailure === 'block'
  ) {
    return { blocked: true };
  }
  return { blocked: false };
};

const getWorkspaceRoot = (jobData: RunPlanJobData): string =>
  jobData.workingDirectory ?? process.env.WORKSPACE_ROOT ?? process.cwd();

const runKindFromJobData = (jobData: RunPlanJobData): JobRunHookRunKind =>
  isRunPlanOrchestratorJobData(jobData) ? 'orchestrator' : 'spawn';

const executionBackendFromJobData = (
  jobData: RunPlanJobData,
): WorkflowConfigRunner => {
  const merged = mergeRalphNestedRunTuningWithExecutionBackend(
    jobData.ralph,
    jobData.executionBackend,
  );

  return merged.backend ?? jobData.executionBackend ?? 'cursor';
};

export interface ExecuteSinglePlanLifecycleHookParams {
  readonly entry: JobRunHookEntry;
  readonly hookIndex: number;
  readonly jobData: RunPlanJobData;
  readonly logLabel: string;
  readonly logger: LoggerService;
  readonly mainRunStarted?: boolean;
  readonly mainRunSucceeded?: boolean;
  readonly phase: JobRunHookPhase;
  readonly planOutputStreamService: PlanOutputStreamService;
  readonly plansService: PlansService;
  readonly signal?: AbortSignal;
  readonly task?: JobRunHookTaskContext;
  readonly taskOutcome?: JobRunHookTaskOutcome;
  readonly tasksService: TasksService;
}

/**
 * @description Executes one hook entry and appends plan output lines (parity with in-process phase runner).
 */
export const executeSinglePlanLifecycleHook = async (
  params: ExecuteSinglePlanLifecycleHookParams,
): Promise<PlanLifecycleHookJobResult> => {
  const { entry, jobData, phase } = params;
  const planId = jobData.planId;
  const runKind = runKindFromJobData(jobData);

  const shouldRun = shouldRunJobRunHook(entry, {
    mainRunStarted: params.mainRunStarted ?? true,
    mainRunSucceeded: params.mainRunSucceeded ?? false,
    phase,
    runKind,
    task: params.task,
    taskOutcome: params.taskOutcome,
  });

  if (!shouldRun) {
    return { blocked: false, ok: true };
  }

  const planRepo = params.plansService.getRepository();
  const taskRepo = params.tasksService.getRepository();

  const [plan, tasks] = await Promise.all([
    planRepo.findOne({ where: { id: planId } }),
    taskRepo.find({
      order: { ...PLAN_TASK_LIST_ORDER },
      where: { planId },
    }),
  ]);

  if (!plan) {
    params.logger.warn(
      `Lifecycle hook skipped: plan not found planId=${planId}`,
      params.logLabel,
    );
    return { blocked: false, ok: true };
  }

  const planContextBlock = formatPlanAndTasksForPrompt(plan, tasks);
  const cwd = getWorkspaceRoot(jobData);
  const backend = executionBackendFromJobData(jobData);
  const ralph: RalphNestedRunTuningInput | undefined = jobData.ralph;
  const model = ralph?.model ?? undefined;
  const onFailure = resolveJobRunHookOnFailure(entry);
  const label = formatJobRunHookEntryLabel(entry);

  const appendPlanOutput = async (content: string): Promise<void> => {
    const outputRepo = params.planOutputStreamService.getRepository();
    const entity = outputRepo.create({
      content,
      iteration: null,
      planId,
    });
    await outputRepo.save(entity);
  };

  await appendPlanOutput(`[job-run-hook] Starting ${label}\n`);

  const layer1Text = resolveJobRunHookLayer1Prompt(entry, cwd);
  const layer1Suffix =
    phase === 'beforeAll' || phase === 'beforeEach'
      ? 'Complete configured preflight work for this hook phase.'
      : 'Complete configured post-run work for this hook phase.';

  const agentPrompt = buildJobRunHookAgentPrompt({
    entry,
    layer1Suffix,
    layer1Text,
    planContextBlock,
    planId,
    task: params.task,
    taskOutcome: params.taskOutcome,
  });

  const timeoutMs = resolveJobRunHookTimeoutSeconds(entry) * 1000;
  const iterationRunner = createCursorWorkflowRalphIterationRunner();

  let iterationResult: {
    readonly cancelled?: boolean;
    readonly errorMessage?: string;
    readonly ok: boolean;
    readonly output?: string;
  };

  try {
    const output = await iterationRunner.run({
      agentPrompt,
      iteration: params.hookIndex,
      model,
      runner: backend,
      signal: params.signal,
      timeoutMs,
    });
    iterationResult = { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (params.signal?.aborted === true) {
      iterationResult = { cancelled: true, errorMessage: message, ok: false };
    } else {
      iterationResult = { errorMessage: message, ok: false };
    }
  }

  const failed = hookFailed(iterationResult);
  const policy = applyHookFailurePolicy(phase, onFailure, failed);

  if (iterationResult.output?.trim()) {
    await appendPlanOutput(`${iterationResult.output.trim()}\n`);
  }

  if (failed) {
    const errLine =
      iterationResult.errorMessage ??
      (iterationResult.cancelled
        ? 'Hook iteration cancelled'
        : 'Hook iteration failed');
    await appendPlanOutput(
      `[job-run-hook] ${label} failed: ${errLine} (on_failure=${onFailure})\n`,
    );
  } else {
    await appendPlanOutput(`[job-run-hook] Finished ${label}\n`);
  }

  return { blocked: policy.blocked, ok: !failed };
};
