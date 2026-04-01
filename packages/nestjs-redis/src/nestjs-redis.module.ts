import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsRedisService } from './nestjs-redis.service';

@Module({
  controllers: [],
  exports: [NestjsRedisService],
  imports: [LoggerModule],
  providers: [NestjsRedisService],
})
export class NestjsRedisModule {}
