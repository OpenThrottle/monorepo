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
