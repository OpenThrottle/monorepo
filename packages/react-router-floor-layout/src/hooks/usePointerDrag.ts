/**
 * usePointerDrag — one native Pointer Events gesture primitive (no react-dnd).
 *
 * Built on `setPointerCapture` so it unifies mouse/touch/pen into a single
 * stream: pointerdown captures, pointermove emits LIVE world coordinates every
 * frame, pointerup commits exactly once and releases. It converts client pixels
 * to SVG-world inches (via the injected `clientToWorld`), then applies grid
 * snapping and a soft bounds-clamp live. The same primitive drives create, move,
 * rotate, and resize gestures — the consumer decides what to do with each frame.
 */

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  type Point,
  type Rect,
  clampPointToRect,
  snapPointToGrid,
} from '../utils/geometry';

/**
 * The live state passed to every drag callback.
 *
 * @publicApi
 */
export interface PointerDragContext {
  /** `world - startWorld`, in inches (snapped/clamped). */
  readonly deltaWorld: Point;
  /** The originating pointer id. */
  readonly pointerId: number;
  /** Unsnapped, unclamped world point under the pointer. */
  readonly rawWorld: Point;
  /** World point (snapped + clamped) at pointerdown. */
  readonly startWorld: Point;
  /** Current world point: snapped to grid, then clamped to bounds. */
  readonly world: Point;
}

/**
 * Configuration for {@link usePointerDrag}.
 *
 * @publicApi
 */
export interface UsePointerDragOptions {
  /** Optional soft clamp keeping `world` inside this rectangle. */
  readonly bounds?: Rect;
  /** Map a client (screen) point to world inches (from `useViewport`). */
  readonly clientToWorld: (client: Point) => Point;
  /** Fired once on pointerup/cancel — the single commit point. */
  readonly onEnd?: (context: PointerDragContext) => void;
  /** Fired on every pointermove with live coordinates. */
  readonly onMove?: (context: PointerDragContext) => void;
  /** Fired once on pointerdown. */
  readonly onStart?: (context: PointerDragContext) => void;
  /** Grid spacing (inches) to snap to; `0`/omitted disables snapping. */
  readonly snapGrid?: number;
}

/**
 * The handle returned by {@link usePointerDrag}.
 *
 * @publicApi
 */
export interface UsePointerDragResult {
  /** True while a gesture is in flight. */
  readonly isDragging: boolean;
  /** Begin a gesture — wire to an element/palette item's `onPointerDown`. */
  readonly start: (event: ReactPointerEvent) => void;
}

interface ActiveGesture {
  readonly pointerId: number;
  readonly startWorld: Point;
}

/**
 * Create a pointer-drag gesture handler. Returns `start` to attach to a target's
 * `onPointerDown`; the hook then tracks the gesture globally until pointerup so
 * it keeps firing even if the pointer leaves the element.
 *
 * @publicApi
 */
export function usePointerDrag(
  options: UsePointerDragOptions,
): UsePointerDragResult {
  // Keep the latest callbacks/config without re-binding window listeners.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const gesture = useRef<ActiveGesture | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resolve = useCallback((client: Point): { raw: Point; world: Point } => {
    const { bounds, clientToWorld, snapGrid } = optionsRef.current;
    const raw = clientToWorld(client);
    const snapped = snapPointToGrid(raw, snapGrid ?? 0);
    const world = bounds ? clampPointToRect(snapped, bounds) : snapped;
    return { raw, world };
  }, []);

  const buildContext = useCallback(
    (client: Point, active: ActiveGesture): PointerDragContext => {
      const { raw, world } = resolve(client);
      return {
        deltaWorld: {
          x: world.x - active.startWorld.x,
          y: world.y - active.startWorld.y,
        },
        pointerId: active.pointerId,
        rawWorld: raw,
        startWorld: active.startWorld,
        world,
      };
    },
    [resolve],
  );

  const handleMove = useCallback(
    (event: PointerEvent) => {
      const active = gesture.current;
      if (!active || event.pointerId !== active.pointerId) return;
      optionsRef.current.onMove?.(
        buildContext({ x: event.clientX, y: event.clientY }, active),
      );
    },
    [buildContext],
  );

  const detach = useCallback(
    (onUp: (event: PointerEvent) => void) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      gesture.current = null;
      setIsDragging(false);
    },
    [handleMove],
  );

  const handleUp = useCallback(
    (event: PointerEvent) => {
      const active = gesture.current;
      if (!active || event.pointerId !== active.pointerId) return;
      optionsRef.current.onEnd?.(
        buildContext({ x: event.clientX, y: event.clientY }, active),
      );
      detach(handleUp);
    },
    [buildContext, detach],
  );

  const start = useCallback(
    (event: ReactPointerEvent) => {
      // Element/palette drags must not also pan the canvas underneath.
      event.stopPropagation();
      const client: Point = { x: event.clientX, y: event.clientY };
      const { world } = resolve(client);
      const active: ActiveGesture = {
        pointerId: event.pointerId,
        startWorld: world,
      };
      gesture.current = active;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
      setIsDragging(true);
      optionsRef.current.onStart?.(buildContext(client, active));
    },
    [buildContext, handleMove, handleUp, resolve],
  );

  // Tear down listeners if the component unmounts mid-gesture.
  useEffect(
    () => () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    },
    [handleMove, handleUp],
  );

  return { isDragging, start };
}
