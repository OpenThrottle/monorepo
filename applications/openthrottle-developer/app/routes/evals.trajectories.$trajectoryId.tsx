import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  FEATURE_DELTA_PREVIEW,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/evals.trajectories.$trajectoryId';
import {
  EvalsTrajectoryViewerDocument,
  EvalsTrajectoryViewerPlanDocument,
  EvalsTrajectoryViewerScoringDocument,
  EvalsTrajectoryViewerTaskDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { handleTrajectoryLabelAction } from '~/routing/evals/actions/trajectoryId';
import { TrajectoryViewerRoute } from '~/routing/evals/components/TrajectoryViewerRoute';
import {
  EVAL_RUNS_COPY,
  EVAL_TRAJECTORIES_COPY,
  TRAJECTORY_VIEWER_COPY,
} from '~/routing/evals/data/copy';
import { buildTrajectoryPlanGroupHref } from '~/routing/evals/utils/hrefs';
import { readTrajectoryViewerData } from '~/routing/evals/utils/readTrajectoryViewerData';
import { buildTrajectoryScoring } from '~/routing/evals/utils/scoring';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => TRAJECTORY_VIEWER_COPY.pageTitle,
  links: (match) => {
    const planId = match.loaderData?.plan?.id ?? null;

    return [
      { children: EVAL_RUNS_COPY.breadcrumb, to: '/evals' },
      {
        children: EVAL_TRAJECTORIES_COPY.breadcrumb,
        to: '/evals/trajectories',
      },
      {
        children:
          match.loaderData?.plan?.title ?? EVAL_TRAJECTORIES_COPY.unknownPlan,
        className: 'inline-block max-w-48 truncate align-bottom',
        to: buildTrajectoryPlanGroupHref(planId),
      },
    ];
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  // Evals are a preview surface (eval-system ADR § Decision 10): with the flag
  // off the route does not exist — the app's usual 404 for a gated route.
  if (!FEATURE_DELTA_PREVIEW) {
    throw new Response('Not Found', { status: 404 });
  }

  const { trajectoryId } = args.params;
  const result = await executeGraphqlWithAuth(
    args.request,
    EvalsTrajectoryViewerDocument,
    { trajectoryId },
  );
  const record = result.agentTrajectory;

  if (record == null) {
    throw new Response('Trajectory not found', { status: 404 });
  }

  const { planId, taskId } = record;

  // Breadcrumb context: a plan-scoped trajectory has no task to read, and a
  // trajectory whose run is gone has no plan.
  const loadPlan = async () => {
    if (planId == null) return null;

    const data = await executeGraphqlWithAuth(
      args.request,
      EvalsTrajectoryViewerPlanDocument,
      { planId },
    );

    return data.plan ?? null;
  };
  const loadTask = async () => {
    if (taskId == null) return null;

    const data = await executeGraphqlWithAuth(
      args.request,
      EvalsTrajectoryViewerTaskDocument,
      { taskId },
    );

    return data.task ?? null;
  };
  const [plan, task, scoringData, viewer] = await Promise.all([
    loadPlan(),
    loadTask(),
    executeGraphqlWithAuth(args.request, EvalsTrajectoryViewerScoringDocument, {
      hasPlan: planId != null,
      planId: planId ?? null,
    }),
    readTrajectoryViewerData({
      labels: result.agentTrajectoryLabels,
      me: result.me,
      record,
    }),
  ]);

  const planGroup = scoringData.plan?.groups[0] ?? null;
  const scoring = buildTrajectoryScoring({
    currentPlanId: planGroup?.planId ?? null,
    currentTrajectoryId: record.id,
    planGroup,
    unscoredGroups: scoringData.unscored.groups,
  });

  return { ...viewer, plan, scoring, task };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const planTitle =
    args.loaderData?.plan?.title ?? EVAL_TRAJECTORIES_COPY.breadcrumb;
  const leaf = TRAJECTORY_VIEWER_COPY.pageTitle;

  return [{ title: `${leaf} | ${planTitle} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;

  // Hooks

  // Setup
  const backHref = buildTrajectoryPlanGroupHref(loaderData.plan?.id ?? null);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TrajectoryViewerRoute
      backHref={backHref}
      backLabel={TRAJECTORY_VIEWER_COPY.backToPlanGroup}
      labels={loaderData.labels}
      scoring={loaderData.scoring}
      summary={loaderData.summary}
      trajectory={loaderData.trajectory}
    />
  );
}

export const action = async (args: Route.ActionArgs) => {
  if (!FEATURE_DELTA_PREVIEW) {
    throw new Response('Not Found', { status: 404 });
  }

  return handleTrajectoryLabelAction(args, args.params.trajectoryId);
};

export const ErrorBoundary = GlobalErrorBoundary;
