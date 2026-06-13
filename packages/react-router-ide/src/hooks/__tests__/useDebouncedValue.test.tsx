import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useDebouncedValue } from '../useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns the initial value immediately', () => {
    const { result } = renderHook(() =>
      useDebouncedValue({ delayMs: 200, value: 'a' }),
    );
    expect(result.current).toBe('a');
  });

  test('updates only after the delay elapses', () => {
    const { rerender, result } = renderHook(
      ({ value }) => useDebouncedValue({ delayMs: 200, value }),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  test('resets the timer on rapid changes (only the last value lands)', () => {
    const { rerender, result } = renderHook(
      ({ value }) => useDebouncedValue({ delayMs: 200, value }),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: 'c' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('c');
  });
});
