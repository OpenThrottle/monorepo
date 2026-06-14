/**
 * jsdom polyfills shared by OpenThrottle React Router component tests.
 *
 * jsdom omits a handful of browser APIs that shadcn-ui, Radix, and cmdk reach
 * for during render (matchMedia, ResizeObserver, Element.scrollIntoView, and
 * pointer capture). These shims were previously copy-pasted — and had drifted —
 * across each app's `tests/setup.ts`; this module is the single canonical copy.
 *
 * Every shim is guarded so it only patches when the API is genuinely absent,
 * which makes {@link installPolyfills} idempotent: it is safe to call from every
 * test file's setup without clobbering a real implementation or a prior install.
 */

/**
 * Minimal {@link MediaQueryList} for jsdom. Extending `EventTarget` provides
 * `addEventListener`/`removeEventListener`/`dispatchEvent` for free, so the
 * shim satisfies the interface structurally without any type assertions.
 */
class TestMediaQueryList extends EventTarget implements MediaQueryList {
  readonly matches: boolean = false;
  readonly media: string;
  onchange: MediaQueryList['onchange'] = null;

  constructor(media: string) {
    super();
    this.media = media;
  }

  // Legacy listener API some libraries still call.
  addListener(): void {}
  removeListener(): void {}
}

/** No-op {@link ResizeObserver}; jsdom never reports size changes. */
class TestResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const installMatchMedia = (): void => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia === 'function'
  ) {
    return;
  }

  window.matchMedia = (query: string): MediaQueryList =>
    new TestMediaQueryList(query);
};

const installResizeObserver = (): void => {
  if (typeof globalThis.ResizeObserver !== 'undefined') {
    return;
  }

  globalThis.ResizeObserver = TestResizeObserver;
};

const installElementShims = (): void => {
  if (typeof Element === 'undefined') {
    return;
  }

  // cmdk and Radix Select call scrollIntoView on items; jsdom omits it.
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = (): void => {};
  }

  // Radix Select uses pointer capture; jsdom omits these on Element.
  if (typeof Element.prototype.hasPointerCapture !== 'function') {
    Element.prototype.hasPointerCapture = (): boolean => false;
  }
  if (typeof Element.prototype.releasePointerCapture !== 'function') {
    Element.prototype.releasePointerCapture = (): void => {};
  }
  if (typeof Element.prototype.setPointerCapture !== 'function') {
    Element.prototype.setPointerCapture = (): void => {};
  }
};

/**
 * Install the jsdom shims OpenThrottle React Router component tests depend on:
 * `window.matchMedia`, `ResizeObserver`, `Element.prototype.scrollIntoView`, and
 * Element pointer capture. Idempotent — each shim only patches when missing.
 *
 * @publicApi
 */
export const installPolyfills = (): void => {
  installMatchMedia();
  installResizeObserver();
  installElementShims();
};
