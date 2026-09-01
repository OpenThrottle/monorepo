/**
 * @description Re-exports Apollo Server cache plugins for use by NestJS + GraphQL apps.
 * Use {@link ApolloServerPluginCacheControl} for Cache-Control header and hint calculation;
 * use {@link createResponseCachePlugin} to create a full response-cache plugin with optional sessionId.
 *
 * ⚠️ `ApolloServerPluginCacheControl`'s `defaultMaxAge` is 0 and Apollo takes an
 * operation's cache policy from its MOST RESTRICTIVE field. One field that never
 * calls `setCacheHint` therefore makes an entire document uncacheable, silently —
 * no error, no warning, just a query that is always slow. A short hint is equally
 * contagious: a 30s field caps a 1h operation at 30s.
 *
 * Every field in a cacheable document must be hinted. See `GithubResolver` in
 * `@openthrottle/nestjs-github` for the reference pattern and its regression test.
 * Read the `Cache-Control` response header to check a real operation: `no-store`
 * means it is not being stored. A global `defaultMaxAge` is deliberately NOT set —
 * it would cache operations whose authors never opted in. See the package README.
 */

/** @public */
export {
  type ApolloServerPluginCacheControlOptions,
  ApolloServerPluginCacheControl,
} from '@apollo/server/plugin/cacheControl';

/** @public */
export {
  default as createResponseCachePlugin,
  type ApolloServerPluginResponseCacheOptions,
} from '@apollo/server-plugin-response-cache';
