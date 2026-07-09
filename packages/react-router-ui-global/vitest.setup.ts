import '@testing-library/jest-dom/vitest';

/**
 * @description jsdom has no `window.env`; react-router-utils reads it when `IS_BROWSER` is true.
 */
const testWindowEnv = {
  API_URL_EXTERNAL: 'http://localhost/api',
  API_URL_INTERNAL: 'http://localhost/api/internal',
  APP_ENV: 'test',
  APP_NAME: 'test-app',
  APP_NAME_SHORT: 'OT',
  APP_URL: 'http://localhost',
  APP_URL_ADMIN: 'http://localhost/admin',
  APP_URL_CMS: 'http://localhost/cms',
  APP_URL_DEVELOPER: 'http://localhost/developer',
  APP_URL_EMAIL: 'http://localhost/email',
  APP_URL_SERVER: 'http://localhost/server',
  APP_URL_WEBSITE: 'http://localhost/website',
  APP_VERSION: '0.0.0-test',
  NODE_ENV: 'test',
  ROLLBAR_TOKEN: '',
} as const;

window.env = testWindowEnv;

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
 * @description jsdom does not implement `matchMedia`; sidebar / Sonner read it in effects.
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

/**
 * @description jsdom lacks pointer capture APIs used by Radix Select / menus.
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
