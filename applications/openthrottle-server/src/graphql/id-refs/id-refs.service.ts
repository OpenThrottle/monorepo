/**
 * @description Resolves a short id fragment or a full UUID to the plans and tasks
 * it identifies. A full UUID is an exact primary-key match; a shorter fragment is
 * a prefix match against the hyphen-stripped id. Plans and tasks are queried in
 * parallel and merged plans-first, newest-updated first within each kind.
 */

import { Injectable } from '@nestjs/common';
import type { Plan, Task } from '@openthrottle/nestjs-repositories';
import { PlansService, TasksService } from '@openthrottle/nestjs-repositories';

import {
  FULL_UUID_HEX_LENGTH,
  MAX_ID_REF_MATCHES,
} from './id-refs.constants.ts';
import { ID_REF_KIND } from './id-refs.enum.ts';
import { IdRefObject } from './id-refs.object.ts';
import { normalizeIdRef, toHyphenatedUuid } from './id-refs.utils.ts';

const toPlanRef = (plan: Plan): IdRefObject => {
  const ref = new IdRefObject();

  ref.id = plan.id;
  ref.kind = ID_REF_KIND.PLAN;
  ref.planId = null;
  ref.planTitle = null;
  ref.status = plan.status;
  ref.title = plan.title;

  return ref;
};

const toTaskRef = (task: Task): IdRefObject => {
  const ref = new IdRefObject();

  ref.id = task.id;
  ref.kind = ID_REF_KIND.TASK;
  ref.planId = task.planId;
  ref.planTitle = task.plan?.title ?? null;
  ref.status = task.status;
  ref.title = task.title;

  return ref;
};

@Injectable()
export class IdRefsService {
  constructor(
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * @description Resolve `ref` to matching plan and task refs. Returns [] for
   * input that is too short, too long or not hex.
   */
  async resolve(ref: string): Promise<IdRefObject[]> {
    const normalized = normalizeIdRef(ref);

    if (!normalized) {
      return [];
    }

    const [plans, tasks] = await Promise.all([
      this.findPlans(normalized),
      this.findTasks(normalized),
    ]);

    return [...plans.map(toPlanRef), ...tasks.map(toTaskRef)].slice(
      0,
      MAX_ID_REF_MATCHES,
    );
  }

  private findPlans(normalized: string): Promise<Plan[]> {
    const qb = this.plansService
      .getRepository()
      .createQueryBuilder('plan')
      .select(['plan.id', 'plan.status', 'plan.title']);

    if (normalized.length === FULL_UUID_HEX_LENGTH) {
      return qb
        .where('plan.id = :id', { id: toHyphenatedUuid(normalized) })
        .getMany();
    }

    // `normalized` is validated hex-only, so the pattern carries no LIKE
    // wildcards of its own; it is still passed as a bound parameter.
    return qb
      .where(`REPLACE(plan.id::text, '-', '') ILIKE :pattern`, {
        pattern: `${normalized}%`,
      })
      .orderBy('plan.updatedAt', 'DESC')
      .take(MAX_ID_REF_MATCHES)
      .getMany();
  }

  private findTasks(normalized: string): Promise<Task[]> {
    const qb = this.tasksService
      .getRepository()
      .createQueryBuilder('task')
      .leftJoin('task.plan', 'plan')
      .select([
        'task.id',
        'task.planId',
        'task.status',
        'task.title',
        'plan.id',
        'plan.title',
      ]);

    if (normalized.length === FULL_UUID_HEX_LENGTH) {
      return qb
        .where('task.id = :id', { id: toHyphenatedUuid(normalized) })
        .getMany();
    }

    return (
      qb
        .where(`REPLACE(task.id::text, '-', '') ILIKE :pattern`, {
          pattern: `${normalized}%`,
        })
        .orderBy('task.updatedAt', 'DESC')
        // `limit`, not `take`: with a join, `take` wraps the query in a DISTINCT
        // subquery that cannot order by an unselected column. The plan join is
        // many-to-one, so it never multiplies task rows and LIMIT is exact.
        .limit(MAX_ID_REF_MATCHES)
        .getMany()
    );
  }
}
