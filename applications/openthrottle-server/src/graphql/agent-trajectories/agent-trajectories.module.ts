/**
 * @description GraphQL module for agent trajectories: registers AgentTrajectoriesResolver,
 * importing AgentTrajectoriesModule for AgentTrajectoriesRepository.
 */

import { Module } from '@nestjs/common';
import { AgentTrajectoriesModule } from '@openthrottle/nestjs-repositories-server';

import { AgentTrajectoriesResolver } from './agent-trajectories.resolver.ts';

@Module({
  imports: [AgentTrajectoriesModule],
  providers: [AgentTrajectoriesResolver],
})
export class AgentTrajectoriesGraphqlModule {}
