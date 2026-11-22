import {
  OpenThrottleClipboard,
  OpenThrottleEmptyState,
} from '@openthrottle/react-router-ui';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/plans.$planId._index';
import { SITE_TITLE } from '~/global/config/settings';
import {
  addHook,
  addPlanTag,
  cancelPlanRun,
  detachHook,
  evaluatePlanRules,
  forceSettlePlanRun,
  postPlanMessage,
  removePlanTag,
  reschedulePlanRun,
  runPlan,
  saveJobRunHooks,
  saveRunConfig,
  schedulePlanRun,
  setPlanStatus,
  updateTaskStatus,
  withdrawPlanMessage,
} from '~/routing/plans/actions/planId';
import { PlanDetailRoute } from '~/routing/plans/components/PlanDetailRoute';
import { PlanRunConfigStoreProvider } from '~/routing/plans/components/PlanRunConfigStoreProvider';
import { PlanDefaultAgentContext } from '~/routing/plans/config/PlanDefaultAgentContext';
import { loadPlanDetail } from '~/routing/plans/utils/loadPlanDetail.server';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="block max-w-full cursor-pointer truncate whitespace-nowrap sm:max-w-64"
      label={match.loaderData?.plan?.title ?? match.params.planId}
      text={match.params.planId ?? 'not-found'}
    />
  ),
  links: (_match) => [{ children: 'Plans', to: '/plans' }],
};

/**
 * @description Awaits only the critical query and streams every other key as a
 * deferred promise; see {@link loadPlanDetail}. New fields default to DEFERRED.
 */
export const loader = async (args: Route.LoaderArgs) => {
  return loadPlanDetail(args.request, args.params.planId);
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
      <PlanDefaultAgentContext.Provider value={loaderData.defaultAgent}>
        <PlanDetailRoute loaderData={loaderData} params={params} plan={plan} />
      </PlanDefaultAgentContext.Provider>
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
      return cancelPlanRun(args, planId, formData);
    case 'detachHook':
      return detachHook(args.request, formData);
    case 'evaluatePlanRules':
      return evaluatePlanRules(args, planId);
    case 'forceSettlePlanRun':
      return forceSettlePlanRun(args, formData);
    case 'postPlanMessage':
      return postPlanMessage(args, planId, formData);
    case 'removePlanTag':
      return removePlanTag(args, planId, formData);
    case 'reschedulePlanRun':
      return reschedulePlanRun(args, planId, formData);
    case 'runPlan':
      return runPlan(args, planId, formData);
    case 'saveJobRunHooks':
      return saveJobRunHooks(args, planId, formData);
    case 'saveRunConfig':
      return saveRunConfig(args, planId, formData);
    case 'schedulePlanRun':
      return schedulePlanRun(args, planId, formData);
    case 'setPlanStatus':
      return setPlanStatus(args, planId, formData);
    case 'updateTaskStatus':
      return updateTaskStatus(args, planId, formData);
    case 'withdrawPlanMessage':
      return withdrawPlanMessage(args, formData);
    default:
      // 🚨 Default to invalid action error when no intent is provided.
      throw new Error('Invalid intent');
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
