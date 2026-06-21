import type { BaseContext } from '@apollo/server';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { DynamicModule, Module } from '@nestjs/common';
import {
  HEADER_APP_NAME,
  HEADER_APP_VERSION,
} from '@openthrottle/nestjs-utils';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { getRedisCache } from '@openthrottle/nestjs-redis';
import {
  ApolloServerPluginCacheControl,
  createResponseCachePlugin,
  type ApolloServerPluginCacheControlOptions,
  type ApolloServerPluginResponseCacheOptions,
} from '../config/nestjs-graphql.plugins';
import { createGraphqlWsOnConnect } from '../subscriptions/graphql-ws-auth';

/** Opt-in cache configuration for NestjsGraphqlModule.forRoot(). */
export interface NestjsGraphqlCacheOptions {
  /** Enable or configure Cache-Control plugin. Default options used when true. */
  cacheControl?: boolean | ApolloServerPluginCacheControlOptions;
  /** Enable or configure response-cache plugin (e.g. sessionId from request). */
  responseCache?: boolean | ApolloServerPluginResponseCacheOptions<BaseContext>;
}

/** Options for NestjsGraphqlModule.forRoot(); extends ApolloDriverConfig with optional cache plugins. */
export interface NestjsGraphqlModuleOptions extends Omit<
  ApolloDriverConfig,
  'plugins'
> {
  /** Optional Apollo cache plugins (CacheControl + response-cache). Omit for no caching. */
  cachePlugins?: NestjsGraphqlCacheOptions;
  /** Additional Apollo plugins (merged after cache plugins when cachePlugins is set). */
  plugins?: ApolloDriverConfig['plugins'];
}

const DEFAULT_DRIVER_CONFIG: ApolloDriverConfig = {
  autoSchemaFile: 'schema.gql',
  csrfPrevention: {
    requestHeaders: [HEADER_APP_NAME, HEADER_APP_VERSION],
  },
  driver: ApolloDriver,
  // Introspection lets clients dump the entire schema. Keep it on in non-prod
  // for codegen/devtools, but off in production unless a forRoot caller
  // explicitly overrides it. GRAPHQL_INTROSPECTION=true force-enables it.
  introspection:
    process.env.GRAPHQL_INTROSPECTION === 'true' ||
    process.env.NODE_ENV !== 'production',
  playground: true,

  /**
   * graphql-ws subscription transport, served on the same HTTP server as the
   * GraphQL HTTP endpoint (path defaults to the GraphQL endpoint path). NestJS's
   * GraphQLModule owns the ws.Server lifecycle: it creates the graphql-ws server
   * on init and disposes it on module destroy (enableShutdownHooks drains it),
   * so no manual drainHttpServer plugin is required here.
   *
   * Connection auth: onConnect validates the client's connectionParams token
   * (same HS256 JWT as HTTP) and stashes the user id on the connection's `extra`.
   * The shared `context` callback reads it back via resolveGraphqlWsUserId so
   * resolvers get identity from context only. Connections without a valid token
   * are rejected (403 Forbidden) by default.
   */
  subscriptions: {
    'graphql-ws': {
      onConnect: createGraphqlWsOnConnect(),
    },
  },
};

function buildCachePlugins(
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
    const opts =
      cache.responseCache === true
        ? // FIXME: Swap out eventually

          ({
            sessionId: async (requestContext: {
              request: {
                http?: {
                  headers?: { get: (name: string) => string | undefined };
                };
              };
            }): Promise<string | null> => {
              const header =
                requestContext.request.http?.headers?.get('authorization');
              return header ?? null;
            },
          } as ApolloServerPluginResponseCacheOptions<BaseContext>)
        : cache.responseCache;

    plugins.push(createResponseCachePlugin(opts));
  }

  return plugins;
}

function buildDriverConfig(
  options: NestjsGraphqlModuleOptions,
): ApolloDriverConfig {
  const { cachePlugins: cacheOpts, plugins: userPlugins, ...rest } = options;
  const base = { ...DEFAULT_DRIVER_CONFIG, ...rest };

  if (!cacheOpts) {
    base.plugins = userPlugins;

    return base;
  }

  const plugins = buildCachePlugins(cacheOpts);

  base.plugins = [...plugins, ...(userPlugins ?? [])];

  return base;
}

@Module({
  controllers: [],
  exports: [],
  imports: [],
  providers: [LoggerService],
})
export class NestjsGraphqlModule {
  /**
   * Register the GraphQL module with optional config and opt-in cache plugins.
   * Use cachePlugins.cacheControl and/or cachePlugins.responseCache to enable Apollo cache plugins.
   */
  static forRoot(options?: NestjsGraphqlModuleOptions): DynamicModule {
    const config = options ? buildDriverConfig(options) : DEFAULT_DRIVER_CONFIG;

    return {
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          cache: getRedisCache(),
          ...config,
        }),
        LoggerModule,
      ],
      module: NestjsGraphqlModule,
      providers: [LoggerService],
    };
  }
}
