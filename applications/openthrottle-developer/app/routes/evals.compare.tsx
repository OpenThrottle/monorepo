import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  FEATURE_DELTA_PREVIEW,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/evals.compare';
import { EvalRunComparisonRouteDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { EvalCompareRoute } from '~/routing/evals/components/EvalCompareRoute';
import { EVAL_COMPARE_COPY } from '~/routing/evals/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => EVAL_COMPARE_COPY.breadcrumb,
  links: (_match) => [{ children: 'Evals', to: '/evals' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  if (!FEATURE_DELTA_PREVIEW) {
    throw new Response('Not Found', { status: 404 });
  }

  const baseRunId = args.url.searchParams.get('base');
  const candidateRunId = args.url.searchParams.get('candidate');

  if (baseRunId === null || candidateRunId === null) {
    throw new Response(EVAL_COMPARE_COPY.missingRuns, { status: 400 });
  }

  const { evalRunComparison } = await executeGraphqlWithAuth(
    args.request,
    EvalRunComparisonRouteDocument,
    { baseRunId, candidateRunId },
  );

  return { comparison: evalRunComparison };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `${EVAL_COMPARE_COPY.pageTitle} | ${SITE_TITLE}` }];
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

  return <EvalCompareRoute comparison={loaderData.comparison} />;
}

export const ErrorBoundary = GlobalErrorBoundary;
