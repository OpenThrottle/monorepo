/**
 * @description Client-side plan run configuration: parse, hydrate, and serialize for Plan Configuration tab.
 * Re-exports canonical helpers from the isomorphic `@openthrottle/openthrottle-plan-config` package.
 */

import {
  getDefaultPlanRunConfigStorage,
  planRunConfigFromPlanStorage,
  planRunConfigFromWorkflowUiState,
  serializePlanRunConfigForGraphql,
  workflowUiStateFromPlanRunConfig,
} from '@openthrottle/openthrottle-plan-config';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanRunConfigUiState {
  readonly checkoutId: string;
  readonly iterationTimeoutText: string;
  readonly repositoryId: string;
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
      checkoutId: ui.checkoutId ?? '',
      iterationTimeoutText: ui.iterationTimeoutText,
      repositoryId: ui.repositoryId ?? '',
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
      checkoutId: ui.checkoutId ?? '',
      iterationTimeoutText: ui.iterationTimeoutText,
      repositoryId: ui.repositoryId ?? '',
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
  const {
    checkoutId,
    iterationTimeoutText,
    repositoryId,
    workflowInput,
    workingDirectory,
  } = state;

  const stored = planRunConfigFromWorkflowUiState({
    checkoutId,
    iterationTimeoutText,
    repositoryId,
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
