import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { SkillAvailabilityRule } from './skill-availability-rule.entity.ts';
import type { SkillAvailabilityRulesRepositoryMock } from './skill-availability-rules.types.ts';

/**
 * @description Builds a {@link SkillAvailabilityRulesRepositoryMock} that starts as an empty
 * `skill_availability_rules` table (see `createBaseRepositoryMock`): no rule is found or listed
 * and `removeRule` reports nothing removed. Provide it in place of
 * `SkillAvailabilityRulesRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createSkillAvailabilityRulesRepositoryMock(): SkillAvailabilityRulesRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      SkillAvailabilityRule,
      CreateModelInput<SkillAvailabilityRule>
    >('skill_availability_rules'),
    findRuleById: vi.fn(async () => {
      return null;
    }),
    listByRuleSetId: vi.fn(async () => {
      return [];
    }),
    removeRule: vi.fn(async () => {
      return false;
    }),
  };
}
