import { act, renderHook } from '@testing-library/react';
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { describe, expect, it } from 'vitest';

import { useViewport, type UseViewportResult } from '../useViewport';

/**
 * Present a structural test double as its real type. The public overload hands
 * the caller `T`; the implementation stays `unknown`-typed, so the mock
 * boundary needs no `as` cast. The hook only touches a handful of members on
 * these DOM/React event objects, so a partial mock is sufficient.
 */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const FLOOR = { height: 120, width: 120 };
const RECT: DOMRect = {
  bottom: 100,
  height: 100,
  left: 0,
  right: 100,
  toJSON: () => ({}),
  top: 0,
  width: 100,
  x: 0,
  y: 0,
};

/**
 * Attach a fake SVG element to the hook's `svgRef` so the rect-dependent paths
 * (pan/pinch/zoom) have a viewport rectangle to map against. Pointer capture is
 * a no-op here — renderHook has no real DOM target.
 */
function attachSvg(result: UseViewportResult): void {
  const svg = asMock<SVGSVGElement>({
    getBoundingClientRect: () => RECT,
    releasePointerCapture: () => undefined,
    setPointerCapture: () => undefined,
  });
  // svgRef is a stable ref across renders, so reading it from the first
  // snapshot is fine.
  result.svgRef.current = svg;
}

function pointerEvent(
  pointerId: number,
  clientX: number,
  clientY: number,
): ReactPointerEvent {
  const target = {
    releasePointerCapture: () => undefined,
    setPointerCapture: () => undefined,
  };
  return asMock<ReactPointerEvent>({
    clientX,
    clientY,
    currentTarget: target,
    pointerId,
  });
}

describe('useViewport — pointer arbitration', () => {
  it('pans the viewBox with a single dragging pointer', () => {
    const { result } = renderHook(() => useViewport({ floor: FLOOR }));
    attachSvg(result.current);

    const startX = result.current.viewBox.x;
    const startY = result.current.viewBox.y;

    act(() =>
      result.current.panHandlers.onPointerDown(pointerEvent(1, 50, 50)),
    );
    act(() =>
      result.current.panHandlers.onPointerMove(pointerEvent(1, 60, 70)),
    );

    // Dragging the pointer right/down scrolls the world left/up: a +client
    // delta becomes a -world delta scaled by viewBox/rect.
    expect(result.current.viewBox.x).toBeLessThan(startX);
    expect(result.current.viewBox.y).toBeLessThan(startY);

    act(() => result.current.panHandlers.onPointerUp(pointerEvent(1, 60, 70)));
  });

  it('switches to pinch with two pointers and zooms on a spread', () => {
    const { result } = renderHook(() => useViewport({ floor: FLOOR }));
    attachSvg(result.current);

    const startWidth = result.current.viewBox.width;

    // Two pointers down, close together.
    act(() =>
      result.current.panHandlers.onPointerDown(pointerEvent(1, 40, 50)),
    );
    act(() =>
      result.current.panHandlers.onPointerDown(pointerEvent(2, 60, 50)),
    );

    // Spread them apart → pinch-zoom in → viewBox width shrinks.
    act(() =>
      result.current.panHandlers.onPointerMove(pointerEvent(2, 90, 50)),
    );

    expect(result.current.viewBox.width).toBeLessThan(startWidth);
  });

  it('pairs the two lowest pointer ids when three are down', () => {
    const { result } = renderHook(() => useViewport({ floor: FLOOR }));
    attachSvg(result.current);

    act(() =>
      result.current.panHandlers.onPointerDown(pointerEvent(5, 40, 50)),
    );
    act(() =>
      result.current.panHandlers.onPointerDown(pointerEvent(2, 60, 50)),
    );
    act(() =>
      result.current.panHandlers.onPointerDown(pointerEvent(9, 80, 50)),
    );

    const before = { ...result.current.viewBox };
    // Move the highest id (9): it is NOT in the lowest-two pair (2, 5), so the
    // pinch pair is unchanged and the viewBox must not move.
    act(() =>
      result.current.panHandlers.onPointerMove(pointerEvent(9, 95, 50)),
    );

    expect(result.current.viewBox).toEqual(before);
  });

  it('ignores pointer moves for ids that never went down', () => {
    const { result } = renderHook(() => useViewport({ floor: FLOOR }));
    attachSvg(result.current);

    const before = { ...result.current.viewBox };
    act(() =>
      result.current.panHandlers.onPointerMove(pointerEvent(7, 60, 70)),
    );

    expect(result.current.viewBox).toEqual(before);
  });
});

describe('useViewport — wheel + button zoom', () => {
  it('zooms in (shrinks the viewBox) on a negative wheel delta', () => {
    const { result } = renderHook(() => useViewport({ floor: FLOOR }));
    attachSvg(result.current);

    const startWidth = result.current.viewBox.width;
    act(() =>
      result.current.onWheel(
        asMock<ReactWheelEvent>({
          clientX: 50,
          clientY: 50,
          deltaY: -240,
          preventDefault: () => undefined,
        }),
      ),
    );

    expect(result.current.viewBox.width).toBeLessThan(startWidth);
  });

  it('zoomIn shrinks and zoomOut grows the viewBox by a step', () => {
    const { result } = renderHook(() => useViewport({ floor: FLOOR }));
    attachSvg(result.current);

    const startWidth = result.current.viewBox.width;
    act(() => result.current.zoomIn());
    const zoomedIn = result.current.viewBox.width;
    expect(zoomedIn).toBeLessThan(startWidth);

    act(() => result.current.zoomOut());
    expect(result.current.viewBox.width).toBeGreaterThan(zoomedIn);
  });
});
