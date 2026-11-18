import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type {
  PlanOutputChunkCreateInput,
  PlanOutputStreamRepositoryMock,
} from './plan-output-stream.types.ts';
import type { PlanOutputStreamChunk } from './plan-output-stream-chunk.entity.ts';

/**
 * @description Builds a {@link PlanOutputStreamRepositoryMock} that starts as an empty
 * `plan_output_stream` table (see `createBaseRepositoryMock`): `listChunks` resolves no
 * chunks. Provide it in place of `PlanOutputStreamRepository` and stub per test. Test-only:
 * imports `vitest`.
 * @public
 */
export function createPlanOutputStreamRepositoryMock(): PlanOutputStreamRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      PlanOutputStreamChunk,
      PlanOutputChunkCreateInput
    >('plan_output_stream'),
    listChunks: vi.fn(async () => {
      return [];
    }),
  };
}
