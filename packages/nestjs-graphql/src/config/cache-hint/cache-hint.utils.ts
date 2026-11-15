import type { ApolloServerPlugin, BaseContext } from '@apollo/server';
import type { GraphQLResolveInfo } from 'graphql';

import { CACHE_HINT_EXTENSION_KEY } from './cache-hint.constants.ts';
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

/** Structural guard for a hint read back out of field `extensions`. */
function isCacheHint(value: unknown): value is CacheHint {
  return (
    typeof value === 'object' &&
    value !== null &&
    'maxAge' in value &&
    typeof value.maxAge === 'number' &&
    'scope' in value &&
    (value.scope === 'PRIVATE' || value.scope === 'PUBLIC')
  );
}

/** The hint `@CacheHint` stored on the field being resolved, if any. */
function readCacheHintExtension(
  info: GraphQLResolveInfo,
): CacheHint | undefined {
  const field = info.parentType.getFields()[info.fieldName];
  const value: unknown = field?.extensions[CACHE_HINT_EXTENSION_KEY];

  return isCacheHint(value) ? value : undefined;
}

/**
 * @description Set a cache-control hint on the field being resolved. Apollo
 * computes an operation's policy as the minimum over its fields, and a field
 * returning an object type defaults to `maxAge: 0`, so a root field and every
 * object-typed child it returns each need a hint for the response to be
 * cacheable. A no-op when the cache-control plugin is not installed.
 *
 * Use this when the hint is computed at resolve time (from the result, or from
 * the user). For a hint known at declaration time, the `@CacheHint` decorator
 * does the same thing without an `@Info()` parameter.
 *
 * @public
 */
export function setCacheHint(info: GraphQLResolveInfo, hint: CacheHint): void {
  const cacheControl: unknown = Reflect.get(info, 'cacheControl');

  if (isResolveInfoCacheControl(cacheControl)) {
    cacheControl.setCacheHint(hint);
  }
}

/**
 * @description The Apollo plugin behind `@CacheHint`: for each field it reads
 * the declared hint and hands it to {@link setCacheHint}. Apollo runs
 * `willResolveField` hooks in REVERSE plugin order, so this plugin must be
 * listed BEFORE `ApolloServerPluginCacheControl`, or the `info.cacheControl`
 * that plugin installs does not exist yet and every hint is silently dropped.
 * `buildCachePlugins` registers it in that position.
 */
export function createCacheHintPlugin(): ApolloServerPlugin<BaseContext> {
  return {
    requestDidStart: () => {
      return Promise.resolve({
        executionDidStart: () => {
          return Promise.resolve({
            willResolveField: ({ info }) => {
              const hint = readCacheHintExtension(info);

              if (hint !== undefined) {
                setCacheHint(info, hint);
              }
            },
          });
        },
      });
    },
  };
}
