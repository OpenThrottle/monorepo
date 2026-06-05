/**
 * @description Client-side plan run configuration: parse, hydrate, and serialize for Plan Configuration tab.
 * Re-exports canonical helpers from `@openthrottle/nestjs-repositories` plan-run-config (monorepo source path).
 */

import {
  getDefaultPlanRunConfigStorage,
  planRunConfigFromPlanStorage,
  planRunConfigFromWorkflowUiState,
  serializePlanRunConfigForGraphql,
  workflowUiStateFromPlanRunConfig,
} from '../../../../../../packages/nestjs-repositories/src/modules/plans/plan-run-config/index.js';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanRunConfigUiState {
  readonly iterationTimeoutText: string;
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workingDirectory: string;
}

/**
 * @description Parses plan `runConfigJson` into Configuration tab state.
 * Falls back to defaults when JSON is missing or invalid.
 */
export const hydratePlanRunConfigUiState = (
  planId: string,
  runConfigJson: string | null | undefined,
): PlanRunConfigUiState => {
  const trimmedPlanId = planId.trim();

  try {
    const parsed: unknown =
      runConfigJson != null && runConfigJson.trim() !== ''
        ? JSON.parse(runConfigJson)
        : getDefaultPlanRunConfigStorage({ planId: trimmedPlanId });

    const stored = planRunConfigFromPlanStorage(parsed, {
      planId: trimmedPlanId,
    });
    const ui = workflowUiStateFromPlanRunConfig(trimmedPlanId, stored);

    return {
      iterationTimeoutText: ui.iterationTimeoutText,
      workflowInput: {
        ...ui.workflowInput,
        iterationTimeoutSeconds: undefined,
      },
      workingDirectory: ui.workingDirectory,
    };
  } catch {
    const defaults = getDefaultPlanRunConfigStorage({ planId: trimmedPlanId });
    const ui = workflowUiStateFromPlanRunConfig(trimmedPlanId, defaults);

    return {
      iterationTimeoutText: ui.iterationTimeoutText,
      workflowInput: {
        ...ui.workflowInput,
        iterationTimeoutSeconds: undefined,
      },
      workingDirectory: ui.workingDirectory,
    };
  }
};

/**
 * @description Serializes Configuration tab state for `updatePlan.runConfigJson`.
 * @throws Error when validation fails (mirrors server `parsePlanRunConfigJson`).
 */
export const serializePlanRunConfigUiState = (
  state: PlanRunConfigUiState,
): string => {
  const { iterationTimeoutText, workflowInput, workingDirectory } = state;

  const stored = planRunConfigFromWorkflowUiState({
    iterationTimeoutText,
    workflowInput: {
      debugCli: workflowInput.debugCli,
      executionBackend: workflowInput.executionBackend,
      iterations: workflowInput.iterations,
      model: workflowInput.model,
      planId: workflowInput.planId,
      project: workflowInput.project,
      prompt: workflowInput.prompt,
      promptFile: workflowInput.promptFile,
      promptLayer: workflowInput.promptLayer,
      skipWorktreeSetup: workflowInput.skipWorktreeSetup,
      targetMode: workflowInput.targetMode,
      taskId: workflowInput.taskId,
      worktreeBase: workflowInput.worktreeBase,
      worktreeCli: workflowInput.worktreeCli,
      worktreeName: workflowInput.worktreeName,
    },
    workingDirectory,
  });

  return serializePlanRunConfigForGraphql(stored, {
    planId: workflowInput.planId,
  });
};
