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
import type { ValidationRule } from 'graphql';
import {
  ApolloServerPluginCacheControl,
  createResponseCachePlugin,
  type ApolloServerPluginCacheControlOptions,
  type ApolloServerPluginResponseCacheOptions,
} from '../config/nestjs-graphql.plugins';
import { createQueryDepthLimitRule } from '../config/query-depth-limit';
import { createGraphqlWsOnConnect } from '../subscriptions/graphql-ws-auth';

/**
 * Default maximum query nesting depth. Deeply-nested/recursive queries can fan
 * out into an expensive resolver storm (DoS), so we cap depth at the validation
 * stage by default. Override per-app via NestjsGraphqlModuleOptions.maxDepth;
 * set maxDepth to 0 (or a negative value) to disable depth limiting entirely.
 */
const DEFAULT_MAX_DEPTH = 12;

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
  /**
   * Maximum allowed query nesting depth (DoS guard). Applied as a GraphQL
   * validation rule before resolvers run. Defaults to DEFAULT_MAX_DEPTH;
   * set to 0 or a negative number to disable depth limiting.
   */
  maxDepth?: number;
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

  // DoS guard: cap query nesting depth at the validation stage by default.
  // forRoot callers can raise/lower it via maxDepth, or disable with maxDepth<=0.
  validationRules: [createQueryDepthLimitRule(DEFAULT_MAX_DEPTH)],
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

function buildDriverConfig(
  options: NestjsGraphqlModuleOptions,
): ApolloDriverConfig {
  const {
    cachePlugins: cacheOpts,
    maxDepth,
    plugins: userPlugins,
    validationRules: userRules,
    ...rest
  } = options;
  const base = { ...DEFAULT_DRIVER_CONFIG, ...rest };

  base.validationRules = buildValidationRules(maxDepth, userRules);

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
