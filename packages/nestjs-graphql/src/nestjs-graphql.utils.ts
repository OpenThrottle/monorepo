import type { BaseContext } from '@apollo/server';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import type { ApolloServerPluginResponseCacheOptions } from '@apollo/server-plugin-response-cache';
import createResponseCachePlugin from '@apollo/server-plugin-response-cache';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import type { ValidationRule } from 'graphql';

import { createQueryDepthLimitRule } from './config/query-depth-limit/query-depth-limit.utils.ts';
import { defaultResponseCacheSessionId } from './config/response-cache-session/response-cache-session.utils.ts';
import { DEFAULT_DRIVER_CONFIG } from './nestjs-graphql.constants.ts';
import { DEFAULT_MAX_DEPTH } from './nestjs-graphql.constants.ts';
import type {
  NestjsGraphqlCacheOptions,
  NestjsGraphqlModuleOptions,
} from './nestjs-graphql.types.ts';
import { resolveAutoSchemaFile } from './schema/auto-schema-file/auto-schema-file.utils.ts';

/**
 * Deep-merge the security-sensitive nested config blocks (`subscriptions`,
 * `csrfPrevention`) so a caller overriding one nested field can't silently drop
 * a secure default. The plain spread in `buildDriverConfig` shallow-replaces
 * these whole objects, which would, e.g., wipe the default graphql-ws
 * `onConnect` auth (fail-open) if a caller set `subscriptions` only to add a
 * path. Per-key merge keeps the defaults the caller didn't explicitly override.
 */
function mergeSecureDefaults(
  base: ApolloDriverConfig,
  rest: Partial<ApolloDriverConfig>,
): void {
  if (rest.subscriptions !== undefined) {
    const defaultSubscriptions = DEFAULT_DRIVER_CONFIG.subscriptions ?? {};
    const merged: NonNullable<ApolloDriverConfig['subscriptions']> = {
      ...defaultSubscriptions,
      ...rest.subscriptions,
    };

    // Deep-merge the graphql-ws block only when the caller passed an object, so
    // adding (e.g.) a `path` keeps the default `onConnect` auth rather than
    // silently dropping it (fail-open). An explicit boolean enable/disable from
    // the caller is respected as-is.
    const defaultWs = defaultSubscriptions['graphql-ws'];
    const callerWs = rest.subscriptions['graphql-ws'];

    if (typeof callerWs === 'object' && typeof defaultWs === 'object') {
      merged['graphql-ws'] = { ...defaultWs, ...callerWs };
    }

    base.subscriptions = merged;
  }

  if (rest.csrfPrevention !== undefined) {
    const defaultCsrf = DEFAULT_DRIVER_CONFIG.csrfPrevention;
    const callerCsrf = rest.csrfPrevention;

    if (typeof callerCsrf === 'object' && typeof defaultCsrf === 'object') {
      base.csrfPrevention = { ...defaultCsrf, ...callerCsrf };
    } else {
      base.csrfPrevention = callerCsrf;
    }
  }
}

/**
 * Build the validation-rules list: a depth-limit rule (using the caller's
 * maxDepth, or the safe default) plus any rules the caller passed through
 * `validationRules`. A maxDepth <= 0 disables depth limiting.
 */
function buildValidationRules(
  maxDepth: number | undefined,
  userRules: readonly ValidationRule[] | undefined,
): ValidationRule[] {
  const depth = maxDepth ?? DEFAULT_MAX_DEPTH;
  const rules: ValidationRule[] = [...(userRules ?? [])];

  if (depth > 0) {
    rules.push(createQueryDepthLimitRule(depth));
  }

  return rules;
}

/**
 * Expand `responseCache: true` into the default options (hashed user-id
 * sessionId); pass a caller-supplied options object through untouched.
 */
function resolveResponseCacheOptions(
  responseCache: true | ApolloServerPluginResponseCacheOptions<BaseContext>,
): ApolloServerPluginResponseCacheOptions<BaseContext> {
  if (responseCache === true) {
    return { sessionId: defaultResponseCacheSessionId };
  }

  return responseCache;
}

/**
 * Assemble the opt-in Apollo cache plugins (Cache-Control, then response-cache)
 * in a fixed order. Exported for unit testing of the assembly/order behavior;
 * not part of the package public API (no `@public`), so consume via forRoot.
 */
export function buildCachePlugins(
  cache: NestjsGraphqlCacheOptions,
): NonNullable<ApolloDriverConfig['plugins']> {
  const plugins: NonNullable<ApolloDriverConfig['plugins']> = [];

  if (cache.cacheControl) {
    plugins.push(
      ApolloServerPluginCacheControl(
        cache.cacheControl === true ? {} : cache.cacheControl,
      ),
    );
  }

  if (cache.responseCache) {
    // Default to a sessionId derived from the verified user id (hashed), not the
    // raw Authorization header — see defaultResponseCacheSessionId. Callers can
    // override by passing their own response-cache options object.
    plugins.push(
      createResponseCachePlugin(
        resolveResponseCacheOptions(cache.responseCache),
      ),
    );
  }

  return plugins;
}

/**
 * Merge a partial `forRoot` options object onto the secure DEFAULT_DRIVER_CONFIG,
 * preserving security-relevant defaults the caller didn't explicitly override.
 * Exported for unit testing of the default-preservation/merge behavior; not part
 * of the package public API (no `@public`), so consume via forRoot.
 */
export function buildDriverConfig(
  options: NestjsGraphqlModuleOptions,
): ApolloDriverConfig {
  const {
    cachePlugins: cacheOpts,
    maxDepth,
    plugins: userPlugins,
    validationRules: userRules,
    ...rest
  } = options;
  const base = {
    ...DEFAULT_DRIVER_CONFIG,
    autoSchemaFile: resolveAutoSchemaFile(),
    ...rest,
  };

  // Re-apply secure defaults for the nested blocks the shallow spread above
  // would have wholesale-replaced (notably the graphql-ws onConnect auth).
  mergeSecureDefaults(base, rest);

  base.validationRules = buildValidationRules(maxDepth, userRules);

  // Always keep the default plugins (e.g. the landing-page plugin) ahead of
  // any cache or caller-supplied plugins so behavior stays intentional unless
  // a caller deliberately overrides it later in the list.
  const defaultPlugins = DEFAULT_DRIVER_CONFIG.plugins ?? [];

  if (!cacheOpts) {
    base.plugins = [...defaultPlugins, ...(userPlugins ?? [])];

    return base;
  }

  const plugins = buildCachePlugins(cacheOpts);

  base.plugins = [...defaultPlugins, ...plugins, ...(userPlugins ?? [])];

  return base;
}
