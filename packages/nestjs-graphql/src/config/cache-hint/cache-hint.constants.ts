/**
 * The GraphQL field `extensions` key `@CacheHint` writes and the cache-hint
 * plugin reads. Field extensions never reach the printed SDL, so a hint leaves
 * the committed `schema.gql` untouched.
 */
export const CACHE_HINT_EXTENSION_KEY = 'openthrottleCacheHint';
