import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { NestjsRepositoriesServerService } from './nestjs-repositories-server.service.ts';

@Module({
  controllers: [],
  exports: [NestjsRepositoriesServerService],
  imports: [LoggerModule],
  providers: [NestjsRepositoriesServerService],
})
export class NestjsRepositoriesServerModule {}
