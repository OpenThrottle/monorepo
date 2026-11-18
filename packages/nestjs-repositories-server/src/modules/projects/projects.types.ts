import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { Project } from './project.entity.ts';
import type { ProjectsRepository } from './projects.repository.ts';

/**
 * Scalar/column fields of Project (no relations, no `deletedAt`). Use to type GraphQL objects
 * or DTOs that mirror the entity.
 * @public
 */
export type ProjectData = Omit<Project, 'deletedAt' | 'plans' | 'tasks'>;

/**
 * @description What `ProjectsRepository.create` takes: the project's columns, with the plan and
 * task relations left out and the nullable columns optional. `name` is required.
 * @public
 */
export interface ProjectCreateInput
  extends
    Omit<
      CreateModelInput<Project>,
      'description' | 'nxProjectName' | 'plans' | 'tasks'
    >,
    Partial<Pick<CreateModelInput<Project>, 'description' | 'nxProjectName'>> {}

/**
 * @description A {@link ProjectsRepository} mock: every inherited `BaseRepository` method plus
 * the project ones.
 * @public
 */
export interface ProjectsRepositoryMock extends BaseRepositoryMock<
  Project,
  ProjectCreateInput
> {
  readonly findAll: Mock<ProjectsRepository['findAll']>;
  readonly findByNxProjectName: Mock<ProjectsRepository['findByNxProjectName']>;
}
