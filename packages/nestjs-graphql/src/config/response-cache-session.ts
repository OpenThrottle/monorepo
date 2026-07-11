/**
 * @description Default `sessionId` partition key for the Apollo response-cache
 * plugin.
 *
 * The response cache must isolate per-caller so one user never serves another
 * user's authorized response from cache. The naive approach keys on the raw
 * `Authorization` header, which embeds the full bearer token in every Redis
 * cache key (token-at-rest exposure) and silently busts the cache on token
 * rotation. This helper instead derives a stable, opaque key:
 *
 *  - When the resolved GraphQL `contextValue` already carries a verified
 *    `userId` (the JWT `sub`, established by the HTTP auth guard or the
 *    graphql-ws `onConnect` handshake), the key is a SHA-256 hash of that id.
 *    The key survives token rotation and never embeds the token.
 *  - Otherwise it falls back to a SHA-256 hash of the `Authorization` header so
 *    callers are still partitioned, but the raw token is never written to the
 *    cache key. The header is still hashed (not stored verbatim).
 *  - Anonymous (no identity, no header) returns `null` — shared public cache.
 */

import type { BaseContext } from '@apollo/server';
import { createHash } from 'node:crypto';

/** Namespacing prefixes so a user-id key can never collide with a header key. */
const USER_KEY_PREFIX = 'u:';
const HEADER_KEY_PREFIX = 'h:';

/**
 * Minimal structural subset of Apollo's `GraphQLRequestContext` this helper
 * reads: the resolved context value and the optional HTTP request headers. A
 * full `GraphQLRequestContext<TContext>` is assignable to this, so the helper
 * is usable directly as the plugin's `sessionId` without a cast, while tests can
 * construct a fixture without standing up the entire request-context surface.
 */
export interface ResponseCacheSessionRequestContext<
  TContext extends BaseContext,
> {
  readonly contextValue: TContext;
  readonly request: {
    readonly http?: {
      readonly headers?: { get(name: string): string | null | undefined };
    };
  };
}

/** SHA-256 hex digest of an arbitrary string (opaque, fixed-length, stable). */
function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Read a verified `userId` off the resolved context value, if present and a
 * non-empty string. Returns `undefined` when the context carries no identity.
 * `BaseContext` is an opaque `{}`, so we narrow with an `in` check and read the
 * field structurally rather than asserting a concrete context shape.
 */
function resolveContextUserId(contextValue: BaseContext): string | undefined {
  if (!('userId' in contextValue)) {
    return undefined;
  }

  const candidate: unknown = contextValue.userId;
  return typeof candidate === 'string' && candidate.length > 0
    ? candidate
    : undefined;
}

/**
 * @description Build a response-cache `sessionId` from the verified user id when
 * available, falling back to a hashed `Authorization` header. The returned value
 * is always opaque (hashed) so no raw token is ever embedded in a cache key, and
 * the user-id-derived key is stable across token rotation. Returns `null` for
 * anonymous requests so they share the public cache partition.
 *
 * @public
 */
export async function defaultResponseCacheSessionId<
  TContext extends BaseContext,
>(
  requestContext: ResponseCacheSessionRequestContext<TContext>,
): Promise<string | null> {
  const userId = resolveContextUserId(requestContext.contextValue);
  if (userId) {
    return `${USER_KEY_PREFIX}${sha256(userId)}`;
  }

  const header = requestContext.request.http?.headers?.get('authorization');
  if (header) {
    return `${HEADER_KEY_PREFIX}${sha256(header)}`;
  }

  return null;
}
