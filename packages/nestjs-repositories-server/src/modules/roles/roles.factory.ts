/**
 * @description Fishery factory for {@link Role}. Use in tests to build mock roles.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { Role } from './role.entity.ts';

/**
 * Factory for building Role-shaped objects (plain data for mocks / tests): a live role with no
 * relations by default. Override any field via .build({ name: 'admin' }) or .buildList(3).
 * @public
 */
export const rolesFactory = Factory.define<Role>(() => ({
  createdAt: faker.date.past(),
  deletedAt: null,
  description: faker.helpers.arrayElement([null, faker.lorem.sentence()]),
  id: faker.string.uuid(),
  name: faker.word.noun(),
  permissions: [],
  serviceAccounts: [],
  updatedAt: faker.date.recent(),
  users: [],
}));
