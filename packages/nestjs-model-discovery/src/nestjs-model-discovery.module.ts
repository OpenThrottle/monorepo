import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { modelDiscoveryConfig } from './config/nestjs-model-discovery.config';
import { remoteModelsConfig } from './config/nestjs-remote-models.config';
import { NestjsModelDiscoveryService } from './nestjs-model-discovery.service';
import { NestjsRemoteModelsService } from './nestjs-remote-models.service';

@Module({
  controllers: [],
  exports: [NestjsModelDiscoveryService, NestjsRemoteModelsService],
  imports: [
    ConfigModule.forFeature(modelDiscoveryConfig),
    ConfigModule.forFeature(remoteModelsConfig),
    LoggerModule,
  ],
  providers: [NestjsModelDiscoveryService, NestjsRemoteModelsService],
})
export class NestjsModelDiscoveryModule {}
