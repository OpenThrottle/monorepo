import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsWebsocketsGateway } from './nestjs-websockets.gateway';
import { NestjsWebsocketsService } from './nestjs-websockets.service';

@Module({
  controllers: [],
  exports: [NestjsWebsocketsGateway, NestjsWebsocketsService],
  imports: [LoggerModule],
  providers: [NestjsWebsocketsGateway, NestjsWebsocketsService],
})
export class NestjsWebsocketsModule {}
