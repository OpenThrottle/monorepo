import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { DynamicModule, Module } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { redisConfig } from '../config/nestjs-bullmq.config';

/**
 * Root BullMQ defaults. Worker-level options (lockDuration, stalledInterval) are not set here;
 * use {@link defaultWorkerOptions} in each @Processor so jobs recover after restart.
 */
const defaultJobOptions = {
  attempts: 3,
  backoff: { delay: 2000, type: 'exponential' as const },
  delay: 1000,
  keepLogs: 100,
};

@Module({
  controllers: [],
  exports: [],
  imports: [
    LoggerModule,
    ConfigModule.forRoot({
      cache: true,
      load: [redisConfig],
      // validatePredefined: true,
      // validationSchema: configValidationSchema,
    }),
    // ConfigModule.forRoot({
    //   cache: true,
    //   load: [redisConfig],
    //   // validatePredefined: true,
    //   // validationSchema: configValidationSchema,
    // }),
    BullModule.forRoot({
      connection: {
        host: redisConfig().host,
        port: Number(redisConfig().port),
      },
      defaultJobOptions,
    }),
  ],
  providers: [LoggerService],
})
export class NestjsBullmqModule {
  static registerQueue(feature: string): DynamicModule {
    return BullModule.registerQueue({
      name: feature,
    });
  }
}
