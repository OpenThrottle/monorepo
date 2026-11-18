import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { Note } from './note.entity.ts';
import { notesFactory } from './notes.factory.ts';
import { NotesRepository } from './notes.repository.ts';

describe('NotesRepository', () => {
  const rows = notesFactory.buildList(2);
  const typeorm = createMock<Repository<Note>>({
    find: () => Promise.resolve(rows),
    target: Note,
  });

  let repository: NotesRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        NotesRepository,
        { provide: getRepositoryToken(Note), useValue: typeorm },
      ],
    }).compile();

    repository = app.get(NotesRepository);
  });

  describe('findAllNewestFirst', () => {
    it('reads newest first, leaving soft-deleted rows to TypeORM', async () => {
      await expect(repository.findAllNewestFirst()).resolves.toBe(rows);
      // `@DeleteDateColumn` already hides deleted rows from `find`, so the
      // options pass through without an explicit `deletedAt` filter.
      expect(typeorm.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });
});
