import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  FEATURE_DELTA_PREVIEW,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/evals.runs.$runId';
import {
  EvalRunReportRouteDocument,
  EvalRunReportSiblingsDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { EvalRunReportRoute } from '~/routing/evals/components/EvalRunReportRoute';
import {
  EVAL_REPORT_COPY,
  EVAL_RUNS_COPY,
} from '~/routing/evals/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => EVAL_REPORT_COPY.breadcrumb,
  links: (_match) => [{ children: EVAL_RUNS_COPY.breadcrumb, to: '/evals' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  if (!FEATURE_DELTA_PREVIEW) {
    throw new Response('Not Found', { status: 404 });
  }

  const { evalRunReport } = await executeGraphqlWithAuth(
    args.request,
    EvalRunReportRouteDocument,
    { runId: args.params.runId },
  );
  const { evalRuns } = await executeGraphqlWithAuth(
    args.request,
    EvalRunReportSiblingsDocument,
    { datasetId: evalRunReport.run.datasetId },
  );

  return { report: evalRunReport, siblings: evalRuns };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const name =
    args.loaderData?.report.datasetName ?? EVAL_REPORT_COPY.breadcrumb;

  return [
    { title: `${EVAL_REPORT_COPY.breadcrumb} | ${name} | ${SITE_TITLE}` },
  ];
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
    <EvalRunReportRoute
      report={loaderData.report}
      siblings={loaderData.siblings}
    />
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
