import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  FEATURE_DELTA_PREVIEW,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/evals._index';
import {
  EvalsIndexDatasetsDocument,
  EvalsIndexRepositoriesDocument,
  EvalsIndexRunsDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { EvalRunsRoute } from '~/routing/evals/components/EvalRunsRoute';
import { EVAL_RUNS_COPY } from '~/routing/evals/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => EVAL_RUNS_COPY.breadcrumb,
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  // Evals are a preview surface (eval-system ADR § Decision 10): with the flag
  // off the route does not exist.
  if (!FEATURE_DELTA_PREVIEW) {
    throw new Response('Not Found', { status: 404 });
  }

  const repositoryId = args.url.searchParams.get('repositoryId');
  const workspace = await executeGraphqlWithAuth(
    args.request,
    EvalsIndexRepositoriesDocument,
  );
  const repositories = workspace.workspaceRepositories.map((repository) => {
    return { displayName: repository.name, id: repository.id };
  });
  const isKnown = repositories.some((repository) => {
    return repository.id === repositoryId;
  });

  if (repositoryId === null || !isKnown) {
    return { datasets: null, repositories, selectedRepositoryId: null };
  }

  const { evalDatasets } = await executeGraphqlWithAuth(
    args.request,
    EvalsIndexDatasetsDocument,
    { repositoryId },
  );
  const datasets = await Promise.all(
    evalDatasets.map(async (dataset) => {
      const { evalRuns } = await executeGraphqlWithAuth(
        args.request,
        EvalsIndexRunsDocument,
        { datasetId: dataset.id },
      );

      return {
        id: dataset.id,
        name: dataset.name,
        runs: evalRuns,
        version: dataset.version,
      };
    }),
  );

  return { datasets, repositories, selectedRepositoryId: repositoryId };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `${EVAL_RUNS_COPY.pageTitle} | ${SITE_TITLE}` }];
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
    <EvalRunsRoute
      datasets={loaderData.datasets}
      repositories={loaderData.repositories}
      selectedRepositoryId={loaderData.selectedRepositoryId}
    />
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
