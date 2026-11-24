// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/resources.repository-agent-config-trust';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../resources.repository-agent-config-trust');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (formData: Record<string, string>): Route.ActionArgs => {
  const body = new URLSearchParams(formData);
  const request = new Request(
    'http://localhost/resources/repository-agent-config-trust',
    { body, method: 'POST' },
  );
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/resources/repository-agent-config-trust',
    request,
    url: new URL(request.url),
  };
};

describe('routes/resources.repository-agent-config-trust action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('sends a trust-only patch and reports the persisted state', async () => {
    mockExecute.mockResolvedValue({
      updateRepository: { checkouts: [{ agentConfigTrusted: true }] },
    });

    const result = await action(
      buildArgs({ repositoryId: 'repo-1', trusted: 'true' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { input: { agentConfigTrusted: true, id: 'repo-1' } },
    );
    expect(result).toEqual({
      errorMessage: null,
      repositoryId: 'repo-1',
      trusted: true,
    });
  });

  test('revokes trust', async () => {
    mockExecute.mockResolvedValue({
      updateRepository: { checkouts: [{ agentConfigTrusted: false }] },
    });

    const result = await action(
      buildArgs({ repositoryId: 'repo-1', trusted: 'false' }),
    );

    expect(result.trusted).toBe(false);
  });

  test('reports the pre-flip state on failure', async () => {
    mockExecute.mockRejectedValue(new Error('boom'));

    const result = await action(
      buildArgs({ repositoryId: 'repo-1', trusted: 'true' }),
    );

    expect(result).toEqual({
      errorMessage: 'boom',
      repositoryId: 'repo-1',
      trusted: false,
    });
  });
});
