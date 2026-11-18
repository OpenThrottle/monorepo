/**
 * @description Fishery factory for {@link Permission}. Use in tests to build mock permissions.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { Permission } from './permission.entity.ts';

/**
 * Factory for building Permission-shaped objects (plain data for mocks / tests). Override any
 * field via .build({ name: 'users:read' }) or .buildList(3).
 * @public
 */
export const permissionsFactory = Factory.define<Permission>(() => ({
  createdAt: faker.date.past(),
  description: faker.helpers.arrayElement([null, faker.lorem.sentence()]),
  id: faker.string.uuid(),
  name: `${faker.word.noun()}:${faker.helpers.arrayElement(['read', 'write'])}`,
  roles: [],
}));
