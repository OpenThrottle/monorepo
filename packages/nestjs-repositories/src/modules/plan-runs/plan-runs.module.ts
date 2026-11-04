import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { PlanRun } from './plan-run.entity.ts';
import { PlanRunsService } from './plan-runs.service.ts';

@Module({
  controllers: [],
  exports: [PlanRunsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([PlanRun])],
  providers: [PlanRunsService],
})
export class PlanRunsModule {}
