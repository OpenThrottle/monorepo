// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RolloutFlagKind } from '~/__generated__/graphql';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/settings.rollout._index';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../settings.rollout._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (): Route.LoaderArgs => {
  const request = new Request('http://localhost/settings/rollout');
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/settings/rollout',
    request,
    url: new URL(request.url),
  };
};

const flag: RolloutFlagFieldsFragment = {
  createdAt: '2026-07-24T00:00:00.000Z',
  description: null,
  enabled: true,
  fallthrough: { variations: [{ variation: 1, weight: 100 }] },
  id: 'flag-1',
  key: 'new-dashboard',
  kind: RolloutFlagKind.Boolean,
  offVariation: 0,
  targetRoles: [],
  updatedAt: '2026-07-24T00:00:00.000Z',
  variations: [
    { description: null, name: null, valueJson: 'false' },
    { description: null, name: null, valueJson: 'true' },
  ],
};

describe('routes/settings.rollout._index loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the rollout flags from the ListRolloutFlags query', async () => {
    mockExecute.mockResolvedValueOnce({ rolloutFlags: [flag] });

    const result = await loader(buildArgs());

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ flags: [flag] });
  });
});
