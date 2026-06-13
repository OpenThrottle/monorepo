import '@testing-library/jest-dom';

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
 * @description jsdom does not implement `matchMedia`; some deps read it in effects.
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
