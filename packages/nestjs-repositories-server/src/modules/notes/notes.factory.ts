/**
 * @description Fishery factory for {@link Note}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { Note } from './note.entity.ts';

/**
 * @description Column-only shape for building `notes` test data.
 * @public
 */
export type NoteFactoryData = Pick<
  Note,
  'author' | 'content' | 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'
>;

/**
 * @description Builds Note-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const notesFactory = Factory.define<NoteFactoryData>(() => ({
  author: faker.internet.username(),
  content: faker.lorem.paragraph(),
  createdAt: faker.date.past(),
  deletedAt: null,
  id: faker.string.uuid(),
  updatedAt: faker.date.recent(),
}));
