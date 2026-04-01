/**
 * @description Fishery factory for {@link CommitLink}. Use in tests to build mock commit links.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { CommitLink } from './commit-link.entity';

/** Column-only shape for building commit link test data (no relations). */
export type CommitLinkData = Pick<
  CommitLink,
  'createdAt' | 'id' | 'message' | 'planId' | 'repo' | 'sha' | 'taskId'
>;

/**
 * Factory for building CommitLink-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ planId: '...' }) or .buildList(3, { repo: 'owner/repo' }).
 */
export const commitLinksFactory = Factory.define<CommitLinkData>(() => ({
  createdAt: faker.date.past(),
  id: faker.string.uuid(),
  message: faker.git.commitMessage(),
  planId: faker.string.uuid(),
  repo: `${faker.string.alphanumeric(8)}/${faker.string.alphanumeric(8)}`,
  sha: faker.git.commitSha(),
  taskId: null,
}));
