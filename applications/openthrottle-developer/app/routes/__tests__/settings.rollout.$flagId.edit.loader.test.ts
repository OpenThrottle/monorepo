// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { RolloutFlagKind } from '~/__generated__/graphql';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/settings.rollout.$flagId.edit';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../settings.rollout.$flagId.edit');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (flagId: string): Route.LoaderArgs => {
  const request = new Request(
    `http://localhost/settings/rollout/${flagId}/edit`,
  );
  return {
    context: createTestRouterContext(),
    params: { flagId },
    pattern: '/settings/rollout/:flagId/edit',
    request,
    url: new URL(request.url),
  };
};

const mockFlag: RolloutFlagFieldsFragment = {
  __typename: 'RolloutFlagObject',
  createdAt: '2026-07-24T00:00:00.000Z',
  description: 'Gates the redesigned dashboard',
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

describe('routes/settings.rollout.$flagId.edit loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the flag when found', async () => {
    mockExecute.mockResolvedValue({ rolloutFlag: mockFlag });

    const result = await loader(buildArgs('flag-1'));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { id: 'flag-1' },
    );
    expect(result).toEqual({ flag: mockFlag });
  });

  test('throws a 404 Response when the flag is not found', async () => {
    mockExecute.mockResolvedValue({ rolloutFlag: null });

    await expect(loader(buildArgs('missing'))).rejects.toMatchObject({
      status: 404,
    });
  });
});
