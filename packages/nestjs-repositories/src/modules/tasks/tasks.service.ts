import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Repository } from 'typeorm';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {
    this.logger.debug('🧩 tasks 🧩');
  }

  /**
   * @description Returns the TypeORM repository for tasks. Use for CRUD and queries.
   */
  getRepository(): Repository<Task> {
    return this.taskRepository;
  }
}
