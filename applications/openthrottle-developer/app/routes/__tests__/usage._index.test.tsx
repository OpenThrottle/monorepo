import { describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { loader } from '../usage._index';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

describe('routes/usage._index.tsx', () => {
  describe('loader', () => {
    test('returns daily stats for a 30-day window', async () => {
      const items = [
        {
          date: '2026-01-01',
          plansCompleted: 1,
          plansCreated: 0,
          plansUpdated: 0,
          tasksCompleted: 2,
          tasksCreated: 0,
          tasksUpdated: 0,
        },
      ];

      mockExecuteGraphqlWithAuth.mockResolvedValue({
        dailyStatsRange: { items },
      });

      const request = new Request('http://localhost/usage');
      const result = await loader({
        context: createTestRouterContext(),
        params: {},
        pattern: '/usage',
        request,
        url: new URL(request.url),
      });

      expect(result.dailyStats).toEqual(items);
      expect(result.rangeDays).toBe(30);
      expect(typeof result.rangeStartIso).toBe('string');
      expect(typeof result.rangeEndIso).toBe('string');
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        request,
        expect.anything(),
        expect.objectContaining({
          end: expect.any(String),
          start: expect.any(String),
        }),
      );
    });
  });
});
