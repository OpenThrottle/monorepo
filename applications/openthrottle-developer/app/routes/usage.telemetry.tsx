import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/usage.telemetry';
import { GetUsageCaptureHealthDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { UsageCaptureHealth } from '~/routing/usage/components/UsageCaptureHealth';
import { UsageTelemetryCoverage } from '~/routing/usage/components/UsageTelemetryCoverage';
import { fetchTelemetryCoverage } from '~/routing/usage/utils/fetchTelemetryCoverage';
import { forgetTelemetryMachine } from '~/routing/usage/utils/forgetTelemetryMachine';
import { getUsageRange } from '~/routing/usage/utils/getUsageRange';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Telemetry usage',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { endIso, rangeDays } = getUsageRange();

  const [captureHealthResult, telemetryCoverage] = await Promise.all([
    // Per-source "last captured" signal: a silent capture outage looks
    // identical to a quiet week in the charts.
    executeGraphqlWithAuth(args.request, GetUsageCaptureHealthDocument, {}),
    // Which machines report and through which delivery leg. Resolves to null
    // on failure so a coverage outage never blanks the rest of the page.
    fetchTelemetryCoverage(args.request),
  ]);

  return {
    captureHealth: captureHealthResult.captureHealth,
    rangeDays,
    rangeEndIso: endIso,
    telemetryCoverage,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Telemetry usage | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { captureHealth, rangeEndIso, telemetryCoverage } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <UsageCaptureHealth nowIso={rangeEndIso} rows={captureHealth} />
      <UsageTelemetryCoverage
        coverage={telemetryCoverage}
        nowIso={rangeEndIso}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  return forgetTelemetryMachine(args.request);
};

export const ErrorBoundary = GlobalErrorBoundary;
