import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  PlanDetailCriticalDocument,
  PlanDetailLedgerDocument,
  PlanDetailOutputChunksDocument,
  PlanDetailRunHistoryDocument,
  PlanDetailTagVocabularyDocument,
  PlanDetailWorkspaceRepositoriesDocument,
} from '~/__generated__/graphql';
import {
  addHook,
  addPlanTag,
  cancelPlanRun,
  detachHook,
  evaluatePlanRules,
  removePlanTag,
  runPlan,
  saveJobRunHooks,
  saveRunConfig,
  setPlanStatus,
  updateTaskStatus,
} from '~/routing/plans/actions/planId';
import { loadEnabledEditors } from '~/routing/plans/utils/load-enabled-editors';
import { PlanDetailRoute } from '~/routing/plans/components/PlanDetailRoute';
import { PlanRunConfigStoreProvider } from '~/routing/plans/components/PlanRunConfigStoreProvider';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/plans.$planId._index';
import {
  OpenThrottleClipboard,
  OpenThrottleEmptyState,
} from '@openthrottle/react-router-ui';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match.params.planId}
      text={match.params.planId ?? 'not-found'}
    />
  ),
  links: (_match) => [{ children: 'Plans', to: '/plans' }],
};

/**
 * @description Awaits ONE query — PlanDetailCritical (plan + tasksByPlanId) — and
 * returns every other key as a naked promise for RR8 Single Fetch to stream into
 * its own Suspense/Await region. Time-to-first-paint is therefore the cost of the
 * critical query alone, not of the slowest field on the page.
 *
 * Why: measured on the built server, `workspaceRepositories` costs ~1.3s cold
 * against ~10ms warm (its resolver re-inspects each checkout sequentially past a
 * 15-minute TTL), and it used to sit in the same round trip as the plan header.
 * The remaining deferred keys are cheap; they are deferred so that one failing
 * region degrades in place instead of 500-ing the whole plan page.
 *
 * 🚨 Standing rule: new fields default to DEFERRED. Only add to PlanDetailCritical
 * if the shell genuinely cannot render without it.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { planId } = args.params;

  // 🔌 Short circuit: same key set, deferred keys pre-resolved so the component's
  // Await boundaries stay type-uniform with the real branch.
  if (!planId) {
    return {
      enabledEditors: Promise.resolve([]),
      ledger: Promise.resolve({ linkedArtifacts: [], ruleApplications: [] }),
      outputChunks: Promise.resolve([]),
      plan: null,
      runHistory: Promise.resolve({ planRunAuditRows: [], recentPlanRuns: [] }),
      tagVocabulary: Promise.resolve([]),
      tasks: [],
      workspaceRepositories: Promise.resolve([]),
    };
  }

  // Every request is issued before the first await so nothing waterfalls. Each
  // deferred promise .then()s into exactly the shape its consumer wants, so no
  // component reaches into a query envelope.
  //
  // Deliberately NOT .catch()-ed: a rejection is the signal each region's
  // errorElement renders from, and swallowing it here would restore the old
  // behaviour where one bad field silently blanks its tab.
  const criticalPromise = executeGraphqlWithAuth(
    args.request,
    PlanDetailCriticalDocument,
    { planId },
  );

  // Editor deep links are a convenience, so they were already isolated with
  // their own catch (loadEnabledEditors degrades to []). Deferring it as well
  // keeps three toolbar buttons off the critical path entirely.
  const enabledEditors = loadEnabledEditors(args.request);

  const ledger = executeGraphqlWithAuth(
    args.request,
    PlanDetailLedgerDocument,
    { planId },
  ).then((result) => ({
    linkedArtifacts: result.workArtifactsByPlan.artifacts ?? [],
    ruleApplications: result.ruleApplications ?? [],
  }));

  const outputChunks = executeGraphqlWithAuth(
    args.request,
    PlanDetailOutputChunksDocument,
    { planId },
  ).then((result) => result.planOutputStreamChunks ?? []);

  const runHistory = executeGraphqlWithAuth(
    args.request,
    PlanDetailRunHistoryDocument,
    { planId },
  ).then((result) => ({
    planRunAuditRows: result.planRunsByPlanId ?? [],
    recentPlanRuns: result.metrics.recentPlanRunsMetrics ?? [],
  }));

  const tagVocabulary = executeGraphqlWithAuth(
    args.request,
    PlanDetailTagVocabularyDocument,
    {},
  ).then((result) => result.skillTagVocabulary.tags ?? []);

  const workspaceRepositories = executeGraphqlWithAuth(
    args.request,
    PlanDetailWorkspaceRepositoriesDocument,
    {},
  ).then((result) => result.workspaceRepositories ?? []);

  const critical = await criticalPromise;

  return {
    enabledEditors,
    ledger,
    outputChunks,
    plan: critical.plan ?? null,
    runHistory,
    tagVocabulary,
    tasks: critical.tasksByPlanId ?? [],
    workspaceRepositories,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const plan = args.loaderData?.plan;
  const title = plan?.title
    ? `${plan.title} | Plans | ${SITE_TITLE}`
    : `Plan | Plans | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData, params } = props;
  const { plan } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!plan) {
    return (
      <GlobalScreen>
        <OpenThrottleEmptyState
          description="The plan you are looking for does not exist."
          title="Plan not found"
        />
      </GlobalScreen>
    );
  }

  // Route-scoped Jotai store keyed on plan.id: run-config atoms reset on plan
  // navigation and are seeded once per mount from the plan's persisted config.
  // The body reads those atoms, so it must live inside the Provider (a component
  // cannot consume a Provider it renders in its own JSX).
  return (
    <PlanRunConfigStoreProvider
      key={plan.id}
      plan={plan}
      repositories={loaderData.workspaceRepositories}
    >
      <PlanDetailRoute loaderData={loaderData} params={params} plan={plan} />
    </PlanRunConfigStoreProvider>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const planId = args.params.planId;

  if (!planId) {
    return { runPlanError: 'Missing plan id.' };
  }

  const formData = await args.request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'addHook':
      return addHook(args, planId, formData);
    case 'addPlanTag':
      return addPlanTag(args, planId, formData);
    case 'cancelPlanRun':
      return cancelPlanRun(args, planId);
    case 'detachHook':
      return detachHook(args.request, formData);
    case 'evaluatePlanRules':
      return evaluatePlanRules(args, planId);
    case 'removePlanTag':
      return removePlanTag(args, planId, formData);
    case 'runPlan':
      return runPlan(args, planId, formData);
    case 'saveJobRunHooks':
      return saveJobRunHooks(args, planId, formData);
    case 'saveRunConfig':
      return saveRunConfig(args, planId, formData);
    case 'setPlanStatus':
      return setPlanStatus(args, planId, formData);
    case 'updateTaskStatus':
      return updateTaskStatus(args, planId, formData);
    default:
      // 🚨 Default to invalid action error when no intent is provided.
      throw new Error('Invalid intent');
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
