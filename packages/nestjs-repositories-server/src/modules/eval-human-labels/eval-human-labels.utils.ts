import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { EvalHumanLabel } from './eval-human-label.entity.ts';
import { evalHumanLabelsFactory } from './eval-human-labels.factory.ts';
import type { EvalHumanLabelsRepository } from './eval-human-labels.repository.ts';
import type { EvalHumanLabelsRepositoryMock } from './eval-human-labels.types.ts';

/**
 * @description Builds an {@link EvalHumanLabelsRepositoryMock} that starts as an empty
 * `eval_human_labels` table (see `createBaseRepositoryMock`): the per-trajectory listing resolves
 * an empty list, `removeLabel` finds no label (false), and `upsert` resolves a factory row
 * carrying its input. Provide it in place of `EvalHumanLabelsRepository` and stub per test.
 * Test-only: imports `vitest`.
 * @public
 */
export function createEvalHumanLabelsRepositoryMock(): EvalHumanLabelsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      EvalHumanLabel,
      CreateModelInput<EvalHumanLabel>
    >('eval_human_labels'),
    findByTrajectory: vi.fn(async () => {
      return [];
    }),
    removeLabel: vi.fn(async () => {
      return false;
    }),
    upsert: vi.fn<EvalHumanLabelsRepository['upsert']>(async (input) => {
      return evalHumanLabelsFactory.build(input);
    }),
  };
}
