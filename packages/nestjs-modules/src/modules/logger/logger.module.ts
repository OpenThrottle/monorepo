import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
  controllers: [],
  exports: [LoggerService],
  imports: [],
  providers: [LoggerService],
})
export class LoggerModule {}
