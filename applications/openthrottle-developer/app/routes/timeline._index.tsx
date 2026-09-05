import * as React from 'react';
import { APP_NAME } from '@openthrottle/react-router-utils';
import type { ShouldRevalidateFunction } from 'react-router';
import {
  EvaluateFeatureFlagsDocument,
  GetWorkstreamTimelineDocument,
} from '~/__generated__/graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { SITE_TITLE } from '~/global/config/settings';
import {
  TIMELINE_MARKER_KINDS,
  TIMELINE_SPAN_KINDS,
} from '~/routing/timeline/config/kinds';
import { TIMELINE_SEARCH_PARAM } from '~/routing/timeline/config/defaults';
import { TimelineScreen } from '~/routing/timeline/components/TimelineScreen';
import {
  parseTimelineBranch,
  parseTimelineGrouping,
  parseTimelineKinds,
  resolveTimelineWindow,
} from '~/routing/timeline/utils/parsers';
import { TIMELINE_ROLLOUT_FLAG_KEY } from '~/routing/timeline/config/rollout';
import type { Route } from '@/app/routes/+types/timeline._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Timeline',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  // The beta gate is a real flag row, evaluated server-side through the same
  // query the client provider uses. A 404 (rather than a "disabled" screen) is
  // the app's existing shape for a route you may not reach.
  const flags = await executeGraphqlWithAuth(
    args.request,
    EvaluateFeatureFlagsDocument,
    { anonymousId: null, applicationKey: APP_NAME },
  );

  const enabled = flags.evaluateFeatureFlags.some(
    (flag) => flag.key === TIMELINE_ROLLOUT_FLAG_KEY && flag.enabled,
  );

  if (!enabled) throw new Response('Not Found', { status: 404 });

  const searchParams = new URL(args.request.url).searchParams;
  const window = resolveTimelineWindow(searchParams, new Date());
  const grouping = parseTimelineGrouping(searchParams);
  const gitBranch = parseTimelineBranch(searchParams);
  const markerKinds = parseTimelineKinds(
    searchParams,
    TIMELINE_SEARCH_PARAM.markerKinds,
    TIMELINE_MARKER_KINDS,
  );
  const spanKinds = parseTimelineKinds(
    searchParams,
    TIMELINE_SEARCH_PARAM.spanKinds,
    TIMELINE_SPAN_KINDS,
  );

  const result = await executeGraphqlWithAuth(
    args.request,
    GetWorkstreamTimelineDocument,
    {
      input: {
        backend: null,
        checkoutId: null,
        from: window.fromIso,
        gitBranch,
        grouping,
        markerKinds,
        planId: null,
        spanKinds,
        to: window.toIso,
      },
    },
  );

  // Raw rows only — every bit of layout math lives in `routing/timeline/utils`,
  // so the chart can be re-laid-out without another round trip.
  return {
    grouping,
    markers: result.workstreamTimeline.markers,
    selectedBranch: gitBranch,
    selectedMarkerKinds: markerKinds,
    selectedSpanKinds: spanKinds,
    spans: result.workstreamTimeline.spans,
    truncation: result.workstreamTimeline.truncation,
    windowFromIso: result.workstreamTimeline.from,
    windowPreset: window.preset,
    windowToIso: result.workstreamTimeline.to,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Timeline | ${SITE_TITLE}` }];
});

/**
 * The chart writes hover and selection state into component state, not the URL,
 * but sibling routes and the global layout still navigate. Revalidate only when
 * a param the loader actually reads has changed, so panning or opening a
 * popover never refetches the window.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (args) => {
  const { currentUrl, defaultShouldRevalidate, formMethod, nextUrl } = args;

  if (formMethod != null) return defaultShouldRevalidate;
  if (currentUrl.pathname !== nextUrl.pathname) return defaultShouldRevalidate;

  const watched = Object.values(TIMELINE_SEARCH_PARAM);

  return watched.some(
    (key) => currentUrl.searchParams.get(key) !== nextUrl.searchParams.get(key),
  );
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const {
    grouping,
    markers,
    selectedBranch,
    selectedMarkerKinds,
    selectedSpanKinds,
    spans,
    truncation,
    windowFromIso,
    windowPreset,
    windowToIso,
  } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <TimelineScreen
        grouping={grouping}
        markers={markers}
        selectedBranch={selectedBranch}
        selectedMarkerKinds={selectedMarkerKinds}
        selectedSpanKinds={selectedSpanKinds}
        spans={spans}
        truncation={truncation}
        windowFromIso={windowFromIso}
        windowPreset={windowPreset}
        windowToIso={windowToIso}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
