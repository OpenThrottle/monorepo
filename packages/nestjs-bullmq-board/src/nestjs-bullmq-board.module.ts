import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { DynamicModule, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import basicAuth from 'express-basic-auth';

import {
  bullmqBoardConfig,
  configValidationSchema,
} from './config/config.constants.ts';
import type { NestjsBullmqBoardModuleOptions } from './nestjs-bullmq-board.types.ts';
import { isBullBoardEnabled } from './nestjs-bullmq-board.utils.ts';

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

    if (!enabled) {
      return { imports: [], module: NestjsBullmqBoardModule };
    }

    return {
      imports: [
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
      ],
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
