import { Extensions } from '@nestjs/graphql';

import { CACHE_HINT_EXTENSION_KEY } from './cache-hint.constants.ts';
import type { CacheHint as CacheHintShape } from './cache-hint.types.ts';

/**
 * A per-field cache hint, as Apollo's cache-control plugin accepts it. Declared
 * here, merging with the decorator below, so one `CacheHint` export names both
 * the hint type and the decorator that applies it.
 *
 * @public
 */
export interface CacheHint extends CacheHintShape {}

/**
 * @description Declare a static cache-control hint on a GraphQL field. Put it on
 * a root `@Query` method, or on the `@Field` property of an object type for an
 * object-typed child field (those default to `maxAge: 0`, so each one needs its
 * own hint). The hint is stored in the field's `extensions` and applied at
 * resolve time through {@link setCacheHint}, so the two behave identically,
 * including the no-op when the cache-control plugin is not installed.
 *
 * Use `@CacheHint` when the hint is known at declaration time. Use
 * `setCacheHint(info, hint)` when it is computed while resolving (from the
 * result, or from the user).
 *
 * Takes effect only under `cachePlugins.cacheControl`, which also registers the
 * plugin that reads it. On a `@ResolveField` whose object type already declares
 * an `@Field` of that name, Nest keeps the model field's extensions and drops
 * the resolver method's, so hint the `@Field` instead.
 *
 * @example
 * ```ts
 * @Query(() => DiscoverLocalModelsResult)
 * @CacheHint({ maxAge: 60, scope: 'PRIVATE' })
 * discoverLocalModels(): Promise<DiscoverLocalModelsResult> { ... }
 * ```
 *
 * @public
 */
export const CacheHint = (
  hint: CacheHint,
): MethodDecorator & PropertyDecorator => {
  return Extensions({ [CACHE_HINT_EXTENSION_KEY]: hint });
};
