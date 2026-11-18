/**
 * @description Fishery factory for {@link RepositoryCheckout}. Use in tests to build mock checkouts.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { RepositoryCheckout } from './repository-checkout.entity.ts';

/**
 * Factory for building RepositoryCheckout-shaped objects (plain data for mocks / tests): a live,
 * unmanaged primary checkout by default.
 * Override any field via .build({ kind: 'worktree' }) or .buildList(3, { userId: '...' }).
 * @public
 */
export const repositoryCheckoutsFactory = Factory.define<RepositoryCheckout>(
  () => ({
    createdAt: faker.date.past(),
    deletedAt: null,
    displayName: faker.lorem.words(2),
    filesystemPath: faker.system.directoryPath(),
    foreignSkillInjectionEnabled: false,
    id: faker.string.uuid(),
    inspection: null,
    kind: 'primary',
    managed: false,
    repositoryId: faker.string.uuid(),
    scannedAt: null,
    updatedAt: faker.date.recent(),
    userId: faker.string.uuid(),
    worktreeSkillOverlayEnabled: true,
  }),
);
