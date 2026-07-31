// Makes jest-dom's vitest matcher augmentation (toBeInTheDocument,
// toHaveTextContent, …) visible to TypeScript for this app's specs. The runtime
// extend already happens inside setupReactRouterTest; this import is what the TS
// program needs since it does not follow Vitest's setupFiles.
import '@testing-library/jest-dom/vitest';
import { setupReactRouterTest } from '@openthrottle/react-router-testing';
import { vi } from 'vitest';

setupReactRouterTest({ env: { APP_NAME: 'openthrottle-developer' } });

// Any component that mounts a graphql-ws subscription (plan/task detail routes,
// output/lifecycle streams, …) calls getGraphqlWsClient(), which in a real
// browser opens a WebSocket to API_URL_EXTERNAL. In jsdom there is no server, so
// the undici WebSocket errors *asynchronously, after the test finishes* — an
// unhandled error Vitest fails the run on. The old `vmForks` pool tore down each
// file's VM context fast enough to swallow these; `forks` keeps the process
// alive long enough to surface them, so stub the client suite-wide. Returning
// null is exactly what the real service returns during SSR / before window.env
// is populated, and every subscription hook already guards for null (so it
// simply skips subscribing — no socket, no async error). Specs that need a live
// fake client still override this with their own `vi.mock` of the same module.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

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
