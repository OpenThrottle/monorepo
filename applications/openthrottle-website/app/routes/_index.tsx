import * as React from 'react';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  FEATURES,
  OpenThrottleProductFeatures,
  OpenThrottleProductGetStarted,
} from '@openthrottle/react-router-ui';
import type { Route } from '@/app/routes/+types/_index';
import { GlobalFooter } from '~/global/components/GlobalFooter';
import { useRouteLoaderData } from 'react-router';
import { loader } from '~/root';

// export const loader = async (_args: Route.LoaderArgs) => {
//   return {};
// };

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks
  const data = useRouteLoaderData<typeof loader>('root');

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="flex flex-1 flex-col">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 md:gap-8 lg:gap-24 p-4 md:p-8 lg:p-12">
        <div className="mx-auto my-40">
          <OpenThrottleProductGetStarted
            repo={data?.repo ?? 'openthrottle/openthrottle'}
            stars={data?.stars}
          />
        </div>
        <OpenThrottleProductFeatures features={FEATURES} />

        {/* <h2 className="text-foreground">What People Are Saying</h2> */}
        <div className="flex flex-col gap-4 justify-center items-center my-20">
          <blockquote className="text-muted-foreground font-normal max-w-3xl leading-relaxed mx-auto">
            "I may be partially biased, but OpenThrottle is a game-changer for
            our team. It has completely transformed how we approach software
            development."
            <footer className="text-sm text-muted-foreground block mt-4 text-right">
              <cite className="font-medium block">~ Matthew Scholta</cite>
              <span className="text-xs text-muted-foreground">
                Creator of OpenThrottle
              </span>
            </footer>
          </blockquote>
        </div>
      </div>
      <div className="mt-40">
        <GlobalFooter />
      </div>
    </main>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
