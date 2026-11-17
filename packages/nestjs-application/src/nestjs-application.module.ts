import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { NestjsApplicationService } from './nestjs-application.service.ts';

@Module({
  controllers: [],
  exports: [NestjsApplicationService],
  imports: [LoggerModule],
  providers: [NestjsApplicationService],
})
export class NestjsApplicationModule {}
