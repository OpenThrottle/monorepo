import { redirect } from 'react-router';
import type { MiddlewareFunction } from 'react-router';
import {
  getAuthTokenFromCookie,
  getClearAuthCookieHeader,
  isJwtExpired,
} from '../utils/index';

const BETA_ROUTE_PREFIXES = [
  '/generators',
  '/ide',
  '/personas',
  '/profile',
  '/prompts',
  '/pull-requests',
  '/search',
];

const PUBLIC_ROUTE_PREFIXES = ['/about', '/auth', '/legal'];

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

    throw redirect('/auth', {
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
