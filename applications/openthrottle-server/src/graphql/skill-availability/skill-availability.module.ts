/**
 * @description Registers per-project skill-availability GraphQL types, the rule-set read query,
 * the posture/rule mutations, and the resolved per-context `skillAvailability` query.
 */

import './skill-availability-resolution.object.ts';
import './skill-availability.input.ts';
import './skill-availability.object.ts';

import { Module } from '@nestjs/common';
import {
  ProjectsModule,
  RolesModule,
  SkillTagsModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { PlanContextAvailabilityModule } from '../../services/plan-context-availability/plan-context-availability.module.ts';
import { ProjectSkillsModule } from '../../services/project-skills/project-skills.module.ts';
import { SkillAvailabilityModule } from '../../services/skill-availability/skill-availability.module.ts';
import { SkillAvailabilityResolver } from './skill-availability.resolver.ts';
import { SkillAvailabilityResolutionResolver } from './skill-availability-resolution/skill-availability-resolution.resolver.ts';

@Module({
  imports: [
    RolesModule,
    PlanContextAvailabilityModule,
    ProjectSkillsModule,
    ProjectsModule,
    SkillAvailabilityModule,
    SkillTagsModule,
  ],
  providers: [
    GqlPermissionsGuard,
    SkillAvailabilityResolutionResolver,
    SkillAvailabilityResolver,
  ],
})
export class SkillAvailabilityGraphqlModule {}
