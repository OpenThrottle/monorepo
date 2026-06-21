import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchServerMetrics } from '../fetchServerMetrics';
import { usePollServerMetrics } from '../usePollServerMetrics';

vi.mock('../fetchServerMetrics', () => ({
  fetchServerMetrics: vi.fn(),
}));

const fetchServerMetricsMock = vi.mocked(fetchServerMetrics);

describe('usePollServerMetrics', () => {
  beforeEach(() => {
    fetchServerMetricsMock.mockReset();
    fetchServerMetricsMock.mockResolvedValue({ serverMetrics: { uptime: 1 } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('re-fetches with new params when url/query/token change', async () => {
    const { rerender } = renderHook((props) => usePollServerMetrics(props), {
      initialProps: {
        intervalMs: 0,
        query: 'query A',
        token: 'token-1',
        url: 'https://a.example/graphql',
      },
    });

    await waitFor(() => {
      expect(fetchServerMetricsMock).toHaveBeenCalledWith(
        'https://a.example/graphql',
        'query A',
        'token-1',
      );
    });

    fetchServerMetricsMock.mockClear();

    // Changing url/query/token after mount must trigger a fresh fetch with
    // the new values — regression guard for the [] useCallback stale closure.
    rerender({
      intervalMs: 0,
      query: 'query B',
      token: 'token-2',
      url: 'https://b.example/graphql',
    });

    await waitFor(() => {
      expect(fetchServerMetricsMock).toHaveBeenCalledWith(
        'https://b.example/graphql',
        'query B',
        'token-2',
      );
    });
  });
});
