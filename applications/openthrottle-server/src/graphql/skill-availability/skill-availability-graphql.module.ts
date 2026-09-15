/**
 * @description Registers per-project skill-availability GraphQL types, the rule-set read query,
 * the posture/rule mutations, and the resolved per-context `skillAvailability` query.
 */

import './skill-availability-resolution.object.ts';
import './skill-availability.input.ts';
import './skill-availability.object.ts';

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { PlanContextAvailabilityModule } from '../../services/plan-context-availability/plan-context-availability.module.ts';
import { SkillAvailabilityResolver } from './skill-availability.resolver.ts';
import { SkillAvailabilityResolutionResolver } from './skill-availability-resolution.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule, PlanContextAvailabilityModule],
  providers: [
    GqlPermissionsGuard,
    SkillAvailabilityResolutionResolver,
    SkillAvailabilityResolver,
  ],
})
export class SkillAvailabilityGraphqlModule {}
