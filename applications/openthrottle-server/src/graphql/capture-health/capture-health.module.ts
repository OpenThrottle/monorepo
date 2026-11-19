import { Module } from '@nestjs/common';
import {
  AgentTokenUsageModule,
  RolesModule,
  SkillUsageEventsModule,
} from '@openthrottle/nestjs-repositories-server';

import { CaptureHealthResolver } from './capture-health.resolver.ts';

/**
 * @description GraphQL module for the capture-health signal. Imports
 * SkillUsageEventsModule for SkillUsageEventsRepository and
 * AgentTokenUsageModule for AgentTokenUsageRepository, and RolesModule for
 * the permissions guard.
 */
@Module({
  imports: [AgentTokenUsageModule, RolesModule, SkillUsageEventsModule],
  providers: [CaptureHealthResolver],
})
export class CaptureHealthGraphqlModule {}
