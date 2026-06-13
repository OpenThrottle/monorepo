import '@testing-library/jest-dom';

// Satisfy react-router-utils environment.ts in jsdom (IS_BROWSER true, window.env used)
if (typeof window !== 'undefined') {
  window.env = {
    API_URL_EXTERNAL: 'http://localhost:6021',
    API_URL_INTERNAL: 'http://localhost:6021',
    APP_ENV: 'test',
    APP_NAME: 'openthrottle-admin',
    APP_NAME_SHORT: 'OT',
    APP_URL: 'http://localhost',
    APP_URL_ADMIN: 'http://localhost:6022',
    APP_URL_CMS: 'http://localhost:6023',
    APP_URL_DEVELOPER: 'http://localhost:6024',
    APP_URL_EMAIL: 'http://localhost:6025',
    APP_URL_SERVER: 'http://localhost:6026',
    APP_URL_WEBSITE: 'http://localhost:6027',
    APP_VERSION: '1.0.0',
    NODE_ENV: 'test',
    ROLLBAR_TOKEN: 'xxxxxxxxxxxxxxxx',
  };
}

// Recharts and other libs that measure container size in jsdom (avoids "width(-1) and height(-1)" warnings)
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Radix Select and cmdk call scrollIntoView; jsdom does not implement it
Element.prototype.scrollIntoView = (): void => {};

// Radix Select uses pointer capture; jsdom does not implement these on Element
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = (): boolean => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = (): void => {};
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = (): void => {};
}

// shadcn-ui Sidebar (use-mobile) and other components that rely on matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => true,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  });
}
