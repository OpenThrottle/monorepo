/**
 * @description The CMS auth routes, and the query parameter that carries where to go after
 * signing in.
 */
export const AUTH_ROUTES = {
  redirectParam: 'redirectTo',
  signIn: '/auth/sign-in',
  signOut: '/auth/sign-out',
} as const;
