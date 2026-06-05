import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Not, Repository } from 'typeorm';
import { PlansService } from '../plans/plans.service';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  constructor(
    private readonly logger: LoggerService,
    private readonly plansService: PlansService,
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

  /**
   * @description When a task is IN_PROGRESS, sets its parent plan to IN_PROGRESS if not already (atomic UPDATE; idempotent and safe under concurrent writers). Returns whether a plan row was updated.
   */
  async syncParentPlanStatus(planId: string): Promise<boolean> {
    const planRepo = this.plansService.getRepository();
    const result = await planRepo.update(
      { id: planId, status: Not('IN_PROGRESS') },
      { status: 'IN_PROGRESS' },
    );

    return (result.affected ?? 0) > 0;
  }
}
