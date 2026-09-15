import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule as _NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsGraphqlModule as _NestjsGraphqlModule } from '@openthrottle/nestjs-graphql';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRedisModule } from '@openthrottle/nestjs-redis';
import { NestjsRedisModule as _NestjsRedisModule } from '@openthrottle/nestjs-redis';
import { NestjsThrottlerModule } from '@openthrottle/nestjs-throttler';

import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';

@Module({
  controllers: [AppController],
  exports: [AppService],
  imports: [
    // 🧱 Core Modules
    GlobalClsModule,
    LoggerModule,
    NestjsBullmqModule,
    NestjsRedisModule,
    NestjsThrottlerModule,

    // 🧩 Application Modules
  ],
  providers: [AppService],
})
export class AppModule {}
