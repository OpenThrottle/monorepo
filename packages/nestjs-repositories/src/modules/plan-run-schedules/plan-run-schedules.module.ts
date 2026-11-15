/**
 * @description NestJS module for plan_run_schedules (recurrence rules for plan runs).
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanRunSchedule } from './plan-run-schedules.entity.ts';
import { PlanRunSchedulesService } from './plan-run-schedules.service.ts';

@Module({
  controllers: [],
  exports: [PlanRunSchedulesService],
  imports: [TypeOrmModule.forFeature([PlanRunSchedule])],
  providers: [PlanRunSchedulesService],
})
export class PlanRunSchedulesModule {}
