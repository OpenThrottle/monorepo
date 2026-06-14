import { setupReactRouterTest } from '@openthrottle/react-router-testing';

setupReactRouterTest({ env: { APP_NAME: 'openthrottle-developer' } });

// --- App-specific shims (NOT shared) -----------------------------------------
// The GradientMesh auth screen uses @paper-design/shaders, which needs a WebGL2
// context and reads the global `visualViewport`. jsdom provides neither, and
// neither can be typed without `as` casts, so these stay local to developer
// rather than living in @openthrottle/react-router-testing.

// jsdom returns null for getContext('webgl2'), which makes the shader throw an
// async, unhandled rejection during mount. Hand back a no-op context: every
// method returns undefined, so the library's shader-compile guard bails.
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
