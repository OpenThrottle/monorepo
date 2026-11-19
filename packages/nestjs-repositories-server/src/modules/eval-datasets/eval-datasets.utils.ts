import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { EvalDataset } from './eval-dataset.entity.ts';
import { evalDatasetsFactory } from './eval-datasets.factory.ts';
import type { EvalDatasetsRepository } from './eval-datasets.repository.ts';
import type { EvalDatasetsRepositoryMock } from './eval-datasets.types.ts';

/**
 * @description Builds an {@link EvalDatasetsRepositoryMock} that starts as an empty
 * `eval_datasets` table (see `createBaseRepositoryMock`): lookups resolve null or an empty list,
 * and `createDataset` resolves a version 1 factory row carrying its input. Provide it in place of
 * `EvalDatasetsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createEvalDatasetsRepositoryMock(): EvalDatasetsRepositoryMock {
  return {
    ...createBaseRepositoryMock<EvalDataset, CreateModelInput<EvalDataset>>(
      'eval_datasets',
    ),
    createDataset: vi.fn<EvalDatasetsRepository['createDataset']>(
      async (input) => {
        return evalDatasetsFactory.build({
          createdBy: input.createdBy,
          description: input.description,
          name: input.name,
          repositoryId: input.repositoryId,
          target: input.target,
        });
      },
    ),
    findByRepository: vi.fn(async () => {
      return [];
    }),
    findDatasetById: vi.fn(async () => {
      return null;
    }),
  };
}
