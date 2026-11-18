import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ListPaginationInput } from '@openthrottle/nestjs-postgres';
import {
  BaseRepository,
  resolveListPagination,
} from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { Project } from './project.entity.ts';
import type { ProjectCreateInput } from './projects.types.ts';

/**
 * @description Data access for the openthrottle `projects` table on the default connection:
 * the `BaseRepository` CRUD plus the Nx-name lookup and the newest-first list. A delete is a
 * soft delete; the project's plans and tasks keep their `project_id`.
 * @public
 */
@Injectable()
export class ProjectsRepository extends BaseRepository<
  Project,
  ProjectCreateInput
> {
  protected readonly tableName = 'projects';

  constructor(
    @InjectRepository(Project)
    repository: Repository<Project>,
  ) {
    super(repository);
  }

  /**
   * @description Finds a live project by its `nx_project_name`, or null if not found. Used to
   * anchor the dogfood monorepo project (`nx_project_name = 'monorepo'`) when no explicit
   * projectId is supplied.
   */
  async findByNxProjectName(nxProjectName: string): Promise<Project | null> {
    return this.repository.findOne({ where: { nxProjectName } });
  }

  /**
   * @description Returns live projects ordered by created_at descending. Accepts an optional
   * clamped `{ limit, offset }` so the result set stays bounded.
   */
  async findAll(pagination?: ListPaginationInput): Promise<Project[]> {
    const { skip, take } = resolveListPagination(pagination);
    return this.repository.find({
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}
