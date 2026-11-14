import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { loader } from '../usage._index';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const dailyStatsResponse = {
  dailyStatsRange: {
    items: [
      {
        date: '2026-01-01',
        plansCompleted: 1,
        plansCreated: 0,
        plansUpdated: 0,
        tasksCompleted: 2,
        tasksCreated: 0,
        tasksUpdated: 0,
      },
    ],
  },
};

const runLoader = (url: string) => {
  const request = new Request(url);

  return loader({
    context: createTestRouterContext(),
    params: {},
    pattern: '/usage',
    request,
    url: new URL(request.url),
  });
};

describe('routes/usage._index.tsx', () => {
  describe('loader', () => {
    beforeEach(() => {
      mockExecuteGraphqlWithAuth
        .mockReset()
        .mockResolvedValueOnce(dailyStatsResponse);
    });

    test('fetches only daily stats for a 30-day window', async () => {
      const result = await runLoader('http://localhost/usage');

      expect(result.dailyStats).toEqual(
        dailyStatsResponse.dailyStatsRange.items,
      );
      expect(result.rangeDays).toBe(30);
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledTimes(1);
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        {
          end: result.rangeEndIso,
          start: result.rangeStartIso,
        },
      );
    });
  });
});
