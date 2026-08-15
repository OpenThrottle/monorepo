import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useRotatingHeadline } from '../useRotatingHeadline';

const ITEMS = ['alpha', 'bravo', 'charlie'] as const;

const stubReducedMotion = (matches: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches,
      removeEventListener: vi.fn(),
    })),
  );
};

describe('useRotatingHeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('starts on the first item', () => {
    const { result } = renderHook(() =>
      useRotatingHeadline({
        crossfadeMs: 200,
        intervalMs: 1_000,
        items: ITEMS,
      }),
    );

    expect(result.current.headline).toBe(ITEMS[0]);
  });

  test('advance steps to the next item and wraps', () => {
    const { result } = renderHook(() =>
      useRotatingHeadline({
        crossfadeMs: 200,
        intervalMs: 0,
        items: ITEMS,
      }),
    );

    act(() => {
      result.current.advance();
    });
    expect(result.current.headline).toBe(ITEMS[1]);

    act(() => {
      result.current.advance();
    });
    expect(result.current.headline).toBe(ITEMS[2]);

    act(() => {
      result.current.advance();
    });
    expect(result.current.headline).toBe(ITEMS[0]);
  });

  describe('when autoplay is enabled', () => {
    test('advances after each interval', () => {
      const { result } = renderHook(() =>
        useRotatingHeadline({
          crossfadeMs: 200,
          intervalMs: 1_000,
          items: ITEMS,
        }),
      );

      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      expect(result.current.headline).toBe(ITEMS[1]);

      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      expect(result.current.headline).toBe(ITEMS[2]);
    });
  });

  describe('when autoplay should not run', () => {
    test('does not tick when intervalMs is not positive', () => {
      const { result } = renderHook(() =>
        useRotatingHeadline({
          crossfadeMs: 200,
          intervalMs: 0,
          items: ITEMS,
        }),
      );

      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(result.current.headline).toBe(ITEMS[0]);
    });

    test('does not tick when reduced motion is preferred', () => {
      stubReducedMotion(true);

      const { result } = renderHook(() =>
        useRotatingHeadline({
          crossfadeMs: 200,
          intervalMs: 1_000,
          items: ITEMS,
        }),
      );

      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(result.current.headline).toBe(ITEMS[0]);
    });
  });

  describe('when crossfading', () => {
    test('keeps the previous line as outgoing until the fade ends', () => {
      const { result } = renderHook(() =>
        useRotatingHeadline({
          crossfadeMs: 200,
          intervalMs: 0,
          items: ITEMS,
        }),
      );

      act(() => {
        result.current.advance();
      });

      expect(result.current.headline).toBe(ITEMS[1]);
      expect(result.current.outgoing).toBe(ITEMS[0]);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.outgoing).toBeNull();
      expect(result.current.incomingVisible).toBe(true);
    });
  });
});
