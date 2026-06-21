/**
 * @description Re-exports Apollo Server cache plugins for use by NestJS + GraphQL apps.
 * Use {@link ApolloServerPluginCacheControl} for Cache-Control header and hint calculation;
 * use {@link createResponseCachePlugin} to create a full response-cache plugin with optional sessionId.
 */

/** @publicApi */
export {
  type ApolloServerPluginCacheControlOptions,
  ApolloServerPluginCacheControl,
} from '@apollo/server/plugin/cacheControl';

/** @publicApi */
export {
  default as createResponseCachePlugin,
  type ApolloServerPluginResponseCacheOptions,
} from '@apollo/server-plugin-response-cache';
