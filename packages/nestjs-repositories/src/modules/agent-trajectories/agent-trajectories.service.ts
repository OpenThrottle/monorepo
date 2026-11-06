import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';

import type { CreateAgentTrajectoryInput } from './agent-trajectories.types.ts';
import { AgentTrajectory } from './agent-trajectory.entity.ts';

@Injectable()
export class AgentTrajectoriesService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(AgentTrajectory)
    private readonly agentTrajectoryRepository: Repository<AgentTrajectory>,
  ) {
    this.logger.debug('🧩 agent-trajectories 🧩');
  }

  /**
   * @description Returns the TypeORM repository for agent_trajectories.
   */
  getRepository(): Repository<AgentTrajectory> {
    return this.agentTrajectoryRepository;
  }

  /**
   * @description Records one trajectory. The caller owns capture's fail-open policy: this method
   * rejects on a database error and the capture site decides to log and continue.
   */
  async create(input: CreateAgentTrajectoryInput): Promise<AgentTrajectory> {
    const row = this.agentTrajectoryRepository.create(input);

    return this.agentTrajectoryRepository.save(row);
  }

  /**
   * @description Returns one trajectory by id, or null when it does not exist.
   */
  async findById(id: string): Promise<AgentTrajectory | null> {
    return this.agentTrajectoryRepository.findOne({ where: { id } });
  }

  /**
   * @description Lists a plan run's trajectories, oldest first.
   */
  async findByPlanRun(planRunId: string): Promise<AgentTrajectory[]> {
    return this.agentTrajectoryRepository.find({
      order: { createdAt: 'ASC' },
      where: { planRunId },
    });
  }

  /**
   * @description Lists a task's trajectories, oldest first.
   */
  async findByTask(taskId: string): Promise<AgentTrajectory[]> {
    return this.agentTrajectoryRepository.find({
      order: { createdAt: 'ASC' },
      where: { taskId },
    });
  }
}
