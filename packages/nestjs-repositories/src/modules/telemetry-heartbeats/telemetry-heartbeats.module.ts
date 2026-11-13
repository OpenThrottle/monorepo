import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { TelemetryHeartbeat } from './telemetry-heartbeats.entity.ts';
import { TelemetryHeartbeatsService } from './telemetry-heartbeats.service.ts';

@Module({
  controllers: [],
  exports: [TelemetryHeartbeatsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([TelemetryHeartbeat])],
  providers: [TelemetryHeartbeatsService],
})
export class TelemetryHeartbeatsModule {}
