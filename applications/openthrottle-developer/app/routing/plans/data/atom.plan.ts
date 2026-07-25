import { atom } from 'jotai';
import {
  buildRalphPlanRunTuningInputFromWorkflowRunOptions,
  buildWorkflowRalphOptionArgs,
  formatWorkflowRalphCommandLine,
  getDefaultWorkflowRalphRunOptionsInput,
  parseWorkflowRunIterationTimeoutSeconds,
  validateWorkflowRalphRunOptionsState,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  jobRunHookEntriesToDraftRows,
  normalizeJobRunHookDraftRows,
  parseJobRunHooksJsonFromPlan,
  serializeJobRunHooksConfig,
  validateJobRunHooksDraftRows,
  type JobRunHookDraftRow,
} from '~/routing/plans/utils/job-run-hooks-ui';
import {
  hydratePlanRunConfigUiState,
  serializePlanRunConfigUiState,
} from '~/routing/plans/utils/plan-run-config-ui';
import { validateWorkspacePathClient } from '~/routing/plans/utils/workspace-path';

/**
 * @description Default workflow run form state: {@link WorkflowRalphRunOptionsInput}
 * plus the raw `--iteration-timeout` text field (parsed for argv / GraphQL).
 */
export interface WorkflowRunAtomDefaultState {
  readonly iterationTimeoutText: string;
  readonly runOptions: WorkflowRalphRunOptionsInput;
}

/**
 * @description Builds default atom state; aligns with uncontrolled workflow
 * config initialization and reset-to-defaults.
 */
export const getWorkflowRunAtomDefaultState = (options?: {
  readonly planId?: string;
  readonly taskId?: string;
}): WorkflowRunAtomDefaultState => ({
  iterationTimeoutText: '',
  runOptions: getDefaultWorkflowRalphRunOptionsInput(options),
});

/**
 * @description Primary workflow CLI / enqueue form state (route-scoped Jotai
 * Provider seeds/hydrates this per plan; see {@link seedWorkflowRunFromPlanAtom}).
 */
export const workflowRalphRunOptionsAtom = atom<WorkflowRalphRunOptionsInput>(
  getDefaultWorkflowRalphRunOptionsInput(),
);

/**
 * @description Raw per-iteration timeout text; {@link parseWorkflowRunIterationTimeoutSeconds} merges into argv.
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
 * @description Job-run lifecycle hook draft rows (editable form state); serialized
 * into `jobRunHooksJson` for save + enqueue via {@link jobRunHooksJsonAtom}.
 */
export const jobRunHookDraftRowsAtom = atom<JobRunHookDraftRow[]>([]);

/**
 * @description Merges stored run options with parsed iteration timeout for argv and tuning payloads.
 */
export const workflowRalphMergedRunOptionsForArgvAtom = atom(
  (get): WorkflowRalphRunOptionsInput => {
    const runOptions = get(workflowRalphRunOptionsAtom);
    const iterationTimeoutText = get(workflowRunIterationTimeoutTextAtom);

    return {
      ...runOptions,
      iterationTimeoutSeconds:
        parseWorkflowRunIterationTimeoutSeconds(iterationTimeoutText),
    };
  },
);

/**
 * @description `workflow-ralph` argv segments after the binary (same as {@link buildWorkflowRalphOptionArgs} on merged state).
 */
export const workflowRalphOptionArgsAtom = atom((get) =>
  buildWorkflowRalphOptionArgs(get(workflowRalphMergedRunOptionsForArgvAtom)),
);

/**
 * @description Single-line preview / clipboard string for the canonical CLI invocation.
 */
export const workflowRalphCanonicalCommandLineAtom = atom((get) =>
  formatWorkflowRalphCommandLine(get(workflowRalphOptionArgsAtom)),
);

/**
 * @description Serialized `RalphPlanRunTuningInput` (tuning-only) for the toolbar
 * queue; empty string when the merged options equal defaults. Mirrors the shell's
 * former `ralphTuningJson` memo.
 */
export const workflowRalphTuningJsonAtom = atom((get): string => {
  const merged = get(workflowRalphMergedRunOptionsForArgvAtom);
  const tuning = buildRalphPlanRunTuningInputFromWorkflowRunOptions(merged);

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
 * @description Workflow run options validity. `requireCliTargetIds` is derived from
 * the presence of a seeded `--plan` / `--task` id (always true on the plan route),
 * matching the shell's route-scoped validation.
 */
export const workflowRalphRunOptionsValidationAtom = atom(
  (get): ReturnType<typeof validateWorkflowRalphRunOptionsState> => {
    const runOptions = get(workflowRalphRunOptionsAtom);
    const iterationTimeoutText = get(workflowRunIterationTimeoutTextAtom);
    const requireCliTargetIds =
      (runOptions.planId?.trim() ?? '') !== '' ||
      (runOptions.taskId?.trim() ?? '') !== '';

    return validateWorkflowRalphRunOptionsState(
      runOptions,
      iterationTimeoutText,
      { requireCliTargetIds },
    );
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
  const validation = get(workflowRalphRunOptionsValidationAtom);
  const workspacePathError = get(workflowWorkspacePathErrorAtom);

  return !validation.ok || workspacePathError != null;
});

/**
 * @description First blocking reason for a disabled run-config save, or undefined.
 */
export const runConfigSaveBlockedReasonAtom = atom(
  (get): string | undefined => {
    const validation = get(workflowRalphRunOptionsValidationAtom);
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
  const runOptions = get(workflowRalphRunOptionsAtom);

  if (
    get(runConfigSaveBlockedAtom) ||
    (runOptions.planId?.trim() ?? '') === ''
  ) {
    return '';
  }

  try {
    return serializePlanRunConfigUiState({
      checkoutId: get(workflowCheckoutIdAtom),
      iterationTimeoutText: get(workflowRunIterationTimeoutTextAtom),
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

    set(workflowRalphRunOptionsAtom, defaults.runOptions);
    set(workflowRunIterationTimeoutTextAtom, defaults.iterationTimeoutText);
    set(workflowWorkingDirectoryAtom, '');
    set(workflowCheckoutIdAtom, '');
    set(workflowRepositoryIdAtom, '');
  },
);

/**
 * @description Minimal plan shape the seed reads (satisfied by the route loader plan).
 */
export interface WorkflowRunSeedPlan {
  readonly id: string;
  readonly jobRunHooksJson?: string | null;
  readonly runConfigJson?: string | null;
}

/**
 * @description Initial values for the four run-config primitives, derived from a
 * plan's persisted `runConfigJson` / `jobRunHooksJson`. Consumed by the route-scoped
 * Provider's `useHydrateAtoms` seed (once per plan mount), replacing the shell's
 * former re-seed effect. Single source of truth for seeding.
 */
export interface WorkflowRunSeedValues {
  readonly checkoutId: string;
  readonly iterationTimeoutText: string;
  readonly jobRunHookRows: JobRunHookDraftRow[];
  readonly repositoryId: string;
  readonly runOptions: WorkflowRalphRunOptionsInput;
  readonly workingDirectory: string;
}

/**
 * @description Builds {@link WorkflowRunSeedValues} from a plan; invalid
 * `jobRunHooksJson` falls back to an empty hook list (matches prior hydrate).
 */
export const getWorkflowRunSeedValues = (
  plan: WorkflowRunSeedPlan,
): WorkflowRunSeedValues => {
  const hydrated = hydratePlanRunConfigUiState(plan.id, plan.runConfigJson);

  let jobRunHookRows: JobRunHookDraftRow[];
  try {
    jobRunHookRows = jobRunHookEntriesToDraftRows(
      parseJobRunHooksJsonFromPlan(plan.jobRunHooksJson),
    );
  } catch {
    jobRunHookRows = jobRunHookEntriesToDraftRows([]);
  }

  return {
    checkoutId: hydrated.checkoutId,
    iterationTimeoutText: hydrated.iterationTimeoutText,
    jobRunHookRows,
    repositoryId: hydrated.repositoryId,
    runOptions: hydrated.workflowInput,
    workingDirectory: hydrated.workingDirectory,
  };
};
