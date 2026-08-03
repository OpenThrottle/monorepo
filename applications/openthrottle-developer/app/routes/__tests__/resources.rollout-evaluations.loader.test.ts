// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/resources.rollout-evaluations';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../resources.rollout-evaluations');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const loaderArgs = (search = ''): Route.LoaderArgs =>
  createLoaderArgs<Route.LoaderArgs>({
    url: `http://localhost/resources/rollout-evaluations${search}`,
  });

describe('routes/resources.rollout-evaluations loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('when applicationKey is missing', () => {
    test('returns empty evaluations without calling GraphQL', async () => {
      const loaded = await loader(loaderArgs());

      expect(loaded).toEqual({ evaluations: [] });
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('when applicationKey is present', () => {
    test('calls evaluateFeatureFlags and returns evaluations', async () => {
      const evaluations = [
        {
          enabled: true,
          key: 'beta',
          kind: 'boolean',
          reason: 'fallthrough',
          valueJson: 'true',
          variationIndex: 0,
        },
      ];
      mockExecute.mockResolvedValue({ evaluateFeatureFlags: evaluations });

      const loaded = await loader(
        loaderArgs('?applicationKey=openthrottle-developer&anonymousId=anon-1'),
      );

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        {
          anonymousId: 'anon-1',
          applicationKey: 'openthrottle-developer',
        },
      );
      expect(loaded).toEqual({ evaluations });
    });

    test('passes null anonymousId when the query param is absent', async () => {
      mockExecute.mockResolvedValue({ evaluateFeatureFlags: [] });

      await loader(loaderArgs('?applicationKey=openthrottle-developer'));

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        {
          anonymousId: null,
          applicationKey: 'openthrottle-developer',
        },
      );
    });
  });
});
