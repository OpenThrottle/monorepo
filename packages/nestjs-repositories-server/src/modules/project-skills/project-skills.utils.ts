import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { ProjectSkill } from './project-skill.entity.ts';
import type { ProjectSkillsRepositoryMock } from './project-skills.types.ts';

/**
 * @description Builds a {@link ProjectSkillsRepositoryMock} that starts as an empty
 * `project_skills` table (see `createBaseRepositoryMock`): nothing is listed or found,
 * `reconcile` upserts and orphans nothing, and `removeBySlug` reports nothing removed. Provide
 * it in place of `ProjectSkillsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createProjectSkillsRepositoryMock(): ProjectSkillsRepositoryMock {
  return {
    ...createBaseRepositoryMock<ProjectSkill, CreateModelInput<ProjectSkill>>(
      'project_skills',
    ),
    findByProjectAndSlug: vi.fn(async () => {
      return null;
    }),
    listForProject: vi.fn(async () => {
      return [];
    }),
    reconcile: vi.fn(async () => {
      return { staleSlugs: [], upserted: 0 };
    }),
    removeBySlug: vi.fn(async () => {
      return false;
    }),
  };
}
