/**
 * @description Fishery factory for {@link RuleApplication}. Use in tests to build mock ledger
 * rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { RuleApplication } from './rule-application.entity.ts';
import { RULE_APPLICATION_STATES } from './rule-applications.constants.ts';

/**
 * Factory for building RuleApplication-shaped objects (plain data for mocks / tests): an
 * 'applied' row with no injected task by default. Override any field via
 * .build({ state: 'orphaned' }) or .buildList(3, { planId: '...' }).
 * @public
 */
export const ruleApplicationsFactory = Factory.define<
  Omit<RuleApplication, 'plan' | 'rule' | 'task'>
>(() => {
  const createdAt = faker.date.past();
  return {
    createdAt,
    details: null,
    id: faker.string.uuid(),
    planId: faker.string.uuid(),
    ruleId: faker.string.uuid(),
    state: RULE_APPLICATION_STATES.APPLIED,
    taskId: null,
    updatedAt: createdAt,
  };
});
