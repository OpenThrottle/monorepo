import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Note } from './note.entity';
import { notesFactory } from './notes.factory';
import { NotesService } from './notes.service';

describe('NotesService', () => {
  type GetRepository = ReturnType<NotesService['getRepository']>;

  let service: NotesService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        NotesService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(Note),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(notesFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<NotesService>(NotesService);
  });

  describe('getRepository', () => {
    it('returns the note repository', () => {
      const repo = service.getRepository();

      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });

    it('returns factory-built data from find', async () => {
      const repo = service.getRepository();
      const notes = await repo.find();

      expect(notes).toHaveLength(2);
      expect(notes[0]).toMatchObject({
        content: expect.any(String),
        createdAt: expect.any(Date),
      });
    });
  });
});
