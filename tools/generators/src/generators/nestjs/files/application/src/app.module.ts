import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule as _NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsGraphqlModule as _NestjsGraphqlModule } from '@openthrottle/nestjs-graphql';
import { NestjsRedisModule } from '@openthrottle/nestjs-redis';
import { NestjsRedisModule as _NestjsRedisModule } from '@openthrottle/nestjs-redis';
import { NestjsThrottlerModule as _NestjsThrottlerModule } from '@openthrottle/nestjs-throttler/src/nestjs-throttler.module';
import { AppService } from './app.service';
import { AppController } from './app.controller';

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
