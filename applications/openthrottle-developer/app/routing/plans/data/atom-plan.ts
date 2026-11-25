import type { PlanRunConfigOtLoop } from '@openthrottle/openthrottle-plan-config';
import { atom } from 'jotai';

import { buildPlanRunTuningInput } from '~/routing/plans/utils/buildPlanRunTuningInput';
import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';
import {
  normalizeJobRunHookDraftRows,
  serializeJobRunHooksConfig,
  validateJobRunHooksDraftRows,
} from '~/routing/plans/utils/job-run-hooks-ui';
import { serializePlanRunConfigUiState } from '~/routing/plans/utils/plan-run-config-ui';
import type { PlanRunOptions } from '~/routing/plans/utils/plan-run-options';
import {
  getDefaultPlanRunOptions,
  parsePlanRunTimeoutSeconds,
} from '~/routing/plans/utils/plan-run-options';
import { validatePlanRunOptionsState } from '~/routing/plans/utils/validatePlanRunOptionsState';
import { getWorkflowRunAtomDefaultState } from '~/routing/plans/utils/workflow-run-atom-state';
import { validateWorkspacePathClient } from '~/routing/plans/utils/workspace-path';

/**
 * @description Primary run-options / enqueue form state (route-scoped Jotai
 * Provider seeds/hydrates this per plan).
 */
export const workflowRunOptionsAtom = atom<PlanRunOptions>(
  getDefaultPlanRunOptions(),
);

/**
 * @description The plan's `runConfigJson.run` OT Loop fields (validation commands, retries and
 * the repo-file-only overrides).
 */
export const workflowOtLoopAtom = atom<PlanRunConfigOtLoop | undefined>(
  undefined,
);

/**
 * @description Raw agent-timeout text; {@link parsePlanRunTimeoutSeconds} parses it into the tuning input.
 */
export const workflowRunIterationTimeoutTextAtom = atom<string>('');

/**
 * @description Absolute workspace path for multi-workspace runs (empty = monorepo
 * root). Serialized into `runConfigJson` and passed to the enqueue mutation.
 */
export const workflowWorkingDirectoryAtom = atom<string>('');

/**
 * @description Selected registered checkout id (empty = none). Highest-precedence
 * workspace reference: resolved server-side to a filesystem path at enqueue,
 * ahead of {@link workflowRepositoryIdAtom} and {@link workflowWorkingDirectoryAtom}.
 */
export const workflowCheckoutIdAtom = atom<string>('');

/**
 * @description Selected registered repository id (empty = none). Resolved to the
 * enqueuing user's single checkout of that repository when no explicit checkout is set.
 */
export const workflowRepositoryIdAtom = atom<string>('');

/**
 * @description Git branch this run operates on — a REQUIRED kickoff input passed
 * explicitly to the enqueue mutation (never inferred server-side). Transient per
 * run (NOT serialized into `runConfigJson`, unlike the workspace atoms); the
 * workspace selector pre-fills it from the selected checkout's current branch.
 */
export const workflowBranchAtom = atom<string>('');

/**
 * @description Whether the user has edited the run branch by hand.
 *
 * The provider seeds a branch before `workspaceRepositories` has resolved, and
 * {@link PlanRunConfigRepositoriesHydrator} re-resolves it once they land. This
 * flag is what makes back-filling over a branch the user typed *impossible*
 * rather than merely unlikely: the hydrator writes only while this is false.
 */
export const workflowBranchDirtyAtom = atom<boolean>(false);

/**
 * @description Writes the run branch as a *user edit*: sets the branch and marks
 * it dirty in one action. Pairing them here means a caller cannot set the branch
 * on the user's behalf without also pinning it, which is what stops
 * {@link PlanRunConfigRepositoriesHydrator} from later overwriting it.
 */
export const setWorkflowBranchByUserAtom = atom(
  null,
  (_get, set, branch: string) => {
    set(workflowBranchAtom, branch);
    set(workflowBranchDirtyAtom, true);
  },
);

/**
 * @description Whether the deferred `workspaceRepositories` promise has resolved.
 *
 * False means "still loading", not "no repositories". Run/Queue is disabled with
 * a *resolving* reason while it is false — never a validation error, which on a
 * page that is still loading reads as a bug rather than as progress.
 */
export const workspaceRepositoriesReadyAtom = atom<boolean>(false);

/**
 * @description Job-run lifecycle hook draft rows (editable form state); serialized
 * into `jobRunHooksJson` for save + enqueue via {@link jobRunHooksJsonAtom}.
 */
export const jobRunHookDraftRowsAtom = atom<JobRunHookDraftRow[]>([]);

/**
 * @description Merges stored run options with the parsed agent timeout for the tuning payload.
 */
export const workflowMergedRunOptionsAtom = atom((get): PlanRunOptions => {
  const runOptions = get(workflowRunOptionsAtom);
  const iterationTimeoutText = get(workflowRunIterationTimeoutTextAtom);

  return {
    ...runOptions,
    iterationTimeoutSeconds: parsePlanRunTimeoutSeconds(iterationTimeoutText),
  };
});

/**
 * @description Serialized tuning input for the toolbar queue; empty string when the merged
 * options equal the defaults.
 */
export const workflowRunTuningJsonAtom = atom((get): string => {
  const merged = get(workflowMergedRunOptionsAtom);
  const tuning = buildPlanRunTuningInput(merged);

  return tuning === undefined ? '' : JSON.stringify(tuning);
});

/**
 * @description Draft-row validity for the job-run hooks editor (issues + ok).
 */
export const jobRunHooksValidationAtom = atom((get) =>
  validateJobRunHooksDraftRows(get(jobRunHookDraftRowsAtom)),
);

/**
 * @description Serialized `{ hooks: [...] }` for save + enqueue; empty string when
 * the draft rows are invalid. Mirrors the shell's former `jobRunHooksJson` memo.
 */
export const jobRunHooksJsonAtom = atom((get): string => {
  const rows = get(jobRunHookDraftRowsAtom);

  if (!get(jobRunHooksValidationAtom).ok) {
    return '';
  }

  try {
    return serializeJobRunHooksConfig(normalizeJobRunHookDraftRows(rows));
  } catch {
    return '';
  }
});

/**
 * @description Workflow run options validity. `requireTargetIds` is derived from
 * the presence of a seeded plan / task id (always true on the plan route),
 * matching the shell's route-scoped validation.
 */
export const workflowRunOptionsValidationAtom = atom(
  (get): ReturnType<typeof validatePlanRunOptionsState> => {
    const runOptions = get(workflowRunOptionsAtom);
    const iterationTimeoutText = get(workflowRunIterationTimeoutTextAtom);
    const requireTargetIds =
      (runOptions.planId?.trim() ?? '') !== '' ||
      (runOptions.taskId?.trim() ?? '') !== '';

    return validatePlanRunOptionsState(runOptions, iterationTimeoutText, {
      requireTargetIds,
    });
  },
);

/**
 * @description Client-side workspace path error (undefined when plausible).
 */
export const workflowWorkspacePathErrorAtom = atom((get): string | undefined =>
  validateWorkspacePathClient(get(workflowWorkingDirectoryAtom)),
);

/**
 * @description Whether saving the run configuration is blocked (invalid workflow
 * options or workspace path). Mirrors the shell's former `runConfigSaveBlocked`.
 */
export const runConfigSaveBlockedAtom = atom((get): boolean => {
  const validation = get(workflowRunOptionsValidationAtom);
  const workspacePathError = get(workflowWorkspacePathErrorAtom);

  return !validation.ok || workspacePathError != null;
});

/**
 * @description First blocking reason for a disabled run-config save, or undefined.
 */
export const runConfigSaveBlockedReasonAtom = atom(
  (get): string | undefined => {
    const validation = get(workflowRunOptionsValidationAtom);
    if (!validation.ok) {
      return validation.issues[0]?.message;
    }

    return get(workflowWorkspacePathErrorAtom) ?? undefined;
  },
);

/**
 * @description Serialized `runConfigJson` for `updatePlan`; empty string when the
 * save is blocked or no plan id is seeded. Mirrors the shell's former
 * `runConfigJson` memo (which guarded on `plan.id`; here planId lives in runOptions).
 */
export const runConfigJsonAtom = atom((get): string => {
  const runOptions = get(workflowRunOptionsAtom);

  if (
    get(runConfigSaveBlockedAtom) ||
    (runOptions.planId?.trim() ?? '') === ''
  ) {
    return '';
  }

  const otLoop = get(workflowOtLoopAtom);

  try {
    return serializePlanRunConfigUiState({
      checkoutId: get(workflowCheckoutIdAtom),
      iterationTimeoutText: get(workflowRunIterationTimeoutTextAtom),
      ...(otLoop !== undefined ? { otLoop } : {}),
      repositoryId: get(workflowRepositoryIdAtom),
      workflowInput: runOptions,
      workingDirectory: get(workflowWorkingDirectoryAtom),
    });
  } catch {
    return '';
  }
});

/**
 * @description Resets the run-options primitives to {@link getWorkflowRunAtomDefaultState}
 * (optional plan/task seed) and clears the workspace path. Job-run hook rows are
 * intentionally left untouched, matching the shell's former reset-to-defaults.
 */
export const resetWorkflowRunToDefaultsAtom = atom(
  null,
  (
    _get,
    set,
    seed: { readonly planId?: string; readonly taskId?: string } | undefined,
  ) => {
    const defaults = getWorkflowRunAtomDefaultState(seed);

    set(workflowRunOptionsAtom, defaults.runOptions);
    set(workflowRunIterationTimeoutTextAtom, defaults.iterationTimeoutText);
    set(workflowWorkingDirectoryAtom, '');
    set(workflowCheckoutIdAtom, '');
    set(workflowRepositoryIdAtom, '');
    set(workflowOtLoopAtom, undefined);
    set(workflowBranchAtom, '');
    // Reset makes the branch pristine again, so a later hydration may fill it.
    set(workflowBranchDirtyAtom, false);
  },
);
