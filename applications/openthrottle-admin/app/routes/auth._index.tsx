import * as React from 'react';
import {
  OpenThrottleAuthForm,
  OpenThrottleLogo,
} from '@openthrottle/react-router-ui';
import { getAuthTokenFromCookie } from '@openthrottle/react-router-auth';
import { redirect } from 'react-router';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_SUBDOMAIN, SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/auth._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Logout',
  links: (_match) => [{ children: 'Auth', to: '/auth' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);

  if (token) {
    return redirect('/dashboard');
  }

  return {};
};

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
    <GlobalScreen
      className="mx-auto flex-1 max-w-xl w-full flex flex-col justify-center p-4 md:p-8 lg:p-12"
      onClick={onIncrementCount}
    >
      <div className="flex flex-col justify-center gap-8 flex-1 h-full items-center">
        <OpenThrottleLogo className="text-2xl mx-auto" name={SITE_SUBDOMAIN} />
        {isFormEnabled ? (
          <OpenThrottleAuthForm action="/" title="Sign in" />
        ) : null}
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
