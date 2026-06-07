import * as React from 'react';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  FEATURES,
  OpenThrottleLogo,
  OpenThrottleProductFeatures,
  OpenThrottleProductGetStarted,
  OpenThrottleProductTestimonials,
} from '@openthrottle/react-router-ui';
import { GlobalFooter } from '~/global/components/GlobalFooter';
import { loader } from '~/root';
import { useRouteLoaderData } from 'react-router';
import type { Route } from '@/app/routes/+types/_index';

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
  const [count, setCount] = React.useState(0);

  // Setup
  const isBeta = count >= 3;

  // Handlers
  const onClick = () => {
    setCount((count) => count + 1);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!isBeta) {
    return (
      <main className="max-w-7xl mx-auto justify-center items-center flex flex-col gap-4 md:gap-8 lg:gap-24 p-4 md:p-8 lg:p-12 flex-1">
        <div className="mx-auto mb-8" onClick={onClick}>
          <OpenThrottleLogo className="text-xl mb-4" name="AI" />
          <p className="text-muted-foreground">
            This is a beta feature. Please come back soon.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 md:gap-8 lg:gap-24 p-4 md:p-8 lg:p-12">
        <div className="mx-auto my-40">
          <OpenThrottleProductGetStarted
            repo={data?.repo ?? 'openthrottle/openthrottle'}
            stars={Number(data?.stars ?? 0)}
          />
        </div>
        <OpenThrottleProductFeatures features={FEATURES} />
        <OpenThrottleProductTestimonials />
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
