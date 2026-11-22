import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { ProjectRun } from './project-run.entity.ts';
import type {
  ProjectRunCreateInput,
  ProjectRunsRepositoryMock,
} from './project-runs.types.ts';

/**
 * @description Builds a {@link ProjectRunsRepositoryMock} that starts as an empty `project_runs`
 * table (see `createBaseRepositoryMock`): nothing is found or active, and every guarded
 * transition reports it lost (no active row to move). Provide it in place of
 * `ProjectRunsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createProjectRunsRepositoryMock(): ProjectRunsRepositoryMock {
  return {
    ...createBaseRepositoryMock<ProjectRun, ProjectRunCreateInput>(
      'project_runs',
    ),
    findActive: vi.fn(async () => {
      return [];
    }),
    findActiveByProjectId: vi.fn(async () => {
      return null;
    }),
    findLatestByProjectIds: vi.fn(async () => {
      return new Map();
    }),
    findRunById: vi.fn(async () => {
      return null;
    }),
    setCurrentPlan: vi.fn(async () => {
      return false;
    }),
    settleCancelled: vi.fn(async () => {
      return false;
    }),
    settleCompleted: vi.fn(async () => {
      return false;
    }),
    settleStopped: vi.fn(async () => {
      return false;
    }),
    stampCancelRequested: vi.fn(async () => {
      return false;
    }),
  };
}
