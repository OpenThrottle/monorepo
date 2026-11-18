import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanRun } from './plan-run.entity.ts';
import { PlanRunsRepository } from './plan-runs.repository.ts';

/**
 * @description Registers {@link PlanRun} on the default connection and provides
 * {@link PlanRunsRepository}.
 * @public
 */
@Module({
  exports: [PlanRunsRepository],
  imports: [TypeOrmModule.forFeature([PlanRun])],
  providers: [PlanRunsRepository],
})
export class PlanRunsModule {}
