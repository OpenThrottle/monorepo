import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlansModule,
  ProjectsModule,
  SkillTagsModule,
  TagActionRulesModule,
  TasksModule,
  UsersModule,
} from '@openthrottle/nestjs-repositories-server';

import { ProjectSkillsModule } from '../project-skills/project-skills.module.ts';
import { SkillAvailabilityModule } from '../skill-availability/skill-availability.module.ts';
import { TagsModule } from '../tags/tags.module.ts';
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
    PlansModule,
    ProjectSkillsModule,
    ProjectsModule,
    SkillAvailabilityModule,
    SkillTagsModule,
    TagActionRulesModule,
    TagsModule,
    TasksModule,
  ],
  providers: [PlanContextAvailabilityService],
})
export class PlanContextAvailabilityModule {}
