import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  FEATURE_DELTA_PREVIEW,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/evals.trajectories._index';
import {
  EvalsIndexRepositoriesDocument,
  EvalsTrajectoryPlanGroupsDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { EvalTrajectoriesRoute } from '~/routing/evals/components/EvalTrajectoriesRoute';
import {
  TRAJECTORY_SCORE_FILTER_PARAM,
  TRAJECTORY_SCORE_STATE_BY_FILTER,
} from '~/routing/evals/config/defaults';
import {
  EVAL_RUNS_COPY,
  EVAL_TRAJECTORIES_COPY,
} from '~/routing/evals/data/copy';
import { parseTrajectoryScoreFilter } from '~/routing/evals/utils/parsers';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => EVAL_TRAJECTORIES_COPY.breadcrumb,
  links: (_match) => [{ children: EVAL_RUNS_COPY.breadcrumb, to: '/evals' }],
};

/**
 * Also serves the tab's "Load more" fetches: the same URL with `after` set
 * returns the next page of plan groups.
 */
export const loader = async (args: Route.LoaderArgs) => {
  // Evals are a preview surface (eval-system ADR § Decision 10): with the flag
  // off the route does not exist.
  if (!FEATURE_DELTA_PREVIEW) {
    throw new Response('Not Found', { status: 404 });
  }

  const { searchParams } = args.url;
  const filter = parseTrajectoryScoreFilter(
    searchParams.get(TRAJECTORY_SCORE_FILTER_PARAM),
  );
  const requestedRepositoryId = searchParams.get('repositoryId');
  const workspace = await executeGraphqlWithAuth(
    args.request,
    EvalsIndexRepositoriesDocument,
  );
  const repositories = workspace.workspaceRepositories.map((repository) => {
    return { displayName: repository.name, id: repository.id };
  });
  // Only a registered repository narrows the list; anything else shows all.
  const selected = repositories.find((repository) => {
    return repository.id === requestedRepositoryId;
  });
  const selectedRepositoryId = selected?.id ?? null;
  const { agentTrajectoryPlanGroups: page } = await executeGraphqlWithAuth(
    args.request,
    EvalsTrajectoryPlanGroupsDocument,
    {
      after: searchParams.get('after'),
      repositoryId: selectedRepositoryId,
      scoreState: TRAJECTORY_SCORE_STATE_BY_FILTER[filter],
    },
  );

  return { filter, page, repositories, selectedRepositoryId };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  const leaf = EVAL_TRAJECTORIES_COPY.breadcrumb;

  return [{ title: `${leaf} | ${EVAL_RUNS_COPY.pageTitle} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <EvalTrajectoriesRoute
      filter={loaderData.filter}
      page={loaderData.page}
      repositories={loaderData.repositories}
      selectedRepositoryId={loaderData.selectedRepositoryId}
    />
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
