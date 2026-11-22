/**
 * @description Learns an opaque OAuth access token's scopes by asking the API
 * (`viewerOAuthScopes`, authenticated with the token itself), cached briefly per token so
 * a burst of tool calls costs one round trip. Keys are SHA-256 hashes, never the token.
 */
import { createHash } from 'node:crypto';

/**
 * @description Returns the token's scopes, or null when the API did not recognise it as an
 * OAuth token or could not be reached (the API enforces scopes itself, so null fails open
 * to the server's check rather than blocking).
 * @public
 */
export type OAuthScopeLookup = (
  token: string,
) => Promise<readonly string[] | null>;

/**
 * @description Options for {@link createOAuthScopeLookup}.
 * @public
 */
export interface CreateOAuthScopeLookupOptions {
  readonly fetchScopes: (token: string) => Promise<readonly string[] | null>;
  readonly maxEntries: number;
  readonly now: () => number;
  readonly ttlMs: number;
}

interface CacheEntry {
  readonly expiresAt: number;
  readonly scopes: readonly string[] | null;
}

/**
 * @description Builds a cached lookup. Failures are not cached.
 * @public
 */
export const createOAuthScopeLookup = (
  options: CreateOAuthScopeLookupOptions,
): OAuthScopeLookup => {
  const cache = new Map<string, CacheEntry>();

  return async (token) => {
    const key = createHash('sha256').update(token).digest('hex');
    const at = options.now();
    const hit = cache.get(key);
    if (hit !== undefined && hit.expiresAt > at) {
      return hit.scopes;
    }

    let scopes: readonly string[] | null;
    try {
      scopes = await options.fetchScopes(token);
    } catch {
      return null;
    }

    if (cache.size >= options.maxEntries) {
      cache.clear();
    }
    cache.set(key, { expiresAt: at + options.ttlMs, scopes });
    return scopes;
  };
};
