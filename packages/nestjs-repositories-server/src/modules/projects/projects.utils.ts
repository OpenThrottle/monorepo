import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { Project } from './project.entity.ts';
import type {
  ProjectCreateInput,
  ProjectsRepositoryMock,
} from './projects.types.ts';

/**
 * @description Builds a {@link ProjectsRepositoryMock} that starts as an empty `projects`
 * table (see `createBaseRepositoryMock`). Provide it in place of `ProjectsRepository` and stub
 * per test. Test-only: imports `vitest`.
 * @public
 */
export function createProjectsRepositoryMock(): ProjectsRepositoryMock {
  return {
    ...createBaseRepositoryMock<Project, ProjectCreateInput>('projects'),
    findAll: vi.fn(async () => {
      return [];
    }),
    findByNxProjectName: vi.fn(async () => {
      return null;
    }),
  };
}
