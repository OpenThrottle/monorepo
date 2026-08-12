// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/ide.symbol';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('~/routing/ide/data/ide-engine.server', () => ({
  symbolTargetVM: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { symbolTargetVM } = await import('~/routing/ide/data/ide-engine.server');
const { loader } = await import('../ide.symbol');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockSymbolTargetVM = vi.mocked(symbolTargetVM);

const localRepository = {
  createdAt: '2026-07-24T00:00:00.000Z',
  displayName: 'openthrottle',
  filesystemPath: '/Users/dev/Development/openthrottle',
  gitDefaultBranch: 'main',
  gitRemoteUrl: null,
  id: 'repo-1',
  project: null,
  projectId: null,
  updatedAt: '2026-07-24T00:00:00.000Z',
  userId: 'user-1',
};

const buildArgs = (path: string): Route.LoaderArgs => {
  const request = new Request(`http://localhost${path}`);
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/ide/symbol',
    request,
    url: new URL(request.url),
  };
};

describe('routes/ide.symbol loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockSymbolTargetVM.mockReset();
  });

  test('throws a 400 when repositoryId does not match a registered repository', async () => {
    mockExecute.mockResolvedValue({
      workspaceSettings: { localRepositories: [localRepository] },
    });

    const result = loader(
      buildArgs('/ide/symbol?repositoryId=missing&path=a.ts&line=3'),
    );

    await expect(result).rejects.toMatchObject({ status: 400 });
    expect(mockSymbolTargetVM).not.toHaveBeenCalled();
  });

  test('resolves the repository and returns the mapped symbol details', async () => {
    mockExecute.mockResolvedValue({
      workspaceSettings: { localRepositories: [localRepository] },
    });
    const symbolDetails = {
      definitions: [{ column: 1, line: 5, name: 'foo', path: 'a.ts' }],
      references: [],
      repository: { displayName: 'openthrottle', repositoryId: 'repo-1' },
      symbol: { line: 5, name: 'foo', path: 'a.ts' },
    };
    mockSymbolTargetVM.mockResolvedValue(symbolDetails);

    const result = await loader(
      buildArgs('/ide/symbol?repositoryId=repo-1&path=a.ts&line=5&name=foo'),
    );

    expect(mockSymbolTargetVM).toHaveBeenCalledWith(
      { root: localRepository.filesystemPath },
      {
        displayName: 'openthrottle',
        projectId: undefined,
        repositoryId: 'repo-1',
      },
      { line: 5, name: 'foo', path: 'a.ts' },
    );
    expect(result).toEqual(symbolDetails);
  });
});
