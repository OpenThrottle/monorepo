/**
 * @description Fishery factory for {@link TaskTag}. Use in tests to build mock task tags.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { TaskTag } from './task-tag.entity.ts';

/**
 * Factory for building TaskTag-shaped objects (plain data for mocks / tests): a human-set
 * `domain` tag by default. Override any field via .build({ tag: 'backend' }).
 * @public
 */
export const taskTagsFactory = Factory.define<Omit<TaskTag, 'task'>>(() => {
  const createdAt = faker.date.past();
  return {
    confidence: null,
    createdAt,
    dimension: 'domain',
    id: faker.string.uuid(),
    source: 'human',
    tag: faker.helpers.slugify(faker.word.words(2)).toLowerCase(),
    taskId: faker.string.uuid(),
    updatedAt: createdAt,
  };
});
