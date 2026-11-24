import { PLAN_TASK_LIST_ORDER } from '@openthrottle/nestjs-repositories-server';
import type {
  JobRunHookPhase,
  JobRunHookRunKind,
  PlanRunTuningSettings,
  WorkflowConfigRunner,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  buildJobRunHookAgentPrompt,
  formatJobRunHookEntryLabel,
  formatPlanAndTasksForPrompt,
  mergePlanRunTuningWithDriver,
  resolveJobRunHookLayer1Prompt,
  resolveJobRunHookOnFailure,
  resolveJobRunHookTimeoutSeconds,
  runJobRunHookAgent,
  shouldRunJobRunHook,
} from '@openthrottle/openthrottle-agentic-utils';

import type { RunPlanJobData } from '../plans/plans.types.ts';
import { isRunPlanOrchestratorJobData } from '../plans/plans.utils.ts';
import type { ExecuteSinglePlanLifecycleHookParams } from './plan-lifecycle-hooks.types.ts';
import type { PlanLifecycleHookJobResult } from './plan-lifecycle-hooks.types.ts';

const hookFailed = (result: {
  readonly cancelled?: boolean;
  readonly errorMessage?: string;
  readonly ok: boolean;
}): boolean => {
  return (
    result.cancelled === true ||
    !result.ok ||
    (result.errorMessage !== undefined && result.errorMessage.trim() !== '')
  );
};

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

const getWorkspaceRoot = (jobData: RunPlanJobData): string => {
  return (
    jobData.workingDirectory ?? process.env.WORKSPACE_ROOT ?? process.cwd()
  );
};

const runKindFromJobData = (jobData: RunPlanJobData): JobRunHookRunKind => {
  return isRunPlanOrchestratorJobData(jobData) ? 'orchestrator' : 'spawn';
};

const driverFromJobData = (jobData: RunPlanJobData): WorkflowConfigRunner => {
  const merged = mergePlanRunTuningWithDriver(jobData.tuning, jobData.driver);

  return merged.driver ?? jobData.driver ?? 'cursor';
};
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

  const [plan, tasks] = await Promise.all([
    params.plansRepository.findOne({ where: { id: planId } }),
    params.tasksRepository.findBy({
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
  const driver = driverFromJobData(jobData);
  const tuning: PlanRunTuningSettings | undefined = jobData.tuning;
  const model = tuning?.model ?? undefined;
  const onFailure = resolveJobRunHookOnFailure(entry);
  const label = formatJobRunHookEntryLabel(entry);

  const appendPlanOutput = async (content: string): Promise<void> => {
    await params.planOutputStreamRepository.create({
      content,
      iteration: null,
      planId,
    });
  };

  await appendPlanOutput(`[job-run-hook] Starting ${label}\n`);

  const layer1Text = resolveJobRunHookLayer1Prompt(entry, cwd);
  const isPreflightPhase = phase === 'beforeAll' || phase === 'beforeEach';
  const preflightSuffix = `Complete configured preflight work for this hook phase.`;
  const postRunSuffix = `Complete configured post-run work for this hook phase.`;
  const layer1Suffix = isPreflightPhase ? preflightSuffix : postRunSuffix;

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
  const agentResult = await runJobRunHookAgent({
    agentPrompt,
    driver,
    hookIndex: params.hookIndex,
    model,
    signal: params.signal,
    timeoutMs,
  });

  const failed = hookFailed(agentResult);
  const policy = applyHookFailurePolicy(phase, onFailure, failed);

  if (agentResult.output?.trim()) {
    await appendPlanOutput(`${agentResult.output.trim()}\n`);
  }

  if (failed) {
    const errLine =
      agentResult.errorMessage ??
      (agentResult.cancelled ? 'Hook agent cancelled' : 'Hook agent failed');
    await appendPlanOutput(
      `[job-run-hook] ${label} failed: ${errLine} (on_failure=${onFailure})\n`,
    );
  } else {
    await appendPlanOutput(`[job-run-hook] Finished ${label}\n`);
  }

  return { blocked: policy.blocked, ok: !failed };
};
