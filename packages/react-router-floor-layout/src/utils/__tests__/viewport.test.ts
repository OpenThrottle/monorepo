import { describe, expect, it } from 'vitest';

import {
  type ViewBox,
  type ViewportRect,
  clientToWorld,
  fitViewBox,
  panViewBoxByClient,
  pinchViewBox,
  viewBoxToString,
  zoomViewBoxAt,
} from '../viewport';

const RECT: ViewportRect = { height: 100, left: 0, top: 0, width: 100 };
const VB: ViewBox = { height: 200, width: 200, x: 0, y: 0 };
const LIMITS = { maxWidth: 2000, minWidth: 20 };

describe('viewBoxToString', () => {
  it('serializes in SVG attribute order', () => {
    expect(viewBoxToString({ height: 4, width: 3, x: 1, y: 2 })).toBe(
      '1 2 3 4',
    );
  });
});

describe('clientToWorld', () => {
  it('maps screen pixels to world inches under the viewBox', () => {
    expect(clientToWorld({ x: 50, y: 50 }, RECT, VB)).toEqual({
      x: 100,
      y: 100,
    });
    expect(clientToWorld({ x: 0, y: 0 }, RECT, VB)).toEqual({ x: 0, y: 0 });
  });

  it('returns the viewBox origin for a zero-size rect', () => {
    expect(clientToWorld({ x: 50, y: 50 }, { ...RECT, width: 0 }, VB)).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe('panViewBoxByClient', () => {
  it('moves the origin opposite the drag, scaled to world units', () => {
    // drag 10px right on a 100px rect spanning 200 world units => 20 world units
    expect(panViewBoxByClient(VB, 10, 0, RECT)).toEqual({
      height: 200,
      width: 200,
      x: -20,
      y: 0,
    });
  });
});

describe('zoomViewBoxAt', () => {
  it('zooms in about a fixed focal point', () => {
    const focus = { x: 100, y: 100 };
    const next = zoomViewBoxAt(VB, 2, focus, LIMITS);
    expect(next.width).toBe(100);
    expect(next.height).toBe(100);
    // focal point must map back to itself
    expect(next.x + 0.5 * next.width).toBe(focus.x);
    expect(next.y + 0.5 * next.height).toBe(focus.y);
  });

  it('clamps zoom to the configured width limits', () => {
    const next = zoomViewBoxAt(VB, 1000, { x: 100, y: 100 }, LIMITS);
    expect(next.width).toBe(LIMITS.minWidth);
  });
});

describe('fitViewBox', () => {
  it('contains a wide floor in a square viewport, centered with letterbox', () => {
    const vb = fitViewBox(
      { height: 100, width: 200 },
      { height: 100, width: 100 },
    );
    expect(vb.width).toBe(200);
    expect(vb.height).toBe(200);
    expect(vb.x).toBe(0);
    expect(vb.y).toBe(-50);
  });
});

describe('pinchViewBox', () => {
  it('zooms in when the two pointers spread apart', () => {
    const next = pinchViewBox(
      VB,
      [
        { x: 40, y: 50 },
        { x: 60, y: 50 },
      ],
      [
        { x: 20, y: 50 },
        { x: 80, y: 50 },
      ],
      RECT,
      LIMITS,
    );
    expect(next.width).toBeLessThan(VB.width);
  });

  it('keeps the world point under the midpoint invariant across a combined pinch+pan step', () => {
    // Two pointers that BOTH spread apart (pinch) AND shift right (pan): the
    // midpoint moves from x=50 to x=60. The world point under the previous
    // midpoint must end up under the next midpoint — no double-counted slide.
    const prev: readonly [{ x: number; y: number }, { x: number; y: number }] =
      [
        { x: 40, y: 50 },
        { x: 60, y: 50 },
      ];
    const next: readonly [{ x: number; y: number }, { x: number; y: number }] =
      [
        { x: 30, y: 50 },
        { x: 90, y: 50 },
      ];
    const prevMid = { x: 50, y: 50 };
    const nextMid = { x: 60, y: 50 };
    const worldUnderPrevMid = clientToWorld(prevMid, RECT, VB);

    const result = pinchViewBox(VB, prev, next, RECT, LIMITS);

    const worldUnderNextMidAfter = clientToWorld(nextMid, RECT, result);
    expect(worldUnderNextMidAfter.x).toBeCloseTo(worldUnderPrevMid.x, 6);
    expect(worldUnderNextMidAfter.y).toBeCloseTo(worldUnderPrevMid.y, 6);
  });
});
