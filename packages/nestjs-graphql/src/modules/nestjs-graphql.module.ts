import type { ApolloServerPlugin, BaseContext } from '@apollo/server';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
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
import { createFormatError } from '../config/format-error';
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

/**
 * Choose the Apollo landing page explicitly instead of relying on implicit
 * NODE_ENV behavior. In Apollo Server 4/5 the legacy `playground` flag is a
 * dead no-op; the served landing page is otherwise picked by NODE_ENV. We pin
 * it here so it is intentional and auditable: the embedded Apollo Sandbox
 * (with introspection) in non-production, and the minimal production landing
 * page (no embedded explorer) in production.
 */
function createLandingPagePlugin(): ApolloServerPlugin<BaseContext> {
  return process.env.NODE_ENV === 'production'
    ? ApolloServerPluginLandingPageProductionDefault()
    : ApolloServerPluginLandingPageLocalDefault();
}

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

  /**
   * Sanitize errors before they reach the client. Apollo only masks stack
   * traces in production, and never scrubs arbitrary `extensions`, so without
   * this an unhandled resolver/DB error leaks internals (SQL text, file paths,
   * `extensions.exception`/stacktrace, the raw Error message). The default
   * strips those, and in production replaces unhandled (`INTERNAL_SERVER_ERROR`)
   * messages with a generic string while logging the original server-side.
   * forRoot callers can override by passing their own `formatError`.
   */
  formatError: createFormatError(new LoggerService()),
  // Introspection lets clients dump the entire schema. Keep it on in non-prod
  // for codegen/devtools, but off in production unless a forRoot caller
  // explicitly overrides it. GRAPHQL_INTROSPECTION=true force-enables it.
  introspection:
    process.env.GRAPHQL_INTROSPECTION === 'true' ||
    process.env.NODE_ENV !== 'production',

  /**
   * Pin the landing page explicitly. The legacy `playground` flag does nothing
   * in Apollo Server 4/5, so relying on it gave a false sense the editor was
   * controlled. Sandbox locally, minimal production page in prod. Always merged
   * ahead of caller plugins so a forRoot caller can still override it.
   */
  plugins: [createLandingPagePlugin()],

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
