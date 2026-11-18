import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import type {
  ListPlanOutputChunksParams,
  PlanOutputChunkCreateInput,
} from './plan-output-stream.types.ts';
import { PlanOutputStreamChunk } from './plan-output-stream-chunk.entity.ts';

/**
 * @description Data access for the openthrottle `plan_output_stream` table on the default
 * connection: the `BaseRepository` CRUD plus the ordered chunk list. A delete is a hard
 * delete, since the stream is append-only output.
 * @public
 */
@Injectable()
export class PlanOutputStreamRepository extends BaseRepository<
  PlanOutputStreamChunk,
  PlanOutputChunkCreateInput
> {
  protected readonly tableName = 'plan_output_stream';

  constructor(
    @InjectRepository(PlanOutputStreamChunk)
    repository: Repository<PlanOutputStreamChunk>,
  ) {
    super(repository);
  }

  /**
   * @description Lists a plan's output stream chunks, ordered by createdAt ascending. An
   * omitted or null taskId applies no task filter and returns the full plan stream — matching
   * deletePlanOutput's scoping semantics, where taskId only narrows an already-scoped query.
   */
  async listChunks(
    params: ListPlanOutputChunksParams,
  ): Promise<PlanOutputStreamChunk[]> {
    return this.repository.find({
      order: { createdAt: 'ASC' },
      skip: params.skip,
      take: params.take,
      where: {
        planId: params.planId,
        ...(params.taskId ? { taskId: params.taskId } : {}),
      },
    });
  }
}
