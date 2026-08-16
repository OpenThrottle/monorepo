/**
 * jsdom polyfills shared by OpenThrottle React Router component tests.
 *
 * jsdom omits a handful of browser APIs that shadcn-ui, Radix, and cmdk reach
 * for during render (matchMedia, ResizeObserver, Element.scrollIntoView, and
 * pointer capture). These shims were previously copy-pasted — and had drifted —
 * across each app's `tests/setup.ts`; this module is the single canonical copy.
 *
 * Every shim is guarded so it only patches when the API is genuinely absent,
 * which makes {@link installPolyfills} idempotent: it is safe to call from every
 * test file's setup without clobbering a real implementation or a prior install.
 *
 * Lifetime: the shims patch process-global state — `window.matchMedia`,
 * `globalThis.ResizeObserver`, and `Element.prototype.*` — and are **permanent
 * for the worker process**. There is no automatic teardown; vmForks isolation
 * (the apps' Vitest config) scopes these globals per test file, so a fresh file
 * starts from the unpatched jsdom baseline. A suite that legitimately wants the
 * real (absent) behaviour back within a file can call {@link uninstallPolyfills}.
 */

/**
 * Minimal {@link MediaQueryList} for jsdom. Extending `EventTarget` provides
 * `addEventListener`/`removeEventListener`/`dispatchEvent` for free, so the
 * shim satisfies the interface structurally without any type assertions.
 */
class TestMediaQueryList extends EventTarget implements MediaQueryList {
  readonly matches: boolean = false;
  readonly media: string;
  onchange: MediaQueryList['onchange'] = null;

  constructor(media: string) {
    super();
    this.media = media;
  }

  // Legacy listener API some libraries still call.
  addListener(): void {}
  removeListener(): void {}
}

/** Default {@link DOMRectReadOnly} dimensions reported to ResizeObserver
 * callbacks when {@link InstallPolyfillsOptions.resizeObserverSize} is enabled.
 * Mirrors the de-facto `resize-observer-polyfill` test pattern of a non-zero
 * viewport so recharts `ResponsiveContainer` and Schedule-X measure real
 * geometry instead of 0×0. */
const DEFAULT_RESIZE_OBSERVER_SIZE: Readonly<{
  height: number;
  width: number;
}> = { height: 768, width: 1024 };

/**
 * Builds a {@link ResizeObserver} shim for jsdom.
 *
 * jsdom never reports layout, so the default shim is a genuine no-op (matching
 * historical behaviour). When `size` is provided, `observe()` schedules a
 * microtask that invokes the callback once with a non-zero `contentRect`,
 * which is what recharts `ResponsiveContainer` and Schedule-X need to render
 * ticks/bars/labels under jsdom.
 */
const createTestResizeObserver = (
  size?: Readonly<{ height: number; width: number }>,
): typeof ResizeObserver =>
  class TestResizeObserver implements ResizeObserver {
    readonly #callback: ResizeObserverCallback;
    readonly #observed = new Set<Element>();

    constructor(callback: ResizeObserverCallback) {
      this.#callback = callback;
    }

    observe(target: Element): void {
      if (size === undefined) {
        return;
      }

      this.#observed.add(target);

      queueMicrotask(() => {
        if (!this.#observed.has(target)) {
          return;
        }

        const contentRect = new DOMRectReadOnly(0, 0, size.width, size.height);
        const entry: ResizeObserverEntry = {
          borderBoxSize: [{ blockSize: size.height, inlineSize: size.width }],
          contentBoxSize: [{ blockSize: size.height, inlineSize: size.width }],
          contentRect,
          devicePixelContentBoxSize: [
            { blockSize: size.height, inlineSize: size.width },
          ],
          target,
        };

        this.#callback([entry], this);
      });
    }

    unobserve(target: Element): void {
      this.#observed.delete(target);
    }

    disconnect(): void {
      this.#observed.clear();
    }
  };

/**
 * Track which globals this module actually installed so {@link uninstallPolyfills}
 * can remove exactly those (and never a real implementation it deliberately
 * skipped). Each entry is a teardown closure registered at install time.
 */
const teardowns: Array<() => void> = [];

const installMatchMedia = (): void => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia === 'function'
  ) {
    return;
  }

  // Defensive define instead of plain assignment: if a future jsdom version
  // exposes `matchMedia` as a non-writable accessor, a bare `window.matchMedia =`
  // would throw (or silently no-op in strict mode). `configurable` also lets
  // uninstallPolyfills() delete it cleanly.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => new TestMediaQueryList(query),
    writable: true,
  });

  teardowns.push(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });
};

const installResizeObserver = (
  size?: Readonly<{ height: number; width: number }>,
): void => {
  if (typeof globalThis.ResizeObserver !== 'undefined') {
    return;
  }

  globalThis.ResizeObserver = createTestResizeObserver(size);
  teardowns.push(() => {
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });
};

const installElementShims = (): void => {
  if (typeof Element === 'undefined') {
    return;
  }

  // cmdk and Radix Select call scrollIntoView on items; jsdom omits it.
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = (): void => {};
    teardowns.push(() => {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    });
  }

  // Radix Select uses pointer capture; jsdom omits these on Element.
  if (typeof Element.prototype.hasPointerCapture !== 'function') {
    Element.prototype.hasPointerCapture = (): boolean => false;
    teardowns.push(() => {
      Reflect.deleteProperty(Element.prototype, 'hasPointerCapture');
    });
  }
  if (typeof Element.prototype.releasePointerCapture !== 'function') {
    Element.prototype.releasePointerCapture = (): void => {};
    teardowns.push(() => {
      Reflect.deleteProperty(Element.prototype, 'releasePointerCapture');
    });
  }
  if (typeof Element.prototype.setPointerCapture !== 'function') {
    Element.prototype.setPointerCapture = (): void => {};
    teardowns.push(() => {
      Reflect.deleteProperty(Element.prototype, 'setPointerCapture');
    });
  }
};

/**
 * Local overload helper: hands a value back typed as `T` at a boundary the DOM
 * lib types cannot express (a WebGL context stub, the heavily-overloaded
 * `getContext`) without an `as` cast. The implementation is an identity
 * function, so runtime behaviour is unchanged.
 */
function asDomBoundary<T>(value: unknown): T;
function asDomBoundary(value: unknown): unknown {
  return value;
}

/**
 * `@paper-design/shaders` (behind `GradientMesh` / `GlobalAnimationWaves`) asks
 * for a WebGL2 context and reads the global `visualViewport`. jsdom provides
 * neither: `getContext('webgl2')` returns null, the library throws
 * "WebGL is not supported in this browser" from an async mount effect, and
 * Vitest fails the run on the unhandled rejection even though every assertion
 * passed. Hand back a no-op GL context so the library's shader-compile guard
 * bails quietly instead.
 */
const installWebglStubs = (): void => {
  if (typeof HTMLCanvasElement !== 'undefined') {
    const realGetContext = asDomBoundary<
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
        return asDomBoundary<RenderingContext>(noopGlContext);
      }

      return realGetContext.call(this, contextId, ...args);
    };

    HTMLCanvasElement.prototype.getContext =
      asDomBoundary<typeof HTMLCanvasElement.prototype.getContext>(
        patchedGetContext,
      );
    teardowns.push(() => {
      HTMLCanvasElement.prototype.getContext =
        asDomBoundary<typeof HTMLCanvasElement.prototype.getContext>(
          realGetContext,
        );
    });
  }

  // A bare reference to an undeclared identifier throws, so optional chaining
  // cannot guard this one — the stand-in has to exist.
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

    teardowns.push(() => {
      Reflect.deleteProperty(globalThis, 'visualViewport');
    });
  }
};

/** Options for {@link installPolyfills}. */
export type InstallPolyfillsOptions = {
  /**
   * Opt the {@link ResizeObserver} shim into reporting a non-zero size so
   * recharts `ResponsiveContainer` / Schedule-X render real geometry under
   * jsdom (ticks/bars/labels). When omitted (the default), the shim stays a
   * no-op — matching historical behaviour so existing suites are undisturbed.
   *
   * Pass `true` for the {@link DEFAULT_RESIZE_OBSERVER_SIZE} (1024×768), or an
   * explicit `{ width, height }` for a custom viewport.
   */
  resizeObserverSize?: boolean | Readonly<{ height: number; width: number }>;
  /**
   * Stub the WebGL context and `visualViewport` so `@paper-design/shaders`
   * backgrounds (`GradientMesh`, `GlobalAnimationWaves`) mount without throwing
   * an unhandled rejection. Off by default — only suites that render those
   * backgrounds need it.
   */
  webgl?: boolean;
};

const resolveResizeObserverSize = (
  resizeObserverSize: InstallPolyfillsOptions['resizeObserverSize'],
): Readonly<{ height: number; width: number }> | undefined => {
  if (resizeObserverSize === undefined || resizeObserverSize === false) {
    return undefined;
  }

  if (resizeObserverSize === true) {
    return DEFAULT_RESIZE_OBSERVER_SIZE;
  }

  return resizeObserverSize;
};

/**
 * Install the jsdom shims OpenThrottle React Router component tests depend on:
 * `window.matchMedia`, `ResizeObserver`, `Element.prototype.scrollIntoView`, and
 * Element pointer capture. Idempotent — each shim only patches when missing.
 *
 * The `ResizeObserver` shim is a no-op by default; pass
 * {@link InstallPolyfillsOptions.resizeObserverSize} to make it report a
 * non-zero `contentRect` for chart-geometry assertions. The WebGL stubs are
 * likewise opt-in via {@link InstallPolyfillsOptions.webgl}.
 *
 * @public
 */
export const installPolyfills = (
  options: InstallPolyfillsOptions = {},
): void => {
  installMatchMedia();
  installResizeObserver(resolveResizeObserverSize(options.resizeObserverSize));
  installElementShims();

  if (options.webgl === true) {
    installWebglStubs();
  }
};

/**
 * Remove only the shims this module actually installed, restoring jsdom's
 * native (absent) behaviour. Provided for symmetry with {@link installPolyfills}
 * so a suite that needs the real unpatched globals can opt back out within a
 * file. Shims that were skipped because a real implementation already existed
 * are never touched. Idempotent — a second call is a no-op.
 *
 * @public
 */
export const uninstallPolyfills = (): void => {
  while (teardowns.length > 0) {
    teardowns.pop()?.();
  }
};
