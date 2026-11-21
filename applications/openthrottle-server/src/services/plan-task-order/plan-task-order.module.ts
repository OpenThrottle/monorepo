/**
 * @description NestJS module for plan-task-order: the service that reorders a plan's tasks.
 */

import { Module } from '@nestjs/common';
import { TasksModule } from '@openthrottle/nestjs-repositories-server';

import { PlanTaskOrderService } from './plan-task-order.service.ts';

@Module({
  exports: [PlanTaskOrderService],
  imports: [TasksModule],
  providers: [PlanTaskOrderService],
})
export class PlanTaskOrderModule {}
