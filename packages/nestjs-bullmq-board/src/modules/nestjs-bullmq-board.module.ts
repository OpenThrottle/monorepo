import basicAuth from 'express-basic-auth';
import { BullBoardModule } from '@bull-board/nestjs';
import { ConfigModule } from '@nestjs/config';
import { ExpressAdapter } from '@bull-board/express';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { DynamicModule, Module } from '@nestjs/common';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { bullmqBoardConfig } from '../config/nestjs-bullmq-board.config';

@Module({
  controllers: [],
  exports: [],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      load: [bullmqBoardConfig],
      // validatePredefined: true,
      // validationSchema: configValidationSchema,
    }),
    BullBoardModule.forRoot({
      adapter: ExpressAdapter,
      middleware: basicAuth({
        challenge: true,
        users: {
          [bullmqBoardConfig().username]: bullmqBoardConfig().password,
        },
      }),
      route: '/queues',
    }),
    LoggerModule,
  ],
  providers: [],
})
export class NestjsBullmqBoardModule {
  static forFeature(feature: string): DynamicModule {
    return BullBoardModule.forFeature({
      adapter: BullMQAdapter,
      name: feature,
    });
  }
}
