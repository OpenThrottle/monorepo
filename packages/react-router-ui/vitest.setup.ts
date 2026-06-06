import '@testing-library/jest-dom';

/**
 * @description `@openthrottle/react-router-utils` reads `window.env` when `document` exists;
 * jsdom has no injected env until the app root runs.
 */
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'env', {
    configurable: true,
    enumerable: true,
    value: {
      APP_ENV: 'test',
      APP_URL: 'https://test.example',
      NODE_ENV: 'test',
    },
    writable: true,
  });
}

/**
 * @description jsdom does not implement `ResizeObserver`; cmdk and other deps expect it.
 */
class ResizeObserverStub {
  public disconnect(): void {}
  public observe(): void {}
  public unobserve(): void {}
}

if (globalThis.ResizeObserver === undefined) {
  globalThis.ResizeObserver = ResizeObserverStub;
}

/**
 * @description jsdom does not implement `matchMedia`; Sonner and others read it in effects.
 */
if (globalThis.matchMedia === undefined) {
  globalThis.matchMedia = (query: string): MediaQueryList => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  });
}

/**
 * @description jsdom does not implement `scrollIntoView`; cmdk calls it on list items.
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = (): void => {};
}
