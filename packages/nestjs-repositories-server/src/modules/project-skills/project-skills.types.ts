import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { ProjectSkill } from './project-skill.entity.ts';
import type { ProjectSkillsRepository } from './project-skills.repository.ts';

/**
 * @description Scalar/column fields of {@link ProjectSkill} (no relations). Use to type DTOs that
 * mirror the entity.
 * @public
 */
export type ProjectSkillData = Omit<ProjectSkill, 'project'>;

/**
 * @description Outcome of a reconcile: upsert count plus slugs still in the DB but absent from
 * the ingested set.
 * @public
 */
export interface ProjectSkillReconciliation {
  readonly staleSlugs: readonly string[];
  readonly upserted: number;
}

/**
 * @description A {@link ProjectSkillsRepository} mock: every inherited `BaseRepository` method
 * plus the project-skill ones.
 * @public
 */
export interface ProjectSkillsRepositoryMock extends BaseRepositoryMock<
  ProjectSkill,
  CreateModelInput<ProjectSkill>
> {
  readonly findByProjectAndSlug: Mock<
    ProjectSkillsRepository['findByProjectAndSlug']
  >;
  readonly listForProject: Mock<ProjectSkillsRepository['listForProject']>;
  readonly reconcile: Mock<ProjectSkillsRepository['reconcile']>;
  readonly removeBySlug: Mock<ProjectSkillsRepository['removeBySlug']>;
}
