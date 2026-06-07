import '@testing-library/jest-dom';

/**
 * @description jsdom does not implement `ResizeObserver`; Radix Tooltip expects it.
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
 * @description jsdom does not implement `scrollIntoView`; {@link ChatThread} uses it when messages change.
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = (): void => {};
}
