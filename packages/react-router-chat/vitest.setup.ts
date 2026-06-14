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

/**
 * @description jsdom lacks the Pointer Capture API; Radix Select/ToggleGroup
 * call it when opening, so userEvent interactions throw without these stubs.
 */
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = (): boolean => false;
  }

  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = (): void => {};
  }

  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = (): void => {};
  }
}
