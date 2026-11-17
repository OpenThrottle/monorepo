import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  GlobalClsService,
  type GlobalClsUser,
} from '@openthrottle/nestjs-modules';
import type { Note } from '@openthrottle/nestjs-repositories-server';
import { NotesRepository } from '@openthrottle/nestjs-repositories-server';
import { createNotesRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { NotesResolver } from './notes.resolver.ts';

/** Starts as an empty `notes` table; each test stubs what it asserts on. */
const notesRepository = createNotesRepositoryMock();

/** Stands in for the per-request CLS `user` slot; set per test to steer derivation. */
const clsGet = vi.fn();

const mockGlobalCls = createMock<GlobalClsService>({ get: clsGet });

const clsUser: GlobalClsUser = {
  displayName: 'visormatt',
  email: 'visormatt@example.com',
  isDeleted: false,
  roles: [],
  uuid: '6f9f4a0c-0d02-4b3f-9e1e-2fbbf2a8f8a1',
};

const userPrincipal: AuthPrincipal = {
  email: 'principal@example.com',
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: 'a03cb6cf-1c62-4c1a-9a08-4bb2d9d3d1b1',
};

describe('NotesResolver', () => {
  let resolver: NotesResolver;

  const mockNote: Note = {
    author: 'visormatt',
    content: 'Quick thought for planning',
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    deletedAt: null,
    id: 'ddc5ff9d-8dee-4d99-b9ee-b7c5a0bd879f',
    updatedAt: new Date('2026-02-01T22:05:00.000Z'),
  };

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        NotesResolver,
        { provide: GlobalClsService, useValue: mockGlobalCls },
        { provide: NotesRepository, useValue: notesRepository },
      ],
    }).compile();

    resolver = app.get<NotesResolver>(NotesResolver);
  });

  describe('note', () => {
    test('returns NoteObject when note exists', async () => {
      notesRepository.findOne.mockResolvedValue(mockNote);

      const result = await resolver.note(mockNote.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockNote.id);
      expect(result?.content).toBe(mockNote.content);
      expect(result?.author).toBe(mockNote.author);
      expect(result?.createdAt).toEqual(mockNote.createdAt);
      expect(result?.updatedAt).toEqual(mockNote.updatedAt);
    });

    test('returns null when note does not exist', async () => {
      notesRepository.findOne.mockResolvedValue(null);

      const result = await resolver.note('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('notes', () => {
    test('returns array of NoteObjects', async () => {
      notesRepository.findAllNewestFirst.mockResolvedValue([mockNote]);

      const result = await resolver.notes();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockNote.id);
      expect(result[0]?.content).toBe(mockNote.content);
    });

    test('returns empty array when no notes', async () => {
      notesRepository.findAllNewestFirst.mockResolvedValue([]);

      const result = await resolver.notes();

      expect(result).toEqual([]);
    });
  });

  describe('createNote', () => {
    /** Returns the `author` handed to repo.create for a createNote call. */
    const persistedAuthor = async (
      input: { author: string | null; content: string },
      principal: AuthPrincipal | undefined,
    ): Promise<string | null> => {
      notesRepository.create.mockImplementation(async (draft) => ({
        ...mockNote,
        author: draft.author,
        content: draft.content,
      }));

      await resolver.createNote(input, principal);

      return notesRepository.create.mock.calls[0]?.[0].author ?? null;
    };

    beforeEach(() => {
      notesRepository.create.mockReset();
      clsGet.mockReset();
      clsGet.mockReturnValue(undefined);
    });

    test('persists an explicit author verbatim so the MCP pass-through holds', async () => {
      clsGet.mockReturnValue(clsUser);

      const author = await persistedAuthor(
        { author: 'someone-else', content: 'note' },
        userPrincipal,
      );

      expect(author).toBe('someone-else');
    });

    test('falls back to the CLS displayName when author is null', async () => {
      clsGet.mockReturnValue(clsUser);

      const author = await persistedAuthor(
        { author: null, content: 'note' },
        userPrincipal,
      );

      expect(author).toBe(clsUser.displayName);
    });

    test('treats a whitespace-only author as absent', async () => {
      clsGet.mockReturnValue(clsUser);

      const author = await persistedAuthor(
        { author: '   ', content: 'note' },
        userPrincipal,
      );

      expect(author).toBe(clsUser.displayName);
    });

    test('falls back to the principal email when CLS has no user', async () => {
      const author = await persistedAuthor(
        { author: null, content: 'note' },
        userPrincipal,
      );

      expect(author).toBe(userPrincipal.email);
    });

    test('falls back to the principal sub when there is no email', async () => {
      const author = await persistedAuthor(
        { author: null, content: 'note' },
        {
          kind: AUTH_PRINCIPAL_KIND_USER,
          sub: userPrincipal.sub,
        },
      );

      expect(author).toBe(userPrincipal.sub);
    });

    test('persists null without throwing when there is no identity at all', async () => {
      const author = await persistedAuthor(
        { author: null, content: 'note' },
        undefined,
      );

      expect(author).toBeNull();
    });
  });

  describe('updateNote', () => {
    beforeEach(() => {
      notesRepository.findOne.mockReset();
      notesRepository.update.mockReset();
    });

    test('returns null without updating when the note does not exist', async () => {
      notesRepository.findOne.mockResolvedValue(null);

      const result = await resolver.updateNote({
        author: null,
        content: 'changed',
        id: 'missing',
      });

      expect(result).toBeNull();
      expect(notesRepository.update).not.toHaveBeenCalled();
    });

    test('applies only the fields the input sets', async () => {
      notesRepository.findOne.mockResolvedValue(mockNote);
      notesRepository.update.mockResolvedValue({
        ...mockNote,
        content: 'changed',
      });

      const result = await resolver.updateNote({
        author: null,
        content: 'changed',
        id: mockNote.id,
      });

      expect(result?.content).toBe('changed');
      expect(notesRepository.update).toHaveBeenCalledWith(mockNote.id, {
        author: null,
        content: 'changed',
      });
    });

    test('leaves content alone when the input omits it', async () => {
      notesRepository.findOne.mockResolvedValue(mockNote);
      notesRepository.update.mockResolvedValue(mockNote);

      await resolver.updateNote({
        author: 'someone',
        content: null,
        id: mockNote.id,
      });

      expect(notesRepository.update).toHaveBeenCalledWith(mockNote.id, {
        author: 'someone',
      });
    });
  });

  describe('deleteNote', () => {
    test('soft deletes the live note and answers true', async () => {
      notesRepository.removeMany.mockResolvedValue({ removedCount: 1 });

      await expect(resolver.deleteNote(mockNote.id)).resolves.toBe(true);
      expect(notesRepository.removeMany).toHaveBeenCalledWith({
        id: mockNote.id,
      });
    });

    test('answers false when no live note has that id', async () => {
      notesRepository.removeMany.mockResolvedValue({ removedCount: 0 });

      await expect(resolver.deleteNote('missing')).resolves.toBe(false);
    });
  });
});
