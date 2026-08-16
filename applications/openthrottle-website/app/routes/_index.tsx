import * as React from 'react';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  APP_URL,
  canonicalMeta,
  mergeRouteModuleMeta,
  OPENTHROTTLE_META_DESCRIPTION,
} from '@openthrottle/react-router-utils';
import { getRandomIntroduction } from '@openthrottle/react-router-ui';
import { GlobalFooter } from '~/global/components/GlobalFooter';
import { LandingClose } from '~/routing/home/components/LandingClose';
import { LandingFlow } from '~/routing/home/components/LandingFlow';
import { LandingHero } from '~/routing/home/components/LandingHero';
import { LandingPromise } from '~/routing/home/components/LandingPromise';
import { LandingSurfaces } from '~/routing/home/components/LandingSurfaces';
import { useRevealOnScroll } from '~/routing/home/hooks/useRevealOnScroll';
import type { Route } from '@/app/routes/+types/_index';

export const loader = async (_args: Route.LoaderArgs) => {
  const introduction = getRandomIntroduction();
  const repo = 'openthrottle/monorepo';

  return { introduction, repo };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  return [
    { title: SITE_TITLE },
    { content: OPENTHROTTLE_META_DESCRIPTION, name: 'description' },

    // Per-route canonical URL so duplicate-content signals stay correct.
    canonicalMeta(args.location.pathname),

    // Override the inherited root OG/Twitter title with the home title.
    { content: SITE_TITLE, property: 'og:title' },
    { content: APP_URL, property: 'og:url' },
    { content: SITE_TITLE, name: 'twitter:title' },
  ];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { introduction, repo } = loaderData;

  // Hooks
  const revealRef = useRevealOnScroll<HTMLElement>();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    /*
      The landing page is a snap deck: `<main>` is its own scroll container
      (h-svh + overflow-y-auto) so `snap-y` applies here instead of leaking to
      every route via the document scroller. Each `Landing*` section carries
      `snap-start`; the footer rides along with the closing section so a
      mandatory snap never strands it off-screen.
    */
    <main
      className="h-svh snap-y snap-mandatory overflow-y-auto scroll-smooth"
      ref={revealRef}
    >
      <LandingHero />
      <LandingPromise />
      <LandingFlow />
      <LandingSurfaces />
      <div className="snap-start">
        <LandingClose introduction={introduction} repo={repo} />
        <GlobalFooter />
      </div>
    </main>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
