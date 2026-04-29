import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * @external https://docs.nestjs.com/security/rate-limiting
 * @description This module is used to throttle requests to the API.
 */
@Module({
  controllers: [],
  exports: [],
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          limit: 10,
          ttl: 60000,
        },
      ],
    }),
    LoggerModule,
  ],
  providers: [],
})
export class NestjsThrottlerModule {}
