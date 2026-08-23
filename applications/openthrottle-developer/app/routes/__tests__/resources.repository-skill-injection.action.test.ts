// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/resources.repository-skill-injection';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../resources.repository-skill-injection');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (formData: Record<string, string>): Route.ActionArgs => {
  const body = new URLSearchParams(formData);
  const request = new Request(
    'http://localhost/resources/repository-skill-injection',
    { body, method: 'POST' },
  );
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/resources/repository-skill-injection',
    request,
    url: new URL(request.url),
  };
};

describe('routes/resources.repository-skill-injection action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('sends a flag-only patch and reports the persisted state', async () => {
    mockExecute.mockResolvedValue({
      updateRepository: {
        checkouts: [{ foreignSkillInjectionEnabled: true }],
      },
    });

    const result = await action(
      buildArgs({ enabled: 'true', repositoryId: 'repo-1' }),
    );

    // Only the flag and the id: every other field is omitted so the mutation
    // cannot clobber the repository's name, branch, or linked project.
    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { input: { foreignSkillInjectionEnabled: true, id: 'repo-1' } },
    );
    expect(result).toEqual({
      enabled: true,
      errorMessage: null,
      repositoryId: 'repo-1',
    });
  });

  test('reads the flag back off the persisted checkouts', async () => {
    mockExecute.mockResolvedValue({
      updateRepository: {
        checkouts: [
          { foreignSkillInjectionEnabled: false },
          { foreignSkillInjectionEnabled: false },
        ],
      },
    });

    const result = await action(
      buildArgs({ enabled: 'false', repositoryId: 'repo-1' }),
    );

    expect(result.enabled).toBe(false);
  });

  test('returns the pre-toggle value and a message when the mutation fails', async () => {
    mockExecute.mockRejectedValue(new Error('Checkout is missing on disk'));

    const result = await action(
      buildArgs({ enabled: 'true', repositoryId: 'repo-1' }),
    );

    expect(result).toEqual({
      enabled: false,
      errorMessage: 'Checkout is missing on disk',
      repositoryId: 'repo-1',
    });
  });
});
