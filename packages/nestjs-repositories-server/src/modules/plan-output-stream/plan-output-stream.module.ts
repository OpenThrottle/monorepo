import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanOutputStreamRepository } from './plan-output-stream.repository.ts';
import { PlanOutputStreamChunk } from './plan-output-stream-chunk.entity.ts';

/**
 * @description Registers {@link PlanOutputStreamChunk} on the default connection and
 * provides {@link PlanOutputStreamRepository}.
 * @public
 */
@Module({
  exports: [PlanOutputStreamRepository],
  imports: [TypeOrmModule.forFeature([PlanOutputStreamChunk])],
  providers: [PlanOutputStreamRepository],
})
export class PlanOutputStreamModule {}
