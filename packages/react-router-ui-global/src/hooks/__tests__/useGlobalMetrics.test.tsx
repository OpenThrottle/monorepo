import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { usePollServerMetrics } from '@openthrottle/react-router-ui';
import {
  GLOBAL_METRICS_COLLAPSED_KEY,
  GLOBAL_METRICS_STORAGE_KEY,
} from '../../config';
import * as globalMetricsStorage from '../../utils/storage';
import { useGlobalMetrics } from '../useGlobalMetrics';
import type { UseGlobalMetricsOptions } from '../useGlobalMetrics';

vi.mock('@openthrottle/react-router-ui', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-ui')>();
  return {
    ...actual,
    usePollServerMetrics: vi.fn(),
  };
});

const mockUsePollServerMetrics = vi.mocked(usePollServerMetrics);

const sampleMetrics = {
  cpuSystemMs: 1,
  cpuUserMs: 2,
  externalMb: 3,
  heapTotalMb: 4,
  heapUsedMb: 5,
  rssMb: 6,
};

describe('useGlobalMetrics', () => {
  let localStorageStub: Record<string, string>;

  beforeEach(() => {
    localStorageStub = {};
    sessionStorage.clear();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageStub[key] ?? null;
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        localStorageStub[key] = value;
      },
    );

    vi.spyOn(
      globalMetricsStorage,
      'readStoredMetricsChartHistory',
    ).mockReturnValue([]);

    mockUsePollServerMetrics.mockReturnValue({
      error: null,
      loading: false,
      serverMetrics: sampleMetrics,
    });
  });

  test('defaults isOpen to true and derives visibility flags from serverMetrics', () => {
    const options: UseGlobalMetricsOptions = {};
    const { result } = renderHook(() => useGlobalMetrics(options));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.showStatCards).toBe(true);
    expect(result.current.showMetricsChart).toBe(true);
    expect(result.current.showGlobalLoadingBanner).toBe(false);
    expect(result.current.serverMetrics).toEqual(sampleMetrics);
  });

  test('respects defaultOpen: false', () => {
    const options: UseGlobalMetricsOptions = { defaultOpen: false };
    const { result } = renderHook(() => useGlobalMetrics(options));

    expect(result.current.isOpen).toBe(false);
  });

  test('uses the default poll interval when no prop or stored value is present', () => {
    const options: UseGlobalMetricsOptions = {};
    const { result } = renderHook(() => useGlobalMetrics(options));

    expect(result.current.intervalMs).toBe(60_000);
    expect(mockUsePollServerMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ intervalMs: 60_000 }),
    );
  });

  test('prefers an explicit pollIntervalMs prop over the stored value', () => {
    localStorageStub[GLOBAL_METRICS_STORAGE_KEY] = '15000';
    const options: UseGlobalMetricsOptions = { pollIntervalMs: 5_000 };
    const { result } = renderHook(() => useGlobalMetrics(options));

    expect(result.current.intervalMs).toBe(5_000);
  });

  test('falls back to a stored poll interval when no prop is passed', () => {
    localStorageStub[GLOBAL_METRICS_STORAGE_KEY] = '15000';
    const options: UseGlobalMetricsOptions = {};
    const { result } = renderHook(() => useGlobalMetrics(options));

    expect(result.current.intervalMs).toBe(15_000);
  });

  test('shows the loading banner when loading with no chart history', () => {
    mockUsePollServerMetrics.mockReturnValue({
      error: null,
      loading: true,
      serverMetrics: null,
    });
    const options: UseGlobalMetricsOptions = {};
    const { result } = renderHook(() => useGlobalMetrics(options));

    expect(result.current.showGlobalLoadingBanner).toBe(true);
    expect(result.current.showStatCards).toBe(false);
    expect(result.current.showMetricsChart).toBe(false);
  });

  test('hides stat cards and chart when usePollServerMetrics reports an error', () => {
    mockUsePollServerMetrics.mockReturnValue({
      error: new Error('boom'),
      loading: false,
      serverMetrics: null,
    });
    const options: UseGlobalMetricsOptions = {};
    const { result } = renderHook(() => useGlobalMetrics(options));

    expect(result.current.error?.message).toBe('boom');
    expect(result.current.showStatCards).toBe(false);
    expect(result.current.showMetricsChart).toBe(false);
  });

  test('handleOpenChange updates isOpen and persists the collapsed flag to sessionStorage', () => {
    const options: UseGlobalMetricsOptions = {};
    const { result } = renderHook(() => useGlobalMetrics(options));

    act(() => {
      result.current.handleOpenChange(false);
    });

    expect(result.current.isOpen).toBe(false);
    expect(sessionStorage.getItem(GLOBAL_METRICS_COLLAPSED_KEY)).toBe('true');

    act(() => {
      result.current.handleOpenChange(true);
    });

    expect(result.current.isOpen).toBe(true);
    expect(sessionStorage.getItem(GLOBAL_METRICS_COLLAPSED_KEY)).toBe('false');
  });

  test('handleIntervalChange updates intervalMs and persists to localStorage for a valid preset', () => {
    const options: UseGlobalMetricsOptions = {};
    const { result } = renderHook(() => useGlobalMetrics(options));

    act(() => {
      result.current.handleIntervalChange('15000');
    });

    expect(result.current.intervalMs).toBe(15_000);
    expect(localStorageStub[GLOBAL_METRICS_STORAGE_KEY]).toBe('15000');
  });

  test('handleIntervalChange ignores a value outside the valid preset set', () => {
    const options: UseGlobalMetricsOptions = {};
    const { result } = renderHook(() => useGlobalMetrics(options));

    act(() => {
      result.current.handleIntervalChange('999');
    });

    expect(result.current.intervalMs).toBe(60_000);
    expect(localStorageStub[GLOBAL_METRICS_STORAGE_KEY]).toBeUndefined();
  });

  test('accumulates a chart line data point when a new serverMetrics sample arrives', () => {
    let hookOptions: UseGlobalMetricsOptions = {};
    const { rerender, result } = renderHook(
      (currentOptions: UseGlobalMetricsOptions) =>
        useGlobalMetrics(currentOptions),
      { initialProps: hookOptions },
    );

    expect(result.current.chartLineData).toHaveLength(1);

    mockUsePollServerMetrics.mockReturnValue({
      error: null,
      loading: false,
      serverMetrics: { ...sampleMetrics, rssMb: 42 },
    });
    hookOptions = { ...hookOptions };
    rerender(hookOptions);

    expect(result.current.chartLineData.length).toBeGreaterThanOrEqual(1);
    expect(
      result.current.chartLineData[result.current.chartLineData.length - 1]
        .rssMb,
    ).toBe(42);
  });
});
