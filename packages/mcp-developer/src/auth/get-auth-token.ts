/**
 * @description Resolves the auth token for GraphQL requests (executeGraphqlWithAuth).
 * Source: environment variable MCP_DEVELOPER_AUTH_TOKEN; optional override via {@link setAuthTokenOverride}.
 */

let authTokenOverride: string | undefined;

/**
 * @description Optional override for the auth token (e.g. tests or host injection at server init). When set, {@link getAuthToken} returns this instead of reading env.
 */
export function setAuthTokenOverride(token: string | undefined): void {
  authTokenOverride = token;
}

/**
 * @description Reads auth token from override (if set) or from env MCP_DEVELOPER_AUTH_TOKEN. Throws if missing so callers do not send an empty Bearer header.
 * @returns The token to pass to executeGraphqlWithAuth.
 * @throws Error when no token is configured (message instructs setting env var).
 */
export function getAuthToken(): string {
  const token = authTokenOverride ?? process.env.MCP_DEVELOPER_AUTH_TOKEN;

  const trimmed = typeof token === 'string' ? token.trim() : '';

  if (trimmed === '') {
    throw new Error(
      'Auth token required for OpenThrottle (OT) GraphQL. Set MCP_DEVELOPER_AUTH_TOKEN in the environment (e.g. in your MCP server config).',
    );
  }

  return trimmed;
}
