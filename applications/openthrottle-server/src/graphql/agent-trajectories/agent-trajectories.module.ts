/**
 * @description GraphQL module for agent trajectories: registers AgentTrajectoriesResolver,
 * importing AgentTrajectoriesModule for AgentTrajectoriesRepository and GlobalClsModule for the
 * request identity whose labels the plan-group listing reports, and PlanRunsModule to resolve a
 * trajectory's plan.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import {
  AgentTrajectoriesModule,
  PlanRunsModule,
} from '@openthrottle/nestjs-repositories-server';

import { AgentTrajectoriesResolver } from './agent-trajectories.resolver.ts';

@Module({
  imports: [AgentTrajectoriesModule, GlobalClsModule, PlanRunsModule],
  providers: [AgentTrajectoriesResolver],
})
export class AgentTrajectoriesGraphqlModule {}
