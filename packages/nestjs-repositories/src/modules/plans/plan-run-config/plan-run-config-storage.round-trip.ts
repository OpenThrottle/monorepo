/**
 * @description Round-trip between Plan Configuration UI state and `plans.run_config`.
 */

import { getDefaultPlanRunConfigStorage } from './plan-run-config-storage.defaults';
import { parsePlanRunConfigStorage } from './plan-run-config-storage.validation';
import type {
  PlanRunConfigStorage,
  PlanWorkflowRalphRunOptions,
  PlanWorkflowUiState,
} from './plan-run-config-storage.types';

/**
 * @description Parses optional per-iteration timeout text (seconds); empty omits the CLI flag.
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

  const config: PlanRunConfigStorage = {
    ...defaults,
    ralph: {
      debugCli: workflowInput.debugCli,
      executionBackend: workflowInput.executionBackend,
      iterationTimeoutText: iterationTimeoutText.trim(),
      iterations: workflowInput.iterations,
      model: workflowInput.model.trim(),
      project: workflowInput.project.trim(),
      prompt: workflowInput.prompt.trim(),
      promptFile: workflowInput.promptFile.trim(),
      promptLayer: workflowInput.promptLayer,
      skipWorktreeSetup: workflowInput.skipWorktreeSetup,
      worktreeBase: workflowInput.worktreeBase.trim(),
      worktreeCli: workflowInput.worktreeCli,
      worktreeName: workflowInput.worktreeName.trim(),
    },
    target: {
      mode: workflowInput.targetMode,
      taskId: workflowInput.taskId.trim(),
    },
    workspace: {
      workingDirectory: workingDirectory.trim(),
    },
  };

  return parsePlanRunConfigStorage(config);
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

  const workflowInput: PlanWorkflowRalphRunOptions = {
    debugCli: parsed.ralph.debugCli,
    executionBackend: parsed.ralph.executionBackend,
    iterations: parsed.ralph.iterations,
    model: parsed.ralph.model,
    planId: authoritativePlanId,
    project: parsed.ralph.project,
    prompt: parsed.ralph.prompt,
    promptFile: parsed.ralph.promptFile,
    promptLayer: parsed.ralph.promptLayer,
    skipWorktreeSetup: parsed.ralph.skipWorktreeSetup,
    targetMode: parsed.target.mode,
    taskId: parsed.target.mode === 'task' ? parsed.target.taskId : seedTaskId,
    worktreeBase: parsed.ralph.worktreeBase,
    worktreeCli: parsed.ralph.worktreeCli,
    worktreeName: parsed.ralph.worktreeName,
  };

  return {
    iterationTimeoutText: parsed.ralph.iterationTimeoutText,
    workflowInput,
    workingDirectory: parsed.workspace.workingDirectory,
  };
};

/**
 * @description Maps stored Ralph UI fields to nested queue tuning (GraphQL `RalphPlanRunTuningInput` shape).
 * Omits keys that match CLI/worker defaults so enqueue can pass `undefined` ralph.
 */
export const buildRalphPlanRunTuningFromPlanRunConfig = (
  config: PlanRunConfigStorage,
): Record<string, string | number | boolean> | undefined => {
  const parsed = parsePlanRunConfigStorage(config);
  const { ralph } = parsed;
  const tuning: Record<string, string | number | boolean> = {};

  if (ralph.executionBackend !== 'cursor') {
    tuning.backend = ralph.executionBackend;
  }

  if (ralph.iterations !== 10) {
    tuning.iterations = ralph.iterations;
  }

  const timeout = parsePlanRunIterationTimeoutSeconds(
    ralph.iterationTimeoutText,
  );
  if (timeout != null) {
    tuning.iterationTimeoutSeconds = timeout;
  }

  const model = ralph.model.trim();
  if (model !== '' && model !== 'auto') {
    tuning.model = model;
  }

  const project = ralph.project.trim();
  if (project !== '') {
    tuning.project = project;
  }

  if (ralph.promptLayer === 'file') {
    const path = ralph.promptFile.trim();
    if (path !== '') {
      tuning.promptFile = path;
    }
  } else {
    const prompt = ralph.prompt.trim();
    if (prompt !== '' && prompt !== '/agents/ralph') {
      tuning.prompt = prompt;
    }
  }

  if (ralph.worktreeCli === 'named') {
    const name = ralph.worktreeName.trim();
    if (name !== '') {
      tuning.worktree = name;
    }
  }

  if (ralph.executionBackend === 'cursor') {
    const worktreeBase = ralph.worktreeBase.trim();
    if (worktreeBase !== '') {
      tuning.worktreeBase = worktreeBase;
    }

    if (ralph.skipWorktreeSetup) {
      tuning.skipWorktreeSetup = true;
    }
  }

  switch (ralph.debugCli) {
    case 'debug':
      tuning.ralphDebugCli = 'debug';
      break;

    case 'verbose':
      tuning.ralphDebugCli = 'verbose';
      break;

    case 'omit':
      break;
  }

  if (Object.keys(tuning).length === 0) {
    return undefined;
  }

  return tuning;
};
