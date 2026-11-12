import '@testing-library/jest-dom/vitest';

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
 * @description jsdom does not implement `IntersectionObserver`; embla (the
 * `Carousel`) constructs one on mount.
 */
class IntersectionObserverStub implements IntersectionObserver {
  public readonly root: Document | Element | null = null;
  public readonly rootMargin: string = '0px';
  public readonly scrollMargin: string = '0px';
  public readonly thresholds: ReadonlyArray<number> = [0];

  public disconnect(): void {}
  public observe(): void {}
  public takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  public unobserve(): void {}
}

if (globalThis.IntersectionObserver === undefined) {
  globalThis.IntersectionObserver = IntersectionObserverStub;
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
