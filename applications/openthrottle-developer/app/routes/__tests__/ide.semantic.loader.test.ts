// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { IDE_SEMANTIC_STATUS } from '@openthrottle/react-router-ide';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/ide.semantic';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action, loader } = await import('../ide.semantic');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const workspaceSettings = {
  workspaceSettings: {
    localRepositories: [
      {
        displayName: 'OpenThrottle',
        filesystemPath: '/abs/openthrottle',
        id: 'r1',
        projectId: null,
      },
    ],
  },
};

const buildLoaderArgs = (path: string): Route.LoaderArgs => {
  const request = new Request(`http://localhost${path}`);
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/ide/semantic',
    request,
    url: new URL(request.url),
  };
};

const buildActionArgs = (formData: FormData): Route.ActionArgs => {
  const request = new Request('http://localhost/ide/semantic', {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/ide/semantic',
    request,
    url: new URL(request.url),
  };
};

describe('routes/ide.semantic loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('throws a 400 Response when repositoryId is missing', async () => {
    mockExecute.mockResolvedValueOnce(workspaceSettings);

    await expect(
      loader(buildLoaderArgs('/ide/semantic')),
    ).rejects.toBeInstanceOf(Response);
  });

  test('throws a 400 Response when repositoryId does not match any repository', async () => {
    mockExecute.mockResolvedValueOnce(workspaceSettings);

    await expect(
      loader(buildLoaderArgs('/ide/semantic?repositoryId=unknown')),
    ).rejects.toBeInstanceOf(Response);
  });

  test('skips the search call and returns an empty match list for a blank query', async () => {
    mockExecute.mockResolvedValueOnce(workspaceSettings).mockResolvedValueOnce({
      codeIndexStatus: {
        indexedChunks: 42,
        repositoryId: 'r1',
        status: 'ready',
      },
    });

    const result = await loader(
      buildLoaderArgs('/ide/semantic?repositoryId=r1'),
    );

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(IDE_SEMANTIC_STATUS.ready);
    expect(result.indexedChunks).toBe(42);
    expect(result.matches).toEqual([]);
    expect(result.query).toBe('');
    expect(result.available).toBe(true);
  });

  test('runs the semantic search and maps matches when the index is ready and a query is present', async () => {
    mockExecute
      .mockResolvedValueOnce(workspaceSettings)
      .mockResolvedValueOnce({
        codeIndexStatus: {
          indexedChunks: 10,
          repositoryId: 'r1',
          status: 'ready',
        },
      })
      .mockResolvedValueOnce({
        codeSemanticSearch: {
          available: true,
          matches: [
            {
              content: 'const foo = 1;',
              endLine: 5,
              path: 'src/foo.ts',
              score: 0.9,
              startLine: 4,
            },
          ],
        },
      });

    const result = await loader(
      buildLoaderArgs('/ide/semantic?repositoryId=r1&q=foo'),
    );

    expect(mockExecute).toHaveBeenCalledTimes(3);
    expect(result.matches).toEqual([
      {
        content: 'const foo = 1;',
        endLine: 5,
        path: 'src/foo.ts',
        score: 0.9,
        startLine: 4,
      },
    ]);
    expect(result.available).toBe(true);
  });

  test('does not run the search call when the index is not ready', async () => {
    mockExecute.mockResolvedValueOnce(workspaceSettings).mockResolvedValueOnce({
      codeIndexStatus: {
        indexedChunks: 0,
        repositoryId: 'r1',
        status: 'indexing',
      },
    });

    const result = await loader(
      buildLoaderArgs('/ide/semantic?repositoryId=r1&q=foo'),
    );

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(IDE_SEMANTIC_STATUS.indexing);
    expect(result.matches).toEqual([]);
  });
});

describe('routes/ide.semantic action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('throws a 400 Response when repositoryId is missing', async () => {
    const formData = new FormData();

    await expect(action(buildActionArgs(formData))).rejects.toBeInstanceOf(
      Response,
    );
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('enqueues a (re)index and maps the returned status', async () => {
    mockExecute.mockResolvedValueOnce({
      indexCodeRepository: { repositoryId: 'r1', status: 'indexing' },
    });

    const formData = new FormData();
    formData.set('repositoryId', 'r1');

    const result = await action(buildActionArgs(formData));

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      repositoryId: 'r1',
      status: IDE_SEMANTIC_STATUS.indexing,
    });
  });
});
