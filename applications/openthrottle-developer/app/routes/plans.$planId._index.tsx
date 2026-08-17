import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { PlanDetailIndexLoaderDocument } from '~/__generated__/graphql';
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

export const loader = async (args: Route.LoaderArgs) => {
  const { planId } = args.params;

  if (!planId) {
    return {
      linkedArtifacts: [],
      plan: null,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      ruleApplications: [],
      tagVocabulary: [],
      tasks: [],
      workspaceRepositories: [],
    };
  }

  const page = await executeGraphqlWithAuth(
    args.request,
    PlanDetailIndexLoaderDocument,
    { planId },
  );

  return {
    linkedArtifacts: page.workArtifactsByPlan.artifacts ?? [],
    plan: page.plan ?? null,
    planOutputChunks: page.planOutputStreamChunks ?? [],
    planRunAuditRows: page.planRunsByPlanId ?? [],
    recentPlanRuns: page.metrics.recentPlanRunsMetrics ?? [],
    ruleApplications: page.ruleApplications ?? [],
    tagVocabulary: page.skillTagVocabulary.tags ?? [],
    tasks: page.tasksByPlanId ?? [],
    workspaceRepositories: page.workspaceRepositories ?? [],
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const plan = args.loaderData?.plan;
  const title = plan?.title
    ? `${plan.title} | Plans | ${SITE_TITLE}`
    : `Plan Details | ${SITE_TITLE}`;

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
