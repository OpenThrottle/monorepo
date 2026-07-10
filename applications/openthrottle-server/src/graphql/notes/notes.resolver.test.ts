import type { Note } from '@openthrottle/nestjs-repositories';
import { NotesService } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { NotesResolver } from './notes.resolver';

const notesRepo = { find: vi.fn(), findOne: vi.fn() };

const mockNotesService = createMock<NotesService>({
  getRepository: vi.fn().mockReturnValue(notesRepo),
});

describe('NotesResolver', () => {
  let resolver: NotesResolver;
  let notesService: NotesService;

  const mockNote: Note = {
    author: 'visormatt',
    content: 'Quick thought for planning',
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    id: 'ddc5ff9d-8dee-4d99-b9ee-b7c5a0bd879f',
    updatedAt: new Date('2026-02-01T22:05:00.000Z'),
  };

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        NotesResolver,
        { provide: NotesService, useValue: mockNotesService },
      ],
    }).compile();

    resolver = app.get<NotesResolver>(NotesResolver);
    notesService = app.get<NotesService>(NotesService);
  });

  describe('note', () => {
    test('returns NoteObject when note exists', async () => {
      const repo = notesService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockNote);

      const result = await resolver.note(mockNote.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockNote.id);
      expect(result?.content).toBe(mockNote.content);
      expect(result?.author).toBe(mockNote.author);
      expect(result?.createdAt).toEqual(mockNote.createdAt);
      expect(result?.updatedAt).toEqual(mockNote.updatedAt);
    });

    test('returns null when note does not exist', async () => {
      const repo = notesService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      const result = await resolver.note('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('notes', () => {
    test('returns array of NoteObjects', async () => {
      const repo = notesService.getRepository();
      vi.mocked(repo.find).mockResolvedValue([mockNote]);

      const result = await resolver.notes();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockNote.id);
      expect(result[0]?.content).toBe(mockNote.content);
    });

    test('returns empty array when no notes', async () => {
      const repo = notesService.getRepository();
      vi.mocked(repo.find).mockResolvedValue([]);

      const result = await resolver.notes();

      expect(result).toEqual([]);
    });
  });
});
