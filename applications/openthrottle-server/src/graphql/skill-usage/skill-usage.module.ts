/**
 * @description GraphQL module for skill usage ingest. Imports
 * SkillUsageEventsModule and SkillUsageOutcomesModule for their repositories,
 * NestjsRepositoriesModule for the permissions guard's RolesService, and
 * EffectiveUserResolutionModule so ingest can attribute an event to the human
 * user its authenticated principal acts as.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import {
  SkillUsageEventsModule,
  SkillUsageOutcomesModule,
} from '@openthrottle/nestjs-repositories-server';

import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { SkillUsageResolver } from './skill-usage.resolver.ts';

@Module({
  imports: [
    EffectiveUserResolutionModule,
    NestjsRepositoriesModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
  ],
  providers: [SkillUsageResolver],
})
export class SkillUsageGraphqlModule {}
