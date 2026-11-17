import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { Note } from './note.entity.ts';
import type { NotesRepositoryMock } from './notes.types.ts';

/**
 * @description Builds a {@link NotesRepositoryMock} that starts as an empty
 * `notes` table (see `createBaseRepositoryMock`). Provide it in place of
 * `NotesRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createNotesRepositoryMock(): NotesRepositoryMock {
  return {
    ...createBaseRepositoryMock<Note, CreateModelInput<Note>>('notes'),
    findAllNewestFirst: vi.fn(async () => {
      return [];
    }),
  };
}
