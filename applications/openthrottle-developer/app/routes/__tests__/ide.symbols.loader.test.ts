// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IdeExportsResult } from '@openthrottle/react-router-ide';
import type { Route } from '@/app/routes/+types/ide.symbols';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('~/routing/ide/data/ide-engine.server', () => ({
  exportsVM: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { exportsVM } = await import('~/routing/ide/data/ide-engine.server');
const { loader } = await import('../ide.symbols');

const mockGraphql = vi.mocked(executeGraphqlWithAuth);
const mockExportsVM = vi.mocked(exportsVM);

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

describe('routes/ide.symbols loader', () => {
  beforeEach(() => {
    mockGraphql.mockReset();
    mockExportsVM.mockReset();
  });

  test('runs exportsVM for the selected repository', async () => {
    const result: IdeExportsResult = {
      repository: { displayName: 'OpenThrottle', repositoryId: 'r1' },
      symbols: [],
      truncated: false,
    };
    mockGraphql.mockResolvedValue(workspaceSettings);
    mockExportsVM.mockResolvedValue(result);

    const loaded = await loader(
      loaderArgs('http://localhost/ide/symbols?repositoryId=r1'),
    );

    expect(mockExportsVM).toHaveBeenCalledWith(
      { root: '/abs/openthrottle' },
      { displayName: 'OpenThrottle', projectId: undefined, repositoryId: 'r1' },
    );
    expect(loaded).toBe(result);
  });

  test('throws a 400 when no valid repository is selected', async () => {
    mockGraphql.mockResolvedValue(workspaceSettings);

    await expect(
      loader(loaderArgs('http://localhost/ide/symbols')),
    ).rejects.toBeInstanceOf(Response);
    expect(mockExportsVM).not.toHaveBeenCalled();
  });
});
