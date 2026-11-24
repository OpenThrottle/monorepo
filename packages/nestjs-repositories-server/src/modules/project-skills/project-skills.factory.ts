/**
 * @description Fishery factory for {@link ProjectSkill}. Use in tests to build mock project skills.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ProjectSkill } from './project-skill.entity.ts';

/**
 * Factory for building ProjectSkill-shaped objects (plain data for mocks / tests): a live,
 * untagged, non-orphaned external skill by default. Override any field via
 * .build({ slug: 'pr-review' }) or .buildList(3, { projectId: '...' }).
 * @public
 */
export const projectSkillsFactory = Factory.define<
  Omit<ProjectSkill, 'project'>
>(() => {
  const createdAt = faker.date.past();
  return {
    createdAt,
    deletedAt: null,
    description: faker.lorem.sentence(),
    disableModelInvocation: null,
    id: faker.string.uuid(),
    ingestedAt: createdAt,
    orphanedAt: null,
    outcomeTelemetry: null,
    projectId: faker.string.uuid(),
    slug: faker.helpers.slugify(faker.word.words(2)).toLowerCase(),
    source: 'external',
    sourcePath: faker.system.filePath(),
    sourceUrl: null,
    tags: [],
    updatedAt: createdAt,
  };
});
