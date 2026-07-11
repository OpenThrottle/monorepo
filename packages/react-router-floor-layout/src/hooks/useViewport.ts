/**
 * useViewport — owns the SVG viewBox (world space, inches) and all pan/zoom
 * interaction. Wheel zoom, drag-empty-canvas pan, two-pointer pinch, and the
 * imperative zoomIn/zoomOut/fitToScreen the toolbar needs. Pointer arbitration
 * (one pointer on empty canvas = pan, two = pinch) lives here; element drags
 * are handled separately by usePointerDrag and stop propagation so they never
 * reach these background handlers.
 *
 * All coordinate math is delegated to the pure helpers in utils/viewport so the
 * hook stays a thin, testable state wrapper.
 */

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type Point, type Size } from '../utils/geometry';
import {
  type ViewBox,
  type ViewportRect,
  type ZoomLimits,
  clientToWorld as clientToWorldMath,
  fitViewBox,
  panViewBoxByClient,
  pinchViewBox,
  viewBoxToString,
  zoomViewBoxAt,
} from '../utils/viewport';

const WHEEL_ZOOM_STEP = 1.0015;
const BUTTON_ZOOM_FACTOR = 1.25;
const DEFAULT_MAX_ZOOM_IN = 8;
const DEFAULT_MAX_ZOOM_OUT = 6;
const DEFAULT_PADDING = 24;

/**
 * Configuration for {@link useViewport}.
 *
 * @public
 */
export interface UseViewportOptions {
  /** Floor dimensions in inches; drives the initial fit and zoom limits. */
  readonly floor: Size;
  /** Max zoom-in factor relative to the floor (default 8). */
  readonly maxZoomIn?: number;
  /** Max zoom-out factor relative to the floor (default 6). */
  readonly maxZoomOut?: number;
  /** World padding (inches) kept around the floor when fitting (default 24). */
  readonly padding?: number;
}

/**
 * The viewport controller returned by {@link useViewport}.
 *
 * @public
 */
export interface UseViewportResult {
  /** Map a client (screen) point to world inches under the current viewBox. */
  readonly clientToWorld: (client: Point) => Point;
  /** Recompute the viewBox so the whole floor fits the current element size. */
  readonly fitToScreen: () => void;
  /** Wheel handler — attach to the `<svg>` for cursor-anchored zoom. */
  readonly onWheel: (event: ReactWheelEvent) => void;
  /** Background pointer handlers — attach to the `<svg>` for pan/pinch. */
  readonly panHandlers: {
    readonly onPointerDown: (event: ReactPointerEvent) => void;
    readonly onPointerMove: (event: ReactPointerEvent) => void;
    readonly onPointerUp: (event: ReactPointerEvent) => void;
  };
  /** Ref to attach to the `<svg>` element. */
  readonly svgRef: RefObject<SVGSVGElement | null>;
  /** Current viewBox (world units). */
  readonly viewBox: ViewBox;
  /** Current viewBox serialized for the SVG `viewBox` attribute. */
  readonly viewBoxString: string;
  /** Zoom in one step about the viewport center. */
  readonly zoomIn: () => void;
  /** Zoom out one step about the viewport center. */
  readonly zoomOut: () => void;
}

function rectOf(svg: SVGSVGElement | null): ViewportRect | null {
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  return { height: r.height, left: r.left, top: r.top, width: r.width };
}

function pointerCenter(rect: ViewportRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Manage the SVG viewBox and pan/zoom interaction for the floor canvas.
 *
 * @public
 */
export function useViewport(options: UseViewportOptions): UseViewportResult {
  const {
    floor,
    maxZoomIn = DEFAULT_MAX_ZOOM_IN,
    maxZoomOut = DEFAULT_MAX_ZOOM_OUT,
    padding = DEFAULT_PADDING,
  } = options;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef<Map<number, Point>>(new Map());

  const [viewBox, setViewBox] = useState<ViewBox>(() =>
    fitViewBox(floor, floor, padding),
  );

  const limits = useMemo<ZoomLimits>(() => {
    const base = Math.max(floor.width, floor.height);
    return { maxWidth: base * maxZoomOut, minWidth: base / maxZoomIn };
  }, [floor.width, floor.height, maxZoomIn, maxZoomOut]);

  const clientToWorld = useCallback(
    (client: Point): Point => {
      const rect = rectOf(svgRef.current);
      if (!rect) return { x: viewBox.x, y: viewBox.y };
      return clientToWorldMath(client, rect, viewBox);
    },
    [viewBox],
  );

  const fitToScreen = useCallback(() => {
    const rect = rectOf(svgRef.current);
    const viewport: Size = rect ?? floor;
    setViewBox(fitViewBox(floor, viewport, padding));
  }, [floor, padding]);

  const zoomAtClient = useCallback(
    (factor: number, focusClient: Point) => {
      const rect = rectOf(svgRef.current);
      setViewBox((current) => {
        const r = rect ?? { height: 1, left: 0, top: 0, width: 1 };
        const focus = clientToWorldMath(focusClient, r, current);
        return zoomViewBoxAt(current, factor, focus, limits);
      });
    },
    [limits],
  );

  const zoomStep = useCallback(
    (factor: number) => {
      const rect = rectOf(svgRef.current);
      if (!rect) return;
      zoomAtClient(factor, pointerCenter(rect));
    },
    [zoomAtClient],
  );

  const zoomIn = useCallback(() => zoomStep(BUTTON_ZOOM_FACTOR), [zoomStep]);
  const zoomOut = useCallback(
    () => zoomStep(1 / BUTTON_ZOOM_FACTOR),
    [zoomStep],
  );

  const onWheel = useCallback(
    (event: ReactWheelEvent) => {
      event.preventDefault();
      const factor = WHEEL_ZOOM_STEP ** -event.deltaY;
      zoomAtClient(factor, { x: event.clientX, y: event.clientY });
    },
    [zoomAtClient],
  );

  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const active = pointers.current;
      if (!active.has(event.pointerId)) return;
      const rect = rectOf(svgRef.current);
      if (!rect) return;

      const prevSelf = active.get(event.pointerId);
      const next: Point = { x: event.clientX, y: event.clientY };

      if (active.size >= 2) {
        // Pinch: take the two lowest pointer ids for a stable pair.
        const [idA, idB] = [...active.keys()].sort((a, b) => a - b);
        if (idA === undefined || idB === undefined) return;
        const prevPair: readonly [Point, Point] = [
          active.get(idA) ?? next,
          active.get(idB) ?? next,
        ];
        active.set(event.pointerId, next);
        const nextPair: readonly [Point, Point] = [
          active.get(idA) ?? next,
          active.get(idB) ?? next,
        ];
        setViewBox((current) =>
          pinchViewBox(current, prevPair, nextPair, rect, limits),
        );
        return;
      }

      // Single pointer on empty canvas: pan.
      active.set(event.pointerId, next);
      if (!prevSelf) return;
      setViewBox((current) =>
        panViewBoxByClient(
          current,
          next.x - prevSelf.x,
          next.y - prevSelf.y,
          rect,
        ),
      );
    },
    [limits],
  );

  const onPointerUp = useCallback((event: ReactPointerEvent) => {
    pointers.current.delete(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const panHandlers = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp }),
    [onPointerDown, onPointerMove, onPointerUp],
  );

  return {
    clientToWorld,
    fitToScreen,
    onWheel,
    panHandlers,
    svgRef,
    viewBox,
    viewBoxString: viewBoxToString(viewBox),
    zoomIn,
    zoomOut,
  };
}
