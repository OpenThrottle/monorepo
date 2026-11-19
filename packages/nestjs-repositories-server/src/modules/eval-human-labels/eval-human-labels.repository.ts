import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { EvalHumanLabel } from './eval-human-label.entity.ts';
import type {
  RemoveEvalHumanLabelInput,
  UpsertEvalHumanLabelInput,
} from './eval-human-labels.types.ts';

/**
 * @description Data access for the openthrottle `eval_human_labels` table on the default
 * connection: the `BaseRepository` CRUD plus the per-trajectory listing, the revive-on-conflict
 * upsert and the soft-deleting remove. The old service's `remove(input)` is
 * {@link EvalHumanLabelsRepository.removeLabel}: the inherited `remove(id)` takes a row id and
 * throws `NotFoundException` on a miss. Removing a label is a soft delete; re-labelling revives
 * the same row.
 * @public
 */
@Injectable()
export class EvalHumanLabelsRepository extends BaseRepository<
  EvalHumanLabel,
  CreateModelInput<EvalHumanLabel>
> {
  protected readonly tableName = 'eval_human_labels';

  constructor(
    @InjectRepository(EvalHumanLabel)
    repository: Repository<EvalHumanLabel>,
  ) {
    super(repository);
  }

  /**
   * @description Lists a trajectory's live labels, most recently updated first.
   */
  async findByTrajectory(trajectoryId: string): Promise<EvalHumanLabel[]> {
    return this.findBy({
      order: { updatedAt: 'DESC' },
      where: { trajectoryId },
    });
  }

  /**
   * @description Soft deletes one rater's label on a trajectory. Returns true when a live row was
   * removed, false when that rater had no live label there.
   */
  async removeLabel(input: RemoveEvalHumanLabelInput): Promise<boolean> {
    const { removedCount } = await this.removeMany({
      rater: input.rater,
      trajectoryId: input.trajectoryId,
    });

    return removedCount > 0;
  }

  /**
   * @description Records a rater's label, or replaces their existing one for the trajectory
   * (`ON CONFLICT (trajectory_id, rater) DO UPDATE`), bumping `updated_at`. The conflict target
   * covers soft-deleted rows, so the update also sets `deleted_at = NULL` and a removed label is
   * revived; the read-back finds it live. Rejects with a foreign-key violation (23503) when the
   * trajectory does not exist.
   */
  async upsert(input: UpsertEvalHumanLabelInput): Promise<EvalHumanLabel> {
    await this.repository.upsert(
      {
        deletedAt: null,
        failureType: input.failureType,
        note: input.note,
        rater: input.rater,
        trajectoryId: input.trajectoryId,
        updatedAt: new Date(),
        verdict: input.verdict,
      },
      ['trajectoryId', 'rater'],
    );

    return this.repository.findOneByOrFail({
      rater: input.rater,
      trajectoryId: input.trajectoryId,
    });
  }
}
