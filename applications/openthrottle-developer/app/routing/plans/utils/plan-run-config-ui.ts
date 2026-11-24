/**
 * @description Client-side plan run configuration: parse, hydrate, and serialize for Plan Configuration tab.
 * Re-exports canonical helpers from the isomorphic `@openthrottle/openthrottle-plan-config` package.
 */

import type {
  PlanRunConfigOtLoop,
  PlanWorkflowRunOptions,
} from '@openthrottle/openthrottle-plan-config';
import {
  getDefaultPlanRunConfigStorage,
  planRunConfigFromPlanStorage,
  planRunConfigFromWorkflowUiState,
  serializePlanRunConfigForGraphql,
  workflowUiStateFromPlanRunConfig,
} from '@openthrottle/openthrottle-plan-config';

import type { PlanRunOptions } from '~/routing/plans/utils/plan-run-options';

export interface PlanRunConfigUiState {
  readonly checkoutId: string;
  readonly iterationTimeoutText: string;
  /** @description Carried through hydrate and serialize so a UI save keeps it. */
  readonly otLoop?: PlanRunConfigOtLoop;
  readonly repositoryId: string;
  readonly workflowInput: PlanRunOptions;
  readonly workingDirectory: string;
}

/**
 * @description The Configuration tab does not edit the debug level, so a save writes the shared
 * default for it.
 */
const toStoredWorkflowInput = (
  input: PlanRunOptions,
): PlanWorkflowRunOptions => {
  const { run: defaults } = getDefaultPlanRunConfigStorage({
    planId: input.planId,
    taskId: input.taskId,
  });

  return {
    debugCli: defaults.debugCli,
    driver: input.driver,
    effort: input.effort,
    model: input.model,
    planId: input.planId,
    targetMode: input.targetMode,
    taskId: input.taskId,
    worktreeCleanup: input.worktreeCleanup,
    worktreeName: input.worktreeName,
  };
};

const toPlanRunOptions = (stored: PlanWorkflowRunOptions): PlanRunOptions => {
  return {
    driver: stored.driver,
    effort: stored.effort,
    iterationTimeoutSeconds: undefined,
    model: stored.model,
    planId: stored.planId,
    targetMode: stored.targetMode,
    taskId: stored.taskId,
    worktreeCleanup: stored.worktreeCleanup,
    worktreeName: stored.worktreeName,
  };
};

const parseSavedOrDefaultRunConfig = (
  runConfigJson: string | null | undefined,
  planId: string,
): unknown => {
  if (runConfigJson == null || runConfigJson.trim() === '') {
    return getDefaultPlanRunConfigStorage({ planId });
  }

  return JSON.parse(runConfigJson);
};

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
    const parsed = parseSavedOrDefaultRunConfig(runConfigJson, trimmedPlanId);

    const stored = planRunConfigFromPlanStorage(parsed, {
      planId: trimmedPlanId,
    });
    const ui = workflowUiStateFromPlanRunConfig(trimmedPlanId, stored);

    return {
      checkoutId: ui.checkoutId ?? '',
      iterationTimeoutText: ui.iterationTimeoutText,
      ...(ui.otLoop !== undefined ? { otLoop: ui.otLoop } : {}),
      repositoryId: ui.repositoryId ?? '',
      workflowInput: toPlanRunOptions(ui.workflowInput),
      workingDirectory: ui.workingDirectory,
    };
  } catch {
    const defaults = getDefaultPlanRunConfigStorage({ planId: trimmedPlanId });
    const ui = workflowUiStateFromPlanRunConfig(trimmedPlanId, defaults);

    return {
      checkoutId: ui.checkoutId ?? '',
      iterationTimeoutText: ui.iterationTimeoutText,
      repositoryId: ui.repositoryId ?? '',
      workflowInput: toPlanRunOptions(ui.workflowInput),
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
    otLoop,
    repositoryId,
    workflowInput,
    workingDirectory,
  } = state;

  const stored = planRunConfigFromWorkflowUiState({
    checkoutId,
    iterationTimeoutText,
    ...(otLoop !== undefined ? { otLoop } : {}),
    repositoryId,
    workflowInput: toStoredWorkflowInput(workflowInput),
    workingDirectory,
  });

  return serializePlanRunConfigForGraphql(stored, {
    planId: workflowInput.planId,
  });
};
