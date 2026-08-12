// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IdeWorkspaceListing } from '@openthrottle/react-router-ide';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/ide.files';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('~/routing/ide/data/ide-engine.server', () => ({
  listFilesVM: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { listFilesVM } = await import('~/routing/ide/data/ide-engine.server');
const { loader } = await import('../ide.files');
const { MAX_FILE_MENTION_RESULTS } =
  await import('~/routing/ide/config/file-mention');

const mockGraphql = vi.mocked(executeGraphqlWithAuth);
const mockListFilesVM = vi.mocked(listFilesVM);

// A single user-scoped repository; `workspaceSettings` is fetched with the
// caller's auth, so an id absent from this list belongs to another user (or
// does not exist) and must be rejected.
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

const listing = (paths: readonly string[]): IdeWorkspaceListing => ({
  paths: [...paths],
  repository: { displayName: 'OpenThrottle', repositoryId: 'r1' },
  truncated: false,
});

const loaderArgs = (url: string): Route.LoaderArgs => ({
  ...createLoaderArgs<Route.LoaderArgs>({ url }),
  url: new URL(url),
});

describe('routes/ide.files loader', () => {
  beforeEach(() => {
    mockGraphql.mockReset();
    mockListFilesVM.mockReset();
  });

  test('returns the full listing for the selected repository when no query is given', async () => {
    mockGraphql.mockResolvedValue(workspaceSettings);
    mockListFilesVM.mockResolvedValue(listing(['src/a.ts', 'src/b.ts']));

    const loaded = await loader(
      loaderArgs('http://localhost/ide/files?repositoryId=r1'),
    );

    expect(mockListFilesVM).toHaveBeenCalledWith(
      { root: '/abs/openthrottle' },
      { displayName: 'OpenThrottle', projectId: undefined, repositoryId: 'r1' },
    );
    expect(loaded).toEqual({
      paths: ['src/a.ts', 'src/b.ts'],
      query: '',
      repositoryId: 'r1',
      truncated: false,
    });
  });

  test('filters case-insensitively when a query is provided', async () => {
    mockGraphql.mockResolvedValue(workspaceSettings);
    mockListFilesVM.mockResolvedValue(
      listing(['src/App.tsx', 'src/app-shell.ts', 'lib/util.ts']),
    );

    const loaded = await loader(
      loaderArgs('http://localhost/ide/files?repositoryId=r1&q=APP'),
    );

    expect(loaded.paths).toEqual(['src/App.tsx', 'src/app-shell.ts']);
    expect(loaded.query).toBe('APP');
    expect(loaded.truncated).toBe(false);
  });

  test('caps filtered matches at MAX_FILE_MENTION_RESULTS and flags truncation', async () => {
    const many = Array.from(
      { length: MAX_FILE_MENTION_RESULTS + 5 },
      (_unused, index) => `src/app-${index}.ts`,
    );
    mockGraphql.mockResolvedValue(workspaceSettings);
    mockListFilesVM.mockResolvedValue(listing(many));

    const loaded = await loader(
      loaderArgs('http://localhost/ide/files?repositoryId=r1&q=app'),
    );

    expect(loaded.paths).toHaveLength(MAX_FILE_MENTION_RESULTS);
    expect(loaded.truncated).toBe(true);
  });

  test('rejects a repositoryId not owned by the caller with a 400', async () => {
    mockGraphql.mockResolvedValue(workspaceSettings);

    await expect(
      loader(
        loaderArgs('http://localhost/ide/files?repositoryId=someone-else'),
      ),
    ).rejects.toBeInstanceOf(Response);
    expect(mockListFilesVM).not.toHaveBeenCalled();
  });

  test('rejects a missing repositoryId with a 400', async () => {
    mockGraphql.mockResolvedValue(workspaceSettings);

    await expect(
      loader(loaderArgs('http://localhost/ide/files')),
    ).rejects.toBeInstanceOf(Response);
    expect(mockListFilesVM).not.toHaveBeenCalled();
  });
});
