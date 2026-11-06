import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';

import { EvalHumanLabel } from './eval-human-label.entity.ts';
import type {
  RemoveEvalHumanLabelInput,
  UpsertEvalHumanLabelInput,
} from './eval-human-labels.types.ts';

@Injectable()
export class EvalHumanLabelsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(EvalHumanLabel)
    private readonly evalHumanLabelRepository: Repository<EvalHumanLabel>,
  ) {
    this.logger.debug('🧩 eval-human-labels 🧩');
  }

  /**
   * @description Returns the TypeORM repository for eval_human_labels.
   */
  getRepository(): Repository<EvalHumanLabel> {
    return this.evalHumanLabelRepository;
  }

  /**
   * @description Lists a trajectory's labels, most recently updated first.
   */
  async findByTrajectory(trajectoryId: string): Promise<EvalHumanLabel[]> {
    return this.evalHumanLabelRepository.find({
      order: { updatedAt: 'DESC' },
      where: { trajectoryId },
    });
  }

  /**
   * @description Removes one rater's label on a trajectory. Returns true when a row was deleted,
   * false when that rater had no label there.
   */
  async remove(input: RemoveEvalHumanLabelInput): Promise<boolean> {
    const result = await this.evalHumanLabelRepository.delete({
      rater: input.rater,
      trajectoryId: input.trajectoryId,
    });

    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Records a rater's label, or replaces their existing one for the trajectory
   * (`ON CONFLICT (trajectory_id, rater) DO UPDATE`), bumping `updated_at`. Rejects with a
   * foreign-key violation (23503) when the trajectory does not exist.
   */
  async upsert(input: UpsertEvalHumanLabelInput): Promise<EvalHumanLabel> {
    await this.evalHumanLabelRepository.upsert(
      {
        failureType: input.failureType,
        note: input.note,
        rater: input.rater,
        trajectoryId: input.trajectoryId,
        updatedAt: new Date(),
        verdict: input.verdict,
      },
      ['trajectoryId', 'rater'],
    );

    return this.evalHumanLabelRepository.findOneByOrFail({
      rater: input.rater,
      trajectoryId: input.trajectoryId,
    });
  }
}
