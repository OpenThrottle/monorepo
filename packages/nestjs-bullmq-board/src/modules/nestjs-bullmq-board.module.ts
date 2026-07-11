import basicAuth from 'express-basic-auth';
import { BullBoardModule } from '@bull-board/nestjs';
import { ConfigModule } from '@nestjs/config';
import { ExpressAdapter } from '@bull-board/express';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { DynamicModule, Module } from '@nestjs/common';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import type { ConfigType } from '@nestjs/config';
import {
  bullmqBoardConfig,
  configValidationSchema,
} from '../config/nestjs-bullmq-board.config';

/**
 * Single source of truth for whether the Bull Board dashboard should mount.
 *
 * The dashboard is internet-reachable and guarded only by a single shared
 * static basic-auth credential, so it must stay off in production. Both the
 * root opt-in ({@link NestjsBullmqBoardModule.forRoot}) and the per-queue
 * registrations ({@link NestjsBullmqBoardModule.forFeature}) must agree on this
 * value: `forFeature` mounts a `BullBoardFeatureModule` that injects the
 * `bull_board_instance` provider, which only `forRoot` supplies, so a
 * `forFeature` that outlives a disabled root throws Nest's
 * `UnknownDependenciesException` at boot.
 *
 * @public
 */
export const isBullBoardEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production';

export interface NestjsBullmqBoardModuleOptions {
  /**
   * When false the Bull Board dashboard UI (the `/queues` route, job payloads,
   * queue internals, and retry/remove/clean actions) is NOT mounted. Defaults
   * to disabled so the dashboard is never exposed unless a consumer opts in.
   *
   * The dashboard is internet-reachable and guarded only by a single shared
   * static basic-auth credential, so it must stay off in production. Drive this
   * from the consumer's environment (e.g. `NODE_ENV !== 'production'`).
   */
  enabled?: boolean;
}

@Module({})
export class NestjsBullmqBoardModule {
  /**
   * Mount the Bull Board dashboard. Pass `{ enabled: false }` (or omit options)
   * to skip mounting the dashboard UI entirely — only the static `forFeature`
   * queue registrations remain, which have no effect without a mounted root.
   *
   * @public
   */
  static forRoot(options: NestjsBullmqBoardModuleOptions = {}): DynamicModule {
    const enabled = options.enabled ?? false;

    return {
      imports: enabled
        ? [
            ConfigModule.forRoot({
              cache: true,
              load: [bullmqBoardConfig],
              validationSchema: configValidationSchema,
            }),
            BullBoardModule.forRootAsync({
              // forRootAsync builds its own BullBoardRootModule, which is a
              // separate injector scope from this module. Import the namespaced
              // config there so its options factory can resolve the
              // `bullmqBoard` config token (the sibling ConfigModule.forRoot
              // below is not visible across the module boundary).
              imports: [ConfigModule.forFeature(bullmqBoardConfig)],
              inject: [bullmqBoardConfig.KEY],
              useFactory: (config: ConfigType<typeof bullmqBoardConfig>) => ({
                adapter: ExpressAdapter,
                middleware: basicAuth({
                  challenge: true,
                  users: {
                    [config.username]: config.password,
                  },
                }),
                route: '/queues',
              }),
            }),
            LoggerModule,
          ]
        : [],
      module: NestjsBullmqBoardModule,
    };
  }

  /**
   * Register a queue with the Bull Board dashboard. When the dashboard is
   * disabled (see {@link isBullBoardEnabled}) this is a no-op empty module:
   * `BullBoardModule.forFeature` mounts a `BullBoardFeatureModule` that injects
   * the `bull_board_instance` provided only by an enabled root, so skipping it
   * keeps queue modules importable without a mounted dashboard.
   *
   * @public
   */
  static forFeature(feature: string): DynamicModule {
    if (!isBullBoardEnabled()) {
      return { module: NestjsBullmqBoardModule };
    }

    return BullBoardModule.forFeature({
      adapter: BullMQAdapter,
      name: feature,
    });
  }
}
