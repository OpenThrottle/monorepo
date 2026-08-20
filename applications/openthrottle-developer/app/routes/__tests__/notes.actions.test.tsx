import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action as createAction } from '../notes.create';
import { action as updateAction } from '../notes.$noteId';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

// Keep the real `parseFormData`; only stub the network call.
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const request = (formData: FormData, url: string): Request =>
  new Request(url, { body: formData, method: 'POST' });

describe('routes/notes.create action', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('creates a note and redirects, sending no client author', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<
        Awaited<ReturnType<typeof graphqlWithAuth.executeGraphqlWithAuth>>
      >({ createNote: { id: 'note-1' } }),
    );

    const formData = new FormData();
    formData.set('content', '  # Hello  ');
    // The create form no longer posts an author; a hand-crafted one must still
    // be dropped so the caller cannot override the server's attribution.
    formData.set('author', '  someone-else  ');
    const req = request(formData, 'http://localhost/notes/create');

    const result = await createAction({
      context: createTestRouterContext(),
      params: {},
      pattern: '/notes/create',
      request: req,
      url: new URL(req.url),
    });

    if (!(result instanceof Response)) {
      throw new Error('expected a redirect Response');
    }
    expect(result.status).toBe(302);
    expect(result.headers.get('location')).toBe('/notes/note-1');
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      expect.anything(),
      { input: { content: '# Hello' } },
    );
  });

  test('rejects a blank content via the schema without calling the server', async () => {
    const formData = new FormData();
    formData.set('content', '   ');
    formData.set('author', '');
    const req = request(formData, 'http://localhost/notes/create');

    const result = await createAction({
      context: createTestRouterContext(),
      params: {},
      pattern: '/notes/create',
      request: req,
      url: new URL(req.url),
    });

    expect(result).toEqual({ error: 'Content is required.' });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });
});

describe('routes/notes.$noteId action', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('injects the route id and clears a blank author to null', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<
        Awaited<ReturnType<typeof graphqlWithAuth.executeGraphqlWithAuth>>
      >({ updateNote: { id: 'note-1' } }),
    );

    const formData = new FormData();
    formData.set('content', '# Updated');
    formData.set('author', '');
    const req = request(formData, 'http://localhost/notes/note-1');

    const result = await updateAction({
      context: createTestRouterContext(),
      params: { noteId: 'note-1' },
      pattern: '/notes/:noteId',
      request: req,
      url: new URL(req.url),
    });

    expect(result).toEqual({ ok: true });
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      expect.anything(),
      { input: { author: null, content: '# Updated', id: 'note-1' } },
    );
  });
});
