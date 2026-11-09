import type { ApolloServerPlugin } from '@apollo/server';
import type { BaseContext } from '@apollo/server';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloDriver } from '@nestjs/apollo';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  HEADER_APP_NAME,
  HEADER_APP_VERSION,
} from '@openthrottle/nestjs-utils';

import { createFormatError } from './config/format-error/format-error.utils.ts';
import { createQueryDepthLimitRule } from './config/query-depth-limit/query-depth-limit.utils.ts';
import { createGraphqlWsOnConnect } from './subscriptions/graphql-ws-auth/graphql-ws-auth.utils.ts';
/**
 * Default maximum query nesting depth. Deeply-nested/recursive queries can fan
 * out into an expensive resolver storm (DoS), so we cap depth at the validation
 * stage by default. Override per-app via NestjsGraphqlModuleOptions.maxDepth;
 * set maxDepth to 0 (or a negative value) to disable depth limiting entirely.
 */
export const DEFAULT_MAX_DEPTH = 12;
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

/**
 * No `autoSchemaFile` here: it is resolved when `forRoot` runs (see
 * `resolveAutoSchemaFile`), so a boot keeps the schema in memory and the
 * `graphql-schema` command can name a file before the app module is imported.
 */
export const DEFAULT_DRIVER_CONFIG: ApolloDriverConfig = {
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

  /**
   * Introspection lets clients dump the entire schema. Keep it on in non-prod
   * for codegen/devtools, but off in production unless a forRoot caller
   * explicitly overrides it. GRAPHQL_INTROSPECTION=true force-enables it.
   */
  introspection:
    process.env.GRAPHQL_INTROSPECTION === 'true' ||
    process.env.NODE_ENV !== 'production',

  /**
   * Disable the `@nestjs/apollo` driver's own landing page. The driver always
   * appends one landing-page plugin to `plugins` based on `playground`: with
   * `playground` unset it adds the legacy GraphQL Playground in non-production,
   * which then collides with our pinned plugin below ("Only one plugin can
   * implement renderLandingPage"). Setting `playground: false` makes the driver
   * append the no-op `ApolloServerPluginLandingPageDisabled` marker instead (it
   * has no renderLandingPage hook), leaving our pinned plugin as the single
   * landing page in every NODE_ENV.
   */
  playground: false,

  /**
   * Pin the landing page explicitly: the embedded Apollo Sandbox (with
   * introspection) in non-production, and the minimal production landing page in
   * prod. Always merged ahead of caller plugins so a forRoot caller can still
   * override it.
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

  /**
   * DoS guard: cap query nesting depth at the validation stage by default.
   * forRoot callers can raise/lower it via maxDepth, or disable with maxDepth<=0.
   */
  validationRules: [createQueryDepthLimitRule(DEFAULT_MAX_DEPTH)],
};
