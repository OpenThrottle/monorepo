/**
 * @description Resolves a short id fragment or a full UUID to the plans and tasks
 * it identifies. A full UUID is an exact primary-key match; a shorter fragment is
 * a prefix match against the hyphen-stripped id. Plans and tasks are queried in
 * parallel and merged plans-first, newest-updated first within each kind.
 */

import { Injectable } from '@nestjs/common';
import type { Plan, Task } from '@openthrottle/nestjs-repositories-server';
import {
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';

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
    private readonly plansRepository: PlansRepository,
    private readonly tasksRepository: TasksRepository,
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
    if (normalized.length === FULL_UUID_HEX_LENGTH) {
      return this.plansRepository.findBy({
        select: { id: true, status: true, title: true },
        where: { id: toHyphenatedUuid(normalized) },
      });
    }

    // `normalized` is validated hex-only, so the pattern carries no LIKE
    // wildcards of its own.
    return this.plansRepository.findByIdPrefix(normalized, MAX_ID_REF_MATCHES);
  }

  private findTasks(normalized: string): Promise<Task[]> {
    if (normalized.length === FULL_UUID_HEX_LENGTH) {
      return this.tasksRepository.findBy({
        relations: { plan: true },
        select: {
          id: true,
          plan: { id: true, title: true },
          planId: true,
          status: true,
          title: true,
        },
        where: { id: toHyphenatedUuid(normalized) },
      });
    }

    return this.tasksRepository.findByIdPrefix(normalized, MAX_ID_REF_MATCHES);
  }
}
