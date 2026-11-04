import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';

import { PlanOutputStreamChunk } from './plan-output-stream.entity.ts';

@Injectable()
export class PlanOutputStreamService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(PlanOutputStreamChunk)
    private readonly planOutputStreamRepository: Repository<PlanOutputStreamChunk>,
  ) {
    this.logger.debug('🧩 plan-output-stream 🧩');
  }

  /**
   * @description Returns the TypeORM repository for plan_output_stream. Use for CRUD and queries.
   */
  getRepository(): Repository<PlanOutputStreamChunk> {
    return this.planOutputStreamRepository;
  }

  /**
   * @description Lists a plan's output stream chunks, ordered by createdAt ascending. An
   * omitted or null taskId applies no task filter and returns the full plan stream — matching
   * deletePlanOutput's scoping semantics, where taskId only narrows an already-scoped query.
   */
  async listChunks(params: {
    planId: string;
    skip: number;
    take: number;
    taskId?: string | null;
  }): Promise<PlanOutputStreamChunk[]> {
    return this.planOutputStreamRepository.find({
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
