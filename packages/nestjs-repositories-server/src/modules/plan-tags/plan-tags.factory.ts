/**
 * @description Fishery factory for {@link PlanTag}. Use in tests to build mock plan tags.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { PlanTag } from './plan-tag.entity.ts';

/**
 * Factory for building PlanTag-shaped objects (plain data for mocks / tests): a human-set
 * `domain` tag by default. Override any field via .build({ tag: 'backend' }).
 * @public
 */
export const planTagsFactory = Factory.define<Omit<PlanTag, 'plan'>>(() => {
  const createdAt = faker.date.past();
  return {
    confidence: null,
    createdAt,
    dimension: 'domain',
    id: faker.string.uuid(),
    planId: faker.string.uuid(),
    source: 'human',
    tag: faker.helpers.slugify(faker.word.words(2)).toLowerCase(),
    updatedAt: createdAt,
  };
});
