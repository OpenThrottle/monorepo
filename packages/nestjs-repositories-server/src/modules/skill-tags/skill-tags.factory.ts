/**
 * @description Fishery factory for `user_skill_tags` rows. Use in tests to build mock
 * vocabulary tags.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { UserSkillTagData } from './skill-tags.types.ts';

/**
 * @description Builds UserSkillTag-shaped plain objects: a `domain` tag by default. Override
 * any field via `.build({ ... })`.
 * @public
 */
export const skillTagsFactory = Factory.define<UserSkillTagData>(() => {
  const createdAt = faker.date.past();

  return {
    createdAt,
    dimension: 'domain',
    id: faker.string.uuid(),
    tag: faker.helpers.slugify(faker.word.words(2)).toLowerCase(),
    updatedAt: createdAt,
    userId: faker.string.uuid(),
  };
});
