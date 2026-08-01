/**
 * usePerElementPointerDown — referentially-stable per-id pointer-down closures.
 *
 * Caches one `(event) => handler(id, event)` closure per element id so each
 * `FloorElementView` receives a referentially stable `onPointerDown`. Without
 * this, a fresh inline arrow per element per render would defeat
 * `FloorElementView`'s `React.memo` and re-render every element on every
 * live-drag frame. The cached closures read the latest handler through a ref,
 * so they stay stable even though the handler may change identity every render
 * (the live layout is rebuilt during a drag).
 */

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
} from 'react';

/**
 * Configuration for {@link usePerElementPointerDown}.
 *
 * @public
 */
export interface UsePerElementPointerDownOptions {
  /** The latest pointer-down handler; may change identity every render. */
  readonly handler: (id: string, event: ReactPointerEvent) => void;
}

/**
 * The handle returned by {@link usePerElementPointerDown}.
 *
 * @public
 */
export interface UsePerElementPointerDownResult {
  /** Get (or lazily create) the stable pointer-down closure for an id. */
  readonly getPointerDown: (id: string) => (event: ReactPointerEvent) => void;
}

/**
 * Cache referentially-stable per-element-id `onPointerDown` closures that
 * always dispatch to the latest handler.
 *
 * @public
 */
export function usePerElementPointerDown(
  options: UsePerElementPointerDownOptions,
): UsePerElementPointerDownResult {
  const { handler } = options;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const cacheRef = useRef(
    new Map<string, (event: ReactPointerEvent) => void>(),
  );

  const getPointerDown = useCallback(
    (id: string): ((event: ReactPointerEvent) => void) => {
      const cache = cacheRef.current;
      const existing = cache.get(id);
      if (existing) return existing;
      const pointerDown = (event: ReactPointerEvent): void =>
        handlerRef.current(id, event);
      cache.set(id, pointerDown);
      return pointerDown;
    },
    [],
  );

  return { getPointerDown };
}
