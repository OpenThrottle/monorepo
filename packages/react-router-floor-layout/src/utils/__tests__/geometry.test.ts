import { describe, expect, it } from 'vitest';

import {
  angleBetween,
  clampPointToRect,
  clampValue,
  distance,
  midpoint,
  rotatePoint,
  snapPointToGrid,
  snapValueToGrid,
} from '../geometry';

describe('snapValueToGrid', () => {
  it('snaps to the nearest multiple', () => {
    expect(snapValueToGrid(13, 12)).toBe(12);
    expect(snapValueToGrid(18, 12)).toBe(24);
    expect(snapValueToGrid(-7, 12)).toBe(-12);
  });

  it('is a no-op for a non-positive grid', () => {
    expect(snapValueToGrid(13, 0)).toBe(13);
    expect(snapValueToGrid(13, -5)).toBe(13);
  });
});

describe('snapPointToGrid', () => {
  it('snaps both axes', () => {
    expect(snapPointToGrid({ x: 13, y: 30 }, 12)).toEqual({ x: 12, y: 36 });
  });
});

describe('clampValue', () => {
  it('clamps into range', () => {
    expect(clampValue(5, 0, 10)).toBe(5);
    expect(clampValue(-1, 0, 10)).toBe(0);
    expect(clampValue(11, 0, 10)).toBe(10);
  });

  it('returns min for a degenerate range', () => {
    expect(clampValue(5, 10, 0)).toBe(10);
  });
});

describe('clampPointToRect', () => {
  it('keeps a point inside the floor rectangle', () => {
    const bounds = { height: 100, width: 200, x: 0, y: 0 };
    expect(clampPointToRect({ x: 250, y: -10 }, bounds)).toEqual({
      x: 200,
      y: 0,
    });
    expect(clampPointToRect({ x: 50, y: 50 }, bounds)).toEqual({
      x: 50,
      y: 50,
    });
  });
});

describe('distance + midpoint', () => {
  it('computes euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('computes the midpoint', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });
});

describe('rotatePoint', () => {
  it('rotates 90° clockwise (y-down)', () => {
    const r = rotatePoint({ x: 1, y: 0 }, 90);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.y).toBeCloseTo(1, 5);
  });

  it('round-trips when un-rotated', () => {
    const original = { x: 3, y: 5 };
    const back = rotatePoint(rotatePoint(original, 37), -37);
    expect(back.x).toBeCloseTo(original.x, 5);
    expect(back.y).toBeCloseTo(original.y, 5);
  });
});

describe('angleBetween', () => {
  it('is 0° along +x and 90° along +y (y-down)', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 5, y: 0 })).toBeCloseTo(0, 5);
    expect(angleBetween({ x: 0, y: 0 }, { x: 0, y: 5 })).toBeCloseTo(90, 5);
  });
});
