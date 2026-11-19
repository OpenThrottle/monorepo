import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { TagSource } from '../plan-tags/tag-source/tag-source.types.ts';
import type { ProjectTag } from './project-tag.entity.ts';
import type { ProjectTagsRepository } from './project-tags.repository.ts';

/**
 * @description Scalar fields of a project tag that GraphQL objects and DTOs mirror.
 * @public
 */
export interface ProjectTagData {
  readonly confidence: number | null;
  readonly dimension: string;
  readonly id: string;
  readonly projectId: string;
  readonly source: TagSource;
  readonly tag: string;
}

/**
 * @description A {@link ProjectTagsRepository} mock: every inherited `BaseRepository` method plus
 * the project-tag lookups.
 * @public
 */
export interface ProjectTagsRepositoryMock extends BaseRepositoryMock<
  ProjectTag,
  CreateModelInput<ProjectTag>
> {
  readonly findByProjectAndTag: Mock<
    ProjectTagsRepository['findByProjectAndTag']
  >;
  readonly listForPlanProject: Mock<
    ProjectTagsRepository['listForPlanProject']
  >;
}
