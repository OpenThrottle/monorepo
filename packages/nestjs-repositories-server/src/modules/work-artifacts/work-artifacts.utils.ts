import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { WorkArtifact } from './work-artifact.entity.ts';
import type { WorkArtifactsRepositoryMock } from './work-artifacts.types.ts';

/**
 * @description Builds a {@link WorkArtifactsRepositoryMock} that starts as an empty
 * `work_artifacts` table (see `createBaseRepositoryMock`): `listPlanCompleteness` resolves
 * `[]`. Provide it in place of `WorkArtifactsRepository` and stub per test. Test-only:
 * imports `vitest`.
 * @public
 */
export function createWorkArtifactsRepositoryMock(): WorkArtifactsRepositoryMock {
  return {
    ...createBaseRepositoryMock<WorkArtifact, CreateModelInput<WorkArtifact>>(
      'work_artifacts',
    ),
    listPlanCompleteness: vi.fn(async () => {
      return [];
    }),
  };
}
