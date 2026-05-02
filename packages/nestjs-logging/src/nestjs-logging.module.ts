import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsLoggingService } from './nestjs-logging.service';

@Module({
  controllers: [],
  exports: [NestjsLoggingService],
  imports: [LoggerModule],
  providers: [NestjsLoggingService],
})
export class NestjsLoggingModule {}
