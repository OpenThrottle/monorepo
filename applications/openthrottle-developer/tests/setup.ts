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

// graphql-ws (the plan-detail output stream) opens a real WebSocket via the
// global constructor the moment a component subscribes. window.env.API_URL_EXTERNAL
// points at a dev port with nothing listening under test, so Node's undici
// WebSocket later runs its connection callback and dispatches an `open`/`error`
// Event across the vm-realm boundary — `TypeError: The "event" argument must be
// an instance of Event` — an unhandled error that fails the run (and, under the
// vmForks pool, crashes the worker outright so its in-flight file is reported as
// a stuck `(0 test)`). Swap in an inert socket that never connects and never
// dispatches. Suites that assert on stream behavior mock the graphql-ws client
// (`~/services/graphql-ws-client`) directly, so they bypass this entirely.
class InertWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readonly url: string;
  readonly protocol = '';
  readonly extensions = '';
  readonly bufferedAmount = 0;
  binaryType = 'blob';
  readyState = InertWebSocket.CONNECTING;
  onopen: unknown = null;
  onclose: unknown = null;
  onerror: unknown = null;
  onmessage: unknown = null;

  constructor(url: string | URL) {
    this.url = String(url);
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return false;
  }
  send(): void {}
  close(): void {
    this.readyState = InertWebSocket.CLOSED;
  }
}

globalThis.WebSocket = asMock<typeof WebSocket>(InertWebSocket);
if (typeof window !== 'undefined') {
  window.WebSocket = asMock<typeof WebSocket>(InertWebSocket);
}
