/**
 * @description Fishery factory for {@link ServiceAccountCredential}. Use in tests to build mock credentials.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ServiceAccountCredential } from './service-account-credential.entity.ts';

/**
 * Factory for building ServiceAccountCredential-shaped objects (plain data for mocks / tests):
 * an active credential (not revoked, not expired, never used) by default. `serviceAccount` is
 * left out; override `serviceAccountId` to link one.
 * @public
 */
export const serviceAccountCredentialsFactory = Factory.define<
  Omit<ServiceAccountCredential, 'serviceAccount'>
>(() => ({
  createdAt: faker.date.past(),
  expiresAt: null,
  id: faker.string.uuid(),
  label: faker.helpers.arrayElement([null, faker.lorem.word()]),
  lastUsedAt: null,
  prefix: faker.string.alphanumeric(12),
  revokedAt: null,
  secretHash: '$2b$10$dummy.hash.for.tests',
  serviceAccountId: faker.string.uuid(),
}));
