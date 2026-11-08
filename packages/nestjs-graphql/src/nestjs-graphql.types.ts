import type { BaseContext } from '@apollo/server';
import type { ApolloServerPluginCacheControlOptions } from '@apollo/server/plugin/cacheControl';
import type { ApolloServerPluginResponseCacheOptions } from '@apollo/server-plugin-response-cache';
import type { ApolloDriverConfig } from '@nestjs/apollo';

/**
 * Opt-in cache configuration for NestjsGraphqlModule.forRoot().
 *
 * @public
 */
export interface NestjsGraphqlCacheOptions {
  /** Enable or configure Cache-Control plugin. Default options used when true. */
  cacheControl?: boolean | ApolloServerPluginCacheControlOptions;
  /** Enable or configure response-cache plugin (e.g. sessionId from request). */
  responseCache?: boolean | ApolloServerPluginResponseCacheOptions<BaseContext>;
}

/**
 * Options for NestjsGraphqlModule.forRoot(); extends ApolloDriverConfig with optional cache plugins.
 *
 * @public
 */
export interface NestjsGraphqlModuleOptions extends Omit<
  ApolloDriverConfig,
  'plugins'
> {
  /** Optional Apollo cache plugins (CacheControl + response-cache). Omit for no caching. */
  cachePlugins?: NestjsGraphqlCacheOptions;
  /**
   * Maximum allowed query nesting depth (DoS guard). Applied as a GraphQL
   * validation rule before resolvers run. Defaults to DEFAULT_MAX_DEPTH;
   * set to 0 or a negative number to disable depth limiting.
   */
  maxDepth?: number;
  /** Additional Apollo plugins (merged after cache plugins when cachePlugins is set). */
  plugins?: ApolloDriverConfig['plugins'];
}
