/**
 * @description Fishery factory for {@link WorktreeRemoval}. Use in tests to build mock
 * worktree removal rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { WorktreeRemoval } from './worktree-removal.entity.ts';

/**
 * @description Column-only shape for building `worktree_removals` test data.
 * @public
 */
export type WorktreeRemovalFactoryData = Pick<
  WorktreeRemoval,
  | 'agentSession'
  | 'ancestry'
  | 'branch'
  | 'checkoutId'
  | 'createdAt'
  | 'filesystemPath'
  | 'id'
  | 'outcome'
  | 'parentCommand'
  | 'pid'
  | 'ppid'
  | 'probe'
  | 'removedAt'
  | 'repositoryId'
  | 'result'
  | 'userId'
>;

/**
 * @description Builds WorktreeRemoval-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const worktreeRemovalsFactory =
  Factory.define<WorktreeRemovalFactoryData>(() => ({
    agentSession: null,
    ancestry: null,
    branch: faker.git.branch(),
    checkoutId: null,
    createdAt: faker.date.past(),
    filesystemPath: faker.system.directoryPath(),
    id: faker.string.uuid(),
    outcome: 'pruned',
    parentCommand: null,
    pid: null,
    ppid: null,
    probe: null,
    removedAt: faker.date.past(),
    repositoryId: null,
    result: 'removed',
    userId: faker.string.uuid(),
  }));
