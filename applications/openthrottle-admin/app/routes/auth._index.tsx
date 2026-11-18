import {
  getAuthTokenFromCookie,
  getSafeRedirect,
  REDIRECT_URL_PARAM,
} from '@openthrottle/react-router-auth';
import {
  OpenThrottleAuthForm,
  OpenThrottleLogo,
} from '@openthrottle/react-router-ui';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { redirect, useSearchParams } from 'react-router';

import type { Route } from '@/app/routes/+types/auth._index';
import { SITE_SUBDOMAIN, SITE_TITLE } from '~/global/config/settings';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Logout',
  links: (_match) => [{ children: 'Auth', to: '/auth' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { request, url } = args;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);

  // A token the server rejects costs one hop, not a loop: the root loader
  // finds no user on the target page and sends it back here with the cookie
  // cleared.
  if (token) {
    return redirect(getSafeRedirect(url.searchParams.get(REDIRECT_URL_PARAM)));
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
  const [searchParams] = useSearchParams();

  // Setup
  // Posted with the form so root's login action can land on the page that
  // sent us here; it re-checks the value with getSafeRedirect.
  const redirectUrl = getSafeRedirect(searchParams.get(REDIRECT_URL_PARAM));
  const hiddenFields = { [REDIRECT_URL_PARAM]: redirectUrl };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center p-4 md:p-8 lg:p-12">
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-8">
        <OpenThrottleLogo className="mx-auto text-2xl" name={SITE_SUBDOMAIN} />
        <OpenThrottleAuthForm action="/" hiddenFields={hiddenFields} />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
