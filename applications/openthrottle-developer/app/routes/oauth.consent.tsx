import { toErrorMessageOr } from '@openthrottle/nodejs-utils';
import {
  getAuthTokenFromCookie,
  getLoginRedirectFromRequest,
} from '@openthrottle/react-router-auth';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { data, redirect, useNavigation } from 'react-router';

import type { Route } from '@/app/routes/+types/oauth.consent';
import {
  DecideOAuthAuthorizationDocument,
  OAuthConsentRequestDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { ConsentCard } from '~/routing/oauth/components/ConsentCard';
import { ConsentUnavailable } from '~/routing/oauth/components/ConsentUnavailable';
import { OAUTH_SCOPES } from '~/routing/oauth/data/copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Connect an app',
  links: (_match) => [],
};

/**
 * @description The OAuth consent screen (OT plan 16f321a7). openthrottle-server's
 * `/oauth/authorize` validates the client and redirect URI, stores the request and sends
 * the browser here with `?request=<id>`. Signed-out visitors go through sign-in and come
 * back; the decision is a GraphQL mutation made with the user's own session, and its
 * result is the client's redirect URI (with `code`, or `error=access_denied`).
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;
  const requestId = args.url.searchParams.get('request');

  const token = getAuthTokenFromCookie(request.headers.get('cookie') ?? '');
  if (token === null) {
    throw redirect(getLoginRedirectFromRequest(request));
  }

  if (requestId === null) {
    return { consentRequest: null };
  }

  const result = await executeGraphqlWithAuth(
    request,
    OAuthConsentRequestDocument,
    { id: requestId },
  ).catch(() => null);

  return { consentRequest: result?.oauthAuthorizationRequest ?? null };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Connect an app | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData } = props;
  const { consentRequest } = loaderData;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const submitted = navigation.formData?.get('intent');
  const isKnownIntent = submitted === 'approve' || submitted === 'deny';
  const pendingIntent = isKnownIntent ? submitted : null;

  // Handlers

  // Markup
  const unavailable = (
    <GlobalScreen className="flex flex-1 items-start justify-center py-12">
      <ConsentUnavailable />
    </GlobalScreen>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (consentRequest === null) {
    return unavailable;
  }

  return (
    <GlobalScreen className="flex flex-1 items-start justify-center py-12">
      <ConsentCard
        error={actionData?.error ?? null}
        pendingIntent={pendingIntent}
        request={consentRequest}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const requestId = args.url.searchParams.get('request');
  const formData = await args.request.formData();
  const approve = formData.get('intent') === 'approve';
  const scopes = formData
    .getAll('scope')
    .filter((value): value is string => typeof value === 'string')
    .filter(
      (value) => value === OAUTH_SCOPES.read || value === OAUTH_SCOPES.write,
    );

  if (requestId === null) {
    return data({ error: 'The authorization request id is missing.' }, 400);
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      DecideOAuthAuthorizationDocument,
      { input: { approve, id: requestId, scopes } },
    );
    // An external redirect (loopback or app scheme): React Router performs a document
    // navigation for a cross-origin location.
    return redirect(result.decideOAuthAuthorization.redirectUrl);
  } catch (error) {
    return data(
      { error: toErrorMessageOr(error, 'Could not record your decision.') },
      400,
    );
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
