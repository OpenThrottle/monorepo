import { afterEach, describe, expect, test, vi } from 'vitest';
import { installPolyfills, uninstallPolyfills } from '../polyfills';

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

  test('ResizeObserver shim is a no-op by default', async () => {
    installPolyfills();

    const callback = vi.fn();
    const observer = new globalThis.ResizeObserver(callback);
    observer.observe(document.createElement('div'));

    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('installPolyfills resizeObserverSize option', () => {
  // The shim only installs when ResizeObserver is absent, so clear it first.
  const originalResizeObserver = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  const clearResizeObserver = (): void => {
    // @ts-expect-error — intentionally remove so installResizeObserver patches.
    delete globalThis.ResizeObserver;
  };

  test('reports the default 1024×768 contentRect when enabled', async () => {
    clearResizeObserver();
    installPolyfills({ resizeObserverSize: true });

    const callback = vi.fn();
    const target = document.createElement('div');
    const observer = new globalThis.ResizeObserver(callback);
    observer.observe(target);

    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
    const [entries] = callback.mock.calls[0];
    expect(entries[0].target).toBe(target);
    expect(entries[0].contentRect.width).toBe(1024);
    expect(entries[0].contentRect.height).toBe(768);
  });

  test('honours an explicit size', async () => {
    clearResizeObserver();
    installPolyfills({ resizeObserverSize: { height: 200, width: 640 } });

    const callback = vi.fn();
    const observer = new globalThis.ResizeObserver(callback);
    observer.observe(document.createElement('div'));

    await Promise.resolve();

    const [entries] = callback.mock.calls[0];
    expect(entries[0].contentRect.width).toBe(640);
    expect(entries[0].contentRect.height).toBe(200);
  });

  test('does not fire the callback for an unobserved target', async () => {
    clearResizeObserver();
    installPolyfills({ resizeObserverSize: true });

    const callback = vi.fn();
    const target = document.createElement('div');
    const observer = new globalThis.ResizeObserver(callback);
    observer.observe(target);
    observer.unobserve(target);

    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('uninstallPolyfills', () => {
  // ResizeObserver is the only global this suite can safely round-trip: the
  // others (matchMedia, Element.prototype.*) may already exist from a prior
  // install in this worker, in which case installPolyfills skips them and there
  // is nothing for uninstallPolyfills to remove.
  const originalResizeObserver = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  const clearResizeObserver = (): void => {
    // @ts-expect-error — intentionally remove so installResizeObserver patches.
    delete globalThis.ResizeObserver;
  };

  test('removes a shim that installPolyfills actually installed', () => {
    clearResizeObserver();
    installPolyfills();
    expect(typeof globalThis.ResizeObserver).toBe('function');

    uninstallPolyfills();

    expect(typeof globalThis.ResizeObserver).toBe('undefined');
  });

  test('is idempotent — a second call is a no-op', () => {
    clearResizeObserver();
    installPolyfills();
    uninstallPolyfills();

    expect(() => uninstallPolyfills()).not.toThrow();
    expect(typeof globalThis.ResizeObserver).toBe('undefined');
  });
});
