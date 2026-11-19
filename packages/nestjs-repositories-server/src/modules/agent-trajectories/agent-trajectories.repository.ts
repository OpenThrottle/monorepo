import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { QueryFailedError, Repository } from 'typeorm';

import type {
  CreateAgentTrajectoryInput,
  ReplaceAgentTrajectoryInput,
} from './agent-trajectories.types.ts';
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

/**
 * @description Data access for the openthrottle `agent_trajectories` table on the default
 * connection: the `BaseRepository` CRUD plus the idempotent record, the in-place replace and the
 * plan-run and task listings. A trajectory is a recorded result, so a delete is a hard delete and
 * only an FK cascade does it. The old service's nullable `findById` is
 * {@link AgentTrajectoriesRepository.findTrajectoryById}: the inherited `findById` throws
 * `NotFoundException` on a miss.
 * @public
 */
@Injectable()
export class AgentTrajectoriesRepository extends BaseRepository<
  AgentTrajectory,
  CreateModelInput<AgentTrajectory>
> {
  protected readonly tableName = 'agent_trajectories';

  constructor(
    @InjectRepository(AgentTrajectory)
    repository: Repository<AgentTrajectory>,
  ) {
    super(repository);
  }

  /**
   * @description Records one trajectory. The caller owns capture's fail-open policy: this method
   * rejects on a database error and the capture site decides to log and continue.
   *
   * With an `idempotencyKey`, a duplicate is a successful no-op that returns the stored row. The
   * partial unique index is the arbiter, so two concurrent inserts cannot both land: the loser's
   * 23505 on that index is caught and the winner's row is read back.
   */
  async createTrajectory(
    input: CreateAgentTrajectoryInput,
  ): Promise<AgentTrajectory> {
    const { idempotencyKey } = input;

    if (idempotencyKey != null) {
      const existing = await this.findByIdempotencyKey(idempotencyKey);

      if (existing !== null) return existing;
    }

    try {
      return await this.create(input);
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
    return this.findOne({ where: { idempotencyKey } });
  }

  /**
   * @description Returns one trajectory by id, or null when it does not exist.
   */
  async findTrajectoryById(id: string): Promise<AgentTrajectory | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * @description Replaces the document (and derived summary columns) on an existing trajectory,
   * keeping its id so labels keyed by trajectory id survive. Returns null when no row matches.
   * A concurrent idempotency-key conflict is rethrown for the caller to surface.
   */
  async replaceTrajectory(
    id: string,
    input: ReplaceAgentTrajectoryInput,
  ): Promise<AgentTrajectory | null> {
    const existing = await this.findTrajectoryById(id);

    if (existing === null) {
      return null;
    }

    existing.byteSize = input.byteSize;
    existing.cachedTokens = input.cachedTokens;
    existing.costUsd = input.costUsd;
    existing.durationMs = input.durationMs;
    existing.exitCode = input.exitCode;
    existing.idempotencyKey = input.idempotencyKey;
    existing.incomplete = input.incomplete;
    existing.inputTokens = input.inputTokens;
    existing.model = input.model;
    existing.outcome = input.outcome;
    existing.outputTokens = input.outputTokens;
    existing.planRunId = input.planRunId;
    existing.schemaVersion = input.schemaVersion;
    existing.toolCallCount = input.toolCallCount;
    existing.trajectory = input.trajectory;
    existing.truncated = input.truncated;

    return this.repository.save(existing);
  }

  /**
   * @description Lists a plan run's trajectories, oldest first.
   */
  async findByPlanRun(planRunId: string): Promise<AgentTrajectory[]> {
    return this.findBy({ order: { createdAt: 'ASC' }, where: { planRunId } });
  }

  /**
   * @description Lists a task's trajectories, oldest first.
   */
  async findByTask(taskId: string): Promise<AgentTrajectory[]> {
    return this.findBy({ order: { createdAt: 'ASC' }, where: { taskId } });
  }
}
