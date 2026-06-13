/**
 * @description Fishery factory for {@link CodeEmbedding}. Use in tests to build mock code embeddings.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { CodeEmbedding } from './code-embedding.entity';

/**
 * Factory for building CodeEmbedding-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ path: '...' }) or .buildList(3, { workspaceRoot: '...' }).
 */
export const codeEmbeddingsFactory = Factory.define<CodeEmbedding>(() => ({
  content: faker.lorem.paragraph(),
  contentHash: faker.string.hexadecimal({ length: 64, prefix: '' }),
  createdAt: faker.date.past(),
  embedding: Array.from({ length: 1536 }, () => faker.number.float()),
  endLine: faker.number.int({ max: 200, min: 11 }),
  id: faker.string.uuid(),
  path: faker.system.filePath(),
  startLine: faker.number.int({ max: 10, min: 1 }),
  workspaceRoot: `/Users/dev/${faker.system.directoryPath()}`,
}));
