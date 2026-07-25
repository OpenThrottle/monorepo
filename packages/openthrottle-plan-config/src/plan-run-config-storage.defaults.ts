import {
  DEFAULT_PLAN_RUN_RALPH_ITERATIONS,
  DEFAULT_PLAN_RUN_RALPH_MODEL,
  DEFAULT_PLAN_RUN_RALPH_PROMPT,
  DEFAULT_PLAN_RUN_RALPH_RUNNER,
  PLAN_RUN_CONFIG_VERSION,
} from './plan-run-config-storage.constants';
import type {
  PlanRunConfigRalphV1,
  PlanRunConfigStorage,
  PlanRunConfigTargetMode,
  PlanWorkflowRalphRunOptions,
  PlanWorkflowUiState,
} from './plan-run-config-storage.types';

/**
 * @description Default Ralph subsection for v1 `run_config` (matches Configuration tab defaults).
 */
export const getDefaultPlanRunConfigRalphV1 = (): PlanRunConfigRalphV1 => ({
  debugCli: 'omit',
  executionBackend: DEFAULT_PLAN_RUN_RALPH_RUNNER,
  iterationTimeoutText: '',
  iterations: DEFAULT_PLAN_RUN_RALPH_ITERATIONS,
  model: DEFAULT_PLAN_RUN_RALPH_MODEL,
  project: '',
  prompt: DEFAULT_PLAN_RUN_RALPH_PROMPT,
  promptFile: '',
  promptLayer: 'named',
  skipWorktreeSetup: false,
  worktreeBase: '',
  worktreeCli: 'omit',
  worktreeName: '',
});

/**
 * @description Resolves target mode the same way as `getDefaultWorkflowRalphRunOptionsInput`.
 */
const resolveDefaultTargetMode = (options?: {
  readonly planId?: string;
  readonly taskId?: string;
}): PlanRunConfigTargetMode => {
  const planId = options?.planId?.trim() ?? '';
  const taskId = options?.taskId?.trim() ?? '';
  return taskId !== '' && planId === '' ? 'task' : 'plan';
};

/**
 * @description Empty v1 shell for new plans / GraphQL reset (`{"version":1,...}`).
 */
export const getDefaultPlanRunConfigStorage = (options?: {
  readonly planId?: string;
  readonly taskId?: string;
}): PlanRunConfigStorage => ({
  ralph: getDefaultPlanRunConfigRalphV1(),
  target: {
    mode: resolveDefaultTargetMode(options),
    taskId: options?.taskId?.trim() ?? '',
  },
  version: PLAN_RUN_CONFIG_VERSION,
  workspace: {
    workingDirectory: '',
  },
});

/**
 * @description Default Plan Configuration UI state for a plan route.
 */
export const getDefaultPlanWorkflowUiState = (options?: {
  readonly planId?: string;
  readonly taskId?: string;
}): PlanWorkflowUiState => {
  const planId = options?.planId?.trim() ?? '';
  const taskId = options?.taskId?.trim() ?? '';
  const targetMode = resolveDefaultTargetMode({ planId, taskId });

  const workflowInput: PlanWorkflowRalphRunOptions = {
    debugCli: 'omit',
    executionBackend: DEFAULT_PLAN_RUN_RALPH_RUNNER,
    iterations: DEFAULT_PLAN_RUN_RALPH_ITERATIONS,
    model: DEFAULT_PLAN_RUN_RALPH_MODEL,
    planId,
    project: '',
    prompt: DEFAULT_PLAN_RUN_RALPH_PROMPT,
    promptFile: '',
    promptLayer: 'named',
    skipWorktreeSetup: false,
    targetMode,
    taskId,
    worktreeBase: '',
    worktreeCli: 'omit',
    worktreeName: '',
  };

  return {
    iterationTimeoutText: '',
    workflowInput,
    workingDirectory: '',
  };
};
