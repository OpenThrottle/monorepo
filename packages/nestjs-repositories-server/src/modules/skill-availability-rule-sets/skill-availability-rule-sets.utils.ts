import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity.ts';
import { skillAvailabilityRuleSetsFactory } from './skill-availability-rule-sets.factory.ts';
import type { SkillAvailabilityRuleSetsRepositoryMock } from './skill-availability-rule-sets.types.ts';

/**
 * @description Builds a {@link SkillAvailabilityRuleSetsRepositoryMock} that starts as an empty
 * `skill_availability_rule_sets` table (see `createBaseRepositoryMock`): no project has a rule
 * set, `upsertPosture` and `ensureForProject` echo a rule set back, and `removeForProject`
 * reports nothing removed. Provide it in place of `SkillAvailabilityRuleSetsRepository` and stub
 * per test. Test-only: imports `vitest`.
 * @public
 */
export function createSkillAvailabilityRuleSetsRepositoryMock(): SkillAvailabilityRuleSetsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      SkillAvailabilityRuleSet,
      CreateModelInput<SkillAvailabilityRuleSet>
    >('skill_availability_rule_sets'),
    ensureForProject: vi.fn(async (projectId: string) => {
      return skillAvailabilityRuleSetsFactory.build({ projectId });
    }),
    findByProjectId: vi.fn(async () => {
      return null;
    }),
    removeForProject: vi.fn(async () => {
      return false;
    }),
    upsertPosture: vi.fn(async (projectId: string, posture: string) => {
      return skillAvailabilityRuleSetsFactory.build({ posture, projectId });
    }),
  };
}
