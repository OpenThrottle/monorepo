import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

/**
 * @external https://docs.nestjs.com/security/rate-limiting
 * @description This module is used to throttle requests to the API.
 *
 * Binds {@link ThrottlerGuard} as a global guard (`APP_GUARD`) so importing
 * this module actually enforces the configured rate limit (10 requests / 60s)
 * rather than only providing config + storage.
 */
@Module({
  controllers: [],
  exports: [ThrottlerModule],
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          limit: 10,
          ttl: 60000,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class NestjsThrottlerModule {}
