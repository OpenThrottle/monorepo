// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/settings.repositories.$repositoryId.edit';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../settings.repositories.$repositoryId.edit');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

/** Narrows an action result to a `Response`, failing the test otherwise. */
function assertResponse(value: unknown): asserts value is Response {
  expect(value).toBeInstanceOf(Response);
}

const buildArgs = (
  repositoryId: string,
  formData: Record<string, string>,
): Route.ActionArgs => {
  const body = new URLSearchParams(formData);
  const request = new Request(
    `http://localhost/settings/repositories/${repositoryId}/edit`,
    { body, method: 'POST' },
  );
  return {
    context: createTestRouterContext(),
    params: { repositoryId },
    pattern: '/settings/repositories/:repositoryId/edit',
    request,
    url: new URL(request.url),
  };
};

describe('routes/settings.repositories.$repositoryId.edit action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('throws for an unrecognized intent', async () => {
    await expect(
      action(buildArgs('repo-1', { intent: 'unknown' })),
    ).rejects.toThrow('Invalid intent');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('updates the repository and redirects to the detail page on success', async () => {
    mockExecute.mockResolvedValue({
      updateRepository: { id: 'repo-1' },
    });

    const result = await action(
      buildArgs('repo-1', {
        defaultBranch: 'main',
        intent: 'updateRepository',
        name: 'monorepo',
        projectId: 'project-1',
      }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        input: {
          defaultBranch: 'main',
          foreignSkillInjectionEnabled: false,
          id: 'repo-1',
          name: 'monorepo',
          projectId: 'project-1',
        },
      },
    );
    assertResponse(result);
    expect(result.status).toBe(302);
    expect(result.headers.get('Location')).toBe(
      '/settings/repositories/repo-1',
    );
  });

  test('clears the project link when projectId is the none sentinel', async () => {
    mockExecute.mockResolvedValue({ updateRepository: { id: 'repo-1' } });

    await action(
      buildArgs('repo-1', {
        intent: 'updateRepository',
        name: 'monorepo',
        projectId: '__none__',
      }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        input: expect.objectContaining({ projectId: null }),
      },
    );
  });

  test('returns an error message when the mutation throws', async () => {
    mockExecute.mockRejectedValue(new Error('Update failed'));

    const result = await action(
      buildArgs('repo-1', { intent: 'updateRepository', name: 'monorepo' }),
    );

    expect(result).toEqual({ error: 'Update failed' });
  });
});
