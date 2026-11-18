/**
 * @description Fishery factory for {@link ServiceAccount}. Use in tests to build mock accounts.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ServiceAccount } from './service-account.entity.ts';

/**
 * Factory for building ServiceAccount-shaped objects (plain data for mocks / tests): a live,
 * enabled, unlinked account with no relations by default. Override any field via
 * .build({ name: 'workflow-ralph' }) or .buildList(3).
 * @public
 */
export const serviceAccountsFactory = Factory.define<ServiceAccount>(() => ({
  actingUserId: null,
  createdAt: faker.date.past(),
  credentials: [],
  deletedAt: null,
  description: faker.helpers.arrayElement([null, faker.lorem.sentence()]),
  disabledAt: null,
  id: faker.string.uuid(),
  name: faker.lorem.slug(2),
  roles: [],
  updatedAt: faker.date.recent(),
}));
