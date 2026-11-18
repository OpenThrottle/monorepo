import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelemetryHeartbeat } from './telemetry-heartbeat.entity.ts';
import { TelemetryHeartbeatsRepository } from './telemetry-heartbeats.repository.ts';

/**
 * @description Registers {@link TelemetryHeartbeat} on the default connection and
 * provides {@link TelemetryHeartbeatsRepository}.
 * @public
 */
@Module({
  exports: [TelemetryHeartbeatsRepository],
  imports: [TypeOrmModule.forFeature([TelemetryHeartbeat])],
  providers: [TelemetryHeartbeatsRepository],
})
export class TelemetryHeartbeatsModule {}
