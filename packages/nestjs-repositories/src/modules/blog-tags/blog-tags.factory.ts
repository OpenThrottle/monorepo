/**
 * @description Fishery factory for {@link BlogTag}. Use in tests to build mock blog tags.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { BlogTagData } from './blog-tag.entity.ts';

/**
 * Factory for building BlogTag-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ name: '...' }) or .buildList(3, { description: null }).
 */
export const blogTagsFactory = Factory.define<BlogTagData>(({ sequence }) => ({
  createdAt: faker.date.past(),
  description: faker.lorem.sentence(),
  id: faker.string.uuid(),
  name: faker.word.noun(),
  slug: `${faker.word.noun()}-${sequence}`,
  updatedAt: faker.date.recent(),
}));
