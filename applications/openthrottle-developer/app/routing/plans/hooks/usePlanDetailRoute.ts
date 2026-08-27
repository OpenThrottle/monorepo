/**
 * @description Route-level state for {@link PlanDetailRoute}: run-config atom
 * reads (seeded by {@link PlanRunConfigStoreProvider}), the tasks-view
 * URL/localStorage persistence effects, live plan-output streaming, lifecycle
 * revalidation, the Cmd/Ctrl+E edit shortcut, and the derived toolbar/tab
 * values. Extracted from the component per component-primitive-shape R7 so the
 * route body stays UI-focused.
 */
import * as React from 'react';
import { useKeyboardShortcut } from '@openthrottle/react-router-utils';
import { useAtomValue } from 'jotai';
import { useFetcher, useNavigate, useSearchParams } from 'react-router';
import { DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY } from '~/routing/plans/config/defaults';
import { isPlanStatusKey } from '~/routing/plans/components/PlanStatusBadge';
import { parsePlanTasksView } from '~/routing/plans/utils/parsers';
import { getResolvedTaskCount } from '~/routing/plans/utils/utils.plans';
import { usePlanDeferredValue } from '~/routing/plans/hooks/usePlanDeferredValue';
import { resolvePlanWorkingDirectory } from '~/routing/plans/utils/resolve-plan-working-directory';
import { usePlanOutputStream } from '~/routing/plans/hooks/usePlanOutputStream';
import { usePlanLifecycleRevalidation } from '~/routing/plans/hooks/usePlanLifecycleRevalidation';
import { usePlanRunConfigEditor } from '~/routing/plans/hooks/usePlanRunConfigEditor';
import {
  jobRunHooksJsonAtom,
  jobRunHooksValidationAtom,
  runConfigSaveBlockedAtom,
  runConfigSaveBlockedReasonAtom,
  workflowBranchAtom,
  workflowRalphTuningJsonAtom,
  workflowCheckoutIdAtom,
  workflowRepositoryIdAtom,
  workflowWorkingDirectoryAtom,
  workspaceRepositoriesReadyAtom,
} from '~/routing/plans/data/atom.plan';
import { PLAN_RUN_GATING_COPY } from '~/routing/plans/data/data.copy';
import type { PlanStatusKey } from '~/routing/plans/types';

import type { Route } from '@/app/routes/+types/plans.$planId._index';

export interface UsePlanDetailRouteOptions {
  readonly loaderData: Route.ComponentProps['loaderData'];
  readonly params: Route.ComponentProps['params'];
  readonly plan: NonNullable<Route.ComponentProps['loaderData']['plan']>;
}

export interface UsePlanDetailRouteResult {
  readonly branch: string;
  readonly checkoutId: string;
  readonly editorWorkingDirectory: string;
  readonly fullscreen: boolean;
  readonly isBoardView: boolean;
  readonly jobRunHooksJson: string;
  /**
   * `undefined` until the deferred run-history region resolves. The toolbar must
   * render no badge for `undefined` — "not stale" is a claim we cannot make while
   * the run history is still loading.
   */
  readonly newestRunIsStale: boolean | undefined;
  readonly onResetToDefaults: () => void;
  readonly onSaveJobRunHooks: () => void;
  readonly onSaveRunConfig: () => void;
  readonly onToggleExpanded: (expanded: boolean) => void;
  readonly planOutputChunks: ReturnType<typeof usePlanOutputStream>;
  readonly ralphTuningJson: string;
  readonly repositoryId: string;
  readonly resolvedTaskCount: number;
  readonly runConfigSaveBlocked: boolean;
  readonly runConfigSaveBlockedReason: string | undefined;
  readonly saveJobRunHooksDisabled: boolean;
  readonly saveJobRunHooksPending: boolean;
  readonly saveRunConfigPending: boolean;
  readonly setFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly status: PlanStatusKey;
  readonly tagFetcher: ReturnType<typeof useFetcher>;
  readonly workflowRunBlocked: boolean;
  readonly workflowRunBlockedReason: string | undefined;
  readonly workingDirectory: string;
}

export const usePlanDetailRoute = (
  options: UsePlanDetailRouteOptions,
): UsePlanDetailRouteResult => {
  const { loaderData, params, plan } = options;
  const { tasks } = loaderData;

  // Hooks
  // Run history is deferred, so the stale badge has three states, not two: absent
  // while loading, then stale or not. `usePlanDeferredValue` also keeps the last
  // resolved history across lifecycle revalidations so the badge does not blink.
  const runHistory = usePlanDeferredValue(loaderData.runHistory);

  // The newest run is first (planRunsByPlanId is newest-first); a stale newest run means the
  // active run is dead, so the toolbar shows a 'Stale' badge instead of an unusable Kill.
  const newestRunIsStale =
    runHistory === undefined
      ? undefined
      : (runHistory.planRunAuditRows[0]?.isStale ?? false);

  // The loader snapshot is deferred too, and is passed through as `undefined`
  // until it resolves. The subscription still starts at mount, so output written
  // during the load window is not lost; the snapshot is unioned in by chunk id
  // whenever it arrives (see usePlanOutputStream).
  const outputChunkSnapshot = usePlanDeferredValue(loaderData.outputChunks);

  // Editor deep links need an absolute path. Repositories are deferred, so until
  // they land this resolves from the run-config atom alone; the links themselves
  // sit behind their own boundary anyway.
  const resolvedRepositories = usePlanDeferredValue(
    loaderData.workspaceRepositories,
  );
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tagFetcher = useFetcher();
  const {
    onResetToDefaults,
    onSaveJobRunHooks,
    onSaveRunConfig,
    onToggleExpanded,
    saveJobRunHooksPending,
    saveRunConfigPending,
  } = usePlanRunConfigEditor(plan);

  // Route-scoped run-config atoms (seeded by PlanRunConfigStoreProvider).
  const jobRunHooksJson = useAtomValue(jobRunHooksJsonAtom);
  const jobRunHooksValidation = useAtomValue(jobRunHooksValidationAtom);
  const ralphTuningJson = useAtomValue(workflowRalphTuningJsonAtom);
  const runConfigSaveBlocked = useAtomValue(runConfigSaveBlockedAtom);
  const runConfigSaveBlockedReason = useAtomValue(
    runConfigSaveBlockedReasonAtom,
  );
  const workingDirectory = useAtomValue(workflowWorkingDirectoryAtom);
  const checkoutId = useAtomValue(workflowCheckoutIdAtom);
  const repositoryId = useAtomValue(workflowRepositoryIdAtom);
  const branch = useAtomValue(workflowBranchAtom);
  const workspaceRepositoriesReady = useAtomValue(
    workspaceRepositoriesReadyAtom,
  );

  // Setup
  const [fullscreen, setFullscreen] = React.useState(false);

  const planTasksView = parsePlanTasksView(searchParams.get('view')) ?? 'table';
  const isBoardView = planTasksView === 'board';

  const planId = params.planId ?? '';

  // Pilot: seed from the loader snapshot, then merge live deltas from the
  // planOutputChunkAdded subscription (graphql-ws). Socket.IO keeps running.
  const planOutputChunks = usePlanOutputStream(planId, outputChunkSnapshot);
  const status: PlanStatusKey = isPlanStatusKey(plan.status)
    ? plan.status
    : 'PENDING';

  // Resolved = COMPLETED or SKIPPED (skipped tasks are effectively done / won't
  // be worked on, e.g. promoted into their own plan), so both count toward the
  // Tasks-tab progress numerator.
  const resolvedTaskCount = getResolvedTaskCount(tasks);

  // Whether the page-level toolbar's Run/Queue is blocked. Reuses the config
  // editor's validation (workflow options + workspace path) and folds in the
  // job-run-hooks draft validity, matching the prior in-tab computation.
  const jobRunHooksBlocked = !jobRunHooksValidation.ok;
  const workflowRunBlocked =
    !workspaceRepositoriesReady || runConfigSaveBlocked || jobRunHooksBlocked;

  // 🚨 The resolving reason wins over the validation reasons while the workspace
  // is still loading. The config is not invalid then — it is merely incomplete —
  // and reporting a validation error on a page that is still loading reads as a
  // bug rather than as progress.
  const workflowRunBlockedReason = !workspaceRepositoriesReady
    ? PLAN_RUN_GATING_COPY.resolvingWorkspace
    : jobRunHooksBlocked
      ? (jobRunHooksValidation.issues[0] ??
        'Fix job run lifecycle hooks in Configuration.')
      : runConfigSaveBlockedReason;

  // Handlers

  // Markup

  // Life Cycle

  // When URL has no `view`, apply last choice from localStorage (board only adds a query param).
  // Runs when the plan changes so switching plans can restore the saved board preference without
  // re-applying on every search-param change (e.g. after the user clears `view` for table).
  React.useEffect(() => {
    if (parsePlanTasksView(searchParams.get('view'))) return;

    try {
      const stored = parsePlanTasksView(
        localStorage.getItem(DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY),
      );
      if (stored === 'board') {
        const next = new URLSearchParams(searchParams);
        next.set('view', 'board');
        setSearchParams(next, { replace: true });
      }
    } catch {
      // ignore
    }
  }, [planId]);

  // Keep storage in sync when `view` is present in the URL (e.g. shared links).
  React.useEffect(() => {
    const fromUrl = parsePlanTasksView(searchParams.get('view'));
    if (!fromUrl) return;

    try {
      localStorage.setItem(DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY, fromUrl);
    } catch {
      // ignore
    }
  }, [searchParams]);

  // Revalidate plan detail when a plan/task lifecycle notification arrives over
  // the GraphQL subscription (server-side topic routing by planId).
  usePlanLifecycleRevalidation(planId);

  // Cmd/Ctrl+E jumps to the plan edit route.
  useKeyboardShortcut({
    enabled: true,
    key: 'e',
    meta: true,
    onPress: () => navigate(`/plans/${planId}/edit`),
  });

  // 🔌 Short Circuit
  const editorWorkingDirectory = resolvePlanWorkingDirectory({
    checkoutId,
    repositories: resolvedRepositories ?? [],
    repositoryId,
    workingDirectory,
  });

  return {
    branch,
    checkoutId,
    editorWorkingDirectory,
    fullscreen,
    isBoardView,
    jobRunHooksJson,
    newestRunIsStale,
    onResetToDefaults,
    onSaveJobRunHooks,
    onSaveRunConfig,
    onToggleExpanded,
    planOutputChunks,
    ralphTuningJson,
    repositoryId,
    resolvedTaskCount,
    runConfigSaveBlocked,
    runConfigSaveBlockedReason,
    saveJobRunHooksDisabled: !jobRunHooksValidation.ok,
    saveJobRunHooksPending,
    saveRunConfigPending,
    setFullscreen,
    status,
    tagFetcher,
    workflowRunBlocked,
    workflowRunBlockedReason,
    workingDirectory,
  };
};
