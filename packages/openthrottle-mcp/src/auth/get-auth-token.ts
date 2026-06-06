/**
 * @description Resolves the auth token for GraphQL requests (executeGraphqlWithAuth).
 * Source: per-request store (see {@link withMcpDeveloperAuthToken}), then env MCP_DEVELOPER_AUTH_TOKEN.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export const requestAuthTokenStorage = new AsyncLocalStorage<string>();

/**
 * @description Runs fn with a request-scoped JWT for MCP tool handlers that call {@link getAuthToken}. Use when embedding tools in openthrottle-server so concurrent GraphQL requests do not share a global override. When token is empty, falls through to env.
 * @publicApi
 */
export function withMcpDeveloperAuthToken<T>(
  token: string | undefined,
  fn: () => T,
): T {
  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (trimmed === '') {
    return fn();
  }

  return requestAuthTokenStorage.run(trimmed, fn);
}

/**
 * @description Async variant of {@link withMcpDeveloperAuthToken}.
 * @publicApi
 */
export async function withMcpDeveloperAuthTokenAsync<T>(
  token: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (trimmed === '') {
    return fn();
  }

  return requestAuthTokenStorage.run(trimmed, fn);
}

/**
 * @description Reads auth token from per-request store (if any), then env MCP_DEVELOPER_AUTH_TOKEN. Throws if missing so callers do not send an empty Bearer header.
 * @returns The token to pass to executeGraphqlWithAuth.
 * @throws Error when no token is configured (message instructs setting env var).
 * @publicApi
 */
export function getAuthToken(): string {
  const fromRequest = requestAuthTokenStorage.getStore();
  if (fromRequest !== undefined && fromRequest !== '') {
    return fromRequest;
  }

  const token = process.env.MCP_DEVELOPER_AUTH_TOKEN;
  const trimmed = typeof token === 'string' ? token.trim() : '';

  if (trimmed === '') {
    throw new Error(
      'Auth token required for OpenThrottle (OT) GraphQL. Set MCP_DEVELOPER_AUTH_TOKEN in the environment (e.g. in your MCP server config).',
    );
  }

  return trimmed;
}
