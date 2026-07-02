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
  '/skills',
];

const PUBLIC_ROUTE_PREFIXES = ['/about', '/auth', '/legal'];

/**
 * Server-side Authentication Middleware
 */
export const authMiddleware: MiddlewareFunction = (args) => {
  const { request, url } = args;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);
  const isBetaEnabled = process.env.FEATURE_BETA_PREVIEW === 'true';

  const isBetaRoute = BETA_ROUTE_PREFIXES.some(
    (p) => url.pathname === p || url.pathname.startsWith(`${p}/`),
  );

  const isPublicRoute = PUBLIC_ROUTE_PREFIXES.some(
    (p) => url.pathname === p || url.pathname.startsWith(`${p}/`),
  );

  if (!token && !isPublicRoute) {
    throw redirect('/auth', {
      headers: { 'Set-Cookie': getClearAuthCookieHeader() },
    });
  }

  if (isBetaRoute && !isBetaEnabled) {
    throw redirect('/dashboard');
  }

  // console.log('🔒 authMiddleware: token found', token);
};
