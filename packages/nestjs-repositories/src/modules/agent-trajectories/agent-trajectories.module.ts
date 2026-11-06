import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { AgentTrajectoriesService } from './agent-trajectories.service.ts';
import { AgentTrajectory } from './agent-trajectory.entity.ts';

@Module({
  controllers: [],
  exports: [AgentTrajectoriesService],
  imports: [LoggerModule, TypeOrmModule.forFeature([AgentTrajectory])],
  providers: [AgentTrajectoriesService],
})
export class AgentTrajectoriesModule {}
