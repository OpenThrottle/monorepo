import type { Note } from '@openthrottle/nestjs-repositories';
import { NotesService } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  GlobalClsService,
  type GlobalClsUser,
} from '@openthrottle/nestjs-modules';
import { Test } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { NotesResolver } from './notes.resolver';

/** The subset of the persisted draft the author-derivation tests assert on. */
interface NoteDraft {
  author: string | null;
  content: string;
}

const notesRepo = {
  create: vi.fn<(draft: NoteDraft) => Note>(),
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn<(entity: Note) => Promise<Note>>(),
};

/** Stands in for the per-request CLS `user` slot; set per test to steer derivation. */
const clsGet = vi.fn();

const mockNotesService = createMock<NotesService>({
  getRepository: vi.fn().mockReturnValue(notesRepo),
});

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
        { provide: GlobalClsService, useValue: mockGlobalCls },
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

  describe('createNote', () => {
    /** Returns the `author` handed to repo.create for a createNote call. */
    const persistedAuthor = async (
      input: { author: string | null; content: string },
      principal: AuthPrincipal | undefined,
    ): Promise<string | null> => {
      notesRepo.create.mockImplementation((draft) => ({
        ...mockNote,
        author: draft.author,
        content: draft.content,
      }));
      notesRepo.save.mockImplementation(async (entity) => entity);

      await resolver.createNote(input, principal);

      return notesRepo.create.mock.calls[0]?.[0].author ?? null;
    };

    beforeEach(() => {
      notesRepo.create.mockReset();
      notesRepo.save.mockReset();
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
});
