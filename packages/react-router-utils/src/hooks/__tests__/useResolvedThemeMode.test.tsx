import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useResolvedThemeMode } from '../useResolvedThemeMode';
import type { ThemeMode } from '../../utils/theme';

interface FakeMediaQueryList {
  addEventListener: ReturnType<typeof vi.fn>;
  dispatch: (matches: boolean) => void;
  matches: boolean;
  removeEventListener: ReturnType<typeof vi.fn>;
}

const installMatchMedia = (initialMatches: boolean): FakeMediaQueryList => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql: FakeMediaQueryList = {
    addEventListener: vi.fn((_type: string, listener) => {
      listeners.add(listener);
    }),
    dispatch: (matches: boolean) => {
      mql.matches = matches;
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
    matches: initialMatches,
    removeEventListener: vi.fn((_type: string, listener) => {
      listeners.delete(listener);
    }),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  );
  return mql;
};

describe('useResolvedThemeMode', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('dark');
  });

  test('resolves explicit modes and applies the dark class accordingly', () => {
    installMatchMedia(false);

    const { rerender, result } = renderHook(
      ({ theme }: { theme: ThemeMode }) => useResolvedThemeMode(theme),
      { initialProps: { theme: 'dark' } },
    );
    expect(result.current).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    rerender({ theme: 'light' });
    expect(result.current).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('resolves system to the OS preference', () => {
    installMatchMedia(true);

    const { result } = renderHook(() => useResolvedThemeMode('system'));

    expect(result.current).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('updates live when the OS preference changes in system mode', () => {
    const mql = installMatchMedia(true);

    const { result } = renderHook(() => useResolvedThemeMode('system'));
    expect(result.current).toBe('dark');

    act(() => {
      mql.dispatch(false);
    });

    expect(result.current).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('does not react to OS changes in an explicit mode', () => {
    const mql = installMatchMedia(false);

    const { result } = renderHook(() => useResolvedThemeMode('light'));
    // No change listener is registered while not in system mode.
    expect(mql.addEventListener).not.toHaveBeenCalled();

    act(() => {
      mql.dispatch(true);
    });

    expect(result.current).toBe('light');
  });
});
