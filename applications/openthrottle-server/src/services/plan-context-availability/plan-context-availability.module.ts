import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import {
  PlansModule,
  ProjectsModule,
  SkillTagsModule,
  TasksModule,
  UsersModule,
} from '@openthrottle/nestjs-repositories-server';

import { PlanContextAvailabilityService } from './plan-context-availability.service.ts';

/**
 * @description Provides {@link PlanContextAvailabilityService}, shared by the
 * skillAvailability GraphQL read (planId/taskId context) and the inject-task
 * executor's candidate-set gating.
 */
@Module({
  exports: [PlanContextAvailabilityService],
  imports: [
    UsersModule,
    LoggerModule,
    NestjsRepositoriesModule,
    PlansModule,
    ProjectsModule,
    SkillTagsModule,
    TasksModule,
  ],
  providers: [PlanContextAvailabilityService],
})
export class PlanContextAvailabilityModule {}
