import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { SkillUsageEventsModule } from '@openthrottle/nestjs-repositories-server';

import { CaptureHealthResolver } from './capture-health.resolver.ts';

/**
 * @description GraphQL module for the capture-health signal. Imports
 * SkillUsageEventsModule for SkillUsageEventsRepository and
 * NestjsRepositoriesModule for AgentTokenUsageService.
 */
@Module({
  imports: [NestjsRepositoriesModule, SkillUsageEventsModule],
  providers: [CaptureHealthResolver],
})
export class CaptureHealthGraphqlModule {}
