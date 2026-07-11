/**
 * @description Registers per-project skill-availability GraphQL types, the rule-set read query,
 * and the posture/rule mutations.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import './skill-availability.input';
import './skill-availability.object';
import { SkillAvailabilityResolver } from './skill-availability.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, SkillAvailabilityResolver],
})
export class SkillAvailabilityGraphqlModule {}
