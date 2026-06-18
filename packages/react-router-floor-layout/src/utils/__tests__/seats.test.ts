import { describe, expect, it } from 'vitest';

import { FloorElementType } from '../../types';
import { distance } from '../geometry';
import { seatPositions } from '../seats';

describe('seatPositions', () => {
  it('returns no seats for a zero-seat table', () => {
    expect(
      seatPositions({
        height: 36,
        seats: 0,
        type: FloorElementType.TABLE_ROUND,
        width: 36,
        x: 0,
        y: 0,
      }),
    ).toEqual([]);
  });

  it('spaces round-table seats evenly on a circle around the center', () => {
    const center = { x: 100, y: 100 };
    const seats = seatPositions(
      {
        height: 36,
        seats: 4,
        type: FloorElementType.TABLE_ROUND,
        width: 36,
        x: center.x,
        y: center.y,
      },
      10,
    );
    expect(seats).toHaveLength(4);
    // radius = 36/2 + 10 = 28; every seat is that distance from center
    for (const seat of seats) {
      expect(distance(seat, center)).toBeCloseTo(28, 5);
    }
  });

  it('distributes rectangle-table seats around the perimeter, outside the edges', () => {
    const seats = seatPositions(
      {
        height: 30,
        seats: 6,
        type: FloorElementType.TABLE_RECTANGLE,
        width: 48,
        x: 0,
        y: 0,
      },
      10,
    );
    expect(seats).toHaveLength(6);
    // every chair sits beyond the table half-extent on at least one axis
    for (const seat of seats) {
      const outside = Math.abs(seat.x) > 24 || Math.abs(seat.y) > 15;
      expect(outside).toBe(true);
    }
  });
});
