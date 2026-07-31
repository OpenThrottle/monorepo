// Makes jest-dom's vitest matcher augmentation (toBeInTheDocument,
// toHaveTextContent, …) visible to TypeScript for this app's specs. The runtime
// extend already happens inside setupReactRouterTest; this import is what the TS
// program needs since it does not follow Vitest's setupFiles.
import '@testing-library/jest-dom/vitest';
import { setupReactRouterTest } from '@openthrottle/react-router-testing';

setupReactRouterTest({ env: { APP_NAME: 'openthrottle-developer' } });

// --- App-specific shims (NOT shared) -----------------------------------------
// The GradientMesh auth screen uses @paper-design/shaders, which needs a WebGL2
// context and reads the global `visualViewport`. jsdom provides neither, and
// neither can be typed without `as` casts, so these stay local to developer
// rather than living in @openthrottle/react-router-testing.

// Local overload helper: hands back the value typed as `T` at a boundary the DOM
// lib types cannot express (a WebGL stub, the heavily-overloaded `getContext`)
// without an `as` cast. The implementation is an identity function, so runtime
// behavior is unchanged.
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

// jsdom returns null for getContext('webgl2'), which makes the shader throw an
// async, unhandled rejection during mount. Hand back a no-op context: every
// method returns undefined, so the library's shader-compile guard bails.
if (typeof HTMLCanvasElement !== 'undefined') {
  const realGetContext = asMock<
    (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) => RenderingContext | null
  >(HTMLCanvasElement.prototype.getContext);
  const noopGlContext = new Proxy(
    {},
    {
      get: () => () => undefined,
    },
  );
  const patchedGetContext = function getContext(
    this: HTMLCanvasElement,
    contextId: string,
    ...args: unknown[]
  ): RenderingContext | null {
    if (contextId === 'webgl' || contextId === 'webgl2') {
      return asMock<RenderingContext>(noopGlContext);
    }
    return realGetContext.call(this, contextId, ...args);
  };
  HTMLCanvasElement.prototype.getContext =
    asMock<typeof HTMLCanvasElement.prototype.getContext>(patchedGetContext);
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
