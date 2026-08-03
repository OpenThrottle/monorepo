import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  fetchRolloutEvaluations,
  ROLLOUT_EVALUATIONS_ROUTE,
} from '../fetch-rollout-evaluations';

describe('fetchRolloutEvaluations', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  describe('when the resource responds OK', () => {
    test('GETs the resource route and returns evaluations', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          evaluations: [
            {
              enabled: true,
              key: 'beta',
              kind: 'boolean',
              reason: 'fallthrough',
              valueJson: 'true',
              variationIndex: 0,
            },
          ],
        }),
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const result = await fetchRolloutEvaluations({
        anonymousId: 'anon-1',
        applicationKey: 'openthrottle-developer',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        `${ROLLOUT_EVALUATIONS_ROUTE}?applicationKey=openthrottle-developer&anonymousId=anon-1`,
        {
          credentials: 'same-origin',
          headers: { accept: 'application/json' },
        },
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.key).toBe('beta');
    });

    test('omits anonymousId from the query when null', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ evaluations: [] }),
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      await fetchRolloutEvaluations({
        anonymousId: null,
        applicationKey: 'openthrottle-developer',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        `${ROLLOUT_EVALUATIONS_ROUTE}?applicationKey=openthrottle-developer`,
        expect.anything(),
      );
    });
  });

  describe('when the resource responds with an error status', () => {
    test('throws with status details', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        fetchRolloutEvaluations({
          applicationKey: 'openthrottle-developer',
        }),
      ).rejects.toThrow(
        'Rollout evaluations request failed (500 Internal Server Error)',
      );
    });
  });
});
