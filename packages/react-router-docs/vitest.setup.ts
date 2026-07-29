import '@testing-library/jest-dom';

/**
 * @description jsdom does not implement `ResizeObserver`; cmdk (the command
 * palette behind DocsSearch) and other deps expect it.
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
 * @description jsdom does not implement `scrollIntoView`; cmdk calls it on list
 * items as the selection moves.
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = (): void => {};
}
