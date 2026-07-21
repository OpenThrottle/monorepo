/**
 * @description Run-config / workflow-ralph save actions for the plan detail route:
 * the two save fetchers (with pending flags + success/error toasts), reset-to-defaults,
 * and the expand/collapse handler. All form STATE lives in the route-scoped Jotai
 * atoms (`app/routing/plans/data/atom.plan.ts`); this hook reads the derived
 * serialize/validation atoms to gate and build the save payloads.
 *
 * Must be called inside {@link PlanRunConfigStoreProvider} so the atom reads resolve
 * against the route-scoped store. Previously this hook owned the duplicated useState
 * (workflowInput / iteration timeout / working directory / job-run hook rows) and the
 * derived memos; those now live in the atom module.
 */
import { useFetcher, useRevalidator, useSearchParams } from 'react-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useActionToast } from '~/global/hooks/useActionToast';
import {
  jobRunHooksJsonAtom,
  jobRunHooksValidationAtom,
  resetWorkflowRunToDefaultsAtom,
  runConfigJsonAtom,
  runConfigSaveBlockedAtom,
} from '~/routing/plans/data/atom.plan';
import {
  WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
  WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
} from '~/routing/plans/utils/workflow-run-options-search-param';

/**
 * @description Minimal plan shape the editor reads to gate + seed saves.
 * Structurally satisfied by the route's loader plan.
 */
export interface PlanRunConfigEditorPlan {
  readonly id: string;
  readonly jobRunHooksJson?: string | null;
  readonly runConfigJson?: string | null;
}

export interface UsePlanRunConfigEditorResult {
  readonly onResetToDefaults: () => void;
  readonly onSaveJobRunHooks: () => void;
  readonly onSaveRunConfig: () => void;
  readonly onToggleExpanded: (expanded: boolean) => void;
  readonly saveJobRunHooksPending: boolean;
  readonly saveRunConfigPending: boolean;
}

export function usePlanRunConfigEditor(
  plan: PlanRunConfigEditorPlan | null,
): UsePlanRunConfigEditorResult {
  // Hooks
  const fetcherSaveJobRunHooks = useFetcher();
  const fetcherSaveRunConfig = useFetcher();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();

  const jobRunHooksJson = useAtomValue(jobRunHooksJsonAtom);
  const jobRunHooksValidation = useAtomValue(jobRunHooksValidationAtom);
  const runConfigJson = useAtomValue(runConfigJsonAtom);
  const runConfigSaveBlocked = useAtomValue(runConfigSaveBlockedAtom);
  const resetWorkflowRunToDefaults = useSetAtom(resetWorkflowRunToDefaultsAtom);

  // Setup
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
    resetWorkflowRunToDefaults({ planId: plan?.id });
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
    onResetToDefaults,
    onSaveJobRunHooks,
    onSaveRunConfig,
    onToggleExpanded,
    saveJobRunHooksPending: fetcherSaveJobRunHooks.state !== 'idle',
    saveRunConfigPending: fetcherSaveRunConfig.state !== 'idle',
  };
}
