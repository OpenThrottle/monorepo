import * as React from 'react';
import {
  OpenThrottleAuthForm,
  OpenThrottleLogo,
} from '@openthrottle/react-router-ui';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_SUBDOMAIN, SITE_TITLE } from '~/global/config/settings';
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
  const [count, setCount] = React.useState(0);

  // Setup
  const isFormEnabled = count >= 5;

  // Handlers
  const onIncrementCount = () => {
    setCount(count + 1);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="mx-auto flex-1 max-w-xl w-full flex flex-col justify-center p-4 md:p-8 lg:p-12"
      onClick={onIncrementCount}
    >
      <div className="flex flex-col justify-center gap-8 flex-1 h-full items-center">
        <OpenThrottleLogo className="text-2xl mx-auto" name={SITE_SUBDOMAIN} />
        {isFormEnabled ? (
          <OpenThrottleAuthForm action="/" title="Sign in" />
        ) : null}
      </div>
    </div>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
