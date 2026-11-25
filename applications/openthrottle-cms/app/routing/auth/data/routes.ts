/**
 * @description The CMS auth routes. The query parameter that carries where to go after signing in
 * is the shared `REDIRECT_URL_PARAM` from `@openthrottle/react-router-auth`.
 */
export const AUTH_ROUTES = {
  signIn: '/auth/sign-in',
  signOut: '/auth/sign-out',
} as const;

export type AuthRoutesKey = keyof typeof AUTH_ROUTES;
export type AuthRoutesValue = (typeof AUTH_ROUTES)[AuthRoutesKey];
