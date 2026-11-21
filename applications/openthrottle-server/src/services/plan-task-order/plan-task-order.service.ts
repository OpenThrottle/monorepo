/**
 * @description Orders the tasks of a plan. Owns the request-level rules (no duplicate ids, every
 * id a live task of the plan) on top of the shared sort-order helpers that
 * `TasksRepository.reorderInPlan` wraps.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import type { Task } from '@openthrottle/nestjs-repositories-server';
import { TasksRepository } from '@openthrottle/nestjs-repositories-server';
import { In } from 'typeorm';

@Injectable()
export class PlanTaskOrderService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  /**
   * @description Reorders the listed tasks of a plan among the sort values they already hold:
   * they take those values in list order, and every unlisted task keeps its place, so a full
   * list is a full reorder and a partial list reorders only itself. Returns the listed tasks in
   * list order with their new `sortOrder`.
   * @throws BadRequestException on a duplicate id or an id that is not a live task of the plan.
   */
  async reorderTasks(
    planId: string,
    taskIds: readonly string[],
  ): Promise<Task[]> {
    if (taskIds.length === 0) {
      return [];
    }

    const result = await this.tasksRepository.reorderInPlan(planId, taskIds);

    if (result.kind === 'duplicate-ids') {
      throw new BadRequestException('taskIds must not contain duplicates');
    }
    if (result.kind === 'ids-not-in-scope') {
      throw new BadRequestException(
        'One or more taskIds do not belong to the plan',
      );
    }

    const tasks = await this.tasksRepository.findBy({
      where: { id: In([...taskIds]), planId },
    });
    const byId = new Map(
      tasks.map((task) => {
        return [task.id, task];
      }),
    );

    return taskIds.flatMap((id) => {
      const task = byId.get(id);

      return task === undefined ? [] : [task];
    });
  }
}
