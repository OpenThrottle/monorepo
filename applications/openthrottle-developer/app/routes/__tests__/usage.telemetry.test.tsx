import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { action, loader } from '../usage.telemetry';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const captureHealthResponse = {
  captureHealth: [
    {
      lastCapturedAt: '2026-01-01T00:00:00.000Z',
      source: 'claude-code',
      stream: 'skill_events',
    },
  ],
};

const telemetryCoverageResponse = {
  telemetryCoverage: {
    currentPluginVersion: '1.3.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    machines: [],
    windowDays: 14,
  },
};

const runLoader = (url: string) => {
  const request = new Request(url);

  return loader({
    context: createTestRouterContext(),
    params: {},
    pattern: '/usage/telemetry',
    request,
    url: new URL(request.url),
  });
};

describe('routes/usage.telemetry.tsx', () => {
  describe('loader', () => {
    beforeEach(() => {
      mockExecuteGraphqlWithAuth
        .mockReset()
        .mockResolvedValueOnce(captureHealthResponse)
        .mockResolvedValueOnce(telemetryCoverageResponse);
    });

    test('returns capture health and telemetry coverage', async () => {
      const result = await runLoader('http://localhost/usage/telemetry');

      expect(result.captureHealth).toEqual(captureHealthResponse.captureHealth);
      expect(result.telemetryCoverage).toEqual(
        telemetryCoverageResponse.telemetryCoverage,
      );
      // Capture health is a workspace-wide query with no variables.
      expect(mockExecuteGraphqlWithAuth).toHaveBeenNthCalledWith(
        1,
        expect.any(Request),
        expect.anything(),
        {},
      );
    });

    test('still resolves capture health when the coverage query fails', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockExecuteGraphqlWithAuth
        .mockReset()
        .mockResolvedValueOnce(captureHealthResponse)
        .mockRejectedValueOnce(new Error('coverage exploded'));

      const result = await runLoader('http://localhost/usage/telemetry');

      expect(result.telemetryCoverage).toBeNull();
      expect(result.captureHealth).toEqual(captureHealthResponse.captureHealth);

      consoleError.mockRestore();
    });
  });

  describe('action', () => {
    test('ignores a submission that is not a forget', async () => {
      const request = new Request('http://localhost/usage/telemetry', {
        body: new FormData(),
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: {},
        pattern: '/usage/telemetry',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ kind: 'ignored' });
    });
  });
});
