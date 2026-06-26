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
import type { Route } from '@/app/routes/+types/auth.logout';

type HandleData = Route.ComponentProps['loaderData'];

/** Clicks required on the logout screen before the auth form is revealed. */
const REVEAL_CLICK_THRESHOLD = 5;

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

export const links: Route.LinksFunction = () => {
  return [];
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
  /**
   * Intentional reveal gate: the auth form on the logout screen stays hidden
   * until the screen has been clicked {@link REVEAL_CLICK_THRESHOLD} times. This
   * is a deliberate low-friction guard (not dead code) so the post-logout screen
   * does not double as an always-on login surface. The screen-level `onClick`
   * increments the counter.
   */
  const isFormEnabled = count >= REVEAL_CLICK_THRESHOLD;

  // Handlers
  const onIncrementCount = () => {
    setCount(count + 1);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center p-4 md:p-8 lg:p-12"
      onClick={onIncrementCount}
    >
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-8">
        <OpenThrottleLogo className="mx-auto text-2xl" name={SITE_SUBDOMAIN} />
        {isFormEnabled ? <OpenThrottleAuthForm action="/" /> : null}
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
