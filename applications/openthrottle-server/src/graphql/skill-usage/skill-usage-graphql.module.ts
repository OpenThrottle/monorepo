/**
 * @description GraphQL module for skill usage ingest. Imports
 * NestjsRepositoriesModule for SkillUsageEventsService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { SkillUsageResolver } from './skill-usage.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [SkillUsageResolver],
})
export class SkillUsageGraphqlModule {}
