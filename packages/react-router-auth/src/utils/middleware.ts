import { redirect } from 'react-router';
import type { MiddlewareFunction } from 'react-router';
import {
  getAuthTokenFromCookie,
  getClearAuthCookieHeader,
} from '../utils/index';

const BETA_ROUTE_PREFIXES = [
  '/generators',
  '/ide',
  '/notifications',
  '/personas',
  '/prompts',
  '/pull-requests',
  '/search',
  // '/skills',
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

  const isBetaRoute = BETA_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const isPublicRoute = PUBLIC_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!token && !isPublicRoute) {
    const message = `🚨 authMiddleware: no token + non-public route`;
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

  if (!isProd) {
    console.log('🔒 authMiddleware', { pathname, token });
  }
};
