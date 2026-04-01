/**
 * @description Fishery factory for {@link User}. Use in tests to build mock users.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { User } from './user.entity';

// /** Column-only shape for building user test data (no relations). */
// export type UserFactoryData = Pick<
//   User,
//   | 'createdAt'
//   | 'disabledAt'
//   | 'email'
//   | 'githubUsername'
//   | 'id'
//   | 'passwordHash'
//   | 'updatedAt'
// >;

/**
 * Factory for building User-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ githubUsername: '...' }) or .buildList(3, { email: 'a@b.com' }).
 */
export const usersFactory = Factory.define<User>(() => ({
  createdAt: faker.date.past(),
  disabledAt: faker.helpers.arrayElement([null, faker.date.recent()]),
  email: faker.helpers.arrayElement([null, faker.internet.email()]),
  githubUsername: faker.internet.username(),
  id: faker.string.uuid(),
  passwordHash: faker.helpers.arrayElement([
    null,
    '$2b$10$dummy.hash.for.tests',
  ]),
  roles: [],
  updatedAt: faker.date.recent(),
}));
