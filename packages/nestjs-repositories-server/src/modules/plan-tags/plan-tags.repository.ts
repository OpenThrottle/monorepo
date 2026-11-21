import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { PlanTag } from './plan-tag.entity.ts';
import type { PlanEffectiveTagName } from './plan-tags.types.ts';

/**
 * @description Data access for the openthrottle `plan_tags` table on the default connection: the
 * `BaseRepository` CRUD (hard deletes, since a detached tag is simply re-attached) plus the
 * plan-scoped lookups the tag rules need. Validation and the provenance ladder live in the
 * server's tags service.
 * @public
 */
@Injectable()
export class PlanTagsRepository extends BaseRepository<
  PlanTag,
  CreateModelInput<PlanTag>
> {
  protected readonly tableName = 'plan_tags';

  constructor(
    @InjectRepository(PlanTag)
    repository: Repository<PlanTag>,
  ) {
    super(repository);
  }

  /**
   * @description Finds the plan's row for one tag, or null.
   */
  async findByPlanAndTag(planId: string, tag: string): Promise<PlanTag | null> {
    return this.findOne({ where: { planId, tag } });
  }

  /**
   * @description Finds one of the plan's rows in a dimension (the plan's phase tag), or null.
   */
  async findByPlanAndDimension(
    planId: string,
    dimension: string,
  ): Promise<PlanTag | null> {
    return this.findOne({ where: { dimension, planId } });
  }

  /**
   * @description The distinct effective tag names of many plans in ONE query: each plan's own
   * tags, the tags of its live tasks and the tags of its project (the same union the server's
   * `getEffectiveTagSet` rolls up per plan). Returns `{ planId, tag }` pairs; a plan with no tags
   * has no rows. Empty input short-circuits without a query.
   */
  async listEffectiveTagNamesForPlans(
    planIds: readonly string[],
  ): Promise<PlanEffectiveTagName[]> {
    if (planIds.length === 0) {
      return [];
    }
    return this.repository.query<PlanEffectiveTagName[]>(
      `SELECT plan_id AS "planId", tag FROM plan_tags WHERE plan_id = ANY($1::uuid[])
       UNION
       SELECT task.plan_id AS "planId", task_tag.tag
         FROM task_tags task_tag
         JOIN tasks task ON task.id = task_tag.task_id AND task.deleted_at IS NULL
        WHERE task.plan_id = ANY($1::uuid[])
       UNION
       SELECT plan.id AS "planId", project_tag.tag
         FROM project_tags project_tag
         JOIN plans plan ON plan.project_id = project_tag.project_id
        WHERE plan.id = ANY($1::uuid[])`,
      [[...planIds]],
    );
  }

  /**
   * @description Lists every tag row on a plan.
   */
  async listByPlanId(planId: string): Promise<PlanTag[]> {
    return this.findBy({ where: { planId } });
  }
}
