import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { modelDiscoveryConfig } from './config/model-discovery-config/model-discovery-config.constants.ts';
import { NestjsModelDiscoveryService } from './nestjs-model-discovery.service.ts';

@Module({
  controllers: [],
  exports: [NestjsModelDiscoveryService],
  imports: [ConfigModule.forFeature(modelDiscoveryConfig), LoggerModule],
  providers: [NestjsModelDiscoveryService],
})
export class NestjsModelDiscoveryModule {}
