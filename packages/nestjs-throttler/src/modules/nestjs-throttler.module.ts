import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  ThrottlerModule,
  type ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { GqlThrottlerGuard } from '../guards/gql-throttler.guard';
import {
  applyNestjsThrottlerModuleDefaults,
  type NestjsThrottlerModuleAsyncOptions,
  type NestjsThrottlerModuleOptions,
  parseNestjsThrottlerModuleOptions,
  type ResolvedNestjsThrottlerModuleOptions,
  validateNestjsThrottlerModuleOptions,
} from '../config/nestjs-throttler.options';

const toThrottlerModuleOptions = (
  resolved: ResolvedNestjsThrottlerModuleOptions,
): ThrottlerModuleOptions => ({
  throttlers: resolved.throttlers.map((tier) => ({
    limit: tier.limit,
    ...(tier.name === undefined ? {} : { name: tier.name }),
    ttl: tier.ttl,
  })),
});

/**
 * @external https://docs.nestjs.com/security/rate-limiting
 * @description This module is used to throttle requests to the API.
 *
 * Binds {@link ThrottlerGuard} as a global guard (`APP_GUARD`) so importing
 * this module actually enforces the configured rate limit rather than only
 * providing config + storage.
 *
 * Importing the class directly (`imports: [NestjsThrottlerModule]`) applies the
 * default tier (10 requests / 60s). Use {@link NestjsThrottlerModule.forRoot} or
 * {@link NestjsThrottlerModule.forRootAsync} to configure tiers from config.
 */
@Module({
  controllers: [],
  exports: [ThrottlerModule],
  imports: [
    ThrottlerModule.forRoot(
      toThrottlerModuleOptions(applyNestjsThrottlerModuleDefaults({})),
    ),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
})
export class NestjsThrottlerModule {
  /**
   * @description Register the throttler with static options (validated, defaults applied).
   */
  static forRoot(options: NestjsThrottlerModuleOptions = {}): DynamicModule {
    validateNestjsThrottlerModuleOptions(options);
    const resolved = applyNestjsThrottlerModuleDefaults(options);

    return {
      exports: [ThrottlerModule],
      global: options.isGlobal === true,
      imports: [ThrottlerModule.forRoot(toThrottlerModuleOptions(resolved))],
      module: NestjsThrottlerModule,
      providers: [
        {
          provide: APP_GUARD,
          useClass: GqlThrottlerGuard,
        },
      ],
    };
  }

  /**
   * @description Register the throttler when options come from ConfigService or another async factory.
   */
  static forRootAsync(
    options: NestjsThrottlerModuleAsyncOptions,
  ): DynamicModule {
    return {
      exports: [ThrottlerModule],
      global: options.isGlobal === true,
      imports: [
        ThrottlerModule.forRootAsync({
          imports: options.imports ?? [],
          inject: options.inject ?? [],
          useFactory: async (
            ...args: Parameters<
              NonNullable<NestjsThrottlerModuleAsyncOptions['useFactory']>
            >
          ) => {
            const raw: unknown = await options.useFactory(...args);

            return toThrottlerModuleOptions(
              applyNestjsThrottlerModuleDefaults(
                parseNestjsThrottlerModuleOptions(raw),
              ),
            );
          },
        }),
      ],
      module: NestjsThrottlerModule,
      providers: [
        {
          provide: APP_GUARD,
          useClass: GqlThrottlerGuard,
        },
      ],
    };
  }
}
