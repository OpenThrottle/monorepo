import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';

@Injectable()
export class PlansService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {
    this.logger.debug('🧩 plans 🧩');
  }

  /**
   * @description Returns the TypeORM repository for plans. Use for CRUD and queries.
   */
  getRepository(): Repository<Plan> {
    return this.planRepository;
  }
}
