/**
 * @description Fishery factory for {@link CodeIndexSnapshot}. Use in tests to build mock workspace
 * snapshots.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { CodeIndexSnapshot } from './code-index-snapshot.entity';

/**
 * Factory for building CodeIndexSnapshot-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ workspaceRoot: '...' }).
 */
export const codeIndexSnapshotsFactory = Factory.define<CodeIndexSnapshot>(
  () => ({
    snapshot: Array.from({ length: 3 }, () => ({
      hash: faker.string.hexadecimal({ length: 64, prefix: '' }),
      path: faker.system.filePath(),
    })),
    updatedAt: faker.date.past(),
    workspaceRoot: `/Users/dev/${faker.system.directoryPath()}`,
  }),
);
