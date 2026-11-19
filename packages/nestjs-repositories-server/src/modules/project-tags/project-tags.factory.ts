/**
 * @description Fishery factory for {@link ProjectTag}. Use in tests to build mock project tags.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ProjectTag } from './project-tag.entity.ts';

/**
 * Factory for building ProjectTag-shaped objects (plain data for mocks / tests): a human-set
 * `domain` tag by default. Override any field via .build({ tag: 'backend' }).
 * @public
 */
export const projectTagsFactory = Factory.define<Omit<ProjectTag, 'project'>>(
  () => {
    const createdAt = faker.date.past();
    return {
      confidence: null,
      createdAt,
      dimension: 'domain',
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      source: 'human',
      tag: faker.helpers.slugify(faker.word.words(2)).toLowerCase(),
      updatedAt: createdAt,
    };
  },
);
