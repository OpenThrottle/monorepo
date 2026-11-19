/**
 * @description Fishery factory for {@link CustomPrompt}. Use in tests to build mock custom
 * prompts.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { CustomPrompt } from './custom-prompt.entity.ts';

/**
 * Factory for building CustomPrompt-shaped objects (plain data for mocks / tests): a live
 * `prompts` document with no owner, project or file path by default. Override any field via
 * .build({ promptType: 'personas' }) or .buildList(3, { projectId: '...' }).
 * @public
 */
export const customPromptsFactory = Factory.define<
  Omit<CustomPrompt, 'project' | 'user'>
>(() => {
  const createdAt = faker.date.past();
  return {
    content: faker.lorem.paragraphs(2),
    createdAt,
    deletedAt: null,
    description: null,
    filePath: null,
    id: faker.string.uuid(),
    labels: [],
    projectId: null,
    promptType: 'prompts',
    title: faker.lorem.words(3),
    updatedAt: createdAt,
    userId: null,
  };
});
