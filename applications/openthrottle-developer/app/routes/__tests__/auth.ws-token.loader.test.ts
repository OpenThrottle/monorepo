// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/auth.ws-token';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../auth.ws-token');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (): Route.LoaderArgs => {
  const request = new Request('http://localhost/auth/ws-token');
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/auth/ws-token',
    request,
    url: new URL(request.url),
  };
};

describe('routes/auth.ws-token loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the minted token when the mutation succeeds', async () => {
    mockExecute.mockResolvedValue({ mintSubscriptionToken: 'ws-token-123' });

    const result = await loader(buildArgs());

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ token: 'ws-token-123' });
  });

  test('returns an empty token when unauthenticated / mint fails', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockExecute.mockRejectedValue(new Error('Unauthorized'));

    const result = await loader(buildArgs());

    expect(result).toEqual({ token: '' });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
