/**
 * @description Fishery factory for {@link Profile}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { Profile } from './profile.entity.ts';

/**
 * @description Column-only shape for building `profiles` test data.
 * @public
 */
export type ProfileFactoryData = Pick<
  Profile,
  | 'avatarUrl'
  | 'createdAt'
  | 'email'
  | 'firstName'
  | 'isDeleted'
  | 'lastName'
  | 'openthrottleUserId'
  | 'updatedAt'
  | 'username'
  | 'uuid'
  | 'website'
>;

/**
 * @description Builds Profile-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const profilesFactory = Factory.define<ProfileFactoryData>(() => ({
  avatarUrl: faker.image.avatar(),
  createdAt: faker.date.past(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  isDeleted: false,
  lastName: faker.person.lastName(),
  openthrottleUserId: null,
  updatedAt: faker.date.recent(),
  username: faker.internet.username(),
  uuid: faker.string.uuid(),
  website: faker.internet.url(),
}));
