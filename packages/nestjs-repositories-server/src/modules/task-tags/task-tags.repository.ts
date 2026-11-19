import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { Task } from '../tasks/task.entity.ts';
import { TaskTag } from './task-tag.entity.ts';

/**
 * @description Data access for the openthrottle `task_tags` table on the default connection: the
 * `BaseRepository` CRUD (hard deletes, since a detached tag is simply re-attached) plus the
 * task-scoped and plan-scoped lookups the tag rules need. Validation and the provenance ladder
 * live in the server's tags service.
 * @public
 */
@Injectable()
export class TaskTagsRepository extends BaseRepository<
  TaskTag,
  CreateModelInput<TaskTag>
> {
  protected readonly tableName = 'task_tags';

  constructor(
    @InjectRepository(TaskTag)
    repository: Repository<TaskTag>,
  ) {
    super(repository);
  }

  /**
   * @description Finds the task's row for one tag, or null.
   */
  async findByTaskAndTag(taskId: string, tag: string): Promise<TaskTag | null> {
    return this.findOne({ where: { tag, taskId } });
  }

  /**
   * @description Lists the distinct ids of a plan's live tasks that carry at least one of
   * `tags`. Empty when `tags` is empty.
   */
  async listTaskIdsByPlanAndTags(
    planId: string,
    tags: readonly string[],
  ): Promise<string[]> {
    if (tags.length === 0) {
      return [];
    }
    const rows = await this.repository
      .createQueryBuilder('taskTag')
      .innerJoin(Task, 'task', 'task.id = taskTag.task_id')
      .where('task.plan_id = :planId', { planId })
      .andWhere('taskTag.tag IN (:...tags)', { tags: [...tags] })
      .select('DISTINCT taskTag.task_id', 'taskId')
      .getRawMany<{ taskId: string }>();
    return rows.map((row) => row.taskId);
  }

  /**
   * @description Lists the tag rows of a plan's live tasks, or of one task when `taskId` is
   * given.
   */
  async listForPlan(planId: string, taskId?: string): Promise<TaskTag[]> {
    const query = this.repository
      .createQueryBuilder('taskTag')
      .innerJoin(Task, 'task', 'task.id = taskTag.task_id')
      .where('task.plan_id = :planId', { planId });
    if (taskId != null) {
      query.andWhere('taskTag.task_id = :taskId', { taskId });
    }
    return query.getMany();
  }
}
