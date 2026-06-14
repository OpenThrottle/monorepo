import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { modelDiscoveryConfig } from './config/nestjs-model-discovery.config';
import { NestjsModelDiscoveryService } from './nestjs-model-discovery.service';

@Module({
  controllers: [],
  exports: [NestjsModelDiscoveryService],
  imports: [ConfigModule.forFeature(modelDiscoveryConfig), LoggerModule],
  providers: [NestjsModelDiscoveryService],
})
export class NestjsModelDiscoveryModule {}
