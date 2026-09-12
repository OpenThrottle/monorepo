/**
 * @description GraphQL module for skill usage ingest. Imports
 * NestjsRepositoriesModule for SkillUsageEventsService, and
 * EffectiveUserResolutionModule so ingest can attribute an event to the human
 * user its authenticated principal acts as.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module';
import { SkillUsageResolver } from './skill-usage.resolver';

@Module({
  imports: [EffectiveUserResolutionModule, NestjsRepositoriesModule],
  providers: [SkillUsageResolver],
})
export class SkillUsageGraphqlModule {}
