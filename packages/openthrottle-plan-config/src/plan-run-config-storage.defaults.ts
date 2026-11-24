import {
  DEFAULT_PLAN_RUN_DEBUG_CLI,
  DEFAULT_PLAN_RUN_DRIVER,
  DEFAULT_PLAN_RUN_EFFORT,
  DEFAULT_PLAN_RUN_MODEL,
  DEFAULT_PLAN_RUN_WORKTREE_CLEANUP,
  PLAN_RUN_CONFIG_VERSION,
} from './plan-run-config-storage.constants.ts';
import type {
  PlanRunConfigRunV1,
  PlanRunConfigStorage,
  PlanRunConfigTargetMode,
  PlanWorkflowRunOptions,
  PlanWorkflowUiState,
} from './plan-run-config-storage.types.ts';

/**
 * @description Default run block for v1 `run_config` (matches Configuration tab defaults).
 */
export const getDefaultPlanRunConfigRunV1 = (): PlanRunConfigRunV1 => {
  return {
    debugCli: DEFAULT_PLAN_RUN_DEBUG_CLI,
    driver: DEFAULT_PLAN_RUN_DRIVER,
    effort: DEFAULT_PLAN_RUN_EFFORT,
    model: DEFAULT_PLAN_RUN_MODEL,
    worktreeCleanup: DEFAULT_PLAN_RUN_WORKTREE_CLEANUP,
    // Blank name means "derive it at enqueue", not "no worktree".
    worktreeName: '',
  };
};

/**
 * @description Resolves target mode from the route's plan and task ids.
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
}): PlanRunConfigStorage => {
  return {
    run: getDefaultPlanRunConfigRunV1(),
    target: {
      mode: resolveDefaultTargetMode(options),
      taskId: options?.taskId?.trim() ?? '',
    },
    version: PLAN_RUN_CONFIG_VERSION,
    workspace: {
      checkoutId: '',
      repositoryId: '',
      workingDirectory: '',
    },
  };
};

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

  const workflowInput: PlanWorkflowRunOptions = {
    debugCli: DEFAULT_PLAN_RUN_DEBUG_CLI,
    driver: DEFAULT_PLAN_RUN_DRIVER,
    effort: DEFAULT_PLAN_RUN_EFFORT,
    model: DEFAULT_PLAN_RUN_MODEL,
    planId,
    targetMode,
    taskId,
    worktreeCleanup: DEFAULT_PLAN_RUN_WORKTREE_CLEANUP,
    worktreeName: '',
  };

  return {
    iterationTimeoutText: '',
    workflowInput,
    workingDirectory: '',
  };
};
