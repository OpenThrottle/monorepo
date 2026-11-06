import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { QueryFailedError, Repository } from 'typeorm';

import type { CreateAgentTrajectoryInput } from './agent-trajectories.types.ts';
import { AgentTrajectory } from './agent-trajectory.entity.ts';

const UNIQUE_VIOLATION = '23505';
const IDEMPOTENCY_KEY_INDEX = 'uq_agent_trajectories_idempotency_key';

const isIdempotencyKeyConflict = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;

  const driverError: unknown = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === UNIQUE_VIOLATION &&
    'constraint' in driverError &&
    driverError.constraint === IDEMPOTENCY_KEY_INDEX
  );
};

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
   *
   * With an `idempotencyKey`, a duplicate is a successful no-op that returns the stored row. The
   * partial unique index is the arbiter, so two concurrent inserts cannot both land: the loser's
   * 23505 on that index is caught and the winner's row is read back.
   */
  async create(input: CreateAgentTrajectoryInput): Promise<AgentTrajectory> {
    const { idempotencyKey } = input;

    if (idempotencyKey != null) {
      const existing = await this.findByIdempotencyKey(idempotencyKey);

      if (existing !== null) return existing;
    }

    const row = this.agentTrajectoryRepository.create(input);

    try {
      return await this.agentTrajectoryRepository.save(row);
    } catch (error) {
      if (idempotencyKey != null && isIdempotencyKeyConflict(error)) {
        const winner = await this.findByIdempotencyKey(idempotencyKey);

        if (winner !== null) return winner;
      }

      throw error;
    }
  }

  /**
   * @description Returns the trajectory recorded under an idempotency key, or null.
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<AgentTrajectory | null> {
    return this.agentTrajectoryRepository.findOne({
      where: { idempotencyKey },
    });
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
