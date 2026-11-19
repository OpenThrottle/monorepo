import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentTrajectoriesRepository } from './agent-trajectories.repository.ts';
import { AgentTrajectory } from './agent-trajectory.entity.ts';

/**
 * @description Registers {@link AgentTrajectory} on the default connection and provides
 * {@link AgentTrajectoriesRepository}.
 * @public
 */
@Module({
  exports: [AgentTrajectoriesRepository],
  imports: [TypeOrmModule.forFeature([AgentTrajectory])],
  providers: [AgentTrajectoriesRepository],
})
export class AgentTrajectoriesModule {}
