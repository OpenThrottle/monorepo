/**
 * @description Fishery factory for {@link SkillAvailabilityRule}. Use in tests to build mock
 * rules.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { SkillAvailabilityRule } from './skill-availability-rule.entity.ts';

/**
 * Factory for building SkillAvailabilityRule-shaped objects (plain data for mocks / tests): a
 * live, environment-agnostic rule with empty allow and deny lists by default. Override any field
 * via .build({ tagDeny: ['backend'] }).
 * @public
 */
export const skillAvailabilityRulesFactory = Factory.define<
  Omit<SkillAvailabilityRule, 'ruleSet'>
>(() => {
  const createdAt = faker.date.past();
  return {
    createdAt,
    deletedAt: null,
    editor: null,
    environment: null,
    id: faker.string.uuid(),
    role: null,
    ruleSetId: faker.string.uuid(),
    slugAllow: [],
    slugDeny: [],
    tagAllow: [],
    tagDeny: [],
    updatedAt: createdAt,
  };
});
