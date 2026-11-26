import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useElapsedMs } from '../useElapsedMs';

const START = '2026-11-26T10:00:00.000Z';

describe('useElapsedMs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T10:00:05.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when active with a start time', () => {
    test('reports the elapsed time and advances every second', () => {
      const { result } = renderHook(() =>
        useElapsedMs({ isActive: true, startedAt: START }),
      );

      expect(result.current.elapsedMs).toBe(5_000);

      act(() => {
        vi.advanceTimersByTime(3_000);
      });

      expect(result.current.elapsedMs).toBe(8_000);
    });
  });

  describe('when inactive', () => {
    test('reports nothing and schedules no interval', () => {
      const { result } = renderHook(() =>
        useElapsedMs({ isActive: false, startedAt: START }),
      );

      expect(result.current.elapsedMs).toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('when the start time is unknown or invalid', () => {
    test('counts from activation for undefined', () => {
      const { result } = renderHook(() =>
        useElapsedMs({ isActive: true, startedAt: undefined }),
      );

      expect(result.current.elapsedMs).toBe(0);

      act(() => {
        vi.advanceTimersByTime(2_000);
      });

      expect(result.current.elapsedMs).toBe(2_000);
    });

    test('counts from activation for an unparseable timestamp', () => {
      const { result } = renderHook(() =>
        useElapsedMs({ isActive: true, startedAt: 'not a date' }),
      );

      expect(result.current.elapsedMs).toBe(0);
    });
  });

  describe('on unmount', () => {
    test('clears the interval', () => {
      const { unmount } = renderHook(() =>
        useElapsedMs({ isActive: true, startedAt: START }),
      );

      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
