import { FEATURE_BETA_PREVIEW } from '@openthrottle/react-router-utils';
import type { MiddlewareFunction } from 'react-router';
import { redirect } from 'react-router';

import {
  getAuthTokenFromCookie,
  getClearAuthCookieHeader,
  isJwtExpired,
} from '../utils/index';

const GATED_PREFIXES = [
  '/blog',
  '/generators',
  '/ide',
  '/personas',
  '/profile',
  '/prompts',
  '/pull-requests',
  '/timeline',
];

const BETA_ROUTE_PREFIXES = FEATURE_BETA_PREVIEW ? [] : GATED_PREFIXES;

const PUBLIC_ROUTE_PREFIXES = ['/about', '/auth', '/legal'];

/** Paths the login page lands on anyway, so they need no `redirectTo`. */
const DEFAULT_LANDING_PATHS = new Set(['/', '/dashboard']);

/**
 * @description The sign-in URL for a signed-out request. A document GET for a deep link
 * keeps where it was going as `redirectTo` (e.g. the OAuth consent screen), which the
 * login page accepts only as a same-origin path. Data requests and non-GETs get plain
 * `/auth`: there is no page to return to.
 */
const buildLoginLocation = (request: Request, url: URL): string => {
  const isDocumentGet =
    request.method === 'GET' && !url.pathname.endsWith('.data');
  if (!isDocumentGet || DEFAULT_LANDING_PATHS.has(url.pathname)) {
    return '/auth';
  }
  const target = `${url.pathname}${url.search}`;
  return `/auth?redirectTo=${encodeURIComponent(target)}`;
};

/**
 * Server-side Authentication Middleware
 */
export const authMiddleware: MiddlewareFunction = (args) => {
  const { request, url } = args;
  const { pathname } = url;

  const isBetaEnabled = process.env.FEATURE_BETA_PREVIEW === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);

  // A present-but-expired token must be treated exactly like a missing one:
  // otherwise it sails through here, loaders fire authenticated requests that
  // 401, and a deferred loader's rejection becomes an unhandled promise
  // rejection that crashes the SSR server.
  const hasValidToken = token != null && !isJwtExpired(token);

  const isBetaRoute = BETA_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const isPublicRoute = PUBLIC_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!hasValidToken && !isPublicRoute) {
    const message = `🚨 authMiddleware: missing or expired token + non-public route`;
    if (!isProd) console.log(message, { pathname, token });

    throw redirect(buildLoginLocation(request, url), {
      headers: { 'Set-Cookie': getClearAuthCookieHeader() },
    });
  }

  if (isBetaRoute && !isBetaEnabled) {
    const message = `🚨 authMiddleware: beta route, but beta is disabled`;
    if (!isProd) console.log(message, { pathname, token });

    throw redirect('/dashboard');
  }

  // if (!isProd) {
  //   console.log('🔒 authMiddleware', { pathname, token });
  // }
};
