import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { PlanTag } from './plan-tag.entity.ts';

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
   * @description Lists every tag row on a plan.
   */
  async listByPlanId(planId: string): Promise<PlanTag[]> {
    return this.findBy({ where: { planId } });
  }
}
