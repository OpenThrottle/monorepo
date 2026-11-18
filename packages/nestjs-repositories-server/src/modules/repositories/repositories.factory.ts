/**
 * @description Fishery factory for {@link Repository}. Use in tests to build mock repositories.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { Repository } from './repository.entity.ts';

/**
 * Factory for building Repository-shaped objects (plain data for mocks / tests): a live
 * repository with a canonical remote by default.
 * Override any field via .build({ normalizedRemoteUrl: null }) or .buildList(3, { name: '...' }).
 * @public
 */
export const repositoriesFactory = Factory.define<Repository>(() => ({
  createdAt: faker.date.past(),
  defaultBranch: 'main',
  deletedAt: null,
  id: faker.string.uuid(),
  ledgerHarvestCursor: null,
  ledgerHarvestEnabled: true,
  ledgerHarvestedAt: null,
  name: faker.lorem.words(2),
  normalizedRemoteUrl: `https://github.com/${faker.internet.username()}/${faker.lorem.word()}`,
  projectId: null,
  updatedAt: faker.date.recent(),
}));
