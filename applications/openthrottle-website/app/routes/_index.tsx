import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  FEATURES,
  OpenThrottleProductFeatures,
  OpenThrottleProductGetStarted,
} from '@openthrottle/react-router-ui';
import type { Route } from '@/app/routes/+types/_index';
import { GlobalFooter } from '~/global/components/GlobalFooter';

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

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="flex flex-1 flex-col">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 md:gap-8 lg:gap-24 p-4 md:p-8 lg:p-12">
        <div className="mx-auto my-40">
          <OpenThrottleProductGetStarted />
        </div>
        <OpenThrottleProductFeatures features={FEATURES} />
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
