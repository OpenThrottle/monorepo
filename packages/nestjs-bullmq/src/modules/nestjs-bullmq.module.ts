import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import { DynamicModule, Module } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  configValidationSchema,
  redisConfig,
} from '../config/nestjs-bullmq.config';

/**
 * Root BullMQ defaults. Worker-level options (lockDuration, stalledInterval) are not set here;
 * use {@link defaultWorkerOptions} in each @Processor so jobs recover after restart.
 */
const defaultJobOptions = {
  attempts: 3,
  backoff: { delay: 2000, type: 'exponential' as const },
  keepLogs: 100,
  // Bound Redis growth: completed/failed job records are otherwise retained
  // forever in their ZSETs (cron + on-demand queues on shared Redis).
  removeOnComplete: { age: 86400, count: 1000 },
  removeOnFail: { age: 604800 },
};

@Module({
  controllers: [],
  exports: [],
  imports: [
    LoggerModule,
    // Fail fast at bootstrap: validate REDIS_* env vars against the Joi schema
    // instead of letting a missing/invalid REDIS_HOST surface as a late runtime
    // throw at first connection. allowUnknown keeps unrelated system env vars
    // from tripping validation; validationOptions.abortEarly: false reports all
    // misconfigured vars at once.
    ConfigModule.forRoot({
      cache: true,
      load: [redisConfig],
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
      validationSchema: configValidationSchema,
    }),
    // forRootAsync defers the REDIS_HOST read to bootstrap; importing this
    // package must not require Redis env vars (e.g. unit tests of consumers).
    BullModule.forRootAsync({
      imports: [ConfigModule.forFeature(redisConfig)],
      inject: [redisConfig.KEY],
      useFactory: (redis: ConfigType<typeof redisConfig>) => ({
        connection: {
          db: redis.db,
          enableReadyCheck: redis.enableReadyCheck,
          family: redis.family,
          host: redis.host,
          maxRetriesPerRequest: redis.maxRetriesPerRequest,
          password: redis.password,
          port: redis.port,
          tls: redis.tls,
          username: redis.username,
        },
        defaultJobOptions,
        // Environment-scoped key prefix: registerQueue queues, @Processor
        // workers, and QueueEvents all inherit it from this root config, so
        // checkouts sharing one Redis cannot consume each other's jobs.
        prefix: redis.queuePrefix,
      }),
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
