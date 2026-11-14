import type { GraphQLResolveInfo } from 'graphql';

import type { CacheHint, ResolveInfoCacheControl } from './cache-hint.types.ts';

/** Structural guard for Apollo's `info.cacheControl` (absent without the plugin). */
function isResolveInfoCacheControl(
  value: unknown,
): value is ResolveInfoCacheControl {
  return (
    typeof value === 'object' &&
    value !== null &&
    'setCacheHint' in value &&
    typeof value.setCacheHint === 'function'
  );
}

/**
 * @description Set a cache-control hint on the field being resolved. Apollo
 * computes an operation's policy as the minimum over its fields, and a field
 * returning an object type defaults to `maxAge: 0`, so a root field and every
 * object-typed child it returns each need a hint for the response to be
 * cacheable. A no-op when the cache-control plugin is not installed.
 *
 * @public
 */
export function setCacheHint(info: GraphQLResolveInfo, hint: CacheHint): void {
  const cacheControl: unknown = Reflect.get(info, 'cacheControl');

  if (isResolveInfoCacheControl(cacheControl)) {
    cacheControl.setCacheHint(hint);
  }
}
