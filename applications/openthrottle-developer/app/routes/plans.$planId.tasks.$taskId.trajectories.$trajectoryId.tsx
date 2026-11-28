import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  FEATURE_DELTA_PREVIEW,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId.trajectories.$trajectoryId';
import { TrajectoryViewerDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { handleTrajectoryLabelAction } from '~/routing/evals/actions/trajectoryId';
import { TrajectoryViewerRoute } from '~/routing/evals/components/TrajectoryViewerRoute';
import { TRAJECTORY_VIEWER_COPY } from '~/routing/evals/data/copy';
import { buildTaskTrajectoriesHref } from '~/routing/evals/utils/hrefs';
import { readTrajectoryViewerData } from '~/routing/evals/utils/readTrajectoryViewerData';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => TRAJECTORY_VIEWER_COPY.pageTitle,
  links: (match) => {
    const planPath = `/plans/${match.params.planId ?? 'not-found'}`;
    const taskPath = `${planPath}/tasks/${match.params.taskId ?? 'not-found'}`;

    return [
      { children: 'Plans', to: '/plans' },
      {
        children: match.loaderData?.plan?.title ?? 'Plan',
        className: 'inline-block max-w-48 truncate align-bottom',
        to: planPath,
      },
      {
        children: match.loaderData?.task?.title ?? 'Task',
        className: 'inline-block max-w-48 truncate align-bottom',
        to: `${taskPath}?tab=trajectories`,
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

  const { planId, taskId, trajectoryId } = args.params;
  const result = await executeGraphqlWithAuth(
    args.request,
    TrajectoryViewerDocument,
    { planId, taskId, trajectoryId },
  );
  const record = result.agentTrajectory;

  if (record == null || record.taskId !== taskId) {
    throw new Response('Trajectory not found', { status: 404 });
  }

  const viewer = await readTrajectoryViewerData({
    labels: result.agentTrajectoryLabels,
    me: result.me,
    record,
  });

  return {
    ...viewer,
    plan: result.plan ?? null,
    task: result.task ?? null,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const taskTitle = args.loaderData?.task?.title;
  const leaf = TRAJECTORY_VIEWER_COPY.pageTitle;
  const title = taskTitle
    ? `${leaf} | ${taskTitle} | ${SITE_TITLE}`
    : `${leaf} | Task | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData, params } = props;

  // Hooks

  // Setup
  const backHref = buildTaskTrajectoriesHref(params.planId, params.taskId);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TrajectoryViewerRoute
      backHref={backHref}
      backLabel={TRAJECTORY_VIEWER_COPY.backToTask}
      labels={loaderData.labels}
      scoring={null}
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
