/**
 * @description Fishery factory for {@link Library}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { CMS_STATUS } from '../../config/config.constants.ts';
import type { Library } from './library.entity.ts';

/**
 * @description Column-only shape for building `libraries` test data.
 * @public
 */
export type LibraryFactoryData = Pick<
  Library,
  | 'createdAt'
  | 'description'
  | 'isDeleted'
  | 'name'
  | 'status'
  | 'updatedAt'
  | 'uuid'
>;

/**
 * @description Builds Library-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const librariesFactory = Factory.define<LibraryFactoryData>(() => ({
  createdAt: faker.date.past(),
  description: faker.lorem.sentence(),
  isDeleted: false,
  name: faker.lorem.words(2),
  status: CMS_STATUS.DRAFT,
  updatedAt: faker.date.recent(),
  uuid: faker.string.uuid(),
}));
