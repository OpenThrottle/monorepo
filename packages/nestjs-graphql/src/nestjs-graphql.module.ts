import { ApolloDriverConfig } from '@nestjs/apollo';
import { DynamicModule, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { getRedisCache } from '@openthrottle/nestjs-redis';

import { DEFAULT_DRIVER_CONFIG } from './nestjs-graphql.constants.ts';
import type { NestjsGraphqlModuleOptions } from './nestjs-graphql.types.ts';
import { buildDriverConfig } from './nestjs-graphql.utils.ts';
import { resolveAutoSchemaFile } from './schema/auto-schema-file/auto-schema-file.utils.ts';

/**
 * NestJS dynamic module wiring Apollo GraphQL (HTTP + graphql-ws subscriptions)
 * with secure defaults: error sanitization, query-depth limiting, pinned landing
 * page, CSRF prevention, ws connection auth, and opt-in Apollo cache plugins.
 *
 * @public
 */
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
          autoSchemaFile: resolveAutoSchemaFile(),
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
