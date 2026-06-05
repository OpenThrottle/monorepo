/**
 * @description Builds resolved enqueue snapshots from validated plan-run job data.
 */

import { DEFAULT_PLAN_RUN_RALPH_RUNNER } from './plan-run-config-storage.constants';
import { PLAN_RUN_CONFIG_SNAPSHOT_VERSION } from './plan-run-config-snapshot.constants';
import type {
  BuildPlanRunConfigSnapshotInput,
  PlanRunConfigSnapshot,
  PlanRunConfigSnapshotDebugCli,
} from './plan-run-config-snapshot.types';

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
  const ralphInput = input.ralph ?? null;

  const ralph = {
    executionBackend: input.executionBackend ?? DEFAULT_PLAN_RUN_RALPH_RUNNER,
    ...(normalizeDebugCli(ralphInput?.debug) !== undefined
      ? { debug: normalizeDebugCli(ralphInput?.debug) }
      : {}),
    ...(ralphInput?.iterationTimeoutSeconds != null
      ? { iterationTimeoutSeconds: ralphInput.iterationTimeoutSeconds }
      : {}),
    ...(ralphInput?.iterations != null
      ? { iterations: ralphInput.iterations }
      : {}),
    ...(trimOptionalString(ralphInput?.model) !== undefined
      ? { model: trimOptionalString(ralphInput?.model) }
      : {}),
    ...(trimOptionalString(ralphInput?.project) !== undefined
      ? { project: trimOptionalString(ralphInput?.project) }
      : {}),
    ...(trimOptionalString(ralphInput?.prompt) !== undefined
      ? { prompt: trimOptionalString(ralphInput?.prompt) }
      : {}),
    ...(trimOptionalString(ralphInput?.promptFile) !== undefined
      ? { promptFile: trimOptionalString(ralphInput?.promptFile) }
      : {}),
    ...(ralphInput?.skipWorktreeSetup === true
      ? { skipWorktreeSetup: true }
      : {}),
    ...(trimOptionalString(ralphInput?.worktree) !== undefined
      ? { worktree: trimOptionalString(ralphInput?.worktree) }
      : {}),
    ...(trimOptionalString(ralphInput?.worktreeBase) !== undefined
      ? { worktreeBase: trimOptionalString(ralphInput?.worktreeBase) }
      : {}),
  };

  const hooks = input.jobRunHooks;
  const hasHooks =
    hooks != null &&
    Array.isArray(hooks.hooks) &&
    hooks.hooks.length > 0;

  return {
    ...(hasHooks ? { jobRunHooks: hooks } : {}),
    ralph,
    target: { mode, taskId },
    version: PLAN_RUN_CONFIG_SNAPSHOT_VERSION,
    workspace: { workingDirectory },
  };
};
