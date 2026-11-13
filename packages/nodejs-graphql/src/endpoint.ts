/**
 * @description Base URL for openthrottle-server. Use in loaders/actions (server).
 * Reads `API_URL_INTERNAL` from the environment (base URL without a trailing
 * `/graphql`; this helper appends `/graphql`) and throws when it is unset.
 * @public
 */
export function getGraphQLUrl(): string {
  const url = process.env.API_URL_INTERNAL;

  if (!url) {
    throw new Error('API_URL_INTERNAL is not set');
  }

  const cleaned = url.replace(/\/$/, '');

  return `${cleaned}/graphql`;
}

/**
 * @description Read the bearer auth token for V1's `executeGraphqlV2` from the
 * environment. Returns the value of the `API_TOKEN` env var, or `undefined`
 * when it is unset (the request is then sent without an `Authorization`
 * header). Callers may override this by passing `options.token`.
 */
export function getGraphQLToken(): string | undefined {
  const token = process.env.API_TOKEN;

  return token;
}
