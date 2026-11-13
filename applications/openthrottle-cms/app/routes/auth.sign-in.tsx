import {
  buildAuthCookie,
  getAuthTokenFromCookie,
} from '@openthrottle/react-router-auth';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { data, redirect, useNavigation } from 'react-router';

import type { Route } from '@/app/routes/+types/auth.sign-in';
import { CmsLoginDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { fetchPublicGraphql } from '~/global/utils/graphql.server';
import { AuthSignInForm } from '~/routing/auth/components/AuthSignInForm';
import { AUTH_COPY } from '~/routing/auth/data/data.copy';
import { AUTH_ROUTES } from '~/routing/auth/data/data.routes';
import { getSafeRedirect } from '~/routing/auth/utils/auth-redirect';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Sign in',
  links: (_match) => [],
};

/**
 * @description Where to return to after signing in, from `?redirectTo=`. A visitor who already
 * has a CMS session goes straight there.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;
  const url = new URL(request.url);
  const redirectTo = getSafeRedirect(url.searchParams.get(AUTH_ROUTES.redirectParam)); // prettier-ignore

  if (getAuthTokenFromCookie(request.headers.get('cookie') ?? '')) {
    return redirect(redirectTo);
  }

  return { redirectTo };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Sign in | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const isSubmitting = navigation.state === 'submitting';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="flex flex-1 items-center justify-center p-4">
      <AuthSignInForm
        className={undefined}
        error={actionData?.error}
        isSubmitting={isSubmitting}
        redirectTo={loaderData.redirectTo}
      />
    </GlobalScreen>
  );
}

/**
 * @description Signs in with the `login` mutation and sets the CMS auth cookie (named for this
 * app, so it is separate from the developer app's session), then returns to `redirectTo`.
 */
export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const redirectTo = getSafeRedirect(formData.get(AUTH_ROUTES.redirectParam));

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.trim() === '' ||
    password === ''
  ) {
    return data({ error: AUTH_COPY.missingFields }, { status: 400 });
  }

  try {
    const { login } = await fetchPublicGraphql(CmsLoginDocument, {
      input: { email: email.trim(), password },
    });

    return redirect(redirectTo, {
      headers: { 'Set-Cookie': buildAuthCookie(login.accessToken) },
    });
  } catch (error) {
    console.error('🔴 cms sign-in failed', error);

    return data({ error: AUTH_COPY.failed }, { status: 401 });
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
