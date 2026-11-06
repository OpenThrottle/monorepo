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
import {
  labelTrajectory,
  removeTrajectoryLabel,
} from '~/routing/evals/actions/trajectoryId';
import { TrajectoryViewerRoute } from '~/routing/evals/components/TrajectoryViewerRoute';
import { TRAJECTORY_LABEL_INTENT } from '~/routing/evals/config/defaults';
import { TRAJECTORY_VIEWER_COPY } from '~/routing/evals/data/data.copy';
import { splitTrajectoryLabels } from '~/routing/evals/utils/labels';

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

  // The ATIF parser is node-only: parse on the server and hand the client the
  // plain document, never the package.
  const { parseTrajectoryDocument } =
    await import('~/routing/evals/utils/parse-trajectory.server');
  const { trajectoryJson, ...summary } = record;
  const { me } = result;
  const identity = me
    ? { email: me.email, githubUsername: me.githubUsername, id: me.id }
    : null;

  return {
    labels: splitTrajectoryLabels(result.agentTrajectoryLabels, identity),
    plan: result.plan ?? null,
    summary,
    task: result.task ?? null,
    trajectory: parseTrajectoryDocument(trajectoryJson),
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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TrajectoryViewerRoute
      labels={loaderData.labels}
      planId={params.planId}
      summary={loaderData.summary}
      taskId={params.taskId}
      trajectory={loaderData.trajectory}
    />
  );
}

export const action = async (args: Route.ActionArgs) => {
  if (!FEATURE_DELTA_PREVIEW) {
    throw new Response('Not Found', { status: 404 });
  }

  const { trajectoryId } = args.params;
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case TRAJECTORY_LABEL_INTENT.label:
      return labelTrajectory(args, trajectoryId, formData);
    case TRAJECTORY_LABEL_INTENT.remove:
      return removeTrajectoryLabel(args, trajectoryId);
    default:
      return { error: 'Unknown action.', ok: false };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
