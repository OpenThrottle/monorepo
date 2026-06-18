import { describe, expect, it } from 'vitest';

import {
  FloorElementType,
  FloorLayer,
  type FloorElement,
  floorElementSchema,
} from '../../types';
import {
  createFloorElement,
  floorBounds,
  sortElementsByLayer,
} from '../elements';

function element(id: string, layer: number): FloorElement {
  return {
    height: 24,
    id,
    layer,
    rotation: 0,
    seats: 2,
    type: FloorElementType.TABLE_SQUARE,
    width: 24,
    x: 0,
    y: 0,
  };
}

describe('floorBounds', () => {
  it('is the floor rectangle anchored at the origin', () => {
    expect(floorBounds({ height: 300, width: 500 })).toEqual({
      height: 300,
      width: 500,
      x: 0,
      y: 0,
    });
  });
});

describe('sortElementsByLayer', () => {
  it('orders by ascending layer (zones behind, seating on top)', () => {
    const sorted = sortElementsByLayer([
      element('seat', FloorLayer.SEATING),
      element('zone', FloorLayer.ZONE),
      element('wall', FloorLayer.WALL),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['zone', 'wall', 'seat']);
  });

  it('is stable for elements on the same layer', () => {
    const sorted = sortElementsByLayer([
      element('a', FloorLayer.SEATING),
      element('b', FloorLayer.SEATING),
      element('c', FloorLayer.SEATING),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const input = [
      element('seat', FloorLayer.SEATING),
      element('zone', FloorLayer.ZONE),
    ];
    sortElementsByLayer(input);
    expect(input.map((e) => e.id)).toEqual(['seat', 'zone']);
  });
});

describe('createFloorElement', () => {
  it('builds a schema-valid table with default seats + size + layer', () => {
    const created = createFloorElement({
      center: { x: 50, y: 60 },
      id: 't1',
      type: FloorElementType.TABLE_SQUARE,
    });
    expect(floorElementSchema.safeParse(created).success).toBe(true);
    expect(created).toMatchObject({
      height: 24,
      layer: FloorLayer.SEATING,
      seats: 2,
      type: FloorElementType.TABLE_SQUARE,
      width: 24,
      x: 50,
      y: 60,
    });
  });

  it('gives a zone a default label and the backmost layer', () => {
    const zone = createFloorElement({
      center: { x: 0, y: 0 },
      id: 'z1',
      type: FloorElementType.ZONE,
    });
    expect(floorElementSchema.safeParse(zone).success).toBe(true);
    expect(zone.layer).toBe(FloorLayer.ZONE);
    expect(zone.label).toBe('Zone');
  });

  it('builds a wall with no seats on the wall layer', () => {
    const wall = createFloorElement({
      center: { x: 10, y: 10 },
      id: 'w1',
      type: FloorElementType.WALL,
    });
    expect(floorElementSchema.safeParse(wall).success).toBe(true);
    expect(wall.layer).toBe(FloorLayer.WALL);
    expect('seats' in wall).toBe(false);
  });
});
