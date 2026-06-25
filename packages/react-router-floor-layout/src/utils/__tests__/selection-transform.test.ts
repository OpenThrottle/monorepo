import { describe, expect, it } from 'vitest';

import { MIN_SIZE, computeRotation, computeSize } from '../selection-transform';

describe('computeSize', () => {
  const anchor = { rotation: 0, x: 100, y: 100 };

  it('doubles the half-extent of an axis-aligned drag (no snap)', () => {
    // Pointer 30 right, 20 below the center → half-extents 30 × 20.
    expect(computeSize(anchor, { x: 130, y: 120 }, 12, false)).toEqual({
      height: 40,
      width: 60,
    });
  });

  it('snaps the resulting size to the grid when enabled', () => {
    // raw 62 × 38 → snapped to a grid of 12 → 60 × 36.
    expect(computeSize(anchor, { x: 131, y: 119 }, 12, true)).toEqual({
      height: 36,
      width: 60,
    });
  });

  it('floors each dimension at MIN_SIZE', () => {
    // Pointer right on top of the center → raw 0 × 0.
    expect(computeSize(anchor, { x: 100, y: 100 }, 12, false)).toEqual({
      height: MIN_SIZE,
      width: MIN_SIZE,
    });
  });

  it('un-rotates the pointer into the local frame for a rotated element', () => {
    // Element rotated 90°cw. A pointer 30 to the right in world space is
    // 30 "below" in the element's local frame, so it grows local height.
    const rotated = { rotation: 90, x: 100, y: 100 };
    const size = computeSize(rotated, { x: 130, y: 100 }, 12, false);
    expect(size.height).toBeCloseTo(60, 6);
    expect(size.width).toBeCloseTo(MIN_SIZE, 6);
  });
});

describe('computeRotation', () => {
  const anchor = { rotation: 0, x: 100, y: 100 };

  it('reports 0° when the pointer is directly above the center', () => {
    // angleBetween center→above = -90°, +90 offset → 0°.
    expect(computeRotation(anchor, { x: 100, y: 50 }, false)).toEqual({
      rotation: 0,
    });
  });

  it('normalizes a pointer to the left into [0, 360)', () => {
    // angleBetween center→left = 180°, +90 → 270°.
    expect(computeRotation(anchor, { x: 50, y: 100 }, false)).toEqual({
      rotation: 270,
    });
  });

  it('snaps to the nearest 15° step when enabled', () => {
    // Pointer slightly off straight-down: angle ~ 82° → +90 ~ 172° → snap 165°.
    const result = computeRotation(anchor, { x: 107, y: 150 }, true);
    expect((result.rotation ?? 0) % 15).toBe(0);
  });
});
