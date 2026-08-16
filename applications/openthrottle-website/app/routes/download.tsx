import * as React from 'react';
import {
  GlobalAnimationMesh,
  GlobalErrorBoundary,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  APP_URL,
  canonicalMeta,
  mergeRouteModuleMeta,
  OPENTHROTTLE_META_DESCRIPTION,
} from '@openthrottle/react-router-utils';
import { OpenThrottleProductGetStarted } from '@openthrottle/react-router-ui';
import { getRandomIntroduction } from '@openthrottle/react-router-ui';
import { GlobalFooter } from '~/global/components/GlobalFooter';
import type { Route } from '@/app/routes/+types/download';

export const loader = async (_args: Route.LoaderArgs) => {
  const introduction = getRandomIntroduction();
  const repo = 'openthrottle/monorepo';

  return { introduction, repo };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  return [
    { title: SITE_TITLE },
    { content: OPENTHROTTLE_META_DESCRIPTION, name: 'description' },

    // Per-route canonical URL so this preserved page doesn't compete with the
    // new home route (`/`) for the same canonical signal.
    canonicalMeta(args.location.pathname),

    // Override the inherited root OG/Twitter title with the home title.
    { content: SITE_TITLE, property: 'og:title' },
    { content: `${APP_URL}${args.location.pathname}`, property: 'og:url' },
    { content: SITE_TITLE, name: 'twitter:title' },
  ];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { introduction, repo } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <main className="z-10 flex flex-1 flex-col">
        <div className="mx-auto flex min-h-svh max-w-7xl flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8 lg:gap-24 lg:p-12">
          {/*
            The GitHub stars count is no longer fetched in the root loader (it
            was blocking, uncached, and rate-limited). When the beta gate is
            lifted, refetch it in this route's loader behind a short-TTL cache +
            AbortController timeout + graceful fallback, then thread it through.
          */}
          <OpenThrottleProductGetStarted
            introduction={introduction}
            repo={repo}
            stars="0"
          />

          {/* <OpenThrottleProductFeatures features={FEATURES} /> */}
          {/* <OpenThrottleProductTestimonials /> */}
        </div>

        <div className="mt-40">
          <GlobalFooter />
        </div>
      </main>
      <GlobalAnimationMesh />
    </>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
