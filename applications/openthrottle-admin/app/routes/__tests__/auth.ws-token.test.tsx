// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../auth.ws-token');
const { MintSubscriptionTokenDocument } =
  await import('~/__generated__/graphql');
const { createLoaderArgs } = await import('@openthrottle/react-router-testing');

const mockGraphql = vi.mocked(executeGraphqlWithAuth);

type LoaderArgs = Parameters<typeof loader>[0];

describe('routes/auth.ws-token.tsx loader', () => {
  beforeEach(() => {
    mockGraphql.mockReset();
  });

  test('mints a subscription token from the authenticated cookie', async () => {
    mockGraphql.mockResolvedValue({
      mintSubscriptionToken: 'short-lived-token',
    });

    const result = await loader(
      createLoaderArgs<LoaderArgs>({
        headers: { cookie: 'ot_auth=token' },
        url: 'http://localhost/auth/ws-token',
      }),
    );

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.anything(),
      MintSubscriptionTokenDocument,
    );
    expect(result).toEqual({ token: 'short-lived-token' });
  });
});
