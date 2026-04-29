import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsWebsocketsGateway } from './nestjs-websockets.gateway';

@Module({
  controllers: [],
  exports: [NestjsWebsocketsGateway],
  imports: [LoggerModule],
  providers: [NestjsWebsocketsGateway],
})
export class NestjsWebsocketsModule {}
