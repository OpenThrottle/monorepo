/**
 * @description Builds resolved enqueue snapshots from validated plan-run job data.
 */

import { PLAN_RUN_CONFIG_SNAPSHOT_VERSION } from './plan-run-config-snapshot.constants.ts';
import type {
  BuildPlanRunConfigSnapshotInput,
  PlanRunConfigSnapshot,
  PlanRunConfigSnapshotDebugCli,
} from './plan-run-config-snapshot.types.ts';

const trimOptionalString = (
  value: string | null | undefined,
): string | undefined => {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const normalizeDebugCli = (
  value: PlanRunConfigSnapshotDebugCli | null | undefined,
): PlanRunConfigSnapshotDebugCli | undefined => {
  if (value == null || value === 'omit') return undefined;
  return value;
};

/**
 * @description Builds {@link PlanRunConfigSnapshot} from validated enqueue job data.
 */
export const buildPlanRunConfigSnapshot = (
  input: BuildPlanRunConfigSnapshotInput,
): PlanRunConfigSnapshot => {
  const mode = input.mode ?? 'plan';
  const taskId =
    mode === 'task' ? (trimOptionalString(input.taskId) ?? '') : '';
  const workingDirectory = trimOptionalString(input.workingDirectory) ?? '';
  const checkoutId = trimOptionalString(input.checkoutId);
  const repositoryId = trimOptionalString(input.repositoryId);
  const tuningInput = input.tuning ?? null;

  const run = {
    ...(input.otLoop ?? {}),
    ...(normalizeDebugCli(tuningInput?.debug) !== undefined
      ? { debug: normalizeDebugCli(tuningInput?.debug) }
      : {}),
    driver: input.driver,
    ...(trimOptionalString(tuningInput?.effort) !== undefined
      ? { effort: trimOptionalString(tuningInput?.effort) }
      : {}),
    ...(tuningInput?.iterationTimeoutSeconds != null
      ? { iterationTimeoutSeconds: tuningInput.iterationTimeoutSeconds }
      : {}),
    ...(trimOptionalString(tuningInput?.model) !== undefined
      ? { model: trimOptionalString(tuningInput?.model) }
      : {}),
    ...(trimOptionalString(tuningInput?.worktreeName) !== undefined
      ? { worktreeName: trimOptionalString(tuningInput?.worktreeName) }
      : {}),
  };

  const hooks = input.jobRunHooks;
  const hasHooks =
    hooks != null && Array.isArray(hooks.hooks) && hooks.hooks.length > 0;

  return {
    ...(input.containment != null ? { containment: input.containment } : {}),
    ...(hasHooks ? { jobRunHooks: hooks } : {}),
    run,
    target: { mode, taskId },
    version: PLAN_RUN_CONFIG_SNAPSHOT_VERSION,
    workspace: {
      ...(checkoutId !== undefined ? { checkoutId } : {}),
      ...(repositoryId !== undefined ? { repositoryId } : {}),
      workingDirectory,
    },
  };
};
