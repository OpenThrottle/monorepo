import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { Project } from '../projects/project.entity.ts';
import type { Repository } from '../repositories/repository.entity.ts';
import type { ProjectRepositoriesRepository } from './project-repositories.repository.ts';
import type { ProjectRepository } from './project-repository.entity.ts';

/**
 * @description Scalar fields of a project-repository link that GraphQL objects and DTOs mirror.
 * @public
 */
export interface ProjectRepositoryData {
  readonly createdAt: Date;
  readonly id: string;
  readonly projectId: string;
  readonly repositoryId: string;
}

/**
 * @description What `ProjectRepositoriesRepository.create` takes: the link's two ids.
 * @public
 */
export interface ProjectRepositoryCreateInput extends Omit<
  CreateModelInput<ProjectRepository>,
  'project' | 'repository'
> {}

/**
 * @description A {@link ProjectRepositoriesRepository} mock: every inherited `BaseRepository`
 * method plus the link lookups.
 * @public
 */
export interface ProjectRepositoriesRepositoryMock extends BaseRepositoryMock<
  ProjectRepository,
  ProjectRepositoryCreateInput
> {
  readonly findByProjectAndRepository: Mock<
    ProjectRepositoriesRepository['findByProjectAndRepository']
  >;
  readonly link: Mock<ProjectRepositoriesRepository['link']>;
  readonly listProjectsByRepositoryIds: Mock<
    ProjectRepositoriesRepository['listProjectsByRepositoryIds']
  >;
  readonly listRepositoriesByProjectIds: Mock<
    ProjectRepositoriesRepository['listRepositoriesByProjectIds']
  >;
  readonly syncLegacyProject: Mock<
    ProjectRepositoriesRepository['syncLegacyProject']
  >;
  readonly unlink: Mock<ProjectRepositoriesRepository['unlink']>;
}

/**
 * @description Live repositories grouped by the project they are linked to.
 * @public
 */
export type RepositoriesByProjectId = ReadonlyMap<string, Repository[]>;

/**
 * @description Live projects grouped by the repository they are linked to.
 * @public
 */
export type ProjectsByRepositoryId = ReadonlyMap<string, Project[]>;
