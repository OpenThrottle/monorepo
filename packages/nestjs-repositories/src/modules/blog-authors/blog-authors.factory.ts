/**
 * @description Fishery factory for {@link BlogAuthor}. Use in tests to build mock blog authors.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { BlogAuthorData } from './blog-author.entity.ts';

/**
 * Factory for building BlogAuthor-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ displayName: '...' }) or .buildList(3, { userId: null }).
 */
export const blogAuthorsFactory = Factory.define<BlogAuthorData>(() => ({
  avatarUrl: faker.image.avatar(),
  bio: faker.lorem.sentence(),
  createdAt: faker.date.past(),
  displayName: faker.person.fullName(),
  id: faker.string.uuid(),
  slug: faker.helpers.slugify(faker.person.fullName()).toLowerCase(),
  updatedAt: faker.date.recent(),
  userId: null,
}));
