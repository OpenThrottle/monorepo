/**
 * @description Handler tests for note MCP tools (create/get/list/update/delete) with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNoteToolHandler,
  deleteNoteToolHandler,
  getNoteToolHandler,
  listNotesToolHandler,
  updateNoteToolHandler,
} from './notes.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const noteId = 'd37426aa-3d3e-469e-9d27-9f9bbbd1f13e';
const serviceAccountToken = 'ot_sa_testprefix_testsecret';

describe('createNoteToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await createNoteToolHandler({});

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/Invalid arguments[\s\S]*content/i) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns a note', () => {
    it('returns structured note content and maps the input through', async () => {
      const note = {
        author: 'visormatt',
        content: 'remember this',
        id: noteId,
      };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        createNote: note,
      });

      const result = await createNoteToolHandler({
        author: 'visormatt',
        content: 'remember this',
      });

      expect(result).toMatchObject({ structuredContent: { note } });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { author: 'visormatt', content: 'remember this' } },
      );
    });
  });

  describe('when GraphQL returns no note', () => {
    it('returns a no-result error', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        createNote: null,
      });

      const result = await createNoteToolHandler({ content: 'remember this' });

      expect(result).toEqual({
        content: [{ text: 'create_note returned no result', type: 'text' }],
        isError: true,
      });
    });
  });
});

describe('getNoteToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await getNoteToolHandler({ id: '' });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns a note', () => {
    it('returns structured note content', async () => {
      const note = { content: 'a note', id: noteId };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ note });

      const result = await getNoteToolHandler({ id: noteId });

      expect(result).toMatchObject({ structuredContent: { note } });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { id: noteId },
      );
    });
  });

  describe('when GraphQL returns no note', () => {
    it('returns a no-result error', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ note: null });

      const result = await getNoteToolHandler({ id: noteId });

      expect(result).toEqual({
        content: [{ text: 'get_note returned no result', type: 'text' }],
        isError: true,
      });
    });
  });
});

describe('listNotesToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when GraphQL returns notes', () => {
    it('returns structured notes', async () => {
      const notes = [{ content: 'a note', id: noteId }];
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ notes });

      const result = await listNotesToolHandler({});

      expect(result).toMatchObject({ structuredContent: { notes } });
    });
  });

  describe('when GraphQL returns no notes', () => {
    it('returns an empty notes list', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({ notes: [] });

      const result = await listNotesToolHandler({});

      expect(result).toMatchObject({
        content: [{ text: 'No notes found.' }],
        structuredContent: { notes: [] },
      });
    });
  });
});

describe('updateNoteToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when GraphQL updates a note', () => {
    it('returns structured note content and maps the input through', async () => {
      const note = { content: 'updated', id: noteId };
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateNote: note,
      });

      const result = await updateNoteToolHandler({
        content: 'updated',
        id: noteId,
      });

      expect(result).toMatchObject({ structuredContent: { note } });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { content: 'updated', id: noteId } },
      );
    });
  });

  describe('when GraphQL returns no note', () => {
    it('returns a no-result error', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateNote: null,
      });

      const result = await updateNoteToolHandler({ content: 'x', id: noteId });

      expect(result).toEqual({
        content: [{ text: 'update_note returned no result', type: 'text' }],
        isError: true,
      });
    });
  });
});

describe('deleteNoteToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await deleteNoteToolHandler({ id: '' });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL deletes a note', () => {
    it('returns deleted: true', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deleteNote: true,
      });

      const result = await deleteNoteToolHandler({ id: noteId });

      expect(result).toMatchObject({ structuredContent: { deleted: true } });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { id: noteId },
      );
    });
  });

  describe('when no row was deleted', () => {
    it('returns deleted: false with a not-found message', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        deleteNote: false,
      });

      const result = await deleteNoteToolHandler({ id: noteId });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/not found/) }],
        structuredContent: { deleted: false },
      });
    });
  });
});
