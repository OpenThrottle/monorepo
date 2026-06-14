import { describe, expect, test, vi } from 'vitest';
import { installPolyfills } from './polyfills';

describe('installPolyfills', () => {
  test('defines the jsdom shims that are missing', () => {
    installPolyfills();

    expect(typeof window.matchMedia).toBe('function');
    expect(typeof globalThis.ResizeObserver).toBe('function');
    expect(typeof Element.prototype.scrollIntoView).toBe('function');
    expect(typeof Element.prototype.hasPointerCapture).toBe('function');
    expect(typeof Element.prototype.releasePointerCapture).toBe('function');
    expect(typeof Element.prototype.setPointerCapture).toBe('function');
  });

  test('matchMedia shim returns an inert, listenable MediaQueryList', () => {
    installPolyfills();

    const mediaQueryList = window.matchMedia('(min-width: 768px)');

    expect(mediaQueryList.matches).toBe(false);
    expect(mediaQueryList.media).toBe('(min-width: 768px)');

    const listener = vi.fn();
    mediaQueryList.addEventListener('change', listener);
    mediaQueryList.removeEventListener('change', listener);
    expect(listener).not.toHaveBeenCalled();
  });

  test('is idempotent — repeated calls do not replace the shims', () => {
    installPolyfills();
    const firstMatchMedia = window.matchMedia;
    const firstResizeObserver = globalThis.ResizeObserver;
    const firstScrollIntoView = Element.prototype.scrollIntoView;

    installPolyfills();

    expect(window.matchMedia).toBe(firstMatchMedia);
    expect(globalThis.ResizeObserver).toBe(firstResizeObserver);
    expect(Element.prototype.scrollIntoView).toBe(firstScrollIntoView);
  });
});
