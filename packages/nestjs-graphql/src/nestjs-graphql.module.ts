import type { BaseContext } from '@apollo/server';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import {
  ApolloServerPluginCacheControl,
  createResponseCachePlugin,
  type ApolloServerPluginCacheControlOptions,
  type ApolloServerPluginResponseCacheOptions,
} from './cache-plugins';

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
    requestHeaders: ['X-App-Name', 'X-App-Version'],
  },
  driver: ApolloDriver,
  introspection: true,
  playground: true,
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
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
        GraphQLModule.forRoot<ApolloDriverConfig>(config),
        LoggerModule,
      ],
      module: NestjsGraphqlModule,
      providers: [LoggerService],
    };
  }
}
