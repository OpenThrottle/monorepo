/**
 * @description Fishery factory for {@link Fragment}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { Fragment } from './fragment.entity.ts';

/**
 * @description Column-only shape for building `fragments` test data.
 * @public
 */
export type FragmentFactoryData = Pick<
  Fragment,
  | 'createdAt'
  | 'isDeleted'
  | 'isSystem'
  | 'name'
  | 'properties'
  | 'schemaUuid'
  | 'typename'
  | 'updatedAt'
  | 'uuid'
>;

/**
 * @description Builds Fragment-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const fragmentsFactory = Factory.define<FragmentFactoryData>(() => ({
  createdAt: faker.date.past(),
  isDeleted: false,
  isSystem: false,
  name: faker.lorem.words(2),
  properties: {},
  schemaUuid: faker.string.uuid(),
  typename: faker.word.noun(),
  updatedAt: faker.date.recent(),
  uuid: faker.string.uuid(),
}));
