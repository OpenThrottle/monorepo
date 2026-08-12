// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/settings.workspace.repositories.$repositoryId.edit';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } =
  await import('../settings.workspace.repositories.$repositoryId.edit');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (repositoryId: string): Route.LoaderArgs => {
  const request = new Request(
    `http://localhost/settings/workspace/repositories/${repositoryId}/edit`,
  );
  return {
    context: createTestRouterContext(),
    params: { repositoryId },
    pattern: '/settings/workspace/repositories/:repositoryId/edit',
    request,
    url: new URL(request.url),
  };
};

const mockRepository: WorkspaceRepositoryFieldsFragment = {
  __typename: 'RepositoryObject',
  checkouts: [],
  createdAt: '2026-07-24T00:00:00.000Z',
  defaultBranch: 'main',
  id: 'repo-1',
  name: 'monorepo',
  normalizedRemoteUrl: 'github.com/openthrottle/monorepo',
  projectId: null,
  updatedAt: '2026-07-24T00:00:00.000Z',
};

describe('routes/settings.workspace.repositories.$repositoryId.edit loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the repository and projects when found', async () => {
    mockExecute.mockResolvedValue({
      projects: [{ id: 'project-1', name: 'OpenThrottle' }],
      workspaceRepository: mockRepository,
    });

    const result = await loader(buildArgs('repo-1'));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { repositoryId: 'repo-1' },
    );
    expect(result).toEqual({
      projects: [{ id: 'project-1', name: 'OpenThrottle' }],
      repository: mockRepository,
    });
  });

  test('throws a 404 Response when the repository is not found', async () => {
    mockExecute.mockResolvedValue({ projects: [], workspaceRepository: null });

    await expect(loader(buildArgs('missing'))).rejects.toMatchObject({
      status: 404,
    });
  });
});
