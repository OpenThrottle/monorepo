import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { PlanOutputStreamChunk } from './plan-output-stream.entity';

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
}
