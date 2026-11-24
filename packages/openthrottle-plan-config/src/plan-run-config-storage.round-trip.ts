/**
 * @description Round-trip between Plan Configuration UI state and `plans.run_config`.
 */

import { getDefaultPlanRunConfigStorage } from './plan-run-config-storage.defaults.ts';
import type {
  PlanRunConfigOtLoop,
  PlanRunConfigStorage,
  PlanWorkflowRunOptions,
  PlanWorkflowUiState,
} from './plan-run-config-storage.types.ts';
import { parsePlanRunConfigStorage } from './plan-run-config-storage.validation.ts';

/**
 * @description Parses optional per-attempt timeout text (seconds); empty omits the timeout.
 */
export const parsePlanRunIterationTimeoutSeconds = (
  raw: string,
): number | undefined => {
  const t = raw.trim();
  if (t === '') {
    return undefined;
  }

  const n = Number.parseInt(t, 10);
  if (Number.isNaN(n) || n < 1) {
    return undefined;
  }

  return n;
};

/**
 * @description Maps Configuration tab state to persisted `run_config` for `plans.run_config`.
 */
export const planRunConfigFromWorkflowUiState = (
  ui: PlanWorkflowUiState,
): PlanRunConfigStorage => {
  const { workflowInput, iterationTimeoutText, workingDirectory } = ui;
  const defaults = getDefaultPlanRunConfigStorage({
    planId: workflowInput.planId,
    taskId: workflowInput.taskId,
  });
  const iterationTimeoutSeconds =
    parsePlanRunIterationTimeoutSeconds(iterationTimeoutText);

  const config: PlanRunConfigStorage = {
    ...defaults,
    ...(ui.containment !== undefined ? { containment: ui.containment } : {}),
    run: {
      ...ui.otLoop,
      debugCli: workflowInput.debugCli,
      driver: workflowInput.driver,
      effort: workflowInput.effort.trim(),
      ...(iterationTimeoutSeconds !== undefined
        ? { iterationTimeoutSeconds }
        : {}),
      model: workflowInput.model.trim(),
      worktreeCleanup: workflowInput.worktreeCleanup,
      worktreeName: workflowInput.worktreeName.trim(),
    },
    target: {
      mode: workflowInput.targetMode,
      taskId: workflowInput.taskId.trim(),
    },
    workspace: {
      checkoutId: (ui.checkoutId ?? '').trim(),
      repositoryId: (ui.repositoryId ?? '').trim(),
      workingDirectory: workingDirectory.trim(),
    },
  };

  return parsePlanRunConfigStorage(config);
};

/**
 * @description Picks the OT Loop validation fields out of a stored run block, or `undefined` when
 * none is set.
 */
export const pickPlanRunConfigOtLoop = (
  run: PlanRunConfigOtLoop,
): PlanRunConfigOtLoop | undefined => {
  const otLoop: PlanRunConfigOtLoop = {
    ...(run.finalValidationCommands !== undefined
      ? { finalValidationCommands: run.finalValidationCommands }
      : {}),
    ...(run.maxRetries !== undefined ? { maxRetries: run.maxRetries } : {}),
    ...(run.setupCommands !== undefined
      ? { setupCommands: run.setupCommands }
      : {}),
    ...(run.validationCommands !== undefined
      ? { validationCommands: run.validationCommands }
      : {}),
  };

  return Object.keys(otLoop).length === 0 ? undefined : otLoop;
};

/**
 * @description Hydrates Configuration tab state from stored `run_config`.
 * `planId` is authoritative for `workflowInput.planId`.
 */
export const workflowUiStateFromPlanRunConfig = (
  planId: string,
  stored: PlanRunConfigStorage,
  options?: { readonly taskId?: string },
): PlanWorkflowUiState => {
  const parsed = parsePlanRunConfigStorage(stored);
  const authoritativePlanId = planId.trim();
  const seedTaskId = options?.taskId?.trim() ?? parsed.target.taskId;
  const otLoop = pickPlanRunConfigOtLoop(parsed.run);

  const workflowInput: PlanWorkflowRunOptions = {
    debugCli: parsed.run.debugCli,
    driver: parsed.run.driver,
    effort: parsed.run.effort,
    model: parsed.run.model,
    planId: authoritativePlanId,
    targetMode: parsed.target.mode,
    taskId: parsed.target.mode === 'task' ? parsed.target.taskId : seedTaskId,
    worktreeCleanup: parsed.run.worktreeCleanup,
    worktreeName: parsed.run.worktreeName,
  };

  const { iterationTimeoutSeconds } = parsed.run;
  const hasTimeout = iterationTimeoutSeconds !== undefined;
  const iterationTimeoutText = hasTimeout
    ? String(iterationTimeoutSeconds)
    : '';

  return {
    checkoutId: parsed.workspace.checkoutId,
    ...(parsed.containment !== undefined
      ? { containment: parsed.containment }
      : {}),
    iterationTimeoutText,
    ...(otLoop !== undefined ? { otLoop } : {}),
    repositoryId: parsed.workspace.repositoryId,
    workflowInput,
    workingDirectory: parsed.workspace.workingDirectory,
  };
};
