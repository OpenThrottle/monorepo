import { AUTH_ROUTES } from '~/routing/auth/data/data.routes';

/**
 * @description Where to send someone after signing in: `value` when it is a same-origin path
 * (`/fragments/…`), otherwise `/`. Refuses absolute and protocol-relative URLs (`//evil.test`,
 * `/\evil.test`) so the sign-in form cannot be used as an open redirect, and never sends you back
 * to an auth route.
 */
export const getSafeRedirect = (value: unknown): string => {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return '/';
  }

  const isProtocolRelative = value.startsWith('//') || value.startsWith('/\\');
  const isAuthRoute = value.startsWith('/auth');

  return isProtocolRelative || isAuthRoute ? '/' : value;
};

/**
 * @description The sign-in route, returning to `path` (a pathname plus search) afterwards.
 */
export const getSignInHref = (path: string): string => {
  const search = new URLSearchParams({ [AUTH_ROUTES.redirectParam]: path });

  return `${AUTH_ROUTES.signIn}?${search.toString()}`;
};
