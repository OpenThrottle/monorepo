import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsProfilingService } from './nestjs-profiling.service';

@Module({
  controllers: [],
  exports: [NestjsProfilingService],
  imports: [LoggerModule],
  providers: [NestjsProfilingService],
})
export class NestjsProfilingModule {}
