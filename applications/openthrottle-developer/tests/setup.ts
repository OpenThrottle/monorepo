import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Satisfy react-router-utils environment.ts in jsdom (IS_BROWSER true, window.env used)
if (typeof window !== 'undefined') {
  window.env = {
    API_URL_EXTERNAL: 'http://localhost:6021',
    API_URL_INTERNAL: 'http://localhost:6021',
    APP_ENV: 'test',
    APP_NAME: 'openthrottle-developer',
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

// usePrefersReducedMotion (and other media-query hooks) call window.matchMedia; jsdom does not provide it
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      addEventListener: (): void => {},
      addListener: (): void => {},
      dispatchEvent: (): boolean => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: (): void => {},
      removeListener: (): void => {},
    }) as MediaQueryList;
}

// @paper-design/shaders (GradientMesh) requires a WebGL2 context; jsdom returns
// null for getContext('webgl2'), which makes the shader throw an async, unhandled
// rejection during mount. Hand back a no-op context: every method returns
// undefined, so the library's shader-compile guard bails and nothing is drawn.
if (typeof HTMLCanvasElement !== 'undefined') {
  const realGetContext = HTMLCanvasElement.prototype.getContext;
  const noopGlContext = new Proxy(
    {},
    {
      get: () => () => undefined,
    },
  );
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    contextId: string,
    ...args: unknown[]
  ) {
    if (contextId === 'webgl' || contextId === 'webgl2') {
      return noopGlContext as unknown as RenderingContext;
    }
    return realGetContext.call(this, contextId, ...(args as []));
  } as typeof HTMLCanvasElement.prototype.getContext;
}

// @paper-design/shaders also reads the global `visualViewport`; jsdom does not
// declare it, so a bare reference throws (optional chaining can't guard an
// undeclared identifier). Provide a minimal stand-in.
if (typeof globalThis.visualViewport === 'undefined') {
  Object.defineProperty(globalThis, 'visualViewport', {
    configurable: true,
    value: {
      addEventListener: (): void => {},
      height: 768,
      removeEventListener: (): void => {},
      scale: 1,
      width: 1024,
    },
    writable: true,
  });
}

// cmdk (Command) and Radix Popover use ResizeObserver; jsdom does not provide it
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// cmdk calls scrollIntoView on items; jsdom does not implement it
if (typeof Element !== 'undefined') {
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
}
