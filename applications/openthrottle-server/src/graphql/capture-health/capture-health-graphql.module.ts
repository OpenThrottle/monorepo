import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { CaptureHealthResolver } from './capture-health.resolver.ts';

/**
 * @description GraphQL module for the capture-health signal. Imports
 * NestjsRepositoriesModule for SkillUsageEventsService and
 * AgentTokenUsageService.
 */
@Module({
  imports: [NestjsRepositoriesModule],
  providers: [CaptureHealthResolver],
})
export class CaptureHealthGraphqlModule {}
