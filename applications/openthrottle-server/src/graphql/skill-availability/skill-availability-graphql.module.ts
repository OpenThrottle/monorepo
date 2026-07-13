/**
 * @description Registers per-project skill-availability GraphQL types, the rule-set read query,
 * the posture/rule mutations, and the resolved per-context `skillAvailability` query.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { PlanContextAvailabilityModule } from '../../services/plan-context-availability/plan-context-availability.module';
import './skill-availability-resolution.object';
import './skill-availability.input';
import './skill-availability.object';
import { SkillAvailabilityResolutionResolver } from './skill-availability-resolution.resolver';
import { SkillAvailabilityResolver } from './skill-availability.resolver';

@Module({
  imports: [NestjsRepositoriesModule, PlanContextAvailabilityModule],
  providers: [
    GqlPermissionsGuard,
    SkillAvailabilityResolutionResolver,
    SkillAvailabilityResolver,
  ],
})
export class SkillAvailabilityGraphqlModule {}
