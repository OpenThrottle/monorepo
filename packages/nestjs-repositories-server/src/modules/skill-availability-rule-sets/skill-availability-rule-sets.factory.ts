/**
 * @description Fishery factory for {@link SkillAvailabilityRuleSet}. Use in tests to build mock
 * rule sets.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity.ts';

/**
 * Factory for building SkillAvailabilityRuleSet-shaped objects (plain data for mocks / tests): a
 * live `allow` rule set by default. Override any field via .build({ posture: 'deny' }).
 * @public
 */
export const skillAvailabilityRuleSetsFactory = Factory.define<
  Omit<SkillAvailabilityRuleSet, 'project' | 'rules'>
>(() => {
  const createdAt = faker.date.past();
  return {
    createdAt,
    deletedAt: null,
    id: faker.string.uuid(),
    posture: 'allow',
    projectId: faker.string.uuid(),
    updatedAt: createdAt,
  };
});
