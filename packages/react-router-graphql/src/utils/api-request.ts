import { getGraphQLUrl } from '@openthrottle/nodejs-graphql';
import { getAuthTokenFromCookie } from '@openthrottle/react-router-auth';

/**
 * @description Base URL of openthrottle-server for REST proxies (the
 * `API_URL_INTERNAL` origin, without the `/graphql` suffix). Server-only: throws
 * when `API_URL_INTERNAL` is unset, like {@link executeGraphqlWithAuth}.
 *
 * @public
 */
export const getApiBaseUrl = (): string => {
  return getGraphQLUrl().replace(/\/graphql$/, '');
};

/**
 * @description The bearer token of a request's auth cookie, read the same way
 * {@link executeGraphqlWithAuth} reads it, or null when the caller has none.
 *
 * @public
 */
export const getRequestAuthToken = (request: Request): string | null => {
  return getAuthTokenFromCookie(request.headers.get('cookie') ?? '');
};
