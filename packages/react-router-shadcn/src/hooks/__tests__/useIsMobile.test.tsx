import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { useIsMobile } from '../useIsMobile';

/**
 * useIsMobile derives its state from `window.innerWidth` against the 768px
 * breakpoint (the shared test setup stubs `matchMedia`), so we drive the
 * assertions by controlling `innerWidth` before each render.
 */
function setInnerWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
}

describe('useIsMobile', () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    setInnerWidth(originalWidth);
  });

  test('returns a boolean', () => {
    const { result } = renderHook(() => useIsMobile());

    expect(typeof result.current).toBe('boolean');
  });

  test('is true when the viewport is below the mobile breakpoint', () => {
    setInnerWidth(500);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  test('is false when the viewport is at or above the mobile breakpoint', () => {
    setInnerWidth(1024);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});
