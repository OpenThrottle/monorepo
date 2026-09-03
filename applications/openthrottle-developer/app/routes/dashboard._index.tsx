import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  GetDashboardDocument,
  GetDashboardGithubStatsDocument,
  GetDashboardOnboardingDocument,
  GetDashboardQueryVariables,
  TriggerNotificationDocument,
} from '~/__generated__/graphql';
import { callListAgentConversations } from '~/global/utils/utils.agents-chat';
import { CONTRIBUTIONS_DAYS_BACK } from '~/routing/dashboard/config/config.dashboard';
import { DashboardContentGrid } from '~/routing/dashboard/components/DashboardContentGrid';
import { DashboardGetStartedSection } from '~/routing/dashboard/components/DashboardGetStartedSection';
import { DashboardIntroduction } from '~/routing/dashboard/components/DashboardIntroduction';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { parseDashboardGithubParams } from '~/routing/dashboard/utils/parsers';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/dashboard._index';
import type { ShouldRevalidateFunction } from 'react-router';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Dashboard',
  links: (_match) => [],
};

export const loader = (args: Route.LoaderArgs) => {
  const end = new Date();
  const endIso = end.toISOString();

  const { owner, repo } = parseDashboardGithubParams(args.url.searchParams);

  const start = new Date(
    end.getTime() - CONTRIBUTIONS_DAYS_BACK * 24 * 60 * 60 * 1000,
  );
  const startIso = start.toISOString();

  const variables: GetDashboardQueryVariables = {
    end: endIso,
    input: { daysBack: 7 },
    start: startIso,
  };

  // Fire both queries concurrently (no serial waitfall) and return two
  // independent naked promises so the "This Week's Activity" chart streams as
  // soon as the dashboard query lands, without waiting on the slower GitHub API
  // round-trip. RR8 Single Fetch serializes/streams the promise fields. The
  // dashboard call is invoked first (call #1), githubStats second (call #2).
  const core = executeGraphqlWithAuth(
    args.request,
    GetDashboardDocument,
    variables,
  ).then((result) => ({
    activityByDate: result.activityByDate,
    dailyStatsRange: result.dailyStatsRange,
    queues: result.queues,
  }));

  const githubStatsResult = executeGraphqlWithAuth(
    args.request,
    GetDashboardGithubStatsDocument,
    { owner, repo },
  );

  // Deferred (onboarding): the real-state signals that drive the "Get Started"
  // checklist (GitHub token, workspace repo count, agent-CLI count, plan counts
  // by status). Its own naked promise so the non-critical nudge card streams
  // independently and never blocks the activity chart or PR stats.
  const onboarding = executeGraphqlWithAuth(
    args.request,
    GetDashboardOnboardingDocument,
    {},
  );

  // githubTokenConfigured is deliberately NOT selected by getDashboardGithubStats:
  // it is the one GithubResolver query without a cache hint, and Apollo takes an
  // operation's cache policy from its most restrictive field, so including it
  // collapsed the whole ~4s stats query to maxAge 0 and it never cached. It is
  // read off the cheap onboarding query instead and joined back on here.
  //
  // Promise.all, not a nested Await: both calls are already in flight, so this
  // joins two concurrent streams rather than adding a waterfall. A failing
  // onboarding call falls back to true so a Get Started outage can't tell the
  // user to configure a token they already have — if the token really were
  // missing, githubStats itself would surface that through its error boundary.
  const githubStats = Promise.all([
    githubStatsResult,
    onboarding.then((result) => result.githubTokenConfigured).catch(() => true),
  ]).then(([stats, githubTokenConfigured]) => ({
    ...stats,
    githubTokenConfigured,
  }));

  // Deferred (recentChats): the 3 most-recent agent conversations, streamed in
  // its own Await boundary (mirroring githubStats) so it never blocks the
  // activity chart. Resolves to ListAgentConversationsResult; a rejection is
  // handled downstream by the card's errorElement.
  const recentChats = callListAgentConversations(args.request, { limit: 3 });

  return { core, githubStats, onboarding, recentChats };
};

export const links: Route.LinksFunction = () => {
  return [];
};

/**
 * @description The only search params this loader reads are `owner` and `repo`
 * (via `parseDashboardGithubParams`). Every other param — `modal`, `date` — is
 * pure client-side view state, so revalidating on those is wasted work: the
 * loader re-fires `getDashboardGithubStats`, which costs ~4s of live GitHub API
 * round-trips, plus ~460KB of streamed payload, on every modal open, close and
 * arrow-key date step. Worse, the fresh naked promises re-suspend every `Await`
 * boundary, so the whole grid (and the modal itself) flashes back to skeletons
 * while that resolves. Skip revalidation unless the GitHub params actually moved.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (args) => {
  const { currentUrl, defaultShouldRevalidate, formMethod, nextUrl } = args;

  if (formMethod !== undefined || currentUrl.pathname !== nextUrl.pathname) {
    return defaultShouldRevalidate;
  }

  const current = parseDashboardGithubParams(currentUrl.searchParams);
  const next = parseDashboardGithubParams(nextUrl.searchParams);

  if (current.owner === next.owner && current.repo === next.repo) {
    return false;
  }

  return defaultShouldRevalidate;
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Dashboard | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { core, githubStats, onboarding, recentChats } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      {/* Get Started onboarding checklist — first child, full width. */}
      <DashboardGetStartedSection onboarding={onboarding} />
      <DashboardIntroduction />
      <DashboardContentGrid
        core={core}
        githubStats={githubStats}
        recentChats={recentChats}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'triggerWebsocketNotification') {
    try {
      await executeGraphqlWithAuth(args.request, TriggerNotificationDocument);

      return { devTriggerWebsocket: { success: true } };
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      return { devTriggerWebsocket: { error: message } };
    }
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
