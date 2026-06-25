import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchJobTaskRunMetrics } from '../../data/fetch-job-task-run-metrics';
import { useJobTaskRunMetrics } from '../useJobTaskRunMetrics';

vi.mock('../../data/fetch-job-task-run-metrics', () => ({
  fetchJobTaskRunMetrics: vi.fn(),
}));

vi.mock('../../config/metrics-api', () => ({
  getMetricsApiBaseUrl: () => 'http://default.example.com',
}));

const fetchJobTaskRunMetricsMock = vi.mocked(fetchJobTaskRunMetrics);

const SNAPSHOT = {
  cpuSystemMs: 25,
  cpuUserMs: 350,
  externalMb: 2.5,
  heapTotalMb: 36,
  heapUsedMb: 28,
  rssMb: 55,
};

const JOB = {
  id: 'job-1',
  taskRunMetrics: { atEnd: SNAPSHOT, atStart: SNAPSHOT },
};

describe('useJobTaskRunMetrics', () => {
  beforeEach(() => {
    fetchJobTaskRunMetricsMock.mockReset();
    fetchJobTaskRunMetricsMock.mockResolvedValue(JOB);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the job when jobId is non-null', async () => {
    const { result } = renderHook(() =>
      useJobTaskRunMetrics('job-1', { apiBaseUrl: 'http://api.example.com' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.job).toEqual(JOB);
    expect(result.current.error).toBeNull();
    expect(fetchJobTaskRunMetricsMock).toHaveBeenCalledWith(
      'http://api.example.com',
      'job-1',
      expect.any(AbortSignal),
    );
  });

  it('defaults apiBaseUrl to getMetricsApiBaseUrl()', async () => {
    const { result } = renderHook(() => useJobTaskRunMetrics('job-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(fetchJobTaskRunMetricsMock).toHaveBeenCalledWith(
      'http://default.example.com',
      'job-1',
      expect.any(AbortSignal),
    );
  });

  it('returns the empty state without fetching when jobId is null', async () => {
    const { result } = renderHook(() => useJobTaskRunMetrics(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.job).toBeNull();
    expect(result.current.error).toBeNull();
    expect(fetchJobTaskRunMetricsMock).not.toHaveBeenCalled();
  });

  it('returns the empty state without fetching when jobId is an empty string', async () => {
    const { result } = renderHook(() => useJobTaskRunMetrics(''));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.job).toBeNull();
    expect(fetchJobTaskRunMetricsMock).not.toHaveBeenCalled();
  });

  it('surfaces a fetch error', async () => {
    fetchJobTaskRunMetricsMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useJobTaskRunMetrics('job-1'));

    await waitFor(() => {
      expect(result.current.error).toEqual(new Error('boom'));
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.job).toBeNull();
  });

  it('refetches when jobId changes', async () => {
    const { result, rerender } = renderHook(
      (jobId: string) => useJobTaskRunMetrics(jobId),
      { initialProps: 'job-1' },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(fetchJobTaskRunMetricsMock).toHaveBeenCalledWith(
      'http://default.example.com',
      'job-1',
      expect.any(AbortSignal),
    );

    rerender('job-2');
    await waitFor(() => {
      expect(fetchJobTaskRunMetricsMock).toHaveBeenCalledWith(
        'http://default.example.com',
        'job-2',
        expect.any(AbortSignal),
      );
    });
  });

  it('aborts the in-flight request on unmount (cancellation)', async () => {
    const { unmount } = renderHook(() => useJobTaskRunMetrics('job-1'));

    await waitFor(() => {
      expect(fetchJobTaskRunMetricsMock).toHaveBeenCalledTimes(1);
    });
    const signal = fetchJobTaskRunMetricsMock.mock.calls[0]?.[2];
    expect(signal?.aborted).toBe(false);

    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
