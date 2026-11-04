import { describe, expect, it } from 'vitest';

import { pointerCenter, rectOf } from '../viewport-rect';

describe('rectOf', () => {
  it('is null when the svg is not mounted', () => {
    expect(rectOf(null)).toBeNull();
  });

  it('reads the bounding client rect of the svg', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.getBoundingClientRect = (): DOMRect => new DOMRect(10, 20, 300, 200);
    expect(rectOf(svg)).toEqual({
      height: 200,
      left: 10,
      top: 20,
      width: 300,
    });
  });
});

describe('pointerCenter', () => {
  it('is the center of the rectangle', () => {
    expect(
      pointerCenter({ height: 200, left: 10, top: 20, width: 300 }),
    ).toEqual({ x: 160, y: 120 });
  });
});
