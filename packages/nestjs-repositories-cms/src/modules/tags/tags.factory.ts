/**
 * @description Fishery factory for {@link Tag}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { Tag } from './tag.entity.ts';

/**
 * @description Column-only shape for building `tags` test data.
 * @public
 */
export type TagFactoryData = Pick<
  Tag,
  'createdAt' | 'description' | 'isDeleted' | 'name' | 'updatedAt' | 'uuid'
>;

/**
 * @description Builds Tag-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const tagsFactory = Factory.define<TagFactoryData>(() => ({
  createdAt: faker.date.past(),
  description: faker.lorem.sentence(),
  isDeleted: false,
  name: faker.word.noun(),
  updatedAt: faker.date.recent(),
  uuid: faker.string.uuid(),
}));
