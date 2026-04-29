import { GlobalClsModule } from '@openthrottle/nestjs-modules/src/global-cls/global-cls.module';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsRedisModule } from '@openthrottle/nestjs-redis/src/nestjs-redis.module';
import { NestjsGraphqlModule as _NestjsGraphqlModule } from '@openthrottle/nestjs-graphql';
import { NestjsBullmqBoardModule as _NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsRedisModule as _NestjsRedisModule } from '@openthrottle/nestjs-redis/src/nestjs-redis.module';
import { NestjsThrottlerModule as _NestjsThrottlerModule } from '@openthrottle/nestjs-throttler/src/nestjs-throttler.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  exports: [AppService],
  imports: [
    // 🧱 Core Modules
    GlobalClsModule,
    LoggerModule,
    NestjsBullmqModule,
    NestjsRedisModule,

    // 🧩 Application Modules
  ],
  providers: [AppService],
})
export class AppModule {}
