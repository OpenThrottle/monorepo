/**
 * @description Owns the run-config / workflow-ralph options editor state for the
 * plan detail route: the controlled workflow input, iteration timeout, working
 * directory and job-run-hook draft rows, every value derived from them
 * (serialized tuning/hooks JSON, validations, save-blocked reasons), the two
 * save fetchers with their pending/error flags, and the reset/save/expand
 * handlers. Hydrates from the plan's persisted `runConfigJson` / `jobRunHooksJson`
 * and revalidates the route after a successful save.
 *
 * Extracted verbatim from `routes/plans.$planId._index.tsx` so the route is a
 * thin shell that wires these outputs into the already-extracted PlanTabDetails
 * and PlanTabConfiguration panels. Behavior is unchanged.
 */
import * as React from 'react';
import { useFetcher, useRevalidator, useSearchParams } from 'react-router';
import { useActionToast } from '~/global/hooks/useActionToast';
import {
  buildRalphPlanRunTuningInputFromWorkflowRunOptions,
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
import {
  WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
  WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
} from '~/routing/plans/utils/workflow-run-options-search-param';

/**
 * @description Minimal plan shape the editor reads to seed initial state and
 * hydrate persisted config. Structurally satisfied by the route's loader plan.
 */
export interface PlanRunConfigEditorPlan {
  readonly id: string;
  readonly jobRunHooksJson?: string | null;
  readonly runConfigJson?: string | null;
}

export interface UsePlanRunConfigEditorResult {
  readonly jobRunHookRows: JobRunHookDraftRow[];
  readonly jobRunHooksJson: string;
  readonly jobRunHooksValidation: ReturnType<
    typeof validateJobRunHooksDraftRows
  >;
  readonly onResetToDefaults: () => void;
  readonly onSaveJobRunHooks: () => void;
  readonly onSaveRunConfig: () => void;
  readonly onToggleExpanded: (expanded: boolean) => void;
  readonly ralphTuningJson: string;
  readonly runConfigSaveBlocked: boolean;
  readonly runConfigSaveBlockedReason: string | undefined;
  readonly saveJobRunHooksError: string | undefined;
  readonly saveJobRunHooksPending: boolean;
  readonly saveRunConfigError: string | undefined;
  readonly saveRunConfigPending: boolean;
  readonly setJobRunHookRows: React.Dispatch<
    React.SetStateAction<JobRunHookDraftRow[]>
  >;
  readonly setWorkflowInput: React.Dispatch<
    React.SetStateAction<WorkflowRalphRunOptionsInput>
  >;
  readonly setWorkflowTimeout: React.Dispatch<React.SetStateAction<string>>;
  readonly setWorkingDirectory: React.Dispatch<React.SetStateAction<string>>;
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workflowTimeout: string;
  readonly workingDirectory: string;
}

export function usePlanRunConfigEditor(
  plan: PlanRunConfigEditorPlan | null,
): UsePlanRunConfigEditorResult {
  // Hooks
  const fetcherSaveJobRunHooks = useFetcher();
  const fetcherSaveRunConfig = useFetcher();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workflowTimeout, setWorkflowTimeout] = React.useState('');
  const [workingDirectory, setWorkingDirectory] = React.useState('');
  const [workflowInput, setWorkflowInput] =
    React.useState<WorkflowRalphRunOptionsInput>(() =>
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan?.id }),
    );
  const [jobRunHookRows, setJobRunHookRows] = React.useState<
    JobRunHookDraftRow[]
  >(() => jobRunHookEntriesToDraftRows([]));

  // Setup
  const ralphTuningJson = React.useMemo((): string => {
    const merged: WorkflowRalphRunOptionsInput = {
      ...workflowInput,
      iterationTimeoutSeconds:
        parseWorkflowRunIterationTimeoutSeconds(workflowTimeout),
    };

    const tuning = buildRalphPlanRunTuningInputFromWorkflowRunOptions(merged);

    return tuning === undefined ? '' : JSON.stringify(tuning);
  }, [workflowInput, workflowTimeout]);

  const jobRunHooksJson = React.useMemo((): string => {
    const validation = validateJobRunHooksDraftRows(jobRunHookRows);

    if (!validation.ok) {
      return '';
    }

    try {
      const entries = normalizeJobRunHookDraftRows(jobRunHookRows);
      return serializeJobRunHooksConfig(entries);
    } catch {
      return '';
    }
  }, [jobRunHookRows]);

  const jobRunHooksValidation = validateJobRunHooksDraftRows(jobRunHookRows);

  const workflowValidation = validateWorkflowRalphRunOptionsState(
    workflowInput,
    workflowTimeout,
    { requireCliTargetIds: true },
  );
  const workspacePathError = validateWorkspacePathClient(workingDirectory);
  const runConfigSaveBlocked =
    !workflowValidation.ok || workspacePathError != null;
  const runConfigSaveBlockedReason = !workflowValidation.ok
    ? workflowValidation.issues[0]?.message
    : workspacePathError;

  const runConfigJson = React.useMemo((): string => {
    if (runConfigSaveBlocked || plan?.id == null) {
      return '';
    }

    try {
      return serializePlanRunConfigUiState({
        iterationTimeoutText: workflowTimeout,
        workflowInput,
        workingDirectory,
      });
    } catch {
      return '';
    }
  }, [
    plan?.id,
    runConfigSaveBlocked,
    workflowInput,
    workflowTimeout,
    workingDirectory,
  ]);

  const saveJobRunHooksData = fetcherSaveJobRunHooks.data;
  const saveJobRunHooksError =
    saveJobRunHooksData != null &&
    typeof saveJobRunHooksData === 'object' &&
    'saveJobRunHooksError' in saveJobRunHooksData &&
    typeof saveJobRunHooksData.saveJobRunHooksError === 'string'
      ? saveJobRunHooksData.saveJobRunHooksError
      : undefined;

  const saveRunConfigData = fetcherSaveRunConfig.data;
  const saveRunConfigError =
    saveRunConfigData != null &&
    typeof saveRunConfigData === 'object' &&
    'saveRunConfigError' in saveRunConfigData &&
    typeof saveRunConfigData.saveRunConfigError === 'string'
      ? saveRunConfigData.saveRunConfigError
      : undefined;

  // Handlers
  const onResetToDefaults = (): void => {
    setWorkflowInput(
      getDefaultWorkflowRalphRunOptionsInput({ planId: plan?.id }),
    );

    setWorkingDirectory('');
    setWorkflowTimeout('');
  };

  const onSaveJobRunHooks = (): void => {
    if (!plan?.id || !jobRunHooksValidation.ok) {
      return;
    }

    const formData = new FormData();
    formData.set('intent', 'saveJobRunHooks');
    formData.set('jobRunHooksJson', jobRunHooksJson);
    void fetcherSaveJobRunHooks.submit(formData, { method: 'post' });
  };

  const onSaveRunConfig = (): void => {
    if (!plan?.id || runConfigSaveBlocked || runConfigJson === '') {
      return;
    }

    const formData = new FormData();
    formData.set('intent', 'saveRunConfig');
    formData.set('runConfigJson', runConfigJson);
    void fetcherSaveRunConfig.submit(formData, { method: 'post' });
  };

  const onToggleExpanded = (expanded: boolean): void => {
    const next = new URLSearchParams(searchParams);
    if (expanded) {
      next.set(
        WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
        WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
      );
    } else {
      next.delete(WORKFLOW_RUN_OPTIONS_SEARCH_PARAM);
    }

    setSearchParams(next, {
      preventScrollReset: true,
      replace: true,
    });
  };

  // Life Cycle
  React.useEffect(() => {
    if (!plan?.id) {
      return;
    }

    const hydrated = hydratePlanRunConfigUiState(plan.id, plan.runConfigJson);

    setWorkflowInput(hydrated.workflowInput);
    setWorkingDirectory(hydrated.workingDirectory);
    setWorkflowTimeout(hydrated.iterationTimeoutText);

    try {
      const entries = parseJobRunHooksJsonFromPlan(plan.jobRunHooksJson);
      setJobRunHookRows(jobRunHookEntriesToDraftRows(entries));
    } catch {
      setJobRunHookRows(jobRunHookEntriesToDraftRows([]));
    }
  }, [plan?.id, plan?.jobRunHooksJson, plan?.runConfigJson]);

  useActionToast(saveJobRunHooksData, {
    active: fetcherSaveJobRunHooks.state !== 'idle',
    error: () => saveJobRunHooksError,
    id: 'save-job-run-hooks',
    onSuccess: () => revalidator.revalidate(),
    success: 'Job run hooks saved.',
  });

  useActionToast(saveRunConfigData, {
    active: fetcherSaveRunConfig.state !== 'idle',
    error: () => saveRunConfigError,
    id: 'save-run-config',
    onSuccess: () => revalidator.revalidate(),
    success: 'Run configuration saved.',
  });

  // 🔌 Short Circuit
  return {
    jobRunHookRows,
    jobRunHooksJson,
    jobRunHooksValidation,
    onResetToDefaults,
    onSaveJobRunHooks,
    onSaveRunConfig,
    onToggleExpanded,
    ralphTuningJson,
    runConfigSaveBlocked,
    runConfigSaveBlockedReason,
    saveJobRunHooksError,
    saveJobRunHooksPending: fetcherSaveJobRunHooks.state !== 'idle',
    saveRunConfigError,
    saveRunConfigPending: fetcherSaveRunConfig.state !== 'idle',
    setJobRunHookRows,
    setWorkflowInput,
    setWorkflowTimeout,
    setWorkingDirectory,
    workflowInput,
    workflowTimeout,
    workingDirectory,
  };
}
