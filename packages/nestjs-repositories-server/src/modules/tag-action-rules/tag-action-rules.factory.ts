/**
 * @description Fishery factory for {@link TagActionRule}. Use in tests to build mock
 * tag-action rules.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { TagActionRule } from './tag-action-rule.entity.ts';

/**
 * Factory for building TagActionRule-shaped objects (plain data for mocks / tests): a live,
 * enabled `inject-task` rule with no project, status or environment scope by default. Override
 * any field via .build({ enabled: false }) or .buildList(3, { userId: '...' }).
 * @public
 */
export const tagActionRulesFactory = Factory.define<
  Omit<TagActionRule, 'project' | 'user'>
>(() => {
  const createdAt = faker.date.past();
  return {
    actionPayload: { placement: 'first', skillSlug: faker.lorem.slug(2) },
    actionType: 'inject-task',
    createdAt,
    deletedAt: null,
    enabled: true,
    environment: null,
    id: faker.string.uuid(),
    projectId: null,
    status: null,
    tagAll: [faker.word.noun()],
    title: faker.lorem.words(3),
    updatedAt: createdAt,
    userId: faker.string.uuid(),
  };
});
