import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchServerMetrics } from '../../data/fetch-server-metrics';
import { useServerMetrics } from '../useServerMetrics';

vi.mock('../../data/fetch-server-metrics', () => ({
  fetchServerMetrics: vi.fn(),
}));

vi.mock('../../config/metrics-api', () => ({
  getMetricsApiBaseUrl: () => 'http://default.example.com',
}));

const fetchServerMetricsMock = vi.mocked(fetchServerMetrics);

const SNAPSHOT = {
  cpuSystemMs: 25,
  cpuUserMs: 350,
  externalMb: 2.5,
  heapTotalMb: 36,
  heapUsedMb: 28,
  rssMb: 55,
};

describe('useServerMetrics', () => {
  beforeEach(() => {
    fetchServerMetricsMock.mockReset();
    fetchServerMetricsMock.mockResolvedValue(SNAPSHOT);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('fetches once after mount and exposes the snapshot', async () => {
    const { result } = renderHook(() =>
      useServerMetrics({ apiBaseUrl: 'http://api.example.com', intervalMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.serverMetrics).toEqual(SNAPSHOT);
    expect(result.current.error).toBeNull();
    expect(fetchServerMetricsMock).toHaveBeenCalledTimes(1);
    expect(fetchServerMetricsMock).toHaveBeenCalledWith(
      'http://api.example.com',
      expect.any(AbortSignal),
    );
  });

  it('defaults apiBaseUrl to getMetricsApiBaseUrl()', async () => {
    const { result } = renderHook(() => useServerMetrics({ intervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(fetchServerMetricsMock).toHaveBeenCalledWith(
      'http://default.example.com',
      expect.any(AbortSignal),
    );
  });

  it('surfaces a fetch error', async () => {
    fetchServerMetricsMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useServerMetrics({ intervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.error).toEqual(new Error('boom'));
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.serverMetrics).toBeNull();
  });

  it('refetches on demand via refetch()', async () => {
    const { result } = renderHook(() => useServerMetrics({ intervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    fetchServerMetricsMock.mockClear();

    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchServerMetricsMock).toHaveBeenCalledTimes(1);
  });

  it('polls on the configured interval', async () => {
    vi.useFakeTimers();
    renderHook(() => useServerMetrics({ intervalMs: 1000 }));

    // Initial mount fetch.
    await vi.waitFor(() => {
      expect(fetchServerMetricsMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetchServerMetricsMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetchServerMetricsMock).toHaveBeenCalledTimes(3);
  });

  it('does not poll when intervalMs is 0', async () => {
    vi.useFakeTimers();
    renderHook(() => useServerMetrics({ intervalMs: 0 }));

    await vi.waitFor(() => {
      expect(fetchServerMetricsMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(fetchServerMetricsMock).toHaveBeenCalledTimes(1);
  });

  it('aborts the in-flight request on unmount (cancellation)', async () => {
    const { unmount } = renderHook(() =>
      useServerMetrics({ intervalMs: 1000 }),
    );

    await waitFor(() => {
      expect(fetchServerMetricsMock).toHaveBeenCalledTimes(1);
    });
    const signal = fetchServerMetricsMock.mock.calls[0]?.[1];
    expect(signal?.aborted).toBe(false);

    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
