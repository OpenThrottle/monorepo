import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { SkillUsageOutcome } from './skill-usage-outcome.entity.ts';
import type { SkillUsageOutcomesRepositoryMock } from './skill-usage-outcomes.types.ts';

/**
 * @description Builds a {@link SkillUsageOutcomesRepositoryMock} that starts as an empty
 * `skill_usage_outcomes` table (see `createBaseRepositoryMock`). `recordSkillUsageOutcome`
 * rejects until a test stubs it, since an invented row would hide a missing stub. Provide
 * it in place of `SkillUsageOutcomesRepository` and stub per test. Test-only: imports
 * `vitest`.
 * @public
 */
export function createSkillUsageOutcomesRepositoryMock(): SkillUsageOutcomesRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      SkillUsageOutcome,
      CreateModelInput<SkillUsageOutcome>
    >('skill_usage_outcomes'),
    recordSkillUsageOutcome: vi.fn(() => {
      return Promise.reject(
        new Error(
          'skill_usage_outcomes.recordSkillUsageOutcome is not stubbed in this test',
        ),
      );
    }),
  };
}
