import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { modelDiscoveryConfig } from './config/nestjs-model-discovery.config.ts';
import { NestjsModelDiscoveryService } from './nestjs-model-discovery.service.ts';

@Module({
  controllers: [],
  exports: [NestjsModelDiscoveryService],
  imports: [ConfigModule.forFeature(modelDiscoveryConfig), LoggerModule],
  providers: [NestjsModelDiscoveryService],
})
export class NestjsModelDiscoveryModule {}
