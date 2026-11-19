import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { Plan } from '../plans/plan.entity.ts';
import { ProjectTag } from './project-tag.entity.ts';

/**
 * @description Data access for the openthrottle `project_tags` table on the default connection:
 * the `BaseRepository` CRUD (hard deletes, since a detached tag is simply re-attached) plus the
 * lookups the tag rules need. Validation and the provenance ladder live in the server's tags
 * service.
 * @public
 */
@Injectable()
export class ProjectTagsRepository extends BaseRepository<
  ProjectTag,
  CreateModelInput<ProjectTag>
> {
  protected readonly tableName = 'project_tags';

  constructor(
    @InjectRepository(ProjectTag)
    repository: Repository<ProjectTag>,
  ) {
    super(repository);
  }

  /**
   * @description Finds the project's row for one tag, or null.
   */
  async findByProjectAndTag(
    projectId: string,
    tag: string,
  ): Promise<ProjectTag | null> {
    return this.findOne({ where: { projectId, tag } });
  }

  /**
   * @description Lists the tag rows of the project a plan belongs to; empty when the plan has no
   * project.
   */
  async listForPlanProject(planId: string): Promise<ProjectTag[]> {
    return this.repository
      .createQueryBuilder('projectTag')
      .innerJoin(Plan, 'plan', 'plan.project_id = projectTag.project_id')
      .where('plan.id = :planId', { planId })
      .getMany();
  }
}
