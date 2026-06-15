// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  IdeSearchResult,
  IdeWorkspaceListing,
} from '@openthrottle/react-router-ide';
import type { Route } from '@/app/routes/+types/ide._index';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('~/routing/ide/data/ide-engine.server', () => ({
  listFilesVM: vi.fn(),
  searchVM: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { listFilesVM, searchVM } =
  await import('~/routing/ide/data/ide-engine.server');
const { loader } = await import('../ide._index');

const mockGraphql = vi.mocked(executeGraphqlWithAuth);
const mockListFilesVM = vi.mocked(listFilesVM);
const mockSearchVM = vi.mocked(searchVM);

const repository = { displayName: 'OpenThrottle', repositoryId: 'r1' };
const listing: IdeWorkspaceListing = {
  paths: ['src/a.ts'],
  repository,
  truncated: false,
};
const searchResult: IdeSearchResult = {
  matches: [],
  query: 'foo',
  repository,
  truncated: false,
};

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

const loaderArgs = (url: string): Route.LoaderArgs =>
  ({
    context: undefined,
    params: {},
    request: new Request(url),
    url: new URL(url),
  }) as unknown as Route.LoaderArgs;

describe('routes/ide._index loader', () => {
  beforeEach(() => {
    mockGraphql.mockReset();
    mockListFilesVM.mockReset();
    mockSearchVM.mockReset();
    mockGraphql.mockResolvedValue(workspaceSettings);
  });

  test('returns repository options and a null selection when no repo is chosen', async () => {
    const result = await loader(loaderArgs('http://localhost/ide'));

    expect(result.selectedId).toBeNull();
    expect(result.listing).toBeNull();
    expect(result.repositories).toEqual([{ id: 'r1', label: 'OpenThrottle' }]);
    expect(mockListFilesVM).not.toHaveBeenCalled();
  });

  test('runs the cheap listing tier for the selected repo (no query)', async () => {
    mockListFilesVM.mockResolvedValue(listing);

    const result = await loader(
      loaderArgs('http://localhost/ide?repositoryId=r1'),
    );

    expect(mockListFilesVM).toHaveBeenCalledWith(
      { root: '/abs/openthrottle' },
      { displayName: 'OpenThrottle', projectId: undefined, repositoryId: 'r1' },
    );
    expect(mockSearchVM).not.toHaveBeenCalled();
    expect(result.listing).toBe(listing);
    expect(result.search).toBeNull();
    expect(result.selectedId).toBe('r1');
  });

  test('also runs text search when a query is present', async () => {
    mockListFilesVM.mockResolvedValue(listing);
    mockSearchVM.mockResolvedValue(searchResult);

    const result = await loader(
      loaderArgs('http://localhost/ide?repositoryId=r1&q=foo'),
    );

    expect(mockSearchVM).toHaveBeenCalledWith(
      { root: '/abs/openthrottle' },
      { displayName: 'OpenThrottle', projectId: undefined, repositoryId: 'r1' },
      'foo',
    );
    expect(result.search).toBe(searchResult);
  });
});
