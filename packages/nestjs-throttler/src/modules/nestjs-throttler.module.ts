import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  ThrottlerModule,
  type ThrottlerModuleOptions,
} from '@nestjs/throttler';

import type {
  NestjsThrottlerModuleAsyncOptions,
  NestjsThrottlerModuleOptions,
  ResolvedNestjsThrottlerModuleOptions,
} from '../config/nestjs-throttler.options';
import {
  applyNestjsThrottlerModuleDefaults,
  parseNestjsThrottlerModuleOptions,
  validateNestjsThrottlerModuleOptions,
} from '../config/nestjs-throttler.options';
import { GqlThrottlerGuard } from '../guards/gql-throttler.guard';

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
 * @description Host module for {@link NestjsThrottlerModule.forRoot} /
 * {@link NestjsThrottlerModule.forRootAsync}.
 *
 * Deliberately carries EMPTY decorator metadata, and exists only so the dynamic
 * registrations have a module to attach to that is not `NestjsThrottlerModule`.
 *
 * Nest MERGES a `DynamicModule` into its `module` class's own `@Module`
 * metadata. `NestjsThrottlerModule` statically imports
 * `ThrottlerModule.forRoot(<defaults>)` so a direct `imports: [NestjsThrottlerModule]`
 * works without a call — so returning `{ module: NestjsThrottlerModule }` from
 * `forRoot` produced TWO `ThrottlerModule.forRoot` registrations, and the
 * static default tier won over the caller's. Under NestJS 11 the caller's tiers
 * still took effect; under 12 they silently do not, so `forRoot({ limit: 3 })`
 * quietly kept serving the 1,000-request default and never returned 429.
 *
 * Pointing the dynamic path at its own class means no merge, so there is
 * exactly one registration whichever entry point a consumer uses.
 */
@Module({})
class NestjsThrottlerRootModule {}

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
      module: NestjsThrottlerRootModule,
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
      module: NestjsThrottlerRootModule,
      providers: [
        {
          provide: APP_GUARD,
          useClass: GqlThrottlerGuard,
        },
      ],
    };
  }
}
