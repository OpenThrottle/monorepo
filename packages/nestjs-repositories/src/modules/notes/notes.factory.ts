/**
 * @description Fishery factory for {@link Note}. Use in tests to build mock notes.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { Note } from './note.entity';

/** Column-only shape for building note test data. */
export type NoteFactoryData = Pick<
  Note,
  'id' | 'content' | 'author' | 'createdAt' | 'updatedAt'
>;

/**
 * Factory for building Note-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ content: '...' }) or .buildList(3, { author: 'user' }).
 */
export const notesFactory = Factory.define<NoteFactoryData>(() => ({
  author: faker.internet.username(),
  content: faker.lorem.paragraph(),
  createdAt: faker.date.past(),
  id: faker.string.uuid(),
  updatedAt: faker.date.recent(),
}));
