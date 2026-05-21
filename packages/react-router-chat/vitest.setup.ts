import '@testing-library/jest-dom';

/**
 * @description jsdom does not implement `scrollIntoView`; {@link ChatThread} uses it when messages change.
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = (): void => {};
}
