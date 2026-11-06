/**
 * @description GraphQL module for agent trajectories: registers AgentTrajectoriesResolver,
 * importing NestjsRepositoriesModule for AgentTrajectoriesService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { AgentTrajectoriesResolver } from './agent-trajectories.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [AgentTrajectoriesResolver],
})
export class AgentTrajectoriesGraphqlModule {}
