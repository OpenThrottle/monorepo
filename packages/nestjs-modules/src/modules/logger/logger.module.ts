import { Module } from '@nestjs/common';

import { LoggerService } from './logger.service.ts';

@Module({
  controllers: [],
  exports: [LoggerService],
  imports: [],
  providers: [LoggerService],
})
export class LoggerModule {}
