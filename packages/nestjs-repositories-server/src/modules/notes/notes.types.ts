import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { Note } from './note.entity.ts';
import type { NotesRepository } from './notes.repository.ts';

/**
 * @description A {@link NotesRepository} mock: every inherited
 * `BaseRepository` method plus the notes-specific ones.
 * @public
 */
export interface NotesRepositoryMock extends BaseRepositoryMock<
  Note,
  CreateModelInput<Note>
> {
  readonly findAllNewestFirst: Mock<NotesRepository['findAllNewestFirst']>;
}
